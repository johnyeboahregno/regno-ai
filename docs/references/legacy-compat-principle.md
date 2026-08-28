# Legacy Compatibility — Principle and Plan

## TL;DR

> **The process def is the single source of truth. Legacy records
> reach that truth through a one-shot, audited migration — not through
> a permanent dual-path system. A temporary alias bridge keeps legacy
> records rendering correctly while the migration drains the backlog.**

Direction chosen: **(b) migrate forward**, staged through **(a) as a
transitional bridge**. The bridge is opt-in per type, lives only as
long as the migration takes, and is retired the moment the type's
legacy backlog reaches zero. After that point there is one path
through the system: the def.

The DEF-AUDIT pass (see `defAudit/`) is healthy *because* it surfaces
drift between the def and reality. The bridge teaches the audit which
drift is "legacy we're transitioning" vs "drift that needs fixing
now".

## Why this matters

The CMS holds three populations of records simultaneously:

1. **New records** — created under the current `processes/<type>.ts`
   def. Status tokens match what the runtime emits.
2. **Legacy live records** — mid-flight changes raised under an older
   version of the def. They use older status tokens (e.g. SoW records
   that may have been stamped `cms.sw.complete` historically) and
   cannot be re-stamped without disturbing their workflow.
3. **Legacy completed records** — already at terminal state under the
   old vocabulary. They must remain viewable and history-traceable
   even though no further transitions will happen.

Every UI surface — Kanban, info pages, change journey, completed
dashboard, audit — must handle all three. The process runner is only
the start: it walks NEW records to terminal under the CURRENT def. The
broader system must continue to work for the other two populations.

## Principle

1. **The def describes the present, not the past.** Cycles, statusIds,
   submit.statuses, action.historyEntry — all describe the current
   contract. New records always travel this path.
2. **`_processSchema` is the new-record marker — and only that.**
   Legacy docs lack `_processSchema`. Migration NEVER stamps
   `_processSchema` onto a legacy doc. The absence of the field is
   the signal. This is load-bearing across the codebase:
   `computeFacts.ts:72-77`, `enrichTask.ts`, anywhere a gate with
   `schemaRequires` is filtered out for legacy docs.
3. **Legacy stays legacy for the whole journey.** A legacy live doc
   walks through the def's gates EXCEPT those gated by
   `schemaRequires` (qaProcess, configured keyPeople, Investment
   Committee, etc.). It can reach terminal status, render the same
   InfoPage + SP Journey + SLA charts as a new doc, and progress
   step-by-step through the runner — just without the configured-only
   features that didn't exist when it was raised.
4. **The bridge is temporary and explicit (status only).** Each
   process def can declare an optional `legacy.statusAliases` map
   that the snapshot pipeline reads during classification (so a
   legacy record lands in the right gate). The runner NEVER emits
   aliased tokens. The bridge is opt-in per type and removed once
   the migration completes.
5. **Migration normalises STATUS TOKENS only.** Migration appends
   canonical history entries for legacy tokens (`cms.sw.complete` →
   `cms.sw.approved`), with a `_migration: { from, to, at }` marker.
   Migration NEVER:
   - stamps `_processSchema`,
   - adds new gates to the doc's path,
   - rewrites keyPeople / QA / IC structure,
   - touches anything other than status round-tripping.
6. **The runner is the migration acceptance gate.** A migrated doc
   must walk cleanly through its REMAINING gates under the current
   def — minus any `schemaRequires` gates that are still off because
   `_processSchema` was never added. If the runner trips on a
   migrated doc, the migration is rolled back for that cohort and
   the mapping is fixed.
7. **The audit knows.** A status that's a declared legacy alias and
   appears in a doc PRE-migration is fine. The same alias appearing
   in a NEW emission OR after migration completes is drift —
   flagged.

## Concrete mechanisms

### 1. `ProcessDef.legacy` block (additive type change)

```ts
interface ProcessDef {
	// ...existing fields...
	/** Legacy compatibility metadata. Read by snapshot/classification
	 *  for older records; never read by runner emission. */
	legacy?: {
		/** Token aliases. Key = legacy token, value = canonical token
		 *  this def now emits. Snapshot treats the legacy token as if
		 *  it were the canonical when classifying. */
		statusAliases?: Record<string, string>;
		/** Status tokens we know exist in legacy data but no longer
		 *  emit. Listed so def-audit doesn't flag them as orphan
		 *  classifications when they appear in statusIds purely for
		 *  legacy-routing. */
		acceptedLegacyTokens?: string[];
		/** Optional human note explaining when/why the alias arose. */
		notes?: string;
	};
}
```

Example for SoW:

```ts
legacy: {
	statusAliases: { 'cms.sw.complete': 'cms.sw.approved' },
	acceptedLegacyTokens: ['cms.sw.complete'],
	notes: 'cms.sw.complete was emitted by an early version of the SoW PO gate; current def emits cms.sw.approved for parity with PA/IA/CA. Legacy records remain viewable via the alias.',
}
```

### 2. Snapshot pipeline reads aliases

When classifying a doc's current status against a gate's `statusIds`,
the snapshot pipeline checks both the literal token AND its alias
target. Implementation lives in `cmsSnapshot/classifyDoc.ts` (or the
existing classification helper) — one extra map lookup per status.

### 3. Runner emission ignores aliases

`realGateAction.ts` and `submitCmsDraft.ts` write the CANONICAL token.
The runner never writes a legacy alias. Walks are forward-looking by
definition.

### 4. DEF-AUDIT is alias-aware

`defAudit/checks.ts` consults `def.legacy.statusAliases` and
`def.legacy.acceptedLegacyTokens` when deciding if a token is
"known". Both 8B (action round-trip) and 8D (cycle trigger
round-trip) get this treatment. The audit will still flag a NEW
emission of an unknown token — drift detection is preserved.

### 5. View-layer canonicalisation (optional)

Commentary / status label endpoints look up the alias map and present
aliased tokens with their canonical label. The doc is not touched.
This is a separate PR and is optional — if we'd rather show "SoW
Complete" verbatim in legacy timelines, we just skip this step.

### 6. Process runner: `legacy-seed` mode

`scripts/seed-cr-walk.ts` and the seed-draft endpoint gain an opt-in
`legacy: true` parameter. When set, the seeded doc is stamped with
the legacy status alias (instead of the canonical) so a walk can
verify the snapshot pipeline still classifies it correctly. The walk
ITSELF still uses the canonical path — we're testing the legacy
*starting point*, not legacy *transitions*.

## Out of scope (deliberately)

- **Stamping `_processSchema` on legacy records.** Forbidden. The
  field's absence is what tells the runtime to skip configured-only
  gates. Adding it later silently opts a legacy doc into features
  it shouldn't have, and breaks the audit trail of what gates the
  doc actually walked through.
- **Adding new gates to legacy doc paths.** A legacy doc that didn't
  pass through QA-configured / Investment Committee on raise stays
  that way. Migration is about status normalisation, not feature
  upgrade.
- **Rewriting keyPeople / QA / IC structure on legacy docs.**
  Mid-flight legacy docs may have a different keyPeople shape than
  current — leave it alone. InfoPage already renders legacy shapes
  via the same components; that path stays.
- **Versioned defs per record.** The single current def + alias map
  + `schemaRequires` skip mechanism is enough. A doc's history tells
  us which path it took; we don't need a frozen 2024-vintage def.

## Operational model — collections + buttons

Two collections per type, six buttons. The model is **additive and
idempotent**: every operation either appends to a collection or filters
docs by a deterministic classification, and any operation can be
re-run safely. New records co-exist with legacy in the same `{type}`
collection; the migration script only touches what's unmigrated.

New CMS Settings panel: **Data → Snapshot Management → Legacy
Migration**.

### Three doc populations

| Population | `_processSchema` shape | Meaning |
|---|---|---|
| **Pure legacy** | absent (undefined) | Never been touched by migration. Status tokens may use legacy aliases. |
| **Migrated legacy** | `{ migration: 'vN' }` (no feature keys) | Status tokens normalised. STILL skips configured-only gates because `qa`/`sla`/`keyPeople`/`investmentCommittee` remain unset — `schemaRequires` filter (`computeFacts.ts:72-77`) treats this exactly like pure legacy. |
| **New** | feature keys set (`{ qa: 'configured', sla: 'configured', ... }`, optionally with `migration: 'vN'`) | Created via the new-CMS flow. Walks the full configured stack. |

**Hard rule:** migration scripts set ONLY `_processSchema.migration` and
NO other key. Setting `qa`/`sla`/`keyPeople`/`investmentCommittee`
would silently opt the doc into configured-only gates — exactly what
the legacy-compat principle is designed to prevent.

### Collection roles

| Collection | Lifetime | Purpose |
|---|---|---|
| `{type}` | Always | **The truth.** Snapshot pipeline + runtime always read here. Contains a mix of pure legacy, migrated legacy, and new records. |
| `{type}.archive` | Created on first Migrate, additive forever | Append-only log of "the original legacy shape" of every migrated doc. Each Migrate pass appends to it. Restore reads from it. Never dropped. |

### Six buttons (per type row)

| Button | Effect | When |
|---|---|---|
| **Pull from Production** | Read prod `{type}`, **upsert by `_id`** into local `{type}`. Doesn't touch local-only docs (dev work survives). | Sync legacy data into dev/staging. Idempotent. |
| **Migrate Unmigrated** (with optional `dry-run`) | Find local docs whose `_processSchema.migration` is missing or less than current target version. For each: **append to `{type}.archive`** (original shape preserved), normalise status tokens via `def.legacy.statusAliases`, append canonical history entries (with `_migration: { from, to, at }` markers), stamp `_processSchema: { migration: 'vN' }`. Re-snapshot the type. Dry-run produces a per-doc diff without committing. **Idempotent.** | After each Pull, or after fixing the alias map. |
| **Purge Legacy** | Delete from `{type}` and `{type}.snapshot` any doc whose `_processSchema` is absent OR contains only `migration` as a key (covers both pure + migrated legacy). | Clean dev state without touching new test records. |
| **Purge New** | Delete from `{type}` and `{type}.snapshot` any doc whose `_processSchema` has a feature key (`qa`/`sla`/`keyPeople`/`investmentCommittee`). | Clear out dev new records without losing legacy. |
| **Purge All** | Drop `{type}` and `{type}.snapshot` entirely. Doesn't touch `{type}.archive`. | Nuclear reset; re-run Pull afterwards. |
| **Restore Archive** | Read `{type}.archive`, **upsert by `_id`** back into `{type}`. Doesn't touch new records (their `_id` never appears in archive). Re-snapshot. | When a Migrate pass was wrong and we want pre-migration legacy state back. |

### State (no state machine — collection contents alone are authoritative)

A doc's state is determined by its `_processSchema` shape (Pure
Legacy / Migrated Legacy / New). The Migrate button can be run at any
time and will operate only on docs that need it. The `{type}.archive`
collection exists if-and-only-if at least one Migrate pass has run for
this type.

### Ordering rules

- **Raw migration: any order.** Each doc is rewritten in isolation;
  status normalisation per doc never reads another doc.
- **Re-snapshot: parent-before-child.** The snapshot pipeline reads
  parent state when building a sub-process snapshot. Per-type Migrate
  re-snapshots just that type immediately (sub-processes after
  parents naturally pick up the new parent snapshot). "Migrate All"
  defers all re-snapshots and runs them in dependency order at the
  end: `cr → pr → msac → msacc → msap → pmc → sc → scr`, then
  `pa, ia, ca, cn, sw`.
- **`_processSchema`: never touched.** Legacy docs come in without
  `_processSchema`, and they leave the migration without it. The
  field's absence is what tells the runtime to skip configured-only
  gates (`computeFacts.ts:72-77`).

### Locking + counts

- Migration in flight → all three buttons disabled for that type.
- Each row shows current state (Pristine / Migrated / In Progress),
  raw doc counts, and archive doc counts. Migrate fails fast if the
  pre-migration count differs from the post-migration count (a
  signal that something dropped or duplicated docs).

### Re-iteration loop

```
Pull from Production  →  Migrate Unmigrated (dry-run)  →  inspect diff
        ▲                                                       │
        │                                                       ▼
        └── (something wrong, fix alias map) ─── Migrate (commit)
                                                                │
                                                                ▼
                                                       Restore Archive
                                                                │
                                                                ▼
                                                       Migrate (re-run)
```

Every step is idempotent. Pull is additive (doesn't overwrite local
work). Migrate skips already-migrated docs. Restore reads from the
permanent archive. Once a cohort migrates cleanly N times in a row,
trust it; move to the next type.

### Production cutover (separate, much later)

When you're 100% confident across all types, prod follows the same
button sequence: Migrate (with dry-run first), inspect, commit. The
`{type}.archive` collection in prod becomes the audit trail of "the
moment we cut over". It stays forever.

## Plan

| Phase | Deliverable | Effort | Outcome |
|---|---|---|---|
| 1 — **Bridge type + audit** | Add `ProcessDef.legacy.statusAliases` type. Load it into `defAudit/buildCtx` so 8B + 8D treat aliased tokens as "known" while migration is in progress. | 0.5d | Audit accepts legacy aliases without losing drift detection on net-new emissions |
| 2 — **Discovery** | Sample every `cms_*` collection. For each type, produce the inventory of status tokens that appear in real docs but not in current `statusIds`. Populate `legacy.statusAliases` per def. SoW's `cms.sw.complete` is entry #1. | 1.5d | One alias map per type, source of truth for the migration |
| 3 — **Snapshot bridge** | Patch `cmsSnapshot/classifyDoc` (or equivalent) to read `def.legacy.statusAliases` during classification. Confirm via snapshot regenerate that legacy records still land in their correct gate. | 1d | Legacy records render correctly in current UI |
| 4 — **Migration script** | Per-type one-shot: walk each cohort, append canonical history entries with `_migration` markers, never delete. Dry-run mode + cohort-by-cohort apply. | 1.5d | Reversible, auditable, drainable backlog |
| 5 — **Runner verification** | Process runner gains a "migrated doc" walk mode that re-walks a migrated legacy doc through its remaining gates under the current def. Trip = migration mapping is wrong; rollback that cohort. | 1d | The runner is the migration acceptance gate |
| 6 — **Retire the bridge** | Once a type's `cms_*` collection has zero pre-migration records, remove `legacy.statusAliases` from that def. Audit goes back to flagging the same tokens as drift. One source of truth per type from this point. | 0.25d each | Bridge removed, def is canonical |

Phases 1 + 3 are the load-bearing pieces — without them, legacy records
start failing to render the moment we tighten the current def. Phases
2 + 4 are the actual migration. Phase 5 is the proof-of-correctness.
Phase 6 is the cleanup.

## Registry

Tracked in `doc/platform-todo-registry.md` under
`CMS-LEGACY-COMPAT` (P1 — pre-condition for every walk type going to
production).

## Open questions for the team

1. Is there a known inventory of legacy status tokens beyond the SoW
   case, or do we discover them by sampling Mongo?
2. Do we want view-layer canonicalisation (option 5 above) or is
   showing the historic label honest?
3. Should `legacy.acceptedLegacyTokens` also gate routing decisions
   (e.g. legacy doc never gets new task assignments) or is the
   alias-as-canonical enough?
