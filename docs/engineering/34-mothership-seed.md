# Mothership: Re-seed an Architect's data (Seed button)

> Status: stable · Last updated: 2026-09-07

## What it is

A **"Seed data"** icon button in the Mothership **Architects** table, placed just left of
**Redeploy**. It re-runs an Architect's idempotent seed sequence over SSH — `init-db`,
agents, user profile, **docs corpus → knowledge base**, repo history, and GitHub org (when a
token is stored) — **without** redeploying or restarting the stack.

## Why

`deploy.sh` only runs the docs step (`seed-brain`) when an `OPENAI_API_KEY` was present at
deploy time, so a freshly provisioned Architect box can come up with an **empty brain (no
docs)**. Redeploying just to re-run the seeds restarts every container and takes far longer
than needed. The Seed button fills or refreshes the data layer **in place**, using the latest
keys already stored in the Mothership vault.

## How it works

```mermaid
flowchart LR
  A["Architect row"] -->|"Seed icon (left of Redeploy)"| B["POST /api/architects/:slug/seed"]
  B -->|enqueueSeed| C["BullMQ 'provision' queue · job name 'seed'"]
  C -->|worker routes by job.name| D["seedArchitect (@regno/provision)"]
  D -->|reveal vault + rewrite .env.prod| E["SSH /opt/regno"]
  E -->|seed scripts vs localhost DBs| F["init-db → agents → profile → brain → history → github?"]
  F -->|appendArchitectProgress · status| G["'seeding' → 'healthy' | 'error'"]
```

1. **Route** (`POST /api/architects/[slug]/seed`, admin-only) validates the Architect is not a
   `draft` and no `provisioning`/`seeding` job is already running, then enqueues a **`seed`**
   job on the existing `provision` BullMQ queue and flips status to `seeding`.
2. **Worker** (`apps/execution/src/workers/provision.ts`) routes `seed` jobs to
   `seedArchitect` (everything else still goes to `provisionArchitect`).
3. **`seedArchitect`** loads the blueprint + decrypted vault, (re)writes
   `/opt/regno/.env.prod` from the vault (so the latest `OPENAI_API_KEY`/`GITHUB_TOKEN` land
   on the box), then runs each seed script over SSH against the **already-running** databases
   on localhost (the same env deploy.sh step 7 builds — `MONGO_URI` with auth etc.).
4. Each step is streamed to the UI via `appendArchitectProgress`; events are prefixed
   `seed:`. Success sets status back to `healthy`; failure sets `error` with the message.

A new `seeding` status was added to the Architect model; the row shows **Seed + Redeploy**
for any provisioned (non-`draft`) Architect, and hides them while `provisioning`/`seeding`.
The shared `ProgressModal` was made generic (`title`/`doneText` props) so it reads
"Seeding `<slug>`" instead of "Redeploying `<slug>`".

## Files involved

- `apps/mothership/src/routes/api/architects/[slug]/seed/+server.ts` — POST route (enqueues seed, admin-only)
- `packages/provision/src/queue.ts` — `enqueueSeed`
- `packages/provision/src/provision.ts` — `seedArchitect` (SSH seed runner)
- `apps/execution/src/workers/provision.ts` — routes `seed` jobs
- `packages/db/src/architects.ts` — `ArchitectStatus` gains `'seeding'`; progress cleared on seed runs
- `apps/mothership/src/routes/app/architects/+page.svelte` — Seed button + `seed()` caller
- `apps/mothership/src/lib/architects/ProgressModal.svelte` — generic `title`/`doneText`
- `packages/ui/src/icons.ts` — `seed` (upload/ingest) icon

## Reproduce / verify

From an admin session on the Mothership:

```bash
# With your logged-in session cookie:
curl -X POST http://<mothership>/api/architects/<slug>/seed
# → { "ok": true, "jobId": "…" }  (Architect status flips to "seeding")
```

Watch the live step list in the modal (init → agents → profile → **docs corpus → knowledge
base** → history → github?). When it completes, the docs are searchable on that Architect
(`/app/oracle`) and the row returns to `healthy`.

The same sequence, run by hand on the box, is:

```bash
ssh <architect-host>
cd /opt/regno
set -a; source .env.prod; set +a
export MONGO_URI="mongodb://regno:${MONGO_PASSWORD}@localhost:27017/regno?authSource=admin"
export QDRANT_URL="http://localhost:6333" NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j" NEO4J_PASSWORD="${NEO4J_PASSWORD:-changeme}" REDIS_URL="redis://localhost:6379"
node scripts/init-db.mjs && node scripts/seed-agents.mjs && node scripts/seed-profile.mjs \
  && node scripts/seed-brain.mjs && node scripts/seed-history.mjs
```
