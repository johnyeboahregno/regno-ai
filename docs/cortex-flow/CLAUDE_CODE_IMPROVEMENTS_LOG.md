# Cortex-Flow: 10 Claude Code-Inspired Improvements

**Date:** 9 February 2026
**Scope:** 14 files modified/created across 4 priority tiers
**Source:** Gap analysis comparing Claude Code architecture to cortex-flow

---

## Executive Summary

Implemented 10 improvements that bring cortex-flow closer to Claude Code's agentic capabilities. Changes span parallel execution, adaptive planning, richer tool features, and better inter-phase context transfer. All changes are backward-compatible — new features are gated behind opt-in settings or graceful fallbacks.

---

## Analysis & Audit

### Gap Analysis Methodology

Compared cortex-flow's execution model against Claude Code's documented architecture across five dimensions:

| Dimension | Claude Code | Cortex-Flow (Before) | Gap |
|-----------|-------------|---------------------|-----|
| Tool execution | Parallel `Promise.all()` | Sequential `for...of` loop | High |
| Plan adaptation | Dynamic mid-execution adjustments | Fixed plan, no adaptation | High |
| Context transfer | Structured blackboard + compression | Raw text chaining, no summarization | Medium |
| Tool capabilities | Rich grep (context, multiline), replace_all | Basic grep, no replace_all | Medium |
| Planning transparency | Visible exploration steps | Silent plan generation | Low |

### Priority Classification

- **P0 (Critical):** Parallel tool execution, adaptive replanning — highest impact on execution speed and quality
- **P1 (Important):** Context compression, grep improvements, parallel subagents — meaningful quality/capability gains
- **P2 (Moderate):** Planning events, edit replace_all, git context — usability and developer experience
- **P3 (Enhancement):** Dynamic tiers, blackboard — advanced optimization and knowledge transfer

---

## Implementation Log

### #1. Parallel Tool Execution (P0)

**File:** `src/lib/server/cortex-flow/executors/DirectClaudeExecutor.ts`

**Before:** Sequential `for...of` loop in `executeTools()` — each tool waits for the previous one to complete.

**After:**
1. Collect all `tool_use` blocks from assistant response
2. Emit all `tool_start` events synchronously (preserves UI ordering)
3. Execute all tools via `Promise.all()` — each promise handles its own `tool_end` and `file_created` events
4. Increment `this.toolCallCount` once with total count before parallel block
5. Return results array (keyed by `tool_use_id`, so order doesn't matter)

**Impact:** 3+ concurrent tool calls now execute in wall-clock time of the slowest single call, not the sum. Especially beneficial for web research phases with multiple `WebFetch` calls.

**Risk assessment:** Safe — tool results are keyed by `tool_use_id` and have no ordering dependencies. Event emission order may vary but the API only cares about result matching.

---

### #2. Adaptive Replanning (P0)

**Files:** `Orchestrator.ts`, `cortexFlow.ts` (types), `cortexFlowStore.svelte.ts` (UI handler)

**New setting:** `settings.advanced.adaptiveReplanning: boolean` (default: false, opt-in)

**Mechanism:**
- After each successful phase (with >1 remaining), calls Haiku with the phase result + remaining phase list
- Haiku returns `{ shouldReplan, reasoning, suggestedChanges }`
- On replan, emits `v2_replan` SSE event for console display
- Does NOT auto-modify the plan (informational only in v1) — future: auto-apply changes

**Guard:** Only runs when setting is enabled AND phase succeeded AND >1 phase remains.

**New shared helper:** `callLightweightLLM(prompt)` — reusable Haiku caller for the Orchestrator, also used by #9.

---

### #3. Context Compression Between Phases (P1)

**File:** `src/lib/server/cortex-flow/v2/ContextBuilder.ts`

**Key change:** `build()` is now `async` to support LLM-based compression and git context gathering.

**New method:** `compressPhaseOutput(output, tokenBudget, phaseName)`
- Estimates token count via `chars / 4` heuristic
- If output exceeds budget (default 8000 tokens), calls Haiku to compress while preserving data points, citations, URLs, conclusions
- Falls back to character-based truncation (keep first/last half) if no API key or LLM fails

**Integration:** Applied to intermediate phase outputs only (`i < prevResults.length - 1`), NOT the last result being fed to the final phase. This prevents data loss for the render phase while keeping intermediate context within budget.

**PhaseRunner update:** Both `build()` call sites (normal path and retry path) now use `await`.

---

### #4. Grep Tool: Context Lines, Multiline, Output Modes (P1)

**File:** `src/lib/server/cortex-flow/tools/GrepTool.ts` (full rewrite)

**New capabilities:**
| Feature | Parameter | Description |
|---------|-----------|-------------|
| Context before | `context_before` or `context` | Lines to show before match (-B) |
| Context after | `context_after` or `context` | Lines to show after match (-A) |
| Multiline | `multiline: true` | Patterns span multiple lines |
| Case insensitive | `case_insensitive: true` | Case-insensitive matching |
| Files only | `output_mode: 'files_with_matches'` | Return only file paths |
| Count | `output_mode: 'count'` | Return `file:count` pairs |

**Format:** Context lines use ripgrep-style separator: `file-linenum- content` (vs `file:linenum: content` for matches).

**Schema update** in `ToolRegistry.ts`: Added all new parameters to the Grep input schema.

**Breaking changes:** None — removed hardcoded `'gi'` flags, now uses `'g'` + optional `'i'` + optional `'ms'`. Default behavior (content mode, no context) is identical to before.

---

### #5. Parallel Sub-Agent Spawning (P1)

**New file:** `src/lib/server/cortex-flow/tools/ParallelTaskTool.ts`

**Schema:** `{ tasks: Array<{ subagent_type, prompt, description, model?, max_turns? }> }`

**Implementation:**
1. Validates all tasks upfront (type, required fields, allowed types from settings)
2. Checks against `subagentSettings.maxConcurrent` limit
3. Spawns all via `Promise.all(tasks.map(t => manager.spawnSubagent(t)))`
4. Collects results, formats combined output with per-task sections
5. Returns `{ success: allSucceeded, result: combinedText, metadata: { totalTasks, successes, failures } }`

**Registration:** Added to `CoreToolName` type and `CORE_TOOL_DEFINITIONS` in ToolRegistry. Registered alongside Task/TaskOutput in `registerTaskTools()` (optional third parameter).

**Dependency:** Requires `SubagentManager` reference set via `setSubagentManager()`.

---

### #6. Interactive Planning Mode — Exploration Events (P2)

**Files:** `PlanEngine.ts`, `OrchestratorWorker.ts`, `cortexFlowStore.svelte.ts`

**New events emitted during `PlanEngine.generate()`:**

| Step | Event | Description |
|------|-------|-------------|
| Memory search | `v2_planning_exploration` | "Searching memory for relevant context" |
| Agent routing | `v2_planning_exploration` | "Analyzing prompt for specialized agent match" |
| Agent match | `v2_planning_exploration` | "Matched: {agentName} ({confidence}%)" |
| Intent analysis | `v2_planning_exploration` | "Classifying user intent" |
| Plan generation | `v2_planning_exploration` | "Generating execution plan" |

**Mechanism:** `PlanEngine.generate()` now accepts `executionId` via `PlanGenerationContext`. Events are published via `publishCortexFlowEvent()`. The `OrchestratorWorker` passes `executionId` to the generation context.

**Store handler:** `case 'v2_planning_exploration': addConsoleEntry('info', 'Planning: ${event.description}')`.

---

### #7. Edit Tool: `replace_all` Implementation (P2)

**File:** `src/lib/server/cortex-flow/tools/EditFileTool.ts`

**Before:** `occurrences > 1` always returned error "String is not unique".

**After:**
```typescript
const replaceAll = params.replace_all as boolean;
if (occurrences > 1 && !replaceAll) {
  return { success: false, result: `...set replace_all: true.` };
}
const newContent = replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString);
```

**Schema:** Already declared in ToolRegistry (line 140). Now actually implemented.

**Result message:** Includes replacement count when `replace_all` replaces >1 occurrence.

---

### #8. Git-Aware Context Building (P2)

**File:** `src/lib/server/cortex-flow/v2/ContextBuilder.ts`

**New method:** `gatherGitContext(ctx: PhaseContext): Promise<string | null>`

**Logic:**
1. Checks if phase is code-related via `phaseType` / `phaseName` (matches: code, audit, development, refactor, debug, implementation)
2. Runs `git rev-parse --git-dir` to verify git repo
3. Gathers in parallel: `git status --porcelain`, `git branch --show-current`, `git log --oneline -5`
4. Formats as "## Git Context" markdown section with branch, changes, and recent commits
5. Returns `null` for non-code phases or non-git directories

**Integration:** Injected after the user request echo and before file manifest. Uses 5s timeout per git command.

---

### #9. Dynamic Model Tier Re-evaluation (P3)

**Files:** `ModelTierEvaluator.ts`, `Orchestrator.ts`

**New setting:** `settings.advanced.dynamicTierEvaluation: boolean` (default: false, opt-in)

**New method on ModelTierEvaluator:** `reevaluate(phase, previousResults, credential?)` — calls Haiku with previous phase results to assess if tier should change. Returns `{ tier, confidence, reasoning, changed }`. Same thinker-guard as `evaluate()` (downgrades thinker → analyst).

**Integration in Orchestrator:** After `phase_complete` event, loops remaining phases and calls `reevaluate()`. Updates `this.plan.phases[idx].modelTier` if tier changed with confidence >= 0.7. Emits `v2_tier_adjusted` SSE event.

**Store handler:** `case 'v2_tier_adjusted': addConsoleEntry('system', 'Tier adjusted: ${phaseName} ${oldTier} → ${newTier}')`.

---

### #10. Enhanced Blackboard for Inter-Phase Context (P3)

**Files:** `v2/types.ts`, `Orchestrator.ts`, `ContextBuilder.ts`, `PhaseRunner.ts`

**New types:**
```typescript
interface BlackboardEntry {
  phaseIndex: number; phaseName: string;
  toolName: string; toolCallCount: number;
  keyFindings: string[]; references: string[];
}
interface PhaseBlackboard { entries: BlackboardEntry[]; }
```

**Extraction (Orchestrator):** `extractBlackboardEntry()` parses phase output for:
- Bullet-point findings (20-150 char lines starting with `-` or `*`)
- URLs (deduped)
- File paths (patterns like `./path/file.ext` or `/absolute/path.ext`)
- Tool usage patterns (heuristic detection of WebSearch, WebFetch, Read, etc.)

**Rendering (ContextBuilder):** `formatBlackboard()` creates "## Available Knowledge from Previous Phases" section with per-phase tool usage, key findings, and references.

**Flow:** Orchestrator extracts → stores in `this.phaseBlackboard` → passes to PhaseContext → PhaseRunner passes to `contextBuilder.build(ctx, blackboard)` → rendered into prompt.

---

## Files Changed Summary

| # | File | Changes |
|---|------|---------|
| 1 | `src/lib/types/cortexFlow.ts` | SSE event interfaces, advanced settings fields |
| 2 | `src/lib/server/cortex-flow/v2/types.ts` | Blackboard types, PhaseContext.blackboard field |
| 3 | `src/lib/server/cortex-flow/executors/DirectClaudeExecutor.ts` | Parallel tool execution |
| 4 | `src/lib/server/cortex-flow/v2/Orchestrator.ts` | Adaptive replan, dynamic tiers, blackboard extraction |
| 5 | `src/lib/server/cortex-flow/v2/ContextBuilder.ts` | Async, compression, git context, blackboard rendering |
| 6 | `src/lib/server/cortex-flow/v2/PhaseRunner.ts` | Async build() calls, blackboard passthrough |
| 7 | `src/lib/server/cortex-flow/v2/PlanEngine.ts` | Planning exploration events |
| 8 | `src/lib/server/cortex-flow/v2/OrchestratorWorker.ts` | Pass executionId to PlanEngine |
| 9 | `src/lib/server/cortex-flow/tools/GrepTool.ts` | Full rewrite with context, multiline, output modes |
| 10 | `src/lib/server/cortex-flow/tools/EditFileTool.ts` | replace_all implementation |
| 11 | `src/lib/server/cortex-flow/tools/ParallelTaskTool.ts` | **NEW** — parallel subagent tool |
| 12 | `src/lib/server/cortex-flow/ToolRegistry.ts` | Grep schema, ParallelTask registration, CoreToolName |
| 13 | `src/lib/server/cortex-flow/routing/ModelTierEvaluator.ts` | reevaluate() method |
| 14 | `src/lib/stores/cortexFlowStore.svelte.ts` | SSE event handlers for replan, tier, planning |

---

## Verification Checklist

| # | Feature | Test | Status |
|---|---------|------|--------|
| 1 | Parallel tools | Run research phase with 3+ tool calls → tools execute concurrently | Ready |
| 2 | Adaptive replan | Enable `adaptiveReplanning`, run Deep Research → check console for replan messages | Ready |
| 3 | Compression | Run 4-phase agent → intermediate outputs compressed, final phase gets richer context | Ready |
| 4 | Grep context | `Grep({ pattern: "export", context: 2 })` → shows 2 lines before/after | Ready |
| 5 | ParallelTask | LLM calls `ParallelTask({ tasks: [...] })` → both run concurrently | Ready |
| 6 | Planning events | Submit prompt → console shows "Planning: Searching memory..." steps | Ready |
| 7 | Edit replace_all | `Edit({ ..., replace_all: true })` → all occurrences replaced | Ready |
| 8 | Git context | Run Code Auditor → phase prompt includes branch, recent commits | Ready |
| 9 | Dynamic tiers | Enable `dynamicTierEvaluation` → console shows tier adjustments | Ready |
| 10 | Blackboard | Run multi-phase agent → later phases see "Available Knowledge" section | Ready |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Parallel tools may have race conditions | Tool results are keyed by `tool_use_id`, no shared state between tool executions |
| LLM compression adds latency/cost | Only for intermediate outputs > 8000 tokens; Haiku is fast and cheap; fallback to truncation |
| Adaptive replan is informational only | Does not modify plan in v1; future: auto-apply with user confirmation |
| Git context reveals working tree | Only injected for code-related phases; respects existing sandbox mode |
| Dynamic tiers over-assigns thinker | Same thinker-guard as baseline: LLM suggestions of thinker are downgraded to analyst |

---

## Architecture Decisions

1. **ContextBuilder made async** — Required for LLM compression and git subprocess calls. PhaseRunner already awaits other operations, so the change propagates naturally.

2. **Blackboard extraction is heuristic, not LLM** — Using regex patterns for bullet points, URLs, and file paths avoids an extra Haiku call per phase. LLM-based extraction can be added later for higher accuracy.

3. **ParallelTask is a separate tool, not a Task parameter** — Keeps the Task tool schema simple and backward-compatible. LLMs can discover ParallelTask when they need concurrency.

4. **Planning events use existing pubsub** — No new infrastructure needed. Events flow through the same Redis pubsub → SSE pipeline as all other v2 events.

5. **Settings are opt-in** — `adaptiveReplanning` and `dynamicTierEvaluation` default to false/undefined. Existing behavior is unchanged for users who don't enable these features.
