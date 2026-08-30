# SMA Cloning Model (base + flavour + personas)

> Status: corrected · Last updated: 2026-08-30

## What it is

The per-developer **cloning** model. Terminology clarified (2026-08-30):

- **Architect** = the whole application. Making another architect = deploy a whole new copy of
  this repo (see [`15-per-developer-cloning.md`](./15-per-developer-cloning.md)).
- **SMA (Subject Matter Expert)** = a selectable expert profile for architect jobs, centered on
  a focus area. See [`20-sma-subject-matter-experts.md`](./20-sma-subject-matter-experts.md).
- **Persona** = the old name for a developer-flavour profile; it is now the `developer` field
  on an SMA (style overlay), not a separate concept.

The rest of this doc describes the developer **flavour** overlay (base standards + learned
style), which is unchanged and now lives inside an SMA.

## Why

Clone the whole Regno Architect per developer, so each new hire gets a machine that already knows
the company's standards AND can code like them — without ever violating the base.

## How it works

```
base standards (immutable)  ─┐
                              ├─► persona → regno-architect agent
developer's code → flavour  ──┘   (base injected first, flavour as style-only)
```

- **Base standards**: `standards/*.md` → `standards` collection + `base-standards` memory.
  Injected first in `buildContext`, marked "non-negotiable".
- **Flavour**: `DEVELOPER=<slug>` tags ingested docs; `buildContext(needs, developer)` injects
  them *after* the base as "emulate this style, never override base standards".
- **Personas**: `personas` collection = named profile (base + a developer's flavour).
- **Non-negotiables**: testing · documentation · CI/CD · code complexity.

## Files involved

- `standards/*.md`, `scripts/seed-standards.mjs`
- `packages/flow/src/context.ts` (base-first, flavour-second)
- `packages/shared/src/index.ts` (collections: standards, developers, personas)
- `apps/web/src/routes/api/{developers,personas}/+server.ts`

## Reproduce / verify

```bash
regno standards seed
regno developer add --slug jsmith --name "Jane Smith"
DEVELOPER=jsmith node scripts/seed-history.mjs   # learn their style
regno persona create --slug jsmith-arch --name "Jane's Architect" --developer jsmith
# in /app/chat, select the persona "Jane's Architect"
```
