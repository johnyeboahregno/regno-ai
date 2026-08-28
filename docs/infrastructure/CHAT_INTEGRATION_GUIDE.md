# Chat Integration Guide - Thinking Steps with SSE

## What We've Built

✅ Universal SSE endpoint: `/api/events/subscribe`
✅ EventSubscriber utility: `src/lib/utils/EventSubscriber.ts`
✅ Message types updated with `executionId` and `thinking`
✅ ChatMessage component already has thinking display logic (lines 258-300)

## What Needs Integration

### Step 1: Capture executionId from Response

When chat sends a message to an agent/pipeline, the response needs to include the `executionId`.

**Location**: Check these response handlers in `ChatWidget.svelte`:
- Line ~3381: `sendMessageWithProgressiveTimeout`
- Line ~3594: Second `sendMessageWithProgressiveTimeout`
- Line ~3839: Third `sendMessageWithProgressiveTimeout`

**What to capture**:
```typescript
const response = await secureServerEndpointService.sendMessage(...);

// Response should include executionId
const executionId = response.executionId || response.requestId;

// Store in message
botMessage.executionId = executionId;
```

### Step 2: Subscribe to Events When Message is Created

**Add to ChatWidget.svelte** (after creating bot message):

```typescript
import { EventSubscriber } from '$lib/utils/EventSubscriber';

// Store active subscribers
const activeSubscribers = new Map<string, EventSubscriber>();

// After creating bot message with executionId
if (botMessage.executionId) {
  const subscriber = new EventSubscriber({
    executionId: botMessage.executionId,
    eventTypes: ['thinking_update']
  });

  subscriber.on('thinking_update', (event) => {
    updateMessageThinking(botMessage.id, event.payload);
  });

  subscriber.connect();
  activeSubscribers.set(botMessage.id, subscriber);
}

// Helper function to update message thinking state
function updateMessageThinking(messageId: string, thinkingPayload: any) {
  const message = chatStore.state.messages.find(m => m.id === messageId);
  if (!message) return;

  if (!message.thinking) {
    message.thinking = {
      active: true,
      steps: [],
      currentStep: thinking Payload.step
    };
  }

  // Find or create step
  let step = message.thinking.steps.find(s => s.step === thinkingPayload.step);

  if (!step) {
    step = {
      id: `${thinkingPayload.step}-${Date.now()}`,
      step: thinkingPayload.step,
      title: thinkingPayload.title,
      status: thinkingPayload.status,
      details: thinkingPayload.details,
      startTime: Date.now()
    };
    message.thinking.steps.push(step);
  } else {
    // Update existing step
    step.title = thinkingPayload.title;
    step.status = thinkingPayload.status;
    step.details = thinkingPayload.details;
    if (thinkingPayload.status === 'completed') {
      step.endTime = Date.now();
    }
  }

  // Update current step
  if (thinkingPayload.status === 'active') {
    message.thinking.currentStep = thinkingPayload.step;
  }

  // Mark thinking as inactive if this was the last step
  if (thinkingPayload.step === 'verify' && thinkingPayload.status === 'completed') {
    message.thinking.active = false;
  }

  // Trigger reactivity
  chatStore.state.messages = [...chatStore.state.messages];
}
```

### Step 3: Cleanup Subscribers

**Add to ChatWidget.svelte** (onDestroy or when clearing messages):

```typescript
onDestroy(() => {
  // Disconnect all active subscribers
  for (const subscriber of activeSubscribers.values()) {
    subscriber.disconnect();
  }
  activeSubscribers.clear();
});

// Also cleanup when message is complete
function onMessageComplete(messageId: string) {
  const subscriber = activeSubscribers.get(messageId);
  if (subscriber) {
    subscriber.disconnect();
    activeSubscribers.delete(messageId);
  }
}
```

### Step 4: Server-Side - Return executionId

The server endpoints that handle chat messages need to return the `executionId`.

**Check these files**:
- Agent execution endpoints
- Pipeline execution endpoints
- Expert node execution

**Example fix** (in agent/pipeline execution):
```typescript
// After starting execution
const executionId = generateExecutionId();

// Start pipeline execution
await executePipeline(pipelineId, input, executionId);

// Return executionId to client
return json({
  output: result,
  executionId: executionId  // ← ADD THIS
});
```

## Testing

1. **Test SSE endpoint directly**:
   - Visit `/test-events`
   - Execute an Expert node (via chat or pipeline)
   - Copy the executionId from console/logs
   - Paste into test page and connect
   - Watch events stream in real-time

2. **Test in Chat**:
   - Ask "what is 2+2" or "chelsea's next game"
   - Should see thinking indicator appear
   - Should see steps populate as execution progresses
   - Steps should show: Parse → Classify → Tools → Gather → Reasoning → Safety → Verify

3. **Check Console**:
   ```javascript
   // Should see SSE logs
   [EventSubscriber] Connecting to /api/events/subscribe?executionId=...
   [EventSubscriber] Connected
   [SSE] Client subscribed: exec_xxx
   ```

## Current Status

✅ **Infrastructure**: Complete (SSE endpoint, EventSubscriber, types)
✅ **UI Component**: Complete (ChatMessage already shows thinking)
⚠️ **Integration**: Needs wiring (capture executionId, create subscribers)
⚠️ **Server**: May need to return executionId in responses

## Quick Win Approach

If full integration is complex, you can test manually:

1. Open browser console
2. Run this code:
```javascript
import { EventSubscriber } from '/src/lib/utils/EventSubscriber.ts';

const sub = new EventSubscriber({ executionId: 'exec_YOUR_ID_HERE' });
sub.on('*', e => console.log('EVENT:', e));
sub.connect();
```

3. Execute something that generates that executionId
4. Watch events in console

## Files Modified

- ✅ `src/routes/api/events/subscribe/+server.ts` (SSE endpoint)
- ✅ `src/lib/utils/EventSubscriber.ts` (client utility)
- ✅ `src/lib/types.ts` (added executionId field)
- ✅ `src/routes/test-events/+page.svelte` (test page)
- ⚠️ `src/lib/components/ChatWidget.svelte` (needs subscriber integration)
- ⚠️ Server endpoints (need to return executionId)

## Next Steps

1. Find where chat responses come back with data
2. Add `executionId` to response
3. Wire up EventSubscriber when bot message is created
4. Test with Chelsea question
5. Profit! 🎉
