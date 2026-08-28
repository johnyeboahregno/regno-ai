# Cortex Flow Engine

> Status: stable · Last updated: 2026-08-28

## What it is

The agentic reasoning layer: route a prompt to an agent, build a phase plan, run a tool loop,
grade with a quality loop, persist, and learn.

## Why

This is the engine from `docs/cortex-flow-design.md` — one strong reasoning pass with a full
toolkit, self-correcting, and compounding.

## How it works

```
POST /api/executions → BullMQ 'orchestrate' → execution worker
  → routePrompt (confidence ≥ 0.7) or general-assistant
  → selectComposeFirstDepth (quick|standard|deep)
  → createPlanFromAgent (phases filtered by depth)
  → per phase: buildContext(needs, developer) + single-pass LLM with tool manifest
  → refine loop: gradeOutput → critique → regenerate (target 80, max 2 passes)
  → persist cortex_executions + remember() wisdom
```

## Files involved

- `packages/flow/src/{agent,plan,tools,context,quality,queue,orchestrator}.ts`
- `apps/execution/src/workers/orchestrator.ts`
- `apps/web/src/routes/api/executions/*`

## Reproduce / verify

```bash
curl -X POST http://localhost:3000/api/executions \
  -H 'Content-Type: application/json' -b 'regno_session=...' \
  -d '{"prompt":"Scaffold a small notes API","settings":{"analysisDepth":"standard","developer":"base"}}'
```
