# Regno.ai vs the Anthropic Agent Cookbook — Architecture Evaluation & Augmentation Plan

> Audience: platform engineers. Reference doc — not a customer artefact.
> Authored: 2026-06-03. Source review: live code under
> `src/lib/server/cortex-flow/` + `doc/platform-todo-registry.md`.

## 1. Purpose

The Anthropic "agent patterns" cookbook describes four building blocks for
production agent systems. This document evaluates Regno.ai / Cortex Flow
against those patterns, states honestly what we already do well, isolates the
genuine gaps, and defines the augmentation work — cross-linked to the existing
TODO registry so nothing is tracked twice.

**Headline finding:** Regno already implements or already tracks ~90% of the
cookbook. In several places (the routing layer, the compounding wisdom loop) we
are *ahead* of the cookbook, not behind. The path to "best in the world" is not
adding these patterns — it is closing three specific gaps and wiring the parts
we already have into a single closed loop.

## 2. The four cookbook patterns (one line each)

| Pattern | What it is |
|---|---|
| **Router** | A cheap model classifies the request, then a switch dispatches to the right specialised path. |
| **Orchestrator–Workers** | An orchestrator decomposes a task, fans subtasks out to workers, aggregates results. |
| **Evaluator–Optimizer** | Generate → grade against a rubric → regenerate with the critique → loop until it passes or hits a cap. |
| **Smart Orchestration, Dumb State** | Control flow + state live in deterministic code / DB / state-machine / queue; the LLM is inserted only at isolated reasoning nodes. |

## 3. Pattern-by-pattern evaluation against Regno code

### 3.1 Router — **already built, ahead of the cookbook**

`src/lib/server/cortex-flow/routing/` contains a learned, multi-signal router,
not a single classifier:

- `IntelligentRouter.ts` — task-type routing via `TaskAnalyzer` + `TaskRequirements` → `RoutingDecision`.
- `IntentDetector.ts` — output-intent classification (`terminal` vs `file`) with weighted pattern matching + confidence.
- `PlanTimeRouter.ts` — per-phase routing of framework / model / max-output-tokens / thinking support.
- `ModelTierEvaluator.ts` — model-tier selection backed by `CortexPatternStore`.
- `PresetSelector.ts`, `FrameworkScorer.ts`, `ThresholdLoader.ts` — preset + framework selection.
- `LearnedScoreProvider.ts` + `RoutingOutcomeTracker.ts` — the router **learns from outcomes**.

The cookbook router is a stateless Haiku switch. Ours learns. **Gap:** the rich
components aren't fused into one front-door decision ("which agent + which depth
+ which budget"); `IntentDetector` only decides terminal-vs-file today.

### 3.2 Orchestrator–Workers — **built, fan-out is serial**

- `v2/Orchestrator.ts` + `v2/OrchestratorWorker.ts` (BullMQ, `concurrency: 5`) + `v2/PhaseRunner.ts`.
- Thin domain agents in `agents/` (`AgentRegistry`, `AgentRouter`, `AgentChainExecutor`, `ContextCurator`).
- `agents/RetryStrategist.ts` — classifies errors (`transient` / `permanent` / `recoverable` / `unknown`) → retry action.
- `agents/PatternLearner.ts` — learns `prompt` / `tool_sequence` / `model_choice` / `domain` patterns.

Job-level concurrency exists. **Gap:** phases *within a single plan* run serially —
no intra-plan parallel fan-out/gather (e.g. Deep-Dive's 6 per-parameter
aggregations could run concurrently with BullMQ as the join barrier).

### 3.3 Evaluator–Optimizer — **evaluator exists, the in-execution loop does not**

- `agents/QualityAuditor.ts` — 3-layer evaluation (objective metrics → output heuristics → Sonnet grade). Runs **post-hoc** after the final phase.
- `services/AgentMemoryService.ts` + `services/WisdomSynthesizer.ts` + `services/ExecutionAnalyzer.ts` — the wisdom loop (Execute → Evaluate → Store → Inject → compound across runs).
- `agents/RetryStrategist.ts` — handles **errors**, not quality scores.

**Gap (the one real build):** nothing does generate → grade-against-rubric →
regenerate-until-target-or-cap *within a single execution*. The rule-09
iterate-to-95 loop is currently enforced by an agent following a written rule,
not by code. The cookbook's loop is also stateless per-run — ours can be made to
compound (see §6).

### 3.4 Smart Orchestration, Dumb State — **already lived on the CMS side**

The CMS process runner is a textbook deterministic state machine with the LLM
only at reasoning nodes: `cmsProcessRunner/` (path strategies, gate executors,
validators), `_nav` / `_gateCache` computed at classification time, `defAudit/`
proving defs ↔ runner ↔ snapshot mutually. This reconciles cleanly with Pillar 1
("Trust the LLM"): **control flow = deterministic, reasoning at each node = LLM.**

**Gap:** the Cortex Flow governance path doesn't yet draw that line formally —
governance gates should be deterministic transitions with the LLM only inside a
gate, never deciding whether a gate passed. WS7 (Principal threading) is the hook.

## 4. What Regno already does well

- **A learned router** with outcome tracking — beyond the cookbook.
- **A compounding wisdom loop** — `cortex_agent_memories` + `WisdomSynthesizer`; agents improve over time. The cookbook has nothing like this.
- **Declarative, agent-aware phase config** — `AgentPhaseTemplate.depths`, `DepthStrategy`, `ModelResolver`.
- **A deterministic state-machine substrate** already proven on CMS.
- **Completed enhancement roadmap** — MCP first-class, Langfuse observability, DSPy prompt optimisation, GraphRAG (see `doc/CORTEX_FLOW_ENHANCEMENT_ROADMAP.md`).
- **A governance substrate** — audit chain, trust manifest (WS19), and tracked moat extensions (AIBOM1, SRCANCH1, AUTBAND1, COSTUX1).

## 5. The genuine gaps (small, specific)

1. **In-execution Evaluator–Optimizer loop** — generate → grade → regenerate to rubric/cap. (The one real build.)
2. **Unified front-door router decision** — fuse `IntelligentRouter` + `IntentDetector` into one "agent + depth + budget" entry choice.
3. **Intra-plan parallel phase fan-out** — phases within one plan run serially.
4. **Formal governance state-machine spine** — deterministic transitions, LLM only at reasoning nodes.

## 6. The unique USP

The path to #1 is **not** new patterns — anyone can wire a Haiku router. The
defensible USP is the **combination** Regno already has in flight:

> **Governed, self-improving agents with cryptographic provenance.**

Three layers no competitor has wired together:

1. **Compounding quality** — the wisdom loop makes agents better over time.
2. **Cryptographic provenance** — AIBOM1 (bill of materials per output), SRCANCH1 (source-anchored answers), trust manifest (WS19), audit chain.
3. **Bounded autonomy** — AUTBAND1 (advisory → autonomous bands), WS7 (principal threading), COSTUX1 (budgets).

**The single highest-leverage wiring** — and the thing that turns the USP from a
list into a flywheel — is closing the loop between gap #1 (the new in-execution
evaluator) and the wisdom store: every refine-pass critique becomes a stored
anti-pattern in `AgentMemoryService`, so the system needs *fewer* refine passes
over time. Measurable, compounding, hard to copy. This is `EVAL1 × the wisdom loop`.

## 7. Plan & registry alignment

These map onto existing registry tickets — so we extend / cross-link rather than
duplicate. New trackable rows live under **§3 Cortex Flow → "Agent patterns —
cookbook alignment"**, each cross-linked to its parent.

| Ticket | Pri | Maps to | Summary |
|---|---|---|---|
| `AGENT-EVAL-LOOP` | P1 | EVAL1 (Gov) | In-execution refine loop around DocumentRender: generate → QualityAuditor grade → regenerate to target/cap, honouring `costCeiling`. |
| `AGENT-EVAL-WISDOM` | P1 | EVAL1 × wisdom loop | Feed every refine-pass critique into `AgentMemoryService` as an anti-pattern. The flywheel / USP cement. |
| `AGENT-ROUTER-FUSE` | P1 | §3 PlanEngine | Fuse `IntelligentRouter` + `IntentDetector` into one front-door decision (agent + depth + budget); fall back to user-declared depth. |
| `AGENT-PARALLEL` | P2 | §3 PlanEngine | `parallel: true` on `AgentPhaseTemplate` + fan-out/gather in Orchestrator via BullMQ join barrier. |
| WS7 child note | — | WS7 (Gov) | Governance gates as deterministic state-machine transitions; LLM only at the reasoning node inside a gate. |

## 8. Sequencing & recommendation

1. **`AGENT-EVAL-LOOP` first** — smallest diff, reuses `QualityAuditor` wholesale, converts the quality story from aspiration to enforced.
2. **`AGENT-EVAL-WISDOM` immediately after** — the flywheel and the USP cement.
3. **`AGENT-ROUTER-FUSE`** — integration, not a build; the pieces already exist.
4. **Defer `AGENT-PARALLEL`** (riskier, needs a stable orchestrator) and the **WS7 state-machine spine** (pull forward only if governance is the active fire).

## 9. Verification status

- **Verified by reading code:** the `routing/` class inventory, `OrchestratorWorker` concurrency, `RetryStrategist` / `PatternLearner` intents, `QualityAuditor` / `AgentMemoryService` / `WisdomSynthesizer` presence, the CMS deterministic state machine, the completed enhancement roadmap.
- **Asserted, not exhaustively traced:** that intra-plan phase execution is strictly serial (inferred from `PhaseRunner` + serial Orchestrator flow — confirm before building `AGENT-PARALLEL`); that `IntentDetector` is *only* terminal-vs-file (confirm it isn't already feeding agent selection before building `AGENT-ROUTER-FUSE`).
