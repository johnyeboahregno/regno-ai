# Wisdom System — Architecture & Implementation Tracker

## Overview

The Wisdom System is Regno.ai's self-improving knowledge loop. Every execution, evaluation, and fix stores operational insights that compound over time — making every subsequent AI operation smarter.

## Architecture

```
                    ┌──────────────────────┐
                    │   KNOWLEDGE SOURCES  │
                    ├──────────────────────┤
                    │ • Crawled docs        │
                    │ • Data source schemas │
                    │ • Execution outputs   │
                    │ • User corrections    │
                    │ • Showcase eval/fix   │
                    │ • Seed principles     │
                    └────────┬─────────────┘
                             │
                    ┌────────▼─────────────┐
                    │  WISDOM SYNTHESIZER  │
                    │  (facts → principles)│
                    └────────┬─────────────┘
                             │
              ┌──────────────▼──────────────┐
              │    cortex_agent_memories     │
              │  ┌─────────────────────────┐ │
              │  │ domain: 'energy'        │ │
              │  │ domain: 'showcase'      │ │
              │  │ domain: 'logistics'     │ │
              │  │ domain: 'cross-cutting' │ │
              │  └─────────────────────────┘ │
              │  + Qdrant vector index       │
              │  + confirmationCount         │
              │  + usefulnessRating          │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │      CONTEXT BUILDER        │
              │  hybrid: text + semantic    │
              │  domain-filtered retrieval  │
              │  adaptive token budget      │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼─────────────┐
                    │    AGENT EXECUTION   │
                    │  (wisdom-informed)    │
                    └────────┬─────────────┘
                             │
                    ┌────────▼─────────────┐
                    │   QUALITY AUDITOR    │
                    │  (stores insights)   │
                    └──────────────────────┘
```

## Data Flow

```
EXECUTION → EXTRACT → STORE → INJECT → NEXT EXECUTION → quality compounds
```

### Write Side (storing wisdom)
1. **Execution self-annotation**: `[WISDOM]: <insight>` markers in LLM output → extracted by Orchestrator
2. **QualityAuditor**: 3-layer evaluation (metrics + heuristics + Sonnet LLM) → stores anti-patterns, patterns, wisdom
3. **Showcase evaluate**: Scene quality analysis → stores patterns (strengths) + errors (anti-patterns)
4. **Showcase fix**: Surgical scene patches → stores wisdom (fix insights)
5. **Seed principles**: 18 bootstrapped quality principles for cold start
6. **Knowledge bridge** (Phase 2): Facts from docs/knowledge base → synthesized into operational principles

### Read Side (injecting wisdom)
1. **ContextBuilder**: Retrieves agent-specific + shared memories via `AgentMemoryService`
2. **ShowcaseGenerationWorker**: Retrieves quality memories for scene generation, evaluation, and fixes
3. **Memory formatting**: Grouped by category priority: wisdom > pattern > error > schema_cache > fact > preference

## Memory Schema

```typescript
{
  agentSlug: string | null,        // null = shared across ALL agents
  userId: string | null,           // null = shared across ALL users
  category: 'fact' | 'preference' | 'pattern' | 'error' | 'wisdom' | 'schema_cache',
  content: string,
  domain?: string,                 // NEW: 'energy', 'showcase', 'logistics', 'cross-cutting', etc.
  source: { executionId, phaseIndex },
  relevanceScore: number,          // 0.0 - 1.0
  confirmationCount?: number,      // NEW: how many times reinforced
  usefulnessRating?: number,       // NEW: user feedback aggregate
  lastAccessedAt: Date,
  createdAt: Date,
  dataSourceId?: string            // For schema_cache only
}
```

## Key Files

| File | Role |
|------|------|
| `src/lib/server/cortex-flow/services/AgentMemoryService.ts` | Core memory CRUD + retrieval |
| `src/lib/server/cortex-flow/v2/ContextBuilder.ts` | Memory injection into execution prompts |
| `src/lib/server/cortex-flow/agents/QualityAuditor.ts` | 3-layer execution evaluation |
| `src/lib/server/cortex-flow/v2/Orchestrator.ts` | Evaluation trigger + wisdom extraction |
| `src/lib/server/cortex-flow/services/WisdomSynthesizer.ts` | NEW: Knowledge → wisdom bridge |
| `src/lib/server/queues/workers/ShowcaseGenerationWorker.ts` | Showcase quality loop |
| `src/lib/server/queues/workers/ScheduledWorker.ts` | Auto-pruning + synthesis cron |
| `src/lib/server/queues/workers/KnowledgeLearningWorker.ts` | Document wisdom extraction bridge |
| `src/routes/api/cortex-flow/wisdom/+server.ts` | Wisdom dashboard API (GET/POST/PATCH) |
| `src/lib/components/admin/AdminWisdomTab.svelte` | Admin panel wisdom browser |
| `scripts/seed-quality-principles.cjs` | Bootstrap 18 quality principles |

---

## Implementation Tracker

### Phase 1: Foundation Fixes — Core Reliability

- [x] **1a. Auto-prune via ScheduledWorker** — Wire `pruneStaleMemories()` into cron, weekly schedule
- [x] **1b. Domain tagging** — Add `domain` field to schema, tag on write, filter on retrieval
- [x] **1c. Confirmation count** — Track reinforcement count on dedup, use as decay protection
- [x] **1d. Usefulness feedback endpoint** — `PATCH /api/cortex-flow/memory/:id/rate`

### Phase 2: Knowledge Base Integration — The `/docs` Bridge

- [x] **2a. WisdomSynthesizer service** — Convert domain facts → operational principles via Sonnet
- [x] **2b. Document wisdom extraction** — Hook into KnowledgeLearningWorker for post-extraction synthesis
- [x] **2c. Cross-concern synthesis** — Periodic job to find cross-domain patterns

### Phase 3: Semantic Search + Conflict Resolution

- [x] **3a. Vector-backed retrieval** — Qdrant embeddings for semantic memory search
- [x] **3b. Conflict detection** — Flag contradictory memories on write
- [x] **3c. Near-duplicate merging** — Semantic similarity > 0.92 → merge instead of duplicate

### Phase 4: Intelligence Dashboard + Attribution

- [x] **4a. Wisdom visibility API** — `/api/cortex-flow/wisdom/*` endpoints for admin panel
- [x] **4b. Admin UI component** — Wisdom browser in admin panel with domain/category filters
- [ ] **4c. Execution attribution** — Track which memories were injected, correlate with scores

---

## Retrieval Strategy

### Current: Text search only (MongoDB $text index)
### Target: Hybrid text + semantic

```
retrieveMemories(agentSlug, userId, prompt, limit, domain?)
  ├─ Text search: MongoDB $text index on content field
  ├─ Semantic search: Qdrant vector similarity on embedding
  ├─ Recency boost: lastAccessedAt within 7 days gets +0.1
  ├─ Confirmation boost: confirmationCount > 3 gets +0.05
  ├─ Domain filter: optional domain parameter narrows results
  └─ Merge + deduplicate → top N by combined score
```

## Quality Principles (Bootstrapped)

See `scripts/seed-quality-principles.cjs` for the 18 foundational principles covering:
- Anti-patterns (7): skipping PythonExec, hour-by-hour noise, session merging, Haiku limits, etc.
- Patterns (7): two-script pattern, cross-validation, session workspace, report size targets, etc.
- Wisdom (6): senior engineer voice, zero fabrication, Mermaid architecture, device topology, etc.

## Memory Categories (Priority Order)

1. **wisdom** (0.85-0.95) — Cross-cutting operational insights, HOW to work with data
2. **pattern** (0.85-0.95) — Proven approaches confirmed through execution
3. **error** (0.85-0.95) — Anti-patterns to avoid, things that went wrong
4. **schema_cache** (0.7) — Data source schema discoveries, field formats
5. **fact** (0.5) — Domain knowledge extracted from outputs
6. **preference** (0.5) — User/agent preferences

## Cost Model

- Memory retrieval: Free (MongoDB queries)
- Semantic retrieval: ~$0.001 per query (embedding generation)
- Execution evaluation: ~$0.10 per execution (Sonnet LLM call)
- Wisdom synthesis: ~$0.05 per document (Sonnet LLM call)
- Cross-concern synthesis: ~$0.15 per weekly run
- Storage: Negligible (MongoDB + Qdrant)
