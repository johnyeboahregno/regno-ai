# Universal Event Subscription System

## Overview

A universal SSE (Server-Sent Events) system that allows **any client app** to subscribe to real-time server events. This eliminates the need for custom event handling in each client.

## Architecture

```
Server: Pipeline Execution
    ↓ (emits events)
Server: pipelineExecutionBus
    ↓ (broadcasts)
Server: /api/events/subscribe (SSE endpoint)
    ↓ (streams via HTTP)
Client: EventSubscriber utility
    ↓ (dispatches to listeners)
Client: Your App (chat, pipelines, automation, etc.)
```

## Server Side

### SSE Endpoint: `/api/events/subscribe`

**Query Parameters:**
- `executionId` - Subscribe to events for a specific execution
- `pipelineId` - Subscribe to events for all executions of a pipeline
- `eventTypes` - (Optional) Comma-separated filter: `thinking_update,node_message`

**Example URLs:**
```
/api/events/subscribe?executionId=exec_abc123
/api/events/subscribe?executionId=exec_abc123&eventTypes=thinking_update
/api/events/subscribe?pipelineId=pipeline_xyz
```

### Available Event Types

| Event Type | Description | Payload |
|------------|-------------|---------|
| `thinking_update` | Expert Node reasoning steps | `{ step, title, status, details }` |
| `node_started` | Node begins execution | `{ nodeId, nodeType, inputSize }` |
| `node_completed` | Node finishes execution | `{ nodeId, outputSize, duration }` |
| `node_message` | Node log message | `{ nodeId, message, level }` |
| `node_error` | Node error occurred | `{ nodeId, error, stack }` |
| `connection` | Connection status change | `{ status, timestamp }` |

## Client Side

### Basic Usage

```typescript
import { EventSubscriber } from '$lib/utils/EventSubscriber';

// Create subscriber for a specific execution
const subscriber = new EventSubscriber({
  executionId: 'exec_123',
  eventTypes: ['thinking_update', 'node_message'] // Optional filter
});

// Listen for thinking updates
subscriber.on('thinking_update', (event) => {
  console.log(`Step: ${event.payload.step}`);
  console.log(`Title: ${event.payload.title}`);
  console.log(`Status: ${event.payload.status}`);
});

// Listen for node messages
subscriber.on('node_message', (event) => {
  console.log(`Message: ${event.payload.message}`);
});

// Listen for connection status
subscriber.on('connection', (event) => {
  console.log(`Connection: ${event.status}`);
});

// Start listening
subscriber.connect();

// Later... cleanup
subscriber.disconnect();
```

### Wildcard Listener

```typescript
// Listen to ALL event types
subscriber.on('*', (event) => {
  console.log(`Event: ${event.type}`, event);
});
```

### Advanced Configuration

```typescript
const subscriber = new EventSubscriber({
  executionId: 'exec_123',
  autoReconnect: true,              // Auto-reconnect on disconnect (default: true)
  maxReconnectAttempts: 5,          // Max reconnection attempts (default: 5)
  reconnectDelay: 2000,             // Delay between reconnects in ms (default: 2000)
  eventTypes: ['thinking_update']   // Filter specific event types
});
```

### Svelte Integration Example

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EventSubscriber } from '$lib/utils/EventSubscriber';

  let subscriber: EventSubscriber | null = null;
  let thinkingSteps = $state<any[]>([]);

  onMount(() => {
    const executionId = 'exec_123'; // Get from your context

    subscriber = new EventSubscriber({
      executionId,
      eventTypes: ['thinking_update']
    });

    subscriber.on('thinking_update', (event) => {
      thinkingSteps.push(event.payload);
      thinkingSteps = [...thinkingSteps]; // Trigger reactivity
    });

    subscriber.connect();
  });

  onDestroy(() => {
    subscriber?.disconnect();
  });
</script>

<div>
  <h3>Thinking Steps:</h3>
  {#each thinkingSteps as step}
    <div class="step {step.status}">
      <strong>{step.title}</strong>
      {#if step.details}
        <ul>
          {#each step.details as detail}
            <li>{detail}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</div>
```

## Use Cases

### 1. Chat App - Show Expert Node Thinking Steps

```typescript
// When user sends message, get executionId from response
const response = await fetch('/api/chat/send', { ... });
const { executionId } = await response.json();

// Subscribe to thinking updates
const subscriber = new EventSubscriber({
  executionId,
  eventTypes: ['thinking_update']
});

subscriber.on('thinking_update', (event) => {
  // Update chat message with thinking indicator
  updateMessageThinkingState(messageId, event.payload);
});

subscriber.connect();
```

### 2. Pipeline Canvas - Show Node Execution Progress

```typescript
const subscriber = new EventSubscriber({
  executionId: pipelineExecutionId,
  eventTypes: ['node_started', 'node_completed', 'node_error']
});

subscriber.on('node_started', (event) => {
  highlightNode(event.payload.nodeId, 'running');
});

subscriber.on('node_completed', (event) => {
  highlightNode(event.payload.nodeId, 'completed');
});

subscriber.on('node_error', (event) => {
  highlightNode(event.payload.nodeId, 'error');
  showError(event.payload.error);
});

subscriber.connect();
```

### 3. Admin Dashboard - Monitor All Executions

```typescript
const subscriber = new EventSubscriber({
  pipelineId: 'all', // Special: monitor all pipelines
  eventTypes: ['node_error'] // Only interested in errors
});

subscriber.on('node_error', (event) => {
  addToErrorLog(event);
  sendAlert(event.payload.error);
});

subscriber.connect();
```

## Features

✅ **Universal** - Works with any client app
✅ **Auto-reconnect** - Handles disconnections gracefully
✅ **Event filtering** - Subscribe only to events you need
✅ **Multiple listeners** - Multiple handlers per event type
✅ **Wildcard support** - Listen to all events with `*`
✅ **Connection status** - Know when connected/disconnected
✅ **Cleanup** - Proper cleanup with `disconnect()`

## Next Steps

1. **Chat Integration**: Wire up thinking steps in ChatWidget
2. **Pipeline Canvas**: Show real-time node execution
3. **Automation**: Monitor workflow execution status
4. **Admin Tools**: Real-time error monitoring

## Technical Notes

- Uses native `EventSource` API (SSE)
- Automatic keep-alive pings every 30 seconds
- Handles page refresh/navigation cleanup
- Thread-safe with event bus subscription
- No polling - true push from server
