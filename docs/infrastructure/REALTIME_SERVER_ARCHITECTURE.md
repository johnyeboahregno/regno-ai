# Realtime Server Architecture

## Overview

The Realtime Server is a dedicated service for handling Server-Sent Events (SSE) connections, providing real-time streaming of execution progress, stage generation events, and job status updates to clients.

## Why Use a Dedicated Realtime Server?

| Aspect          | Realtime Server                             | SvelteKit Direct               |
|-----------------|---------------------------------------------|--------------------------------|
| SSE Connections | Isolated - don't block API requests         | Compete with API for resources |
| Scaling         | Scale independently (multiple instances)    | Tied to main app               |
| Memory          | Dedicated memory for long-lived connections | Shared memory pressure         |
| Architecture    | Clean separation of concerns                | Simpler but coupled            |

## Architecture Diagram

```
┌─────────────┐    API requests    ┌─────────────┐    Queue jobs    ┌─────────────┐
│   Client    │ ─────────────────→ │  SvelteKit  │ ───────────────→ │  Execution  │
│  (Browser)  │                    │   Server    │                   │   Server    │
└──────┬──────┘                    └─────────────┘                   └──────┬──────┘
       │                                                                     │
       │  SSE events                                                         │ Publish
       ▼                                                                     ▼
┌─────────────┐                    ┌─────────────┐                   ┌─────────────┐
│  Realtime   │ ←─── Subscribe ─── │    Redis    │ ←──── Pub/Sub ───│   Events    │
│   Server    │                    │   Pub/Sub   │                   │             │
└─────────────┘                    └─────────────┘                   └─────────────┘
```

## Data Flow

1. **Client Request**: Browser sends API request to SvelteKit (e.g., start Stage generation)
2. **Job Queued**: SvelteKit queues job in BullMQ (Redis-backed)
3. **Worker Processes**: Execution Server worker picks up and processes job
4. **Events Published**: Worker publishes progress events to Redis Pub/Sub
5. **SSE Delivery**: Realtime Server subscribes to relevant channels and streams events to client

## Redis Pub/Sub Channels

| Channel Pattern | Purpose | Example |
|-----------------|---------|---------|
| `stage:{sessionId}` | Stage generation events | `stage:abc123` |
| `job:{jobId}` | Job status updates | `job:abc123` |
| `pipeline:{executionId}` | Pipeline execution events | `pipeline:xyz789` |
| `pipeline:events` | All pipeline events (monitoring) | - |
| `stage:events` | All stage events (monitoring) | - |

## Event Types

### Stage Events
- `generation_start` - Generation initiated
- `phase_start` - Phase began (understand, discover, design, etc.)
- `phase_complete` - Phase completed
- `reasoning` - AI reasoning step
- `warning` - Non-fatal warning
- `generation_complete` - Generation finished successfully
- `error` - Fatal error occurred
- `cancelled` - Generation was cancelled

### Job Status Events
- `queued` - Job added to queue
- `active` - Job processing started
- `completed` - Job finished successfully
- `failed` - Job failed with error

## Configuration

### Environment Variables

```bash
# Realtime Server
REALTIME_PORT=3002          # Port for realtime server
REDIS_URL=redis://localhost:6379

# Client (SvelteKit)
VITE_REALTIME_URL=http://localhost:3002  # Points client to realtime server
```

### When to Use Each Mode

**Use Realtime Server (`VITE_REALTIME_URL` set):**
- Production deployments
- High concurrency expected
- Need to scale SSE independently
- Multiple SvelteKit instances

**Use Direct Mode (`VITE_REALTIME_URL` unset):**
- Development/debugging
- Simple single-server deployments
- Lower resource overhead needed

## Running the Realtime Server

```bash
# Development
cd services/realtime
npm install
npm run dev

# Production
npm run build
npm run start
```

## SSE Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/stage/v2/sessions/{sessionId}/stream` | Stage generation progress |
| `/api/queues/jobs/{id}/events` | Job progress events |
| `/api/pipelines/{pipelineId}/executions/{executionId}/stream` | Pipeline execution events |
| `/api/events/subscribe` | Universal event subscription |
| `/api/admin/monitoring/stream` | Admin monitoring (all events) |
| `/api/charts/stream/{nodeId}` | Chart data streaming |
| `/health` | Health check endpoint |

## Scaling Considerations

### Horizontal Scaling

The Realtime Server can be horizontally scaled behind a load balancer:

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (sticky sess)  │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Realtime │  │ Realtime │  │ Realtime │
        │ Server 1 │  │ Server 2 │  │ Server 3 │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             └──────────┬──────────────┘
                        ▼
                  ┌──────────┐
                  │  Redis   │
                  │  Pub/Sub │
                  └──────────┘
```

**Important**: Use sticky sessions or client-side reconnection logic since SSE connections are stateful.

### Resource Estimates

| Metric | Estimate |
|--------|----------|
| Memory per connection | ~5-10 KB |
| 1000 connections | ~10 MB |
| CPU usage | Minimal (mostly I/O bound) |

## Troubleshooting

### No Events Reaching Client

1. **Check Realtime Server is running**: `curl http://localhost:3002/health`
2. **Verify Redis connectivity**: Health endpoint shows Redis status
3. **Check `VITE_REALTIME_URL`**: Must be set in client environment
4. **Verify channel names match**: Stage uses `stage:{sessionId}`, Job uses `job:{jobId}`

### Events Not Published

1. **Check worker is running**: Execution server logs show job processing
2. **Verify Redis pub/sub**: Use `redis-cli monitor` to see published messages
3. **Check for errors**: Worker logs show publish failures

### Connection Refused

1. **Realtime server not running**: Start with `npm run dev`
2. **Wrong port**: Verify `REALTIME_PORT` matches `VITE_REALTIME_URL`
3. **Firewall/proxy issues**: Check network accessibility

## Files

| File | Description |
|------|-------------|
| `services/realtime/src/index.ts` | Server entry point |
| `services/realtime/src/routes.ts` | SSE route handlers |
| `services/realtime/src/pubsub.ts` | Redis pub/sub subscriptions |
| `services/realtime/src/connection.ts` | Redis connection management |
| `services/realtime/src/auth.ts` | JWT authentication |

## Related Documentation

- [Stage V2 Architecture](../stage/STAGE_V2_ERROR_HANDLING_ARCHITECTURE.md)
- [BullMQ Queue System](./QUEUE_SYSTEM.md)
- [SSE Integration](./SSE_INTEGRATION_COMPLETE_SUMMARY.md)
