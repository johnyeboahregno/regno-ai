# SMA — Subject Matter Agents

> Status: stable · Last updated: 2026-08-30

## What it is

- **One architect per provisioned target.** If you want another architect, create it through
  the Mothership **Architects → New Architect** wizard.
- **SMA (Subject Matter Agent)** = a *selectable expert profile* you pick when running an
  architect job. It is **not** a new stack or namespace.
- An SMA is centered on a **focus area**: e.g. an *F1 Race Engineer* SMA centers its knowledge on
  **F1, telemetry, aerodynamics**.

## Knowledge & focus

- **All knowledge is shared** across every job. Ingesting a document makes it available to every
  architect job — nothing is hidden by default.
- Documents can carry **tags** (`ingestDocument` accepts `tags`). An SMA declares **focus tags**;
  when it runs a job, retrieval **boosts** documents whose tags match its focus tags (see
  `keywordSearch(query, limit, boostTags)` in `@regno/cortex`). Everything else stays reachable —
  focus tags only re-rank, they never filter.
- An SMA also has a **description** and optional **disciplines/languages**, which inject the
  matching best-practice standards (same mechanics as before).

## SMA vs persona

- **Persona** was the old name for a *developer flavour* profile (base standards + a developer's
  learned style). It is now the **`developer` field on an SMA** — a style overlay, nothing more.
- The architect job's selector is now the **SMA** selector (one profile = focus area + optional
  developer flavour + optional disciplines).

## Model

```mermaid
flowchart LR
  JOB[Architect job] -->|settings.sma| SMA[SMA profile]
  SMA -->|description + focus tags| CTX[buildContext prompt]
  DOCS[Ingested knowledge] -->|shared for all jobs| RET[Retrieval]
  RET -->|boost by focus tags| CTX
  SMA -->|disciplines/languages| STD[Standards]
  STD --> CTX
```

## Where it lives

- Admin UI: `apps/web/src/routes/app/agents/+page.svelte` (nav label "SMA").
- API: `apps/web/src/routes/api/agents/+server.ts` (GET list / POST create —
  structured fields, or `{ prompt }` for LLM-derived creation),
  `[slug]/+server.ts` (PUT/DELETE).
- Server helpers: `apps/web/src/lib/server/sma.ts` (technology catalog,
  `slugify`/`parseTags`, `upsertSma`, `inferSmaFromPrompt`).
- Store: Mongo collection `agents` (`Collections.SMAS` in `@regno/shared`).
- Retrieval boost: `packages/cortex/src/search.ts` `keywordSearch(…, boostTags)`.
- Context injection: `packages/flow/src/context.ts` `loadSma()` + `buildContext(needs, { sma, prompt })`.
- Settings: `ExecutionSettings.sma` in `packages/flow/src/types.ts`.

## Reproduce / verify

```bash
# 1. Create an SMA (owner) via /app/agents — e.g. "F1 Race Engineer",
#    focus tags: F1, telemetry, aerodynamics.
# 2. In /app/chat, select the SMA and ask a question in that domain.
# 3. The execution emits a v2_sma event and the context includes a
#    "Focused knowledge (centered on: …)" block — the SMA lens applied.
```

## Create an SMA from a prompt file (CLI)

The standalone CLI (`packages/cli`) can turn a freeform **prompt file** into an
SMA without touching the UI. The CLI reads the file and POSTs `{ prompt }` to
`/api/agents`; the server LLM-derives `name` / `description` / `focusTags` /
`disciplines` / `languages` (disciplines & languages are constrained to the
catalog in `apps/web/src/lib/server/sma.ts`) and upserts the SMA.

```bash
regno sma create --file f1-race-engineer.md    # LLM-derived profile
regno agents create --file f1-race-engineer.md # alias
regno sma create ./f1-race-engineer.md         # positional path also works
regno sma ./f1-race-engineer.md                # drop the file path directly
regno agents ./f1-race-engineer.md             # same, via the alias
```

On success the CLI prints the new `slug` and **auto-switches** the active SMA.
Because the platform treats the active SMA as a client-side, per-execution
selection (`settings.sma` — same model as the web app's `localStorage`), the
standalone CLI persists its active SMA in `~/.regno/state.json`, and later
`regno ask` / `regno run` calls attach `settings.sma = <active>` automatically.
`regno sma [slug]` views/switches that local selection.

Requires: an **owner** session (`regno login`) and at least one LLM provider
key configured on the server (`OPENAI_API_KEY` etc.) for the inference step.

