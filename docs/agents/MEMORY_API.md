# Memory API

## Overview

The Memory API provides endpoints for managing Context Curator memory, checkpoints, and statistics. These APIs support the resume-from-checkpoint feature and memory management.

## Endpoints

### Memory Statistics

**GET** `/api/cortex-flow/memory?userId={userId}`

Returns memory statistics for a user.

**Response:**
```json
{
  "totalMemories": 156,
  "totalCheckpoints": 3,
  "totalEntities": 89,
  "memoriesByOutcome": {
    "success": 142,
    "partial": 10,
    "failed": 4
  },
  "topDomains": [
    { "domain": "market-research", "count": 67 },
    { "domain": "code-analysis", "count": 45 }
  ],
  "recentMemories": [
    {
      "executionId": "exec-123",
      "prompt": "Research Tesla Q4 earnings",
      "outcome": "success",
      "domain": "market-research",
      "tags": ["tesla", "earnings"],
      "createdAt": "2026-02-06T10:30:00Z",
      "duration": 45000
    }
  ]
}
```

### Memory Cleanup

**POST** `/api/cortex-flow/memory`

Triggers cleanup of expired memories and checkpoints.

**Request Body:**
```json
{
  "action": "cleanup"
}
```

**Response:**
```json
{
  "memoriesDeleted": 5,
  "checkpointsDeleted": 12
}
```

### Forget Execution

**DELETE** `/api/cortex-flow/memory?executionId={executionId}`

Removes a specific execution from memory.

**Response:**
```json
{
  "success": true
}
```

---

## Checkpoint API

### Check for Checkpoint

**GET** `/api/cortex-flow/memory/checkpoint?sessionId={sessionId}`

Checks if there's a resumable checkpoint for a session/task.

**Response (with checkpoint):**
```json
{
  "hasCheckpoint": true,
  "checkpoint": {
    "checkpointId": "ckpt-abc123",
    "executionId": "exec-456",
    "phase": "Research",
    "phaseIndex": 2,
    "progress": 65,
    "reason": "auto",
    "createdAt": "2026-02-06T10:25:00Z",
    "resumePrompt": "Continue researching Tesla earnings...",
    "remainingPhases": 3
  }
}
```

**Response (no checkpoint):**
```json
{
  "hasCheckpoint": false
}
```

### Delete Checkpoint

**DELETE** `/api/cortex-flow/memory/checkpoint?checkpointId={checkpointId}`

Clears a checkpoint (e.g., user chooses to start fresh).

**Response:**
```json
{
  "success": true
}
```

---

## Resume from Checkpoint Integration

The execute endpoint (`/api/cortex-flow/v2/execute`) supports checkpoint detection and resumption.

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `checkForCheckpoint` | boolean | `true` | Check for resumable checkpoint before starting |
| `resumeFromCheckpoint` | boolean | `false` | Explicitly resume from existing checkpoint |
| `skipCheckpointPrompt` | boolean | `false` | Skip checkpoint check and start fresh |

### Flow

1. **Initial Request (checkForCheckpoint=true)**
   - If checkpoint exists, returns checkpoint info without starting execution
   - Client can then decide to resume or start fresh

2. **Resume Request (resumeFromCheckpoint=true)**
   - Loads checkpoint and queues `orchestrate-resume` job
   - Continues from the last completed phase

3. **Fresh Start (skipCheckpointPrompt=true)**
   - Ignores existing checkpoint
   - Starts new execution from phase 1

### Example: Checkpoint Detection Response

```json
{
  "success": true,
  "hasCheckpoint": true,
  "checkpoint": {
    "checkpointId": "ckpt-abc123",
    "executionId": "exec-456",
    "phase": "Analysis",
    "phaseIndex": 2,
    "progress": 60,
    "reason": "user_pause",
    "createdAt": "2026-02-06T10:25:00Z",
    "resumePrompt": "Continue from phase 'Analysis' (60% complete). Next: 'Synthesis'.",
    "remainingPhases": 2
  },
  "message": "Found checkpoint at 60% (phase \"Analysis\"). Resume or start fresh?"
}
```

### Example: Resume Response

```json
{
  "success": true,
  "executionId": "exec-456",
  "jobId": "resume-exec-456",
  "streamUrl": "/api/cortex-flow/exec-456/events",
  "mode": "resume",
  "resumedFrom": {
    "checkpointId": "ckpt-abc123",
    "phase": "Analysis",
    "progress": 60
  }
}
```

---

## Checkpoint Reasons

| Reason | Description |
|--------|-------------|
| `auto` | Automatic checkpoint after phase completion |
| `user_pause` | User requested pause |
| `error` | Execution failed, checkpoint saved for retry |
| `timeout` | Execution timed out |

---

## Client Integration Example

```typescript
async function executeWithCheckpointSupport(taskId: string, prompt: string) {
  // First request checks for checkpoint
  const response = await fetch('/api/cortex-flow/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId,
      prompt,
      generatePlan: true,
      checkForCheckpoint: true
    })
  });

  const result = await response.json();

  if (result.hasCheckpoint) {
    // Ask user what to do
    const userChoice = await askUser(
      `Found checkpoint at ${result.checkpoint.progress}%. Resume or start fresh?`
    );

    if (userChoice === 'resume') {
      return fetch('/api/cortex-flow/v2/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          prompt,
          generatePlan: true,
          resumeFromCheckpoint: true
        })
      });
    } else {
      return fetch('/api/cortex-flow/v2/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          prompt,
          generatePlan: true,
          skipCheckpointPrompt: true
        })
      });
    }
  }

  // No checkpoint, execution started normally
  return result;
}
```

---

## Related Documentation

- [Context Curator](./CONTEXT_CURATOR.md) - Core memory & learning meta-agent
- [Agent OS Architecture](./AGENT_OS_ARCHITECTURE.md) - Overall architecture
