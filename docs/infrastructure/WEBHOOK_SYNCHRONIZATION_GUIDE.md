# Webhook Synchronization Guide

## Overview

This system provides real-time synchronization between webhooks and pipeline canvases, with special handling for webhooks in "init mode" (webhooks that wait for user interaction before executing).

## Two Scenarios

### Scenario A: Pipeline Canvas Already Open (Real-time)
When the pipeline canvas is visible and a webhook is invoked:

1. **Webhook receives request** → Checks if webhook is in init mode
2. **If init mode and canvas is open**:
   - Webhook sends SSE event to the open canvas
   - Pipeline receives notification via SSE
   - Pipeline executes immediately
3. **SSE connection** maintains real-time communication

**Flow:**
```
Webhook Request → SSE Event → Pipeline Canvas → Execute
      (instant communication)
```

### Scenario B: Pipeline Canvas Not Open (Wait & Acknowledge)
When the pipeline canvas is NOT visible and a webhook is invoked:

1. **Webhook receives request** → Checks if webhook is in init mode
2. **If init mode and canvas NOT open**:
   - Webhook request is stored in `pendingWebhookManager`
   - Promise waits (up to 60 seconds timeout)
3. **When user opens pipeline**:
   - Canvas calls `/api/webhooks/check-pending/[pipelineId]`
   - If pending webhooks found:
     - Canvas sets up SSE connection
     - Canvas calls `/api/webhooks/acknowledge/[pipelineId]`
     - Server releases pending webhooks
     - Webhooks execute through pipeline

**Flow:**
```
Webhook Request → Pending Storage → Wait
                                     ↓
User Opens Canvas → Check Pending → Acknowledge → Execute
```

## Implementation Components

### Server-Side

#### 1. **Pending Webhook Manager** (`src/lib/server/pendingWebhooks.ts`)
```typescript
- waitForPipelineLoad() - Stores webhook request and waits
- notifyPipelineLoaded() - Releases webhooks when pipeline opens
- getPendingWebhooksForPipeline() - Gets waiting webhooks for a pipeline
```

#### 2. **API Endpoints**

**Check Pending**
- `GET /api/webhooks/check-pending/[pipelineId]`
- Returns list of webhooks waiting for this pipeline

**Acknowledge**
- `POST /api/webhooks/acknowledge/[pipelineId]`
- Tells server that canvas is ready
- Releases all pending webhooks for execution

**SSE Sync**
- `GET /api/webhooks/sync/[pipelineId]`
- Establishes SSE connection for real-time events
- Sends ping every 15 seconds to keep alive

### Client-Side

#### 1. **Webhook Handshake Service** (`src/lib/services/webhookHandshakeService.ts`)
```typescript
- checkPending() - Check if webhooks are waiting
- acknowledge() - Tell server canvas is ready
- performHandshake() - Complete check → acknowledge flow
```

#### 2. **Canvas Integration** (`src/lib/components/DataManagementCanvas.svelte`)

**On Pipeline Load:**
```typescript
// 1. Perform handshake to check for pending webhooks
const webhooksTriggered = await webhookHandshakeService.performHandshake(
  pipeline.id,
  (message) => console.log(`[Webhook Handshake] ${message}`)
);

if (webhooksTriggered) {
  console.log('Pending webhooks were triggered!');
}
```

**For Real-time (Scenario A) - TO BE IMPLEMENTED:**
```typescript
// 2. Set up SSE connection for real-time webhook notifications
const sseConnection = new EventSource(`/api/webhooks/sync/${pipeline.id}`);

sseConnection.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'webhook-triggered') {
    // Webhook was invoked - execute pipeline
    handleWebhookExecution(data.webhookId, data.context);
  }
});

// 3. Clean up on unmount
onDestroy(() => {
  sseConnection.close();
});
```

## Current Status

✅ **Scenario A (Real-time SSE)** - FULLY IMPLEMENTED
- SSE endpoint with connection management (`/api/webhooks/sync/[pipelineId]`)
- SSE broadcasts webhook-triggered events
- Canvas connects via `webhookSyncService`
- Pipeline executes immediately when webhook fires

✅ **Scenario B (Wait & Acknowledge)** - FULLY IMPLEMENTED
- Webhook waits in pendingWebhookManager
- Canvas checks on load via `webhookHandshakeService`
- Acknowledges and triggers execution

## Implementation Summary

### What Was Implemented

**1. SSE Connection Manager** (`/api/webhooks/sync/[pipelineId]/+server.ts`)
- Added `SSEConnectionManager` class to track active SSE connections per pipeline
- Methods: `addConnection()`, `removeConnection()`, `hasActiveConnections()`, `broadcast()`
- Automatically cleans up dead connections
- Registers/unregisters connections on connect/disconnect

**2. Webhook Lifecycle Updates** (`src/lib/server/webhookLifecycle.ts`)
- Enhanced `executeWebhook()` to check for active SSE connections
- **Scenario A**: If SSE connection exists → broadcasts `webhook-triggered` event immediately
- **Scenario B**: If no SSE connection → falls back to pending webhook approach
- Returns `executedViaSSE: true` when using real-time broadcast

**3. DataManagementCanvas Integration** (`src/lib/components/DataManagementCanvas.svelte`)
- Already connects via `webhookSyncService.connect()` when pipeline loads
- Updated event handler to process `webhook-triggered` events
- Stores webhook context in node config (`_webhookContext`)
- Executes webhook node via `runNode()` when event received

**4. Type Updates** (`src/lib/services/webhookSyncService.ts`)
- Added `webhook-triggered` to event types
- Added `webhookId`, `nodeId`, and `context` to event interface

## Example Implementation

### Canvas SSE Setup (Client)
```typescript
let webhookSSE: EventSource | null = null;

async function setupWebhookSSE(pipelineId: string) {
  webhookSSE = new EventSource(`/api/webhooks/sync/${pipelineId}`);

  webhookSSE.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'connected':
        console.log('[Webhook SSE] Connected');
        break;
      case 'webhook-triggered':
        console.log('[Webhook SSE] Webhook fired:', data.webhookId);
        executeWebhook(data.webhookId, data.context);
        break;
      case 'ping':
        // Keep-alive
        break;
    }
  };

  webhookSSE.onerror = (error) => {
    console.error('[Webhook SSE] Error:', error);
    webhookSSE?.close();
  };
}

function cleanup() {
  webhookSSE?.close();
  webhookSSE = null;
}
```

### Server SSE Broadcast (Server)
```typescript
// In webhookLifecycle.ts
private sseConnections = new Map<string, Set<Response>>();

addSSEConnection(pipelineId: string, response: Response) {
  if (!this.sseConnections.has(pipelineId)) {
    this.sseConnections.set(pipelineId, new Set());
  }
  this.sseConnections.get(pipelineId)!.add(response);
}

broadcastWebhookTrigger(pipelineId: string, webhookId: string, context: any) {
  const connections = this.sseConnections.get(pipelineId);
  if (!connections) return false;

  const event = `data: ${JSON.stringify({
    type: 'webhook-triggered',
    pipelineId,
    webhookId,
    context,
    timestamp: new Date().toISOString()
  })}\n\n`;

  connections.forEach(conn => {
    try {
      conn.write(event);
    } catch (error) {
      connections.delete(conn);
    }
  });

  return connections.size > 0;
}
```

## Testing Instructions

### Test Scenario A (Real-time SSE - Pipeline Visible)

1. **Setup**:
   - Create a pipeline with a webhook node in init mode
   - Open the pipeline in the canvas (keep it visible)
   - Activate the webhook (it should register with init mode enabled)

2. **Trigger**:
   - Send an HTTP request to the webhook URL
   - Example: `curl -X POST http://localhost:5173/api/webhooks/[webhookId]`

3. **Expected Behavior**:
   - Console should show: `[Webhook Lifecycle] 📡 Pipeline [id] is visible - broadcasting via SSE`
   - Console should show: `[SSE Manager] Broadcasted to X connections`
   - Canvas should show: `[Webhook Sync] 📡 Real-time webhook triggered: [webhookId]`
   - Toast notification: "Webhook triggered - executing pipeline"
   - Pipeline executes immediately without waiting

4. **Verify**:
   - Check server logs for SSE broadcast messages
   - Check client console for webhook-triggered event
   - Confirm pipeline execution happens in real-time

### Test Scenario B (Pending Webhook - Pipeline Not Visible)

1. **Setup**:
   - Create a pipeline with a webhook node in init mode
   - Activate the webhook but close/don't open the pipeline canvas
   - Webhook should be registered but canvas is not visible

2. **Trigger**:
   - Send an HTTP request to the webhook URL
   - Example: `curl -X POST http://localhost:5173/api/webhooks/[webhookId]`

3. **Expected Behavior**:
   - Console should show: `[Webhook Lifecycle] ⏸️ Pipeline [id] not visible - using pending webhook approach`
   - Webhook waits for up to 60 seconds
   - Open the pipeline in canvas
   - Console should show: `[Webhook Handshake] Pending webhooks found`
   - Toast notification: "Pending webhooks triggered - pipeline will pause at init nodes"
   - Pipeline executes after acknowledgment

4. **Verify**:
   - Webhook request doesn't timeout while waiting
   - Opening canvas triggers webhook execution
   - Check pending webhook manager logs

### Quick Test Commands

```bash
# Get webhook ID from your pipeline
# Then test with curl:

# Scenario A: Pipeline visible
curl -X POST http://localhost:5173/api/webhooks/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Scenario B: Pipeline not visible (same command, but close canvas first)
curl -X POST http://localhost:5173/api/webhooks/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Then open the pipeline canvas within 60 seconds
```

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────┐
│  Webhook HTTP   │────────▶│  Webhook Server  │
│    Request      │         │                  │
└─────────────────┘         └────────┬─────────┘
                                     │
                            ┌────────▼────────┐
                            │  Is Init Mode?  │
                            └────────┬────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
         ┌──────▼──────┐      ┌──────▼──────┐    ┌───────▼────────┐
         │ Canvas Open?│      │Canvas Closed│    │  No Init Mode  │
         │    (Yes)    │      │    (Yes)    │    │   Execute Now  │
         └──────┬──────┘      └──────┬──────┘    └────────────────┘
                │                    │
         ┌──────▼──────┐      ┌──────▼──────┐
         │  Send SSE   │      │ Store in    │
         │   Event     │      │  Pending    │
         └──────┬──────┘      └──────┬──────┘
                │                    │
         ┌──────▼──────┐             │
         │  Execute    │             │ Wait...
         │  Pipeline   │             │
         └─────────────┘      ┌──────▼──────────┐
                              │  User Opens     │
         SCENARIO A           │  Canvas         │
         (Real-time)          └──────┬──────────┘
                                     │
                              ┌──────▼──────────┐
                              │ Check Pending   │
                              │ → Acknowledge   │
                              │ → Execute       │
                              └─────────────────┘

                              SCENARIO B
                              (Wait & Ack)
```

## Benefits

1. **Real-time responsiveness** (Scenario A)
   - No polling needed
   - Instant pipeline execution
   - Better user experience

2. **Reliability** (Scenario B)
   - Webhooks don't fail if canvas closed
   - User can review request before execution
   - 60-second timeout prevents hanging

3. **Flexibility**
   - Init mode gives user control
   - Non-init webhooks execute immediately
   - Works with or without canvas open
