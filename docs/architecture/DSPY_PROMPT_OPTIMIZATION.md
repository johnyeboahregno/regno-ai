# Prompt Optimization Architecture

## Overview

Automated prompt optimization using DSPy-inspired algorithms (BootstrapFewShot, MIPRO-style instruction rewriting) implemented natively in TypeScript. The system runs entirely within the existing SvelteKit process using the platform's `callLLM` infrastructure — no Python sidecar, no external service, no Docker dependency.

## Architecture

```
+----------------------------------------------------------+
|  Native TypeScript Optimizer                             |
|  src/lib/server/optimization/                            |
|  - DSPyClient.ts          (BootstrapFewShot + MIPRO)     |
|  - PromptVersionManager.ts (versions, A/B, promotion)    |
|  - PromptOptimizer.ts      (orchestrates optimization)   |
|  - index.ts                                              |
+------------------------+---------------------------------+
                         |
          +--------------+---------------+
          v                              v
    Expert Nodes                   Cortex Flow
    (ExpertNodeRunner)             (All executors)
    (ExpertPatternExecutor)        - CortexFlowExecutor
                                   - OpenAIExecutor
                                   - LlamaExecutor
                                   - MultiAgentOrchestrator
```

## Components

### Native Optimizer (`src/lib/server/optimization/DSPyClient.ts`)

Implements two optimization strategies using the platform's existing `callLLM` and `getDefaultLlmCredential`:

**BootstrapFewShot:**
1. Run each training example through the current prompt
2. Score outputs against expected responses (word overlap metric)
3. Select top-scoring examples as few-shot demonstrations
4. Append selected demos to the system prompt
5. Evaluate augmented prompt against baseline

**MIPRO-style Instruction Optimization:**
1. Use the LLM as a prompt engineer to generate candidate instruction rewrites
2. Score each candidate against training examples
3. Return the highest-scoring candidate

**Scoring:** Word-overlap similarity by default, exact match optional. No external scoring service needed.

**Availability:** Always available as long as a default LLM credential exists — checked via `isAvailable()`.

### Prompt Version Manager (`src/lib/server/optimization/PromptVersionManager.ts`)

MongoDB-backed version management with A/B testing:

- **Collection:** `prompt_versions` — stores all prompt versions with metrics
- **Collection:** `prompt_ab_configs` — stores A/B test configurations per pattern
- **Core methods:** `createVersion()`, `getActivePrompt()`, `getVersionHistory()`
- **A/B testing:** `recordUsage()`, `checkAutoPromotion()`, `promoteVersion()`
- **Auto-promotion:** After `minSamples` executions, if the optimized version exceeds the baseline by `improvementThreshold`, it is automatically promoted

### Prompt Optimizer (`src/lib/server/optimization/PromptOptimizer.ts`)

Orchestrates the full optimization cycle:
1. Creates baseline version from current prompt
2. Collects training data from `learning_metrics` MongoDB collection
3. Runs native optimizer (BootstrapFewShot or MIPRO)
4. Stores optimized version via `PromptVersionManager`
5. Optionally starts A/B test or promotes directly

## Integration Points

### Expert Nodes

**ExpertNodeRunner.ts:**
- Before LLM execution, calls `promptVersionManager.getActivePrompt()` using the expert's `promptPatternDomain` or `node.id` as the pattern key
- After execution, calls `promptVersionManager.recordUsage()` with success/failure status

**ExpertPatternExecutor.ts:**
- In `recordWorkflowSuccess()` and `recordWorkflowFailure()`, records usage against the active prompt version for each pattern used

### Cortex Flow Executors

All executors follow the same pattern — check for an optimized prompt before building the LLM request:

| Executor | Pattern Key | Integration |
|----------|-------------|-------------|
| `CortexFlowExecutor` | `presetId` or `'cortex-flow'` | After `composeSystemPrompt()` |
| `OpenAIExecutor` | `settings.preset` or `'openai-flow'` | Before building initial messages |
| `LlamaExecutor` | `settings.preset` or `'llama-flow'` | Before pushing system message |
| `MultiAgentOrchestrator` | `multi-agent:{role}` | Before each agent's LLM call |
| `GeminiExecutor` | N/A (sync method) | Applied via CortexFlowExecutor wrapper |

All integrations use dynamic `import()` with try/catch so the optimization module is fully optional — if unavailable, the original prompt is used without error.

## API Endpoints

**`src/routes/api/optimization/+server.ts`**

| Method | Params | Description |
|--------|--------|-------------|
| `GET ?action=health` | — | Check optimizer availability (LLM credential check) |
| `GET ?patternId=X` | `patternId` | Get optimization status and version history |
| `POST action=optimize` | `patternId, currentPrompt, optimizer, promptType, enableABTest, ...` | Trigger optimization |
| `POST action=promote` | `versionId` | Manually promote a version |
| `POST action=setABTest` | `patternId, enabled, trafficSplit, minSamples, improvementThreshold` | Configure A/B test |
| `POST action=history` | `patternId` | Get version history |

## Admin UI

**`AdminOptimizationTab.svelte`** — accessible from the admin panel under the "Optimization" tab (requires `admin.optimization` or `monitoring.metrics` privilege).

Features:
- Optimizer availability indicator
- Pattern lookup and version history
- Run optimization with BootstrapFewShot or MIPRO
- A/B test toggle
- Version promotion controls
- Score/improvement metrics display

## MongoDB Collections

### `prompt_versions`

```javascript
{
  versionId: string,       // unique hex ID
  patternId: string,       // links to cortex pattern or preset key
  prompt: string,          // the full prompt text
  isBaseline: boolean,
  isOptimized: boolean,
  isActive: boolean,
  optimizer: 'mipro' | 'bootstrap',
  score: number,
  metrics: {
    successRate: number,
    usageCount: number,
    avgConfidence: number,
    totalSuccesses: number,
    totalFailures: number
  },
  createdAt: Date,
  promotedAt: Date
}
```

**Indexes:** `{ patternId, isActive }`, `{ patternId, createdAt }`, `{ versionId }` (unique)

### `prompt_ab_configs`

```javascript
{
  patternId: string,
  config: {
    enabled: boolean,
    trafficSplit: number,         // 0-1
    minSamples: number,
    improvementThreshold: number  // e.g. 0.10 = 10%
  }
}
```

## A/B Testing Flow

1. Run optimization via API or Admin UI
2. Baseline and optimized versions are created and activated
3. `getActivePrompt()` randomly selects baseline or optimized based on `trafficSplit`
4. Each execution records success/failure via `recordUsage()`
5. After `minSamples` executions of the optimized variant, `checkAutoPromotion()` runs
6. If improvement exceeds `improvementThreshold`, the optimized version is promoted and A/B test is disabled

## Design Decisions

### Why Native TypeScript (not Python DSPy)?

- **No external dependency** — runs in-process, no sidecar to deploy/monitor
- **No Docker overhead** — no separate container, no inter-process HTTP calls
- **Uses existing infrastructure** — `callLLM`, `getDefaultLlmCredential`, MongoDB via `getMongoService`
- **Consistent with platform** — same language, same patterns, same error handling
- **The core algorithms are simple** — BootstrapFewShot is example selection + scoring; MIPRO is LLM-guided rewriting + scoring. Neither requires Python-specific capabilities.
