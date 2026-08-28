# Regno.ai × Anthropic — Capability Alignment & Enhancement Plan

**Updated: 2026-07-12**

## What this is

We imported the Anthropic corpus (`doc/anthropic/` — cookbooks, courses, docs,
research, agent SDK, the *Zero-Trust for AI Agents* ebook). This document
**evaluates that corpus against what regno.ai already does**, resolves the gaps
worth closing, and sequences them into a plan tracked in the TODO registry
(category **10. AI Capability Alignment**).

It exists because regno.ai's thesis is "build agents the way Claude Code works"
(rule 10). Anthropic's published patterns are the reference implementation of
that thesis — so a deliberate, honest alignment pass is the fastest way to find
what's missing.

> **Prime grounding for the VISION layer (2026-07-12):** VISION is a **marketing
> tool, not a tech readout.** Every surface — the universe map labels *and* the
> narration — must let a **non-technical** investor/customer *get* regno.ai
> without a glossary. Technical names live in the code and this doc; the vision
> layer speaks in value. This is **WS0** below and gates everything shown to a
> non-technical viewer.

## Method

For each Anthropic building block we mark regno.ai's status honestly:
**✅ built** · **🟡 partial** · **⛔ gap**, tie "built" to a real service, and
give a recommendation + priority. No aspirational "we have X" — if it's partial,
it says partial (rule 10 refuse-to-invent; rule 09 §2c honesty).

## The alignment map

| # | Anthropic pattern / capability | regno.ai today (grounded) | Gap → recommendation | Pri |
|---|---|---|---|---|
| 1 | Augmented LLM (retrieval + tools + memory) | ✅ RAG + tool registry + wisdom loop | keep | — |
| 2 | Contextual retrieval | ✅ `ContextualChunkingService` | keep | — |
| 3 | Reranking | ✅ Cohere/Voyage/Zerank/BGE rerankers | keep | — |
| 4 | Orchestrator–workers | ✅ `Orchestrator`/`OrchestratorWorker` | keep | — |
| 5 | Evaluator–optimizer | ✅ `DelegationEvaluator` + iterate loop | keep | — |
| 6 | Extended thinking | ✅ adaptive-thinking API (opus 4.8) | keep | — |
| 7 | Structured outputs | ✅ `DocumentRenderTool` + workflow schemas | keep | — |
| 8 | **Prompt caching** | ⛔ not used | Cache stable system prompts + grounding/insights context → cut cost + latency on every agent call | **P1** |
| 9 | **Citations / source attribution** | 🟡 grounding ties claims to paths internally; not surfaced to the reader | First-class citations in F1/chat answers — clickable sources under each answer → trust + a marketing proof point | **P1** |
| 10 | **Agent eval harness (LLM-as-judge)** | 🟡 query-engine eval + knowledge audit exist; no agent-output regression suite | Golden-task suite + LLM-judge grading + a regression gate on agent quality | **P1** |
| 11 | Observability / tracing | 🟡 Universal Job Console + health tabs; no per-run spans or token/cost accounting | Per-run trace (spans) + token/cost per run, surfaced in the console | P2 |
| 12 | Parallelization (sectioning + voting) | 🟡 Cortex Flow phases run sequentially | Parallel sub-agent fan-out + aggregation/voting in the plan engine | P2 |
| 13 | MCP (Model Context Protocol) | ⛔ | MCP client (consume external MCP servers) + expose regno tools as an MCP server | P2 |
| 14 | Long-term agent memory (memory tool) | 🟡 wisdom distillation is batch, not a live read/write memory | A first-class memory tool agents read + write across runs | P2 |
| 15 | Multimodal (vision / PDF) | 🟡 F1 visual intelligence is planned; ingestion is text-first | PDF + image ingestion and a vision-capable agent path | P2 |
| 16 | Model routing / fallback | 🟡 depth → model mapping | Dynamic model selection by task difficulty + fallback billing | P3 |
| 17 | Batch API | ⛔ | Batch API for bulk re-scoring / ingestion at lower cost | P3 |
| 18 | Prompt improvement / meta-prompting | 🟡 PlanEngine enhances prompts | Auto prompt-improvement pass (Anthropic prompt-improver pattern) | P3 |
| 19 | Agent Skills (composable) | 🟡 | Expose composable "skills" to Cortex Flow agents | P3 |
| 20 | Zero-Trust for AI agents | 🟡 governance + tamper-evident audit + scoped token (SEC.* tickets) | Continue the existing SEC.* ZT tickets | P1 (existing) |

## Prioritised workstreams

- **WS0 · VISION = non-technical marketing** (P1) — value-language pass across the
  universe map labels + narration; a non-technical viewer must "get" it. Gates
  everything shown externally. See `doc/platform/vision.md`.
- **WS1 · Prompt caching** (P1) — highest ROI, low risk; every agent call gets cheaper/faster.
- **WS2 · Surfaced citations** (P1) — trust + a demo-able proof of grounding.
- **WS3 · Agent eval harness** (P1) — defensibility: prove (and hold) agent quality.
- **WS4 · Observability / tracing** (P2) — token/cost + spans per run.
- **WS5 · Parallel fan-out + voting** (P2) — throughput + quality.
- **WS6 · MCP support** (P2) — ecosystem reach.
- **WS7 · Long-term memory tool** (P2) — deepen the wisdom flywheel to live read/write.
- **WS8 · Multimodal ingestion** (P2) — folds in the planned F1 visual work.
- **WS9–12** (P3) — model routing/fallback, batch API, meta-prompting, agent skills.

## How each lands in VISION

Every workstream that ships becomes (a) a **node on the universe map** and (b) a
**narrated area** — but in **value language** (WS0), e.g. *"Best answer first"*
not *"reranking"*, *"Shows its sources"* not *"citations API"*, *"Gets smarter
with use"* not *"wisdom distillation"*. The technical name stays in the blurb for
those who want it; the headline sells the value.

## Built vs planned

Everything in the "✅ built" rows is live and grounded in a named service.
Everything in WS1–WS12 is **planned** — this document is the plan, not a claim of
existence. As each lands it moves to built here and on the map.

## Related

- `doc/platform/vision.md` — the VISION layer this plan feeds.
- `doc/platform-todo-registry.md` §10 — the tracked tickets.
- `insights/` — the L2 grounding corpus the "built" claims trace to.
