# Queue Service APIs Reference

## Overview

The queue system provides high-level service APIs that abstract away BullMQ complexity. These services offer easy-to-use functions for common operations with automatic fallback to direct execution when Redis is unavailable.

---

## queuedLlmService

Queue-based wrapper for LLM API calls with rate limiting and load balancing.

### Import

```typescript
import {
  queueLlmCall,
  callLLMQueued,
  callLLMSmart,
  callLLMBatch,
  getLlmJobStatus,
  cancelLlmJob,
  isQueueModeAvailable
} from '$lib/server/services/queuedLlmService';
```

### Functions

#### `isQueueModeAvailable()`

Check if queue mode is available (Redis connected).

```typescript
const available = await isQueueModeAvailable();
if (available) {
  // Use queue-based calls
}
```

#### `queueLlmCall(params)`

Queue an LLM call for background processing (non-blocking). Returns immediately with job ID.

```typescript
const { jobId, callId } = await queueLlmCall({
  provider: 'openai',
  model: 'gpt-4',
  credentialId: 'cred-123',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  options: {
    temperature: 0.7,
    maxTokens: 1000
  },
  metadata: {
    userId: 'user-456',
    pipelineId: 'pipeline-789'
  },
  priority: 'high'
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `'openai' \| 'anthropic' \| 'google-ai' \| 'azure-openai' \| 'openrouter' \| 'ollama'` | Yes | LLM provider |
| `model` | `string` | Yes | Model identifier |
| `credentialId` | `string` | Yes | Credential ID for authentication |
| `messages` | `Array<{role, content}>` | Yes | Messages to send |
| `options` | `object` | No | Generation options (temperature, maxTokens, etc.) |
| `metadata` | `object` | No | Tracking metadata |
| `priority` | `'critical' \| 'high' \| 'normal' \| 'low'` | No | Priority level |

#### `callLLMQueued(params)`

Make an LLM call through the queue and wait for result (blocking).

```typescript
const result = await callLLMQueued({
  provider: 'openai',
  model: 'gpt-4',
  credentialId: 'cred-123',
  messages: [{ role: 'user', content: 'Hello!' }],
  timeout: 60000 // 60 seconds
});

if (result.success) {
  console.log('Response:', result.content);
  console.log('Tokens used:', result.usage?.totalTokens);
}
```

**Returns:**

```typescript
{
  success: boolean;
  jobId: string;
  callId: string;
  content?: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timing?: {
    queuedAt: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

#### `callLLMSmart(params)`

Smart LLM call that automatically uses queue if available, otherwise direct call.

```typescript
const response = await callLLMSmart({
  provider: 'openai',
  model: 'gpt-4',
  credentialId: 'cred-123',
  messages: [{ role: 'user', content: 'Hello!' }],
  forceDirect: false // Set true to bypass queue
});
```

#### `callLLMBatch(calls, options)`

Queue multiple LLM calls and wait for all results.

```typescript
const results = await callLLMBatch([
  { provider: 'openai', model: 'gpt-4', credentialId: 'cred-1', messages: [...] },
  { provider: 'openai', model: 'gpt-4', credentialId: 'cred-1', messages: [...] },
  { provider: 'anthropic', model: 'claude-3-opus', credentialId: 'cred-2', messages: [...] }
], {
  concurrency: 5,
  timeout: 300000,
  continueOnError: true
});
```

#### `getLlmJobStatus(jobId)`

Get the status of a queued LLM call.

```typescript
const status = await getLlmJobStatus('job-123');
if (status?.state === 'completed') {
  console.log('Result:', status.result);
}
```

#### `cancelLlmJob(jobId)`

Cancel a queued LLM call.

```typescript
const cancelled = await cancelLlmJob('job-123');
```

---

## queuedNotificationService

Easy-to-use API for sending notifications through the queue system.

### Import

```typescript
import {
  sendEmailNotification,
  sendSmsNotification,
  sendSlackNotification,
  sendWebhookNotification,
  sendBatchNotifications,
  sendAlert,
  getNotificationJobStatus,
  cancelNotification,
  isNotificationQueueAvailable
} from '$lib/server/services/queuedNotificationService';
```

### Functions

#### `sendEmailNotification(params)`

Send an email notification through the queue.

```typescript
const result = await sendEmailNotification({
  to: 'user@example.com',
  subject: 'Welcome!',
  title: 'Welcome to Regno AI',
  message: 'Thank you for signing up!',
  template: 'info',
  priority: 'normal'
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | `string` | Yes | Recipient email |
| `subject` | `string` | No | Email subject |
| `title` | `string` | No | Title for template |
| `message` | `string` | Yes | Message body |
| `template` | `'alert' \| 'info' \| 'success'` | No | Email template |
| `priority` | `'critical' \| 'high' \| 'normal' \| 'low'` | No | Priority |

#### `sendSmsNotification(params)`

Send an SMS notification (requires Twilio configuration).

```typescript
const result = await sendSmsNotification({
  phone: '+1234567890',
  message: 'Your verification code is 123456',
  priority: 'high'
});
```

#### `sendSlackNotification(params)`

Send a Slack notification via channel or webhook.

```typescript
// Via Slack channel
const result = await sendSlackNotification({
  channel: '#alerts',
  title: 'Pipeline Complete',
  message: 'Your data pipeline has finished processing.',
  priority: 'normal'
});

// Via webhook URL
const result = await sendSlackNotification({
  webhookUrl: 'https://hooks.slack.com/services/xxx',
  message: 'Alert: System event occurred'
});
```

#### `sendWebhookNotification(params)`

Send an HTTP POST webhook notification.

```typescript
const result = await sendWebhookNotification({
  url: 'https://example.com/webhook',
  title: 'Event Notification',
  message: 'An event occurred',
  data: {
    eventType: 'pipeline.completed',
    pipelineId: 'pipeline-123',
    timestamp: new Date().toISOString()
  }
});
```

#### `sendBatchNotifications(notifications, options)`

Send multiple notifications in batch.

```typescript
const results = await sendBatchNotifications([
  { type: 'email', to: 'admin@example.com', message: 'Alert!' },
  { type: 'slack', channel: '#alerts', message: 'Alert!' },
  { type: 'webhook', url: 'https://example.com/hook', message: 'Alert!' }
], {
  priority: 'high',
  continueOnError: true
});
```

#### `sendAlert(params)`

Send an alert to multiple channels simultaneously.

```typescript
const results = await sendAlert({
  title: 'System Alert',
  message: 'CPU usage exceeded 90%',
  severity: 'critical', // 'critical' | 'warning' | 'info'
  channels: {
    email: ['admin@example.com', 'ops@example.com'],
    slack: '#ops-alerts',
    webhook: 'https://example.com/alert-webhook'
  },
  data: {
    metric: 'cpu',
    value: 92,
    threshold: 90
  }
});
```

#### Sync Variants

All notification functions have sync variants that wait for delivery:

```typescript
// Wait for email delivery confirmation
const result = await sendEmailNotificationSync(params, 30000);

// Wait for Slack delivery
const result = await sendSlackNotificationSync(params, 30000);

// Wait for webhook response
const result = await sendWebhookNotificationSync(params, 30000);
```

---

## queuedCortexService

Queue-based wrapper for Cortex vector operations.

### Import

```typescript
import {
  queueEmbedding,
  queueUpsert,
  queueDelete,
  queueSync,
  queryCortexQueued,
  embedCortexQueued,
  queryCortexSmart,
  embedCortexSmart,
  upsertCortexSmart,
  getCortexJobStatus,
  cancelCortexJob,
  isCortexQueueAvailable
} from '$lib/server/services/queuedCortexService';
```

### Fire-and-Forget Operations

#### `queueEmbedding(params)`

Queue an embedding operation (non-blocking).

```typescript
const { jobId, documentCount } = await queueEmbedding({
  documents: [
    { id: 'doc-1', content: 'First document content', metadata: { type: 'article' } },
    { id: 'doc-2', content: 'Second document content', metadata: { type: 'article' } }
  ],
  batchSize: 10,
  priority: 'normal'
});
```

#### `queueUpsert(params)`

Queue an upsert operation (non-blocking).

```typescript
const { jobId, documentCount } = await queueUpsert({
  documents: [
    { id: 'doc-1', content: 'Updated content', metadata: { version: 2 } }
  ],
  namespace: 'patterns'
});
```

#### `queueDelete(params)`

Queue a delete operation (non-blocking).

```typescript
const { jobId, idCount } = await queueDelete({
  ids: ['doc-1', 'doc-2', 'doc-3']
});
```

#### `queueSync(params)`

Queue a sync operation (non-blocking).

```typescript
const { jobId } = await queueSync({
  collection: 'patterns'
});
```

### Blocking Operations

#### `queryCortexQueued(params)`

Queue a query operation and wait for results.

```typescript
const result = await queryCortexQueued({
  query: 'How to implement authentication?',
  limit: 10,
  filter: {
    domain: 'security',
    minimumConfidence: 0.7
  },
  timeout: 30000
});

if (result.success) {
  console.log('Found:', result.count, 'matches');
  console.log('Results:', result.results);
}
```

#### `embedCortexQueued(params)`

Queue embedding and wait for results.

```typescript
const result = await embedCortexQueued({
  documents: [{ id: 'doc-1', content: 'Text to embed' }],
  timeout: 60000
});
```

### Smart Operations (Auto-Fallback)

#### `queryCortexSmart(params)`

Smart query that uses queue if available, otherwise direct.

```typescript
const result = await queryCortexSmart({
  query: 'Find authentication patterns',
  limit: 10,
  forceDirect: false
});

console.log('Mode used:', result.mode); // 'queue' or 'direct'
```

#### `embedCortexSmart(params)`

Smart embedding with automatic fallback.

```typescript
const result = await embedCortexSmart({
  documents: [{ id: 'doc-1', content: 'Text to embed' }],
  forceDirect: false,
  timeout: 60000
});
```

#### `upsertCortexSmart(params)`

Smart upsert with automatic fallback.

```typescript
const result = await upsertCortexSmart({
  documents: [
    { id: 'doc-1', content: 'Document content', metadata: { type: 'pattern' } }
  ],
  forceDirect: false
});
```

---

## queuedSchedulerService

API for creating and managing scheduled/recurring jobs.

### Import

```typescript
import {
  scheduleCleanup,
  scheduleBackup,
  scheduleReport,
  scheduleSync,
  scheduleHealthCheck,
  scheduleOneTimeJob,
  scheduleDelayedJob,
  getScheduledJobs,
  getScheduledJobsByTask,
  removeScheduledJob,
  removeScheduledJobsByTask,
  removeAllScheduledJobs,
  setupDefaultSchedules,
  getScheduledJobStatus,
  SCHEDULE_PRESETS,
  isSchedulerAvailable
} from '$lib/server/services/queuedSchedulerService';
```

### Schedule Presets

```typescript
SCHEDULE_PRESETS = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  HOURLY: '0 * * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  EVERY_12_HOURS: '0 */12 * * *',
  DAILY: '0 0 * * *',
  DAILY_2AM: '0 2 * * *',
  DAILY_6AM: '0 6 * * *',
  WEEKLY: '0 0 * * 0',
  MONTHLY: '0 0 1 * *'
}
```

### Recurring Job Functions

#### `scheduleCleanup(params)`

Schedule recurring cleanup jobs.

```typescript
await scheduleCleanup({
  jobName: 'daily-cleanup',
  schedule: SCHEDULE_PRESETS.DAILY_2AM,
  targets: ['sessions', 'ip-blocks', 'artifacts', 'queues', 'cortex-patterns'],
  maxAge: '7d'
});
```

**Cleanup Targets:**
- `sessions` - Inactive user sessions
- `ip-blocks` - Expired IP blocks
- `stage-sessions` - Old Stage sessions
- `artifacts` - Expired artifacts
- `queues` - Completed/failed jobs
- `cortex-patterns` - Retired patterns

#### `scheduleBackup(params)`

Schedule recurring backup jobs.

```typescript
await scheduleBackup({
  jobName: 'nightly-backup',
  schedule: '0 3 * * *', // 3 AM daily
  targets: ['cortex-patterns', 'pipelines'],
  verify: true
});
```

#### `scheduleHealthCheck(params)`

Schedule recurring health checks.

```typescript
await scheduleHealthCheck({
  jobName: 'hourly-health',
  schedule: SCHEDULE_PRESETS.HOURLY,
  services: ['redis', 'mongodb', 'qdrant', 'neo4j', 'queues'],
  alertOnFailure: true,
  alertChannels: {
    email: ['admin@example.com'],
    slack: '#ops-alerts'
  }
});
```

#### `scheduleSync(params)`

Schedule recurring sync jobs.

```typescript
await scheduleSync({
  jobName: 'weekly-sync',
  schedule: SCHEDULE_PRESETS.WEEKLY,
  targets: ['cortex-qdrant', 'cortex-neo4j']
});
```

#### `scheduleReport(params)`

Schedule recurring report generation.

```typescript
await scheduleReport({
  jobName: 'weekly-report',
  schedule: SCHEDULE_PRESETS.WEEKLY,
  reportType: 'system-stats',
  notifyChannels: {
    email: ['admin@example.com']
  }
});
```

### One-Time Jobs

#### `scheduleOneTimeJob(task, runAt, config)`

Schedule a job to run at a specific time.

```typescript
await scheduleOneTimeJob(
  'cleanup',
  new Date('2024-12-31T23:59:00'),
  { targets: ['artifacts'], maxAge: '30d' }
);
```

#### `scheduleDelayedJob(task, delayMs, config)`

Schedule a job to run after a delay.

```typescript
// Run cleanup in 1 hour
await scheduleDelayedJob('cleanup', 3600000, {
  targets: ['sessions']
});
```

### Job Management

#### `getScheduledJobs()`

Get all scheduled/repeatable jobs.

```typescript
const jobs = await getScheduledJobs();
// [
//   { key: '...', name: 'cleanup', pattern: '0 2 * * *', next: 1234567890 },
//   { key: '...', name: 'health-check', pattern: '0 * * * *', next: 1234567890 }
// ]
```

#### `removeScheduledJob(jobKey)`

Remove a scheduled job by its key.

```typescript
await removeScheduledJob('cleanup:daily-cleanup:::0 2 * * *');
```

#### `setupDefaultSchedules()`

Set up all default scheduled jobs for the system.

```typescript
await setupDefaultSchedules();
// Sets up:
// - Daily cleanup at 2 AM
// - Daily backup at 3 AM
// - Hourly health checks
// - Weekly sync on Sunday at 4 AM
```

---

## Common Patterns

### Error Handling

All services return consistent error structures:

```typescript
const result = await sendEmailNotification({ ... });

if (!result.success) {
  console.error('Failed:', result.error);
  // Handle error appropriately
}
```

### Priority Levels

All services support priority levels:

| Priority | Value | Use Case |
|----------|-------|----------|
| `critical` | 1 | Admin tasks, system alerts |
| `high` | 2 | Interactive user requests |
| `normal` | 3 | Standard operations (default) |
| `low` | 4 | Background tasks |

### Graceful Degradation

Smart functions automatically fall back to direct execution:

```typescript
// Uses queue if Redis available, otherwise direct call
const result = await callLLMSmart({ ... });
const cortexResult = await queryCortexSmart({ ... });
```

### Job Tracking

All async operations return job IDs for tracking:

```typescript
const { jobId } = await queueLlmCall({ ... });

// Later, check status
const status = await getLlmJobStatus(jobId);
console.log('State:', status?.state);
console.log('Progress:', status?.progress);

// Or cancel if needed
await cancelLlmJob(jobId);
```
