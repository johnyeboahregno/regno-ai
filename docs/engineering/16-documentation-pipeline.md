# Documentation Pipeline

> Status: stable · Last updated: 2026-08-29

## What it is

Every artifact the architect builds is **auto-documented**: a markdown file (request, what was
built, phases, score) generated at the end of each successful execution, stored in the
`artifacts` collection, and surfaced in the Docs page.

## Why

"Everything the system does or builds must be documented" — this is the final piece of that
principle, turning agent output into first-class documentation.

## How it works

```
runExecution → build result → documentExecution(prompt, result)
  → markdown (title + request + what was built + phases + score)
  → Mongo `artifacts` collection (upsert by taskId)
  → surfaced at /app/docs ("Artifacts") + GET /api/artifacts[/[id]]
```

## Files involved

- `packages/flow/src/documentation.ts` — `documentExecution()`
- `packages/flow/src/orchestrator.ts` — calls it (best-effort) after each run
- `apps/web/src/routes/api/artifacts/**`
- `apps/web/src/routes/app/docs/+page.svelte` — artifacts section

## Reproduce / verify

```bash
# run an execution, then:
curl -s http://localhost:3000/api/artifacts -b 'regno_session=...'
# open /app/docs → "Artifacts" section lists the generated doc
```
