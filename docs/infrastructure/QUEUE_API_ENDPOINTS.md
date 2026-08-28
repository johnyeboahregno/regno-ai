# Queue System API Endpoints

## Overview

REST API endpoints for managing and monitoring the queue system. All endpoints require authentication and appropriate permissions.

---

## Authentication

All endpoints require a valid authentication token. Include the token in the request headers:

```
Authorization: Bearer <token>
```

Or via session cookie.

---

## Endpoints

### Job Status & Control

#### GET `/api/queues/jobs/:id`

Get the status of a queued job.

**Authentication:** Required
**Permission:** Any authenticated user (for their own jobs)

**Parameters:**
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `id` | path | string | Yes | Job ID |

**Response:**

```json
{
  "jobId": "job-123",
  "executionId": "exec-456",
  "pipelineId": "pipeline-789",
  "state": "active",
  "progress": 45,
  "createdAt": "2024-01-15T10:30:00Z",
  "processedOn": "2024-01-15T10:30:05Z",
  "finishedOn": null,
  "attemptsMade": 0,
  "attemptsCount": 3,
  "logs": ["Processing node 1...", "Processing node 2..."]
}
```

**Job States:**
- `waiting` - In queue, not yet picked up
- `active` - Currently being processed
- `completed` - Successfully finished
- `failed` - Failed after all retry attempts
- `delayed` - Waiting for scheduled time

**Error Responses:**
| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 404 | Job not found |
| 503 | Queue system unavailable |

---

#### DELETE `/api/queues/jobs/:id`

Cancel a queued job.

**Authentication:** Required
**Permission:** `pipeline.execute`

**Parameters:**
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `id` | path | string | Yes | Job ID |

**Response (Success):**

```json
{
  "success": true,
  "message": "Job cancelled",
  "jobId": "job-123",
  "previousState": "waiting"
}
```

**Response (Already Finished):**

```json
{
  "success": false,
  "message": "Cannot cancel job in 'completed' state",
  "state": "completed"
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Insufficient permissions |
| 404 | Job not found |
| 503 | Queue system unavailable |

---

### Real-Time Job Events (SSE)

#### GET `/api/queues/jobs/:id/events`

Subscribe to real-time job status updates via Server-Sent Events.

**Authentication:** Required
**Permission:** Any authenticated user

**Parameters:**
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `id` | path | string | Yes | Job ID |

**Response:** Server-Sent Events stream

**Event Types:**

| Event | Data | Description |
|-------|------|-------------|
| `connected` | `{ jobId, timestamp }` | Connection established |
| `job_status` | `{ state, progress, ... }` | Job status update |
| `execution_event` | `{ type, nodeId, ... }` | Pipeline execution event |
| `heartbeat` | `{ timestamp }` | Keep-alive (every 30s) |
| `done` | `{ state, timestamp }` | Job completed/failed |
| `error` | `{ message }` | Error occurred |

**Example Usage (JavaScript):**

```javascript
const eventSource = new EventSource('/api/queues/jobs/job-123/events', {
  headers: { 'Authorization': 'Bearer <token>' }
});

eventSource.addEventListener('job_status', (e) => {
  const status = JSON.parse(e.data);
  console.log('Progress:', status.progress);
});

eventSource.addEventListener('done', (e) => {
  const result = JSON.parse(e.data);
  console.log('Completed with state:', result.state);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  console.error('Error:', e);
  eventSource.close();
});
```

---

### Scheduled Jobs

#### GET `/api/queues/scheduled`

List all scheduled/recurring jobs.

**Authentication:** Required
**Permission:** `admin.view`

**Response:**

```json
{
  "success": true,
  "scheduledJobs": [
    {
      "key": "cleanup:daily-cleanup:::0 2 * * *",
      "name": "cleanup",
      "id": "daily-cleanup",
      "pattern": "0 2 * * *",
      "tz": "UTC",
      "next": 1705312800000
    }
  ],
  "status": {
    "waiting": 0,
    "active": 0,
    "completed": 150,
    "failed": 2,
    "delayed": 5,
    "recentJobs": [...]
  },
  "presets": ["EVERY_MINUTE", "HOURLY", "DAILY", "WEEKLY", ...]
}
```

---

#### POST `/api/queues/scheduled`

Create a new scheduled job.

**Authentication:** Required
**Permission:** `admin.manage`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Job type: `cleanup`, `backup`, `health-check`, `sync`, `report`, `one-time`, `delayed` |
| `schedule` | string | For recurring | Cron expression or preset name |
| `jobName` | string | No | Unique job identifier |
| `config` | object | No | Type-specific configuration |
| `runAt` | string | For one-time | ISO timestamp for one-time jobs |
| `delayMs` | number | For delayed | Delay in milliseconds |

**Example - Recurring Cleanup:**

```json
{
  "type": "cleanup",
  "schedule": "DAILY_2AM",
  "jobName": "nightly-cleanup",
  "config": {
    "targets": ["sessions", "artifacts", "queues"],
    "maxAge": "7d"
  }
}
```

**Example - Health Check:**

```json
{
  "type": "health-check",
  "schedule": "HOURLY",
  "jobName": "hourly-health",
  "config": {
    "services": ["redis", "mongodb", "queues"],
    "alertOnFailure": true,
    "alertChannels": {
      "slack": "#ops-alerts"
    }
  }
}
```

**Example - One-Time Job:**

```json
{
  "type": "one-time",
  "runAt": "2024-12-31T23:59:00Z",
  "config": {
    "task": "cleanup",
    "targets": ["artifacts"],
    "maxAge": "30d"
  }
}
```

**Example - Delayed Job:**

```json
{
  "type": "delayed",
  "delayMs": 3600000,
  "config": {
    "task": "backup",
    "targets": ["cortex-patterns"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "jobKey": "cleanup:nightly-cleanup:::0 2 * * *",
  "type": "cleanup",
  "schedule": "0 2 * * *"
}
```

---

#### GET `/api/queues/scheduled/:key`

Get details of a specific scheduled job.

**Authentication:** Required
**Permission:** `admin.view`

**Parameters:**
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `key` | path | string | Yes | Job key or ID |

**Response:**

```json
{
  "success": true,
  "job": {
    "key": "cleanup:daily-cleanup:::0 2 * * *",
    "name": "cleanup",
    "id": "daily-cleanup",
    "pattern": "0 2 * * *",
    "tz": "UTC",
    "nextRun": "2024-01-16T02:00:00Z",
    "endDate": null
  }
}
```

---

#### DELETE `/api/queues/scheduled/:key`

Remove a scheduled job.

**Authentication:** Required
**Permission:** `admin.manage`

**Parameters:**
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `key` | path | string | Yes | Job key, or special keys |

**Special Keys:**
- `__all__` - Remove all scheduled jobs
- `task:<name>` - Remove all jobs for a specific task (e.g., `task:cleanup`)

**Response:**

```json
{
  "success": true,
  "message": "Scheduled job removed",
  "jobKey": "cleanup:daily-cleanup:::0 2 * * *"
}
```

**Remove All Response:**

```json
{
  "success": true,
  "message": "Removed all 5 scheduled jobs",
  "removed": 5
}
```

---

### Schedule Presets

#### GET `/api/queues/scheduled/defaults`

Get available schedule presets.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "presets": [
    {
      "name": "EVERY_MINUTE",
      "cron": "* * * * *",
      "description": "Every minute (for testing)"
    },
    {
      "name": "HOURLY",
      "cron": "0 * * * *",
      "description": "Every hour at minute 0"
    },
    {
      "name": "DAILY",
      "cron": "0 0 * * *",
      "description": "Daily at midnight"
    },
    {
      "name": "DAILY_2AM",
      "cron": "0 2 * * *",
      "description": "Daily at 2 AM (maintenance window)"
    },
    {
      "name": "WEEKLY",
      "cron": "0 0 * * 0",
      "description": "Weekly on Sunday at midnight"
    },
    {
      "name": "MONTHLY",
      "cron": "0 0 1 * *",
      "description": "Monthly on the 1st at midnight"
    }
  ]
}
```

---

#### POST `/api/queues/scheduled/defaults`

Set up all default scheduled jobs.

**Authentication:** Required
**Permission:** `admin.manage`

**Response:**

```json
{
  "success": true,
  "message": "Default schedules configured",
  "scheduledJobs": [
    {
      "key": "cleanup:daily-cleanup:::0 2 * * *",
      "name": "cleanup",
      "id": "daily-cleanup",
      "pattern": "0 2 * * *"
    },
    {
      "key": "backup:daily-backup:::0 3 * * *",
      "name": "backup",
      "id": "daily-backup",
      "pattern": "0 3 * * *"
    },
    {
      "key": "health-check:hourly-health-check:::0 * * * *",
      "name": "health-check",
      "id": "hourly-health-check",
      "pattern": "0 * * * *"
    },
    {
      "key": "sync:weekly-sync:::0 4 * * 0",
      "name": "sync",
      "id": "weekly-sync",
      "pattern": "0 4 * * 0"
    }
  ]
}
```

**Default Schedules Created:**
- Daily cleanup at 2 AM
- Daily backup at 3 AM
- Hourly health checks
- Weekly sync on Sunday at 4 AM

---

### Queue System Status

#### GET `/api/queues/status`

Get current status of the queue system.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `detailed` | boolean | false | Include detailed health report (requires `admin.view`) |

**Response (Basic):**

```json
{
  "success": true,
  "ready": true,
  "status": {
    "initialized": true,
    "redisConnected": true,
    "queues": {
      "pipeline-execution": { "waiting": 0, "active": 1, "completed": 50 },
      "stage-generation": { "waiting": 2, "active": 0, "completed": 100 },
      "llm-calls": { "waiting": 5, "active": 3, "completed": 1000 },
      "cortex-operations": { "waiting": 0, "active": 0, "completed": 200 },
      "notifications": { "waiting": 0, "active": 0, "completed": 150 },
      "scheduled": { "waiting": 0, "active": 0, "completed": 300 }
    },
    "workers": {
      "running": 6,
      "paused": 0
    }
  },
  "healthReport": null
}
```

**Response (Detailed):**

```json
{
  "success": true,
  "ready": true,
  "status": { ... },
  "healthReport": {
    "healthy": true,
    "redis": {
      "connected": true,
      "latency": 2,
      "memory": "5.2MB"
    },
    "queues": [
      {
        "name": "pipeline-execution",
        "healthy": true,
        "counts": { "waiting": 0, "active": 1, "completed": 50, "failed": 0 }
      }
    ],
    "workers": [
      {
        "name": "PipelineWorker",
        "running": true,
        "paused": false,
        "metrics": { "processed": 50, "failed": 0, "active": 1 }
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

#### POST `/api/queues/status`

Control queue system (shutdown).

**Authentication:** Required
**Permission:** `admin.manage`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | Control action: `shutdown` |
| `gracePeriod` | number | No | Grace period in ms (default: 30000) |
| `force` | boolean | No | Force shutdown without waiting (default: false) |

**Example - Graceful Shutdown:**

```json
{
  "action": "shutdown",
  "gracePeriod": 60000
}
```

**Example - Force Shutdown:**

```json
{
  "action": "shutdown",
  "force": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Queue system shutdown complete",
  "result": {
    "success": true,
    "workersShutdown": 6,
    "queuesShutdown": 6,
    "duration": 1234
  }
}
```

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `SERVICE_UNAVAILABLE` | 503 | Queue system unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Bull Board UI

For visual monitoring, access the Bull Board dashboard at:

```
/admin/queues
```

**Features:**
- View all queues and their job counts
- Inspect individual jobs
- Retry failed jobs
- Clean completed/failed jobs
- Real-time updates

**Permission Required:** `admin.view`
