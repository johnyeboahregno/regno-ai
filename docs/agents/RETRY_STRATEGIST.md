# Retry Strategist

## Overview

The Retry Strategist is an error recovery meta-agent that provides intelligent retry strategies for failed operations. It analyzes failures, classifies error types, and recommends the best course of action - whether to retry immediately, retry with modifications, skip, or abort.

## Location

```
src/lib/server/cortex-flow/agents/RetryStrategist.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RETRY STRATEGIST                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ERROR CLASSIFICATION                               │   │
│  │  • Transient: Rate limits, timeouts, network issues                   │   │
│  │  • Permanent: Auth failures, invalid inputs                           │   │
│  │  • Recoverable: Tool errors, format issues                            │   │
│  │  • Unknown: Default to limited retries                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    TOOL-SPECIFIC PATTERNS                             │   │
│  │  • WebSearch: No results → broaden query                              │   │
│  │  • WebFetch: 404 → find alternative, blocked → search for alt         │   │
│  │  • PdfRead: File not found → glob search, vision fail → text mode     │   │
│  │  • DocumentRender: Not called → enforce call                          │   │
│  │  • ImageGeneration: Content policy → revise description               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    STRATEGY SELECTION                                 │   │
│  │  • retry_immediate: Very short transient errors                       │   │
│  │  • retry_backoff: Transient with exponential delay                    │   │
│  │  • retry_modified: Prompt/parameter changes                           │   │
│  │  • skip_phase: Continue without this phase                            │   │
│  │  • abort: Stop execution                                              │   │
│  │  • escalate: Human intervention needed                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LEARNING & TRACKING                                │   │
│  │  • Error signature computation for pattern matching                   │   │
│  │  • Successful strategy memory                                         │   │
│  │  • Failure history for common errors                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Error Types

| Type | Description | Default Action |
|------|-------------|----------------|
| `transient` | Temporary issues that resolve on their own | Retry with backoff |
| `permanent` | Will never succeed with retry | Abort |
| `recoverable` | May succeed with modifications | Retry modified |
| `unknown` | Cannot determine error type | Limited retries |

## Retry Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| `retry_immediate` | Retry without delay | Very brief transient errors |
| `retry_backoff` | Exponential backoff retry | Rate limits, timeouts |
| `retry_modified` | Retry with prompt changes | Tool errors, format issues |
| `skip_phase` | Skip phase, continue execution | Non-critical failures |
| `abort` | Stop execution entirely | Auth failures, permanent errors |
| `escalate` | Request human intervention | Complex failures |

## Tool-Specific Patterns

### WebSearch
| Error | Strategy | Modification |
|-------|----------|--------------|
| No results | retry_modified | Broaden search terms |

### WebFetch
| Error | Strategy | Modification |
|-------|----------|--------------|
| 404 Not Found | retry_modified | Try alternative source |
| Blocked/Captcha | retry_modified | Use WebSearch for alternatives |

### PdfRead
| Error | Strategy | Modification |
|-------|----------|--------------|
| File not found | retry_modified | Use Glob to find correct path |
| Vision mode failed | retry_modified | Switch to text-only mode |

### DocumentRender
| Error | Strategy | Modification |
|-------|----------|--------------|
| Not called | retry_modified | Enforce tool call |

### ImageGeneration
| Error | Strategy | Modification |
|-------|----------|--------------|
| Content policy | retry_modified | Revise image description |

### Generic
| Error | Strategy | Modification |
|-------|----------|--------------|
| Rate limit/429 | retry_backoff | Wait and retry |
| Timeout | retry_backoff | Wait and retry |
| Network error | retry_backoff | Wait and retry |
| Auth/401/403 | abort | Check credentials |
| JSON parse error | retry_modified | Request valid JSON |
| Token limit | retry_modified | Request concise output |

## Main API

### analyzeFailure()

Analyze a failure and get retry recommendation.

```typescript
const strategy = retryStrategist.analyzeFailure({
  phaseName: 'Research',
  phaseIndex: 0,
  phasePrompt: 'Search for Tesla Q4 earnings...',
  error: 'WebSearch returned no results',
  failedTools: [{ name: 'WebSearch', error: 'No results found' }],
  attemptNumber: 1,
  outputSoFar: ''
});

// strategy.action: 'retry_modified'
// strategy.modification: { type: 'append', content: '...broaden search...' }
// strategy.reasoning: 'Search returned no results, will modify query'
```

**Returns:**
```typescript
interface RetryStrategy {
  strategyId: string;
  action: RetryAction;
  errorType: ErrorType;
  confidence: number;        // 0-1

  // Timing
  delayMs?: number;
  maxRetries?: number;
  backoffMultiplier?: number;

  // Modifications
  modification?: PromptModification;

  // Reasoning
  reasoning: string;
  matchedPattern?: string;
  errorSignature: string;
}
```

### recordRetryResult()

Record the outcome of a retry for learning.

```typescript
retryStrategist.recordRetryResult(strategy, {
  strategyId: strategy.strategyId,
  succeeded: true,
  duration: 5000
});
```

### calculateBackoff()

Calculate exponential backoff delay.

```typescript
const delay = retryStrategist.calculateBackoff(
  attemptNumber,  // 1, 2, 3...
  1000,           // base delay (ms)
  30000           // max delay (ms)
);
// Returns: 1000, 2000, 4000, 8000, 16000, 30000 (with ±10% jitter)
```

### isTransientError() / isPermanentError()

Quick error classification helpers.

```typescript
if (retryStrategist.isTransientError(error)) {
  // Safe to retry with backoff
}

if (retryStrategist.isPermanentError(error)) {
  // Don't retry, will fail again
}
```

### getStats()

Get retry statistics for monitoring.

```typescript
const stats = retryStrategist.getStats();
// {
//   totalFailuresTracked: 45,
//   successfulStrategiesLearned: 12,
//   mostCommonErrors: [{ signature: 'abc123', count: 5 }, ...]
// }
```

## Orchestrator Integration

The Retry Strategist is integrated into the Orchestrator for automatic retry handling.

### Constructor Options

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableIntelligentRetry: true,  // Enable intelligent retry (default: true)
  maxAutoRetries: 2              // Max auto-retries per phase (default: 2)
});
```

### Automatic Retry Flow

1. Phase fails
2. Retry Strategist analyzes failure
3. If strategy recommends retry and attempts < maxAutoRetries:
   - Apply delay if specified
   - Apply prompt modification if specified
   - Re-run the phase
4. If max retries exceeded or strategy says abort:
   - Emit phase_failed event with suggestions
   - Stop execution

### Events

**Retry strategy event:**
```typescript
orchestrator.on('retry_strategy', (event) => {
  // event.type: 'v2_retry_strategy'
  // event.phaseIndex: number
  // event.phaseName: string
  // event.strategy: { action, errorType, confidence, reasoning }
  // event.attemptNumber: number
});
```

**Phase failed (includes retry count):**
```typescript
orchestrator.on('phase_failed', (event) => {
  // event.retryAttempts: number
});
```

## Learning System

The Retry Strategist learns from successful retries:

1. **Error Signature**: Each error is converted to a stable signature that captures the essence while normalizing variable parts (IDs, URLs, numbers).

2. **Strategy Memory**: When a retry succeeds, the strategy is stored keyed by error signature.

3. **Future Matching**: When a similar error occurs, the previously successful strategy is recommended first.

```typescript
// Error: "Rate limit exceeded for request abc-123-def"
// Signature: "research:websearch:rate limit exceeded for request ID"

// Next time same signature appears:
// "Using previously successful strategy: Retry with backoff worked"
```

## Prompt Modifications

### Modification Types

| Type | Description | Example |
|------|-------------|---------|
| `append` | Add to end of prompt | Add error context |
| `prepend` | Add to start of prompt | Add priority instructions |
| `replace` | Replace entire prompt | Complete rewrite |
| `remove_tool` | Add instruction to avoid tool | Disable failing tool |

### Example Modifications

**WebSearch no results:**
```
NOTE: Previous web search returned no results. Try broader search terms or alternative queries.
```

**PdfRead file not found:**
```
IMPORTANT: First use Glob tool to find PDF files in the directory (pattern: "**/*.pdf"), then use the correct path.
```

**DocumentRender not called:**
```
CRITICAL: You MUST call the DocumentRender tool to convert the markdown file to the final format. Do NOT skip this step.
```

## Activation

### Status: Implemented and ON by default

The Retry Strategist is **enabled by default** in the Orchestrator. To configure:

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableIntelligentRetry: true,  // Enable intelligent retry (default: true)
  maxAutoRetries: 2              // Max retries per phase (default: 2)
});
```

### To Disable

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableIntelligentRetry: false  // Disable intelligent retry
});
```

### Direct Usage (Always Available)

For standalone use without the Orchestrator:

```typescript
import { retryStrategist } from '$lib/server/cortex-flow/agents';

// No activation needed - use directly
const strategy = retryStrategist.analyzeFailure(context);
```

## Usage Examples

### Basic Failure Analysis

```typescript
import { retryStrategist } from '$lib/server/cortex-flow/agents';

const result = await runPhase(phase);

if (!result.success) {
  const strategy = retryStrategist.analyzeFailure({
    phaseName: phase.name,
    phaseIndex: 0,
    phasePrompt: phase.prompt,
    error: result.error,
    failedTools: result.failedTools,
    attemptNumber: 1
  });

  if (strategy.action === 'retry_backoff') {
    await sleep(strategy.delayMs);
    // Retry phase
  } else if (strategy.action === 'retry_modified') {
    phase.prompt = phase.prompt + strategy.modification.content;
    // Retry with modified prompt
  }
}
```

### With Backoff Calculation

```typescript
let attemptNumber = 1;
const maxRetries = 3;

while (attemptNumber <= maxRetries) {
  const result = await runPhase(phase);

  if (result.success) break;

  if (retryStrategist.isTransientError(result.error)) {
    const delay = retryStrategist.calculateBackoff(attemptNumber);
    console.log(`Transient error, waiting ${delay}ms...`);
    await sleep(delay);
    attemptNumber++;
  } else if (retryStrategist.isPermanentError(result.error)) {
    console.log('Permanent error, aborting');
    break;
  }
}
```

## Related Documentation

- [Agent OS Architecture](./AGENT_OS_ARCHITECTURE.md) - Overall architecture
- [Context Curator](./CONTEXT_CURATOR.md) - Memory & Learning meta-agent
- [Quality Auditor](./QUALITY_AUDITOR.md) - Validation & Quality Control meta-agent
