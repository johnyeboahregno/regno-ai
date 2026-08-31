# Knowledge Ingestion — Runbook

> Operational guide for the `@regno/ingest` pipeline: crawl → filter → process →
> index → facts → entities → score → expert → assets → finalize.
> Design intent: `docs/knowledge/knowledge-ingestion-pipeline.md`,
> `docs/architecture/KNOWLEDGE_INGESTION_PIPELINE.md`.

## What it does

Turns an external website (e.g. `https://www.regnostandard.com`) into an indexed,
fact-extracted, vectorised domain inside the CORTEX brain. It is the live
implementation of the previously design-only `KnowledgeSeedWorker` /
`SiteCrawlerService` from the docs.

## Entry points

| Entry | When |
|---|---|
| `scripts/ingest-site.ts` (`npm run db:ingest-site`) | CLI, scripted/cron runs |
| `POST /api/knowledge/ingest` | From the web app / curl (fire-and-forget) |
| `GET /api/knowledge/ingest/[seedId]` | Live progress of a seed |
| `GET /api/knowledge/seeds` | List seeds + statuses |

All three share one core: `packages/ingest`.

## File map

```
packages/ingest/src/
  orchestrator.ts   runSeed / startSeed / runSeedWorker — phase sequencing + resume
  crawler.ts        SiteCrawlerService (sitemap + BFS + robots + rate limit)
  filter.ts         ContentRelevanceFilter (2-outcome: accept or reclassify)
  process.ts        heading-aware chunking + condensation
  indexer.ts        Wave-1 bulk upsert into cortex_index
  facts.ts          Wave-2a atomic fact extraction (LLM / sentence fallback)
  entities.ts       Wave-2b entity extraction → cortex_entities + Neo4j
  scoring.ts        Wave-2c embedding-cosine score + Qdrant vectors
  expert.ts         domain expert artifact (hash-diffed, versioned)
  assets.ts         GridFS asset download + assetRefs
  finalize.ts       quality grade + status done + domain analysis
  status.ts         knowledge_seed_status helpers
  lib/html.ts       dependency-free HTML → Markdown (tokenizer-based)
  lib/llm.ts        chat/embed helpers, cosine, keyword fallback
apps/web/src/routes/api/knowledge/
  ingest/+server.ts          POST start
  ingest/[seedId]/+server.ts GET status
  seeds/+server.ts           GET list
```

## Quality grade

Derived from the fact score distribution (no LLM):

| Grade | Rule |
|---|---|
| A | ≥ 90% of facts score ≥ 0.6 |
| B | ≥ 70% |
| C | ≥ 50% |
| D | ≥ 30% |
| F | < 30% |

Persisted to `cortex_domain_analysis.analysis.grade`.

## Non-destructive guarantees (as specified in the design)

- **Never delete facts** — junk is filtered at extraction; nothing is removed.
- **Never discard pages** — off-topic pages are reclassified under `{domain}.{category}`.
- **Never overwrite indexed content** — `cortex_index` upserts use `$setOnInsert`.
- **Version, don't overwrite** — the domain expert is hash-diffed (`condensedHash`) and versioned.

## Resume markers

| Stage | Marker | Query |
|---|---|---|
| Crawl | `knowledge_staging` (per-seed pages) | delta re-crawl via `skipUrls` |
| Index | upsert | `{domain, sourceUrl, title}` idempotent |
| Facts | `_factsExtracted` (page) | `{_factsExtracted: {$ne: true}}` |
| Entities | `_entityExtracted` (fact) | sampled facts + bulk-mark rest |
| Score | `_auditedAt` (fact) | `{_auditedAt: {$exists: false}}` |
| Embed | `_embeddedAt` (fact) | `{_embeddedAt: {$exists: false}}` |
| Asset download | GridFS `metadata.sourceUrl+domain` | dedup before upload |

Re-running a `seedId` resumes from the first incomplete marker — no re-crawl of
already-persisted pages, no duplicate facts/vectors.

## LLM vs keyless

| Phase | With key (OpenAI default) | Keyless fallback |
|---|---|---|
| Filter | gpt-4o-mini batches of 10 | keyword score vs `description` |
| Facts | gpt-4o-mini 5–20 facts/page | sentence split |
| Entities | gpt-4o-mini batches of 50 | capitalized-term regex |
| Score | text-embedding-3-small cosine | keyword score (no vectors) |
| Expert | gpt-4o-mini compile | deterministic condensation |

Model/provider can be changed in each phase's `chatSafe` call; the gateway is
`@regno/ai` (multi-provider).

## Cost notes (order of magnitude)

| Stage | Cost |
|---|---|
| Crawl | Free |
| Filter | ~$0.001/page |
| Facts | ~$0.001/page |
| Entities | ~$0.10 per 5K facts |
| Score + embed | ~$0.02 / 1K facts (embedding-cosine does both) |
| Expert | 1 call per seed (only when the corpus hash changes) |
| Assets | bandwidth only (download); vision description unsupported (text-only gateway) |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `sameHost` skips everything | Ensure the target URL host matches the sitemap host (www vs apex). The crawler only follows same-host links. |
| 0 pages, discovered > 0 | All sitemap URLs non-HTML (PDFs), or blocked by `robots.txt` (see `skippedRobots`). |
| Empty markdown | Site is a JS-rendered SPA — the dependency-free crawler reads static HTML only. Use `sitemap.xml` + a headless renderer for SPAs (future work). |
| No vectors in keyless run | Expected — `_embeddedAt` is only set with an OpenAI key; re-run the same `seedId` with a key to backfill. |
| Neo4j errors | Non-fatal; entities still land in Mongo. The graph MERGE is best-effort. |
| Mongo unavailable | Pipeline fails at the first `getDb()` call. Start stores: `npm run db:up`. |

## Related docs

- User guide: `apps/web/src/lib/guides/knowledge-ingestion.md` (renders under **User Guides**)
- Design: `docs/knowledge/knowledge-ingestion-pipeline.md`
- Knowledge system: `docs/knowledge/knowledge-system.md`
- Schema: `docs/DB_SCHEMA.md` (§2.3 Knowledge system, §3 Qdrant, §4 Neo4j)
