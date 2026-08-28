# Memory & Pattern Tools

> Status: stable · Last updated: 2026-08-28

## What it is

Manual creation + listing of CORTEX memories and patterns, via API, UI, and CLI.

## Why

The brain is only as good as what you feed it — allow curated memories/patterns alongside the
automatic wisdom loop.

## How it works

- `POST /api/cortex/memories` → `remember()` → `cortex_agent_memories` + `cortex_wisdom`.
- `POST /api/cortex/patterns` → `createPattern()` → three-store sync (Mongo/Qdrant/Neo4j).
- Both write Mongo always; vector/graph are best-effort.
- CORTEX page (`/app/cortex`) shows lists + "Store memory"/"Store pattern" forms.

## Files involved

- `apps/web/src/routes/api/cortex/{memories,patterns}/+server.ts`
- `apps/web/src/routes/app/cortex/+page.svelte`
- `packages/cortex/src/{memories,patterns}.ts`

## Reproduce / verify

```bash
regno remember "Always write tests before implementation"
regno pattern add --name "SvelteKit CRUD API" --description "Proven pattern" --tags svelte,api
```
