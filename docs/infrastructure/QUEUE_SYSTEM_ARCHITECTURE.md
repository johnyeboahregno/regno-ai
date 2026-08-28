# Queue System Architecture

## Overview

The Regno AI platform uses a **Hybrid Gateway + Workers Architecture** built on BullMQ and Redis for reliable background job processing. This system handles LLM calls, pipeline execution, notifications, and scheduled tasks with automatic retries, rate limiting, and real-time progress tracking.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SvelteKit Server                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   API Routes │  │   Services   │  │    SSE/WS    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                          │
│         ▼                 ▼                 ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Queue Services Layer                         │   │
│  │  queuedLlmService | queuedNotificationService | queuedScheduler │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                        │
└───────────────────────────────┼────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Redis Server                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Pipeline  │  │   Stage    │  │    LLM     │  │   Cortex   │       │
│  │   Queue    │  │   Queue    │  │   Queue    │  │   Queue    │       │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐       │
│  │Notification│  │ Scheduled  │  │       Pub/Sub Channels     │       │
│  │   Queue    │  │   Queue    │  └────────────────────────────┘       │
│  └────────────┘  └────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BullMQ Workers                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Pipeline  │  │   Stage    │  │    LLM     │  │   Cortex   │       │
│  │   Worker   │  │   Worker   │  │   Worker   │  │   Worker   │       │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │
│  ┌────────────┐  ┌────────────┐                                       │
│  │Notification│  │ Scheduled  │                                       │
│  │   Worker   │  │   Worker   │                                       │
│  └────────────┘  └────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Queues

| Queue | Purpose | Priority | Rate Limit |
|-------|---------|----------|------------|
| `pipeline-execution` | Execute data pipelines | Normal | 10/min |
| `stage-generation` | Generate Stage V2 projects | High | 5/min |
| `llm-calls` | LLM API calls (OpenAI, Anthropic) | Normal | Provider-specific |
| `cortex-operations` | Embeddings, vector queries | Low | 20/min |
| `notifications` | Email, Slack, webhooks | Normal | 30/min |
| `scheduled` | Cleanup, backup, health checks | Low | 5/min |

### 2. Workers

Each queue has a dedicated worker that processes jobs:

- **PipelineWorker**: Executes pipeline graphs with node-by-node processing
- **StageWorker**: Handles Stage V2 project generation with AI reasoning
- **LlmWorker**: Makes LLM API calls with provider-specific rate limiting
- **CortexWorker**: Performs vector operations (embed, query, upsert, delete)
- **NotificationWorker**: Sends emails, Slack messages, webhooks
- **ScheduledWorker**: Runs maintenance tasks (cleanup, backup, health checks)

### 3. Services

High-level APIs for job submission:

- **queuedLlmService**: `queueLlmCall()`, `queueLlmCallSync()`
- **queuedCortexService**: `queueEmbed()`, `queueQuery()`, `queueUpsert()`
- **queuedNotificationService**: `sendEmailNotification()`, `sendSlackNotification()`
- **queuedSchedulerService**: `scheduleCleanup()`, `scheduleBackup()`, `scheduleHealthCheck()`

## Configuration

### Environment Variables

```bash
# Redis Connection
REDIS_URL=redis://localhost:6379

# Enable/Disable Workers
ENABLE_WORKERS=true  # Set to 'false' to disable queue workers

# LLM Rate Limits (requests per minute)
OPENAI_RATE_LIMIT=60
ANTHROPIC_RATE_LIMIT=40
```

### Queue Options

```typescript
// Default job options
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86400, count: 500 }
};
```

## Usage

### Initialization

The queue system initializes automatically during server startup:

```typescript
// In hooks.server.ts
const result = await initializeQueueSystem({
  startWorkers: true,
  setupSchedules: true,
  initializeBullBoard: true
});

registerShutdownHandlers();
```

### Adding Jobs

```typescript
// LLM Call
import { queueLlmCall } from '$lib/server/services/queuedLlmService';

const result = await queueLlmCall({
  provider: 'openai',
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Notification
import { sendEmailNotification } from '$lib/server/services/queuedNotificationService';

await sendEmailNotification({
  to: 'user@example.com',
  subject: 'Alert',
  message: 'Something happened!',
  priority: 'high'
});

// Scheduled Job
import { scheduleCleanup } from '$lib/server/services/queuedSchedulerService';

await scheduleCleanup({
  schedule: '0 2 * * *', // Daily at 2 AM
  targets: ['sessions', 'artifacts'],
  maxAge: '7d'
});
```

### Monitoring Progress

```typescript
import { subscribeToJob } from '$lib/server/queues';

const unsubscribe = await subscribeToJob(jobId, (status) => {
  console.log(`Job ${jobId}: ${status.state} (${status.progress}%)`);

  if (status.state === 'completed') {
    console.log('Result:', status.result);
  }
});
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/queues/jobs/[id]` | GET | Get job status |
| `/api/queues/jobs/[id]` | DELETE | Cancel job |
| `/api/queues/scheduled` | GET | List scheduled jobs |
| `/api/queues/scheduled` | POST | Create scheduled job |
| `/api/queues/scheduled/[key]` | DELETE | Remove scheduled job |
| `/api/queues/scheduled/defaults` | POST | Set up default schedules |
| `/api/queues/status` | GET | Get queue system status |
| `/admin/queues` | GET | Bull Board monitoring UI |

## Monitoring

### Bull Board UI

Access the Bull Board monitoring dashboard at `/admin/queues` to:
- View all queues and their job counts
- Inspect individual jobs
- Retry failed jobs
- Clean completed/failed jobs

### Status API

```bash
# Get queue system status
curl /api/queues/status

# Get detailed health report
curl /api/queues/status?detailed=true
```

### Health Check

```typescript
import { getQueueHealthReport } from '$lib/server/queues';

const health = await getQueueHealthReport();
console.log(health);
// {
//   healthy: true,
//   redis: { connected: true, latency: 1 },
//   queues: [...],
//   workers: [...]
// }
```

## Error Handling

### Automatic Retries

Jobs automatically retry on failure with exponential backoff:

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000  // 1s, 2s, 4s
  }
}
```

### Retryable vs Non-Retryable Errors

Workers distinguish between:
- **Retryable**: Network timeouts, rate limits, service unavailable (5xx)
- **Non-Retryable**: Invalid configuration, authentication failures, bad requests (4xx)

### Failed Job Recovery

```typescript
import { retryFailedJobs, getFailedJobs } from '$lib/server/queues';

// Get failed jobs
const failed = await getFailedJobs('pipeline-execution', 0, 10);

// Retry all failed jobs
await retryFailedJobs('pipeline-execution');
```

## Graceful Shutdown

The system handles graceful shutdown automatically:

```typescript
// Registered automatically during initialization
process.on('SIGTERM', async () => {
  await shutdownQueueSystem({ gracePeriod: 30000 });
});
```

Shutdown sequence:
1. Stop accepting new jobs
2. Wait for active jobs to complete (grace period)
3. Close workers
4. Close queues
5. Close Redis connections

## Testing

```bash
# Run all queue tests
npm run test:queues

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Test utilities available:
- `createMockJob()` - Mock BullMQ jobs
- `createMockQueue()` - Mock queues
- `createMockWorker()` - Mock workers
- Mock Redis with in-memory storage

## File Structure

```
src/lib/server/queues/
├── index.ts              # Main exports
├── types.ts              # Type definitions
├── connection.ts         # Redis connection management
├── definitions.ts        # Queue definitions
├── health.ts             # Health monitoring
├── pubsub.ts             # Pub/Sub utilities
├── bullBoard.ts          # Bull Board integration
├── queueLifecycle.ts     # Initialization/shutdown
└── workers/
    ├── index.ts          # Worker exports
    ├── BaseWorker.ts     # Base worker class
    ├── PipelineWorker.ts
    ├── StageWorker.ts
    ├── LlmWorker.ts
    ├── CortexWorker.ts
    ├── NotificationWorker.ts
    └── ScheduledWorker.ts

src/lib/server/services/
├── queuedLlmService.ts
├── queuedCortexService.ts
├── queuedNotificationService.ts
└── queuedSchedulerService.ts

src/routes/api/queues/
├── jobs/[id]/+server.ts
├── scheduled/+server.ts
├── scheduled/[key]/+server.ts
├── scheduled/defaults/+server.ts
└── status/+server.ts
```

## Schedule Presets

Common cron schedules available:

| Preset | Cron | Description |
|--------|------|-------------|
| `EVERY_MINUTE` | `* * * * *` | Every minute |
| `EVERY_5_MINUTES` | `*/5 * * * *` | Every 5 minutes |
| `HOURLY` | `0 * * * *` | Every hour |
| `DAILY` | `0 0 * * *` | Daily at midnight |
| `DAILY_2AM` | `0 2 * * *` | Daily at 2 AM |
| `WEEKLY` | `0 0 * * 0` | Weekly on Sunday |
| `MONTHLY` | `0 0 1 * *` | Monthly on 1st |

## Priority Levels

| Priority | Value | Use Case |
|----------|-------|----------|
| CRITICAL | 1 | Admin tasks, system alerts |
| HIGH | 2 | Interactive user requests |
| NORMAL | 3 | Standard operations |
| LOW | 4 | Background tasks |

## Related Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Bull Board](https://github.com/felixmosh/bull-board)
