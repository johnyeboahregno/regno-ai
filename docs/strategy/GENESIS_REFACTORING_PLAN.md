# GENESIS System Refactoring Plan

## Executive Summary
This document outlines the comprehensive refactoring plan for the Genesis (formerly Flux) workflow orchestration system based on the architecture audit conducted on 2026-01-02.

### ✅ ALL SPRINTS COMPLETE (2026-01-02)

| Sprint | Focus | Status | Key Metrics |
|--------|-------|--------|-------------|
| Sprint 1 | StageOrchestrator Decomposition | ✅ COMPLETE | 2242 → 1636 lines (-27%) |
| Sprint 2 | Pipeline Runner Decomposition | ✅ COMPLETE | 6763 → 3101 lines (-54%) |
| Sprint 3 | Event System Consolidation | ✅ COMPLETE | Unified EventBus + adapters |
| Sprint 4 | Testing Infrastructure | ✅ COMPLETE | 294 tests passing |

**Total Code Reduction**: ~4,268 lines extracted into focused, testable modules.

---

## Phase 0: Naming & Identity (P0 - COMPLETED)

### Rename: Flux → GENESIS
**Rationale**: "Flux" is generic and doesn't convey the system's power. GENESIS better represents the AI-driven pipeline generation/creation capabilities - it's the "genesis" of workflows.

**Files Updated**:
- UI components (AboutModal, MessageCenter, TickerTape, etc.)
- Server code (stage executors, helpers, services)
- Type definitions (GenesisConfig, GenesisPipelineReference)
- Variable names (genesisLink, genesisContext, etc.)

**Impact**: Low risk, high value for brand identity ✅

---

## Phase 1: Architecture Decomposition (P0 - Critical)

### 1.1 Split StageOrchestrator.ts (2242 lines → 1636 lines) ✅ COMPLETE

**Original**: `src/lib/server/stage/v2/StageOrchestrator.ts` - 2242 lines
**Current**: 1636 lines (**-606 lines, 27% reduction**)

**Completed Structure**:
```
src/lib/server/stage/v2/
├── StageOrchestrator.ts        (1636 lines - coordination + phase logic)
├── orchestration/
│   ├── index.ts                ✅ Re-exports all modules
│   ├── StageEventEmitter.ts    ✅ EXTRACTED (2026-01-02)
│   ├── StageEventReporter.ts   ✅ EXTRACTED & WIRED (2026-01-02)
│   ├── SessionStateManager.ts  ✅ EXTRACTED & WIRED (2026-01-02)
│   └── ErrorRecoveryHandler.ts ✅ EXTRACTED & WIRED (2026-01-02)
├── config/
│   ├── index.ts                ✅ Re-exports
│   └── SmartConfigurationEngine.ts ✅ EXTRACTED & WIRED (2026-01-02)
├── analysis/
│   ├── index.ts                ✅ Re-exports
│   └── DataStrategyAnalyzer.ts ✅ EXTRACTED & WIRED (2026-01-02)
├── learning/
│   ├── index.ts                ✅ Re-exports
│   └── PatternLearningService.ts ✅ EXTRACTED & WIRED (2026-01-02)
├── validation/
│   ├── index.ts                ✅ Re-exports
│   └── QualityAssuranceManager.ts ✅ EXTRACTED & WIRED (2026-01-02)
└── utils/
    └── ProjectDomains.ts       ✅ EXTRACTED (2026-01-02)
```

**Completed Extractions & Wiring (2026-01-02)**:
- `orchestration/StageEventEmitter.ts` - Event subscription and emission
- `orchestration/StageEventReporter.ts` - Typed event reporting methods
- `orchestration/SessionStateManager.ts` - Session state CRUD operations
- `orchestration/ErrorRecoveryHandler.ts` - Error creation and recovery
- `config/SmartConfigurationEngine.ts` - Node configuration with smart defaults (~350 lines saved)
- `analysis/DataStrategyAnalyzer.ts` - Data strategy analysis (~107 lines saved)
- `validation/QualityAssuranceManager.ts` - Pipeline validation and learning (~40 lines saved)
- `utils/ProjectDomains.ts` - PROJECT_TYPE_DOMAINS, UNIVERSAL_DOMAINS, domain utilities

**Removed Unused Code**:
- `getImageGenNodeTypes()` function
- `FALLBACK_IMAGE_GEN_TYPES` constant
- `applyDefaults()` method (moved to SmartConfigurationEngine)
- `MongoRegistryService` import
- `ValidationEngine` direct import (delegated to QualityAssuranceManager)

**Migration Strategy Used**:
1. ✅ Created new files with extracted classes
2. ✅ Used facade pattern - StageOrchestrator delegates to sub-components
3. ✅ Incremental extraction (one component at a time)
4. ✅ Maintained backward compatibility via re-exports from index.ts files

### 1.2 Split pipelineGraphRunner.ts (6763 lines! - CRITICAL)

**Current**: `src/lib/server/execution/pipelineGraphRunner.ts`

**Analysis (2026-01-02)**:
The file is far larger than initially estimated. Breakdown by function:
```
Line    Function                  Size     Notes
─────────────────────────────────────────────────────────────────
32      normalizeMongoDBDates     ~95      Utility
128     runPipelineGraph         ~1724     MAIN ORCHESTRATOR
1853    runAggregation           ~453      MongoDB aggregation
2306    runMongoSource           ~1291     HUGE - has dead code!
3598    runPostgresSource        ~203
3801    runSmartQuerySource      ~233      Includes Mongo/PG variants
4027    runExpertNode            ~714
4742    applyMongoRedaction...   ~75       Helpers
4838    runCodeTransform         ~49
4887    runDataSink              ~1215     HUGE
6110    runAgentNode             ~248
6359    buildMappedContext...    ~388      Agent helpers
```

**Proposed Split** (Phased Approach):
```
src/lib/server/execution/
├── pipelineGraphRunner.ts      (~500 lines - coordinator only)
├── sources/
│   ├── MongoSourceRunner.ts    (~800 lines after cleanup)
│   ├── PostgresSourceRunner.ts (~200 lines)
│   ├── SmartQueryRunner.ts     (~250 lines)
│   └── index.ts                (re-exports)
├── sinks/
│   ├── DataSinkRunner.ts       (~800 lines after cleanup)
│   └── index.ts
├── nodes/
│   ├── ExpertNodeRunner.ts     (~700 lines)
│   ├── AgentNodeRunner.ts      (~600 lines with helpers)
│   └── index.ts
├── graph/
│   ├── TopologyBuilder.ts      (DAG construction)
│   ├── WaveExecutor.ts         (parallel execution)
│   └── ExecutionContext.ts     (shared state)
├── lifecycle/
│   ├── PauseResumeHandler.ts
│   ├── CheckpointManager.ts
│   └── CancellationHandler.ts
└── utils/
    ├── dataHelpers.ts          (transformations, batching)
    └── mongoHelpers.ts         (date normalization, etc.)
```

**Extraction Priority**:
1. ✅ Created directories: sources/, sinks/, graph/, lifecycle/, utils/
2. ✅ Extracted utils/mongoHelpers.ts (normalizeMongoDBDates, safeGetRec)
3. ✅ Extracted utils/dataHelpers.ts (createBatches, transformations, batching)
4. ✅ Removed dead code (buildMappedContext, renderPrompt, getNestedValue - unused)
5. ✅ Cleaned up imports, added ExecutionHooks alias for backward compat
6. ✅ Removed runMongoSource dead code:
   - Removed `if (false)` block with old coordinated claim code (~145 lines)
   - Removed `if (false)` block with old claiming logic (~293 lines)
   - Removed unused `streamingClaim` function (~95 lines)
7. ✅ Extracted sinks/DataSinkRunner.ts (2026-01-02):
   - Extracted runDataSink function (~1215 lines)
   - Extracted helper functions: applyMongoRedactionAndValidation, applyPgColumnMappings,
     getPgColumnsNamesViaPool, getPgColumnTypesViaPool, coerceRowTypes, resolveBatchSize
   - Created sinks/index.ts for clean exports
   - Supports: context/return, Slack (webhook/bot), PostgreSQL, MongoDB sinks
8. ✅ Extracted sources/PostgresSourceRunner.ts (2026-01-02):
   - Extracted runPostgresSource function (~200 lines)
   - Supports: custom SQL queries, table-based reads, keyset pagination, offset pagination
   - Created sources/index.ts for clean exports
9. ✅ Extracted nodes/ExpertNodeRunner.ts (2026-01-02):
   - Extracted runExpertNode function (~716 lines)
   - Created nodes/index.ts for clean exports
   - Supports: 8-step expert workflow, placeholder interpolation, AI suggestions
10. ✅ Extracted sources/MongoSourceRunner.ts (2026-01-02):
    - Extracted runMongoSource function (~755 lines)
    - Updated sources/index.ts with export
    - Supports: standard find queries, aggregation pipelines, document claiming, sampling
11. **Current file size: 3101 lines**
    **Total reduction: 6763 → 3101 = 3662 lines, ~54% reduction!**
12. ⚠️ runAgentNode - Deferred (tightly coupled with internal execution functions)
    - Depends on: executeUpstreamNode, getNodeInputsRecursively, runDataSourceNode, etc.
    - Would require extracting multiple interdependent functions
    - Consider for future refactoring pass
13. 🔲 Create unified ExecutionContext
14. 🔲 Slim down main runPipelineGraph

---

## Phase 2: Infrastructure Hardening (P1 - High Priority)

### 2.1 Add Circuit Breaker for LLM Calls

**Location**: `src/lib/server/services/llmService.ts`

**Implementation**:
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;      // Default: 5
  recoveryTimeout: number;       // Default: 30000ms
  halfOpenRequests: number;      // Default: 3
}

class LLMCircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures: number = 0;
  private lastFailure: number = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.config.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError('LLM service unavailable');
      }
    }
    // ... implementation
  }
}
```

### 2.2 Add Rate Limiting

**Files**:
- `src/lib/server/middleware/rateLimiter.ts` (NEW)
- Apply to: `/api/pipelines/execute`, `/api/stage/*`, `/api/llm/*`

**Strategy**: Token bucket with per-user limits
```typescript
const limits = {
  pipelineExecutions: { tokens: 10, refillRate: 1/60 },  // 10/min
  llmCalls: { tokens: 100, refillRate: 1/6 },            // 100/10min
  stageGenerations: { tokens: 5, refillRate: 1/60 }      // 5/min
};
```

### 2.3 Add Metrics Collection

**New Service**: `src/lib/server/monitoring/metricsCollector.ts`

**Metrics to Track**:
- `genesis.pipeline.execution.duration` (histogram)
- `genesis.pipeline.execution.success_rate` (gauge)
- `genesis.node.execution.duration` (histogram by type)
- `genesis.llm.call.duration` (histogram by model)
- `genesis.llm.call.tokens` (counter)
- `genesis.checkpoint.count` (gauge)
- `genesis.sse.connections` (gauge)

---

## Phase 3: Event System Consolidation (P1)

### Current Problem
Three overlapping event systems:
1. `pipelineExecutionBus.ts` - TypedEmitter
2. `sseConnectionManager.ts` - SSE events
3. `chartWebSocketService.ts` - WebSocket events

### Solution: Unified Event Bus

**New Architecture**:
```
src/lib/server/events/
├── EventBus.ts              - Central typed event bus
├── adapters/
│   ├── SSEAdapter.ts        - SSE transport
│   ├── WebSocketAdapter.ts  - WS transport
│   └── RedisAdapter.ts      - Redis Pub/Sub
├── handlers/
│   ├── PipelineEventHandler.ts
│   ├── ChartEventHandler.ts
│   └── StageEventHandler.ts
```

**Migration Path**:
1. Create unified EventBus with TypeScript discriminated unions
2. Create adapters that translate to/from existing transports
3. Gradually migrate handlers to use unified bus
4. Deprecate direct transport usage

---

## Phase 4: Testing Infrastructure (P2)

### 4.1 Unit Test Framework

**Structure**:
```
tests/
├── unit/
│   ├── execution/
│   │   ├── WaveExecutor.test.ts
│   │   ├── TopologyBuilder.test.ts
│   │   └── executors/*.test.ts
│   ├── stage/
│   │   ├── PhaseCoordinator.test.ts
│   │   └── ClarificationSystem.test.ts
│   └── services/
│       ├── llmService.test.ts
│       └── checkpointStorage.test.ts
├── integration/
│   ├── pipeline-execution.test.ts
│   ├── checkpoint-resume.test.ts
│   └── stage-generation.test.ts
└── fixtures/
    ├── pipelines/
    └── cortex-patterns/
```

### 4.2 Test Priorities
1. **Critical**: Pipeline execution logic (topological sort, wave execution)
2. **High**: Checkpoint/resume functionality
3. **Medium**: Stage phase transitions
4. **Lower**: UI component tests

---

## Phase 5: Code Organization (P2)

### 5.1 Consolidate Type Definitions

**Current Problem**: Types scattered across 15+ files

**Solution**: Centralized type modules
```
src/lib/types/
├── pipeline.types.ts        - Pipeline, Node, Connection
├── execution.types.ts       - ExecutionState, NodeOutput
├── stage.types.ts           - Phase, Session, Clarification
├── cortex.types.ts          - Pattern, Learning, Reasoning
└── events.types.ts          - All event payloads
```

### 5.2 Extract Shared Utilities

**New Utilities**:
```
src/lib/utils/
├── async/
│   ├── retry.ts             - Unified retry logic
│   ├── timeout.ts           - Timeout wrappers
│   └── cancellation.ts      - CancellationToken
├── validation/
│   ├── pipeline.ts          - Pipeline validation
│   └── config.ts            - Node config validation
└── transform/
    ├── data.ts              - Data transformations
    └── markdown.ts          - Markdown utilities
```

---

## Implementation Timeline

### Sprint 1 (Week 1-2): Foundation ✅ COMPLETE
- [x] Rename Flux → GENESIS in docs/comments
- [x] Create new directory structure (orchestration/, config/, analysis/, learning/, validation/, utils/)
- [x] Extract StageEventEmitter from StageOrchestrator
- [x] Extract StageEventReporter from StageOrchestrator
- [x] Extract SessionStateManager from StageOrchestrator
- [x] Extract ErrorRecoveryHandler from StageOrchestrator
- [x] Extract SmartConfigurationEngine from StageOrchestrator (~350 lines)
- [x] Extract DataStrategyAnalyzer from StageOrchestrator (~107 lines)
- [x] Extract QualityAssuranceManager from StageOrchestrator (~40 lines)
- [x] Extract ProjectDomains utilities
- [x] Wire all extracted services into StageOrchestrator via delegation
- [x] Remove unused code (getImageGenNodeTypes, applyDefaults, etc.)
- **Result**: StageOrchestrator.ts reduced from 2242 → 1636 lines (27% reduction)

### Sprint 2 (Week 3-4): Execution Layer ✅ COMPLETE
- [x] Split pipelineGraphRunner.ts (54% reduction: 6763 → 3101 lines)
  - [x] Extract DataSinkRunner (~1215 lines)
  - [x] Extract PostgresSourceRunner (~200 lines)
  - [x] Extract ExpertNodeRunner (~716 lines)
  - [x] Extract MongoSourceRunner (~755 lines)
  - [ ] AgentNodeRunner (deferred - tightly coupled)
- [x] Add circuit breaker to LLM service (2026-01-02)
  - Created `src/lib/server/utils/circuitBreaker.ts` with per-provider circuit breakers
  - Integrated into `llmService.ts` callLLM function
  - Added admin API endpoint `/api/admin/circuit-breakers`
  - States: closed → open (after 5 failures in 60s) → half-open (after 30s) → closed (after 3 successes)
- [x] Add rate limiting middleware (2026-01-02)
  - Created `src/lib/server/middleware/rateLimiter.ts` with token bucket algorithm
  - Integrated into `hooks.server.ts` for global API rate limiting
  - Endpoint-specific limits: /api/llm (60/min), /api/stage (30/min), /api/pipelines (120/min)
  - Added admin API endpoint `/api/admin/rate-limits` for monitoring and clearing
  - Includes backwards-compatible `rateLimiter` object export for existing code
  - Features: per-user/per-IP limits, automatic bucket cleanup, rate limit headers on responses
- [x] Create metrics collector skeleton (2026-01-02)
  - Extended `src/lib/server/monitoring/metricsRegistry.ts` with Genesis-specific metrics
  - Pipeline metrics: execution duration (histogram), total executions (counter), success rate (gauge)
  - Node metrics: execution duration by type (histogram), execution counts (counter)
  - LLM metrics: call duration (histogram), call totals by model/provider (counter), token usage (counter)
  - Infrastructure metrics: checkpoints (gauge/counter), SSE connections (gauge/counter)
  - Circuit breaker metrics: state changes, trips by provider
  - Rate limiting metrics: hits and blocked requests by endpoint
  - Stage generation metrics: duration (histogram), totals by status/projectType
  - All metrics exportable to Prometheus format via `renderPrometheus()`
- [x] Wire up metrics across services (2026-01-02)
  - **LLM Service** (`src/lib/server/services/llmService.ts`): Records call duration, token usage, success/failure
  - **Circuit Breaker** (`src/lib/server/utils/circuitBreaker.ts`): Records state transitions and circuit trips
  - **Pipeline Runner** (`src/lib/server/execution/pipelineGraphRunner.ts`): Records execution duration, node completion metrics
  - **Checkpoint Storage** (`src/lib/server/services/checkpointStorage.ts`): Records checkpoint creation
  - **SSE Connection Manager** (`src/lib/server/sseConnectionManager.ts`): Records connection/disconnection events
  - **Rate Limiter** (`src/lib/server/middleware/rateLimiter.ts`): Records allowed and blocked requests per endpoint
  - **Prometheus Endpoint**: `/api/admin/metrics/prometheus` exports all metrics

### Sprint 3 (Week 5-6): Event System ✅ COMPLETE
- [x] Create unified EventBus with TypeScript discriminated unions
  - `src/lib/server/events/EventBus.ts` - Central bus with publish/subscribe
  - Auto-sampling and coalescing for high-volume events
  - Middleware pipeline support
- [x] Create SSE adapter for EventBus
  - `src/lib/server/events/adapters/SSEAdapter.ts` - Full SSE transport
  - Connection management, heartbeat, subscription-based routing
- [x] Create WebSocket adapter for EventBus
  - `src/lib/server/events/adapters/WebSocketAdapter.ts` - WebSocket transport
- [x] Create event type definitions
  - `src/lib/server/events/types.ts` - Discriminated unions for all events
  - PipelineEvent (15+ types), StageEvent (15+ types), ChartEvent, SystemEvent
- [x] Create convenience exports
  - `src/lib/server/events/index.ts` - Singleton adapters, helper functions
  - `createSSEStream()`, `publishNodeCompleted()`, etc.
- [x] Add persistence middleware
  - `src/lib/server/events/middleware/PersistenceMiddleware.ts`

### Sprint 4 (Week 7-8): Testing & Polish ✅ COMPLETE
- [x] Set up Vitest test framework for core modules
  - `vitest.config.ts` - Full configuration with coverage, path aliases
  - `tests/setup/globalSetup.ts` - Global test setup
- [x] Write critical path tests (294 tests passing)
  - `tests/unit/execution/topologicalSort.test.ts` - DAG/wave ordering
  - `tests/unit/execution/waveExecution.test.ts` - Parallel node execution
  - `tests/unit/checkpoint/checkpointStorage.test.ts` - Checkpoint persistence
  - `tests/unit/checkpoint/resumeExecution.test.ts` - Resume from checkpoint
  - `tests/unit/events/eventBus.test.ts` - Event publishing/subscribing
  - `tests/unit/events/sseStreaming.test.ts` - SSE transport
  - `tests/unit/queues/lifecycle.test.ts` - Queue system lifecycle
  - `tests/unit/queues/notificationService.test.ts` - Notification queue
  - `tests/unit/queues/schedulerService.test.ts` - Scheduled jobs
  - `tests/unit/queues/types.test.ts` - Queue type definitions
  - `tests/integration/queue-system.test.ts` - Full queue integration
  - `tests/integration/queues/workers.test.ts` - Worker integration
- [x] Create comprehensive test utilities
  - `tests/mocks/env.ts` - Environment mocking
  - `tests/mocks/mockRedis.ts` - Redis mocking for queue tests
  - `tests/mocks/queueTestUtils.ts` - Queue test helpers
  - `tests/mocks/eventTestUtils.ts` - Event test helpers
  - `tests/mocks/pipelineTestUtils.ts` - Pipeline test helpers
  - `tests/mocks/checkpointTestUtils.ts` - Checkpoint test helpers
- [x] Documentation update (this file)

---

## Risk Mitigation

### Backward Compatibility
- All refactored modules export same public API
- Use facade pattern during transition
- Feature flags for new implementations

### Rollback Strategy
- Each phase is independently deployable
- Git tags at each phase completion
- Database migrations are additive only

### Testing Gates
- No merge without passing tests
- Integration tests for critical paths
- Manual QA for UI changes

---

## Success Metrics

1. **Code Quality**
   - No file > 500 lines
   - Test coverage > 60% for core modules
   - Type coverage 100%

2. **Performance**
   - P95 pipeline execution < 30s (unchanged)
   - SSE event latency < 100ms
   - Zero memory leaks in 24h test

3. **Reliability**
   - Circuit breaker prevents cascade failures
   - Rate limiting prevents abuse
   - Checkpoint resume success rate > 95%

---

## Build Issues Fixed (2026-01-02)

During the refactoring session, several pre-existing build issues were identified and fixed:

### 1. Missing regnoLibrary.js
**File**: `src/lib/server/build/regnoLibrary.js`
**Issue**: File was accidentally deleted, causing build failures
**Fix**: Restored from git history (commit d15283e)

### 2. Invalid requireAuth Import (6 files)
**Files**:
- `src/routes/api/knowledge/crawl/+server.ts`
- `src/routes/api/knowledge/files/+server.ts`
- `src/routes/api/knowledge/gdrive/+server.ts`
- `src/routes/api/knowledge/store/mongo/+server.ts`
- `src/routes/api/knowledge/store/neo4j/+server.ts`
- `src/routes/api/knowledge/store/qdrant/+server.ts`

**Issue**: Importing non-existent `requireAuth` from `apiAuth.ts`
**Fix**: Changed to use `requirePermission` with appropriate permissions:
- crawl: `data:read`
- files: `data:read`
- gdrive: `integrations:use`
- mongo store: `data:write`
- neo4j store: `data:write`
- qdrant store: `data:write`

### 3. Invalid getDatabase Import
**File**: `src/lib/server/services/pipelineScoringService.ts`
**Issue**: Importing non-existent `getDatabase` from `mongoService.ts`
**Fix**: Changed to `getMongoDb` from `mongoClient.ts`
