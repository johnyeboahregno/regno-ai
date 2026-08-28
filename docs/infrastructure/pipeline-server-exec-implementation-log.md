# Pipeline Server-Side Execution — Implementation Log

Purpose: Track decisions, steps, and progress migrating the Data Management Pipeline execution from client-side to server-side. This log is the single source of truth to resume work after interruptions.

Status: In progress (Phase 1)

Last updated: 2025-09-03

---

## Decisions (Confirmed)
- Transport: Start with Server-Sent Events (SSE) for telemetry; REST for control. Consider WebSockets later if needed.
- Graph Source: Prefer `pipelineId` (server loads and snapshots). Allow inline `graph` for unsaved runs; server still snapshots.
- Events (V1): `execution_started`, `node_started`, `node_completed`, `node_error`, `execution_completed`, `execution_failed`, `heartbeat`.
- Control: Require pause/resume and stop (idempotent control endpoints).
- Access Control: Anyone with `pipeline.execute` may start pipelines. Stream/control access scoped to owner or `monitoring:stream` / `admin.manage_execution`.
- Persistence: Persist execution history with snapshot + summary stats.
- Data Preview: Defer raw record streaming; plan later with sampling/redaction.

---

## High-Level Architecture
- Client UI remains the pipeline designer; execution moves to the server.
- Start triggers `POST /api/pipelines/executions` → returns `executionId`.
- Client opens `GET /api/pipelines/executions/:id/stream` (SSE) and renders minimal progress.
- Control via `POST /api/pipelines/executions/:id/{pause|resume|stop}`.
- Server validates permissions, normalizes and snapshots the graph, schedules work on the existing execution queue, emits lifecycle events, and persists execution records.

---

## Server Work Items (Planned)
1) Types and Storage
- [x] Add execution event types: `src/lib/types/executionEvents.ts`.
- [x] Add pipeline execution storage: `src/lib/server/persistence/pipelineExecutionStorage.ts`.
- [x] Add in-memory event bus: `src/lib/server/monitoring/pipelineExecutionBus.ts`.

2) Orchestrator & Integration
- [x] Add server orchestrator: `src/lib/server/execution/pipelineServerExecutor.ts` (Phase 1: simulated lifecycle with heartbeat and completion timers).
- [~] Integrate with existing `executionQueue`/`nodeExecutor` for real pipeline run (Phase 2/3) — graph runner wired; cooperative controls added.

3) Endpoints
- [x] `POST /api/pipelines/executions` → `src/routes/api/pipelines/executions/+server.ts` (create; returns `{ executionId }`).
- [x] `GET /api/pipelines/executions/[id]/stream` → `src/routes/api/pipelines/executions/[id]/stream/+server.ts` (SSE).
- [x] `POST /api/pipelines/executions/[id]/pause` → `src/routes/api/pipelines/executions/[id]/pause/+server.ts`.
- [x] `POST /api/pipelines/executions/[id]/resume` → `src/routes/api/pipelines/executions/[id]/resume/+server.ts`.
- [x] `POST /api/pipelines/executions/[id]/stop` → `src/routes/api/pipelines/executions/[id]/stop/+server.ts`.
- [ ] Optional (Phase 2+): `GET /api/pipelines/executions/[id]` (status), list/filter endpoint.

4) Permissions
- Enforce `pipeline.execute` to start.
- Stream/Control: allow if user started the execution or holds `monitoring:stream` / `admin.manage_execution`.

---

## Client Work Items (Planned)
1) Start/Control Cutover
- Update `src/lib/components/DataManagementCanvas.svelte` and `src/lib/components/NodeToolbar.svelte`:
  - Replace local `NodeCoordinator.runNode()` with `POST /api/pipelines/executions` (prefer `pipelineId`).
  - Open SSE stream for feedback; map events to running/completed/error visuals.
  - Route Pause/Resume/Stop to control endpoints (no client-side execution).

2) Client Service
- Add `src/lib/services/pipelineExecutionClient.ts` to encapsulate start/control calls and SSE subscription.

3) Feature Flag / Cleanup
- Guard legacy client execution paths behind a flag; remove once server path is stable.

---

## Event Schema (Initial)
Common envelope:
```json
{ "type": "node_started", "executionId": "...", "ts": 1735944050000, "payload": { /* event-specific */ } }
```
- execution_started: `{ pipelineId?, startedAt }`
- node_started: `{ nodeId, name, type }`
- node_completed: `{ nodeId, outputSize? }`
- node_error: `{ nodeId, message }`
- execution_completed: `{ durationMs }`
- execution_failed: `{ message }`
- heartbeat: `{}`

---

## Step-by-Step Plan (Phases)
Phase 1 — Skeleton & Minimal Run Path
- [x] Add types and storage skeletons.
- [x] Implement `POST /api/pipelines/executions` (validate, snapshot, schedule, return `executionId`).
- [x] Implement SSE stream endpoint (subscribe by `executionId`, forward events).
- [ ] Wire Start button to server; show minimal progress via SSE.
- [x] Add Stop endpoint and hook Stop button.

Phase 2 — Pause/Resume & History
- [~] Implement pause/resume semantics in executor; control endpoints (pause/resume flags + DB‑boundary checks in runner).
- [ ] Persist execution history (status, counters, duration) and add status/read APIs.
- [ ] Admin view integration (basic list + details).

Phase 3 — Hardening & Enhancements
- [ ] Ownership safeguards on streams/control.
- [ ] Backpressure and event collapsing.
- [ ] Optional WebSocket upgrade path.
- [ ] Data preview (sampled/redacted) events.

---

## Recovery Instructions
If interrupted, resume from the first unchecked item in the current Phase.
Primary files to check:
- Types: `src/lib/types/executionEvents.ts`
- Storage: `src/lib/server/persistence/pipelineExecutionStorage.ts`
- Orchestrator: `src/lib/server/execution/pipelineServerExecutor.ts`
- Endpoints: `src/routes/api/pipelines/executions/**/+server.ts`
- Client service: `src/lib/services/pipelineExecutionClient.ts`
- UI wiring: `src/lib/components/DataManagementCanvas.svelte`, `src/lib/components/NodeToolbar.svelte`

Search anchors:
- `rg -n "pipelineServerExecutor|pipelineExecutionStorage|execution_events|SSE stream|pipeline execution"`

---

## Notes / Open Questions (Answered)
- Use `pipeline.execute` (standardized); we can alias `execute.pipeline` later if needed.
- Whole-execution pause/resume (node-level pause may follow after Phase 2 if required).
- Retention window TBD (recommend 14–30 days) — set before Phase 2 persistence.
Phase 2 — Orchestration (In Progress)
- [x] Emit node-level events (started/completed) in server executor.
- [x] Integrate real data-source execution (Mongo/Postgres) without HTTP calls (internal drivers in `pipelineGraphRunner`).
- [x] Propagate outputs downstream (basic fan-in, pass-through buffer, Mongo/Postgres sinks; code via worker queue).
- [x] Emit progress counts per node (`node_progress` in transform batches and sink batches).
- [~] Implement pause/resume at long-running boundaries (DB ops cancellation / timeouts):
  - PG sinks: cancellation via `pg_cancel_backend` + terminate fallback.
  - Mongo source/sink: `AbortController` with signals to drivers.
  - Cooperative pause/stop checks at batch boundaries (sources, transforms, sinks).

Admin & UI (Phase 2 additions)
- [x] Server Executions tab: `src/lib/components/admin/AdminExecutionsTab.svelte` integrated into `src/routes/admin/+page.svelte` (tab "Server Execs").
- [x] Execution details are accessed via the Server Executions tab (standalone `src/routes/admin/executions/*` routes removed).

---

## Recent Changes (2025‑09‑03)
- Runner wiring fixes: pass `hooks` and `executionId` to Mongo/PG sources, transforms, and sinks.
- Server executor `start` is now async; creation persisted before run dispatch.
- Cancellation registry usage:
  - PG sinks register a cancel function (cancel then terminate fallback).
  - PG sources now register per-connection cancel functions; loops check pause/stop between paged queries.
  - Mongo source/sink register `AbortController` to allow aborting in‑flight ops.
- Added cooperative pause/stop checks before each long‑running batch/DB call.
- Added retry/backoff:
  - Exponential backoff with jitter (base 250ms, max 2000ms, 3 attempts).
  - Applied to PG `client.query(...)` (sources/sinks) and Mongo sink `insertMany`/`bulkWrite`.
  - Retries only on transient errors (timeouts, resets, network/socket issues); respects stop/pause.
- Persisted execution events:
  - Added `mongoExecutionEvents` with TTL, indexes; writes on `pipelineExecutionBus.publish` when Mongo is configured.
  - Added Events API: `GET /api/pipelines/executions/:id/events` with filters and pagination.
  - Backpressure: bus-level sampling (`EVENTS_SAMPLE_RATE`) and simple time-based coalescing (`EVENTS_COALESCE_MS`) for `node_progress`.
- Pagination/UI:
  - List endpoints return `{ items, total, limit, offset, hasMore, nextOffset }` with filters (status, pipelineId, date range).
  - Admin list UI updated to include ended/duration; next step adds paging controls.
