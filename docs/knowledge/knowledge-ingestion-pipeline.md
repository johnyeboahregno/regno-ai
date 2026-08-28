# Knowledge Ingestion Pipeline

Complete end-to-end pipeline for ingesting, scoring, embedding, and enriching domain knowledge.

## Pipeline Flow

```
Crawl → Filter → Chunk → Index → Extract Facts → Extract Entities → Score + Embed → Assets → Finalize
  1        2        3       4          5                6                  7             8        9
```

## Stages

### 1. Crawl
- **What:** BFS crawl of source URLs via `SiteCrawlerService`. Discovers pages from sitemaps + link following.
- **Output:** Markdown files at `cortex-flow/sites/{domain}/`, asset manifest (`_asset-manifest.json`)
- **Resume marker:** `knowledge_seed_status.checkpoint`
- **Smart resume:** If pages already in `cortex_index`, crawls for delta only (new pages)
- **Cost:** Free (HTTP fetches)

### 2. Filter (Relevance)
- **What:** `ContentRelevanceFilter` scores pages against seed description. 2-outcome: accept or reclassify (never discard).
- **Output:** Accepted pages proceed. Reclassified pages get `_domain: "{domain}.{category}"` suffix.
- **Resume marker:** Checkpoint-based
- **Cost:** ~$0.001/page (Haiku, batches of 10)

### 3. Process (Chunking)
- **What:** Splits large documents (>8000 chars) into chunks with `(Part N/M)` suffix.
- **Output:** Processed document array
- **Resume:** Deterministic, <1s, no state needed
- **Cost:** Free

### 4. Bulk Index
- **What:** Direct `bulkWrite` to `cortex_index` collection. Upsert by `{domain, sourceUrl, title}`.
- **Output:** Documents in `cortex_index` with `_factsExtracted: false`
- **Resume marker:** Upsert = idempotent. `$setOnInsert` prevents overwriting existing docs.
- **Cost:** Free

### 5. Fact Extraction
- **What:** `BatchExtractionService` sends each page to Haiku for fact extraction. 10 parallel calls.
- **Output:** Facts in `cortex_knowledge_facts` with `_entityExtracted: false`, `_auditedAt: undefined`
- **Resume marker:** `_factsExtracted: true` per page in `cortex_index`
- **Cost:** ~$0.001/page (~$12 for 12K pages)
- **Rate:** ~60 pages/min with 10 parallel

### 6. Entity Extraction
- **What:** Haiku extracts named entities from a diverse sample of facts (up to 5000). Stores to `cortex_entities` + Neo4j.
- **Output:** Entities in `cortex_entities` collection + Neo4j `:Entity` nodes
- **Resume marker:** `_entityExtracted: true` per fact. Remaining unsampled facts bulk-marked after sample completes.
- **Cost:** ~$0.10 (100 Haiku calls for 5K facts, 50/batch)
- **Why before scoring:** Layer 2 graph enhancement uses Neo4j entity connectivity. Entities must exist for graph boost to work.
- **Entity types:** person, team, circuit, event, organization, technology, location, concept

### 7. Score + Qdrant Embed
- **What:** `scoreFactsBatch` with pluggable engine. Embedding-cosine generates vectors AND scores in one pass — vectors stored to Qdrant for free.
- **Output:** `_relevanceScore`, `_auditedAt`, `_embeddedAt` per fact. Vectors in Qdrant `cortex_knowledge` collection.
- **Resume marker:** `_auditedAt` per fact (scoring), `_embeddedAt` per fact (Qdrant)
- **Chunked:** 5000 facts per chunk, bulk writes of 1000
- **Progress throttle:** Reports every 500 facts (prevents SSE/Redis flood)
- **Cost by engine:**

| Engine | Scoring Cost | Qdrant Vectors | Total |
|--------|-------------|----------------|-------|
| Embedding Cosine | ~$7 (OpenAI) | Free (reused) | $7 |
| Keyword | Free | Separate pass ~$7 | $7 |
| BGE Reranker | Free (HuggingFace) | Separate pass ~$7 | $7 |
| LLM Cross-Encoder | ~$105 (Haiku) | Separate pass ~$7 | $112 |

**Recommendation:** Embedding-cosine for bulk (best value — scoring + vectors in one pass). LLM cross-encoder only for incremental (<100 facts).

### 7b. Qdrant Embed (Standalone Fallback)
- **What:** If scoring engine didn't produce embeddings (keyword, BGE), this step generates them via OpenAI and stores to Qdrant.
- **Resume marker:** `_embeddedAt` per fact. Skips facts already embedded in step 7.
- **Cost:** ~$7 (OpenAI text-embedding-3-small)

### 8. Asset Pipeline
- **What:** Downloads images/SVGs/PDFs from crawled pages → GridFS. Describes with Claude Haiku Vision. Ingests PDFs as documents.
- **Sub-steps:**
  1. Parse asset URLs from `cortex_index` content (or from crawl manifest)
  2. Download to GridFS (`cortex_assets` bucket). Dedup by URL+domain.
  3. Vision describe (queued to execution server via BullMQ `asset-describe` task)
  4. Store descriptions as `visual_description` facts in `cortex_knowledge_facts`
  5. Link `assetRefs` back to `cortex_index` pages
- **Resume markers:** GridFS dedup (download), `metadata.description` (describe)
- **Cost:** ~$0.003/image, ~$0.01-0.05/PDF
- **Example:** 11.5K F1 assets = ~$34.50

### 9. Finalize
- **What:** Updates seed status to `done`, generates description with stats.
- **Output:** `knowledge_seed_status.status = 'done'`, seed description updated
- **Cost:** Free

## Quality Grade

Derived from score distribution — no LLM call:
- **A:** >=90% facts score >=0.6
- **B:** >=70%
- **C:** >=50%
- **D:** >=30%
- **F:** <30%

Shown in DomainDetailPanel quality bar with good/low/junk breakdown.

## Resume Safety

Every stage uses per-record markers. If the pipeline crashes at any point, restarting picks up where it left off:

| Stage | Resume Marker | Query |
|-------|--------------|-------|
| Crawl | checkpoint | `knowledge_seed_status.checkpoint` |
| Index | upsert | `$setOnInsert` (idempotent) |
| Fact Extraction | `_factsExtracted` | `{ _factsExtracted: { $ne: true } }` |
| Entity Extraction | `_entityExtracted` | `{ _entityExtracted: { $exists: false } }` |
| Scoring | `_auditedAt` | `{ _auditedAt: { $exists: false } }` |
| Qdrant Embed | `_embeddedAt` | `{ _embeddedAt: { $exists: false } }` |
| Asset Download | GridFS dedup | `{ 'metadata.sourceUrl': url, 'metadata.domain': domain }` |
| Asset Describe | `metadata.description` | `{ 'metadata.description': { $exists: false } }` |

## Non-Destructive Guarantees

- **Never delete facts.** Junk/truncated facts are quarantined to `cortex_knowledge_facts_quarantine`.
- **Never discard pages.** Off-topic pages are reclassified under `{domain}.{category}`, not dropped.
- **Scoring is additive.** Re-scoring clears `_auditedAt`/`_relevanceScore`/`_embeddedAt` but never removes the fact document.

## Key Files

| File | Role |
|------|------|
| `src/lib/server/queues/workers/KnowledgeSeedWorker.ts` | Main pipeline orchestrator |
| `src/lib/server/queues/workers/ScheduledWorker.ts` | Scheduled scoring/integrity/improve jobs |
| `src/lib/server/services/BatchExtractionService.ts` | Parallel fact extraction (10 concurrent Haiku) |
| `src/lib/server/services/AssetDownloadService.ts` | GridFS binary asset storage |
| `src/lib/server/services/AssetVisionService.ts` | Claude Vision descriptions |
| `src/lib/server/cortex-flow/services/DomainTerms.ts` | `scoreFactsBatch` + Layer 2 graph enhancement |
| `src/lib/server/cortex-flow/services/scoring/ScoringEngineFactory.ts` | Pluggable scoring engines |
| `src/lib/server/cortex-flow/services/ContentRelevanceFilter.ts` | Page relevance filtering |
| `src/lib/server/cortex-flow/services/SiteCrawlerService.ts` | BFS web crawler |
| `src/lib/server/utils/contentFilter.ts` | Boilerplate stripping + table/asset extraction |
| `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts` | Query-time retrieval (semantic + visual) |
| `src/routes/api/cortex/pipeline-status/+server.ts` | Pipeline status API |
| `src/routes/api/cortex/assets/+server.ts` | Asset scan/describe API |

## Pipeline Status UI

`DomainDetailPanel` includes a stats panel (bar chart icon) showing all stages with:
- Count, percentage, action button (play/spinner/check)
- Auto-refresh every 5s while any stage is running
- "Re-score all" checkbox clears scores + re-runs with current engine
- Jobs linked to universal JobConsole

## Cost Summary (F1 Domain — 12K pages)

| Stage | Cost |
|-------|------|
| Crawl | Free |
| Filter | ~$1 |
| Fact Extraction | ~$12 |
| Entity Extraction | ~$0.10 |
| Scoring (embedding-cosine) | ~$7 |
| Qdrant Embed | Free (reused) |
| Asset Download | Free |
| Asset Vision Describe | ~$34 |
| **Total** | **~$54** |
