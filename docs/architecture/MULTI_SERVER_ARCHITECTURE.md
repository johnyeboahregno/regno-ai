# Regno AI Multi-Server Architecture

## Overview

Regno AI uses a **multi-server architecture** to separate concerns and enable horizontal scaling. This document describes the three core servers and how they interact.

## Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │             CADDY/NGINX                 │
                    │           (Reverse Proxy)               │
                    │              Port 80/443                │
                    └────────┬──────────┬──────────┬──────────┘
                             │          │          │
         ┌───────────────────┼──────────┼──────────┼───────────────────┐
         │                   │          │          │                   │
         │    /api/*         │ /stream  │ /health  │    /*             │
         │    (most)         │ /events  │ (exec)   │    (static)       │
         │                   │          │          │                   │
         ▼                   ▼          │          ▼                   │
┌─────────────────┐  ┌─────────────────┐│  ┌─────────────────┐        │
│   SvelteKit     │  │    Realtime     ││  │   Execution     │        │
│    Server       │  │     Server      ││  │    Server       │        │
│   Port 5173     │  │   Port 3002     ││  │   Port 3003     │        │
│                 │  │                 ││  │                 │        │
│ - Web UI        │  │ - SSE Streams   ││  │ - BullMQ Workers│        │
│ - REST API      │  │ - Event Pub/Sub ││  │ - Job Processing│        │
│ - Auth/Sessions │  │ - WebSocket     ││  │ - Health Check  │        │
│ - NO WORKERS    │  │ - Heartbeats    ││  │                 │        │
└────────┬────────┘  └────────┬────────┘│  └────────┬────────┘        │
         │                    │         │           │                  │
         └────────────────────┼─────────┼───────────┘                  │
                              │         │                              │
                              ▼         ▼                              │
                    ┌─────────────────────────────┐                    │
                    │           REDIS             │                    │
                    │     (Pub/Sub + BullMQ)      │                    │
                    │         Port 6379           │                    │
                    └─────────────────────────────┘                    │
                              │                                        │
                              ▼                                        │
                    ┌─────────────────────────────┐                    │
                    │          MONGODB            │                    │
                    │         Port 27017          │                    │
                    └─────────────────────────────┘                    │
```

## Server Responsibilities

### 1. SvelteKit Server (Port 5173)

**Purpose**: Main web application serving UI and REST API

**Start Command**: `npm run dev` (development) or `npm run preview` (production)

**Responsibilities**:
- Serve the web UI (Svelte components)
- Handle REST API requests (`/api/*`)
- Manage user authentication and sessions
- Database operations (MongoDB)
- Queue job submissions to Redis/BullMQ
- Receive events from Redis (via bridge) for forwarding to UI

**Does NOT**:
- Run BullMQ workers
- Process background jobs
- Execute pipelines directly (uses queue mode by default)
- Handle SSE/streaming connections (delegated to Realtime Server)

**Execution Mode**:
- Pipeline and Stage API endpoints default to `mode=queue`
- Jobs are queued and processed by the Execution Server
- Use `?mode=direct` only for debugging (runs in SvelteKit process)

**Environment Variables**:
```bash
PORT=5173
HOST=0.0.0.0
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/regno
# Workers are ALWAYS disabled in this server
```

### 2. Realtime Server (Port 3002)

**Purpose**: Handle all real-time streaming connections

**Start Command**: `npm run realtime` or `npm run services:dev:realtime`

**Responsibilities**:
- SSE (Server-Sent Events) streams
- Pipeline execution progress streams
- Stage generation progress streams
- Job progress events
- Chart data streaming
- Admin monitoring streams
- Heartbeat management

**Routes Handled**:
- `/api/queues/jobs/:id/events` - Job progress
- `/api/pipelines/:pipelineId/executions/:executionId/stream` - Execution stream
- `/api/stage/v2/sessions/:sessionId/stream` - Stage generation stream
- `/api/events/subscribe` - Universal event subscription
- `/api/charts/stream/:nodeId` - Chart streaming
- `/api/admin/monitoring/stream` - Admin monitoring

**Environment Variables**:
```bash
PORT=3002
HOST=0.0.0.0
REDIS_URL=redis://localhost:6379
JWT_SECRET=<same as SvelteKit>
```

### 3. Execution Server (Port 3003)

**Purpose**: Run BullMQ workers for background job processing

**Start Command**: `npm run execution` or `npm run services:dev:execution`

**Responsibilities**:
- Run BullMQ workers:
  - **PipelineWorker** - Execute pipeline graphs
  - **StageWorker** - Generate Stage pipelines
  - **LlmWorker** - Process LLM API calls
  - **CortexWorker** - AI pattern operations
  - **NotificationWorker** - Send notifications
  - **ScheduledWorker** - Periodic tasks
  - **BackgroundTasksWorker** - Misc background work
  - **KnowledgeStagingWorker** - Knowledge ingestion
- Publish execution events to Redis
- Health check endpoint

**Environment Variables**:
```bash
PORT=3003
HOST=0.0.0.0
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/regno
# Worker concurrency settings
WORKER_CONCURRENCY_PIPELINE=2
WORKER_CONCURRENCY_STAGE=1
WORKER_CONCURRENCY_LLM=3
WORKER_CONCURRENCY_CORTEX=2
```

## Communication Flow

### Job Submission
```
Browser → SvelteKit → Redis Queue → Execution Server → Process Job
```

### Event Streaming
```
Execution Server → Redis Pub/Sub → Realtime Server → SSE → Browser
                                 ↘ SvelteKit (bridge) → EventBus → UI
```

### API Requests
```
Browser → Caddy → SvelteKit → MongoDB/Redis → Response → Browser
```

## Development Setup

### Quick Start (3 Terminals)

**Terminal 1 - SvelteKit**:
```bash
npm run dev
# Runs on http://localhost:5173
# Workers DISABLED
```

**Terminal 2 - Realtime**:
```bash
npm run realtime
# Runs on http://localhost:3002
```

**Terminal 3 - Execution**:
```bash
npm run execution
# Runs on http://localhost:3003
# Workers ENABLED
```

### With Caddy (Optional)
```bash
# Terminal 4 - Reverse Proxy
docker compose -f docker-compose.dev.yml up caddy
# Access via http://localhost:80
```

## Production Deployment

### Using PM2
```bash
# Build all services
npm run build
npm run services:build

# Start all services
pm2 start ecosystem.config.cjs

# Scale execution workers
pm2 scale regno-execution 4
```

### Using Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Health Checks

| Service    | Endpoint                        | Expected Response          |
|------------|----------------------------------|---------------------------|
| SvelteKit  | `http://localhost:5173/health`   | `{ "status": "ok" }`      |
| Realtime   | `http://localhost:3002/health`   | `{ "status": "healthy" }` |
| Execution  | `http://localhost:3003/health`   | `{ "status": "healthy" }` |

## Scaling Guidelines

### Horizontal Scaling

| Service    | Scale Strategy                                    |
|------------|---------------------------------------------------|
| SvelteKit  | 1 instance (stateless, can scale if needed)       |
| Realtime   | 1-2 instances (sticky sessions for SSE)           |
| Execution  | 2-8 instances (more = faster job processing)      |

### Vertical Scaling

| Service    | Memory Recommendation |
|------------|----------------------|
| SvelteKit  | 1-2 GB               |
| Realtime   | 256-512 MB           |
| Execution  | 2-4 GB per instance  |

## Troubleshooting

### No Events Reaching UI
1. Check Realtime server is running: `curl http://localhost:3002/health`
2. Check Redis is connected: Both servers should log "Redis connected"
3. Check EventSubscriber is subscribed to correct event types

### Jobs Not Processing
1. Check Execution server is running: `curl http://localhost:3003/health`
2. Check Redis queue: View Bull Board at `/admin/queues`
3. Check worker logs for errors

### SSE Connection Drops
1. Ensure Caddy/nginx has proper timeout settings
2. Check heartbeat interval (30s default)
3. Verify client reconnection logic

## Migration Notes

### From Single-Server to Multi-Server

If you were running with `ENABLE_WORKERS=true` in the SvelteKit server:

1. Stop the SvelteKit server
2. Start Execution server: `npm run execution`
3. Start SvelteKit server: `npm run dev` (workers now always disabled)
4. Optionally start Realtime server for better SSE handling

### Environment Variable Changes

**Removed**:
- `ENABLE_WORKERS` - No longer used, workers always run in Execution server

**Added**:
- `EXECUTION_PORT` - Port for Execution server (default: 3003)
- `REALTIME_PORT` - Port for Realtime server (default: 3002)
