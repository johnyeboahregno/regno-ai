# CMS Audit History Backfill (REGNO-AUDIT-BACKFILL)

## What it is

Seed the (currently empty) platform audit journal with the **entire** CMS change history — every
`history[]` entry across all 14 change collections — so the Usage/Activity views and the AI
**change-commentary** layer have real historical depth before live capture accrues.

Grounded sizing (dry run, 2026-06-30): **413,175 mappable events, 2015-12 → 2026-06** (bulk 2018-2026);
36,183 skipped (no parseable `ts` / empty entry); 113,911 "material" events for the tamper-evident chain.

## Why a backfill is non-trivial (two constraints found)

1. **`auditEmit` clamps `ts` to the last 7 days** (`src/lib/server/audit/emit.ts`) — defends the live timeline,
   so it CANNOT carry a 2018 timestamp. The backfill writes to the store directly with the real historical `ts`.
2. **`audit_journal_<service>` is a time-series collection with a 180-day TTL** (`store.ts`, hot-tier; warm/cold
   rollup was always "P2", unbuilt). Historical events would be TTL-evicted. **Decision (2026-06-30): make the
   CMS journal permanent** (`collMod expireAfterSeconds: off`) — an audit record must persist; TTL-evicting it
   defeats the compliance purpose. The journal is empty today, so the backfill also **seeds the chain in `ts`
   order** with no live-event conflict.

## Architecture / where the code lives

- **Mapper (pure)** — `src/apps/cms/server/services/auditBackfill.ts`:
  - `classifyStatus(tokens)` — CMS status tokens → `(action, category)`, **grounded on the real token frequency**
    (qa/pa/ia/sw accept → `gate.approve`; ic accept/reject; qa/sp challenge; reject; submit; create; update;
    add-serviceProvider; withdraw; pause; pdd). Negation tokens (`-x`) are gate-engine bookkeeping → ignored.
  - `mapHistoryEntry(entry, ctx)` → `AuditEventDoc | null`. Status may be top-level or nested under `qa{}`/`ic{}`.
    A **no-status entry is a field edit** → `record.update` with the changed field KEYS (never the values — keep
    the link, not a copy of large HTML). Entity = `{type, id:identifier, label:identifier}`.
  - `isMaterial(ev)` — the subset sealed into the chain (gate / sign / create / delete / submit). The 297k
    field-edits stay in the journal but aren't chained (keeps the chain about decisions).
- **Runner (I/O)** — `scripts/audit-backfill.ts`:
  - default = **DRY RUN**: streams every change's history, reports distribution (type/action/category/year) +
    per-action samples; writes nothing.
  - `--apply` (next step): collMod the journal permanent → `insertEvents` with real `ts` → chronological
    `sealMaterial`. Idempotency: the journal is empty (one-time seed); a re-run recreates the collection.

## State / how to land it

The journal lives in the **hardened `regno_audit` DB** (auditDb.ts): an insert-only writer + find-only reader,
isolated from the app `regno` account. Grounded state (2026-06-30): the collection **already exists with a
180-day TTL and ~803 live events** — live capture has begun, so the backfill **appends** (each event marked
`detail._backfill`), it never drops the live events.

Making it permanent is the one blocker: `collMod expireAfterSeconds:off` is **admin-only** — the writer/reader
accounts (by design) can't. `--apply` therefore **refuses** while the TTL is set and prints the exact command.
Run it ONCE as the audit admin (whoever provisioned `scripts/audit-hardening-grant.js`):

```bash
mongosh "mongodb://<ADMIN_USER>:<PW>@localhost:27001/admin" \
  --eval "db.getSiblingDB('regno_audit').runCommand({collMod:'audit_journal_cms', expireAfterSeconds:'off'})"
```

Then `npx tsx --tsconfig tsconfig.workers.json scripts/audit-backfill.ts --apply` appends the ~413k events.

## Built vs planned

- **LANDED 2026-06-30**: admin made the journal permanent (`collMod expireAfterSeconds:off`), then `--apply`
  appended **413,175 events (2015-12 → 2026-06)** in 54.5s alongside the 803 live events — each marked
  `detail._backfill`. Verified: count == inserted, range + action distribution as expected.
- **Built**: the mapper + dry-run runner (validated) **and `--apply`** — append-safe, TTL-guarded + dedup-guarded.
  `gate.complete` captures the legacy free-text (`cr.complete` / `Delivered`).
- **Commentary layer STARTED 2026-06-30**: `src/apps/cms/server/services/changeCommentary.ts` (pure: collapses
  the field-edit noise + names the gate decisions into a compact chronological log) + `scripts/change-commentary.ts`
  (grounded "summarise ONLY these events, don't invent" prompt → LLM). **Validated on CR5690**: 114 events → 71-line
  log → an accurate, refuse-to-invent narrative (the challenge, 16 SP impact-accepts vs rejects, the
  VirginMediaO2/Telefónica clarification deadlock, the 70-day stall, "no recorded completion") in ~9s on haiku
  (~$0.001). Condense-then-compile (rule 05 §6); **all actor + SP names resolve** (regno `users.profile.name` +
  `companies.name` — the name is in `profile.name`, not top-level).
- **Production path WIRED 2026-06-30**: queued worker (`ScheduledWorker.handleCmsChangeCommentary`, task
  `cms-change-commentary` — LLM off the web thread, rule 05 §2) + `changeCommentaryService.ts` (generate + cache
  keyed identifier+eventCount; `resolveCommentaryIdentifier` so "5690"→"CR5690"; `getCommentaryLog` = the
  no-LLM condensed log) + `GET /api/cms/records/commentary?id=[&refresh=1][&events=1]` (CMS-path so SPs/DCC on the
  change page can read it; fresh cache, else enqueue + `pending`) + `AuditCommentary.svelte`.
- **Now mounted on the change Info page** (BaseInfoPage timeline tab) — it **REPLACES** the old raw-history
  `POST` commentary (the POST is retired/unused), plus the same widget is the audit-console Commentary tab. UK
  date locale throughout; dev users (`app.development`) get a 2nd **Events** tab showing the exact condensed log
  sent to the LLM. **Needs an `ee` restart** (register the task) + `se` (the new GET + components).

## Run

```bash
npx tsx --tsconfig tsconfig.workers.json scripts/audit-backfill.ts          # dry run (report)
npx tsx --tsconfig tsconfig.workers.json scripts/audit-backfill.ts --apply  # write (not yet implemented)
```

Registry: **REGNO-AUDIT-BACKFILL** (`doc/platform-todo-registry.md` §1).
