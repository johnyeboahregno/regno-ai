# Cortex Flow Intelligence — Fountain of Knowledge

> **Status**: Active (April 2026)
> **Authors**: Zaeem Azhar, Claude
> **Supersedes**: Depth tier system (quick/standard/deep/conversational)

## Executive Summary

Cortex Flow acts as an **Automatic Prompt Engineer (APE)** middleware — the "fountain of knowledge" that always produces the best possible answer. There are no depth tiers. Every query receives the same treatment: APE enhancement via Haiku, then a 2-phase Sonnet pipeline (Research → Synthesis). The LLM naturally self-regulates research effort based on query complexity.

---

## Why We Removed Depth Tiers

### The Problem

The original design offered four depth levels: Quick (⚡), Standard (⚙️), Deep (🔬), and Conversational (💬). Each used different models (Haiku vs Sonnet), different phase counts (1-3), and different iteration budgets. Testing revealed three fundamental issues:

1. **Worse answers have no value.** If Cortex Flow is the last port of call for information, offering a "quick" mode that produces inferior results undermines the entire value proposition. It's like a search engine offering to only search 10% of its index.

2. **The LLM already self-regulates.** Claude naturally does minimal work for simple factual questions ("who won the 2024 British GP?" → 1 KB search, done in 15s) and extensive research for complex queries ("comprehensive analysis of Silverstone" → 8-10 tool calls, 90s). Artificial depth limits fight this natural behavior.

3. **Depth tiers violate Pillar 1: Trust the LLM.** The depth selector was mechanical code restricting what the model could do — exactly the pattern we committed to avoiding. The model IS the depth selector.

### What We Learned From Testing

We ran the same query ("i need a overview of silverstone") at all three depths and measured:

| Depth | Phases | Model | Duration | Tool Calls | Output |
|-------|--------|-------|----------|------------|--------|
| Quick | 1 | Haiku | 41s | 1 | 10K chars (truncated) |
| Standard | 2 | Sonnet | 82s | 3+0 | 5.7K chars |
| Deep | 3 | Sonnet | 247s | 15+5+5 | 12.9K chars |

**Key findings:**
- Quick was faster but Haiku ignored word limits and the output was truncated mid-sentence
- Deep spent 91s on Phase 1 "Broad Scan" producing only 425 chars — the model fought the multi-phase structure
- Deep Phase 2 "Analysis" produced 202 chars — it couldn't analyze what Phase 1 didn't write
- Deep Phase 3 had to re-research from scratch, negating the multi-phase design
- Standard was the sweet spot — 2 phases produced clean, comprehensive output

**Conclusion:** The depth selector added complexity without adding quality. The 2-phase structure (Research → Synthesis) was the only architectural element that consistently improved output.

---

## Architecture

### Pipeline

```
User: "i need a overview of silverstone"
                    │
                    ▼
    ┌───────────────────────────────┐
    │  APE — PromptEnhancer (Haiku) │  ~$0.001, ~1s
    │                               │
    │  Transforms garbage input     │
    │  into structured research     │
    │  brief with:                  │
    │  • Research dimensions        │
    │  • Expert search terms        │
    │  • Domain constraints         │
    │  • Professional persona       │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Phase 1: Research (Sonnet)   │  ~30-90s
    │                               │
    │  • All tools available        │
    │  • maxIterations: 10          │
    │  • Model decides effort:      │
    │    Simple → 1-2 tool calls    │
    │    Complex → 8-10 tool calls  │
    │  • Writes findings inline     │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Phase 2: Synthesis (Sonnet)  │  ~30-40s
    │                               │
    │  • No tools (writing only)    │
    │  • maxIterations: 1           │
    │  • Clean context window       │
    │  • Produces final response    │
    └───────────────┬───────────────┘
                    │
                    ▼
            Best possible answer
```

### Why Two Phases?

A single phase with tool calls and final output in one conversation produces cluttered context — 15 tool results mixed with reasoning. The synthesis phase gets a **clean prompt** with just the research findings, producing measurably better output:

- **Research phase**: "Use tools, gather data, write findings" (search mode)
- **Synthesis phase**: "Analyze findings, write the definitive response" (writing mode)

These are cognitively different tasks. Separating them leverages the model's strengths for each.

### Why APE Always Runs

The Automatic Prompt Engineer (APE) is Cortex Flow's core middleware value. It transforms vague user queries into structured research briefs:

**Before APE:**
> "overview of silverstone"

**After APE:**
> Enhanced query with 4-6 research dimensions (history, circuit layout, technical characteristics, recent results, upcoming events), expert-level search terms ("Maggotts-Becketts complex", "DRS zones", "Giuseppe Farina 1950"), and domain constraints ("don't fabricate lap times", "cite sources").

Cost: ~$0.001 per query (Haiku). The ROI is enormous — the research phase produces dramatically better output when guided by APE dimensions vs operating on the raw query.

---

## How It Relates to Claude's Agentic Loop

Claude's native behavior is a simple loop:

```
1. Think (extended thinking)
2. Decide: call a tool OR write final answer
3. If tool → execute, append result, go to 1
4. If answer → done
```

There is **no built-in quality scoring, review step, or depth control** in Claude. The model makes one decision per turn: "do I need more info?" If yes → tool call. If no → write answer.

Cortex Flow adds two layers on top of this native loop:

| Layer | Who Controls It | Purpose |
|-------|----------------|---------|
| **APE** | PromptEnhancer | Transform garbage input → quality prompt |
| **2-phase pipeline** | DepthStrategy | Separate research from synthesis for cleaner output |
| **Agentic loop** | Claude (native) | Tool calls until model is satisfied |

The model self-regulates within Phase 1. Simple questions → 1-2 iterations. Complex → 8-10. No artificial limits needed beyond a generous safety cap (maxIterations: 10).

---

## Configuration

### Agent Opt-In

Agents use this system by setting `planTemplate.depthStrategy: 'auto'` in their MongoDB definition:

```javascript
db.cortex_agents.updateOne(
  { slug: 'f1' },
  { $set: { 'planTemplate.depthStrategy': 'auto' } }
);
```

Agents without this flag continue using their own hardcoded phase templates (backward compatible).

### Key Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| Model | Sonnet (analyst tier) | Best quality, reasonable cost |
| Research maxIterations | 10 | Generous cap; model typically uses 3-8 |
| Synthesis maxIterations | 1 | Writing only, no tool calls needed |
| APE model | Haiku | Cheapest, sufficient for query expansion |
| Sync timeout | 180s | Covers 2-phase pipeline comfortably |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/cortex-flow/v2/PromptEnhancer.ts` | APE — Haiku transforms raw queries into research briefs |
| `src/lib/server/cortex-flow/v2/DepthStrategy.ts` | Generates 2-phase pipeline (Research → Synthesis) |
| `src/lib/server/cortex-flow/services/AgentExecutor.ts` | Routes `depthStrategy: 'auto'` agents to DepthStrategy |
| `src/lib/server/cortex-flow/v2/PlanEngine.ts` | Hooks APE before agent plan creation |
| `src/lib/server/cortex-flow/services/InlineExecutor.ts` | Single-mode execution, no depth routing |
| `src/routes/api/f1/hello/+server.ts` | F1 chat handler, fixed to standard mode |

---

## Design Principles

### 1. Trust the LLM (Pillar 1)
The model decides how much research to do. No mechanical iteration limits, model tier restrictions, or phase count differences based on user selection.

### 2. Garbage In, Quality Out
APE is the core middleware value. Every query is enhanced before the execution LLM sees it. This is the "prompt engineering as a service" that justifies Cortex Flow's existence.

### 3. Separation of Concerns
Research and synthesis are cognitively different tasks. The 2-phase pipeline lets the model focus on each without context pollution.

### 4. Simplicity Over Configurability
One mode is simpler to build, test, debug, and explain than four depth tiers with different models, phases, and iteration budgets. The previous depth system required:
- 4 depth methods in DepthStrategy (450 lines)
- DEPTH_CONFIG routing in InlineExecutor
- Depth selector UI in 5 components
- Complex costCeiling × maxIterations interaction in PhaseRunner
- Async mode handling for deep queries

The new system: one `resolve()` method (170 lines), one config, no UI selector, no async complexity.

---

## Migration History

| Date | Change |
|------|--------|
| April 10, 2026 | Initial DepthStrategy with quick/standard/deep/conversational |
| April 10, 2026 | Testing revealed depth tiers fight the model's natural behavior |
| April 10, 2026 | Collapsed to single "fountain of knowledge" mode |
| April 10, 2026 | Removed depth selector from 5 UI components |
| April 10, 2026 | APE promoted from deep-only to always-on |
