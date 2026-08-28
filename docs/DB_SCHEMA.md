# Regno Architect — Consolidated Database Schema

> **Source:** extracted from the pulled docs (`docs/`) and the live regno.ai system (2026-08-27).
> This is the authoritative schema reference for the fresh "Regno Architect Me" build.
> **Status:** Phase 0 — consolidate. Exact fields are reconstructed from documentation; treat as the
> blueprint to implement and refine against real collections.

---

## 1. Storage topology

```
MongoDB 7+   → document store (source of truth)
Qdrant 1.7+  → vector embeddings (semantic search)
Neo4j 5+     → knowledge graph (relationships, lineage)
Redis 7      → queues (BullMQ), pub/sub, cache, SSE event bus
```

**Three-store sync:** MongoDB (primary) → Qdrant (embedding) → Neo4j (graph node). Eventual, ~seconds.

---

## 2. MongoDB — collections

### 2.1 Platform / auth

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Accounts + RBAC | `email`, `passwordHash`, `role`, `apiKeys`, `preferences` |
| `roles` | Role taxonomy | `role`, `privileges[]` |
| `privileges` | Privilege catalogue | `id`, `label`, `apps[]` (adminPrivileges.json) |
| `associations` | user/role/app/privilege links | `user`, `role`, `app`, `privilege`, `type` |
| `credentials` | Encrypted API keys (AES-256-GCM) | `type`, `name`, `encryptedValue`, `provider`, `createdAt` |
| `system_config` | Platform settings / service tiers | `key`, `value`, `tier` |

### 2.2 CORTEX — patterns / memories / agents

| Collection | Purpose | Key fields |
|---|---|---|
| `cortex` | Per-user CORTEX config | `userId`, `config` |
| `cortex_agents` | Agent definitions | `slug`, `name`, `phases[]`, `tools[]`, `triggers[]`, `costCeiling`, `capabilities` |
| `cortex_patterns` | Proven patterns (source of truth) | `name`, `description`, `tags[]`, `confidence`, `source` |
| `cortex_memories` | Execution memories / insights | `taskId`, `agentSlug`, `insights`, `contexts[]` |
| `cortex_checkpoints` | Session checkpoints (TTL 24h) | `sessionId`, `state`, `createdAt` |
| `cortex_executions` | Execution logs | `taskId`, `agentSlug`, `phases[]`, `cost`, `duration`, `status`, `evaluation` |
| `cortex_agent_memories` | Operational wisdom (compounding) | `agentSlug`, `category`, `content`, `contexts[]`, `relevanceScore` |

### 2.3 Knowledge system

| Collection | Purpose | Key fields |
|---|---|---|
| `cortex_index` | Raw indexed pages | `domain`, `title`, `content`, `markdown`, `sourceUrl`, `status` |
| `cortex_knowledge_facts` | Atomic extracted facts | `domain`, `content`, `confidence`, `entities[]`, `_relevanceScore` |
| `cortex_entities` | Named entities | `name`, `domain`, `mentionCount`, `type` |
| `cortex_domain_experts` | Compiled domain expertise | `domain`, `version`, `artifact`, `condensedHash`, `completenessScore` |
| `cortex_domain_analysis` | Domain quality grading | `domain`, `analysis.grade`, `analysis.summary` |
| `knowledge_staging` | Staged knowledge (TTL 30d) | `domain`, `sourceType`, `compressed`, `score`, `review`, `promotedAt` |
| `knowledge_seed_status` | Ingestion progress | `seedId`, `phase`, `progress`, `documentsIngested` |
| `knowledge_seeds_custom` | User-created seeds | `id`, `name`, `url`, `domain`, `description` |
| `knowledge_seed_status` (seed) | Per-URL crawl tracking | `url`, `status`, `crawledAt`, `filteredAt`, `indexedAt`, `scoreHistory` |
| `doc_search` (meta) | Ask-the-docs RAG provenance | `{rel, heading, version, isLatest}` provenance on Qdrant chunks |

### 2.4 Pipelines / orchestration

| Collection | Purpose | Key fields |
|---|---|---|
| `pipelines` | FLUX pipeline definitions | `definition`, `metadata.context`, `nodes[]`, `edges[]` |
| `pipeline_history` | Execution history | `pipelineId`, `runId`, `status`, `result`, `metadata` |
| `staged_projects` | STAGE project defs | `phases[]`, `name`, `status` |
| `staged_project_states` | STAGE run state | `projectId`, `phase`, `state`, `pausedAtPhase` |
| `maestro_events` | MAESTRO workflow events | `processId`, `event`, `at` |
| `maestro_validations` | MAESTRO validations | `processId`, `rule`, `result` |

### 2.5 Content / audit / misc

| Collection | Purpose | Key fields |
|---|---|---|
| `audit` | Compliance audit log (time-series) | `actor`, `action`, `controls`, `seal`, `ts` |
| `_history` | Permanent doc history | `snapshots[]`, `versions`, `_v` |
| `prompt_versions` | Prompt versioning + metrics | `version`, `content`, `metrics` |
| `skills` | Skill definitions | `slug`, `name`, `definition` |
| `vision_narrations` | Vision narration | `narration`, `script`, `audio` |
| `showcases` | Showcase generation | `title`, `scenes[]`, `status`, `evaluationScore` |
| `cms_processes` / `cms_process_runs` | (CMS — out of scope) | — |
| `companies` | (CMS/business — out of scope) | — |

### 2.6 Regno Standard doc types (`regno-standard/`)

`ConfigDoc` · `SubConfigDoc` · `IdentityDoc` · `ParamDefinitionDoc` · `EventDefinitionDoc` ·
`ConvDefinitionDoc` · `CANMessageDefinitionDoc` · `CANSignalDefinitionDoc` · `AliasDefinitionDoc` ·
`ParamSamplesDoc` · `ChannelSamplesDoc` · `ParamScalarValueDoc` · `ParamArrayValueDoc` ·
`EventDataDoc` · `StatDoc` · `TagDoc` · `TimeSpanDoc` · `MediaDataDoc`
(JSON, ns timestamps, hash IDs, GZip sample arrays.)

---

## 3. Qdrant — collections

| Collection | Embedding model | Metric | Purpose |
|---|---|---|---|
| `cortex_patterns` | text-embedding-3-small | Cosine | Semantic pattern retrieval |
| `cortex_wisdom` | text-embedding-3-small | Cosine | Agent memories, near-dup merge, conflict detection |
| `cortex_execution_memories` | — | Cosine | Execution memories |
| `knowledge_vectors` | — | Cosine | Knowledge facts vectors |
| `doc_search` | — | Cosine | Ask-the-docs RAG chunks |

---

## 4. Neo4j — graph

- `(:Pattern)` / `(:Pattern)-[:RELATES_TO]->` — pattern relationships
- `(:Entity)-[:{REQUIRES,PRODUCES,CONTAINS,REGULATES,COMPATIBLE_WITH,CONFLICTS_WITH,SUPERSEDES,PART_OF,LOCATED_IN,MANUFACTURED_BY,CERTIFIED_BY}]->(:Entity)` — knowledge graph
- `(:AuditUser)-[event]->(:AuditTarget)` — audit lineage (`governance/audit-*`)
- Generic runner: `neo4jService.run(cypher, params)`
- APOC plugin required.

---

## 5. Redis + BullMQ

- **Queues (18 on live):** `orchestrate`, `doc-author`, `cms-*`, `sealDaemon`, `audit-*`, `doc-search`, … each with a dedicated worker.
- **Patterns:** priority, retries with exponential backoff, `drainDelay: 0` on critical queues (<100ms pickup).
- **Pub/Sub:** cross-process cache invalidation, SSE event bus (`v2_*` events), `events/subscribe`.

---

## 6. Other data layers

| Layer | Role |
|---|---|
| PostgreSQL | Optional relational source/credential type (route: `/api/admin/monitoring/test-postgres`) |
| DynamoDB | External credential type supported |
| GridFS (Mongo) | File/blob storage (audio, images, uploads) |
| LLM providers | Anthropic / OpenAI / Google — multi-provider gateway |

---

## 7. Seed / operational scripts (from docs)

- `scripts/seed-platform-todos.cjs` → `/admin/todos`
- `scripts/seed-audit-role.cjs` → `audit` role + `audit.read`
- `scripts/seed-vision-role.ts` → Vision role
- `scripts/lib/cacheInvalidator.cjs` → Redis invalidation publisher
- `scripts/agents/*.cjs` → seed `cortex_agents`
- `scripts/seed-platform-todos.cjs` parses `platform-todo-registry.md`

---

*Generated 2026-08-27 from `docs/` + live regno.ai survey. CMS collections marked out of scope.*
