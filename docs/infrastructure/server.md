# Server Execution – Project Log (alias: "server")

Purpose
- Single-source log for the server‑side pipeline execution project. Use this to summarize progress and enumerate next steps. When prompted with "update on server", provide the Brief Review below. When prompted with "server next", provide the Next Steps list below (including suggestions previously offered).
- always update this file on patches/updates - to keep everything upto date

Brief Review (What’s Implemented)
- Architecture & Types
  - SSE transport for telemetry; REST endpoints for control.
  - Types for pipeline events and execution records; in‑memory storage and per‑execution event bus.
- Endpoints
  - Start: `POST /api/pipelines/executions` (accepts `pipelineId` or inline graph, optional `entryNodeId`).
  - Stream: `GET /api/pipelines/executions/:id/stream` (SSE).
  - Control: `POST /api/pipelines/executions/:id/{pause|resume|stop}`.
  - Status/List: `GET /api/pipelines/executions?id=...` and list with filters.
  - Event Logs: Events are persisted to MongoDB when `MONGO_EXECUTION_URI` is set.
  - Events API: `GET /api/pipelines/executions/:id/events?type=...&nodeId=...&from=...&to=...&limit=...&offset=...&order=asc|desc` returns `{ items, total, limit, offset, hasMore, nextOffset }`. Optional `sample` (0–1) to downsample results.
  - Events CSV: `GET /api/pipelines/executions/:id/events.csv` with same filters; returns CSV.
  - Summary: `GET /api/pipelines/executions/:id/summary` returns `{ executionId, status, updatedAt, summary }` for lightweight polling.
- Server Orchestration
  - Graph runner executes a snapshot: Mongo/Postgres data sources, buffer pass‑through, code/transform nodes via worker queue, Mongo & Postgres sinks (batch writes).
  - Batch size derived from nearest upstream buffer or sink config; emits node events (`started`, `progress`, `completed`, `error`).
  - Tracks execution summary totals (savedTotal, batchTotal).
- Client Cutover
  - Start/Pause/Resume/Stop routed to server; no client‑side execution.
  - UI reflects SSE events (node started/completed/error; progress); node overlays show input/output counts; sinks show saved/batches.
- Admin
  - "Server Execs" tab lists executions with status and mini totals; actions to pause/resume/stop.
  - Execution detail page streams live events, grouped by node; also shows raw event stream.
- Security
  - JWT + signed headers; enforce `pipeline.execute` for start; stream/control allowed for owner or users with `monitoring:stream`/`admin.manage_execution`.

Next Steps (Backlog & Enhancements)
- Execution Reliability & Control
  - Pause/resume at long‑running DB boundaries:
    - [x] Postgres statement timeouts and chunked paging with cooperative checks.
    - [x] Mongo cursor batching with cooperative pause/stop checks.
    - [x] Postgres sink cancellation hooks wired (registry + pg_cancel_backend with terminate fallback).
    - [x] Postgres source cancellation hooks (per-connection cancel/terminate) with cooperative checks in paging loops.
    - [x] Mongo source/sink cancellation via AbortController; signals plumbed into find/bulkWrite/insertMany where supported.
  - Checkpointing/Resume:
    - [x] Store lastCompletedNodes in execution summary for basic checkpoints.
    - [~] Start API accepts completedNodeIds; basic skip semantics implemented; full DAG resume correctness to follow.
- Eventing & Progress
  - Emit transform/code progress for large datasets (chunk input, publish `node_progress`).
  - Enrich sink events with per‑batch stats (failures, upserts vs updates), optional `RETURNING` for precise counts in Postgres.
  - Error handling: propagate `node_error` to UI (canvas/admin) with badges and last‑error summaries.
  - Telemetry: `node_progress` now includes `batchLatencyMs` and `retries` for code chunks and sink batches.
  - Backpressure: Optional sampling (`EVENTS_SAMPLE_RATE`) and coalescing (`EVENTS_COALESCE_MS`) applied to `node_progress` publishing and persistence.
- Persistence & History
  - Move execution storage from in-memory to durable store (DB).
    - [x] Initial MongoDB-backed store (URI via env) with TTL index and basic list/get/update.
    - [x] Full pagination metadata and richer filters; indexes for query patterns.
  - Persist execution event logs (TTL):
    - [x] MongoDB collection for events with TTL index; bus writes asynchronously when configured.
    - [ ] UI retrieval/sampling (detail page currently streams live; historical fetch TBD).
  - Maintenance & Retention:
    - [x] Startup ensures core Mongo indexes (best-effort).
    - [x] Admin endpoint to view and change TTL (days) for executions/events: `GET/POST /api/admin/maintenance/persistence`.
    - [x] Admin UI panel (in Server Execs tab) to inspect indexes and update TTL.
  - Dead-letter handling:
    - [x] Dead-letter persistence for failed sink batches (Mongo and Postgres) with context and payload sample.
    - [x] Admin API to list and retry dead letters: , .
    - [ ] UI surface on execution detail (view dead letters per execution, retry buttons).
  - Node stats aggregation:
    - [x] Aggregate per-node stats in runner and persist under `summary.nodeCounts` (started, completed, errors, totalRetries, avg/min/max latency).
  - Extend list/status APIs with richer filters (by pipelineId, date ranges, user) and paging metadata.
- UI – Canvas
  - Show live savedSoFar for sinks inside node overlay.
  - Render error badges on nodes upon `node_error`, with quick hover for last error.
  - Optional global progress panel (aggregate across nodes).
- UI – Admin
  - Execution detail: loads persisted history first (paged), then attaches live SSE; node state panel (last status, counts, last error); filter by node/event type; search; export JSON/CSV; "Load older" for history.
  - List view: add quick progress bars and saved/batch counters; link to pipeline details.
  - Filters: status, pipelineId, and date ranges (24h/7d/30d).
  - Search: executionId substring filter (client-side) in AdminExecutionsTab.
- Data & Schema
  - Postgres: type coercion and schema‑aware validation; composite key helpers; preview `RETURNING` support for upserts.
  - Mongo: optional JSON schema validation; redaction masks for sensitive fields in future previews.
- API & Transport
  - Optional WebSocket upgrade when duplex interactivity or high‑volume streaming is needed.
  - CSV export endpoint for event history.
  - WebSocket endpoint (adapter dependent): `GET /api/pipelines/executions/:id/ws` upgrades to WS and streams the same events as SSE.
  - Backpressure control per execution:
    - `GET /api/pipelines/executions/:id/backpressure` → returns `{ sampleRate, coalesceMs, source }`.
    - `POST /api/pipelines/executions/:id/backpressure` → set overrides `{ sampleRate?, coalesceMs? }` or `{ clear: true }` (requires `admin.manage_execution`).
  - Versioned event schema for forward compatibility.
- Security & Multi‑Tenant
  - Harden ownership checks across all endpoints; add org/team scoping if needed.
  - Rate limits for start/control/stream endpoints.
- DevEx & Tests
  - Integration tests for endpoints and runner (happy paths + failures); load tests for SSE streams.
  - CI hooks to validate TypeScript types and route contracts.

Suggestions from prior prompts (rolled into next steps)
- Add mid‑batch progress events and progress bars in UI. (DONE)
- Add savedCount/batchCount to sink completion events; display in canvas and admin. (DONE)
- Provide a Postgres columns endpoint and wire into UI for sink validation. (API DONE; UI wiring TBD)
- Improve pause/resume responsiveness for long operations. (OPEN)
- Stream data previews with redaction and sampling (later enhancement). (OPEN)

Status
- Active. See docs/pipeline-server-exec-implementation-log.md for detailed step history.
- Global progress panel (canvas):
  - [x] Show aggregate progress across nodes using `node_progress`.
  - [ ] Aggregate savedSoFar as an overall counter for sinks.
- Admin detail UX:
  - [x] Add node filter, event-type toggles, search, and export JSON.
  - [ ] Add node state panel (last status, error) and quick actions.
- Postgres/Mongo sources:
  - [x] Cooperative paging (LIMIT/OFFSET for PG; cursor batching for Mongo) with pause/stop checks.
  - [~] Cancellation hooks: PG sinks use cancel/terminate; extend to PG sources.

Recent
- Added cooperative pause/stop checks at per‑batch boundaries for PG/Mongo sinks and transform chunking.
- Wired cancellation registry:
  - PG sinks: `pg_cancel_backend(pid)` with timed `pg_terminate_backend(pid)` fallback.
  - Mongo source/sink: `AbortController` propagated to `find`, `insertMany`, `bulkWrite`.
- Fixed runner wiring to pass `hooks`/`executionId` to sources/transforms/sinks; improved stability.

Retry/Backoff Policy
Transient Error Classification
- Expanded retry classification for common transient cases:
  - Network/socket/timeout signals (ETIMEDOUT, ECONNRESET, etc.).
  - Postgres SQLSTATEs: 40001 (serialization_failure), 40P01 (deadlock_detected), 57014 (query_canceled).
  - Mongo retryable codes and step-down conditions.
- Scope: Postgres queries (sources and sinks) and Mongo sink writes (`insertMany`, `bulkWrite`).
- Attempts: 3 (configurable), exponential backoff starting at 250ms up to 2000ms.
- Jitter: enabled to avoid thundering herd.
- Classification: retries on timeouts, connection resets/terminated, common network/socket errors, and retryable Mongo write indications.
- Cooperation: aborts early if execution is stopped; pauses between retries respect global pause.

Telemetry Fields
- `node_progress` payload may include:
  - `batchLatencyMs`: duration of the batch/chunk operation in milliseconds.
  - `retries`: number of retries performed for that operation (0 if none).
 - Aggregated in `summary.nodeCounts` for history (avg/min/max latency, total retries).

Environment
- Execution persistence (Mongo):
  - `MONGO_EXECUTION_URI`, `MONGO_DB_NAME`, `MONGO_EXECUTION_COLLECTION`, `MONGO_EXECUTION_TTL_DAYS`
- Event logs persistence (Mongo):
  - `MONGO_EXECUTION_EVENTS_COLLECTION`, `MONGO_EXECUTION_EVENTS_TTL_DAYS`
- Retry policy:
  - `RETRY_ATTEMPTS`, `RETRY_BASE_MS`, `RETRY_MAX_MS`
- Event backpressure (progress events):
  - `EVENTS_SAMPLE_RATE` (0<rate≤1), `EVENTS_COALESCE_MS` (ms per node/exec)
  - Dynamic sampling (optional): `EVENTS_AUTOSAMPLE_ENABLED`, `EVENTS_TARGET_RPS`, `EVENTS_MIN_SAMPLE_RATE`, `EVENTS_MAX_SAMPLE_RATE`, `EVENTS_AUTOSAMPLE_WINDOW_MS`

  - Dead-letter redaction (export): `DEADLETTER_REDACT_FIELDS` (comma-separated field names to redact in payload samples)

Runbooks & Recipes

Tuning event sampling and coalescing
- Fixed sampling: set `EVENTS_SAMPLE_RATE` (e.g., `0.25` to keep ~25% of `node_progress`).
- Time coalescing: set `EVENTS_COALESCE_MS` (e.g., `250`) to suppress bursty progress from the same node/execution within 250ms.
- Dynamic sampling: enable `EVENTS_AUTOSAMPLE_ENABLED=true` and set targets:
  - `EVENTS_TARGET_RPS` (e.g., 100), `EVENTS_MIN_SAMPLE_RATE` (e.g., 0.05), `EVENTS_MAX_SAMPLE_RATE` (e.g., 1), `EVENTS_AUTOSAMPLE_WINDOW_MS` (e.g., 1000).
- Per-execution override at runtime: `POST /api/pipelines/executions/:id/backpressure` with `{ sampleRate, coalesceMs }` (or `{ clear: true }`).

Setting dead-letter thresholds
- Env defaults:
  - `DEADLETTER_MAX_PER_EXECUTION=100`
  - `DEADLETTER_FAIL_ON_FIRST=false`
- Per-execution override at runtime:
  - `POST /api/pipelines/executions/:id/deadletter-policy` with `{ maxPerExecution, failOnFirst }` (or `{ clear: true }`).
- Export dead letters for an execution:
  - JSON: `GET /api/admin/deadletters/export?executionId=...&format=json`
  - CSV: `GET /api/admin/deadletters/export?executionId=...&format=csv`
  - Redaction: set `DEADLETTER_REDACT_FIELDS` to mask fields in payload samples.
- Retry/delete:
  - Retry one: `POST /api/admin/deadletters/:id/retry`
  - Delete one: `DELETE /api/admin/deadletters/:id/retry`
  - Bulk delete (e.g., resolved): `DELETE /api/admin/deadletters?executionId=...&status=resolved`

Prometheus metrics
- Scrape endpoint: `GET /api/admin/metrics/prometheus`
  - If `METRICS_SECRET` is set, include header `X-Metrics-Secret: <secret>`.
  - Otherwise, include admin auth headers.
- Exposed series (examples):
  - `regno_events_published_total{type="node_progress"}`
  - `regno_retries_total{nodeType="mongo"}`
  - `regno_deadletters_total{type="postgres",operation="upsert"}`
  - `regno_executions_running`
  - `regno_batch_latency_ms_bucket{le="100"}`, `regno_batch_latency_ms_sum`, `regno_batch_latency_ms_count`

Resume preview (preflight)
- Endpoint: `GET /api/pipelines/executions/:id/resume-preview` returns:
  - `readyNodes`: nodes that can safely start given completed predecessors
  - `blockedNodes`: nodes plus missing predecessor node IDs
- Use before resuming to validate `completedNodeIds` or checkpoints.

WebSocket vs SSE
- SSE is default; good for moderate volumes and simplicity. Auto-reconnect is implemented with backoff.
- WebSocket recommended for high-volume event streams. Toggle in the execution detail UI; stored in localStorage.
- WS endpoint: `GET /api/pipelines/executions/:id/ws?token=...` (adapter dependent; falls back to SSE if unsupported).

Postgres keyset pagination
- For large tables, use `keysetColumns` in the source node config, e.g., `['id']` or a composite key list.
- The runner will ORDER BY these columns and page using tuple comparison, avoiding large OFFSET scans.

Mongo source options
- `maxTimeMS`: apply a server-side time limit to `find` operations.
- `readPreference`: use `secondary` or other modes for read scaling (if topology allows).
- `batchSize`: control cursor batch size (default 1000).

