# Pattern Learner

## Overview

The Pattern Learner is a learning and optimization meta-agent that analyzes execution history to identify successful patterns and provide recommendations for improving future executions.

## Location

```
src/lib/server/cortex-flow/agents/PatternLearner.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PATTERN LEARNER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    FEATURE EXTRACTION                                 │   │
│  │  • Structural: word count, sentences, questions, URLs, code blocks   │   │
│  │  • Semantic: intent, domain, complexity, specificity                 │   │
│  │  • Entities: people, orgs, URLs, files, metrics, dates               │   │
│  │  • Keyword clusters: video, web research, documents, code            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    PATTERN TRACKING                                   │   │
│  │  • Prompt patterns: signature → success/failure rates                 │   │
│  │  • Tool sequences: which tools work well together                     │   │
│  │  • Model choices: which tiers work best per context                   │   │
│  │  • Domain patterns: success rates by domain/intent                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    TOOL EFFECTIVENESS                                 │   │
│  │  • Success rate per tool/domain/intent                                │   │
│  │  • Average duration and retry count                                   │   │
│  │  • Best tool pairings (tools that work well together)                 │   │
│  │  • Anti-patterns (tools to avoid in certain contexts)                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    INSIGHT DETECTION                                  │   │
│  │  • High-success patterns → recommendations                            │   │
│  │  • Low-success patterns → warnings/anti-patterns                      │   │
│  │  • Emerging patterns → early detection                                │   │
│  │  • Anomalies → unusual failures or successes                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Pattern Types

| Type | Description | Key Metrics |
|------|-------------|-------------|
| `prompt` | Prompt feature signatures | Success rate, avg duration, quality |
| `tool_sequence` | Tool usage order patterns | Success rate, avg duration |
| `model_choice` | Model tier per context | Quality score, cost efficiency |
| `domain` | Domain-specific patterns | Best tools, success rate |

## Prompt Features Extracted

### Structural Features
| Feature | Description |
|---------|-------------|
| `wordCount` | Total words in prompt |
| `sentenceCount` | Number of sentences |
| `questionCount` | Questions asked |
| `hasUrl` | Contains URL |
| `hasFilePath` | References a file |
| `hasCodeBlock` | Contains code block |

### Semantic Features
| Feature | Values | Description |
|---------|--------|-------------|
| `intent` | research, analysis, creation, summarization, comparison, explanation, coding, debugging, general | Detected user intent |
| `domain` | technology, finance, science, business, media, general | Topic domain |
| `complexity` | simple, moderate, complex | Task complexity |
| `specificity` | vague, moderate, specific | How specific the request is |

## Main API

### learnFromExecution()

Record execution for learning.

```typescript
const result = patternLearner.learnFromExecution({
  executionId: 'exec-123',
  userId: 'user-456',
  prompt: 'Research NVIDIA Q4 earnings',
  outcome: 'success',

  phasesExecuted: [
    {
      phaseName: 'Research',
      toolsUsed: ['WebSearch', 'WebFetch'],
      modelTier: 'analyst',
      duration: 15000,
      tokenCost: 3000,
      success: true,
      retryCount: 0,
      qualityScore: 85
    }
  ],

  totalDuration: 15000,
  totalTokenCost: 3000,
  qualityScore: 85,
  domain: 'finance',
  intent: 'research'
});

// result.patternsUpdated: 3 (prompt, tool sequence, tool effectiveness)
// result.newInsights: [] (or new insight if pattern detected)
```

### getRecommendations()

Get recommendations for a prompt.

```typescript
const recommendations = patternLearner.getRecommendations(
  'Analyze this YouTube video about AI robotics',
  { domain: 'technology', intent: 'analysis' }
);

// Returns array of PatternRecommendation:
// [
//   {
//     recommendationType: 'tools',
//     confidence: 0.7,
//     reasoning: 'Video content detected',
//     suggestedTools: ['VideoFetch', 'AudioTranscribe'],
//     toolSequence: ['VideoFetch', 'AudioTranscribe', 'WebSearch']
//   },
//   {
//     recommendationType: 'model_tier',
//     confidence: 0.8,
//     reasoning: 'Complex analysis requires deeper reasoning',
//     suggestedTier: 'thinker'
//   },
//   {
//     recommendationType: 'warning',
//     confidence: 0.6,
//     warningMessage: 'Consider adding video URL for better results'
//   }
// ]
```

### getToolEffectiveness()

Get effectiveness metrics for a tool.

```typescript
const effectiveness = patternLearner.getToolEffectiveness(
  'WebSearch',
  { domain: 'finance', intent: 'research' }
);

// {
//   toolName: 'WebSearch',
//   domain: 'finance',
//   intent: 'research',
//   metrics: {
//     successRate: 0.85,
//     avgDuration: 5000,
//     avgRetries: 0.2,
//     avgQualityContribution: 75
//   },
//   commonErrors: [...],
//   bestPairedWith: ['WebFetch', 'DocumentRender'],
//   avoidWith: [],
//   sampleCount: 25
// }
```

### findSimilarPatterns()

Find similar past executions.

```typescript
const similar = patternLearner.findSimilarPatterns(
  'Research Tesla stock performance',
  5 // limit
);

// [
//   { pattern: ExecutionPattern, similarity: 0.82 },
//   { pattern: ExecutionPattern, similarity: 0.71 },
//   ...
// ]
```

### getInsights()

Get learning insights.

```typescript
const insights = patternLearner.getInsights({
  type: 'recommendation',
  category: 'workflow',
  minConfidence: 0.7
});

// [
//   {
//     insightId: 'insight_123',
//     insightType: 'pattern',
//     category: 'workflow',
//     title: 'High-success pattern identified',
//     description: 'research tasks in finance domain have 85% success rate',
//     confidence: 0.85,
//     actionable: {
//       suggestion: 'Prioritize this approach for similar tasks',
//       expectedImprovement: 'Consistent high success rate'
//     }
//   }
// ]
```

### getStats()

Get learning statistics.

```typescript
const stats = patternLearner.getStats();

// {
//   totalPatterns: 45,
//   totalToolMetrics: 32,
//   totalInsights: 8,
//   patternsByType: { prompt: 20, tool_sequence: 15, model_choice: 10 },
//   topPerformingTools: [
//     { tool: 'WebSearch', successRate: 0.9 },
//     { tool: 'PdfRead', successRate: 0.85 }
//   ],
//   recentInsights: [...]
// }
```

## Recommendation Types

| Type | Fields | Description |
|------|--------|-------------|
| `tools` | suggestedTools, toolSequence | Which tools to use |
| `model_tier` | suggestedTier | Which model tier to use |
| `approach` | approachHints | How to approach the task |
| `warning` | warningMessage, avoidPatterns | Anti-patterns to avoid |

## Insight Types

| Type | Description | Auto-Generated |
|------|-------------|----------------|
| `recommendation` | Actionable suggestion | Yes, for high-success patterns |
| `warning` | Caution about approach | Yes, for low-success patterns |
| `pattern` | Detected pattern | Yes, when samples >= 3 |
| `anomaly` | Unusual behavior | Yes, for outliers |

## Integration Points

### PlanEngine

```typescript
// In PlanEngine, consult for tool recommendations
const recommendations = patternLearner.getRecommendations(prompt);
const toolRec = recommendations.find(r => r.recommendationType === 'tools');
if (toolRec?.suggestedTools) {
  // Include suggested tools in plan generation context
}
```

### Orchestrator

```typescript
// After execution, record for learning
orchestrator.on('execution_complete', (event) => {
  patternLearner.learnFromExecution({
    executionId: event.executionId,
    userId: event.userId,
    prompt: event.prompt,
    outcome: event.success ? 'success' : 'failed',
    phasesExecuted: event.phases,
    totalDuration: event.duration,
    totalTokenCost: event.tokenCost,
    qualityScore: event.qualityScore
  });
});
```

### AgentRouter

```typescript
// Use similar patterns to improve routing
const similar = patternLearner.findSimilarPatterns(prompt, 3);
if (similar.length > 0 && similar[0].similarity > 0.7) {
  // Use tools/approach from similar successful execution
  const pattern = similar[0].pattern;
  // pattern.context.toolsUsed, pattern.context.modelTiers
}
```

## Baseline Patterns

The Pattern Learner is initialized with baseline knowledge:

| Tool Sequence | Domain | Intent | Baseline Success |
|---------------|--------|--------|------------------|
| WebSearch → WebFetch | general | research | 83% |
| VideoFetch → AudioTranscribe | media | analysis | 83% |
| PdfRead | general | analysis | 83% |
| WebSearch → DocumentRender | general | creation | 83% |

## Activation

### Status: Implemented, requires manual integration

The Pattern Learner is available for use but must be explicitly called. It is **not** automatically integrated into the Orchestrator (learning must be triggered manually after executions).

### Direct Usage

```typescript
import { patternLearner } from '$lib/server/cortex-flow/agents';

// Get recommendations before execution
const recommendations = patternLearner.getRecommendations(prompt, { domain, intent });

// Learn from execution after completion
patternLearner.learnFromExecution({
  executionId,
  userId,
  prompt,
  outcome: 'success',
  phasesExecuted: [...],
  totalDuration,
  totalTokenCost,
  qualityScore
});
```

### Suggested Integration Points

1. **PlanEngine**: Call `getRecommendations()` to inform tool selection
2. **Orchestrator**: Call `learnFromExecution()` after `orchestration_complete` event
3. **AgentRouter**: Call `findSimilarPatterns()` to improve agent selection

## Configuration

The Pattern Learner requires no configuration and is available immediately:

```typescript
import { patternLearner } from '$lib/server/cortex-flow/agents';
```

### Thresholds

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_SAMPLES_FOR_PATTERN` | 3 | Min samples before pattern detected |
| `MIN_CONFIDENCE_FOR_RECOMMENDATION` | 0.6 | Min confidence for recommendations |
| `PATTERN_DECAY_DAYS` | 90 | Days before pattern relevance decays |

## Related Documentation

- [Agent OS Architecture](./AGENT_OS_ARCHITECTURE.md) - Overall architecture
- [Context Curator](./CONTEXT_CURATOR.md) - Memory & Learning meta-agent
- [Quality Auditor](./QUALITY_AUDITOR.md) - Validation & Quality Control
- [Retry Strategist](./RETRY_STRATEGIST.md) - Error Recovery
