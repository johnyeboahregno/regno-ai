# Queue Workers Reference

## Overview

Workers are the processing engines that consume jobs from queues. Each worker extends the `BaseWorker` class and implements job-specific processing logic.

## BaseWorker

All workers extend `BaseWorker<TData, TResult>`:

```typescript
abstract class BaseWorker<TData, TResult> {
  constructor(config: WorkerConfig);

  // Lifecycle
  pause(force?: boolean): Promise<void>;
  resume(): void;
  close(): Promise<void>;

  // Status
  isRunning(): boolean;
  isPaused(): boolean;
  getMetrics(): WorkerMetrics;

  // Abstract - implement in subclass
  protected abstract processJob(job: Job<TData>): Promise<TResult>;
}
```

### WorkerConfig

```typescript
interface WorkerConfig {
  queueName: string;
  concurrency?: number;      // Default: 1
  limiter?: {
    max: number;             // Max jobs per duration
    duration: number;        // Duration in ms
  };
  stalledInterval?: number;  // Check for stalled jobs
  maxStalledCount?: number;  // Max stalled retries
}
```

### WorkerMetrics

```typescript
interface WorkerMetrics {
  processed: number;  // Total jobs processed
  failed: number;     // Total jobs failed
  active: number;     // Currently processing
}
```

---

## PipelineWorker

Executes pipeline graphs with node-by-node processing.

### Queue
`pipeline-execution`

### Concurrency
1 (sequential execution)

### Job Data

```typescript
interface PipelineExecutionJobData {
  pipelineId: string;
  executionId: string;
  userId: string;
  pipeline: {
    name: string;
    nodes: PipelineNode[];
    edges: PipelineEdge[];
  };
  initialData?: Record<string, any>;
  options?: {
    skipValidation?: boolean;
    timeout?: number;
  };
}
```

### Job Result

```typescript
interface PipelineExecutionJobResult {
  success: boolean;
  executionId: string;
  outputs?: Record<string, any>;
  duration: number;
  error?: string;
}
```

### Usage

```typescript
import { addPipelineJob } from '$lib/server/queues';

const job = await addPipelineJob({
  pipelineId: 'pipeline-123',
  executionId: 'exec-456',
  userId: 'user-789',
  pipeline: {
    name: 'My Pipeline',
    nodes: [...],
    edges: [...]
  }
});
```

---

## StageWorker

Handles Stage V2 project generation with AI reasoning.

### Queue
`stage-generation`

### Concurrency
2

### Job Data

```typescript
interface StageGenerationJobData {
  sessionId: string;
  userId: string;
  goal: string;
  context?: {
    dataSources?: string[];
    outputFormat?: string;
    constraints?: string[];
  };
  previousStepId?: string;
}
```

### Job Result

```typescript
interface StageGenerationJobResult {
  success: boolean;
  sessionId: string;
  generatedPipeline?: any;
  reasoning?: string;
  duration: number;
  error?: string;
}
```

### Usage

```typescript
import { addStageJob } from '$lib/server/queues';

const job = await addStageJob({
  sessionId: 'session-123',
  userId: 'user-456',
  goal: 'Analyze customer data and generate insights'
});
```

---

## LlmWorker

Makes LLM API calls with provider-specific rate limiting.

### Queue
`llm-calls`

### Concurrency
5

### Rate Limits

| Provider | Requests/min |
|----------|--------------|
| OpenAI | 60 |
| Anthropic | 40 |
| Google | 30 |
| Local | 100 |

### Job Data

```typescript
interface LlmCallJobData {
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    tools?: any[];
  };
  metadata?: {
    userId?: string;
    pipelineId?: string;
    nodeId?: string;
  };
}
```

### Job Result

```typescript
interface LlmCallJobResult {
  success: boolean;
  provider: string;
  model: string;
  response?: {
    content: string;
    toolCalls?: any[];
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
  error?: string;
}
```

### Usage

```typescript
import { queueLlmCall } from '$lib/server/services/queuedLlmService';

const result = await queueLlmCall({
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing.' }
  ],
  options: {
    temperature: 0.7,
    maxTokens: 1000
  }
});
```

---

## CortexWorker

Performs vector operations (embed, query, upsert, delete).

### Queue
`cortex-operations`

### Concurrency
3

### Operations

| Operation | Description |
|-----------|-------------|
| `embed` | Generate embeddings for text |
| `query` | Search vector database |
| `upsert` | Insert/update vectors |
| `delete` | Remove vectors |
| `sync` | Sync patterns to vector DBs |

### Job Data

```typescript
interface CortexOperationJobData {
  operation: 'embed' | 'query' | 'upsert' | 'delete' | 'sync';
  data: {
    // For embed
    text?: string;
    texts?: string[];

    // For query
    query?: string;
    limit?: number;
    filter?: Record<string, any>;

    // For upsert
    id?: string;
    vector?: number[];
    metadata?: Record<string, any>;

    // For delete
    ids?: string[];
  };
}
```

### Job Result

```typescript
interface CortexOperationJobResult {
  success: boolean;
  operation: string;
  result?: {
    embeddings?: number[][];
    matches?: Array<{ id: string; score: number; metadata: any }>;
    upserted?: number;
    deleted?: number;
  };
  duration: number;
  error?: string;
}
```

### Usage

```typescript
import { queueEmbed, queueQuery } from '$lib/server/services/queuedCortexService';

// Generate embeddings
const embedResult = await queueEmbed({
  text: 'Sample text to embed'
});

// Query similar documents
const queryResult = await queueQuery({
  query: 'Find related documents',
  limit: 10
});
```

---

## NotificationWorker

Sends emails, Slack messages, and webhooks.

### Queue
`notifications`

### Concurrency
10

### Notification Types

| Type | Transport | Requirements |
|------|-----------|--------------|
| `email` | SMTP/Nodemailer | SMTP_HOST, SMTP_USER, SMTP_FROM |
| `sms` | Twilio | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN |
| `slack` | Slack API/Webhook | SLACK_BOT_TOKEN or webhook URL |
| `webhook` | HTTP POST | Target URL |

### Job Data

```typescript
interface NotificationJobData {
  type: 'email' | 'sms' | 'slack' | 'webhook';
  recipient: {
    email?: string;
    phone?: string;
    slackChannel?: string;
    webhookUrl?: string;
    userId?: string;
  };
  content: {
    subject?: string;
    title?: string;
    message: string;
    data?: Record<string, any>;
  };
  template?: 'alert' | 'info' | 'success';
  priority?: number;
}
```

### Job Result

```typescript
interface NotificationJobResult {
  success: boolean;
  type: string;
  messageId?: string;
  error?: string;
}
```

### Email Templates

Built-in templates with customizable styling:

- **alert**: Red header, used for critical notifications
- **info**: Blue header, used for informational messages
- **success**: Green header, used for success confirmations

### Usage

```typescript
import {
  sendEmailNotification,
  sendSlackNotification,
  sendAlert
} from '$lib/server/services/queuedNotificationService';

// Send email
await sendEmailNotification({
  to: 'user@example.com',
  subject: 'Welcome',
  message: 'Welcome to the platform!',
  template: 'info'
});

// Send Slack message
await sendSlackNotification({
  channel: '#alerts',
  message: 'Pipeline completed successfully'
});

// Send multi-channel alert
await sendAlert({
  title: 'System Alert',
  message: 'CPU usage exceeded 90%',
  severity: 'critical',
  channels: {
    email: ['admin@example.com'],
    slack: '#ops-alerts',
    webhook: 'https://example.com/webhook'
  }
});
```

---

## ScheduledWorker

Runs maintenance tasks (cleanup, backup, health checks).

### Queue
`scheduled`

### Concurrency
2

### Task Types

| Task | Description | Default Schedule |
|------|-------------|------------------|
| `cleanup` | Remove expired data | Daily at 2 AM |
| `backup` | Backup Cortex patterns | Daily at 3 AM |
| `health-check` | Check service health | Hourly |
| `sync` | Sync to vector DBs | Weekly |
| `report` | Generate system reports | Weekly |

### Cleanup Targets

- `sessions`: Inactive user sessions
- `ip-blocks`: Expired IP blocks
- `stage-sessions`: Old Stage sessions
- `artifacts`: Expired artifacts
- `queues`: Completed/failed jobs
- `cortex-patterns`: Retired patterns

### Job Data

```typescript
interface ScheduledJobData {
  task: 'cleanup' | 'backup' | 'report' | 'sync' | 'health-check';
  scheduledAt: string;
  config?: {
    // Cleanup
    targets?: string[];
    maxAge?: string;

    // Backup
    verify?: boolean;

    // Health check
    services?: string[];
    alertOnFailure?: boolean;
    alertChannels?: {
      email?: string[];
      slack?: string;
      webhook?: string;
    };

    // Report
    reportType?: string;
    notifyChannels?: object;

    // Sync
    targets?: string[];
  };
}
```

### Job Result

```typescript
interface ScheduledJobResult {
  success: boolean;
  task: string;
  results?: Record<string, any>;
  duration: number;
  error?: string;
}
```

### Usage

```typescript
import {
  scheduleCleanup,
  scheduleBackup,
  scheduleHealthCheck,
  SCHEDULE_PRESETS
} from '$lib/server/services/queuedSchedulerService';

// Schedule daily cleanup
await scheduleCleanup({
  jobName: 'daily-cleanup',
  schedule: SCHEDULE_PRESETS.DAILY_2AM,
  targets: ['sessions', 'artifacts', 'queues'],
  maxAge: '7d'
});

// Schedule hourly health checks
await scheduleHealthCheck({
  jobName: 'hourly-health',
  schedule: SCHEDULE_PRESETS.HOURLY,
  services: ['redis', 'mongodb', 'queues'],
  alertOnFailure: true,
  alertChannels: {
    slack: '#ops-alerts'
  }
});

// Set up all default schedules
await setupDefaultSchedules();
```

---

## Worker Lifecycle

### Initialization

Workers are initialized during server startup:

```typescript
import { initializeWorkers } from '$lib/server/queues';

initializeWorkers();
// Starts all workers
```

### Pausing

```typescript
import { pauseAllWorkers, getLlmWorker } from '$lib/server/queues';

// Pause all workers
await pauseAllWorkers();

// Pause specific worker
await getLlmWorker().pause();
```

### Resuming

```typescript
import { resumeAllWorkers, getLlmWorker } from '$lib/server/queues';

// Resume all workers
resumeAllWorkers();

// Resume specific worker
getLlmWorker().resume();
```

### Shutdown

```typescript
import { closeAllWorkers } from '$lib/server/queues';

await closeAllWorkers();
// Gracefully closes all workers
```

---

## Error Handling

### Retry Logic

Workers automatically retry failed jobs:

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000  // 1s -> 2s -> 4s
  }
}
```

### Retryable Errors

- Network timeouts (ETIMEDOUT, ECONNRESET)
- Rate limit errors (429)
- Service unavailable (502, 503)

### Non-Retryable Errors

- Configuration errors
- Authentication failures
- Bad request (400)
- Not found (404)

### Custom Error Handling

```typescript
class MyWorker extends BaseWorker<MyData, MyResult> {
  protected async processJob(job: Job<MyData>): Promise<MyResult> {
    try {
      // Process job
    } catch (error) {
      if (this.isRetryableError(error)) {
        throw error; // Will be retried
      }
      return { success: false, error: error.message };
    }
  }

  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : '';
    return message.includes('timeout') || message.includes('rate limit');
  }
}
```

---

## Monitoring

### Worker Status

```typescript
import { getWorkersStatus } from '$lib/server/queues';

const status = getWorkersStatus();
// {
//   initialized: true,
//   workers: [
//     { name: 'LlmWorker', running: true, paused: false, metrics: {...} },
//     { name: 'PipelineWorker', running: true, paused: false, metrics: {...} },
//     ...
//   ],
//   totalProcessed: 1234,
//   totalFailed: 12
// }
```

### Worker Metrics

```typescript
import { getLlmWorker } from '$lib/server/queues';

const metrics = getLlmWorker().getMetrics();
// {
//   processed: 500,
//   failed: 5,
//   active: 2
// }
```

### Bull Board

Access `/admin/queues` for visual monitoring of all queues and workers.
