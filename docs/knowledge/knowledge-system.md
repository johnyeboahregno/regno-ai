# Knowledge System — Complete Architecture Manual

> The Regno.ai knowledge system transforms raw documentation, crawled websites, and data sources into expert-level intelligence that powers all AI interactions across the platform.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Ingestion Pipeline](#ingestion-pipeline)
3. [Storage Architecture](#storage-architecture)
4. [Domain Expert System](#domain-expert-system)
5. [Knowledge Retrieval](#knowledge-retrieval)
6. [Context Injection](#context-injection)
7. [Wisdom & Learning](#wisdom--learning)
8. [Data Source Profiling](#data-source-profiling)
9. [Quality & Integrity](#quality--integrity)
10. [Architecture Diagrams](#architecture-diagrams)
11. [Key Files Reference](#key-files-reference)

---

## 1. System Overview

The knowledge system has four layers:

```
┌─────────────────────────────────────────────────────┐
│  CONSUMERS                                           │
│  Profiler · Query Engine · F1 Agents · ContextBuilder│
├─────────────────────────────────────────────────────┤
│  EXPERT LAYER                                        │
│  DomainExpertService → cortex_domain_experts         │
│  Compiled, versioned, cached domain expertise        │
├─────────────────────────────────────────────────────┤
│  KNOWLEDGE LAYER                                     │
│  cortex_knowledge_facts (atomic facts)               │
│  cortex_agent_memories (operational wisdom)           │
│  Qdrant vectors (semantic search)                    │
│  Neo4j graph (entity relationships)                  │
├─────────────────────────────────────────────────────┤
│  INDEX LAYER                                         │
│  cortex_index (raw pages, crawled content)            │
│  knowledge_seeds (ingestion tracking)                │
├─────────────────────────────────────────────────────┤
│  SOURCES                                             │
│  Websites · PDFs · APIs · Data Sources · Manual Input│
└─────────────────────────────────────────────────────┘
```

### Design Principles

1. **Context Condensation** — Never pass raw documents to LLMs. Always: `Raw docs → Deterministic condense (no LLM) → LLM compile → Store artifact`. The condensation step is free, removes 90%+ noise, and the artifact is reusable.

2. **No Inline Execution** — Heavy processing (LLM calls, embedding, profiling) runs on the Execution Engine (EE) server via BullMQ queues. SvelteKit only serves UI.

3. **Expert Creation is Automatic** — Every documentation ingestion automatically produces a domain expert artifact. No manual intervention needed.

4. **Version, Don't Overwrite** — Knowledge artifacts are versioned with hash-based diffing. Re-ingestion refines rather than replaces.

---

## 2. Ingestion Pipeline

### Entry Point
- **API**: `POST /api/lab/knowledge-seeds` (triggers ingestion)
- **Worker**: `KnowledgeSeedWorker.ts` (EE server, BullMQ)

### Pipeline Phases

```
Phase 1: CRAWL (10%)
  SiteCrawlerService discovers pages from URL
  → Respects robots.txt, rate limiting, depth control
  → Stores raw HTML per page

Phase 2: FILTER (20%)
  ContentRelevanceFilter removes off-topic pages
  → LLM-based relevance scoring (optional, can be disabled)
  → Preserves all content by default (no arbitrary limits)

Phase 3: PROCESS (30%)
  Chunk large documents into 8KB pieces
  → 1 doc per chunk, preserves heading context

Phase 4: WAVE 1 — Bulk Index (60%)
  Direct bulk insert to cortex_index
  → 100-doc batches, upsert by sourceUrl
  → Fields: title, content, markdown, domain, sourceUrl, metadata

Phase 5: WAVE 2 — Auto-Audit (85%)
  LLM fact extraction → cortex_knowledge_facts
  → Claude Haiku extracts 5-20 atomic facts per page
  Entity extraction → cortex_entities
  → Named entities with mention counts
  Scoring + Qdrant embedding
  → Relevance scoring (0-1) per fact
  → Vector embeddings for semantic search
  Neo4j sync
  → Entity nodes + relationships

Phase 6: DOMAIN EXPERT (92%)
  DomainExpertService.generate(domain)
  → Deterministic condensation of all indexed pages
  → LLM compilation to expert artifact
  → Stored in cortex_domain_experts (versioned)

Phase 7: ASSET PIPELINE (95%)
  Download images/PDFs from crawled pages
  → Claude Vision describes images
  → GridFS storage with metadata

Phase 8: FINALIZE (100%)
  Update seed status, description, quality grade
  → Mark as 'done' in knowledge_seed_status
```

### Checkpoint/Resume
The pipeline supports checkpoint-based resume. If a job fails at Phase 5, re-triggering resumes from Wave 2 without re-crawling. Checkpoints: `none → crawl → filter → process → wave1 → wave2`.

### Smart Delta
If a domain already has indexed pages, re-ingestion skips crawl/filter and only processes new pages (delta).

---

## 3. Storage Architecture

### MongoDB Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `cortex_index` | Raw indexed pages | domain, title, content, markdown, sourceUrl, status |
| `cortex_knowledge_facts` | Atomic extracted facts | domain, content, confidence, entities, _relevanceScore |
| `cortex_entities` | Named entities | name, domain, mentionCount, type |
| `cortex_domain_experts` | Compiled domain expertise | domain, version, artifact, condensedHash, completenessScore |
| `cortex_domain_analysis` | Domain quality grading | domain, analysis.grade, analysis.summary |
| `cortex_agent_memories` | Operational wisdom | agentSlug, category, content, contexts, relevanceScore |
| `knowledge_seed_status` | Ingestion progress | seedId, phase, progress, documentsIngested |
| `knowledge_seeds_custom` | User-created seeds | id, name, url, domain, description |

### Qdrant Collections

| Collection | Purpose |
|---|---|
| `cortex_knowledge` | Vector embeddings of knowledge facts |
| `cortex_wisdom` | Vector embeddings of agent memories/wisdom |

### Neo4j

Nodes: `:Domain`, `:Document`, `:Concept`, `:Entity`
Relationships: `:BELONGS_TO`, `:MENTIONS`, `:RELATED_TO`

### Data Flow

```
Source (website)
  → cortex_index (raw pages)
  → cortex_knowledge_facts (extracted facts)
  → Qdrant cortex_knowledge (vectors)
  → Neo4j (entity graph)
  → cortex_domain_experts (compiled expertise)
```

---

## 4. Domain Expert System

### Architecture

```
cortex_index pages (131K chars raw)
     ↓ deterministic condense (regex/string, FREE)
condensed cards (~5K chars)
     ↓ LLM compile (Haiku, ~$0.01)
expert artifact (~2-3K chars, structured markdown)
     ↓ store
cortex_domain_experts (versioned, hash-diffed)
     ↓ retrieve (in-memory cached, 5min TTL)
ALL consumers: profiler, query engine, F1 agents, ContextBuilder
```

### Service: `DomainExpertService.ts`

**Methods:**
- `generate(domain, { force?, generatedBy? })` — full pipeline
- `retrieve(domain)` — cached hot-path read
- `refresh(domain)` — re-condense + hash-diff, skip LLM if unchanged
- `score(domain)` — compute completeness metrics
- `list()` — all domain experts with metadata

### Condensation Logic

Deterministic, no LLM. Per page:
1. Extract title (strip `- index` suffix)
2. Extract field definitions (`**_fieldName_**` → type on next line → required Yes/No)
3. Extract cross-references (`[DocType](...)` patterns, `**DocType**` in text)
4. Extract first meaningful paragraph (skip frontmatter, tables)
5. Compute information density score
6. Sort pages by density, cap at 6000 chars

### Hash-Based Diffing

On re-ingestion:
1. Compute SHA-256 of new condensed text
2. Compare against latest version's `condensedHash`
3. If match → no LLM call, update timestamp only
4. If changed → LLM recompile, new version, `diffSummary` computed

### Quality Metrics

- **factCoverage** — % of source pages represented in condensation
- **topicBreadth** — distinct topic count (20 topics = 100%)
- **definitionDensity** — field definitions per 1000 chars
- **crossRefDensity** — cross-references per 1000 chars
- **completenessScore** — weighted composite (0-100)

### API Endpoints

```
GET  /api/cortex/domain-experts              → list all
GET  /api/cortex/domain-experts?domain=X     → get specific
POST /api/cortex/domain-experts              → { domain, action: 'generate'|'refresh'|'score' }
```

---

## 5. Knowledge Retrieval

### Hybrid Retrieval (AgentMemoryService)

Five retrieval channels, merged and ranked:

1. **Agent text search** — MongoDB $text on agent-specific memories
2. **Agent recent** — latest memories by lastAccessedAt
3. **Shared text search** — MongoDB $text on shared memories (agentSlug=null)
4. **Shared recent** — latest shared memories
5. **Qdrant semantic** — vector similarity in `cortex_wisdom` collection

Results merged, deduplicated (>0.92 similarity = merge), ranked by combined relevance.

### Domain Expert Retrieval

Single call, in-memory cached:
```typescript
const expert = await domainExpertService.retrieve('regnostandard.com');
// Returns: { artifact: "...", version: 3, completenessScore: 90, ... }
```

### Schema Cache

Verified data structure facts stored as `category: 'schema_cache'` in `cortex_agent_memories`:
```typescript
const cache = await agentMemoryService.retrieveSchemaCache(dataSourceId, 20);
// Returns: field-level facts like "ConfigDoc._id is a String"
```

---

## 6. Context Injection

### ContextBuilder (v2)

Orchestrates what knowledge gets injected into each execution phase.

**TaskDescriptor** (auto-detected per execution):
```typescript
{
  domains: ['showcase', 'energy'],      // relevant domains
  entities: ['BESS', 'inverter'],       // key entities
  contextBudget: 'standard',            // none|light|standard|heavy
  needsWebResearch: false,
  needsDocumentAnalysis: true,
}
```

**PhaseNeeds** (per-phase control):
```typescript
{
  knowledgeFacts: true,          // cortex_knowledge_facts
  priorDocuments: false,         // DocumentStore
  agentMemory: true,             // AgentMemoryService (wisdom, patterns, errors)
  dataSourceContext: true,       // Connected data sources + regnoSchemaRef/domainExpert
  internalDocs: false,           // ./doc directory
  analysisMethodology: false,    // 3-tier analysis framework
}
```

### Injection Format

```markdown
## Agent Memory
- [wisdom] Always verify time range before querying ParamSamplesDoc
- [pattern] Use $group by configDocId for session-level aggregation
- [schema_cache] ParamDefDoc.sourceId is a free-form string identifier

## Domain Expert: regnostandard.com (v3, 90% complete)
### Regno Standard Schema Reference
ConfigDoc: _id:String*, startTime:Int64*, endTime:Int64, subConfigDocs:SubConfigDoc[]*
ParamSamplesDoc: configDocId:String* → ConfigDoc._id, paramDefDocId:String* → ParamDefDoc._id
...

## Data Source Context
Connected: Regno MongoDB (regno_standard, 23 sessions, 5000 params)
```

---

## 7. Wisdom & Learning

### Self-Annotation (WISDOM Protocol)

Phase prompts include:
```
WISDOM PROTOCOL: When you discover something operationally useful,
write [WISDOM]: <insight> on its own line.
```

Extracted by `Orchestrator.extractAndSaveAgentMemories()` with regex `\[WISDOM\]:?\s*(.{10,300})`.

### WisdomSynthesizer

Scheduled task that:
1. Groups `cortex_knowledge_facts` by domain
2. Extracts 2-4 actionable principles per domain via LLM
3. Cross-concern synthesis finds universal patterns
4. Stores as `category: 'wisdom'` in `cortex_agent_memories`

### Quality Auditor

After every execution:
- Layer 1: Objective metrics (tool precision, cost, speed)
- Layer 2: Output heuristics (HTML size, table count, number density)
- Layer 3: LLM quality assessment (~$0.10)
- Writes insights as patterns/errors/wisdom to shared memories

### Memory Lifecycle

- **Creation**: Auto from executions, wisdom synthesis, or manual
- **Reinforcement**: `confirmationCount` bumped when memory is reused successfully
- **Decay**: `wisdom-prune` scheduled task removes stale (>90 days unaccessed, low confirmation)
- **Feedback**: `usefulnessRating` from admin dashboard. Three strikes (rating <= -0.45) = auto-archive

---

## 8. Data Source Profiling

### Pipeline

```
Connect credential
  → Schema discovery (detect document types, collections)
  → Bucket creation (one per ConfigDoc/session)
  → Statistical profiling (aggregation pipelines per bucket)
  → LLM summary generation (per bucket + overall)
  → Knowledge ingestion (buckets → cortex_index + Qdrant + Neo4j)
  → Data integrity validation (cross-collection join checks)
  → HTML audit report generation
```

### Key Components

- **DataSourceProfiler** — generic orchestrator
- **RegnoStandardProfileEnricher** — Regno Standard schema-specific logic
- **DataSourceProfileWorker** — BullMQ background job (runs on EE server)
- **DataSourceValidator** — per-bucket integrity checking
- **DataSourceIngestion** — ingests bucket summaries into knowledge base

### Domain Expert Integration

The profiler now checks DomainExpertService before falling back to inline compilation:
```typescript
const expert = await domainExpertService.retrieve('regnostandard.com');
if (expert) return expert.artifact;
// ... fallback to inline compilation
```

---

## 9. Quality & Integrity

### Domain Analysis

`cortex_domain_analysis` stores per-domain quality grades:
- Grade: A/B/C/D/F
- Summary, recommendations, issues, strengths
- Generated by `knowledge-integrity-check` scheduled task

### Domain Expert Scoring

`cortex_domain_experts.completenessScore` (0-100):
- factCoverage (30%): source pages represented
- topicBreadth (30%): distinct topics covered
- definitionDensity (25%): field definitions extracted
- crossRefDensity (15%): relationships mapped

### Data Integrity Validation

Per data source:
- ParamSamplesDoc → ParamDefDoc link resolution
- Orphaned document detection
- Time range consistency
- Per-bucket pass/warn/fail with HTML audit report

---

## 10. Architecture Diagrams

### Full Knowledge Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Website    │    │   PDF/API    │    │  Data Source  │
│   Crawl      │    │   Upload     │    │  Connect     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────┐
│                KnowledgeSeedWorker (EE)               │
│  Crawl → Filter → Process → BulkIndex → AutoAudit   │
│                         │                             │
│              DomainExpertService.generate()           │
└──────────────────────────┬───────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌────────────┐ ┌────────┐ ┌──────────┐
       │cortex_index│ │  facts │ │ experts  │
       │ (raw pages)│ │(atomic)│ │(compiled)│
       └─────┬──────┘ └───┬────┘ └────┬─────┘
             │             │           │
             ▼             ▼           ▼
       ┌────────────┐ ┌────────┐ ┌──────────┐
       │   Qdrant   │ │ Neo4j  │ │ In-memory│
       │  (vectors) │ │(graph) │ │  (cache) │
       └─────┬──────┘ └───┬────┘ └────┬─────┘
             │             │           │
             └─────────────┼───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    ContextBuilder       │
              │  (merges all sources)   │
              └────────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌────────┐  ┌────────┐
         │Profiler│  │ Query  │  │  F1    │
         │        │  │ Engine │  │ Agents │
         └────────┘  └────────┘  └────────┘
```

### Condensation Pattern

```
Raw Content                    Condensed Cards              Expert Artifact
(131K chars)                   (5K chars)                   (2K chars)
                               
┌──────────────┐               ┌──────────────┐            ┌──────────────┐
│ ## ConfigDoc │               │ ## ConfigDoc │            │ ### ConfigDoc│
│ <5651 chars  │   Regex +     │ Fields: _id: │   LLM     │ Session root │
│ of HTML with │  ─────────►   │ String*, ... │  ────────► │ with start/  │
│ tables,      │   String      │ Refs: Sub... │   Haiku    │ endTime. FK: │
│ examples,    │   Parsing     │              │   $0.01    │ SubConfigDoc │
│ navigation>  │               │ ## ParamDef  │            │ ...          │
│              │               │ Fields: ...  │            │              │
│ ## ParamDef  │               │              │            │ ### Rules    │
│ <2716 chars> │               │ ...30 more   │            │ - IDs: str   │
│              │               │ sections     │            │ - Time: Int64│
│ ...41 more   │               │              │            │ - Binary: no │
│ pages        │               └──────────────┘            │   query      │
└──────────────┘                                           └──────────────┘
     Input                      Intermediate                   Output
  (all pages)              (ranked by density)            (stored, cached)
```

---

## 11. Key Files Reference

### Ingestion Pipeline
| File | Purpose |
|---|---|
| `src/lib/server/queues/workers/KnowledgeSeedWorker.ts` | Main ingestion worker (crawl → index → extract → expert → finalize) |
| `src/lib/server/services/cortexIndex.ts` | MongoDB cortex_index CRUD |
| `src/lib/server/cortex-flow/services/KnowledgePipelineService.ts` | Entity extraction, scoring, Qdrant embed |
| `src/lib/server/cortex/KnowledgeDistiller.ts` | LLM fact extraction from pages |

### Domain Expert System
| File | Purpose |
|---|---|
| `src/lib/server/services/DomainExpertService.ts` | Core service: generate, retrieve, refresh, score |
| `src/routes/api/cortex/domain-experts/+server.ts` | REST API for domain experts |
| `src/lib/server/services/RegnoStandardProfileEnricher.ts` | Consumer: uses expert for schema compilation |

### Knowledge Retrieval & Injection
| File | Purpose |
|---|---|
| `src/lib/server/cortex-flow/services/AgentMemoryService.ts` | Hybrid retrieval (text + semantic + recency) |
| `src/lib/server/cortex-flow/v2/ContextBuilder.ts` | Orchestrates knowledge injection into phase prompts |
| `src/lib/server/cortex-flow/services/WisdomSynthesizer.ts` | Facts → operational principles |

### Data Source Profiling
| File | Purpose |
|---|---|
| `src/lib/server/services/DataSourceProfiler.ts` | Generic profiling orchestrator |
| `src/lib/server/services/RegnoStandardProfileEnricher.ts` | Regno-specific bucket creation, topology discovery |
| `src/lib/server/queues/workers/DataSourceProfileWorker.ts` | Background profiling job |
| `src/lib/server/services/DataSourceIngestion.ts` | Ingest profiles into knowledge base |

### Quality & Maintenance
| File | Purpose |
|---|---|
| `src/lib/server/queues/workers/ScheduledWorker.ts` | Scheduled tasks: wisdom-prune, domain-expert-refresh, knowledge-audit |
| `src/lib/server/cortex-flow/services/QualityAuditor.ts` | Post-execution evaluation |

---

*Last updated: 2026-04-16. Generated from implementation of DomainExpertService and knowledge pipeline audit.*
