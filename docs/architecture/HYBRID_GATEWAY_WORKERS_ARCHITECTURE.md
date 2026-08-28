# Hybrid Gateway + Workers Architecture

## Overview

This document outlines the architectural redesign from a monolithic SvelteKit server to a hybrid gateway + workers architecture. The goal is to separate concerns, enable independent scaling, and prevent CPU-intensive operations from blocking fast I/O operations.

**Document Version:** 3.0
**Created:** December 2024
**Last Updated:** December 2024
**Status:** Implementation Complete (Phase 0-10 + Optional Enhancements 1-3)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Technology Choices](#technology-choices)
7. [Implementation Phases](#implementation-phases)
8. [API Changes](#api-changes)
9. [Deployment Strategy](#deployment-strategy)
10. [Monitoring & Observability](#monitoring--observability)
11. [Failure Scenarios & Recovery](#failure-scenarios--recovery)
12. [Performance Targets](#performance-targets)

---

## Problem Statement

### Current Challenges

1. **Event Loop Blocking**: CPU-intensive pipeline execution and LLM calls block the Node.js event loop, causing slow response times for simple CRUD operations.

2. **No Isolation**: All operations compete for the same resources:
   - Database queries
   - LLM API calls
   - Pipeline execution
   - Stage generation
   - Static file serving
   - SSE connections

3. **Single Point of Failure**: One server handles everything - if it crashes or becomes overloaded, the entire application is unavailable.

4. **Scaling Limitations**: Cannot scale specific workloads independently. Scaling the server scales everything, even components that don't need it.

5. **Long-Running Connections**: SSE streams for execution progress tie up server resources and can exhaust connection pools.

### Impact

- Users experience slow UI when pipelines are executing
- CRUD operations (save, load, list) become sluggish during heavy load
- Admin operations are affected by user workloads
- No ability to prioritize critical operations

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CURRENT: Monolithic                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────────────┐                      │
│                    │   SvelteKit Server   │                      │
│                    │      (Single)        │                      │
│                    └──────────┬──────────┘                      │
│                               │                                  │
│     ┌─────────────────────────┼─────────────────────────┐       │
│     │                         │                         │       │
│     ▼                         ▼                         ▼       │
│ ┌─────────┐           ┌─────────────┐           ┌───────────┐  │
│ │  Routes │           │  Execution  │           │    SSE    │  │
│ │  /api/* │           │  Pipeline   │           │  Streams  │  │
│ │  CRUD   │           │  Stage Gen  │           │  Progress │  │
│ │  Auth   │           │  LLM Calls  │           │  Events   │  │
│ └─────────┘           └─────────────┘           └───────────┘  │
│     │                         │                         │       │
│     │    ⚠️ ALL BLOCKING EACH OTHER ON SAME EVENT LOOP  │       │
│     │                         │                         │       │
│     └─────────────────────────┼─────────────────────────┘       │
│                               │                                  │
│                    ┌──────────▼──────────┐                      │
│                    │      MongoDB        │                      │
│                    └─────────────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Current Request Flow

1. All requests hit single SvelteKit server
2. Server handles auth, validation, execution in same process
3. Long-running operations block event loop
4. SSE connections held open by main server
5. No queue - operations execute immediately or timeout

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TARGET: Hybrid Gateway + Workers                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                              Internet                                    │
│                                  │                                       │
│                    ┌─────────────▼─────────────┐                        │
│                    │         CADDY             │                        │
│                    │    (Gateway/Proxy)        │                        │
│                    │  • TLS Termination        │                        │
│                    │  • Route-based Proxy      │                        │
│                    │  • Rate Limiting          │                        │
│                    │  • Load Balancing         │                        │
│                    └─────────────┬─────────────┘                        │
│                                  │                                       │
│         ┌────────────────────────┼────────────────────────┐             │
│         │                        │                        │             │
│         ▼                        ▼                        ▼             │
│ ┌───────────────┐    ┌───────────────┐    ┌───────────────┐            │
│ │  SVELTEKIT    │    │   REALTIME    │    │  EXECUTION    │            │
│ │  API SERVER   │    │    SERVER     │    │   SERVICE     │            │
│ │               │    │               │    │               │            │
│ │ • Auth/AuthZ  │    │ • SSE Streams │    │ • Pipeline    │            │
│ │ • CRUD APIs   │    │ • WebSocket   │    │   Workers     │            │
│ │ • Validation  │    │ • Progress    │    │ • Stage       │            │
│ │ • Job Submit  │    │   Events      │    │   Workers     │            │
│ │               │    │ • Keepalive   │    │ • LLM Workers │            │
│ │ Target: <50ms │    │ Conn: 1000s   │    │ Concurrency:  │            │
│ │               │    │               │    │   Tunable     │            │
│ └───────┬───────┘    └───────┬───────┘    └───────┬───────┘            │
│         │                    │                    │                     │
│         └────────────────────┼────────────────────┘                     │
│                              │                                          │
│                    ┌─────────▼─────────┐                               │
│                    │      REDIS        │                               │
│                    │  • Job Queues     │                               │
│                    │    (BullMQ)       │                               │
│                    │  • Pub/Sub        │                               │
│                    │  • Session Cache  │                               │
│                    └─────────┬─────────┘                               │
│                              │                                          │
│            ┌─────────────────┼─────────────────┐                       │
│            │                 │                 │                        │
│            ▼                 ▼                 ▼                        │
│       ┌─────────┐      ┌─────────┐      ┌─────────┐                    │
│       │ MongoDB │      │ Qdrant  │      │ Neo4j   │                    │
│       │  Main   │      │ Vectors │      │  Graph  │                    │
│       └─────────┘      └─────────┘      └─────────┘                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Each service handles one type of workload
2. **Non-Blocking API**: Main API returns immediately, work happens in background
3. **Queue-Based Processing**: Heavy operations go through job queue
4. **Pub/Sub for Real-time**: Progress updates via Redis, not direct connections
5. **Independent Scaling**: Scale workers without affecting API

---

## Component Breakdown

### 1. Gateway Layer (Caddy)

**Purpose**: Route requests to appropriate backend service

**Responsibilities**:
- TLS termination (automatic HTTPS)
- Request routing based on path
- Rate limiting per endpoint
- Load balancing across instances
- WebSocket/SSE passthrough
- Static asset caching headers

**Configuration**:
```caddyfile
your-domain.com {
    # Static assets (could also use CDN)
    handle /assets/* {
        reverse_proxy static-server:3001
        header Cache-Control "public, max-age=31536000"
    }

    # Real-time streams → Realtime Server
    handle /api/*/stream/* {
        reverse_proxy realtime-server:3002
    }
    handle /api/*/sse/* {
        reverse_proxy realtime-server:3002
    }

    # Execution triggers → Execution Service
    handle /api/pipelines/*/execute {
        reverse_proxy execution-service:3003
    }
    handle /api/stage/v2/generate {
        reverse_proxy execution-service:3003
    }

    # Everything else → Main API
    handle {
        reverse_proxy sveltekit-api:3000
    }

    # Rate limiting
    rate_limit {
        zone api {
            key {remote_host}
            events 100
            window 1m
        }
    }
}
```

**Why Caddy over Nginx/Kong**:
- Zero-config TLS with automatic certificate renewal
- Simple, readable configuration
- Built-in load balancing
- Hot reload without downtime
- Excellent WebSocket support
- Lower memory footprint than Kong

---

### 2. SvelteKit API Server

**Purpose**: Handle fast, I/O-bound operations

**Responsibilities**:
- Authentication & authorization
- Input validation
- CRUD operations (create, read, update, delete)
- Job submission to queues
- Quick database queries
- Session management

**What Stays**:
```
✅ POST /api/auth/login
✅ GET  /api/pipelines
✅ POST /api/pipelines (create)
✅ PUT  /api/pipelines/:id (update)
✅ DELETE /api/pipelines/:id
✅ GET  /api/stage/v2/sessions
✅ POST /api/stage/v2/sessions (create session, not generate)
✅ GET  /api/cortex/patterns
✅ All /api/admin/* routes
✅ All /api/credentials/* routes
```

**What Moves Out**:
```
❌ POST /api/pipelines/:id/execute → Execution Service
❌ POST /api/stage/v2/generate → Execution Service
❌ GET  /api/*/stream/* → Realtime Server
❌ Heavy Cortex queries → Execution Service
```

**Target Performance**:
- P50 latency: < 20ms
- P99 latency: < 100ms
- No request > 500ms

---

### 3. Realtime Server

**Purpose**: Manage long-lived connections for real-time updates

**Responsibilities**:
- SSE (Server-Sent Events) connections
- WebSocket connections (future)
- Subscribe to Redis pub/sub channels
- Forward events to connected clients
- Connection keepalive management
- Graceful connection cleanup

**Endpoints**:
```
GET /api/pipelines/:id/executions/:execId/stream
GET /api/stage/v2/sessions/:sessionId/stream
GET /api/notifications/stream
WS  /api/ws (future)
```

**Architecture**:
```
┌─────────────────────────────────────────────────┐
│              Realtime Server                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │ Connection   │    │   Redis Subscriber   │  │
│  │   Manager    │◄───│                      │  │
│  │              │    │ psubscribe:          │  │
│  │ Map<string,  │    │  - execution:*       │  │
│  │   Set<Res>>  │    │  - stage:*           │  │
│  └──────────────┘    │  - notification:*    │  │
│         │            └──────────────────────┘  │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐                              │
│  │   Clients    │                              │
│  │  (SSE/WS)    │                              │
│  └──────────────┘                              │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Scaling Strategy**:
- Stateless (connection state in Redis if needed)
- Horizontal scaling with sticky sessions (optional)
- Target: 10,000+ concurrent connections per instance

---

### 4. Execution Service

**Purpose**: Process CPU-intensive background jobs

**Responsibilities**:
- Pipeline execution
- Stage project generation
- LLM API calls (rate-limited)
- Heavy Cortex operations
- Report generation
- Data processing

**Worker Types**:

| Worker | Concurrency | Rate Limit | Timeout |
|--------|-------------|------------|---------|
| Pipeline | 3 per instance | 10/min | 10 min |
| Stage | 5 per instance | 20/min | 5 min |
| LLM | 10 per instance | 50/min | 2 min |
| Cortex | 5 per instance | 30/min | 3 min |

**Job Flow**:
```
1. API receives request
2. API validates & creates record in MongoDB
3. API enqueues job to BullMQ
4. API returns { jobId, status: 'queued' } immediately
5. Worker picks up job from queue
6. Worker processes job, publishing progress to Redis
7. Worker updates MongoDB with result
8. Worker publishes completion event
9. Realtime server forwards events to client
```

---

### 5. Job Queue System (BullMQ + Redis)

**Purpose**: Reliable job processing with priorities, retries, and rate limiting

**Queue Definitions**:

```typescript
const QUEUES = {
  // High-priority execution queue
  PIPELINE_EXECUTION: 'pipeline:execution',

  // Stage generation queue
  STAGE_GENERATION: 'stage:generation',

  // LLM calls (rate-limited)
  LLM_CALLS: 'llm:calls',

  // Heavy Cortex operations
  CORTEX_HEAVY: 'cortex:heavy',

  // Notifications (email, slack)
  NOTIFICATIONS: 'notifications',

  // Scheduled tasks
  SCHEDULED: 'scheduled'
};
```

**Priority Levels**:
```typescript
const PRIORITY = {
  CRITICAL: 1,    // Admin operations, system tasks
  HIGH: 2,        // Interactive user requests
  NORMAL: 3,      // Standard operations
  LOW: 4,         // Background tasks
  BULK: 5         // Batch operations, reports
};
```

**Job Options**:
```typescript
const JOB_OPTIONS = {
  'pipeline:execution': {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 10 * 60 * 1000,  // 10 minutes
    removeOnComplete: { age: 24 * 3600 },  // Keep 24h
    removeOnFail: { age: 7 * 24 * 3600 }   // Keep 7 days
  },
  'stage:generation': {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    timeout: 5 * 60 * 1000,   // 5 minutes
    removeOnComplete: { age: 24 * 3600 }
  },
  'llm:calls': {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 2 * 60 * 1000,   // 2 minutes
    rateLimiter: {
      max: 50,
      duration: 60 * 1000     // 50 per minute
    }
  }
};
```

---

## Data Flow Diagrams

### Pipeline Execution Flow

```
┌──────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│Client│    │ Gateway │    │   API   │    │  Queue  │    │ Worker  │
└──┬───┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
   │             │              │              │              │
   │ POST /execute              │              │              │
   │────────────>│              │              │              │
   │             │──────────────>              │              │
   │             │              │              │              │
   │             │  validate,   │              │              │
   │             │  create exec │              │              │
   │             │  record      │              │              │
   │             │              │              │              │
   │             │              │ enqueue job  │              │
   │             │              │─────────────>│              │
   │             │              │              │              │
   │             │<─────────────│              │              │
   │<────────────│ { jobId,     │              │              │
   │             │   status }   │              │              │
   │             │              │              │              │
   │ GET /stream │              │              │              │
   │────────────>│ (to realtime)│              │              │
   │             │              │              │ dequeue      │
   │             │              │              │─────────────>│
   │             │              │              │              │
   │             │              │              │  execute     │
   │             │              │              │  pipeline    │
   │             │              │              │              │
   │<═══════════════════════════════════════════════════════>│
   │             │    SSE: progress events via Redis pub/sub │
   │             │              │              │              │
   │             │              │              │  complete    │
   │<═══════════════════════════════════════════════════════>│
   │             │    SSE: completion event                  │
   │             │              │              │              │
```

### Stage Generation Flow

```
┌──────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│Client│    │   API   │    │  Queue  │    │ Stage   │    │  LLM    │
│      │    │         │    │         │    │ Worker  │    │ Worker  │
└──┬───┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
   │             │              │              │              │
   │ POST /generate             │              │              │
   │────────────>│              │              │              │
   │             │ enqueue      │              │              │
   │             │─────────────>│              │              │
   │<────────────│              │              │              │
   │ { sessionId }              │              │              │
   │             │              │              │              │
   │ SSE /stream │              │ dequeue      │              │
   │─────────────────────────────────────────>│              │
   │             │              │              │              │
   │             │              │              │ Phase 1:     │
   │             │              │              │ Understand   │
   │<════════════════════════════════════════>│              │
   │             │   progress   │              │              │
   │             │              │              │ LLM call     │
   │             │              │              │─────────────>│
   │             │              │              │<─────────────│
   │             │              │              │              │
   │             │              │              │ Phase 2:     │
   │             │              │              │ Explore      │
   │<════════════════════════════════════════>│              │
   │             │              │              │              │
   │             │              │              │ ... more     │
   │             │              │              │ phases       │
   │             │              │              │              │
   │<════════════════════════════════════════>│              │
   │             │   complete   │              │              │
   │             │              │              │              │
```

---

## Technology Choices

### Gateway: Caddy

| Criteria | Caddy | Nginx | Kong |
|----------|-------|-------|------|
| TLS Setup | Automatic | Manual | Manual |
| Config Syntax | Simple | Complex | Complex |
| Hot Reload | Yes | Yes | Yes |
| Memory Usage | Low | Low | High |
| WebSocket | Native | Native | Plugin |
| Rate Limiting | Built-in | Module | Built-in |
| Learning Curve | Low | Medium | High |

**Decision**: Caddy - simplicity, automatic TLS, sufficient features

### Job Queue: BullMQ

| Criteria | BullMQ | Agenda | Bee-Queue |
|----------|--------|--------|-----------|
| Redis-based | Yes | No (Mongo) | Yes |
| Priority Queues | Yes | Yes | No |
| Rate Limiting | Built-in | Manual | No |
| Delayed Jobs | Yes | Yes | Yes |
| Job Progress | Yes | No | Yes |
| Dashboard | Bull Board | Agendash | None |
| TypeScript | Native | Good | Limited |
| Maintenance | Active | Active | Stale |

**Decision**: BullMQ - best feature set, excellent TypeScript support, active maintenance

### Realtime: Custom Fastify Server

| Criteria | Custom | Socket.io | Centrifugo |
|----------|--------|-----------|------------|
| SSE Support | Yes | Limited | Yes |
| Complexity | Low | Medium | High |
| Control | Full | Full | Limited |
| Scaling | Manual | Built-in | Built-in |
| Dependencies | Few | Many | Separate |

**Decision**: Custom Fastify server - simple, full control, minimal dependencies

---

## Implementation Phases

### Phase 0: Preparation (1-2 days)

**Objectives**:
- Set up development infrastructure
- Create project structure
- No changes to production code

**Tasks**:
```
□ Install Redis locally (or use Docker)
□ Install Caddy locally
□ Create docker-compose.dev.yml
□ Create shared types package
□ Set up monorepo structure (optional)
□ Document development setup
```

**Deliverables**:
- `docker-compose.dev.yml` with Redis, Caddy
- Shared types package
- Development environment documentation

---

### Phase 1: Queue Infrastructure (3-5 days)

**Objectives**:
- Add BullMQ to existing SvelteKit
- Queue definitions and types
- No behavioral changes yet

**Tasks**:
```
□ Add BullMQ and ioredis dependencies
□ Create queue connection manager
□ Define job types (TypeScript interfaces)
□ Create queue instances
□ Add Bull Board for monitoring
□ Add health check endpoint
□ Write queue integration tests
```

**Code Structure**:
```
src/lib/server/queues/
├── connection.ts       # Redis connection singleton
├── types.ts            # Job type definitions
├── definitions.ts      # Queue configurations
├── index.ts            # Export all queues
└── health.ts           # Queue health checks
```

**Deliverables**:
- Queue infrastructure in place
- Bull Board accessible at `/admin/queues`
- Health endpoint at `/api/health/queues`

---

### Phase 2: Pipeline Execution Migration (5-7 days)

**Objectives**:
- Pipeline execution uses job queue
- Progress via Redis pub/sub
- API returns immediately

**Tasks**:
```
□ Create pipeline execution worker
□ Extract execution logic to shared module
□ Modify /execute endpoint to enqueue
□ Create Redis pub/sub for progress
□ Modify SSE endpoint to subscribe
□ Add execution status endpoint
□ Update client to handle async execution
□ Write integration tests
□ Test with existing pipelines
```

**API Changes**:
```typescript
// Before
POST /api/pipelines/:id/execute
Response: { result: {...} }  // After execution completes
Time: 1-60+ seconds

// After
POST /api/pipelines/:id/execute
Response: {
  executionId: string,
  jobId: string,
  status: 'queued',
  streamUrl: string
}
Time: < 100ms
```

**Deliverables**:
- Pipeline execution via workers
- Real-time progress via Redis pub/sub
- Backward-compatible API

---

### Phase 3: Stage Generation Migration (5-7 days)

**Objectives**:
- Stage generation uses job queue
- LLM calls as sub-jobs
- Phase progress via Redis

**Tasks**:
```
□ Create stage generation worker
□ Create LLM call worker (rate-limited)
□ Modify StageOrchestrator for queue
□ Implement LLM job chaining
□ Update SSE for stage progress
□ Handle partial failures
□ Test various generation scenarios
```

**LLM Call Queue Features**:
- Rate limiting: 50 calls/minute
- Automatic retries with exponential backoff
- Provider-specific rate limits
- Cost tracking per job

**Deliverables**:
- Stage generation via workers
- LLM calls rate-limited and tracked
- Improved error handling

---

### Phase 4: Realtime Server Extraction (3-5 days)

**Objectives**:
- Dedicated process for SSE/WS
- Main API no longer holds connections
- Scalable connection handling

**Tasks**:
```
□ Create realtime-server package
□ Implement SSE connection manager
□ Implement Redis subscription handler
□ Add connection health monitoring
□ Configure Caddy routing
□ Add graceful shutdown
□ Test connection handoff
□ Load test connections
```

**Server Structure**:
```
realtime-server/
├── src/
│   ├── server.ts
│   ├── connections/
│   │   ├── manager.ts
│   │   └── sse.ts
│   ├── subscribers/
│   │   ├── execution.ts
│   │   └── stage.ts
│   └── health.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Deliverables**:
- Standalone realtime server
- SSE connections off main API
- Connection metrics

---

### Phase 5: Execution Service Extraction (5-7 days)

**Objectives**:
- Workers in separate process
- Independent deployment
- Scalable workers

**Tasks**:
```
□ Create execution-service package
□ Move workers to new service
□ Set up PM2 configuration
□ Create Dockerfile
□ Configure worker scaling
□ Add worker health checks
□ Test failure recovery
□ Document deployment
```

**Service Structure**:
```
execution-service/
├── src/
│   ├── index.ts           # Entry point
│   ├── workers/
│   │   ├── pipeline.ts
│   │   ├── stage.ts
│   │   └── llm.ts
│   ├── processors/        # Moved from SvelteKit
│   │   ├── pipelineRunner.ts
│   │   ├── stageOrchestrator.ts
│   │   └── llmCaller.ts
│   └── health.ts
├── package.json
├── ecosystem.config.js    # PM2 config
├── Dockerfile
└── tsconfig.json
```

**Deliverables**:
- Standalone execution service
- PM2 managed workers
- Docker deployment ready

---

### Phase 6: Production Hardening (3-5 days)

**Objectives**:
- Monitoring and alerting
- Performance optimization
- Failure recovery

**Tasks**:
```
□ Add Prometheus metrics
□ Create Grafana dashboards
□ Set up alerting rules
□ Add distributed tracing
□ Implement circuit breakers
□ Add request tracing IDs
□ Load testing
□ Document runbooks
```

**Metrics to Track**:
```
# API Server
- Request latency (P50, P95, P99)
- Request rate
- Error rate
- Active connections

# Queue
- Queue depth
- Job processing time
- Job success/failure rate
- Worker utilization

# Realtime
- Active SSE connections
- Message throughput
- Connection duration

# System
- CPU usage per service
- Memory usage per service
- Redis memory/connections
```

**Deliverables**:
- Comprehensive monitoring
- Alerting rules
- Performance baselines
- Operational runbooks

---

## API Changes

### Execution Endpoints

```typescript
// Pipeline Execution - CHANGED
POST /api/pipelines/:id/execute
// Before: Synchronous, returns result
// After: Asynchronous, returns job info

Request: { inputData?: any }
Response: {
  executionId: string;
  jobId: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  streamUrl: string;
  estimatedWait?: number;
}

// Execution Status - NEW
GET /api/pipelines/:id/executions/:execId
Response: {
  id: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  progress?: number;
  currentNode?: string;
  result?: any;
  error?: string;
  timing: {
    queuedAt: string;
    startedAt?: string;
    completedAt?: string;
  }
}

// Execution Stream - MOVED to Realtime Server
GET /api/pipelines/:id/executions/:execId/stream
// Now proxied to realtime-server:3002
```

### Stage Endpoints

```typescript
// Stage Generation - CHANGED
POST /api/stage/v2/generate
// Before: Synchronous with SSE in same connection
// After: Asynchronous, returns session info

Request: { goal: string; context?: any; }
Response: {
  sessionId: string;
  jobId: string;
  status: 'queued';
  streamUrl: string;
}

// Stage Stream - MOVED to Realtime Server
GET /api/stage/v2/sessions/:sessionId/stream
// Now proxied to realtime-server:3002
```

### Health Endpoints

```typescript
// Combined Health - NEW
GET /api/health
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    api: { status: string; latency: number };
    redis: { status: string; latency: number };
    mongodb: { status: string; latency: number };
    queues: {
      pipeline: { waiting: number; active: number };
      stage: { waiting: number; active: number };
      llm: { waiting: number; active: number };
    }
  };
  timestamp: string;
}
```

---

## Deployment Strategy

### Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile.dev:/etc/caddy/Caddyfile
    depends_on:
      - sveltekit-api
      - realtime-server
      - execution-service

  sveltekit-api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - redis

  realtime-server:
    build:
      context: ./realtime-server
      dockerfile: Dockerfile.dev
    ports:
      - "3002:3002"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  execution-service:
    build:
      context: ./execution-service
      dockerfile: Dockerfile.dev
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=${MONGODB_URI}
    depends_on:
      - redis

volumes:
  redis-data:
```

### Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config

  sveltekit-api:
    image: your-registry/sveltekit-api:${TAG}
    restart: always
    deploy:
      replicas: 2
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production

  realtime-server:
    image: your-registry/realtime-server:${TAG}
    restart: always
    deploy:
      replicas: 2
    environment:
      - REDIS_URL=redis://redis:6379

  execution-service:
    image: your-registry/execution-service:${TAG}
    restart: always
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  caddy-data:
  caddy-config:
  redis-data:
```

---

## Monitoring & Observability

### Bull Board Dashboard

Access at: `/admin/queues`

Shows:
- Queue depths
- Job statuses
- Processing times
- Failed jobs with stack traces
- Retry history

### Prometheus Metrics

```typescript
// Key metrics to expose

// API Server
http_request_duration_seconds{method, path, status}
http_requests_total{method, path, status}
http_connections_active

// Queue
bullmq_queue_size{queue, status}
bullmq_job_duration_seconds{queue, status}
bullmq_jobs_processed_total{queue, status}
bullmq_job_attempts_total{queue}

// Realtime
sse_connections_active
sse_messages_sent_total
sse_connection_duration_seconds

// LLM
llm_calls_total{provider, model, status}
llm_call_duration_seconds{provider, model}
llm_tokens_used_total{provider, model, type}
```

### Grafana Dashboards

1. **API Overview**: Request rates, latencies, errors
2. **Queue Health**: Depths, processing times, failures
3. **Realtime Connections**: Active connections, message rates
4. **LLM Usage**: Calls by provider, costs, latencies
5. **System Resources**: CPU, memory, network per service

### Alerting Rules

```yaml
groups:
  - name: api
    rules:
      - alert: HighLatency
        expr: http_request_duration_seconds{quantile="0.99"} > 1
        for: 5m

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m

  - name: queues
    rules:
      - alert: QueueBacklog
        expr: bullmq_queue_size{status="waiting"} > 100
        for: 10m

      - alert: HighFailureRate
        expr: rate(bullmq_jobs_processed_total{status="failed"}[5m]) > 0.1
        for: 5m

  - name: realtime
    rules:
      - alert: ConnectionSaturation
        expr: sse_connections_active > 5000
        for: 5m
```

---

## Failure Scenarios & Recovery

### Scenario 1: Worker Crashes

**Detection**: Health check fails, jobs not processing
**Impact**: Jobs queue up, no progress updates
**Recovery**:
1. PM2 auto-restarts worker
2. Jobs remain in queue (Redis persistence)
3. Incomplete jobs are retried
4. No data loss

### Scenario 2: Redis Unavailable

**Detection**: Connection errors from all services
**Impact**:
- Queue operations fail
- SSE updates stop
- New jobs cannot be submitted
**Recovery**:
1. API returns 503 for job submissions
2. Existing executions pause (not lost)
3. Redis recovers → jobs resume
4. Consider Redis Sentinel for HA

### Scenario 3: Main API Overload

**Detection**: High latency, connection timeouts
**Impact**: CRUD operations slow
**Recovery**:
1. Caddy rate limiting kicks in
2. Scale API instances
3. Workers unaffected (separate process)
4. Queue absorbs spikes

### Scenario 4: LLM Provider Rate Limited

**Detection**: 429 responses from provider
**Impact**: LLM jobs fail/retry
**Recovery**:
1. BullMQ exponential backoff
2. Jobs retry automatically
3. Rate limiter prevents cascade
4. Alert on sustained failures

### Scenario 5: Long-Running Job Timeout

**Detection**: Job exceeds timeout
**Impact**: Single execution fails
**Recovery**:
1. Job marked as failed
2. User notified via SSE
3. Can retry with higher timeout
4. Log for investigation

---

## Performance Targets

### API Server

| Metric | Target | Acceptable |
|--------|--------|------------|
| P50 Latency | < 20ms | < 50ms |
| P95 Latency | < 50ms | < 100ms |
| P99 Latency | < 100ms | < 200ms |
| Throughput | 1000 req/s | 500 req/s |
| Error Rate | < 0.1% | < 1% |

### Queue Processing

| Metric | Target | Acceptable |
|--------|--------|------------|
| Queue Wait Time | < 5s | < 30s |
| Pipeline Execution | < 60s | < 5min |
| Stage Generation | < 30s | < 2min |
| LLM Call | < 10s | < 30s |
| Job Success Rate | > 99% | > 95% |

### Realtime Server

| Metric | Target | Acceptable |
|--------|--------|------------|
| Connections/Instance | 10,000 | 5,000 |
| Message Latency | < 100ms | < 500ms |
| Connection Setup | < 50ms | < 200ms |

---

## Security Considerations

### Inter-Service Communication

- All services in private network
- Only Caddy exposed to internet
- Redis not exposed externally
- Service-to-service auth via shared secrets (optional)

### Job Data

- Sensitive data (credentials) stored in MongoDB, not job payload
- Jobs reference credential IDs, not values
- Job payloads logged without sensitive fields

### Rate Limiting

- API: 100 req/min per IP
- Execution: 10 jobs/min per user
- LLM: 50 calls/min total (provider limits)

---

## Migration Checklist

### Pre-Migration

- [ ] Redis installed and accessible
- [ ] Caddy configured and tested
- [ ] Monitoring infrastructure ready
- [ ] Rollback plan documented
- [ ] Team trained on new architecture

### During Migration

- [ ] Feature flags for gradual rollout
- [ ] Parallel running of old/new paths
- [ ] Monitoring dashboards visible
- [ ] On-call engineer assigned

### Post-Migration

- [ ] Old code paths removed
- [ ] Documentation updated
- [ ] Performance baselines established
- [ ] Runbooks created
- [ ] Team retrospective conducted

---

## Appendix

### A. Useful Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View queue status
docker exec -it redis redis-cli
> KEYS bull:*
> LLEN bull:pipeline:execution:wait

# Monitor Redis pub/sub
docker exec -it redis redis-cli
> PSUBSCRIBE execution:*

# Check worker logs
pm2 logs execution-service

# Scale workers
pm2 scale pipeline-worker 5
```

### B. Configuration Reference

See separate configuration files:
- `Caddyfile.example`
- `ecosystem.config.example.js`
- `docker-compose.example.yml`

### C. Glossary

- **BullMQ**: Redis-based job queue for Node.js
- **Caddy**: Modern web server with automatic HTTPS
- **SSE**: Server-Sent Events, one-way real-time communication
- **Pub/Sub**: Publish/Subscribe messaging pattern
- **Worker**: Background process that handles jobs

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial architecture document |
| 1.1 | Dec 2024 | Phase 0-2 implementation complete |
| 2.0 | Dec 2024 | Full implementation complete (Phase 0-10), documentation added |
| 3.0 | Dec 2024 | Optional enhancements 1-3 implemented (Caddy, Realtime, Execution) |

---

## Implementation Status

### All Phases Complete ✅

The hybrid gateway + workers architecture has been fully implemented. All phases from 0-10 are complete.

---

### Phase 0: Development Infrastructure ✅

- [x] `docker-compose.dev.yml` - Redis and Caddy containers
- [x] `Caddyfile.dev` - Development routing configuration
- [x] Redis Commander for debugging at port 8081

---

### Phase 1: Queue Infrastructure ✅

- [x] `src/lib/server/queues/connection.ts` - Redis connection singleton
- [x] `src/lib/server/queues/types.ts` - Job type definitions
- [x] `src/lib/server/queues/definitions.ts` - Queue configurations
- [x] `src/lib/server/queues/health.ts` - Queue health checks
- [x] `src/lib/server/queues/bullBoard.ts` - Bull Board integration
- [x] `src/lib/server/queues/index.ts` - Main export file

---

### Phase 2: Workers Infrastructure ✅

- [x] `src/lib/server/queues/workers/BaseWorker.ts` - Abstract base class
- [x] `src/lib/server/queues/workers/LlmWorker.ts` - LLM API call processor
- [x] `src/lib/server/queues/workers/PipelineWorker.ts` - Pipeline executor
- [x] `src/lib/server/queues/workers/StageWorker.ts` - Stage V2 generation
- [x] `src/lib/server/queues/workers/CortexWorker.ts` - Vector operations
- [x] `src/lib/server/queues/workers/NotificationWorker.ts` - Email/Slack/Webhooks
- [x] `src/lib/server/queues/workers/ScheduledWorker.ts` - Scheduled tasks
- [x] `src/lib/server/queues/workers/index.ts` - Worker manager

---

### Phase 3: Service APIs ✅

High-level service APIs for easy job submission:

- [x] `src/lib/server/services/queuedLlmService.ts` - LLM call queuing with smart fallback
- [x] `src/lib/server/services/queuedCortexService.ts` - Vector operation queuing
- [x] `src/lib/server/services/queuedNotificationService.ts` - Multi-channel notifications
- [x] `src/lib/server/services/queuedSchedulerService.ts` - Scheduled/recurring jobs

---

### Phase 4: Pub/Sub & Real-Time ✅

- [x] `src/lib/server/queues/pubsub.ts` - Redis pub/sub utilities
- [x] Job progress events via Redis channels
- [x] Execution event subscriptions
- [x] SSE endpoint integration

---

### Phase 5: Queue Lifecycle Management ✅

- [x] `src/lib/server/queues/queueLifecycle.ts` - Initialization and shutdown
- [x] Automatic worker startup on server boot
- [x] Graceful shutdown handling
- [x] Shutdown handlers registered in `hooks.server.ts`

---

### Phase 6: API Endpoints ✅

- [x] `src/routes/api/queues/jobs/[id]/+server.ts` - Job status and cancellation
- [x] `src/routes/api/queues/jobs/[id]/events/+server.ts` - Real-time SSE events
- [x] `src/routes/api/queues/scheduled/+server.ts` - List/create scheduled jobs
- [x] `src/routes/api/queues/scheduled/[key]/+server.ts` - Manage individual schedules
- [x] `src/routes/api/queues/scheduled/defaults/+server.ts` - Default schedule setup
- [x] `src/routes/api/queues/status/+server.ts` - Queue system status

---

### Phase 7-9: Advanced Features ✅

- [x] Priority-based job processing (CRITICAL, HIGH, NORMAL, LOW)
- [x] Automatic retry with exponential backoff
- [x] Rate limiting per queue and provider
- [x] Job timeout handling
- [x] Failed job recovery
- [x] Batch operations support
- [x] Smart mode with automatic fallback to direct execution

---

### Phase 10: Testing ✅

- [x] `vitest.config.ts` - Test configuration
- [x] `tests/mocks/env.ts` - Environment mocks
- [x] `tests/mocks/mockRedis.ts` - In-memory Redis mock
- [x] `tests/mocks/queueTestUtils.ts` - Test utilities
- [x] `tests/unit/queues/types.test.ts` - Type tests
- [x] `tests/unit/queues/schedulerService.test.ts` - Scheduler tests
- [x] `tests/unit/queues/notificationService.test.ts` - Notification tests
- [x] `tests/unit/queues/lifecycle.test.ts` - Lifecycle tests
- [x] `tests/integration/queues/workers.test.ts` - Worker integration tests

**Test Results:** 110 tests passing

---

### Defined Queue Types

| Queue Name | Purpose | Concurrency | Rate Limit |
|------------|---------|-------------|------------|
| `pipeline-execution` | Pipeline graph execution | 1 | 10/min |
| `stage-generation` | Stage V2 project generation | 2 | 5/min |
| `llm-calls` | LLM API calls | 5 | Provider-specific |
| `cortex-operations` | Embeddings and queries | 3 | 20/min |
| `notifications` | Email, Slack, webhooks | 10 | 30/min |
| `scheduled` | Background/maintenance tasks | 2 | 5/min |

---

### Workers

| Worker | Queue | Description |
|--------|-------|-------------|
| PipelineWorker | `pipeline-execution` | Executes pipeline graphs |
| StageWorker | `stage-generation` | Stage V2 AI generation |
| LlmWorker | `llm-calls` | LLM API calls with rate limiting |
| CortexWorker | `cortex-operations` | Vector embed/query/upsert/delete |
| NotificationWorker | `notifications` | Email, SMS, Slack, webhooks |
| ScheduledWorker | `scheduled` | Cleanup, backup, health checks |

---

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/queues/jobs/:id` | GET | Get job status |
| `/api/queues/jobs/:id` | DELETE | Cancel job |
| `/api/queues/jobs/:id/events` | GET | SSE job events |
| `/api/queues/scheduled` | GET | List scheduled jobs |
| `/api/queues/scheduled` | POST | Create scheduled job |
| `/api/queues/scheduled/:key` | GET | Get scheduled job details |
| `/api/queues/scheduled/:key` | DELETE | Remove scheduled job |
| `/api/queues/scheduled/defaults` | GET | Get schedule presets |
| `/api/queues/scheduled/defaults` | POST | Setup default schedules |
| `/api/queues/status` | GET | Queue system status |
| `/api/queues/status` | POST | Control (shutdown) |
| `/admin/queues` | GET | Bull Board UI |

---

### Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379

# Optional
ENABLE_WORKERS=true          # Enable/disable workers (default: true)
OPENAI_RATE_LIMIT=60         # OpenAI requests per minute
ANTHROPIC_RATE_LIMIT=40      # Anthropic requests per minute
```

---

### NPM Scripts

```bash
npm run test:queues     # Run queue tests
npm run test:coverage   # Run with coverage
npm run test:watch      # Watch mode
```

---

### Documentation

Comprehensive documentation available in `doc/infrastructure/`:

| Document | Description |
|----------|-------------|
| [QUEUE_SYSTEM_ARCHITECTURE.md](../infrastructure/QUEUE_SYSTEM_ARCHITECTURE.md) | Main architecture overview |
| [QUEUE_WORKERS_REFERENCE.md](../infrastructure/QUEUE_WORKERS_REFERENCE.md) | Worker implementation details |
| [QUEUE_SERVICE_APIS.md](../infrastructure/QUEUE_SERVICE_APIS.md) | Service API reference |
| [QUEUE_API_ENDPOINTS.md](../infrastructure/QUEUE_API_ENDPOINTS.md) | REST API documentation |
| [QUEUE_QUICKSTART.md](../infrastructure/QUEUE_QUICKSTART.md) | Quick start guide |

---

### File Structure

```
src/lib/server/queues/
├── index.ts              # Main exports
├── types.ts              # Type definitions
├── connection.ts         # Redis connection management
├── definitions.ts        # Queue configurations
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
├── jobs/[id]/events/+server.ts
├── scheduled/+server.ts
├── scheduled/[key]/+server.ts
├── scheduled/defaults/+server.ts
└── status/+server.ts

tests/
├── setup/
│   └── globalSetup.ts
├── mocks/
│   ├── env.ts
│   ├── mockRedis.ts
│   └── queueTestUtils.ts
├── unit/queues/
│   ├── types.test.ts
│   ├── schedulerService.test.ts
│   ├── notificationService.test.ts
│   └── lifecycle.test.ts
└── integration/queues/
    └── workers.test.ts
```

---

### Optional Enhancements Status

The following optional enhancements have been implemented:

| Enhancement | Status | Files |
|-------------|--------|-------|
| 1. Production Caddy Gateway | ✅ Implemented | `Caddyfile.prod`, `docker-compose.prod.yml` |
| 2. Separate Realtime Server | ✅ Implemented | `services/realtime/` |
| 3. Separate Execution Service | ✅ Implemented | `services/execution/`, `ecosystem.config.cjs` |
| 4. Prometheus Metrics & Grafana | ⏳ Optional | - |
| 5. Redis Sentinel/Cluster | ⏳ Optional | - |

---

### Implemented Enhancements

#### 1. Production Caddy Gateway ✅

**Status:** Implemented

**Files Created:**
- `Caddyfile.prod` - Production configuration with TLS, rate limiting, security headers
- `docker-compose.prod.yml` - Production service definitions

**Features:**
- Automatic TLS via Let's Encrypt
- Rate limiting (global: 100/s, API: 60/min, LLM: 20/min)
- Security headers (HSTS, CSP, X-Frame-Options)
- Service routing to SvelteKit, Realtime, and Execution services
- Load balancing with health checks

---

#### 2. Separate Realtime Server ✅

**Status:** Implemented

**Files Created:**
```
services/realtime/
├── src/
│   ├── index.ts       # Main entry point
│   ├── server.ts      # Express server configuration
│   ├── routes.ts      # SSE route handlers
│   ├── auth.ts        # Token verification
│   ├── connection.ts  # Redis connection management
│   └── pubsub.ts      # Redis pub/sub subscriptions
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Endpoints:**
- `GET /api/queues/jobs/:id/events` - Job progress SSE
- `GET /api/pipelines/:id/executions/:execId/stream` - Pipeline execution SSE
- `GET /api/stage/v2/sessions/:sessionId/stream` - Stage generation SSE
- `GET /api/events/subscribe` - Universal event subscription
- `GET /health` - Health check

---

#### 3. Separate Execution Service ✅

**Status:** Implemented

**Files Created:**
```
services/execution/
├── src/
│   ├── index.ts       # Main entry point
│   ├── launcher.ts    # Worker launcher with signal handling
│   └── health.ts      # Health check server with Prometheus metrics
├── package.json
├── tsconfig.json
└── Dockerfile

ecosystem.config.cjs   # PM2 configuration for all services
```

**Features:**
- Standalone worker processes
- PM2 process management with clustering
- Health check endpoints (`/health`, `/status`, `/metrics`)
- Prometheus metrics format
- Configurable worker concurrency via environment variables
- Graceful shutdown with 30-second timeout

**Worker Configuration (ecosystem.config.cjs):**
```javascript
// Scale execution workers
pm2 scale regno-execution 4

// View worker status
pm2 monit
```

---

### Remaining Optional Enhancements

#### 4. Prometheus Metrics & Grafana

**Purpose:** Production-grade monitoring and alerting.

**When to implement:** Before production deployment or when debugging performance issues.

**What's needed:**

```caddyfile
# Caddyfile.prod (example)
your-domain.com {
    # Automatic TLS
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }

    # Rate limiting
    rate_limit {
        zone api {
            key {remote_host}
            events 100
            window 1m
        }
    }

    # Realtime streams → Realtime Server
    handle /api/*/stream/* {
        reverse_proxy realtime-server:3002
    }
    handle /api/*/sse/* {
        reverse_proxy realtime-server:3002
    }
    handle /api/queues/jobs/*/events {
        reverse_proxy realtime-server:3002
    }

    # Queue management UI
    handle /admin/queues* {
        reverse_proxy sveltekit-api:3000
    }

    # Everything else → Main API
    handle {
        reverse_proxy sveltekit-api:3000 {
            lb_policy round_robin
            health_uri /api/health
            health_interval 30s
        }
    }
}
```

**Files to create:**
- `Caddyfile.prod` - Production configuration
- `Caddyfile.staging` - Staging configuration
- Update `docker-compose.prod.yml` with Caddy service

**Effort:** 1-2 days

---

#### 2. Separate Realtime Server

**Purpose:** Handle SSE/WebSocket connections in dedicated process to prevent blocking main API.

**When to implement:** When SSE connections exceed 1000+ or main API latency is affected.

**Benefits:**
- Scale connections independently (10,000+ per instance)
- Main API stays fast for CRUD operations
- Graceful connection handling during deployments

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                    Realtime Server                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐    ┌────────────────────────┐    │
│  │ Connection Mgr   │    │   Redis Subscriber     │    │
│  │                  │◄───│                        │    │
│  │ Map<id, clients> │    │ PSUBSCRIBE:            │    │
│  └────────┬─────────┘    │  - execution:*         │    │
│           │              │  - stage:*             │    │
│           ▼              │  - job:*               │    │
│  ┌──────────────────┐    └────────────────────────┘    │
│  │   SSE Streams    │                                   │
│  │   (Fastify)      │                                   │
│  └──────────────────┘                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**What's needed:**

```
realtime-server/
├── src/
│   ├── index.ts              # Fastify server entry
│   ├── connections/
│   │   ├── manager.ts        # Connection tracking
│   │   └── sse.ts            # SSE stream handling
│   ├── subscribers/
│   │   ├── execution.ts      # Pipeline execution events
│   │   ├── stage.ts          # Stage generation events
│   │   └── jobs.ts           # Queue job events
│   └── health.ts             # Health endpoint
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Endpoints to move:**
- `GET /api/pipelines/:id/executions/:execId/stream`
- `GET /api/stage/v2/sessions/:sessionId/stream`
- `GET /api/queues/jobs/:id/events`

**Effort:** 3-5 days

---

#### 3. Separate Execution Service

**Purpose:** Run workers in standalone process for independent scaling and deployment.

**When to implement:** When worker load affects API performance or need independent scaling.

**Benefits:**
- Scale workers without scaling API
- Deploy worker updates without API downtime
- Resource isolation (CPU-intensive work separated)
- Different instance sizes for workers vs API

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                   Execution Service                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Pipeline   │  │   Stage     │  │    LLM      │     │
│  │   Worker    │  │   Worker    │  │   Worker    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Cortex    │  │ Notification│  │  Scheduled  │     │
│  │   Worker    │  │   Worker    │  │   Worker    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Shared Services                     │   │
│  │  - MongoDB connection                            │   │
│  │  - Redis connection                              │   │
│  │  - LLM service                                   │   │
│  │  - Cortex service                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**What's needed:**

```
execution-service/
├── src/
│   ├── index.ts              # Entry point, worker init
│   ├── workers/              # Copy from SvelteKit
│   │   ├── index.ts
│   │   ├── BaseWorker.ts
│   │   ├── PipelineWorker.ts
│   │   ├── StageWorker.ts
│   │   ├── LlmWorker.ts
│   │   ├── CortexWorker.ts
│   │   ├── NotificationWorker.ts
│   │   └── ScheduledWorker.ts
│   ├── services/             # Shared service connections
│   │   ├── mongodb.ts
│   │   ├── redis.ts
│   │   ├── llm.ts
│   │   └── cortex.ts
│   └── health.ts
├── package.json
├── tsconfig.json
├── ecosystem.config.js       # PM2 configuration
└── Dockerfile
```

**PM2 Configuration:**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'pipeline-worker',
      script: './dist/index.js',
      instances: 2,
      env: {
        WORKER_TYPE: 'pipeline',
        REDIS_URL: process.env.REDIS_URL
      }
    },
    {
      name: 'llm-worker',
      script: './dist/index.js',
      instances: 4,
      env: {
        WORKER_TYPE: 'llm',
        REDIS_URL: process.env.REDIS_URL
      }
    },
    // ... other workers
  ]
};
```

**Changes to SvelteKit:**
- Remove worker initialization from `hooks.server.ts`
- Keep queue submission code (services still work)
- Set `ENABLE_WORKERS=false`

**Effort:** 5-7 days

---

#### 4. Prometheus Metrics & Grafana Dashboards

**Purpose:** Production-grade monitoring and alerting.

**When to implement:** Before production deployment or when debugging performance issues.

**Metrics to export:**

```typescript
// API Server metrics
http_request_duration_seconds{method, path, status}
http_requests_total{method, path, status}
http_connections_active

// Queue metrics
bullmq_queue_size{queue, status}
bullmq_job_duration_seconds{queue}
bullmq_jobs_processed_total{queue, status}

// Worker metrics
worker_active_jobs{worker}
worker_processed_total{worker, status}

// LLM metrics
llm_calls_total{provider, model, status}
llm_call_duration_seconds{provider, model}
llm_tokens_total{provider, model, type}

// Realtime metrics (if extracted)
sse_connections_active
sse_messages_sent_total
```

**What's needed:**

```
monitoring/
├── prometheus/
│   ├── prometheus.yml        # Prometheus config
│   └── alerts.yml            # Alert rules
├── grafana/
│   ├── provisioning/
│   │   ├── dashboards/
│   │   │   ├── api-overview.json
│   │   │   ├── queue-health.json
│   │   │   ├── worker-metrics.json
│   │   │   └── llm-usage.json
│   │   └── datasources/
│   │       └── prometheus.yml
│   └── grafana.ini
└── docker-compose.monitoring.yml
```

**Alert examples:**

```yaml
groups:
  - name: queue-alerts
    rules:
      - alert: QueueBacklog
        expr: bullmq_queue_size{status="waiting"} > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue }} has backlog"

      - alert: HighJobFailureRate
        expr: rate(bullmq_jobs_processed_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
```

**Effort:** 2-3 days

---

#### 5. Redis Sentinel/Cluster

**Purpose:** High availability Redis for production.

**When to implement:** When Redis downtime is unacceptable.

**Options:**

| Option | Complexity | Use Case |
|--------|------------|----------|
| Redis Sentinel | Medium | Automatic failover, 3+ nodes |
| Redis Cluster | High | Horizontal scaling, sharding |
| Managed Redis | Low | AWS ElastiCache, Redis Cloud |

**Sentinel setup:**

```yaml
# docker-compose.redis-ha.yml
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379

  redis-replica-2:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  redis-sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
```

**Code changes:**

```typescript
// connection.ts - Sentinel support
import Redis from 'ioredis';

const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 }
  ],
  name: 'mymaster'  // Sentinel master name
});
```

**Effort:** 2-4 days

---

#### Benefits & Trade-offs Summary

##### 1. Production Caddy Gateway

| Benefits | Trade-offs |
|----------|------------|
| ✅ Automatic TLS with Let's Encrypt | ❌ Another service to manage |
| ✅ Simple, readable configuration | ❌ Learning curve if unfamiliar |
| ✅ Built-in rate limiting | ❌ Single point of failure (needs HA for prod) |
| ✅ Load balancing across instances | ❌ Adds network hop latency (~1-2ms) |
| ✅ Hot reload without downtime | |
| ✅ Enables future service extraction | |

**Skip if:** Single server deployment with existing reverse proxy (nginx).

---

##### 2. Separate Realtime Server

| Benefits | Trade-offs |
|----------|------------|
| ✅ Scale SSE connections independently | ❌ Additional service to deploy/monitor |
| ✅ Main API stays fast (no connection blocking) | ❌ Code duplication for shared logic |
| ✅ 10,000+ connections per instance | ❌ Network complexity (Caddy routing) |
| ✅ Graceful deploys (connections survive API restart) | ❌ Redis becomes critical path |
| ✅ Memory isolation (SSE buffers separate) | ❌ Cross-service debugging harder |

**Skip if:** < 500 concurrent SSE connections and API latency is acceptable.

---

##### 3. Separate Execution Service

| Benefits | Trade-offs |
|----------|------------|
| ✅ Scale workers independently | ❌ Significant code extraction effort |
| ✅ Deploy workers without API downtime | ❌ Shared service connections to manage |
| ✅ Different instance sizes (CPU-heavy workers) | ❌ Two codebases to maintain |
| ✅ Resource isolation | ❌ Testing complexity increases |
| ✅ Failure isolation (worker crash ≠ API crash) | ❌ Deployment pipeline changes |
| ✅ Can use different Node.js versions | ❌ MongoDB/Redis connection pooling |

**Skip if:** Workers don't impact API performance and single deployment is simpler.

---

##### 4. Prometheus Metrics & Grafana

| Benefits | Trade-offs |
|----------|------------|
| ✅ Production-grade monitoring | ❌ Infrastructure overhead (Prometheus, Grafana) |
| ✅ Historical data for debugging | ❌ Storage requirements for metrics |
| ✅ Custom alerting rules | ❌ Alert fatigue if not tuned properly |
| ✅ Beautiful dashboards | ❌ Initial setup time |
| ✅ Industry standard (team familiarity) | ❌ Learning curve for PromQL |
| ✅ Integration with PagerDuty/Slack | |

**Skip if:** Simple logging is sufficient and no SLA requirements.

---

##### 5. Redis Sentinel/Cluster

| Benefits | Trade-offs |
|----------|------------|
| ✅ Automatic failover (Sentinel) | ❌ 3+ Redis instances required |
| ✅ No single point of failure | ❌ Operational complexity |
| ✅ Read scaling with replicas | ❌ Split-brain scenarios possible |
| ✅ Data persistence across failures | ❌ Network partitioning issues |
| ✅ Required for uptime SLAs | ❌ Higher infrastructure cost |

**Alternative:** Use managed Redis (AWS ElastiCache, Redis Cloud) - less effort, higher cost.

**Skip if:** Acceptable to have brief Redis downtime and manual recovery.

---

#### Decision Matrix

| Scenario | Recommended Enhancements |
|----------|--------------------------|
| **MVP/Single Server** | None - current setup is sufficient |
| **Production (basic)** | Caddy + Prometheus |
| **Production (high traffic)** | Caddy + Realtime Server + Prometheus |
| **Production (enterprise)** | All enhancements |
| **Cost-sensitive** | Caddy + managed Redis (skip self-hosted HA) |

---

#### Current Architecture vs Full Enhancement

**Current (Implemented):**
```
┌─────────────────────────────────────────┐
│           SvelteKit Server              │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │  API    │ │ Workers │ │   SSE    │  │
│  │ Routes  │ │(in-proc)│ │ Streams  │  │
│  └─────────┘ └─────────┘ └──────────┘  │
└─────────────────┬───────────────────────┘
                  │
              ┌───▼───┐
              │ Redis │
              └───────┘
```
- ✅ Simple deployment
- ✅ Easy debugging
- ⚠️ Workers can block API
- ⚠️ SSE connections consume API resources

**Full Enhancement:**
```
┌─────────────┐
│   Caddy     │ ← TLS, Rate Limiting, Load Balancing
└──────┬──────┘
       │
┌──────┼─────────────────────────────────────┐
│      │                                      │
│  ┌───▼───┐  ┌───────────┐  ┌────────────┐ │
│  │  API  │  │ Realtime  │  │ Execution  │ │
│  │Server │  │  Server   │  │  Service   │ │
│  └───┬───┘  └─────┬─────┘  └──────┬─────┘ │
│      │            │               │        │
│      └────────────┼───────────────┘        │
│                   │                         │
│           ┌───────▼───────┐                │
│           │ Redis Sentinel│                │
│           │   (3 nodes)   │                │
│           └───────────────┘                │
│                                             │
│           ┌───────────────┐                │
│           │  Prometheus   │                │
│           │   + Grafana   │                │
│           └───────────────┘                │
└─────────────────────────────────────────────┘
```
- ✅ Independent scaling
- ✅ High availability
- ✅ Production monitoring
- ⚠️ More complex deployment
- ⚠️ Higher infrastructure cost

---

#### Implementation Priority

| Enhancement | Priority | Trigger |
|-------------|----------|---------|
| Production Caddy | High | Before production deploy |
| Prometheus/Grafana | High | Before production deploy |
| Separate Realtime | Medium | SSE connections > 1000 |
| Separate Execution | Medium | Worker load affects API |
| Redis HA | Medium | Uptime SLA requirements |

---

#### Total Effort Estimates

| Enhancement | Effort | Dependencies |
|-------------|--------|--------------|
| Production Caddy | 1-2 days | None |
| Separate Realtime Server | 3-5 days | Caddy |
| Separate Execution Service | 5-7 days | None |
| Prometheus/Grafana | 2-3 days | None |
| Redis Sentinel | 2-4 days | None |
| **Total (all)** | **13-21 days** | - |
