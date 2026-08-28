# Agent OS Architecture

## Overview

The Agent OS is a foundational layer that provides intelligent orchestration, memory, and collaboration capabilities for all agents in the Cortex Flow system.

## Quick Start: Activation Flags

Most meta-agents are **implemented but not enabled by default**. See [Activation Flags](#activation-flags) for how to enable each feature.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER PROMPT                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: META-AGENTS                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Orchestrator   │  │ Quality Auditor │  │ Retry Strategist│              │
│  │  (routing)      │  │ (validation)    │  │ (error recovery)│              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│  ┌─────────────────┐                                                        │
│  │ Pattern Learner │                                                        │
│  │  (optimization) │                                                        │
│  └─────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 2: MEMORY & LEARNING                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       CONTEXT CURATOR                                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │   Qdrant    │  │   Neo4j     │  │   MongoDB   │                  │    │
│  │  │  (vectors)  │  │  (graphs)   │  │  (state)    │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LAYER 3: COLLABORATION AGENTS                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │Handoff Coordin. │  │Escalation Router│  │ Consensus Build.│              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 4: DOMAIN AGENTS                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │Research│ │ Video  │ │Document│ │  Code  │ │ Market │ │  ...   │         │
│  │ Agent  │ │ Scout  │ │Analyst │ │Auditor │ │Research│ │        │         │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXECUTION INFRASTRUCTURE                               │
│  PlanEngine → Orchestrator → PhaseRunner → Tools                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Context Curator | ✅ Complete | `src/lib/server/cortex-flow/agents/ContextCurator.ts` |
| Agent Registry | ✅ Complete | `src/lib/server/cortex-flow/agents/AgentRegistry.ts` |
| Agent Router | ✅ Complete | `src/lib/server/cortex-flow/agents/AgentRouter.ts` |
| PlanEngine Integration | ✅ Complete | `src/lib/server/cortex-flow/v2/PlanEngine.ts` |
| Orchestrator Integration | ✅ Complete | `src/lib/server/cortex-flow/v2/Orchestrator.ts` |
| Quality Auditor | ✅ Complete | `src/lib/server/cortex-flow/agents/QualityAuditor.ts` |
| Retry Strategist | ✅ Complete | `src/lib/server/cortex-flow/agents/RetryStrategist.ts` |
| Pattern Learner | ✅ Complete | `src/lib/server/cortex-flow/agents/PatternLearner.ts` |

### Context Curator Features

| Feature | Status | Description |
|---------|--------|-------------|
| Semantic Memory (Qdrant) | ✅ | Vector search for similar past work |
| Entity Graph (Neo4j) | ✅ | Knowledge graph of entities & relationships |
| Session Checkpoints (MongoDB) | ✅ | Checkpoint/resume for long-running tasks |
| Resume from Checkpoint | ✅ | API + execute endpoint integration |
| Entity Tracking | ✅ | Auto-extract & track entities during execution |
| Memory API | ✅ | REST endpoints for stats, cleanup, forget |
| Cleanup Cron Job | ✅ | Scheduled job every 6 hours |
| UI Context Suggestions | ✅ | Svelte component + context API endpoint |

### Quality Auditor Features

| Feature | Status | Description |
|---------|--------|-------------|
| Completeness Checks | ✅ | Validates output addresses prompt requirements |
| Formatting Validation | ✅ | JSON, Markdown, code structure checks |
| Coherence Analysis | ✅ | Contradiction and incompleteness detection |
| Safety Checks | ✅ | Sensitive data and PII detection |
| Accuracy Checks | ✅ | Uncertainty language and unsourced claims |
| Orchestrator Integration | ✅ | Optional per-phase and final audit |
| Auto-Correction | ✅ | Fixes unclosed code blocks, whitespace |
| Quality Scoring | ✅ | 0-100 score with pass/fail threshold |

### Pattern Learner Features

| Feature | Status | Description |
|---------|--------|-------------|
| Prompt Feature Extraction | ✅ | Analyze prompts for intent, domain, complexity |
| Pattern Tracking | ✅ | Track success/failure rates by pattern signature |
| Tool Effectiveness Metrics | ✅ | Per-tool success rates by domain/intent |
| Tool Sequence Learning | ✅ | Learn which tool combinations work best |
| Recommendations API | ✅ | Get tool/model/approach recommendations |
| Insight Detection | ✅ | Auto-detect high-success and anti-patterns |
| Baseline Patterns | ✅ | Pre-seeded with known effective patterns |

---

## Activation Flags

Most meta-agents are **implemented but require explicit activation**. This section documents how to enable each feature.

### Orchestrator Options (Constructor)

When creating an Orchestrator, pass options to enable features:

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  // Memory & Checkpointing (Context Curator)
  enableMemory: true,           // DEFAULT: true - Enable checkpoint/memory features
  sessionId: 'session-123',     // Required for checkpoints
  originalPrompt: 'user prompt',// Required for memory storage

  // Quality Auditor
  enableQualityAudit: true,     // DEFAULT: true - Enable quality checks
  qualityThreshold: 70,         // DEFAULT: 70 - Score threshold (0-100)

  // Retry Strategist
  enableIntelligentRetry: true, // DEFAULT: true - Enable intelligent retry
  maxAutoRetries: 2,            // DEFAULT: 2 - Max retries per phase

  // Step Mode (for debugging/testing)
  stepMode: false,              // Pause after each phase for approval
});
```

| Flag | Default | Effect |
|------|---------|--------|
| `enableMemory` | `true` | Saves checkpoints, enables resume from failure |
| `enableQualityAudit` | `true` | Runs Quality Auditor after phases |
| `qualityThreshold` | `70` | Minimum quality score to pass audit |
| `enableIntelligentRetry` | `true` | Uses Retry Strategist for smart retries |
| `maxAutoRetries` | `2` | Max retry attempts before failing |
| `stepMode` | `false` | Pause after each phase for manual approval |

### Execute Endpoint Options (POST Body)

When calling `/api/cortex-flow/v2/execute`:

```json
{
  "prompt": "Your prompt here",
  "taskId": "task-123",

  // Checkpoint handling
  "checkForCheckpoint": true,     // DEFAULT: true - Check for resumable checkpoint
  "resumeFromCheckpoint": false,  // Explicitly resume from checkpoint
  "skipCheckpointPrompt": false,  // Skip checkpoint, start fresh

  // Plan control
  "generatePlan": false,          // Auto-generate plan
  "planOnly": false,              // Generate plan but don't execute
  "stepMode": false               // Pause after each phase
}
```

| Flag | Default | Effect |
|------|---------|--------|
| `checkForCheckpoint` | `true` | Returns checkpoint info if found (for resume decision) |
| `resumeFromCheckpoint` | `false` | Resume from existing checkpoint |
| `skipCheckpointPrompt` | `false` | Ignore any existing checkpoint |
| `planOnly` | `false` | Generate plan without executing |
| `stepMode` | `false` | Execute in step-by-step mode |

---

## How to View/Access Implemented Functionality

### 1. Context Curator (Memory & Checkpoints)

**View memory stats:**
```bash
# GET /api/cortex-flow/memory/stats?userId=<userId>
curl -X GET "http://localhost:5173/api/cortex-flow/memory/stats?userId=user123" \
  -H "Authorization: Bearer <token>"
```

**Get curated context for a prompt:**
```bash
# POST /api/cortex-flow/context
curl -X POST "http://localhost:5173/api/cortex-flow/context" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Research Tesla Q4 earnings", "userId": "user123"}'
```

**Check for checkpoint:**
```bash
# GET /api/cortex-flow/memory/checkpoint?sessionId=<sessionId>
curl -X GET "http://localhost:5173/api/cortex-flow/memory/checkpoint?sessionId=task123" \
  -H "Authorization: Bearer <token>"
```

**UI Component:**
- `ContextSuggestionsPanel.svelte` - Shows similar past work, related entities, resumable checkpoints
- Import: `import ContextSuggestionsPanel from '$lib/components/cortex-flow/ContextSuggestionsPanel.svelte'`

### 2. Quality Auditor

**Programmatic access:**
```typescript
import { qualityAuditor } from '$lib/server/cortex-flow/agents';

// Full audit
const result = await qualityAuditor.audit(output, {
  expectedFormat: 'markdown',
  originalPrompt: 'user prompt',
  phasePrompt: 'phase prompt'
});
console.log(result.score, result.passed, result.issues);

// Quick validation (per-phase)
const quick = qualityAuditor.quickValidate(output, { expectedFormat: 'json' });
console.log(quick.passed, quick.issues);
```

**Enable in Orchestrator:**
```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableQualityAudit: true,
  qualityThreshold: 70
});

// Listen for audit results
orchestrator.on('phase_complete', (event) => {
  if (event.qualityResult) {
    console.log('Quality score:', event.qualityResult.score);
  }
});
```

### 3. Retry Strategist

**Programmatic access:**
```typescript
import { retryStrategist } from '$lib/server/cortex-flow/agents';

// Analyze a failure
const strategy = retryStrategist.analyzeFailure({
  phaseName: 'Research',
  phaseIndex: 0,
  phasePrompt: 'Search for...',
  error: 'WebSearch returned no results',
  failedTools: [{ name: 'WebSearch', error: 'No results found' }],
  attemptNumber: 1
});

console.log(strategy.action);        // 'retry_modified'
console.log(strategy.modification);  // { type: 'append', content: '...' }
console.log(strategy.reasoning);     // 'Search returned no results...'

// Get stats
const stats = retryStrategist.getStats();
console.log(stats.totalFailuresTracked, stats.successfulStrategiesLearned);
```

**Orchestrator events:**
```typescript
orchestrator.on('retry_strategy', (event) => {
  console.log('Retry strategy selected:', event.strategy.action);
  console.log('Reasoning:', event.strategy.reasoning);
});
```

### 4. Pattern Learner

**Programmatic access:**
```typescript
import { patternLearner } from '$lib/server/cortex-flow/agents';

// Get recommendations for a prompt
const recommendations = patternLearner.getRecommendations(
  'Analyze this YouTube video about AI',
  { domain: 'technology', intent: 'analysis' }
);
console.log(recommendations);
// [{ recommendationType: 'tools', suggestedTools: ['VideoFetch', 'AudioTranscribe'], ... }]

// Learn from execution
patternLearner.learnFromExecution({
  executionId: 'exec-123',
  userId: 'user-456',
  prompt: 'Research NVIDIA earnings',
  outcome: 'success',
  phasesExecuted: [...],
  totalDuration: 15000,
  totalTokenCost: 3000
});

// Get tool effectiveness
const effectiveness = patternLearner.getToolEffectiveness('WebSearch', {
  domain: 'finance',
  intent: 'research'
});
console.log(effectiveness?.metrics.successRate);

// Get learning stats
const stats = patternLearner.getStats();
console.log(stats.totalPatterns, stats.topPerformingTools);

// Find similar patterns
const similar = patternLearner.findSimilarPatterns('Research Tesla stock', 5);
```

### 5. Agent Router & Registry

**Programmatic access:**
```typescript
import { routePromptToAgent, getAgentRegistry } from '$lib/server/cortex-flow/agents';

// Route a prompt to an agent
const { decision, plan } = await routePromptToAgent("Analyze NVIDIA's GTC keynote");
console.log(decision.selection);  // Selected agent
console.log(plan);                // Generated Cortex plan

// Access registry directly
const registry = getAgentRegistry();
const agents = registry.getAllAgents();
const videoAgent = registry.getAgentBySlug('video-intelligence-scout');
```

---

## Database Requirements

The Agent OS requires these databases to be running. **If required databases are unavailable, Cortex Flow will be disabled.**

| Database | Purpose | Required | For |
|----------|---------|----------|-----|
| MongoDB | Session checkpoints, orchestration state | **Yes** | Context Curator |
| Qdrant | Vector similarity search | **Yes** | Context Curator (semantic memory) |
| Neo4j | Entity knowledge graph | **Yes** | Context Curator (entity tracking) |
| Embedding Service | Text embeddings (OpenAI/Cohere) | Optional | RAG System |

### System Health Check

Cortex Flow includes an automatic health check that:
- Runs on startup and every 60 seconds
- Checks MongoDB, Qdrant, Neo4j connectivity
- Shows status in the UI header (traffic light icon)
- **Disables the input** if required services are unavailable

### UI Status Indicator

The header displays a traffic light icon that shows system status:

| Color | Meaning |
|-------|---------|
| 🟢 Green | All systems operational |
| 🟡 Yellow | Degraded (RAG unavailable or non-critical service down) |
| 🔴 Red | Disabled (required database unavailable) |

Click the traffic light to expand the **System Status Panel** with:
- Individual service status
- RAG system availability
- Execution settings (Step Mode, Quality Audit, Smart Retry)

### Health Check API

```bash
# Quick status
curl -X GET "http://localhost:5173/api/cortex-flow/health"

# Full status with service details
curl -X GET "http://localhost:5173/api/cortex-flow/health?full=true"
```

**Response:**
```json
{
  "operational": true,
  "services": [
    { "name": "MongoDB", "status": "available", "required": true },
    { "name": "Qdrant", "status": "available", "required": true },
    { "name": "Neo4j", "status": "available", "required": true },
    { "name": "RAG System", "status": "available", "required": false }
  ],
  "ragAvailable": true,
  "message": "All systems operational"
}

**Check database connectivity:**
```typescript
import { contextCurator } from '$lib/server/cortex-flow/agents';

const stats = await contextCurator.getStats('user123');
console.log(stats);
// Shows memory count, entity count, checkpoint count
```

---

## Related Documentation

- [Context Curator](./CONTEXT_CURATOR.md) - Memory & Learning meta-agent
- [Quality Auditor](./QUALITY_AUDITOR.md) - Validation & Quality Control meta-agent
- [Retry Strategist](./RETRY_STRATEGIST.md) - Error Recovery meta-agent
- [Pattern Learner](./PATTERN_LEARNER.md) - Learning & Optimization meta-agent
- [Agent Registry](./AGENT_REGISTRY.md) - Macro/Micro agent definitions
- [Memory API](./MEMORY_API.md) - API endpoints for memory operations
- [Agent Framework](./AGENT_FRAMEWORK.md) - Full agent framework with routing
