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

## Architecture tab — reference dashboard (2026-08-30)

Rebuilt `apps/web/src/lib/cortex/CortexArchitecture.svelte` to match the reference CORTEX
Architecture dashboard. It is no longer a static layer list — it is a live, health-driven
overview:

- **Header bar** — `Overall Status: ONLINE/OFFLINE/DEGRADED` pill (computed from the six
  mapped services), an `Auto-refresh ON/OFF` toggle, a `↻ Refresh` button, and `Last check`
  time. Auto-refresh is controlled by `CortexPage.svelte` (`autoRefresh` state + `toggleAutoRefresh`
  pauses the 15s poll timer; passed down as props).
- **Status boxes (6)** — Vector DB, Graph DB, Document DB, Embedding, Redis, BullMQ; each
  shows its live `Connected / Offline` state and glows green when online.
- **Flow diagram** — SVG connectors (dashed) join `Data Sources` → the four stores
  (`Vector DB`/`Qdrant`, `Graph DB`/`Neo4j`, `Document DB`/`MongoDB`, `Embedding`/`LLM · Reasoning`)
  → `Cortex Flow — Reasoning Layer` → `Redis` + `BullMQ`. Each node reads its status from
  `GET /api/cortex/health` and dims when its backing service is down.
- **Click to configure / view status** — clicking any status box or store node opens a detail
  card (name, role, status, live health detail). Nodes are `role="button"` + keyboard
  accessible (Enter/Space) to satisfy a11y.
- **Legend** — Configured / Not Configured / Click to Configure.
- **Metrics tiles (9)** — Documents, Facts, Wisdom, Memories, Entities, Patterns, **Learned**
  (= `knowledgeTotal`), Evaluations, Executions from the health `knowledge` array.

### Health endpoint addition

`GET /api/cortex/health` now reports an **Embedding** service (derived from Qdrant: offline
when the vector store is unreachable, detail `text-embedding-3-small`), so the six-box
status row and the Health tab both list it.

### Data Sources modal (2026-08-30)

Clicking the **Data Sources** node opens `$lib/cortex/CortexSourcesModal.svelte`, mirroring
the reference "Sources" panel:

- Orange header bar — `Sources` title, a bright-orange **Configure** button (white text), a
  toggle-size (expand) button, and a close `✕`.
- `Data Sources` heading with a database icon, plus the intro line about how knowledge enters
  CORTEX.
- Six source cards in a 2×3 grid, each with a coloured title: **Knowledge Ingestion**
  (orange), **Watched Directories** (light blue), **External Connectors** (green), **SDK & API**
  (purple), **Execution Learning** (cyan), **Conversations** (gold).
- Subtle grid backdrop on the body; closes via `✕`, Escape, or clicking the backdrop.

Also adds a `database` inline SVG icon to `$lib/icons.ts`.

### Vector DB configuration modal (2026-08-30)

Clicking the **Vector DB** node opens `$lib/cortex/CortexVectorDbModal.svelte`, mirroring the
reference "Vector Db" panel:

- Orange header bar — `Vector Db` title, **Configure / Browse** tabs (Configure active, solid
  orange), expand + close icons.
- **Configure** tab — `Vector Database Configuration` heading with a blue **Test Connection**
  button (probes `GET /api/cortex/health` and reports Connected/Failed), then the Qdrant
  connection form: Select Credential (select), Provider, Host, Port, Collection Name.
- **Browse** tab — lists the known Qdrant collections (`cortex_patterns`, `cortex_wisdom`,
  `cortex_execution_memories`, `knowledge_vectors`, `doc_search`).
- Footer — `Last saved: …` (updates to now on Save) and a bright-orange **Save** button with
  a white gear icon (reuses the existing `gear` icon).
- Same modal chrome/a11y pattern as the Sources modal (backdrop target-check close, Escape,
  `role="dialog"`).
