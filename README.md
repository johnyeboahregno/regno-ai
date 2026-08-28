# Regno Architect Me

A **fresh, self-hosted rebuild of the Regno platform**, bootstrapped from the official regno.ai
documentation pulled into [`docs/`](./docs). Engine-first scope: the **CORTEX brain** + **Cortex Flow
reasoning layer** + the **three-store data layer** (MongoDB / Qdrant / Neo4j / Redis), served by a
SvelteKit app with BullMQ execution workers and an SSE realtime server.

> North star: a personalized "Regno Architect Me" that grows faster at building *your* kind of apps
> by ingesting your personal coding history into the CORTEX brain.
> See [`REBUILD_PLAN.md`](./REBUILD_PLAN.md) for the full plan and status.

## Structure

```
apps/
  web/         SvelteKit app + API            (deploy.md: :5173 app, :3000 in Docker)
  execution/   BullMQ workers (Cortex Flow)   (deploy.md: :3003 execution)
  realtime/    SSE streaming server           (deploy.md: :3002 realtime)
packages/
  shared/      Constants: collections, queues, events, depths
  db/          DB clients: MongoDB, Qdrant, Neo4j, Redis + three-store sync
  ai/          Multi-provider LLM gateway + embeddings
  cortex/      CORTEX brain: ingestion, patterns, memories
  flow/        Cortex Flow reasoning engine: routing, plan, tools, orchestrator
infra/
  caddy/       Caddyfile (TLS + routing)
docs/          Pulled regno.ai documentation + DB_SCHEMA.md
docker-compose.yml   Full stack: caddy, web, execution, realtime, mongo, qdrant, neo4j, redis
.env.example    Environment template (mirrors deploy.md)
REBUILD_PLAN.md The build plan (assessment, DB map, roadmap)
```

## Quick start (local dev)

> **First time?** Follow the full walkthrough in [`FIRST_RUN.md`](./FIRST_RUN.md) (needs Docker Desktop for the databases).

```bash
# 1. Environment
cp .env.example .env            # fill in secrets / DB creds

# 2. Databases + Redis (Docker)
docker compose up -d mongo qdrant neo4j redis

# 3. Install workspace deps
npm install

# 4. Run the three apps
npm run dev:web                 # http://localhost:5173
npm run dev:execution           # BullMQ workers
npm run dev:realtime            # SSE on :3002
```

## Full stack (Docker)

```bash
docker compose up -d --build    # caddy + web + execution + realtime + all DBs
```

## Documentation

- [`docs/`](./docs) — 331 docs pulled from regno.ai (CMS excluded)
- [`docs/DB_SCHEMA.md`](./docs/DB_SCHEMA.md) — consolidated database schema (Mongo/Qdrant/Neo4j/Redis)
- [`REBUILD_PLAN.md`](./REBUILD_PLAN.md) — assessment + phased roadmap + decisions

## Personalize "Regno Architect Me"

1. Edit `profile/user-conventions.md` — your languages, style, patterns, tools.
2. List your repos in `profile/repos.json`.
3. After the databases are up:

```bash
npm run db:seed-profile   # your conventions → injected as userMemories
npm run db:seed-history   # your repos' code + commit history → cortex_index + doc_search
npm run db:seed-brain     # the docs/ corpus → ask-the-docs RAG
```

## Status

- **Phase 0:** scaffold, docker-compose, DB schema consolidation ✅
- **Phase 1:** data layer (connection manager, three-store sync, bootstrap/seed scripts) ✅
- **Phase 2:** CORTEX brain (ingestion → patterns → memories → wisdom) ✅
- **Phase 3:** Cortex Flow reasoning layer (agents, tools, orchestrator, quality loop) ✅
- **Phase 4:** seed "Regno Architect Me" from personal coding history ✅
- **Phase 5:** deploy to OVHcloud **SYS-GAME-1** — runbook + `deploy.sh` ready (see [`DEPLOY.md`](./DEPLOY.md))
