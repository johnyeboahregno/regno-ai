# About Regno.ai — Canonical Source of Truth

The data behind "About Regno.ai" — people, tech stack, architecture
highlights, version, brand, copyright — lives in **one file** and is
fanned out from there to every consumer.

This document tells future contributors **where to edit** and **how
changes propagate**. CENTRA1 / Phase 1.

---

## Source of truth

`src/lib/data/about.ts`

That is the only file you edit. Everything else is generated or
imports from it.

The TypeScript module exports `ABOUT_DATA` (typed) plus two filter
helpers (`peopleFor`, `realPeople`).

## What lives there

| Field | Notes |
|---|---|
| `brand`                  | name, title, tagline, wordmark accent, logo path, partner copyright line |
| `version`                | re-exports from `src/lib/version.ts` so version bumps don't need a second touch |
| `people`                 | Regno + I-Associates members. Each has a `placeholder?` flag so AI-bootstrapped names can be hidden until CENTRA1.b scrubs them |
| `techStack`              | Frontend / Backend / Databases / AI / ML — keep AI / ML model-agnostic |
| `architectureHighlights` | The six-pillar story, in one place |
| `copyrightLine`          | Auto-built with current year |

## Consumers (today)

| Consumer | How it reads |
|---|---|
| `src/lib/components/AboutModal.svelte`         | `import { ABOUT_DATA, peopleFor } from '$lib/data/about'` |
| `GET /api/about` (public)                      | Serves the data as JSON; supports `?placeholders=true` to include the scrub-pending entries |
| HTML docs (regno-roadmap, exec-summary, strategic-case) | **Do not** carry credits. Earlier iteration injected a footer block; decision 2026-05-30 was that credits belong in the platform's About modal, not in pitch/roadmap doc footers (they competed with the close). `scripts/embed-about-into-docs.cjs` now runs as a *strip* — keeps docs clean of any stale credits block. |
| `static/about-regno.json` and `src/lib/data/about.json` | Public JSON shadows for tooling that can't import TS |

## Consumers (planned — see registry)

- **CENTRA1.a** — AppSwitcher footer popup → also reads `about.ts`
- **CENTRA1.c** — Trust manifest `/.well-known/trust.json` — wire its
  team / subprocessor fields to the canonical
- **CENTRA1.d** — Admin sidebar "About" link

## The propagation flow

```
                    src/lib/data/about.ts
                            │
            ┌───────────────┼───────────────────┐
            │               │                   │
       AboutModal      /api/about     scripts/emit-about-json.cjs
       (Svelte)         (HTTP)                  │
                                                ▼
                                  src/lib/data/about.json
                                  static/about-regno.json
                                                │
                                                ▼
                                  scripts/embed-about-into-docs.cjs
                                                │
                                                ▼
                                  doc/*.html footers
```

## Workflow — what to do when

The `aboutSyncPlugin` (`vite-plugins/about-sync-plugin.js`) keeps
everything in lockstep automatically:

- On every `npm run se` (dev server start) → compiles `about.ts` →
  `about.js`, re-emits JSON shadows.
- On every save of `about.ts` during dev → re-runs both steps.
- On every `npm run build` (production build) → ditto, before bundling.

**Edit `src/lib/data/about.ts` and walk away.** Vite handles the rest.

| Change | What you do | What auto-syncs |
|---|---|---|
| Edit a person, bio, tech-stack entry, etc.       | Edit `about.ts`, save | `about.js`, `about.json`, `static/about-regno.json`, `AboutModal`, `/api/about` |
| Version bump (semver)                            | Edit `src/lib/version.ts` only — `/api/about` injects live version into its response | `/api/about` (immediate) |
| New contributor joins                            | Add to `PEOPLE` in `about.ts`. DO NOT set `placeholder: true` | All consumers |
| Scrub a placeholder                              | Delete from `about.ts` (or drop the `placeholder: true` flag and set a real name) | All consumers |
| New consumer wants the data                      | Import from `$lib/data/about` (Svelte/TS) · fetch `/api/about` (HTTP) · `require('./static/about-regno.json')` (CJS). **Never** redeclare inline | — |

**Manual fallback** (only if you need to run sync without starting Vite):

```bash
npx esbuild src/lib/data/about.ts --outfile=src/lib/data/about.js --format=esm --sourcemap --platform=node
node scripts/emit-about-json.cjs
```

## Anti-patterns

- Editing the credits in `AboutModal.svelte` (the inline array no longer
  exists — file is now a pure renderer)
- Re-declaring `developers = [...]` anywhere else in the codebase
- Hand-editing `about.json` or `static/about-regno.json` (regenerated)
- Hand-editing the `<!-- CENTRA1:credits:* -->` blocks inside HTML docs
  (re-emitted on every doc rebuild)
