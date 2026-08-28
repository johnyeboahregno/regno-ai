# Regno.ai Knowledge Quality and Scoring System

Internal architecture documentation for the knowledge scoring, auditing, and retrieval quality pipeline.

## Overview

The Regno.ai knowledge system stores facts, documents, entities, and embeddings across four databases (MongoDB, Qdrant, Neo4j, Redis). As knowledge grows, quality degrades: crawled pages bring cookie notices, off-topic cross-links, and duplicate content. The scoring system provides a pluggable, multi-layer pipeline that scores every fact for domain relevance, flags junk for quarantine, and reranks retrieval results at query time.

Why it matters:
- **Garbage in, garbage out.** If 79% of a domain's facts are irrelevant (as was the case with the initial F1 ingestion), the LLM receives noisy context and produces worse answers.
- **Cost control.** Embedding and storing junk costs money (Cohere embeddings, Qdrant storage, LLM tokens at query time).
- **Retrieval precision.** A perfect embedding model still returns junk if junk is what was stored. Scoring at ingestion time and reranking at query time are complementary.

## Three-Layer Scoring Architecture

```
Layer 1: Bulk Relevance         Layer 2: Graph Enhancement        Layer 3: LLM Quality Judge
(all facts, cheap)              (structural signals, free)        (borderline facts only)
                                                                   
Embedding Cosine (default)  --> Entity connectivity (Neo4j)    --> Claude Haiku cross-encoder
  or BGE Reranker               Duplicate detection (Qdrant)       Multi-dimensional scoring
  or Cohere Rerank              Min entity connections             (relevance, accuracy,
  or Zerank                                                         freshness, specificity,
  or Voyage Rerank                                                  utility)
  or Keyword (fallback)
```

### Layer 1: Bulk Relevance Scoring

Scores every fact in a domain against a domain profile (text description of what the domain covers). The domain profile is either curated (hardcoded for known domains like `formula_1`, `energy_storage`) or LLM-generated (Haiku produces a 2-3 sentence description from page titles and content samples).

**Process:**
1. Build domain profile text.
2. Embed the profile using the embedding service.
3. For each fact: embed content, compute cosine similarity to profile, map to percentile-based score (0.2-1.0).
4. Facts below `scoring.layer1.threshold` (default 0.3) are flagged as junk.

The engine is pluggable via `scoring.layer1.engine` in settings.

**File:** `src/lib/server/cortex-flow/services/scoring/ScoringEngineFactory.ts`

### Layer 2: Graph Enhancement

Uses existing Neo4j entity graph and Qdrant duplicate detection to adjust scores. Currently disabled by default (`layer2.enabled: false`) as Neo4j integration is being stabilised.

**Signals:**
- **Entity connectivity:** Facts linked to well-connected entities (many relationships) score higher. A fact mentioning "Max Verstappen" in an F1 domain scores better than one mentioning a generic term.
- **Duplicate detection:** Qdrant near-duplicate check (similarity > 0.95 = reinforce existing, 0.80-0.95 = potential duplicate). Reduces redundancy in scored results.
- `minEntityConnections` threshold (default 1) determines the minimum graph connectivity for a boost.

**File:** `src/lib/server/cortex-brain/GraphRAGRetriever.ts`

### Layer 3: LLM Quality Judge

Rescores borderline facts (score between 0.3-0.5) using Claude Haiku as a cross-encoder. The LLM directly judges relevance on a 0-100 scale. Costs approximately $0.001 per fact.

**Process:**
1. Filter facts with scores between `audit.borderlineMin` (0.3) and `audit.borderlineMax` (0.5).
2. Batch 10 facts at a time into a single Haiku call.
3. System prompt instructs: score 0-100 where 0=completely irrelevant, 100=highly relevant.
4. Parse JSON response, update scores.
5. Optional multi-dimensional scoring: `['relevance', 'accuracy', 'freshness', 'specificity', 'utility']`.

**Budget cap:** `maxFactsPerRun` (default 5000) limits cost per audit run.

**File:** `src/lib/server/cortex-flow/services/DomainTerms.ts` (function `rescoreBorderlineFacts`)

## Available Engines

### Batch Scoring Engines (Layer 1)

| Engine | Status | Cost | Accuracy | Self-Hosted | Notes |
|--------|--------|------|----------|-------------|-------|
| **Embedding Cosine** | Implemented (default) | ~$0.01/1K facts | Good | N/A (uses existing embedding service) | Percentile-based scoring against domain profile embedding |
| **Keyword** | Implemented (fallback) | Free | Fair | Yes | Stop-word filtered term matching. Always available. |
| **BGE Reranker v2-m3** | Stub | Free | Good | Yes (HuggingFace) | 568M params, Apache 2.0. Needs: self-hosted API endpoint. |
| **Cohere Rerank 4** | Stub | $2/1K searches | Excellent | No (API) | #2 Agentset ELO (1629). Needs: API key (same as embedding). |
| **Zerank-2** | Stub | $0.025/1M tokens | Excellent | Partial (Apache 2.0 small model) | #1 Agentset ELO (1638). Research lab, newer API. |
| **Voyage Rerank 2.5** | Stub | ~$0.05/1K | Very Good | No (API) | #4 ELO. Acquired by MongoDB, good integration path. |
| **LLM Cross-Encoder** | Stub | ~$0.001/fact | Excellent | N/A | Uses Claude Haiku directly. Expensive at scale. |

### Query-Time Reranking Engines

| Engine | Status | Cost | Latency | Notes |
|--------|--------|------|---------|-------|
| **Cohere Rerank v3.5** | Implemented | $2/1K | ~200ms | Full implementation in `RerankService.ts`. Auto-discovers Cohere API key. |
| **Zerank** | Stub | $0.025/1M | ~100ms | Fastest. Needs API integration. |
| **Voyage** | Stub | ~$0.05/1K | ~150ms | Good MongoDB integration. |
| **BGE** | Stub | Free | ~300ms | Needs self-hosted inference endpoint. |
| **None** | Default | Free | 0ms | Uses raw Qdrant vector scores. |

### Key ELO Rankings (Agentset Reranker Leaderboard, 2026)

1. **Zerank-2** — ELO 1638
2. **Cohere Rerank 4 Pro** — ELO 1629
3. **Contextual AI Reranker** — (open source, RAG 2.0)
4. **Voyage Rerank 2.5** — ELO ~1600
5. **BGE Reranker v2-m3** — (self-hosted baseline)

## Query-Time Retrieval Pipeline

```
User Query
    |
    v
[1] Qdrant Hybrid Search (dense vectors + BM25 sparse)
    | topK: 50 (configurable via scoring.queryRerank.topK)
    v
[2] Graph Pre-Filter (if Neo4j available)
    | Entity extraction from query -> graph traversal
    | Reciprocal Rank Fusion merges vector + graph results
    v
[3] Cross-Encoder Rerank (Cohere Rerank v3.5)
    | Scores each result against query with cross-encoder
    | rerankTo: 10 (configurable via scoring.queryRerank.rerankTo)
    v
[4] Context Assembly
    | Top results formatted as sections:
    | - Relevant Information (vector hits)
    | - Key Entities (graph entities)
    | - Relationships (graph edges)
    | - Reasoning Paths (multi-hop)
    v
[5] LLM Answer Synthesis
    | Context injected into agent prompt
    | "PRIORITIZE Live Data Query Results"
```

**Key files:**
- `src/lib/server/cortex-brain/GraphRAGRetriever.ts` — hybrid retrieval orchestrator
- `src/lib/server/cortex/RerankService.ts` — Cohere cross-encoder reranking
- `src/lib/server/cortex-flow/services/DocumentStore.ts` — unified document retrieval with RRF

**GraphRAG Configuration:**

| Setting | Default | Description |
|---------|---------|-------------|
| `vectorSearchLimit` | 10 | Max results from Qdrant |
| `vectorMinScore` | 0.6 | Minimum vector similarity |
| `graphDepth` | 2 | Hops for graph expansion |
| `graphExpansionLimit` | 30 | Max expanded entities |
| `vectorWeight` | 0.6 | Weight for vector results in fusion |
| `graphWeight` | 0.4 | Weight for graph results in fusion |
| `pathBoostFactor` | 1.5 | Multiplier for entities on reasoning paths |

## Ingestion Quality

### Contextual Chunking

Inspired by Anthropic's Contextual Retrieval paper (67% retrieval failure reduction). When `ingestion.contextualChunking` is enabled, each chunk is prepended with document-level context before embedding:

1. Document split into chunks (`maxChunkSize`: 1000 tokens, `chunkOverlap`: 200 tokens).
2. For each chunk, generate a short context prefix using `ingestion.contextModel` (default: Claude Haiku).
3. Embed the context-prefixed chunk (not the raw chunk).
4. Store both raw chunk and context in Qdrant payload.

Currently disabled by default (setting: `ingestion.contextualChunking: false`). Enabling it increases ingestion cost but significantly improves retrieval accuracy.

### Domain-Aware Filtering

When `ingestion.domainAwareFiltering` is enabled (default: true), crawled pages are scored for domain relevance before ingestion. Pages below `crawl.relevanceThreshold` (default: 40/100) are excluded.

This prevents cross-linking pollution (e.g., an F1 page about the Melbourne Grand Prix linking to Melbourne geography, Australian trade statistics, etc.).

### Content Relevance Filter (3-Layer)

Applied during knowledge extraction:
1. **URL pattern matching** — skip pages matching junk patterns (privacy, cookies, terms of service, GDPR).
2. **Content sampling** — extract page titles, compare against domain profile.
3. **LLM validation** — for borderline pages, Haiku judges whether content is domain-relevant.

## Configuration Reference

All settings live in `cortex_knowledge_settings` MongoDB collection. Type definition:

**File:** `src/lib/types/cortexKnowledge.ts`

### Scoring Settings

| Path | Type | Default | Description |
|------|------|---------|-------------|
| `scoring.layer1.engine` | `Layer1Engine` | `'embedding-cosine'` | Batch scoring engine |
| `scoring.layer1.threshold` | `number` | `0.3` | Below this = junk |
| `scoring.layer1.apiEndpoint` | `string?` | - | For self-hosted engines (BGE) |
| `scoring.layer1.apiKey` | `string?` | - | Credential reference for API engines |
| `scoring.layer1.model` | `string?` | - | Model name/version override |
| `scoring.layer2.enabled` | `boolean` | `false` | Enable graph enhancement |
| `scoring.layer2.useEntityGraph` | `boolean` | `false` | Neo4j entity connectivity scoring |
| `scoring.layer2.useDuplicateDetection` | `boolean` | `false` | Qdrant near-duplicate check |
| `scoring.layer2.minEntityConnections` | `number` | `1` | Min graph connections for boost |
| `scoring.layer3.enabled` | `boolean` | `true` | Enable LLM quality judge |
| `scoring.layer3.engine` | `Layer3Engine` | `'claude-haiku'` | LLM engine for judging |
| `scoring.layer3.dimensions` | `string[]` | `['relevance','accuracy','freshness','specificity','utility']` | Scoring dimensions |
| `scoring.layer3.maxFactsPerRun` | `number` | `5000` | Budget cap per audit |
| `scoring.layer3.onlyBorderline` | `boolean` | `true` | Only score 0.3-0.5 range |
| `scoring.queryRerank.engine` | `QueryRerankEngine` | `'none'` | Query-time reranker |
| `scoring.queryRerank.topK` | `number` | `50` | Retrieve from Qdrant |
| `scoring.queryRerank.rerankTo` | `number` | `10` | Final result count |

### Audit Settings

| Path | Type | Default | Description |
|------|------|---------|-------------|
| `audit.embeddingBatchSize` | `number` | `250` | Batch size for embedding API |
| `audit.borderlineMin` | `number` | `0.3` | Below = junk (no LLM escalation) |
| `audit.borderlineMax` | `number` | `0.5` | Above = good (no LLM escalation) |
| `audit.profileTtlMinutes` | `number` | `60` | Domain profile embedding cache TTL |
| `audit.contentTruncation` | `number` | `3000` | Max chars per fact for embedding |

### Ingestion Settings

| Path | Type | Default | Description |
|------|------|---------|-------------|
| `ingestion.contextualChunking` | `boolean` | `false` | Anthropic contextual retrieval |
| `ingestion.contextModel` | `string` | `'claude-haiku-4-5-20251001'` | Model for chunk context generation |
| `ingestion.domainAwareFiltering` | `boolean` | `true` | Filter URLs by domain relevance |
| `ingestion.maxChunkSize` | `number` | `1000` | Tokens per chunk |
| `ingestion.chunkOverlap` | `number` | `200` | Overlap between chunks |

### Retrieval Settings

| Path | Type | Default | Description |
|------|------|---------|-------------|
| `retrieval.semanticSearchLimit` | `number` | `10` | Max Qdrant results |
| `retrieval.relevanceThreshold` | `number` | `0.65` | Min score to include in context |

### Legacy Cosine Tiers

Used by the `embedding-cosine` engine for percentile-to-score mapping:

| Tier | Threshold | Score |
|------|-----------|-------|
| Excellent | 0.85 | 1.0 |
| Good | 0.80 | 0.9 |
| Fair | 0.75 | 0.8 |
| Moderate | 0.70 | 0.6 |
| Low | 0.65 | 0.4 |
| Below Low | < 0.65 | 0.2 |

## Domain Profiles

Domain profiles are the "anchor" that facts are scored against. Three sources, in priority order:

### 1. Curated Descriptions (Highest Quality)

Hardcoded in `DomainTerms.ts` for known domains:

```
formula_1:     "Formula 1 motor racing. F1 Grand Prix races, circuits, drivers..."
energy_storage: "Battery energy storage systems. Lithium-ion cells, voltage..."
```

Best accuracy. No API calls. Add new domains here when they are well-understood.

### 2. LLM-Generated Descriptions

For unknown domains, Haiku generates a profile from page titles and content samples:
1. Sample 30 pages from `cortex_index` (excluding junk-pattern titles).
2. Send top 5 page titles + 200-char content samples to Haiku.
3. Prompt: "Generate a concise domain description (2-3 sentences) that captures what this knowledge domain is about."
4. Cache the generated description in memory (and for future use).

Cost: ~$0.001 per domain profile generation.

### 3. Content-Derived Fallback

If LLM is unavailable, build profile from filtered page content:
- Concatenate top 10 page titles + first 300 chars of content.
- Truncate to 4000 chars.
- Use as embedding profile text.

### Keyword Terms (Separate Fallback)

When embeddings are entirely unavailable, scoring falls back to keyword matching. Terms are sourced from:
1. Curated term lists (e.g., `formula_1`: 24 terms).
2. Content-derived frequency analysis (top 25 words by frequency, stop-words excluded).
3. Domain name splitting as last resort.

**File:** `src/lib/server/cortex-flow/services/DomainTerms.ts`

## Cost Analysis

### Batch Audit Costs (per domain)

Assuming 10,000 facts per domain:

| Tier | Engine | Cost | Time | Accuracy |
|------|--------|------|------|----------|
| Free | Keyword only | $0 | ~1s | Fair (keyword overlap) |
| Default | Embedding Cosine + Haiku borderline | ~$0.15 | ~30s | Good |
| Standard | Cohere Rerank + Haiku borderline | ~$20 | ~60s | Very Good |
| Premium | Zerank + Haiku all | ~$0.25 + $10 | ~45s | Excellent |

Cost breakdown for default tier (10K facts):
- Embedding generation: ~$0.10 (Cohere embed-v4, $0.01/1K)
- Domain profile embedding: ~$0.001
- Haiku borderline rescoring (est. 2000 borderline facts, batches of 10): ~$0.04
- **Total: ~$0.15 per domain audit**

### Query-Time Costs

| Component | Cost per Query |
|-----------|---------------|
| Qdrant vector search | Free (self-hosted) |
| Neo4j graph traversal | Free (self-hosted) |
| Cohere Rerank (50 docs) | ~$0.002 |
| Embedding for query | ~$0.0001 |
| **Total per query** | **~$0.002** (with reranking) or **$0** (without) |

### Monthly Projections

| Usage | Queries/day | Audits/month | Monthly Cost |
|-------|-------------|--------------|--------------|
| Light | 100 | 4 domains | ~$1.20 |
| Medium | 1,000 | 10 domains | ~$3.50 |
| Heavy | 10,000 | 20 domains | ~$23 |

## Data Flow Diagram

```
                              INGESTION PIPELINE
                              =================

  Crawl/Upload           Filter              Chunk              Context
  +-----------+     +------------+     +------------+     +-------------+
  | Web crawl |---->| URL junk   |---->| Split into |---->| Prepend doc |
  | File drop |     | patterns   |     | 1000-token |     | context per |
  | API ingest|     | Domain     |     | chunks w/  |     | chunk (Haiku|
  |           |     | relevance  |     | 200 overlap|     | optional)   |
  +-----------+     +------------+     +------------+     +-------------+
                         |                                      |
                    [excluded]                                  v
                                                         Embed + Store
                                                    +------------------+
                                                    | Cohere embed-v4  |
                                                    | -> Qdrant vectors|
                                                    | -> MongoDB facts |
                                                    | -> Neo4j entities|
                                                    | -> Redis cache   |
                                                    +------------------+


                              AUDIT PIPELINE
                              ==============

  Score (Layer 1)         Enhance (Layer 2)       Judge (Layer 3)
  +--------------+     +------------------+     +----------------+
  | Domain       |---->| Entity graph     |---->| Borderline     |
  | profile      |     | connectivity     |     | facts only     |
  | embedding    |     | (Neo4j)          |     | (0.3-0.5)      |
  | cosine sim   |     | Duplicate detect |     | Haiku scoring  |
  | -> 0-1 score |     | (Qdrant)         |     | -> 0-1 rescore |
  +--------------+     +------------------+     +----------------+
       |                                              |
       v                                              v
  +----------------------------------------------------------+
  | Tag facts: _relevanceScore, _scoredAt                    |
  | Quarantine junk (score < threshold)                      |
  | Non-destructive: tag only, never auto-delete             |
  +----------------------------------------------------------+


                              RETRIEVAL PIPELINE
                              ==================

  Query               Vector Search          Graph Expand          Rerank
  +---------+     +----------------+     +---------------+     +-----------+
  | Natural |---->| Qdrant hybrid  |---->| Entity extract|---->| Cohere    |
  | language|     | (dense + BM25) |     | from query    |     | cross-    |
  | query   |     | topK: 50       |     | Graph traverse|     | encoder   |
  |         |     |                |     | Path finding  |     | rerankTo: |
  +---------+     +----------------+     +---------------+     | 10        |
                                                               +-----------+
                                                                    |
                                                                    v
                                                              +----------+
                                                              | Context  |
                                                              | assembly |
                                                              | -> LLM   |
                                                              | answer   |
                                                              +----------+
```

## Key Source Files

| File | Purpose |
|------|---------|
| `src/lib/types/cortexKnowledge.ts` | Settings type definition, all defaults |
| `src/lib/server/cortex-flow/services/scoring/ScoringEngine.ts` | `ScoringEngine` and `RerankerEngine` interfaces |
| `src/lib/server/cortex-flow/services/scoring/ScoringEngineFactory.ts` | Factory + EmbeddingCosine + Keyword implementations |
| `src/lib/server/cortex-flow/services/DomainTerms.ts` | Domain profiles, batch scoring, borderline rescoring |
| `src/lib/server/cortex-brain/GraphRAGRetriever.ts` | Hybrid vector+graph retrieval |
| `src/lib/server/cortex/RerankService.ts` | Cohere Rerank v3.5 cross-encoder |
| `src/lib/server/cortex-flow/services/DocumentStore.ts` | Unified document retrieval, RRF merging |
| `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts` | Ingestion pipeline, deduplication |
| `src/routes/api/admin/knowledge-audit/+server.ts` | Audit API endpoints |
| `src/lib/server/queues/workers/ScheduledWorker.ts` | Automated audit scheduling |

## Research Sources

- **Contextual AI RAG 2.0** — 71.2% RAG-QA Arena, open-source reranker. [contextual.ai/blog/rag2](https://contextual.ai/blog/rag2)
- **Zerank-2** — #1 Agentset Reranker ELO (1638), $0.025/1M tokens, Apache 2.0 small model. [zerank.ai](https://zerank.ai)
- **Cohere Rerank 4** — #2 ELO (1629), $2/1K searches. Production-ready API. [cohere.com/rerank](https://cohere.com/rerank)
- **BGE Reranker v2-m3** — Apache 2.0, 568M params, self-hostable. [huggingface.co/BAAI/bge-reranker-v2-m3](https://huggingface.co/BAAI/bge-reranker-v2-m3)
- **Voyage Rerank 2.5** — #4 ELO, acquired by MongoDB. [voyageai.com](https://voyageai.com)
- **Anthropic Contextual Retrieval** — 67% retrieval failure reduction with chunk context. [anthropic.com/news/contextual-retrieval](https://anthropic.com/news/contextual-retrieval)
- **MTEB Leaderboard** — Massive Text Embedding Benchmark. [huggingface.co/spaces/mteb/leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
- **Agentset Reranker Arena** — Live ELO rankings for reranking models. [agentset.ai/reranker-arena](https://agentset.ai/reranker-arena)
