# Regno.ai Governance Substrate — Platform Documentation

> **Status as of 2026-06-05.**
> Phase 1 operational. Phases 2 and 3 designed; sessions scheduled.
> Documentation-provenance controls (append-only supersede, staleness
> detection, cited doc-search, agent grounding) operational — see
> [Documentation provenance](#documentation-provenance-operational).

This document is the canonical reference for the Governance Substrate.
It describes what the substrate is, why it exists, what's operational
today, and the full plan with progress checkboxes for every workstream
across all three phases.

> Looking for a non-technical version to hand to a customer, regulator,
> or procurement team? See [`governance-exec-summary.md`](./governance-exec-summary.md).

---

## TL;DR — What the substrate is, in one paragraph

A platform-wide, module-agnostic infrastructure for: identity-bounded
execution, append-only HMAC-chained audit logging, fully-replayable
execution traces, and a generalised Assurance API. The CMS test suite
is the first consumer. Cortex Flow and F1 will adopt the same surface
in following phases. The substrate makes the executive brief's claim
("any past behaviour of the platform is reconstructable, attributable,
and verifiable") operationally true.

---

## What it means to the platform

Three things change once the substrate is fully built out:

1. **Regno.ai becomes the governance-native AI platform.** Most
   vendors bolt governance onto a model platform; Regno's
   governance is the substrate. This is a defensible positioning
   advantage for procurement-led sales.

2. **Audit becomes a routine query, not a forensic exercise.** Any
   past execution — CMS test run, Cortex Flow agent phase, F1
   knowledge query — can be reconstructed deterministically and
   shown to a regulator with no excavation effort.

3. **New modules inherit governance for free.** Adding a Cortex Flow
   or F1 module to the Assurance API is one adapter file. Building
   audit / replay / scope-checking into every new module from
   scratch was the cost the substrate eliminates.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│  Modules: CMS · Cortex Flow · F1 · future                    │
├──────────────────────────────────────────────────────────────┤
│  Surface APIs                                                │
│    • Assurance   (test suites, runs, findings, fixes)        │
│    • Replay      (reconstruct any past execution)            │
│    • Wisdom      (cross-execution memory — Phase 2)          │
│    • Manifest    (.well-known/trust.json — Phase 3)          │
├──────────────────────────────────────────────────────────────┤
│  Governance Substrate                                        │
│    • PrincipalContext     — identity travels with intent     │
│    • AuditChain           — HMAC-chained event store         │
│    • ExecutionTrace       — snapshotted at every step        │
│    • PolicyRegistry       — declarative, versioned           │
│    • GuardrailPipeline    — ingress + egress chain           │
│    • EvaluatorPool        — rotated, multi-vendor            │
├──────────────────────────────────────────────────────────────┤
│  Existing infra: BullMQ · MongoDB · Qdrant · Realtime        │
└──────────────────────────────────────────────────────────────┘
```

---

## Where the code lives

| Concern | File |
|---|---|
| Public surface | `src/lib/server/services/governance/index.ts` |
| Shared types | `src/lib/server/services/governance/types.ts` |
| HMAC chain | `src/lib/server/services/governance/auditChain.ts` |
| Execution trace | `src/lib/server/services/governance/executionTrace.ts` |
| Assurance runner | `src/lib/server/services/governance/assurance.ts` |
| CMS adapter | `src/lib/server/services/governance/adapters/cmsAssuranceAdapter.ts` |
| Verify endpoint | `src/routes/api/governance/audit/verify/+server.ts` |
| Replay endpoint | `src/routes/api/governance/replay/[traceId]/+server.ts` |
| Daily root worker | `src/lib/server/queues/workers/ScheduledWorker.ts` (task `governance-audit-daily-root`) |
| Bootstrap migration | `scripts/migrate-governance.cjs` |
| Phase 1 backlog (now closed) | `doc/governance-phase1-backlog.md` |
| Original roadmap | `doc/governance-roadmap.md` |
| Executive brief | `doc/governance/regno-governance-executive.html` |
| Technical companion | `doc/governance/regno-governance-technical.html` |
| Doc supersede (append-only versioning) | `src/lib/server/grounding/docSupersede.ts` (chain in `doc/.supersede-index.json`) |
| Doc staleness detector | `src/lib/server/grounding/docStalenessCheck.ts` (task `doc-staleness-check`) |
| Doc-search RAG index | `src/lib/server/grounding/docSearchIndex.ts` (Qdrant `doc_search`) |
| Grounding corpus (L2) | `insights/` + `src/lib/server/cortex-flow/tools/RepoGroundingTool.ts` |

---

## MongoDB collections

| Collection | DB | Purpose |
|---|---|---|
| `audit_events` | platform (regno) | Append-only chain — every governed event |
| `audit_tenant_state` | platform | Per-tenant seq counter + tail seal |
| `audit_daily_roots` | platform | Signed Merkle roots, one per tenant per day |
| `execution_traces` | platform | Full inputs/context/output snapshot for replay |
| `assurance_assertions` | platform | Policy definitions per module |
| `assurance_runs` | platform | Run results — findings + verdict + counts |
| `assurance_fixes` | platform | Proposed and applied fixes |

Indexes installed by `scripts/migrate-governance.cjs`.

---

## Environment

Required:
- `AUDIT_MASTER_KEY` — 32+ char secret. Generated by `crypto.randomBytes(32).toString('hex')`. Quarterly rotation policy.
- `MONGO_URI` — existing platform DB URI.

---

## Phase 1 — DONE

Audit Substrate + Assurance API generalisation. CMS test suite migrated as first consumer.

### WS1 — Audit Substrate
- [x] WS1.1 — Schema + collections + indexes
- [x] WS1.2 — Atomic append path with HKDF-derived day keys
- [x] WS1.3 — `verifyChain` + `verifyDay` primitives
- [x] WS1.4 — Daily Merkle root computation
- [x] zstd payload compression
- [x] BSON Binary → Buffer coercion on read

### WS2 — ExecutionTrace
- [x] WS2.1 — Schema + indexes
- [x] WS2.2 — `TraceRecorder` builder API
- [x] WS2.3 — Evidence freeze hooks (content hashes captured)

### WS3 — Assurance API
- [x] WS3.1 — Schema + collections
- [x] WS3.2 — `AssuranceAdapter` interface + registry
- [x] WS3.3 — Public endpoints (run, fix, propose, apply)

### WS4 — CMS migration (first consumer)
- [x] WS4.1 — CmsAssuranceAdapter — loadTargetContext + runAssertion
- [x] WS4.1b — CmsAssuranceAdapter — proposeFix (brief / patch-seed / patch-doc / reseed)
- [x] WS4.1c — CmsAssuranceAdapter — applyFix (file write / Mongo update / script spawn)
- [x] WS4.2 — Endpoint shims (`/run` and `/findings/fix` delegate to substrate)
- [x] WS4.3 — UI compatibility (zero changes to StructureTab Tests view)
- [ ] WS4.4 — Data backfill — legacy `cms_audit_tests` / `cms_audit_test_runs` migration to `assurance_*` collections (optional; current shim writes to both)

### WS5 — Replay
- [x] WS5.1 — `replayTrace` body — Mode A + Mode B with Jaccard divergence band
- [x] WS5.2 — Public endpoint `POST /api/governance/replay/{traceId}` + `GET` for metadata

### WS6 — Verify + scheduled integrity
- [x] WS6.1 — On-demand verify endpoint
- [x] WS6.2 — Scheduled task `governance-audit-daily-root` registered in `ScheduledWorker.ts`

### Operational verification (2026-05-29)
- [x] Migration script smoke test passes end-to-end
- [x] Live verify endpoint returns `ok:true` against the genesis row
- [x] Real CMS test run through shim produces seq 2–4 in the chain
- [x] All 4 audit rows verify under `verifyChain [1..4]`
- [x] Tamper test (byte-flipped seal) fails verification as required

### SEC2 — Admin role + privilege catalogue (DONE 2026-05-30)

Single source of truth for the platform's operational admin/monitoring
privileges plus the `app.administration` role that bundles them.

**Catalogue file** — `src/lib/server/security/adminPrivileges.json`. Both
runtimes load from here:

| Consumer | How |
|---|---|
| SvelteKit server | `import { PLATFORM_PRIVILEGES, PLATFORM_ROLES, getAdministratorPrivileges } from '$lib/server/security/adminPrivileges'` |
| Seeders | `require('../src/lib/server/security/adminPrivileges.json')` — used by `seed-consolidated-privileges.cjs` and `bootstrap-admin.cjs` |

Adding a privilege: edit the JSON, run `node -r dotenv/config
scripts/seed-consolidated-privileges.cjs` — the seeder upserts every
catalogue entry into `privileges` and rebuilds the `app.administration`
role's privilege list. Cache invalidation publishes automatically so the
running dev server picks the change up without a restart.

**Bootstrap an admin user** — for the very first admin on a fresh install
(or to recover one who lost the role):

```bash
# Dry run first
node -r dotenv/config scripts/bootstrap-admin.cjs --email user@example.com --dry-run
# Apply
node -r dotenv/config scripts/bootstrap-admin.cjs --email user@example.com
```

The script verifies the role exists, preserves the user's other roles,
writes both `profile.roles` (canonical) and top-level `roles` (legacy
mirror), and publishes a `users` cache invalidation. Sign out + sign
back in for the browser session to pick up the new effective privileges.

Subsequent promotions / demotions go through the Users admin UI; the
bootstrap script is only for cold-start scenarios.

---

## Phase 2 — DESIGNED, scheduled

Principal threading + pre-deployment gating. 2 months.

### WS7 — Principal threading through Cortex Flow Orchestrator (NEXT SESSION)
- [ ] WS7.1 — Define `Principal` shape in `src/lib/types/principal.ts`
- [ ] WS7.2 — Thread `Principal` through `Orchestrator` → phase execution → tool invocation → audit events
- [ ] WS7.3 — Linter rule: any function above the credential boundary must take `Principal` as first arg
- [ ] WS7.4 — Add `principal` to every BullMQ job payload
- [ ] WS7.5 — Tests: agent X invoked by user without scope Y refuses data Y; refusal lands in audit chain
- [ ] WS7.6 — Migration: backfill existing in-flight executions with `ANON_PRINCIPAL` (compat)

### WS8 — Scoped Token Exchange at tool boundary
- [ ] WS8.1 — `TokenExchangeService` abstraction (RFC 8693 OAuth 2.0 Token Exchange shape)
- [ ] WS8.2 — Per-tool declared upstream + scope intersection
- [ ] WS8.3 — Short-lived assertion mint via internal trust authority
- [ ] WS8.4 — `act` claim preservation (RFC 8693 §4.1) — agent as actor, principal as subject
- [ ] WS8.5 — Audit-log every exchange + every fallback to service-account
- [ ] WS8.6 — Fallback workflow: service-account-with-principal-header, gated to tier-1 risk

### WS9 — Tenant boundary enforcement
- [ ] WS9.1 — Qdrant collection naming: `{module}_{tenant_id}_{purpose}`
- [ ] WS9.2 — Mongo handle wrapper: every query implicitly filters by tenant
- [ ] WS9.3 — Cross-tenant query rejection at the API layer
- [ ] WS9.4 — Migration script for existing shared collections
- [ ] WS9.5 — Tests: a tenant cannot retrieve another tenant's vectors or docs

### WS10 — Versioned Model Cards
- [ ] WS10.1 — `ModelCard` schema on `cortex_agents` — `{ id, version, allowedTools[], deniedBehaviours[], costCeilingUsd, maxTokens, allowedDataPolicies[], regulatoryClass }`
- [ ] WS10.2 — Card editor UI under `/admin/cortex/agents`
- [ ] WS10.3 — Promotion gate: card-version-N cannot promote without diff approval
- [ ] WS10.4 — `AgentPhaseTemplate` enforcement: phases cannot exceed card's allowances at runtime
- [ ] WS10.5 — Diff viewer for card-version-N vs N-1

### WS11 — Red-team battery
- [ ] WS11.1 — Curate attack corpus from OWASP LLM Top 10 + domain probes
- [ ] WS11.2 — `RedTeamRunner` service that executes each attack against a card-under-test
- [ ] WS11.3 — Claude-as-judge scoring
- [ ] WS11.4 — Threshold: card cannot promote to `prod` ring until score ≥ X
- [ ] WS11.5 — Scheduled task: corpus refresh quarterly
- [ ] WS11.6 — Findings flow into wisdom store as anti-patterns

### WS12 — Cost + quota gates
- [ ] WS12.1 — `tenant_quotas` collection — { tier, monthly_budget_usd, hard_ceiling_usd }
- [ ] WS12.2 — Pre-execution check: projected cost + month-to-date vs quota
- [ ] WS12.3 — Degrade-mode swap (Sonnet → Haiku, depth=deep → standard) instead of hard fail
- [ ] WS12.4 — Quota dashboard in `/admin/governance`

---

## Phase 3 — DESIGNED, scheduled

Runtime enforcement + compliance surface. 2 months.

### WS13 — Ingress guardrail pipeline
- [ ] WS13.1 — `GuardrailChain` tool-chain abstraction
- [ ] WS13.2 — PII redaction module (regex + small ML model)
- [ ] WS13.3 — Prompt-injection classifier (Haiku-based judge)
- [ ] WS13.4 — Per-tenant policy: which categories to mask vs block vs allow
- [ ] WS13.5 — Audit row on every guardrail trigger (kind: `guardrail`, severity tagged)
- [ ] WS13.6 — Restoration: masked PII restored post-egress where appropriate

### WS14 — Egress guardrail pipeline
- [ ] WS14.1 — `assertContract<T>(value, schema)` — fail closed wrapping every tool output
- [ ] WS14.2 — Grounding verification — every claim traces back to retrieved chunk's content hash
- [ ] WS14.3 — Data exfiltration scan — regex + entity-recognition against tenant's "do-not-output" set
- [ ] WS14.4 — Confidence + grounding scores attached to every response
- [ ] WS14.5 — Tiered enforcement — structural on every; full grounding above threshold; sampled at rest

### WS15 — Degradation modes
- [ ] WS15.1 — Three modes per agent: `creative` / `restricted` / `safe-refuse`
- [ ] WS15.2 — Mode metadata on every Cortex agent
- [ ] WS15.3 — Auto-degrade when egress confidence < threshold
- [ ] WS15.4 — User-visible mode badge on outputs

### WS16 — SSE kill switch + emergency stop
- [ ] WS16.1 — `cortex.kill` SSE event with job-id payload
- [ ] WS16.2 — Worker poll for kill signal at phase boundaries
- [ ] WS16.3 — Emergency-stop button in `/admin/governance`
- [ ] WS16.4 — Audit row on every kill event

### WS17 — Risk tier classification + workflow
- [ ] WS17.1 — `risk_tier` field on every workload (`agents`, `assurance_assertions`, etc.)
- [ ] WS17.2 — Classification questionnaire at workload creation
- [ ] WS17.3 — Auto-cross-checks: declared tier vs data classes vs tool scope
- [ ] WS17.4 — Tier-3 promotion requires independent sign-off (workflow + UI)
- [ ] WS17.5 — Tier-gated rules engine in `AssuranceAdapter`

### WS18 — Erasure pipeline (GDPR)
- [ ] WS18.1 — Delete user → erase all derived state: docs, embeddings, wisdom, audit (with seal preserved)
- [ ] WS18.2 — Erasure events themselves audit-chain anchored
- [ ] WS18.3 — Tombstone shape on `audit_events` (`erased: true` + schema preserved + values nulled)
- [ ] WS18.4 — Replay surface flags "evidence-erased" on affected traces

### WS19 — Trust manifest — `regno.ai/.well-known/trust.json`
- [ ] WS19.1 — `TrustManifest` shape — `{ platform, version, controls{}, certifications[], subprocessors[], residency[], retention{}, incident_sla{}, contact }`
- [ ] WS19.2 — Generated from internal control state (cannot drift from operational truth)
- [ ] WS19.3 — `.well-known/trust.json` route serves it
- [ ] WS19.4 — Internal status board: every layer reports its operational state
- [ ] WS19.5 — Sub-routes for evidence: `/.well-known/trust/L1`, `/L4`, etc.

### WS20 — Multi-vendor evaluator pool
- [ ] WS20.1 — Evaluator rotation policy + admin UI
- [ ] WS20.2 — Cross-vendor confirmation requirement (≥2 distinct vendors for promotion)
- [ ] WS20.3 — Monthly rotation audit

---

## Documentation provenance (operational)

The substrate's defining claim — *any past behaviour is reconstructable,
attributable, and verifiable* — is not limited to executions. The same
three properties govern the platform's own corpus: `doc/` (human-facing
documentation) and `insights/` (the L2 grounding corpus agents read).
This closes the loop where governance language often leaks: the docs
that describe the controls are themselves under control.

**Append-only, never mutated (attributable).** Documents are revised by
*superseding*, never by editing in place (rule 06 §2). `docSupersede.ts`
writes a versioned sibling (`name-v2.md`, `name-v3.html`, …), leaves the
original byte-for-byte intact as a historical record, and records the
who / why / when of every revision in `doc/.supersede-index.json`. The
versioned chain is surfaced in the `/admin` docs viewer, so the audit of
"why does this doc say what it says, and who changed it" is a click, not
an excavation — the documentation analogue of the audit chain.

**Drift is detected, not assumed (verifiable).** Every claim in
`insights/` is tied to a real repo path, and `docStalenessCheck.ts`
(scheduled task `doc-staleness-check`; also exposed at
`GET /api/admin/grounding/status` and `GET /api/admin/grounding/sweep`)
scans the corpus for references to files that no longer exist. A flagged doc is
a *supersede candidate*, never silently rewritten. The corpus-wide sweep
(`POST /api/admin/grounding/sweep`) enqueues one `doc-author` job per
flagged doc; each grounds in the **current** source before authoring a
new version through the supersede flow — so a refresh can correct drift
without ever discarding the prior record.

**Reconstructable as a query.** `docSearchIndex.ts` embeds the whole
corpus into a Qdrant `doc_search` collection with `{rel, heading,
version, isLatest}` provenance on every chunk, and the `doc-search`
worker retrieves passages (latest versions preferred) and synthesises a
**cited** answer. "What does the platform say about X, and where" becomes
a single retrieval with sources — audit-as-a-query, extended from
executions to documentation. Synthesis runs in the execution worker, not
the SvelteKit process (rule 05 §2).

**Agents see the real subject (grounded).** The `RepoGrounding` tool
(`RepoGroundingTool.ts`, read-only, repo-root-scoped) lets every agent
read `insights/` and live source before it generates — the operational
expression of *ground before you generate / refuse to invent* (rule 10).
Governance is therefore not a document an agent can contradict by
guessing; it is grounding the agent is built to consult.

---

## Cross-cutting (every phase)

- [ ] CC.1 — Threat models for: prompt injection via retrieval, tool chaining to bypass scope, memory poisoning, cost exfiltration
- [ ] CC.2 — Chaos drills: Qdrant disconnect, audit row corruption, guardrail under load
- [ ] CC.3 — Distributed tracing (OpenTelemetry) across SvelteKit → BullMQ → Execution → external APIs
- [ ] CC.4 — Cryptographic agility — algorithm tag on every seal so future rotation produces a parallel chain

---

## Operations

### How to start an audit run
The CMS test suite UI is the easiest entry. Open `Audit → Tests` in the CMS debug console, add a test, run it. The substrate records everything automatically.

### How to verify the chain
```bash
curl -X POST "http://localhost:5173/api/governance/audit/verify" \
  -H "Content-Type: application/json" \
  -d '{"tenant":"default","range":[1,99]}'
```

### How to replay a past execution
```bash
curl -X POST "http://localhost:5173/api/governance/replay/{trace_id}" \
  -H "Content-Type: application/json" \
  -d '{"mode":"behavioural"}'
```

### How to add a new module as an Assurance consumer
1. Create `src/lib/server/services/governance/adapters/{module}AssuranceAdapter.ts`
2. Implement the `AssuranceAdapter` interface
3. Import it from `index.ts` for side-effect registration
4. The substrate now serves the module — no further changes needed

### Master key rotation
1. Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Re-seal pass (Phase 2 utility, not yet built) to migrate existing rows
3. Update `.env` and restart all servers
4. Old `audit_daily_roots` should be re-signed via the re-seal pass; existing rows that pre-date the rotation reference the old key for forward verification

---

## Glossary

- **Audit chain**: the append-only sequence of `audit_events` rows for a tenant, sealed via HMAC and rolling up into a signed Merkle root each day
- **Adapter**: a module-specific implementation of `AssuranceAdapter` — wraps the module's particular concerns (context loading, finding evaluation, fix proposal) behind the substrate's generic interface
- **Assertion**: a policy declaration — what should be true about a target (e.g., a CMS test definition)
- **Run**: one invocation of an assertion against a specific target — produces findings + verdict + counts
- **Trace**: an `ExecutionTrace` row capturing the full reasoning for a run — system prompt, retrievals, model call, tool calls, output
- **Replay**: re-invoking the model with the frozen trace inputs to verify deterministic reproduction (Mode A) or measured similarity (Mode B)
- **Day key**: deterministically derived from master via HKDF + date; never persisted; rotated implicitly daily
- **Daily root**: Merkle root over the day's seals + a signature with the master key; archived to provide tamper detection that doesn't depend on the tampered row surviving
- **Principal**: identity context propagated end-to-end through every governed call (Phase 2)
- **Model card**: versioned declaration of an agent's capabilities, restrictions, and cost ceiling (Phase 2)
- **Trust manifest**: machine-readable `trust.json` describing the platform's operational state, certifications, and commitments (Phase 3)
- **Supersede**: revising a `doc/` document by writing a new versioned sibling (`name-v2.md`) rather than editing in place; the original is preserved and the who/why/when is recorded in `doc/.supersede-index.json` (rule 06 §2 — never discard)
- **Supersede index**: `doc/.supersede-index.json` — the provenance chain for documentation; for each base doc it records every version, its actor, reason, and timestamp, and which version is latest
- **Grounding corpus (L2)**: `insights/` — the curated GLOSSARY / ARCHITECTURE / DECISIONS knowledge agents read via the `RepoGrounding` tool; every claim is tied to a real repo path so drift is mechanically detectable
- **Staleness flag**: an advisory mark from `docStalenessCheck.ts` that a doc references repo paths which no longer exist — a *supersede candidate*, never an automatic rewrite
- **doc_search**: the Qdrant collection of embedded `doc/` chunks (with version/isLatest provenance) behind the cited "Ask the docs" RAG search
