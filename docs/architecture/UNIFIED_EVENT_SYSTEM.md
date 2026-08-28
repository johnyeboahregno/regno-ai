# Unified Event System Architecture

## Overview

The Regno platform uses a **single unified EventBus** (`eventBus` from `$lib/server/events`) as the single source of truth for all pipeline execution events. This replaces the previous dual-bus architecture that caused event delivery issues.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER SIDE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────────────────────┐   │
│  │  Pipeline Executor  │    │         Event Helpers                     │   │
│  │  (pipelineServer    │───▶│  publishNodeStarted()                    │   │
│  │   Executor.ts)      │    │  publishNodeCompleted()                  │   │
│  └─────────────────────┘    │  publishNodeError()                      │   │
│                             │  publishExecutionStarted/Completed/Failed │   │
│                             │  publishHeartbeat()                       │   │
│                             │  publishDbCall()                          │   │
│                             │  publishNodeMessage()                     │   │
│                             └──────────────────┬───────────────────────┘   │
│                                                │                            │
│                                                ▼                            │
│                             ┌──────────────────────────────────────────┐   │
│                             │           EventBus                        │   │
│                             │   (src/lib/server/events/EventBus.ts)    │   │
│                             │                                          │   │
│                             │  - Discriminated union types             │   │
│                             │  - ExecutionId/SessionId filtering       │   │
│                             │  - Middleware pipeline                   │   │
│                             │  - Metrics recording                     │   │
│                             └──────────────────┬───────────────────────┘   │
│                                                │                            │
│                    ┌───────────────────────────┼───────────────────────┐   │
│                    │                           │                       │   │
│                    ▼                           ▼                       ▼   │
│          ┌─────────────────┐      ┌─────────────────┐      ┌──────────────┐│
│          │  SSE Endpoint   │      │  Redis PubSub   │      │  WebSocket   ││
│          │  /api/events/   │      │  (for workers)  │      │  Adapter     ││
│          │  subscribe      │      └─────────────────┘      └──────────────┘│
│          └────────┬────────┘                                               │
│                   │                                                        │
└───────────────────┼────────────────────────────────────────────────────────┘
                    │
                    │ Server-Sent Events
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT SIDE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│          ┌──────────────────────────────────────────────────────────┐      │
│          │              EventSubscriber                              │      │
│          │        (src/lib/utils/EventSubscriber.ts)                │      │
│          │                                                          │      │
│          │  - Connects to SSE endpoint                              │      │
│          │  - Subscribes by executionId (recommended)               │      │
│          │  - Auto-reconnect support                                │      │
│          │  - Event type filtering                                  │      │
│          └──────────────────────┬───────────────────────────────────┘      │
│                                 │                                          │
│                                 ▼                                          │
│          ┌──────────────────────────────────────────────────────────┐      │
│          │           DataManagementCanvas.svelte                     │      │
│          │                                                          │      │
│          │  - setupExecutionEventSubscriber(executionId)            │      │
│          │  - Updates node.isRunning on node_started                │      │
│          │  - Updates node.outputs on node_completed                │      │
│          │  - Invokes node hooks (onNodeStarted, onNodeCompleted)   │      │
│          └──────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. EventBus (`src/lib/server/events/EventBus.ts`)

The core event bus that handles all event publication and subscription.

```typescript
import { eventBus } from '$lib/server/events';

// Subscribe to all pipeline events
eventBus.subscribe('pipeline', (event) => {
  console.log(event.type, event.executionId);
});

// Subscribe to specific execution
eventBus.subscribeToExecution(executionId, (event) => {
  // Only receives events for this execution
});
```

### 2. Event Publisher Helpers (`src/lib/server/events/index.ts`)

**Always use these helpers instead of direct eventBus calls:**

```typescript
import {
  publishExecutionStarted,
  publishExecutionCompleted,
  publishExecutionFailed,
  publishNodeStarted,
  publishNodeCompleted,
  publishNodeError,
  publishNodeProgress,
  publishNodeMessage,
  publishHeartbeat,
  publishDbCall,
  publishCheckpointCreated
} from '$lib/server/events';

// Example: Publishing node completion with output data
publishNodeCompleted(
  executionId,
  nodeId,
  nodeName,
  nodeType,
  durationMs,
  outputCount,
  outputSample,  // Array of sample output records for Display nodes
  inputSample    // Array of sample input records for debugging
);
```

### 3. Legacy Adapter (`src/lib/server/monitoring/pipelineExecutionBus.ts`)

**DEPRECATED - Do not use for new code**

The `pipelineExecutionBus` is now a thin adapter that forwards to `eventBus`. It exists only for backward compatibility with existing code that hasn't been migrated.

```typescript
// OLD WAY - Don't do this
pipelineExecutionBus.publish({
  version: 1,
  type: 'node_completed',
  executionId,
  ts: Date.now(),
  payload: { nodeId, outputSample }
});

// NEW WAY - Do this instead
publishNodeCompleted(executionId, nodeId, nodeName, nodeType, durationMs, outputCount, outputSample);
```

## Client-Side Subscription

### EventSubscriber Class

```typescript
import { EventSubscriber } from '$lib/utils/EventSubscriber';

// Create subscriber with executionId (recommended)
const subscriber = new EventSubscriber({
  executionId: executionId,
  eventTypes: ['node_started', 'node_completed', 'node_error', 'node_message', 'node_progress'],
  autoReconnect: true
});

// Set up event handlers
subscriber.on('node_started', (event) => {
  const { nodeId, nodeName } = event.payload;
  // Update UI - show node as running
});

subscriber.on('node_completed', (event) => {
  const { nodeId, outputSample } = event.payload;
  // Update UI - show output data
});

// Connect to SSE stream
subscriber.connect();

// Clean up when done
subscriber.disconnect();
```

### Critical: Timing of Subscription Setup

**The subscriber MUST be set up in the `onExecutionStarted` callback, NOT after `execute()` returns.**

```typescript
// CORRECT - Subscribe when execution starts
const handlersObject = {
  onExecutionStarted: (executionId) => {
    currentExecutionId = executionId;
    setupExecutionEventSubscriber(executionId);  // Subscribe immediately!
  }
};

const result = await pipelineExecutor.execute(options, handlersObject);

// WRONG - Don't do this (race condition)
const result = await pipelineExecutor.execute(options, handlersObject);
// Events may have already been emitted by now!
setupExecutionEventSubscriber(result.executionId);
```

## Event Types Reference

| Event Type | Helper Function | Description |
|------------|-----------------|-------------|
| `pipeline:execution_started` | `publishExecutionStarted()` | Pipeline execution begins |
| `pipeline:execution_completed` | `publishExecutionCompleted()` | Pipeline execution finished successfully |
| `pipeline:execution_failed` | `publishExecutionFailed()` | Pipeline execution failed |
| `pipeline:node_started` | `publishNodeStarted()` | Node begins execution |
| `pipeline:node_completed` | `publishNodeCompleted()` | Node finished successfully |
| `pipeline:node_error` | `publishNodeError()` | Node encountered an error |
| `pipeline:node_progress` | `publishNodeProgress()` | Node progress update |
| `pipeline:node_message` | `publishNodeMessage()` | Node log/console message |
| `pipeline:heartbeat` | `publishHeartbeat()` | Keep-alive signal |
| `pipeline:db_call` | `publishDbCall()` | Database operation tracked |
| `pipeline:checkpoint_created` | `publishCheckpointCreated()` | Execution checkpoint saved |

## Common Issues & Solutions

### Issue: Events not reaching the canvas / Display node not showing output

**Symptoms:**
- Console shows events being published on server
- Canvas doesn't update node visual states
- Display node stays empty

**Cause:** Race condition - subscriber created after execution starts, missing early events

**Solution:** Set up subscriber in `onExecutionStarted` callback:
```typescript
onExecutionStarted: (executionId) => {
  setupExecutionEventSubscriber(executionId);
}
```

### Issue: Subscribing by pipelineId but events have executionId

**Symptoms:**
- Events published but filtered out at SSE endpoint
- Server logs show events, client doesn't receive them

**Cause:** Node events don't have `pipelineId`, only `executionId`

**Solution:** Subscribe by `executionId`, not `pipelineId`:
```typescript
// CORRECT
new EventSubscriber({ executionId: executionId });

// WRONG for node events
new EventSubscriber({ pipelineId: pipelineId });
```

### Issue: Duplicate events

**Symptoms:**
- Same event arrives twice
- UI updates happen twice

**Cause:** Publishing to both `pipelineExecutionBus` and direct helpers

**Solution:** Use ONLY the helpers from `$lib/server/events`:
```typescript
// WRONG - publishes twice
pipelineExecutionBus.publish(event);
publishNodeCompleted(...);

// CORRECT - publish once
publishNodeCompleted(...);
```

## Migration Checklist

When migrating code to use the unified event system:

1. [ ] Replace `pipelineExecutionBus.publish()` with appropriate helper function
2. [ ] Ensure all required parameters are provided to helper
3. [ ] Remove any duplicate publishing calls
4. [ ] Subscribe by `executionId` for node-level events
5. [ ] Set up subscription in `onExecutionStarted` callback
6. [ ] Test event delivery end-to-end

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/server/events/EventBus.ts` | Core event bus implementation |
| `src/lib/server/events/index.ts` | Event helpers and exports |
| `src/lib/server/monitoring/pipelineExecutionBus.ts` | Legacy adapter (deprecated) |
| `src/lib/utils/EventSubscriber.ts` | Client-side SSE subscriber |
| `src/lib/server/execution/pipelineServerExecutor.ts` | Pipeline execution with event publishing |
| `src/lib/components/DataManagementCanvas.svelte` | Canvas with event subscription |
| `src/routes/api/events/subscribe/+server.ts` | SSE endpoint |

## Best Practices

1. **Single Source of Truth**: All events flow through `eventBus`
2. **Type Safety**: Use helper functions for typed event publishing
3. **Subscription by ExecutionId**: Always subscribe by `executionId` for node events
4. **Early Subscription**: Set up subscribers BEFORE execution starts
5. **No Double Publishing**: Never publish to both `pipelineExecutionBus` and helpers
6. **Include Output Samples**: Pass `outputSample` to `publishNodeCompleted` for Display nodes
7. **Clean Up**: Always call `subscriber.disconnect()` when component unmounts
