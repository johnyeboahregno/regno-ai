# Queue System Quick Start Guide

Get started with the Regno AI queue system in minutes.

## Prerequisites

- Redis server running (default: `localhost:6379`)
- Node.js 22.x

## Environment Setup

Add to your `.env` file:

```bash
# Required
REDIS_URL=redis://localhost:6379

# Optional - Worker control
ENABLE_WORKERS=true  # Set to 'false' to disable workers

# Optional - Rate limits (requests per minute)
OPENAI_RATE_LIMIT=60
ANTHROPIC_RATE_LIMIT=40
```

## Quick Examples

### 1. Send a Notification

```typescript
import { sendEmailNotification, sendSlackNotification } from '$lib/server/services/queuedNotificationService';

// Send email
await sendEmailNotification({
  to: 'user@example.com',
  subject: 'Welcome!',
  message: 'Thanks for signing up!'
});

// Send Slack message
await sendSlackNotification({
  channel: '#alerts',
  message: 'System event occurred'
});
```

### 2. Make Queued LLM Calls

```typescript
import { callLLMQueued, callLLMSmart } from '$lib/server/services/queuedLlmService';

// Wait for result (blocking)
const result = await callLLMQueued({
  provider: 'openai',
  model: 'gpt-4',
  credentialId: 'my-cred',
  messages: [{ role: 'user', content: 'Hello!' }]
});

if (result.success) {
  console.log('Response:', result.content);
}

// Smart mode - auto-fallback if Redis unavailable
const response = await callLLMSmart({
  provider: 'openai',
  model: 'gpt-4',
  credentialId: 'my-cred',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### 3. Schedule Recurring Jobs

```typescript
import {
  scheduleCleanup,
  scheduleHealthCheck,
  SCHEDULE_PRESETS
} from '$lib/server/services/queuedSchedulerService';

// Daily cleanup at 2 AM
await scheduleCleanup({
  schedule: SCHEDULE_PRESETS.DAILY_2AM,
  targets: ['sessions', 'artifacts'],
  maxAge: '7d'
});

// Hourly health checks
await scheduleHealthCheck({
  schedule: SCHEDULE_PRESETS.HOURLY,
  services: ['redis', 'mongodb'],
  alertOnFailure: true
});
```

### 4. Track Job Progress

```typescript
import { queueLlmCall, getLlmJobStatus } from '$lib/server/services/queuedLlmService';

// Queue a job
const { jobId } = await queueLlmCall({ ... });

// Check status later
const status = await getLlmJobStatus(jobId);
console.log('State:', status?.state);
console.log('Progress:', status?.progress);
```

### 5. Real-Time Updates (SSE)

```javascript
// Client-side JavaScript
const eventSource = new EventSource(`/api/queues/jobs/${jobId}/events`);

eventSource.addEventListener('job_status', (e) => {
  const status = JSON.parse(e.data);
  updateProgressBar(status.progress);
});

eventSource.addEventListener('done', () => {
  eventSource.close();
  showComplete();
});
```

## Common Operations

### Check Queue System Status

```typescript
import { getQueueSystemStatus, isQueueSystemReady } from '$lib/server/queues';

if (isQueueSystemReady()) {
  const status = await getQueueSystemStatus();
  console.log('Queues:', status.queues);
}
```

### Set Up All Default Schedules

```typescript
import { setupDefaultSchedules } from '$lib/server/services/queuedSchedulerService';

await setupDefaultSchedules();
// Creates: daily cleanup, backup, hourly health checks, weekly sync
```

### Send Multi-Channel Alert

```typescript
import { sendAlert } from '$lib/server/services/queuedNotificationService';

await sendAlert({
  title: 'System Alert',
  message: 'CPU usage high',
  severity: 'critical',
  channels: {
    email: ['admin@example.com'],
    slack: '#ops-alerts',
    webhook: 'https://example.com/hook'
  }
});
```

## Monitoring

### Bull Board UI

Access visual monitoring at `/admin/queues` (requires admin permission).

### API Status

```bash
# Basic status
curl -H "Authorization: Bearer $TOKEN" /api/queues/status

# Detailed health report
curl -H "Authorization: Bearer $TOKEN" "/api/queues/status?detailed=true"
```

### View Scheduled Jobs

```bash
curl -H "Authorization: Bearer $TOKEN" /api/queues/scheduled
```

## Priority Levels

Use priority to control job order:

```typescript
await sendEmailNotification({
  to: 'user@example.com',
  message: 'Urgent!',
  priority: 'critical'  // critical > high > normal > low
});
```

| Priority | Value | Use Case |
|----------|-------|----------|
| `critical` | 1 | System alerts, admin tasks |
| `high` | 2 | Interactive user requests |
| `normal` | 3 | Standard operations |
| `low` | 4 | Background tasks |

## Schedule Presets

Common schedules available:

| Preset | Cron | Description |
|--------|------|-------------|
| `EVERY_MINUTE` | `* * * * *` | Testing |
| `HOURLY` | `0 * * * *` | Every hour |
| `DAILY` | `0 0 * * *` | Midnight |
| `DAILY_2AM` | `0 2 * * *` | Maintenance window |
| `WEEKLY` | `0 0 * * 0` | Sunday midnight |

## Testing

```bash
# Run all queue tests
npm run test:queues

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Redis Not Connected

```
Error: Queue system unavailable (Redis not connected)
```

**Solution:** Ensure Redis is running and `REDIS_URL` is correct.

### Job Stuck in Waiting

Jobs may be waiting if workers are paused or not started.

```typescript
import { resumeAllWorkers, getWorkersStatus } from '$lib/server/queues';

const status = getWorkersStatus();
if (status.workers.some(w => w.paused)) {
  resumeAllWorkers();
}
```

### Permission Denied

```
Error: Insufficient permissions
```

**Solution:** Ensure user has required permissions (`admin.view`, `admin.manage`, `pipeline.execute`).

## Related Documentation

- [Architecture](./QUEUE_SYSTEM_ARCHITECTURE.md) - Full system overview
- [Workers](./QUEUE_WORKERS_REFERENCE.md) - Worker implementation details
- [Service APIs](./QUEUE_SERVICE_APIS.md) - Complete API reference
- [Endpoints](./QUEUE_API_ENDPOINTS.md) - REST API documentation
