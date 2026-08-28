# Data Layer

> Status: stable · Last updated: 2026-08-28

## What it is

The three-store data layer: **MongoDB** (documents, source of truth), **Qdrant** (vectors),
**Neo4j** (graph), plus **Redis** for queues/pub-sub.

## Why

Regno.ai's core pattern is the **three-store sync**: Mongo (primary) → Qdrant (embedding) →
Neo4j (graph), eventual within seconds. See `docs/architecture/REGNO_AI_ARCHITECTURE_2026.html` §3.3.

## How it works

- `packages/db/src/mongo.ts` — pooled, capped Mongo client (`REGNO-MONGO-CONN-MANAGER` lesson).
- `packages/db/src/qdrant.ts` / `neo4j.ts` / `redis.ts` — singletons.
- `packages/db/src/sync.ts` — `writePattern()` / `writeWisdom()`: Mongo write always succeeds;
  Qdrant + Neo4j writes are **best-effort** (Mongo stays the source of truth).
- `packages/db/src/indexes.ts` + `scripts/init-db.mjs` — indexes, Qdrant collections, Neo4j constraints.

## Files involved

- `packages/db/src/*.ts`
- `packages/db/src/sync.ts`
- `scripts/init-db.mjs`
- `docs/DB_SCHEMA.md` — full schema reference

## Reproduce / verify

```bash
docker compose up -d mongo qdrant neo4j redis   # or k3s: kubectl apply -f k8s/app.yaml
npm run db:init                                  # indexes + collections + constraints
```
