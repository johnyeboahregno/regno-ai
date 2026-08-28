# SMA Cloning Model (base + flavour + personas)

> Status: in-progress · Last updated: 2026-08-28

## What it is

The per-developer cloning model: an **SMA (Subject Matter Agent)** = immutable **base standards**
+ a developer's learned **flavour**, exposed as a named **persona**.

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
