# Audit Hardening — Provisioning Runbook

**Run once per environment (local, staging, production).** The audit
hardening accounts live in each environment's own MongoDB — they are **not**
shipped by a deploy. If `/admin` → **Audit & Governance** → Service health shows

> **Append-only writer (insert-only)** — `AUDIT_WRITER_URI set but cannot connect`
> **Read account (find-only)** — `AUDIT_READER_URI set but cannot connect`

…the URIs reached this box (they travel in `.env`) but the `regno_audit`
database and its two accounts were never created **here**. This runbook fixes
that. Companion: [audit-service.md](./audit-service.md).

## Why this is a separate step

Append-only hardening routes the audit store through **two purpose-built Mongo
accounts** in a **separate `regno_audit` database** the app's own
(`regno:regno`) account has **no grant on**:

| Account | Role | Can | Cannot |
|---|---|---|---|
| `regno_audit_writer` | `auditWriter` | insert + bootstrap collections/indexes | update / delete / drop |
| `regno_audit_reader` | `auditReader` | find / listCollections / collStats | write anything |

Because the app account can't reach `regno_audit`, application code (or an
attacker who reaches it) **physically cannot erase or alter the trail**. The
app account can't create users/roles either — so provisioning **must be run by
a Mongo admin**, once, in each environment. Until then, audit degrades to the
normal app connection (the chain still seals, but the app could delete its own
records) and the two rows show red.

## The command

Run on the target box, as a **Mongo admin**. Pin the passwords to the ones
**already in this environment's `.env`** (the `pw` embedded in
`AUDIT_WRITER_URI` / `AUDIT_READER_URI`) so the accounts match what the app will
use — do **not** invent new ones:

```bash
# from the repo root on the target environment
AUDIT_WRITER_PW='<writer-pw-from-this-env-.env>' \
AUDIT_READER_PW='<reader-pw-from-this-env-.env>' \
mongosh "mongodb://<ADMIN_USER>:<ADMIN_PW>@localhost:27001/admin" scripts/audit-hardening-grant.js
```

The script (`scripts/audit-hardening-grant.js`) is **idempotent** — safe to
re-run. It:

- creates the `auditWriter` / `auditReader` roles + the two users in
  `regno_audit`,
- pre-creates the `audit_journal_cms` time-series collection (+ TTL + indexes),
- migrates any events already written to the fallback `regno.audit_journal_*`,
- prints `AUDIT_WRITER_URI` / `AUDIT_READER_URI` / `AUDIT_MONGO_DB`.

If you did **not** pin the passwords, paste the three printed values into this
environment's `.env` (overwriting the shipped ones) so the URIs match the
accounts you just created.

Then **restart `se` + the worker** so the app picks up the accounts.

## Verify

- `/admin` → **Audit & Governance** → Service health: **Append-only writer** and
  **Read account** turn **green** ("regno_audit writer connected — app cannot
  delete its audit").
- Or from the shell:
  ```bash
  # writer can insert but not delete; reader can find
  mongosh "$AUDIT_READER_URI" --eval 'db.audit_journal_cms.countDocuments({})'
  ```

## Why a deploy doesn't fix it (and can break it)

`create-release` **includes `.env`** in the bundle, so a deploy ships this
environment's audit **URIs** to the target — but **not the accounts**. Two
failure modes:

1. **Accounts never provisioned on the target** → auth fails → red rows. Run
   this runbook there.
2. **Target `.env` overwritten by the deploy** → if the target's Mongo has the
   accounts under *different* (auto-generated) passwords, the freshly-shipped
   `.env` no longer matches → auth fails. Re-run this runbook on the target,
   **pinning** the passwords to the deployed `.env` values, to reconcile them.

## Related: Lineage graph (Neo4j)

A separate red row — `Lineage graph (Neo4j) — AUDIT_GRAPH on but Neo4j
unavailable` — is **not** part of this runbook. It means `AUDIT_GRAPH=1` but no
reachable Neo4j (bolt 7687) on that box. Start/point Neo4j, or set
`AUDIT_GRAPH` off there. It's additive — it does not affect the journal or the
hash-chain.
