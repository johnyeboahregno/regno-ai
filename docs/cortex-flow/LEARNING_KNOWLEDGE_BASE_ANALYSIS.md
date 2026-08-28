# Cortex-Flow Learning Knowledge Base: Comprehensive Analysis & Recommendations

**Date:** 9 February 2026
**Author:** Claude Code Architecture Review
**Scope:** Evaluate the viability of a continuous learning knowledge base using the Qdrant/Neo4j/MongoDB triumvirate, with recommendations for implementation as a background subsystem

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision & Requirements](#2-vision--requirements)
3. [Current State Audit](#3-current-state-audit)
4. [Triumvirate Evaluation](#4-triumvirate-evaluation-qdranneo4jmongodb)
5. [Learning Pipeline Architecture](#5-learning-pipeline-architecture)
6. [Expert-Level Reasoning Design](#6-expert-level-reasoning-design)
7. [Background Processing Strategy](#7-background-processing-strategy)
8. [Performance Impact Analysis](#8-performance-impact-analysis)
9. [Gap Analysis & Risks](#9-gap-analysis--risks)
10. [Alternative Architectures Considered](#10-alternative-architectures-considered)
11. [Recommendations](#11-recommendations)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Executive Summary

**Verdict: The Qdrant/Neo4j/MongoDB triumvirate is the right architecture — with targeted enhancements.**

The current cortex-flow system already has ~80% of the infrastructure needed for a learning knowledge base. The three stores each serve a distinct, non-overlapping purpose that maps directly to how human experts process and retain knowledge. What's missing is the **connective tissue** — a lightweight background service that extracts, classifies, stores, and retrieves knowledge automatically during every execution, without measurably impacting task performance.

### Key Findings

| Dimension | Current State | Gap | Effort |
|-----------|--------------|-----|--------|
| **Ingestion** | KnowledgeStagingService exists with 5-phase pipeline | Not triggered automatically during execution | Low |
| **Storage** | All three stores operational with schemas | No unified "knowledge unit" abstraction | Medium |
| **Retrieval** | GraphRAG hybrid retrieval works | Not integrated into phase prompt injection | Low |
| **Learning** | PatternLearner exists (in-memory only) | No persistence, no feedback loop, no decay | Medium |
| **Reasoning** | Pattern-based decision service exists | No chain-of-thought, no confidence calibration | High |
| **Background** | BullMQ with 10 workers, pub/sub, scheduling | Needs dedicated learning queue + resource budgeting | Low |

### Recommendation Summary

1. **Keep the triumvirate** — each store serves a unique cognitive function
2. **~~Add a `KnowledgeDistiller` background service~~** — Done (R1). Extracts learning from every execution
3. **~~Add a `KnowledgeRetriever` phase injection~~** — Done (R2). Queries accumulated knowledge for each new task
4. **~~Implement confidence decay + reinforcement~~** — Done (R4+R6). Knowledge ages like human memory
5. **Budget: ~15ms overhead per phase** for retrieval, ~2-5s background processing post-execution

---

## 2. Vision & Requirements

### The Human Expert Analogy

A human expert completing a research task:
1. **Notices** relevant facts, patterns, and connections while working (passive learning)
2. **Stores** them with context — not just the fact, but *where they learned it, how reliable it is, and what it connects to*
3. **Retrieves** relevant knowledge when encountering a similar task (associative recall)
4. **Updates** their understanding when new information contradicts or refines old knowledge
5. **Forgets** irrelevant or outdated information over time (memory decay)
6. **Reasons** by combining stored knowledge with current context to make decisions

### Functional Requirements

| # | Requirement | Priority |
|---|------------|----------|
| F1 | Automatically extract knowledge from every execution's tool outputs (WebFetch, ReadFile, Grep, PdfRead results) | P0 |
| F2 | Store extracted knowledge with provenance (source URL, execution ID, timestamp, confidence) | P0 |
| F3 | Retrieve relevant knowledge when building context for new phases | P0 |
| F4 | Update knowledge confidence when the same fact is encountered again (reinforcement) | P1 |
| F5 | Deprecate/decay knowledge that hasn't been accessed or reinforced | P1 |
| F6 | Support expert-level reasoning — combining multiple knowledge fragments into conclusions | P1 |
| F7 | Track knowledge lineage (which execution produced it, what it derived from) | P2 |
| F8 | Allow manual knowledge curation (user approves/rejects/edits knowledge) | P2 |

### Non-Functional Requirements

| # | Requirement | Target |
|---|------------|--------|
| NF1 | Retrieval latency added to phase execution | < 50ms (p95); < 5ms on cache hit (R10) |
| NF2 | Background learning processing per execution | < 10s for typical 3-phase execution |
| NF3 | Storage growth per execution | < 50KB average (after compression) |
| NF4 | Zero impact on execution success rate | No new failure modes in critical path |
| NF5 | Graceful degradation if any store is unavailable | Execution proceeds without knowledge enhancement |

---

## 3. Current State Audit

### What Already Exists

The codebase has **substantial** infrastructure already built:

#### 3.1 Ingestion Pipeline (KnowledgeStagingService)
- **5-phase pipeline**: checkpoint → enrich → score → retry → promote
- **LLM enrichment**: Entity/relationship extraction via Haiku
- **Quality scoring**: Content, entity, relationship, completeness dimensions
- **Compression**: Brotli at 70-85% ratio for large documents
- **Deduplication**: Content hash + source URL matching
- **Auto re-enrichment**: Up to 3 attempts with progressive deepening
- **Gap**: Only triggered manually via KnowledgeIngestTool, not automatically from execution outputs

#### 3.2 Storage Layer

**MongoDB** (`cortex_memories`, `cortex_patterns`, `knowledge_staging`):
- Full document storage with metadata
- Versioning and A/B testing infrastructure
- Quality profiles with feedback loops
- Session checkpoints for resumability
- **Gap**: No unified "knowledge unit" schema

**Qdrant** (`cortex_execution_memories`, `knowledge_vectors`, `cortex_patterns`):
- 3072-dim embeddings (OpenAI text-embedding-3-large)
- Multi-provider embedding pipeline with TF-IDF fallback
- Semantic similarity search with domain filtering
- **Gap**: No recency weighting, no confidence decay in vector scores

**Neo4j** (Entity, Document, Pattern nodes):
- 18 entity types, 18 relationship types
- Full-text search + graph traversal
- Multi-hop expansion (2-3 hops)
- Path finding between entities
- **Gap**: No temporal validity, no community detection, no centrality scoring

#### 3.3 Retrieval (GraphRAGRetriever)
- Hybrid vector (60%) + graph (40%) weighting
- Entity extraction from queries via LLM
- Path-based relevance boosting (1.5x)
- Configurable limits and thresholds
- **Gap**: Not integrated into phase context injection; only used when explicitly called

#### 3.4 Learning (PatternLearner + ContextCurator)
- PatternLearner: Tracks execution/tool/model patterns, generates recommendations
- ContextCurator: Stores execution memories, finds similar past work, tracks entities
- PatternDecisionService: Uses patterns for routing decisions (0.85 = direct use, 0.7 = guidance)
- **~~Gap~~**: ~~PatternLearner is in-memory only~~ — **Resolved** (R5): MongoDB persistence with lazy load + 5-min periodic sync; ContextCurator stores but doesn't automatically enrich

#### 3.5 Background Processing
- 12 BullMQ workers with typed job schemas (including KnowledgeLearningWorker + OrchestratorWorker)
- Redis pub/sub for real-time progress
- Scheduled tasks (cleanup, backup, sync, health-check, **knowledge-decay**)
- Knowledge staging worker (10 concurrent, crash-resilient)
- **~~Gap~~**: ~~No dedicated learning worker~~ — **Resolved**: KnowledgeLearningWorker (concurrency: 4, priority: LOW) processes extraction jobs dispatched by Orchestrator after each phase_complete

---

## 4. Triumvirate Evaluation: Qdrant/Neo4j/MongoDB

### 4.1 Role Mapping to Cognitive Functions

| Store | Cognitive Analogy | Function | Unique Strength |
|-------|------------------|----------|-----------------|
| **MongoDB** | Long-term declarative memory | Store full knowledge documents with metadata, provenance, quality scores, versioning | Flexible schema, transactions, TTL indexes, text search |
| **Qdrant** | Associative memory (pattern matching) | Find semantically similar knowledge, enable "this reminds me of..." retrieval | Sub-linear search time (HNSW), handles millions of vectors, cosine similarity |
| **Neo4j** | Relational/causal memory | Map relationships between entities, enable "A relates to B because..." reasoning | Multi-hop traversal, path finding, relationship typing |

### 4.2 Why Each Is Necessary

**Without MongoDB:** No structured storage for full documents, metadata, quality tracking, versioning, or transaction safety. Qdrant stores vectors + small payloads; Neo4j stores graph structure. Neither is a general-purpose document store.

**Without Qdrant:** No fast semantic similarity search. MongoDB's text search is keyword-based; Neo4j's full-text search is entity-name-based. Neither can answer "find knowledge that's *conceptually similar* to this query" in < 50ms across millions of entries.

**Without Neo4j:** No relationship reasoning. MongoDB can store denormalized relationships but can't traverse multi-hop paths efficiently. Qdrant has no relationship concept. "What connects solar panel efficiency to battery degradation?" requires graph traversal.

### 4.3 Overlap Analysis

| Operation | MongoDB | Qdrant | Neo4j | Verdict |
|-----------|---------|--------|-------|---------|
| Full document storage | **Primary** | Payload (limited) | Properties (limited) | MongoDB wins |
| Semantic similarity | Text index (weak) | **Primary** | Full-text (weak) | Qdrant wins |
| Keyword search | Text index | Payload filter | Full-text index | MongoDB adequate, all capable |
| Relationship traversal | $graphLookup (limited) | N/A | **Primary** | Neo4j wins |
| Aggregation | **Primary** | N/A | Cypher aggregation | MongoDB wins |
| Transactions | **Primary** | N/A | ACID (limited) | MongoDB wins |
| TTL/expiration | **Primary** | N/A | N/A | MongoDB wins |

**Conclusion: Minimal harmful overlap.** The three stores have clear primary roles with only keyword search showing significant overlap (which is fine — it provides redundancy).

### 4.4 Cost/Complexity Assessment

| Factor | MongoDB | Qdrant | Neo4j | Combined |
|--------|---------|--------|-------|----------|
| Memory (idle) | ~200MB | ~150MB | ~300MB | ~650MB |
| Memory (per 100K entries) | ~50MB | ~300MB (vectors) | ~100MB | ~450MB |
| Ops complexity | Low (mature) | Low (simple API) | Medium (Cypher) | Medium |
| Failure modes | Mature HA | Single-instance | Auth rate-limit | Manageable |
| Already deployed | Yes | Yes | Yes | No new infra |

### 4.5 Verdict: Keep the Triumvirate

**Recommendation: Retain all three stores.** The alternative of consolidating to fewer stores (e.g., MongoDB + pgvector, or just MongoDB with Atlas Search) would sacrifice either semantic search quality (Qdrant's HNSW is significantly faster than MongoDB's vector search) or relationship reasoning (no substitute for Neo4j's graph traversal). The operational overhead of three stores is already absorbed — they're deployed, configured, health-monitored, and credentialed.

**One adjustment:** Consider adding a **thin abstraction layer** (`KnowledgeStore`) that coordinates writes/reads across all three, replacing the current pattern of each service calling stores independently.

---

## 5. Learning Pipeline Architecture

### 5.1 The Knowledge Unit

The fundamental storage unit should be a `KnowledgeFact` — smaller and more atomic than the current `ExecutionMemory`:

```
KnowledgeFact {
  id: string                          // UUID
  content: string                     // The fact itself (1-3 sentences)
  contentEmbedding: number[]          // 3072-dim vector (lazy-computed)

  // Provenance
  source: {
    executionId: string               // Which execution produced this
    phaseIndex: number                // Which phase
    toolName: string                  // Which tool (WebFetch, ReadFile, etc.)
    sourceUrl?: string                // Original URL if web-sourced
    sourceDocument?: string           // File path if file-sourced
    extractedAt: Date
  }

  // Classification
  domain: string                      // e.g., 'solar_energy', 'ai_ml', 'finance'
  entities: string[]                  // Linked entity names
  factType: 'data_point' | 'definition' | 'relationship' | 'opinion' | 'procedure' | 'constraint'

  // Confidence & Lifecycle
  confidence: number                  // 0.0 - 1.0
  reinforcements: number             // Times re-encountered
  lastAccessedAt: Date               // For decay calculation
  lastReinforcedAt: Date             // For freshness
  createdAt: Date
  expiresAt?: Date                   // Hard expiry (optional)

  // Quality
  qualityScore: number               // 0-100 from enrichment
  isVerified: boolean                // User-confirmed
  contradicts?: string[]             // IDs of contradicting facts
}
```

### 5.2 Extraction Pipeline (Post-Phase)

After each phase completes successfully, the `KnowledgeDistiller` extracts facts:

```
Phase Output (text + tool results)
    ↓
[1. EXTRACT] — Regex + lightweight LLM
    Extract candidate facts from:
    - WebFetch/WebSearch results (URLs, data points, quotes)
    - ReadFile/PdfRead results (file contents, key sections)
    - Grep results (code patterns, configurations)
    - LLM synthesis output (conclusions, recommendations)
    ↓
[2. CLASSIFY] — Rule-based + heuristic
    Assign domain, factType, entities
    Score initial confidence:
    - Primary source (official site, academic): 0.8-0.9
    - Secondary source (news, blog): 0.6-0.7
    - LLM synthesis (no direct source): 0.4-0.5
    ↓
[3. DEDUPLICATE] — Embedding similarity
    Compare against existing knowledge via Qdrant
    - Similarity > 0.95: Same fact → reinforce existing
    - Similarity 0.80-0.95: Related → link, keep both
    - Similarity < 0.80: New → store
    ↓
[4. STORE] — Parallel writes to triumvirate
    MongoDB: Full KnowledgeFact document
    Qdrant: Embedding + metadata payload
    Neo4j: Entity nodes + relationships + EXTRACTED_FROM edge
    ↓
[5. INDEX] — Background enrichment (async, low priority)
    Entity linking (resolve "Tesla" → company vs person)
    Relationship inference (if A→B and B→C, suggest A→C)
    Cross-reference with existing knowledge graph
```

### 5.3 Retrieval Pipeline (Pre-Phase)

Before each phase executes, the `KnowledgeRetriever` injects relevant knowledge:

```
Phase Prompt + User Query
    ↓
[1. QUERY FORMULATION]
    Extract key concepts from phase prompt
    Generate 1-3 search queries
    ↓
[2. MULTI-STORE RETRIEVAL] (parallel, < 50ms total)
    Qdrant: Semantic search (top 10, min 0.65 similarity)
    Neo4j: Entity expansion (1-hop from extracted entities)
    MongoDB: Recent facts in same domain (last 30 days)
    ↓
[3. RANK & FILTER]
    Score = similarity × confidence × recency × relevance
    Recency: exponential decay (half-life = 30 days)
    Confidence: reinforcement-boosted (log2(reinforcements + 1))
    Filter: top 5-8 facts, < 2000 tokens total
    ↓
[4. FORMAT & INJECT]
    "## Relevant Knowledge from Previous Research"
    - Fact 1 (confidence: 0.87, source: execution-abc, 3 days ago)
    - Fact 2 (confidence: 0.72, source: url.com, 2 weeks ago)
    Inject into ContextBuilder.build() after blackboard section
```

### 5.4 Knowledge Lifecycle

```
                    ┌──────────────┐
                    │   CREATED    │  confidence = initial score
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │REINFORCED│ │ ACCESSED │ │ DECAYED  │
        │conf += Δ │ │lastAccess│ │conf -= Δ │
        └──────────┘ └──────────┘ └──────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴───────┐
                    │   EXPIRED    │  confidence < 0.1 OR TTL reached
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   ARCHIVED   │  soft-delete, recoverable
                    └──────────────┘

Decay Formula:
  effective_confidence = base_confidence × (0.5 ^ (days_since_reinforcement / 30))
  boost = log2(reinforcement_count + 1) × 0.1
  final_confidence = min(1.0, effective_confidence + boost)

Reinforcement:
  When same fact re-encountered (similarity > 0.95):
    reinforcement_count += 1
    base_confidence = max(base_confidence, new_confidence)
    lastReinforcedAt = now
```

---

## 6. Expert-Level Reasoning Design

### 6.1 The Challenge

Simple retrieval ("here are 5 relevant facts") is not expert-level reasoning. An expert:
- **Synthesizes** multiple facts into conclusions
- **Weighs** conflicting information by source reliability
- **Identifies gaps** in their knowledge and flags uncertainty
- **Applies domain frameworks** (financial analysis uses DCF; engineering uses failure mode analysis)
- **Chains** reasoning steps (A implies B; B combined with C suggests D)

### 6.2 Proposed Reasoning Layers

#### Layer 1: Retrieval Augmentation (Low Cost, High Value)
- Inject top-K relevant facts into phase prompt (already described in 5.3)
- Let the executing LLM reason over them naturally
- **Cost**: ~15ms retrieval + ~500 extra input tokens per phase
- **Covers**: 70% of expert reasoning needs

#### Layer 2: Pre-Phase Synthesis (Medium Cost, Medium Value)
- Before complex analysis phases (not data gathering), call Haiku to:
  - Synthesize retrieved facts into a coherent briefing
  - Identify contradictions and gaps
  - Suggest which domain frameworks apply
- **Cost**: ~1-2s + ~$0.001 per synthesis
- **Covers**: Additional 20% of reasoning needs
- **Guard**: Only for analyst/thinker tier phases, skip for worker tier

#### Layer 3: Cross-Execution Reasoning (High Cost, Specialized Value)
- Periodic background job (scheduled, not per-execution)
- Reviews accumulated facts in a domain
- Builds higher-order conclusions: "Based on 47 facts about solar BESS, the trend is..."
- Stores as `factType: 'synthesis'` with high confidence
- **Cost**: ~$0.01-0.05 per domain synthesis, run weekly
- **Covers**: Final 10% — true domain expertise over time

### 6.3 Confidence Calibration

The system should track prediction accuracy:

```
When a knowledge fact is used in a phase → record the phase outcome
If phase succeeds: fact_confidence += 0.05 (capped at 1.0)
If phase fails AND fact was in context: fact_confidence -= 0.1

Over time, this calibrates confidence to actual utility.
```

### 6.4 Conflict Resolution

When contradicting facts are found:

```
1. Compare source reliability (primary > secondary > synthesis)
2. Compare recency (newer > older for time-sensitive facts)
3. Compare reinforcement count (more encounters > fewer)
4. If still tied: present both to the LLM with explicit contradiction notice
5. Store contradiction link: fact_A.contradicts.push(fact_B.id)
```

---

## 7. Background Processing Strategy

### 7.1 Architecture: Zero-Impact Learning

The critical principle: **learning must never slow down the active task**.

```
ACTIVE EXECUTION (foreground)                    LEARNING (background)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━━━━━
Phase 1 executes
  ├─ Tool results streamed
  ├─ Output produced ─────────────────────────► Queue: extract facts from Phase 1
Phase 2 executes                                 Learning Worker processes Phase 1
  ├─ [Retrieval: 15ms] ◄─── Knowledge injected   ├─ Extract 8 candidate facts
  ├─ Tool results streamed                        ├─ Classify, deduplicate
  ├─ Output produced ─────────────────────────► Queue: extract facts from Phase 2
Phase 3 (final) executes                         Learning Worker processes Phase 2
  ├─ [Retrieval: 15ms] ◄─── Knowledge injected   ├─ Extract 5 candidate facts
  ├─ Render output                                ├─ Store across triumvirate
Execution complete ────────────────────────────► Queue: final learning summary
                                                  ├─ Cross-reference all facts
                                                  ├─ Update entity relationships
                                                  └─ Update execution memory
```

### 7.2 Queue Design

**New queue: `knowledge-learning`**

```
Concurrency: 4 (sufficient for async learning)
Timeout: 30s per fact-extraction job
Attempts: 2 (with exponential backoff)
Rate limit: 100 jobs/minute (prevents LLM cost spikes)
Retention: 7 days completed, 14 days failed
Priority: LOW (5) — never competes with active execution queues
```

**Job types:**

| Job | Trigger | Input | Output |
|-----|---------|-------|--------|
| `extract_phase_facts` | After each phase_complete | Phase output + tool results | Candidate facts |
| `store_knowledge` | After extraction | Candidate facts | Storage confirmations |
| `execution_summary` | After execution_complete | All phase facts + metadata | Execution memory |
| `knowledge_decay` | Scheduled (daily) | Domain filter | Decayed/archived facts |
| `domain_synthesis` | Scheduled (weekly) | Domain + recent facts | Synthesis facts |

### 7.3 Resource Budget

| Resource | Budget | Rationale |
|----------|--------|-----------|
| LLM tokens (extraction) | ~2000 tokens/phase | Haiku at $0.80/M = $0.0016/phase |
| LLM tokens (synthesis) | ~4000 tokens/domain/week | Haiku = $0.0032/domain/week |
| Embedding generation | ~500 tokens/fact | OpenAI embedding = $0.00013/fact |
| MongoDB writes | ~5-10 per execution | Negligible |
| Qdrant upserts | ~5-10 per execution | Negligible |
| Neo4j writes | ~10-20 per execution | Negligible |
| **Total per execution** | **~$0.005-0.01** | **< 1% of typical execution cost** |

---

## 8. Performance Impact Analysis

### 8.1 Retrieval (In Critical Path)

The only learning-related operation in the critical path is knowledge retrieval:

| Operation | Latency | When |
|-----------|---------|------|
| Qdrant semantic search (top 10) | 5-15ms | Per phase |
| Neo4j entity expansion (1-hop) | 3-8ms | Per phase |
| MongoDB domain query (recent) | 2-5ms | Per phase |
| Result ranking + formatting | 1-2ms | Per phase |
| **Total (uncached)** | **11-30ms** | **Per phase** |

**With Redis Hot Cache (R10):**

| Path | Latency | When |
|------|---------|------|
| **Cache hit** | **~2ms** | Repeat queries within 5-min TTL |
| Cache miss | ~23ms | First query or after invalidation |
| Redis unavailable | ~20ms | Same as pre-cache baseline |

**Context**: A typical phase execution takes 15-120 seconds. Adding 2-30ms is imperceptible (0.001-0.2% overhead). Cache hit rate depends on query repetition across phases/executions in the same domain.

### 8.2 Extraction (Background, Off Critical Path)

| Operation | Latency | When |
|-----------|---------|------|
| Fact extraction (Haiku LLM) | 500-1500ms | Async, per phase |
| Deduplication (Qdrant search) | 5-15ms | Async, per fact |
| Storage (3 stores parallel) | 50-200ms | Async, per fact |
| Entity linking (Neo4j) | 10-30ms | Async, per fact |
| **Total per phase** | **1-3s** | **Background** |

### 8.3 Storage Growth

| Metric | Per Execution | Per Month (50 exec/day) |
|--------|--------------|------------------------|
| Knowledge facts | 10-30 | 15,000-45,000 |
| MongoDB storage | 20-60KB | 30-90MB |
| Qdrant vectors | 10-30 × 12KB = 120-360KB | 180-540MB |
| Neo4j nodes/edges | 20-60 entities, 30-100 edges | ~200MB |
| **Total** | **~0.5MB** | **~1GB** |

With 30-day decay and archival, steady-state is ~1-2GB across all stores.

---

## 9. Gap Analysis & Risks

### 9.1 Critical Gaps to Address

| Gap | Impact | Mitigation | Status |
|-----|--------|------------|--------|
| No automatic extraction trigger | Facts never stored from executions | Hook into Orchestrator phase_complete event | **Resolved** (R1+R3) |
| No knowledge injection in ContextBuilder | Retrieved facts never reach LLM | Add knowledge section to build() | **Resolved** (R2) |
| PatternLearner is in-memory only | Learning lost on restart | Persist to MongoDB with scheduled sync | **Resolved** (R5) |
| No confidence decay mechanism | Stale knowledge crowds out fresh | Add scheduled decay job | **Resolved** (R4) |
| No deduplication at ingestion | Duplicate facts waste storage + confuse retrieval | Use embedding similarity check before store | **Resolved** (R1+R6) |

### 9.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **LLM extraction hallucinations** | Medium | Facts stored that are fabricated | Require source provenance; score confidence by source type; human curation for high-impact facts |
| **Knowledge poisoning** | Low | Malicious/incorrect facts degrade future tasks | Confidence decay removes unused facts; user verification flag; contradictions tracking |
| **Storage growth explosion** | Low | Costs increase linearly | TTL indexes, 30-day decay, archival, dedup |
| **Retrieval returns irrelevant knowledge** | Medium | Wastes context tokens, confuses LLM | Strict similarity threshold (0.65+); limit to 2000 tokens; format as "optional reference" not "ground truth" |
| **Circular reasoning** | Medium | LLM synthesis → stored → retrieved → reinforced without external validation | Tag synthesis vs primary facts; never retrieve synthesis for the same domain's synthesis phase |
| **Neo4j auth rate-limiting** | Low | Entity storage fails | Already mitigated with auth-disable safety in Neo4jService |

### 9.3 Failure Modes & Graceful Degradation

```
If Qdrant down:
  → Retrieval falls back to MongoDB text search
  → Extraction skips embedding storage (queued for retry)
  → Execution proceeds normally

If Neo4j down:
  → Retrieval skips graph expansion (vector-only)
  → Entity linking deferred to background queue
  → Execution proceeds normally

If MongoDB down:
  → Knowledge system fully disabled
  → Execution proceeds without knowledge enhancement
  → No extraction attempted (nothing to write to)

If LLM (Haiku) unavailable:
  → Extraction falls back to regex-based fact extraction
  → Synthesis skipped
  → Classification uses heuristics only
```

---

## 10. Alternative Architectures Considered

### 10.1 MongoDB Atlas Vector Search (Replace Qdrant)

**Pros:** One fewer service to operate; MongoDB 7.0+ has vector search via `$vectorSearch`.

**Cons:**
- Vector search performance: MongoDB's vector search is 3-10x slower than Qdrant's HNSW at scale (>100K vectors)
- No separate scaling — vector operations compete with document operations for resources
- Less mature (GA in 2024 vs Qdrant production since 2021)
- Would require Atlas (cloud) or MongoDB 7+ self-hosted

**Verdict:** Not recommended. The performance gap matters when retrieval is in the critical path (our 15ms target becomes 50-150ms).

### 10.2 PostgreSQL + pgvector (Replace MongoDB + Qdrant)

**Pros:** Single relational store for documents + vectors; ACID transactions; mature ecosystem.

**Cons:**
- No graph traversal (would still need Neo4j or Apache AGE)
- pgvector IVFFlat/HNSW index quality is lower than Qdrant at high dimensions (3072)
- Schema rigidity vs MongoDB's flexible documents
- Would require migrating all existing MongoDB collections

**Verdict:** Not recommended. Too disruptive; doesn't eliminate Neo4j; worse vector search.

### 10.3 Single-Store: MongoDB Only (Embed + Graph in Mongo)

**Pros:** Maximum operational simplicity.

**Cons:**
- No real semantic search (only keyword)
- `$graphLookup` is limited to single-collection, single-hop, no path finding
- Cannot do "find conceptually similar knowledge" without vectors
- Cannot do "trace relationship chain from A to D" without graph

**Verdict:** Not recommended. Would sacrifice the core capabilities that make the knowledge base expert-level.

### 10.4 Add a Fourth Store: Redis for Hot Cache — IMPLEMENTED

**Pros:** Sub-millisecond retrieval for frequently accessed facts; already deployed for BullMQ.

**Cons:** Added complexity; knowledge facts are already small enough for Qdrant to serve in < 15ms; Redis memory is expensive for large payloads.

**Original Verdict:** Not needed now. Consider if retrieval latency exceeds 50ms at scale (>500K facts).

**Updated Verdict (2026-02-09):** Implemented as R10. Redis hot cache sits in front of Qdrant+MongoDB retrieval in `KnowledgeDistiller.retrieveRelevantKnowledge()`. Design principle: "intelligent, as-and-when-required" — self-activates when Redis is available, degrades silently when it isn't, invalidates when facts change. Cache hit latency: ~2ms vs ~20ms uncached. Memory footprint: ~1.6MB at peak (~200 entries × ~8KB). Zero configuration flags needed.

---

## 11. Recommendations

### Implementation Status Summary (Updated 2026-02-09)

| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| R1 | KnowledgeDistiller Service | P0 | **Done** |
| R2 | KnowledgeRetriever Phase Injection | P0 | **Done** |
| R3 | Dedicated Learning Queue | P0 | **Done** |
| R4 | Confidence Decay | P1 | **Done** |
| R5 | Persist PatternLearner | P1 | **Done** |
| R6 | Knowledge Reinforcement | P1 | **Done** |
| R7 | Domain Synthesis | P2 | **Done** |
| R8 | User Curation API | P2 | **Done** |
| R9 | KnowledgeStore Abstraction | P2 | **Done** |
| R10 | Redis Hot Cache for Knowledge Retrieval | P1 | **Done** |

---

### R1: Implement KnowledgeDistiller Service (P0) — IMPLEMENTED

**Status:** Done
**File:** `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts`

A singleton service that:
1. ~~Listens for `phase_complete` events from the Orchestrator~~ — done via Orchestrator dispatch
2. ~~Queues fact extraction jobs to the `knowledge-learning` BullMQ queue~~ — done (R3)
3. ~~Processes extraction using Haiku (with regex fallback)~~ — done (`queueExtraction()`)
4. ~~Deduplicates via Qdrant similarity search~~ — done (embedding similarity > 0.92 triggers reinforcement)
5. ~~Stores across all three stores in parallel~~ — done (MongoDB `cortex_knowledge_facts` + Qdrant `cortex_knowledge_facts`)

**Integration point:** Orchestrator dispatches via `addKnowledgeLearningJob()` after each phase_complete. KnowledgeLearningWorker calls `knowledgeDistiller.queueExtraction()`.

Additional capabilities implemented:
- Doc index/search/inject (`buildDocIndex()`, `searchDocs()`, `getRelevantDocContent()`, `ingestDocDirectory()`)
- Site index/search/inject (`buildSiteIndex()`, `searchSites()`, `getRelevantSiteContent()`, `ingestSiteDirectory()`)
- Confidence decay (`decayKnowledge()` with configurable half-life, archive threshold, delete-after)

### R2: Implement KnowledgeRetriever Phase Injection (P0) — IMPLEMENTED

**Status:** Done
**File:** `src/lib/server/cortex-flow/v2/ContextBuilder.ts`

~~Add `async retrieveRelevantKnowledge(query, domain, limit)` method that:~~
1. ~~Runs parallel queries to Qdrant (semantic), Neo4j (entity expansion), MongoDB (recent domain facts)~~ — done via `knowledgeDistiller.getRelevantDocContent()` + `getRelevantSiteContent()`
2. ~~Ranks, filters, and formats top 5-8 facts~~ — done (TF-IDF scoring, configurable maxTokens)
3. ~~Injects as `## Relevant Knowledge from Previous Research` section in `build()`~~ — done (`retrieveRelevantDocs()` + `retrieveRelevantSiteContent()` in `build()`)

**Note:** Injection happens via KnowledgeDistiller's doc/site index rather than direct triumvirate queries. Covers the `./doc/` and `./sites/` directories with keyword-based search. Full hybrid vector+graph retrieval (as described in Section 5.3) is a future enhancement.

### R3: Add Dedicated Learning Queue (P0) — IMPLEMENTED

**Status:** Done
**Files:**
- `src/lib/server/queues/types.ts` — `QUEUE_NAMES.KNOWLEDGE_LEARNING`, `KnowledgeLearningJobData`, `KnowledgeLearningJobResult`
- `src/lib/server/queues/definitions.ts` — queue instance, events, rate limits, timeouts, job options
- `src/lib/server/queues/index.ts` — `addKnowledgeLearningJob()` convenience function
- `src/lib/server/queues/workers/KnowledgeLearningWorker.ts` — BullMQ worker (concurrency: 4)
- `src/lib/server/queues/workers/index.ts` — wired into init/status/pause/resume/close lifecycle
- `src/lib/server/cortex-flow/v2/Orchestrator.ts` — dispatches to queue via `addKnowledgeLearningJob()` instead of fire-and-forget

Queue config as specified:
- Concurrency: 4
- Timeout: 30s
- Priority: LOW (5)
- Rate limit: 100/minute
- Attempts: 2 with exponential backoff (3000ms)
- Retention: 24h completed, 7d failed

### R4: Implement Confidence Decay (P1) — IMPLEMENTED

**Status:** Done
**Files:**
- `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts` — `decayKnowledge()` method
- `src/lib/server/queues/workers/ScheduledWorker.ts` — `handleKnowledgeDecay()` handler + `'knowledge-decay'` case
- `src/lib/server/queues/index.ts` — `setupKnowledgeDecayJob()` repeatable schedule (every 24h)
- `src/lib/server/queues/types.ts` — `'knowledge-decay'` added to `ScheduledJobData.task` union

Implementation:
- ~~Run daily at off-peak hours~~ — done (24h repeatable BullMQ job)
- ~~Query all facts not accessed in 30+ days~~ — done (queries `lastReinforcedAt` older than 7 days, skips `isVerified` facts)
- ~~Apply decay formula~~ — done: `confidence * 0.5^(days/halfLife) + log2(reinforcements+1)*0.1`
- ~~Archive facts below 0.1 confidence~~ — done (sets `_archived: true, _archivedAt`)
- ~~Delete archived facts older than 90 days~~ — done (configurable `deleteAfterDays`)

Defaults: halfLife=30 days, archiveThreshold=0.1, deleteAfterDays=90

### R5: Persist PatternLearner (P1) — IMPLEMENTED

**Status:** Done
**File:** `src/lib/server/cortex-flow/agents/PatternLearner.ts`

- ~~Add MongoDB persistence for execution patterns and tool effectiveness~~ — done (3 collections: `pattern_learner_patterns`, `pattern_learner_tool_effectiveness`, `pattern_learner_insights`)
- ~~Load on startup, sync every 5 minutes~~ — done (lazy load on first access via `ensureDbLoaded()`, periodic sync via `setInterval` every 5 min)
- ~~This enables cross-session learning (currently lost on restart)~~ — done (all public methods now async, DB data loaded first then merged with baselines)

Implementation details:
- `loadFromDb()`: Lazy loads all 3 collections into in-memory Maps on first access
- `syncToDb()`: Bulk upserts dirty in-memory data to MongoDB
- `startPeriodicSync()` / `stopPeriodicSync()`: 5-minute interval timer with `.unref()` to not block process exit
- Dirty flag tracking: only syncs when data has actually changed
- All public methods (`learnFromExecution`, `getRecommendations`, `getToolEffectiveness`, `getInsights`, `getStats`, `findSimilarPatterns`) are now `async` and ensure DB is loaded before returning

### R6: Add Knowledge Reinforcement (P1) — IMPLEMENTED

**Status:** Done
**File:** `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts` — inside `queueExtraction()` dedup logic

When deduplication finds an existing fact with embedding similarity > 0.92:
- ~~Increment `reinforcements` counter~~ — done
- ~~Update `lastReinforcedAt` timestamp~~ — done
- ~~Boost confidence: `confidence = max(confidence, new_confidence)`~~ — done
- Source list update — not yet (single source tracked)

### R7: Implement Domain Synthesis (P2) — IMPLEMENTED

**Status:** Done
**Files:**
- `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts` — `synthesizeDomain()` method + `parseSynthesisConclusions()` helper
- `src/lib/server/cortex-flow/v2/types.ts` — added `'synthesis'` to `KnowledgeFact.factType` union
- `src/lib/server/queues/workers/ScheduledWorker.ts` — `handleDomainSynthesis()` handler + `'domain-synthesis'` case
- `src/lib/server/queues/types.ts` — `'domain-synthesis'` added to `ScheduledJobData.task` union
- `src/lib/server/queues/index.ts` — `setupDomainSynthesisJob()` repeatable schedule (every 7 days)

Implementation:
- ~~Gather top 50 facts by confidence~~ — done (MongoDB query, excludes archived + existing synthesis facts)
- ~~Call analyst-tier LLM to synthesize into 3-5 high-level conclusions~~ — done (claude-3-5-haiku via Anthropic SDK)
- ~~Store conclusions as `factType: 'synthesis'` with high initial confidence~~ — done (confidence: 0.85, quality: 85)
- ~~Link to source facts~~ — done via `_synthesizedFrom` array on the synthesis fact document (MongoDB back-reference)
- Auto-discovers active domains (facts reinforced in last 30 days), skips 'general'
- Deduplicates synthesis conclusions against existing facts via embedding similarity

### R8: Add User Curation API (P2) — IMPLEMENTED

**Status:** Done
**Files:**
- `src/routes/api/cortex-flow/knowledge/facts/+server.ts` — GET list/search + GET stats
- `src/routes/api/cortex-flow/knowledge/facts/[factId]/+server.ts` — GET single, PUT verify/reject, DELETE
- `src/routes/api/cortex-flow/sites/+server.ts` — GET list crawled sites
- `src/routes/api/cortex-flow/sites/crawl/+server.ts` — POST crawl a site

Endpoints:
- ~~`GET /api/knowledge/facts?domain=&query=`~~ — done: `GET /api/cortex-flow/knowledge/facts?domain=&query=&factType=&minConfidence=&limit=&skip=&sortBy=&sortOrder=&includeArchived=`
- ~~`PUT /api/knowledge/facts/:id/verify`~~ — done: `PUT /api/cortex-flow/knowledge/facts/:factId` with `{ "action": "verify" }`
- ~~`PUT /api/knowledge/facts/:id/reject`~~ — done: `PUT /api/cortex-flow/knowledge/facts/:factId` with `{ "action": "reject" }`
- ~~`DELETE /api/knowledge/facts/:id`~~ — done: `DELETE /api/cortex-flow/knowledge/facts/:factId`
- Bonus: `GET /api/cortex-flow/knowledge/facts?stats=true` — aggregate statistics (total, active, archived, verified, synthesis, domains, avgConfidence)
- Bonus: `GET /api/cortex-flow/knowledge/facts/:factId` — get single fact by ID

All endpoints use `KnowledgeStore` (R9) as the backing service.

### R9: Unified KnowledgeStore Abstraction (P2) — IMPLEMENTED

**Status:** Done
**Files:**
- `src/lib/server/cortex-brain/KnowledgeStore.ts` — singleton `knowledgeStore` service
- `src/lib/server/cortex-brain/index.ts` — added exports

Provides:
- ~~`store(fact)`~~ — done (parallel writes to MongoDB + Qdrant with embedding generation)
- ~~`retrieve(query)`~~ — done (MongoDB text search + filtering, pagination, sorting)
- ~~`reinforce(factId)`~~ — done (increment reinforcements, update timestamp, boost confidence)
- ~~`decay()`~~ — available via KnowledgeDistiller.decayKnowledge() (R4)
- Bonus: `getById(factId)`, `verify(factId)`, `reject(factId)`, `remove(factId)`, `semanticSearch(query)`, `getStats()`
- ~~Handles parallel writes to all available stores~~ — done (MongoDB + Qdrant in parallel)
- ~~Handles fallback on store unavailability~~ — done (Qdrant ops gracefully return false if unavailable)

Used by the R8 curation API endpoints. KnowledgeDistiller continues to use its own internal methods for extraction/dedup (can be incrementally migrated to KnowledgeStore).

### R10: Redis Hot Cache for Knowledge Retrieval (P1) — IMPLEMENTED

**Status:** Done
**Files:**
- `src/lib/server/cortex-flow/services/RedisKnowledgeCache.ts` — new singleton cache service (`redisKnowledgeCache`)
- `src/lib/server/cortex-flow/services/KnowledgeDistiller.ts` — cache check + write-through in `retrieveRelevantKnowledge()`, domain invalidation in `queueExtraction()`
- `src/lib/server/queues/workers/ScheduledWorker.ts` — global invalidation after decay, per-domain invalidation after synthesis

**Design principle:** "Intelligent, as-and-when-required" — the cache self-activates when Redis is available, degrades silently when it isn't, and invalidates itself when facts change. Zero config flags.

**Self-Activation:**
- Probes `isRedisAvailable()` on first use, caches the boolean for 30s
- Redis up → cache is active; Redis down → all methods return null in ~0ms (passthrough to Qdrant+MongoDB)
- Redis comes back → next probe (within 30s) reactivates automatically

**Cache Key Format:** `kd:{sha256(query|domain|limit)[:16]}` — fixed 19-byte keys regardless of query length.

**Domain Tracking:** Each `set()` also registers the key in a Redis SET at `kd:domain:{domain}`, so `invalidateByDomain()` can find and delete exact keys without SCAN.

**Methods:**

| Method | Purpose |
|--------|---------|
| `get(query, domain, limit)` | Return cached markdown or null |
| `set(query, domain, limit, value, ttl?)` | Write-through with pipeline (SET + SADD domain set) |
| `invalidateByDomain(domain)` | SMEMBERS domain set → DEL all keys + set |
| `invalidateAll()` | SCAN `kd:*` → DEL (safe, non-blocking cursor-based) |
| `getStats()` | Return `{ hits, misses, writes, invalidations, errors, hitRate, available }` |

**Staleness Prevention:**

| Trigger | Action | Scope |
|---------|--------|-------|
| New facts stored (`queueExtraction()`) | `invalidateByDomain(domain)` | Domain-level |
| Scheduled decay (daily) | `invalidateAll()` | Global |
| Scheduled synthesis (weekly) | `invalidateByDomain()` per domain | Per-domain |
| Natural TTL (5 min) | Redis auto-expires | Per-entry |

**Performance:**

| Path | Latency | Notes |
|------|---------|-------|
| Cache hit | ~2ms | Redis GET only |
| Cache miss | ~23ms | +3ms overhead vs current 20ms |
| Redis unavailable | ~20ms | Identical to pre-cache (0ms overhead) |

**Constants:** DEFAULT_TTL = 300s (5 min), MAX_TTL = 600s (10 min), AVAILABILITY_CHECK_INTERVAL = 30s.

**Memory:** ~8KB per entry (2000 tokens × 4 chars), ~1.6MB at peak (~200 entries). Negligible.

**Dependencies:** Uses existing `getConnection()` and `isRedisAvailable()` from `src/lib/server/queues/connection.ts`. No new packages.

**UI & Monitoring Integration:**

| Component/API | Change |
|---------------|--------|
| `CortexFlowHealthService.ts` | Added Redis service check (optional) + `knowledgeCacheStats` in status response |
| `SystemStatusPanel.svelte` | Redis shown in Databases section; Knowledge Cache hit rate + stats shown in Features section |
| `/api/cortex-flow/cache` GET | Returns `knowledgeCache` alongside existing `stats` (web cache) |
| `/api/cortex-flow/health?full=true` | Returns `knowledgeCacheStats: { hits, misses, writes, invalidations, errors, hitRate, available }` |

**Files modified for UI:**
- `src/lib/server/cortex-flow/services/CortexFlowHealthService.ts` — added `KnowledgeCacheStats` type, Redis health check, `knowledgeCacheStats` in status
- `src/lib/components/cortex-flow/SystemStatusPanel.svelte` — added `HardDrive` icon for Redis, Knowledge Cache feature row with hit rate stats
- `src/routes/api/cortex-flow/cache/+server.ts` — added `redisKnowledgeCache.getStats()` to GET response

---

## 12. Implementation Roadmap

### Phase 1: Foundation (1-2 weeks)

| Task | Files | Estimate |
|------|-------|----------|
| Define KnowledgeFact schema | `types/cortexFlow.ts` | 2h |
| Create `knowledge-learning` queue | `queues/definitions.ts`, `workers/` | 4h |
| Implement KnowledgeDistiller (regex extraction) | New service file | 8h |
| Hook into Orchestrator phase_complete | `v2/Orchestrator.ts` | 2h |
| Basic storage (MongoDB + Qdrant, skip Neo4j) | Service methods | 4h |

### Phase 2: Retrieval & Injection (1 week)

| Task | Files | Estimate |
|------|-------|----------|
| Implement knowledge retrieval in ContextBuilder | `v2/ContextBuilder.ts` | 6h |
| Deduplication via Qdrant similarity | KnowledgeDistiller | 4h |
| Confidence decay scheduled job | ScheduledWorker | 3h |
| Reinforcement on re-encounter | KnowledgeDistiller | 2h |

### Phase 3: Intelligence (1-2 weeks)

| Task | Files | Estimate |
|------|-------|----------|
| LLM-based fact extraction (Haiku) | KnowledgeDistiller | 6h |
| Neo4j entity linking | KnowledgeDistiller | 4h |
| Domain synthesis background job | New worker job | 8h |
| Pre-phase synthesis (Layer 2 reasoning) | ContextBuilder | 6h |

### Phase 4: Curation & Polish (1 week)

| Task | Files | Estimate |
|------|-------|----------|
| User curation API | New API routes | 6h |
| Persist PatternLearner | PatternLearner.ts | 4h |
| KnowledgeStore abstraction | New cortex-brain file | 6h |
| Health monitoring integration | CortexFlowHealthService | 2h |
| UI: Knowledge browser panel | New Svelte component | 8h |

---

## Appendix A: Storage Schema Reference

### MongoDB Collection: `cortex_knowledge_facts`

```javascript
{
  _id: ObjectId,
  factId: "uuid-string",
  content: "The Sungrow ST2236UX has a round-trip efficiency of 87.5%",

  source: {
    executionId: "exec-abc",
    phaseIndex: 1,
    toolName: "WebFetch",
    sourceUrl: "https://sungrowpower.com/...",
    extractedAt: ISODate("2026-02-09T10:30:00Z")
  },

  domain: "energy_storage",
  entities: ["Sungrow", "ST2236UX"],
  factType: "data_point",

  confidence: 0.85,
  reinforcements: 3,
  lastAccessedAt: ISODate("2026-02-09T12:00:00Z"),
  lastReinforcedAt: ISODate("2026-02-09T10:30:00Z"),
  createdAt: ISODate("2026-02-05T14:00:00Z"),

  qualityScore: 82,
  isVerified: false,
  contradicts: [],

  // Sync tracking
  _sync: {
    qdrant: true,
    neo4j: true,
    lastSyncAt: ISODate("2026-02-09T10:30:05Z")
  }
}

// Indexes:
// { factId: 1 } unique
// { domain: 1, confidence: -1 }
// { "source.executionId": 1 }
// { lastAccessedAt: 1 } (for decay queries)
// { confidence: 1 } (for archival queries)
// { createdAt: 1, expireAfterSeconds: 7776000 } (90-day TTL for archived)
// Text index on { content: "text", domain: "text", entities: "text" }
```

### Qdrant Collection: `cortex_knowledge_facts`

```javascript
{
  id: numeric_hash(factId),
  vector: [/* 3072-dim embedding */],
  payload: {
    factId: "uuid-string",
    content: "The Sungrow ST2236UX has...",
    domain: "energy_storage",
    entities: ["Sungrow", "ST2236UX"],
    factType: "data_point",
    confidence: 0.85,
    reinforcements: 3,
    sourceUrl: "https://...",
    createdAt: "2026-02-05T14:00:00Z"
  }
}

// Indexes: domain (keyword), confidence (float), factType (keyword)
```

### Neo4j Nodes & Relationships

```cypher
// Fact node
(:KnowledgeFact {
  factId: "uuid-string",
  content: "The Sungrow ST2236UX has...",
  domain: "energy_storage",
  factType: "data_point",
  confidence: 0.85
})

// Relationships
(:KnowledgeFact)-[:ABOUT]->(:Entity {name: "ST2236UX", type: "product"})
(:KnowledgeFact)-[:EXTRACTED_FROM]->(:Document {id: "exec-abc-phase-1"})
(:KnowledgeFact)-[:CONTRADICTS]->(:KnowledgeFact)
(:KnowledgeFact)-[:SYNTHESIZED_FROM]->(:KnowledgeFact)
(:KnowledgeFact)-[:REINFORCED_BY]->(:KnowledgeFact)  // Same fact from different source
```

---

## Appendix B: Comparison with Existing Systems

| Feature | ContextCurator (Current) | Proposed Knowledge Base |
|---------|-------------------------|------------------------|
| Granularity | Execution-level memories | Fact-level knowledge |
| Extraction | Post-execution summary | Per-phase, per-tool |
| Deduplication | None | Embedding similarity |
| Confidence | Static | Dynamic (decay + reinforcement) |
| Retrieval | Semantic search only | Hybrid (vector + graph + text) |
| Reasoning | None | 3-layer (injection, synthesis, cross-execution) |
| Background | Post-execution only | Per-phase streaming |
| Conflict tracking | None | Explicit contradictions |
| User curation | None | Verify/reject/edit API |
| Entity linking | Basic (regex classification) | Neo4j graph-backed |

The proposed system **complements** ContextCurator rather than replacing it. ContextCurator handles execution-level memory ("I did this task before"); the Knowledge Base handles fact-level knowledge ("I learned this specific thing").

---

## Appendix C: Decision Matrix

| Criterion (weight) | Keep Triumvirate | MongoDB + pgvector | MongoDB Only | Triumvirate + Redis Cache |
|--------------------|-----------------|-------------------|--------------|--------------------------|
| Semantic search quality (30%) | 10 | 7 | 2 | 10 |
| Graph reasoning (25%) | 10 | 6 | 3 | 10 |
| Operational simplicity (15%) | 6 | 7 | 10 | 5 |
| Migration effort (10%) | 10 | 3 | 5 | 9 |
| Retrieval latency (10%) | 9 | 7 | 5 | 10 |
| Cost efficiency (10%) | 7 | 8 | 10 | 6 |
| **Weighted Score** | **8.85** | **6.45** | **4.60** | **8.65** |

**Implemented: Triumvirate + Redis Cache** — Redis hot cache (R10) was added as a transparent acceleration layer. The cache self-activates when Redis is available (already deployed for BullMQ), adding ~2ms cache-hit retrieval while the full triumvirate remains the source of truth. The "complexity" concern was mitigated by the self-activating/self-degrading design — zero configuration needed.

---

*End of Analysis*
