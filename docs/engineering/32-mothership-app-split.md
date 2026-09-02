# Mothership app split

> Decision record: the Regno Mothership (control plane) is no longer a runtime
> mode of `apps/web` — it is its own SvelteKit app, `apps/mothership`.

## Why

Before this split, the Mothership was the **same** `apps/web` codebase switched on
with `MOTHERSHIP=1`. That flag only gated routes and nav at runtime, while the
`docker-compose.mothership.yml` image still built the **entire** platform
(chat, cortex, oracle, canvas, stage, genesis, docs, ingest, …) for a 4-route
control plane. The Mothership is a genuinely separate deployment (own compose
file, own VPS, own workflow), so it deserves its own app.

## What changed

| Area | Before | After |
|------|--------|-------|
| App | `apps/web` + `MOTHERSHIP=1` flag | dedicated `apps/mothership` (no flag) |
| Auth / identity | `apps/web/src/lib/server/{auth,identity}.ts` | `packages/auth` (`@regno/auth`) |
| Leaf UI + design system | `apps/web/src/lib/*` + `app.css` | `packages/ui` (`@regno/ui`) |
| Architects page/API | in `apps/web` (admin surface too) | `apps/mothership` only |
| Execution worker | full `apps/execution` (orchestrator + notifications + provision) | `apps/execution/src/provision.ts` (provision only) |
| Compose service | `web` | `mothership` |

## Mothership dependency closure

The Mothership only needs the leaf workspace closure — **no** `@regno/ai`,
`@regno/cortex`, `@regno/flow`, or `@regno/ingest`:

```
@regno/shared  →  @regno/crypto  →  @regno/db  →  @regno/provision
                     (leaf)                        (bullmq)
@regno/auth  (auth + SSO identity)
@regno/ui    (Icon/Brand/StatusPulse/PasswordInput + design system)
@regno/mail  (email test endpoint)
```

## What stays in `apps/web`

- The Architect-side telemetry **sender** (`src/lib/server/architect-telemetry.ts`,
  wired from `src/hooks.server.ts`) — it runs on each provisioned Architect and posts
  to `{MOTHERSHIP_URL}/api/architects/{slug}/telemetry`.
- The full Architect surface (chat, cortex, oracle, canvas, stage, genesis, docs, …).

## Verification

- `npm run build -w @regno/mothership` and `-w @regno/web` both build clean.
- `npm run check -w @regno/mothership` / `-w @regno/web` report 0 errors.
- `docker compose -f docker-compose.mothership.yml up -d --build` boots the
  control plane (mothership + execution + mongo + redis).
