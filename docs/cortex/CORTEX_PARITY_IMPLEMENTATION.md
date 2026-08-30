# CORTEX Parity Implementation

> Brings this rebuild's CORTEX surface up to parity with Zaeem's `regno.ai/cortex`
> (the reference "CORTEX — Memory System"), using the docs as the blueprint.

## Why the two looked different

`regno.ai` is Zaeem's original implementation (source at `/disks/disk1/chat`, not in this repo).
This repo is a **documented rebuild** ("Regno Architect Me") — the docs name the original file
paths and schemas, but not the source. The first rebuild pass implemented the CORTEX **engine
core** (three-store sync, memory/pattern writes, keyword search) but only a minimal UI
(`/app/cortex` = 4 stat cards + two forms). This change adds the missing documented surface.

## What was added

| Layer | Implementation |
|---|---|
| Health dashboard | `GET /api/cortex/health` + `$lib/cortex/CortexHealth.svelte` |
| Tabs page | public `/cortex` + `/app/cortex` → shared `$lib/cortex/CortexPage.svelte` (Architecture / Knowledge / Patterns / Health / About) |
| Pattern catalog | `scripts/build-pattern-catalog.mjs` → `$lib/cortex/pattern-catalog.ts` (82 patterns, generated) |
| Pattern browser | `GET /api/cortex/catalog` + `POST /api/cortex/patterns/provision` + `$lib/cortex/CortexPatterns.svelte` |
| Reasoning search | `patternSearch()` + `graphSearch()` in `@regno/cortex`; wired into Oracle |

## Files

**New**
- `scripts/build-pattern-catalog.mjs`
- `apps/web/src/lib/cortex/pattern-catalog.ts` (generated — do not edit)
- `apps/web/src/lib/cortex/types.ts`
- `apps/web/src/lib/cortex/CortexPage.svelte`
- `apps/web/src/lib/cortex/CortexArchitecture.svelte`
- `apps/web/src/lib/cortex/CortexKnowledge.svelte`
- `apps/web/src/lib/cortex/CortexPatterns.svelte`
- `apps/web/src/lib/cortex/CortexHealth.svelte`
- `apps/web/src/lib/cortex/CortexAbout.svelte`
- `apps/web/src/lib/server/cortex/catalog.ts`
- `apps/web/src/routes/cortex/+page.svelte`
- `apps/web/src/routes/api/cortex/health/+server.ts`
- `apps/web/src/routes/api/cortex/catalog/+server.ts`
- `apps/web/src/routes/api/cortex/patterns/provision/+server.ts`

**Changed**
- `packages/cortex/src/search.ts` — added `patternSearch`, `graphSearch`
- `apps/web/src/routes/app/cortex/+page.svelte` — renders `CortexPage`
- `apps/web/src/routes/api/oracle/search/+server.ts` — returns `patterns` + `graph`
- `apps/web/src/routes/app/oracle/+page.svelte` — renders patterns + graph + method
- `CHANGELOG.md`

## Regenerating the catalog

```bash
node scripts/build-pattern-catalog.mjs
```

Re-run whenever `docs/cortex/CORTEX_PATTERN_CATALOG.md` changes, and commit the generated file.

## Collection mapping for the Health tab

`documents=cortex_index`, `facts=cortex_knowledge_facts`, `wisdom=cortex_agent_memories`,
`memories=cortex_memories`, `entities=cortex_entities`, `patterns=cortex_patterns`,
`evaluations=maestro_validations`, `executions=cortex_executions`, `staging=knowledge_staging`,
`showcases=showcases`. Qdrant is marked **Out of Sync** when its `cortex_patterns` vector count
differs from the Mongo `cortex_patterns` document count (same signal the reference shows).
