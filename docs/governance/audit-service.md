# Platform Audit Service (REGNO-AUDIT)

## What it is

A platform-level **audit daemon**: a background service that records *what users and systems actually did*
— login, navigate, filter, run a report, paginate, export, create a CR, edit a field, add/delete a file,
fire a gate action — by **user + timestamp**, across any platform surface. CMS is the first consumer.

It plugs into the existing **governance story**: the material subset of events is also sealed into the
tamper-evident `audit_events` hash-chain (`governance/auditChain.ts`), so the audit isn't just a log — it's
**provable**. The rest is journaled efficiently for the "what happened" narrative an AI script-writer (via
Cortex Flow) can answer questions over: *what did user X do, in window Y, on CR Z?*

It is **non-invasive**: capture is fire-and-forget; a background writer batches to storage; if it falls
behind or dies, the app is unaffected. We **link, never duplicate** — change data already lives in
`*.snapshot`; the audit references entities (`cr:CR5690`) rather than copying them.

## Design decisions (agreed)

- **Capture at the persistence boundary, not the keystroke.** Whenever the system persists — small or large
  — we audit it (the action + a compact diff/summary, linked to the record). The client SDK only captures
  *journey* (nav / filter / report-run / export / scroll-milestone), never per-keystroke.
- **Granularity that makes sense** — milestone scroll ("reached page 10 of report X"), not every scroll px.
- **Near-real-time, but efficiency + zero app-performance-impact is paramount.** Emit is O(1); a buffered
  writer flushes batches; P2 moves to a dedicated BullMQ worker (true daemon) for durability.
- **Tiered retention** — hot (recent, full detail) → warm (rolled-up) → cold (archived), per service.
- **AI Q&A via Cortex Flow** — the NL layer is a Cortex Flow agent over the stores; it augments the platform.

## Architecture

```
 producers                         transport (non-blocking)        daemon                stores
 ─────────                         ────────────────────────        ──────                ──────
 client SDK  ──/api/audit/ingest─┐
 (journey)     (batched beacon)   ├─► buffered writer (P1, in-proc) ─► batch flush ─► Mongo time-series (journal, per service)
 server emit ────────────────────┘   └► BullMQ queue (P2 daemon)                    ─► Neo4j (link graph, P2)
 (persistence boundary)                                                             ─► Qdrant (semantic, P3)
                                                                  material events ─► audit_events chain (governance proof)
```

### Storage — best tool per job, **siloed per service**

| Store | Role | Powers | Phase |
|---|---|---|---|
| **Mongo time-series** `audit_journal_<service>` | the efficient append-only event log; `meta:{service,userId}` + indexed `action`/`entity`; TTL/tiered retention | "users today", "who created changes", "timeline for 01.01.2026" | **P1** |
| **Neo4j** | the **link graph** `(User)-[:DID]->(:Event)-[:ON]->(:Entity:CR/PR/File/Report)` — references only | "everything done on CR5690", cross-service traversal | P2 |
| **Qdrant** | semantic index of session narratives | the Cortex-Flow Q&A | P3 |
| **`audit_events`** (existing) | tamper-evident hash-chain + daily Merkle roots | governance proof for material events | P2 |

Time-series collections are append-only (perfect for audit), auto-bucketed + compressed, with
`expireAfterSeconds` for the hot tier; a scheduled rollup moves older data to warm/cold (P2).

### The event model

```ts
AuditEvent = {
  ts: Date,                       // timeField
  meta: { service, userId },      // metaField — the natural series (a user's events bucket together)
  sessionId, actorRealId?,        // actorRealId = the real user when aliasing
  action,                         // 'auth.login' | 'nav.page' | 'filter.apply' | 'report.run' |
  category,                       //   'export' | 'record.create|update|delete' | 'file.add|delete' | 'gate.action'
  entityType?, entityId?,         // link target: 'cr' / 'CR5690'  (NOT the data — a reference)
  detail?,                        // compact payload: filter value, page #, diff summary, byte count
  ms?,                            // duration where relevant
}
```

### Registry (per-service instance)

Each consuming surface registers an instance — its `id`, action vocabulary, retention tier sizes, and
silo. CMS registers `cms`. Adding a new service = a registry entry + emitting events; its data is physically
siloed (own TS collection, own graph labels, own Qdrant collection) so each "runs independently to create
the full picture."

### `/admin/audit` UI (audit-role-gated)

- **Today** summary: active users, total actions, who-created-what, actions-by-category.
- **Timeline**: pick a date → every action that day, grouped by user → session.
- **User audit + session replay**: the narrative (login → summary → filter *suspended* → reports → run
  report → page 10 → export).
- **Entity audit**: "all activity on CR5690."
- **Integrity panel** (P2): verify the chain + daily Merkle roots.
- **NL Q&A** (P3): Cortex-Flow agent — *"how many users used CMS today?"*.

### Access control

A new **`audit`** permission/role (`audit.read`), granted to **developers only initially** — both
`app.administration` and `app.development` carry `audit.read`, so devs/admins pass, and a dedicated auditor
is assignable via `/admin` with no code change. Seeded by `scripts/audit-hardening-grant.js`' sibling
`scripts/seed-audit-role.cjs` into the platform `roles`/`privileges` collections. The `/admin/audit` UI and
`/api/admin/audit/**` read APIs are gated by `ensureAuditAccess`. The **ingest** endpoint
(`/api/audit/ingest`) is open to any authenticated user — they may only record their *own* activity (the
server stamps the real principal from the session, never trusting client-claimed identity).

### Hardening — append-only, enforced by RBAC

Time-series collections are append-*oriented* but **not truly immutable** (they can be dropped/TTL-evicted),
so immutability is enforced at the **DB privilege layer**, not the collection type. The journal lives in a
**separate database `regno_audit`** that the app's main (read-write) account has **no grant on**, reached by
two purpose-built accounts:

| Account | Role | Privileges | Used by |
|---|---|---|---|
| `regno_audit_writer` | `auditWriter` | `insert` + collection/index bootstrap — **no `update`/`remove`/`drop`** | the emit/store write path |
| `regno_audit_reader` | `auditReader` | `find` / `listCollections` / `collStats` only | the `/admin/audit` query API |

So application code (or an attacker who reaches it) **physically cannot delete or alter** the audit trail.
Routing lives in `src/lib/server/audit/auditDb.ts` (`auditWriteDb()` / `auditReadDb()`), gated on
`AUDIT_WRITER_URI` + `AUDIT_READER_URI`. **Provision** the accounts with `scripts/audit-hardening-grant.js`
(run as a Mongo admin — it creates the roles/users, pre-creates `audit_journal_cms`, migrates any events
already in `regno`, and prints the `.env` lines). When the URIs are unset (dev), the journal transparently
uses the app DB connection and logs a one-time warning — the substrate still works, hardening is just
inactive. Hardening is all-or-nothing: a writer without a reader fails loudly rather than mis-routing reads.

## Where the code lives

| Concern | Path |
|---|---|
| Event model + registry | `src/lib/server/audit/types.ts`, `registry.ts` |
| Time-series store | `src/lib/server/audit/store.ts` |
| Hardened connection routing | `src/lib/server/audit/auditDb.ts` (insert-only writer / find-only reader) |
| Provisioning (admin) | `scripts/audit-hardening-grant.js` (roles+users), `scripts/seed-audit-role.cjs` (audit role) |
| Non-blocking emitter | `src/lib/server/audit/emit.ts` (`auditEmit`) |
| Ingest (client journey) | `src/routes/api/audit/ingest/+server.ts` |
| Read API (gated) | `src/routes/api/admin/audit/query/+server.ts` |
| Access gate | `src/lib/server/security/ensureAuditAccess.ts` |
| Client SDK | `src/lib/audit/auditClient.ts` (`audit()`) |
| Admin UI (shared) | `src/lib/components/admin/AuditConsole.svelte` — `/admin` tab + `/admin/audit` route + CMS dev view |
| CMS wiring | `CmsPage.svelte` (journey + dev-area view) + CMS write paths (persistence emit) |
| **P2 — chain sealing** | `src/lib/server/audit/seal.ts` (`sealMaterial`, serialized), `sealDaemon.ts` (opt-in durable queue) |
| **P2 — integrity** | `src/lib/server/audit/integrity.ts` (`chainIntegrity`/verifyChain) · `dailyRoot.ts` (scheduled Merkle roots) |
| **P2 — detectors** | `src/lib/server/audit/detectors.ts` (SoD / export-provenance / denied) |
| **P3 — evidence/erasure** | `evidencePack.ts` + `/api/admin/audit/evidence` · `cryptoShred.ts` + `/erase` |
| **P3 — anomaly/anchor/ask** | `anomalies.ts` · `anchor.ts` (RFC-3161, gated) · `semanticIndex.ts` + `/api/admin/audit/ask` |

## Phasing

- **P1 (Built):** Mongo-TS journal, registry, non-blocking emitter, ingest + gated read API,
  `ensureAuditAccess`, client SDK, `/admin/audit` console, CMS wired. **Hardening** (insert-only writer /
  find-only reader in `regno_audit`) provisioned + verified.
- **P2 (Built):** `audit_events` chain-sealing of material events → integrity verify + tamper-evidence panel
  → daily Merkle-root sealing (scheduled) → durable BullMQ seal daemon (opt-in) → compliance detectors
  (SoD / export / denied). Neo4j lineage graph **deferred** (no generic write API — see decisions D7).
- **P3 (Built):** verifiable evidence packs · crypto-shred erasure · anomaly heuristics · external RFC-3161
  anchoring (gated; ASN.1 TSQ encoder remaining) · Qdrant semantic "ask the audit log" (conversational agent
  = Cortex-Flow wrapper). See `audit-p2-p3-decisions.md` (D1–D8).

## Built vs planned
P1/P2/P3 are **Built** as catalogued above. Explicit remaining pieces are marked in the decisions log:
the RFC-3161 ASN.1 encoder (D6), the Neo4j lineage graph prerequisite (D7), and the Cortex-Flow NL-Q&A
agent wrapper (D8). Every claim ties
to a real path so drift is detectable.
