# Chat — "Talk to the Architect"

> Status: stable · Last updated: 2026-08-28

## What it is

`/app/chat` — a conversational interface to the `regno-architect` agent.

## Why

The primary interaction: "talk to the system and tell it to do work."

## How it works

```
send message → POST /api/executions { prompt, settings:{ forceAgent:'regno-architect',
  analysisDepth, developer } } → jobId → poll GET /api/executions/[id] (2s × 90) →
  show output (or the persisted failure error)
```

- Execution ID = BullMQ job id (threaded through `runExecution`).
- Failures persist a `status:'failed'` record so the chat surfaces the reason.

## Files involved

- `apps/web/src/routes/app/chat/+page.svelte`
- `apps/web/src/routes/api/executions/[id]/+server.ts`
- `packages/flow/src/orchestrator.ts` (accepts `executionId`, stores `output`)

## Reproduce / verify

Open `/app/chat`, pick a persona, send: `Build me a small notes API with auth`.
