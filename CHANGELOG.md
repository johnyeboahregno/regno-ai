# Changelog

> Documentation is the point of this system. Every change below is recorded so the build is
> reproducible and reviewable. (See `VISION.md` for the north star.)

## 2026-08-29 — GENESIS pipeline parity + UX (tools, groups, validation, sticky connectors, cursor zoom)

Closing the gap toward Zaeem's regno.ai/pipelines (per honest gap analysis):
- **Tools** — new `tools` palette category + Tools sidebar tab: **File I/O, Web Fetcher, Web Search** attachable to an Expert node's new `tools` port (visually distinct). The LLM/expert family now feeds **all** connected input ports (context + tools) into the prompt; executor implements file-io (real fs read), web-fetcher (real fetch), web-search (simulated).
- **Utilities** — new `utilities` category: **Cost Tracking** (token/cost estimate), **Performance** (per-node timing log), **Error Handling** (upstream-failure fallback), **Audit Trail** (writes to `audit` collection, best-effort).
- **Node groups** — `Group` toolbar button, shift+click multi-select, group boxes with **Lock 🔒 / Ungroup**, per-node "Add to group" in the config panel, locked nodes can't be dragged/deleted.
- **Execution console** — **Test** button (+ "Test this node" per-node) runs a single node in isolation; **Expert modes** (⚡ Full / 🤖 Autonomous / 📚 Reference + Mock/Verbose switches) sent as run settings; **Dashboard** tab = Execution Validation (status/duration/nodes/mode cards + per-node check list).
- **Debug + model selector** — 🐞 Debug toolbar toggle shows a live SSE event trace; OpenAI/Anthropic/Google provider select + model input set the default for LLM nodes (node config overrides).
- **UX** — **sticky connectors**: dragging a connection snaps to the nearest port (highlight) and completes on release; releasing on empty canvas cancels (fixed dangling-pending bug). **Wheel zoom is cursor-centered** (the canvas point under the pointer stays fixed).
- `@regno/ai`/db wiring unchanged; root `.env` (gitignored) holds `OPENAI_API_KEY`.

## 2026-08-29 — GENESIS → real-time visual pipeline system (regno.ai/pipelines)

- **GENESIS is now the pipeline builder** (per user: "this is what GENESIS needs to be" —
  https://regno.ai/pipelines). `/app/genesis` is a full node-canvas editor: draggable nodes,
  connectable input/output ports, SVG edges, pan/zoom, node groups/categories, and a live
  execution console. The old placeholder ("Architecture & refactoring") is replaced; the GENESIS
  refactor plan remains in `docs/strategy/GENESIS_REFACTORING_PLAN.md`.
- **Node catalog** (`apps/web/src/lib/pipeline/catalog.ts`): six categories mirroring the live
  page — Data Sources, Transformation, Control Flow, AI & Intelligence, Visualization, Data Sinks —
  with ~40 node types (Data Source, HTTP, Knowledge Source, Transform, Mapper, Aggregation,
  Filter, Switch, Merge, Delay, Buffer, ForEach, LLM, Expert, Data Analyst, AI Insights, MAESTRO,
  Document Generator, Display, Data Grid, Chart, Data Sink, Cortex Index, …).
- **Executor** (`apps/web/src/lib/pipeline/executor.ts`): topological DAG runner that executes each
  node by type — Mongo/HTTP/JSON data sources, JS transforms/filters/aggregations, `@regno/ai`
  LLM calls (with a simulated fallback when no provider key is set), knowledge staging/synthesis,
  and Cortex Index / Data Sink writes. Emits per-node `node_started` / `node_completed` /
  `node_error` events for SSE; records each run in the `pipeline_history` collection.
- **API**: `POST /api/pipelines/run` starts a run and returns an `executionId`;
  `GET /api/pipelines/run/[id]/events` streams progress via SSE; `GET /api/pipelines/runs` lists
  recent runs; `/api/pipelines/[id]` supports fetch/update/delete; the base `/api/pipelines`
  create/list now persists `edges` too.
- **`@regno/db`** now re-exports `ObjectId` (used by the pipeline CRUD routes).
- App chooser: GENESIS is now marked `done` with description **Pipelines**.

## 2026-08-29 — Keyless search fallback for Oracle (Zaeem's zero-cost engine)

- **Fork framing**: this repo is a **fork** of Zaeem's Regno Architect. Zaeem's `docs/` corpus is
  gospel — always ingested and used to build; when he changes his docs we re-ingest
  (`npm run db:seed-brain`) and apply. The fork's only difference: it connects to **our** repos and
  **our** databases, never Zaeem's repo/DBs (no `BASE_QDRANT_URL` link to the base platform).
- **Keyword/TF-IDF fallback** (matches `REGNO_AI_ARCHITECTURE_2026.html` §9 "zero-cost fallback
  engine"): new `keywordSearch()` in `@regno/cortex` (`src/search.ts`) — TF-IDF keyword scoring over
  Mongo `cortex_index` (raw docs are always stored, even without an embedding key).
- **Oracle search** (`/api/oracle/search`) now works **keyless**: semantic (Qdrant) when
  `OPENAI_API_KEY` is set, else keyword/TF-IDF fallback. Never hard-fails with "OPENAI_API_KEY is
  not set". Response includes `method: 'semantic' | 'keyword'`.
- **`knowledgeBase` tool** (`@regno/flow`): same fallback — semantic when a key is present, else
  keyword/TF-IDF.
- **Oracle UI hint** updated: keyword search works without a key; re-run `db:seed-brain` when Zaeem
  updates his docs.

## 2026-08-29 — Oracle rename + AI usage & cost on Health

- **Nexus → Oracle**: the knowledge-search dashboard moved from `/app/nexus` to `/app/oracle`
  (search API is now `/api/oracle/search`). Old `/app/nexus` 301-redirects. Sidebar + app chooser
  updated. The `/app/chat` page stays **Architect** (no rename).
- **Removed system-health grids from `/app/docs`**: the Builds / Tests / Deployments cards were
  stripped from the Docs page (they had been added alongside `GET /api/system-health`); Docs is
  back to document/artifact listing only.
- **AI usage & cost tracking** (new): the `@regno/ai` gateway now parses token usage from
  OpenAI / Anthropic / Google chat + OpenAI embeddings, estimates USD cost via a per-model pricing
  table, and emits `UsageRecord`s to a module-level sink. New `ai_usage` Mongo collection (indexed
  on ts / provider·model / day) + `recordAiUsage` helper in `@regno/db`. Sinks installed in the
  execution worker (`apps/execution`) and web server (`apps/web/src/hooks.server.ts`).
- **Health page**: `/app/health` now shows an **AI usage & cost** section on top — total tokens,
  total cost, cost this month, LLM call count, a 30-day token bar chart, and a per-model breakdown
  table (via extended `GET /api/health`). Infra status cards retained below.

## 2026-08-29 — Architects (full stack + own brain + base knowledge)

- **Agent wizard** (`/app/agents` → "Regno Architects"): admin parent screen to create a
  **complete new stack** — name → technologies → repos → datasource.
- **Brain per architect**: each spawns a k3s namespace with its own Mongo/Qdrant/Neo4j.
- **Base knowledge connection**: `BASE_QDRANT_URL` injected; NEXUS search queries own + base
  (read-only), results tagged `own`/`base`.
- **Best-practice standards library**: 13 docs — TDD, integration testing, performance testing,
  CI/CD, coding, documentation, complexity + per-tech (web-typescript, go, rust, python, ros).
- **Per-agent tech standards**: `AgentDef.technologies` → `buildContext` injects matching standards.
- **RBAC** (`k8s/rbac.yaml`): web pod can spawn namespaces; `scripts/spawn-agent.mjs` + kubectl in image.
- **Documentation pipeline**: every artifact auto-documented (`documentExecution` → `artifacts`).
- **System health grids** (`/app/docs`): Builds / Tests / Deployments history as Git-style 10px
  squares (green = success, red = failed) with hover details. New `GET /api/system-health`
  aggregates `cortex_executions`, `maestro_validations`, and `audit` deploy actions.
- **CI fix**: the Verify gate failed at "Type-check (web)" on fresh checkouts because `svelte-check`
  ran before `.svelte-kit` (generated by `svelte-kit sync`) existed. The web `check` script now runs
  `svelte-kit sync` first, so `npm run check -w @regno/web` works on a clean checkout.

## 2026-08-28 — Personalisation & persona foundation

- **Docs-in-base**: `seed-brain.mjs` now ingests `.md` **and** `.html` raw into Mongo `cortex_index`
  (always) + Qdrant `doc_search` (embeddings best-effort). `docs/`, `scripts/`, `profile/`,
  `standards/` baked into the web image (`apps/web/Dockerfile`). Verified: 332 docs → DB.
- **Base standards**: new `standards/` dir (`coding`, `testing`, `documentation`, `ci-cd`,
  `complexity`) + `scripts/seed-standards.mjs` → Mongo `standards` collection + `base-standards`
  memory. `ContextBuilder` always injects them first, marked "non-negotiable".
- **Flavour tagging**: `developers` collection; `seed-history`/`seed-github` tag docs with
  `DEVELOPER`; `ExecutionSettings.developer`; `buildContext(needs, developer)` injects developer
  flavour *after* base standards; wisdom memories carry `developer`.
- **Personas**: `personas` collection + `POST /api/personas`; chat persona selector; CLI
  `persona create`.
- **Memory/pattern tools**: `POST /api/cortex/memories` + `/api/cortex/patterns`, CORTEX UI
  forms, CLI `remember` + `pattern add`. Vector/graph writes made best-effort (Mongo = source of truth).

## 2026-08-28 — Chat ("talk to the architect")

- New `/app/chat`: send a prompt → `regno-architect` agent → poll result → show output.
- Execution ID flows through the pipeline (job id = execution id); failures persist an error record.
- `GET /api/executions/[id]`.

## 2026-08-28 — k3s migration

- Installed **k3s** (Docker runtime) on SYS-GAME-1; wrote `k8s/app.yaml`
  (7 Deployments + Services + PVCs) + `migrate-k3s.sh`.
- Cut over from Docker Compose; app unchanged at `:3000` (via `hostPort`, `Recreate` strategy).
- Fixed Neo4j k8s issue (`enableServiceLinks: false`) and hostPort rolling-update (`Recreate`).
- Remote access: kubeconfig → `~/.kube/config`, port 6443 opened, k9s instructions.

## 2026-08-28 — Hardening

- ufw: only 22/80/443/3000/6443 open; DB ports blocked.
- DB ports bound to 127.0.0.1 in Compose (later removed under k3s).
- Mongo root auth + Neo4j password rotated; SMTP_FROM_NAME quoting fixed.

## 2026-08-27 — Deploy to SYS-GAME-1

- Server: OVHcloud **SYS-GAME-1** (Ryzen 5 3600X · 64GB · 2×512GB) @ `213.32.7.227`.
- Installed Docker + Node 22; copied repo; `.env.prod`; full stack up; DBs seeded.
- Fixed Dockerfile `tsconfig.base.json` missing, Qdrant image too old, and the
  SvelteKit `Secure` cookie bug (login loop over HTTP → `secure:false`).
- Registered owner account `jlyeboah@gmail.com`.

## 2026-08-27 — UI rebuild + auth

- New design system from the SMA proposal (`app.css`, Space Grotesk / IBM Plex fonts).
- Auth: `register/login/logout/me` (scrypt + `jose` JWT, httpOnly cookie), `/app` guard.
- Pages: landing, login/register, dashboard, CORTEX, executions, docs, credentials, health,
  App Chooser (`/apps`), NEXUS, STAGE, Canvas, GENESIS/SENTINEL/Launchpad (scaffolds).
- Real Regno logo assets used (`/logov2.png`, `/logov2_BLK.png`, `/logoPurple.png`).

## 2026-08-27 — Credentials vault + email + CLI

- `@regno/crypto` (AES-256-GCM) + `credentials` vault service + API + UI.
- `@regno/mail` (nodemailer SMTP) + `notifications` BullMQ queue + worker + `email-send` tool
  + Health-page test-email (SMTP: mail.postale.io).
- `@regno/cli` — `login`, `run`, `credentials`, `db`, `brain`, `history`, `profile`, `github`.

## 2026-08-27 — Engine build (Phases 0–5)

- **Phase 0**: monorepo scaffold, `docker-compose.yml`, `docs/DB_SCHEMA.md`.
- **Phase 1**: `@regno/db` clients + three-store sync + indexes + bootstrap/seed scripts.
- **Phase 2**: `@regno/ai` (multi-provider LLM) + `@regno/cortex` (ingestion, patterns, memories).
- **Phase 3**: `@regno/flow` (routing, plan, tools, context, quality loop, orchestrator) + worker + API.
- **Phase 4**: personalisation (`profile/`, `seed-history`, `seed-profile`).
- **Phase 5**: `deploy.sh` + `DEPLOY.md`.
- Pulled 331 docs from regno.ai into `docs/` (CMS excluded).

---

*Every subsequent change will be appended here and committed to git.*
