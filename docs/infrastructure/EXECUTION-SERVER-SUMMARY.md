Execution Server — Summary

Overview
- Server-side execution of data pipelines with reliable orchestration, persistence, and monitoring.
- Live telemetry via SSE/WS; persistent history and admin UI.

Key Endpoints
- Start: POST `/api/pipelines/executions` → `{ executionId }` (accepts `pipelineId` or `graph`, optional `entryNodeId`, `completedNodeIds`).
- Stream (SSE): GET `/api/pipelines/executions/:id/stream?token=...`.
- Stream (WS): GET `/api/pipelines/executions/:id/ws?token=...` (adapter dependent).
- Control: POST `/api/pipelines/executions/:id/{pause|resume|stop}`.
- Status list/detail: GET `/api/pipelines/executions` (filters/paging), GET `/api/pipelines/executions?id=...`.
- Events: GET `/api/pipelines/executions/:id/events` (filters, paging), `?latest=1` or `?countsOnly=1`.
- Events CSV: GET `/api/pipelines/executions/:id/events.csv` (same filters).
- Execution summary: GET `/api/pipelines/executions/:id/summary`.
- Resume preview: GET `/api/pipelines/executions/:id/resume-preview` → `{ readyNodes, blockedNodes }`.
- Backpressure policy: GET/POST `/api/pipelines/executions/:id/backpressure` (per-execution overrides).
- Dead-letter policy: GET/POST `/api/pipelines/executions/:id/deadletter-policy` (per-execution overrides).
- Dead letters: GET `/api/admin/deadletters` (filters), POST `/api/admin/deadletters/:id/retry`, DELETE `/api/admin/deadletters/:id/retry`.
- Dead letters export: GET `/api/admin/deadletters/export?executionId=...&format=json|csv`.
- Metrics (Prometheus): GET `/api/admin/metrics/prometheus` (guarded by `METRICS_SECRET` or admin).
- Persistence health: GET `/api/admin/health/persistence`.

Environment Variables (selected)
- Mongo persistence: `MONGO_EXECUTION_URI`, `MONGO_DB_NAME`, `MONGO_EXECUTION_COLLECTION`, `MONGO_EXECUTION_TTL_DAYS`.
- Events storage: `MONGO_EXECUTION_EVENTS_COLLECTION`, `MONGO_EXECUTION_EVENTS_TTL_DAYS`.
- Dead letters: `MONGO_DEADLETTERS_COLLECTION`, `MONGO_DEADLETTERS_TTL_DAYS`.
- Retry/backoff: `RETRY_ATTEMPTS`, `RETRY_BASE_MS`, `RETRY_MAX_MS`.
- Backpressure: `EVENTS_SAMPLE_RATE`, `EVENTS_COALESCE_MS`.
- Autosampling: `EVENTS_AUTOSAMPLE_ENABLED`, `EVENTS_TARGET_RPS`, `EVENTS_MIN_SAMPLE_RATE`, `EVENTS_MAX_SAMPLE_RATE`, `EVENTS_AUTOSAMPLE_WINDOW_MS`.
- Dead-letter thresholds: `DEADLETTER_MAX_PER_EXECUTION`, `DEADLETTER_FAIL_ON_FIRST`.
- Dead-letter redaction (export): `DEADLETTER_REDACT_FIELDS`.
- Metrics protection: `METRICS_SECRET`.

Admin UI Usage
- Server Execs tab: list/paging, filter by status/pipeline/date; DL badge shows unresolved dead letters.
- Execution detail page:
  - Transport toggle (SSE/WS) with status indicator; reconnect with backoff.
  - Backpressure policy (effective + per-execution overrides).
  - Node state panel (status, I/O, saved, batches, averages, retries).
  - Grouped events and raw stream; export JSON/CSV.
  - Dead Letters panel: filter by node/status, refresh, export JSON/CSV, retry/delete, delete resolved.

Node Source Options
- Postgres source: optional `keysetColumns` for keyset pagination; `columns`, `schema`, `table`, `limit` supported.
- Mongo source: supports `maxTimeMS`, `readPreference`, `batchSize`, `filter`, `projection`, `limit`.

Runbooks (quick)
- Tuning sampling/coalescing: set `EVENTS_*` envs; override per execution via backpressure endpoint.
- Dead-letter thresholds: set envs; override per execution; export and redact via env.
- Prometheus: scrape `/api/admin/metrics/prometheus`; protect with `METRICS_SECRET`.

