# Architecture

> Status: stable · Last updated: 2026-08-28

## What it is

A TypeScript monorepo (npm workspaces) that implements the Regno platform: a SvelteKit web app,
a BullMQ execution worker, an SSE realtime server, and shared packages for the brain, data layer,
LLM gateway, mail, CLI, and flow engine.

## Why

Mirror the regno.ai architecture (`docs/references/deploy.md`) as a self-contained, single-host
system: app + API, execution workers, realtime streaming, and four databases.

## How it works

```
apps/
  web/        SvelteKit app + API (port 3000)
  execution/  BullMQ workers — orchestrator + notifications
  realtime/   SSE server (port 3002)
packages/
  shared/     constants (collections, queues, events)
  crypto/     AES-256-GCM
  db/         Mongo/Qdrant/Neo4j/Redis clients + sync
  ai/         multi-provider LLM + embeddings
  cortex/     brain services (ingestion, patterns, memories)
  mail/       SMTP + notifications queue
  flow/       reasoning engine (routing, plan, tools, orchestrator)
  cli/        the `regno` CLI
scripts/      seed + bootstrap scripts
k8s/          Kubernetes manifests
standards/    base coding standards
docs/         pulled regno.ai docs + engineering docs
```

## Files involved

- `package.json` — workspaces + scripts
- `tsconfig.base.json` — shared TS config
- `docker-compose.yml` — full Architect stack
- `docker-compose.mothership.yml` — Mothership control-plane stack
- `apps/mothership/` — dedicated Mothership SvelteKit app

## Reproduce / verify

```bash
npm install
npm run build          # builds all 10+ workspaces
npm run dev:web        # http://localhost:5173
```
