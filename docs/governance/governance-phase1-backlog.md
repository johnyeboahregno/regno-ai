# Governance Substrate — Phase 1 Execution Backlog

> **Scope.** Build the Audit Substrate + Execution Trace primitive + a
> generalised Assurance API. Migrate the existing CMS test suite (built in
> the recent /loop session) to use it as the first consumer. This is the
> smallest meaningful slice that proves the substrate works in practice
> and produces user-visible value within weeks.
>
> **Out of Phase 1**: Principal end-to-end threading (Phase 2), runtime
> guardrails (Phase 3), trust.json manifest (Phase 3), model cards (Phase 2).
> Stubs and interface placeholders only — fully implemented later.
>
> **Target outcome.** A regression in any CMS-managed change surfaces as a
> finding in the Assurance API, with a replayable trace, against a tamper-
> evident audit row. The same Assurance API is callable from Cortex Flow
> and F1 with zero substrate changes.

---

## Workstreams

| ID | Workstream | Owner | Effort |
|---|---|---|---|
| WS1 | Audit Substrate (HMAC chain + daily Merkle) | Platform | L |
| WS2 | ExecutionTrace primitive | Platform | M |
| WS3 | Generalised Assurance API | Platform | M |
| WS4 | CMS test suite migration (first consumer) | CMS | M |
| WS5 | Replay endpoint | Platform | S |
| WS6 | Verify endpoint + scheduled integrity check | Platform | S |

---

## WS1 — Audit Substrate

### WS1.1 — Schema + collections

**Files**: new `src/lib/server/services/governance/types.ts`, `auditChain.ts`

**Collections** (platform DB `regno`):

```
audit_events {
  _id: ObjectId,
  tenant_id: string,           // initially: 'default' until Phase 2 multi-tenancy
  seq: bigint,                 // monotonic per tenant
  ts: Date,
  principal_ref: {             // soft placeholder until Phase 2
    user_id: string | null,
    session_id: string | null,
    originating_request_id: string | null,
  },
  kind: 'prompt' | 'retrieval' | 'model_call' | 'tool_call'
      | 'guardrail' | 'degradation' | 'classification'
      | 'assurance_run' | 'finding' | 'fix_apply',
  payload: Buffer,             // zstd-compressed canonical JSON
  payload_hash: Buffer,        // SHA-256 of canonical payload
  prev_seal: Buffer,           // HMAC chain link
  seal: Buffer,                // HMAC(K_day, prev_seal || payload_hash || seq)
  trace_id: string | null,     // FK to execution_traces._id when applicable
  erased: boolean,             // GDPR erasure marker
}

audit_tenant_state {
  _id: tenant_id,
  next_seq: bigint,
  tail_seal: Buffer,
  master_key_id: string,
  created_at: Date,
}

audit_daily_roots {
  _id: { tenant_id, day },     // day = 'YYYY-MM-DD'
  root: Buffer,                // Merkle root over the day's seals
  signed_root: Buffer,         // detached signature with K_master
  event_count: number,
  created_at: Date,
}
```

**Indexes**:
- `audit_events`: `{ tenant_id: 1, seq: 1 }` unique
- `audit_events`: `{ tenant_id: 1, trace_id: 1 }` for replay lookups
- `audit_events`: `{ tenant_id: 1, ts: 1 }` for daily verify
- `audit_daily_roots`: `{ _id: 1 }` (compound _id already unique)

**Acceptance**:
- Schemas created on platform DB
- Indexes installed via a migration script `scripts/migrate-governance.cjs`
- Master key bootstrap routine in place (reads `AUDIT_MASTER_KEY` env var; documents HSM upgrade path)

### WS1.2 — Append path

**Signature**:

```ts
async function appendEvent(
  tenant: string,
  kind: AuditEventKind,
  payload: unknown,
  ctx: { principal?: PrincipalRef; trace_id?: string } = {},
): Promise<{ seq: bigint; seal: Buffer }>
```

**Behaviour**:
- Allocate seq atomically via `audit_tenant_state.next_seq` increment in a transaction
- Read tail seal in same transaction
- Compute payload_hash (SHA-256 over RFC 8785 JCS canonical JSON)
- Derive K_day via HKDF-Expand(K_master, "audit.daily." || date, 32)
- Compute seal: HMAC-SHA-256(K_day, prev_seal || payload_hash || u64be(seq))
- Insert audit_events row + update tail in same transaction
- Return seq + seal so caller can pin the receipt

**Acceptance**:
- Concurrent appends produce monotonic seq with no chain breaks (test under load)
- Failure mid-transaction does not advance state
- Payload over 1 MB triggers a warning but is not rejected (use cold storage for the body)

### WS1.3 — Verify paths

```ts
async function verifyChain(tenant: string, range: [bigint, bigint]): Promise<VerifyResult>
async function verifyDay(tenant: string, day: string): Promise<VerifyResult>
```

**Behaviour**:
- Walk rows in seq order, recompute seal at each row, compare
- For verifyDay: compute Merkle root over the day's seals, compare against archived signed root, verify signature

**Acceptance**:
- A row whose payload is mutated breaks verifyChain at that exact row
- A row deleted breaks verifyChain at the next row's prev_seal reference
- A row whose seal is replaced breaks verifyDay even if verifyChain were stubbed

### WS1.4 — Daily Merkle root job

**File**: `src/lib/server/queues/workers/AuditDailyRootWorker.ts`

**Schedule**: 02:00 UTC daily, runs against previous UTC day

**Behaviour**:
- For each tenant with at least one event in the day:
  - Build Merkle tree over seals ordered by seq
  - Sign root with K_master
  - Insert into `audit_daily_roots`
  - Cold-archive the day's rows (move to S3 or kept in Mongo with longer-term retention)

---

## WS2 — ExecutionTrace primitive

### WS2.1 — Schema

```
execution_traces {
  _id: string,                          // UUID
  tenant_id: string,
  module: 'cms' | 'cortex-flow' | 'f1' | 'knowledge-ingest' | 'assurance',
  kind: string,                         // e.g. 'assurance_run' | 'agent_phase'
  principal_snapshot: PrincipalRef,
  started_at: Date,
  ended_at: Date | null,
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled',

  inputs: {
    system_prompt: string | null,
    user_prompt:   string | null,
    arguments:     unknown,             // module-specific
  },
  context: {
    retrieved_evidence: Array<{ source_id: string; content_hash: string }>,
    wisdom_injected:    Array<{ insight_id: string }>,
    tool_definitions:   Array<{ name: string; version: string }>,
  },
  model: { name: string; version: string; parameters: unknown } | null,
  tool_calls: Array<{
    name: string; version: string;
    inputs: unknown; outputs: unknown;
    deterministic: boolean; side_effecting: boolean;
    duration_ms: number;
  }>,
  output: unknown,
  output_hash: Buffer | null,

  // Linkage to audit chain
  audit_seq_range: [bigint, bigint] | null,
  
  // Replay metadata
  evidence_archived_at: Date | null,    // when evidence was moved to cold
}
```

### WS2.2 — Capture API

```ts
class TraceRecorder {
  static start(opts: TraceStartOpts): TraceRecorder;
  setInputs(inputs: TraceInputs): void;
  recordRetrieval(evidence: Array<EvidenceRef>): void;
  recordWisdom(insights: Array<{ insight_id: string }>): void;
  recordModelCall(model: ModelRef, params: unknown): void;
  recordToolCall(call: ToolCall): void;
  setOutput(output: unknown): void;
  async finalize(status: 'completed' | 'failed' | 'cancelled'): Promise<string>;
}
```

**Acceptance**:
- A trace is uniquely identified by UUID
- `finalize()` writes the trace row + emits an `audit_events` row of kind `execution_trace_finalized` with the trace_id and output_hash
- The audit row's seal anchors the trace to the chain

### WS2.3 — Evidence freeze

- At trace start, snapshot content hashes of every retrieval
- Move evidence content into cold storage after 90 days but keep the hash + chunk_id forever
- On replay, content is fetched from cold if not in hot

---

## WS3 — Generalised Assurance API

### WS3.1 — Schema

```
assurance_assertions {
  _id: ObjectId,
  module: string,                       // 'cms' | 'cortex-flow' | 'f1' | ...
  title: string,
  description_html: string,             // RichTextArea-produced
  target_kind: string,                  // module-specific, e.g. 'cms.change.tab'
  enabled: boolean,
  order: number,
  created_at: Date,
  created_by: string,
  evaluator_config: {                   // pluggable per module
    type: 'llm' | 'rule' | 'composite',
    config: unknown,
  },
}

assurance_runs {
  _id: ObjectId,
  assertion_id: ObjectId,
  trace_id: string,                     // FK to execution_traces
  module: string,
  target_ref: unknown,                  // e.g. { processType: 'cr', docId: '...' }
  status: 'queued' | 'running' | 'completed' | 'failed',
  ran_at: Date,
  findings: Array<Finding>,
  verdict: string,
  counts: { pass: number; warn: number; fail: number },
  cost_usd: number | null,
}

assurance_fixes {
  _id: ObjectId,
  run_id: ObjectId,
  finding_index: number,
  action: 'brief' | 'patch-seed' | 'patch-doc' | 'reseed' | 'custom',
  proposal: unknown,
  applied: boolean,
  applied_at: Date | null,
  applied_trace_id: string | null,
}
```

### WS3.2 — Adapter interface

Each module registers an adapter implementing:

```ts
interface AssuranceAdapter {
  module: string;
  
  loadTargetContext(target_ref: unknown): Promise<unknown>;
  
  runAssertion(
    assertion: AssertionDoc,
    context: unknown,
    recorder: TraceRecorder,
  ): Promise<{ findings: Finding[]; verdict: string }>;
  
  supportedFixActions(finding: Finding): FixActionKind[];
  
  proposeFix(
    finding: Finding,
    action: FixActionKind,
    target_ref: unknown,
  ): Promise<FixProposal>;
  
  applyFix(
    proposal: FixProposal,
    target_ref: unknown,
    recorder: TraceRecorder,
  ): Promise<{ ok: boolean; details: unknown }>;
}
```

**Registration**: `assuranceRegistry.register('cms', new CmsAssuranceAdapter())`

**Acceptance**:
- Adding a new module is one file + one registration call
- The runner is module-agnostic — no `if (module === 'cms')` branches in core

### WS3.3 — Public API surface

```
GET    /api/governance/assurance/assertions?module=...
POST   /api/governance/assurance/assertions
PATCH  /api/governance/assurance/assertions/{id}
DELETE /api/governance/assurance/assertions/{id}
POST   /api/governance/assurance/assertions/{id}/improve-desc
POST   /api/governance/assurance/assertions/{id}/run       body: { target_ref }
GET    /api/governance/assurance/runs/{id}
POST   /api/governance/assurance/runs/{id}/fix             body: { finding_index, action, apply }
POST   /api/governance/assurance/fixes/{id}/apply
```

These shadow the existing CMS endpoints. Phase 1 keeps both running; the
CMS endpoints become thin shims that delegate to the assurance API.

---

## WS4 — CMS test suite migration

### WS4.1 — Adapter implementation

**File**: `src/lib/server/services/governance/adapters/cmsAssuranceAdapter.ts`

The adapter wraps the existing CMS test runner logic:

- `loadTargetContext({ processType, docId })` → calls into existing snapshot + form-config + key-people logic
- `runAssertion(...)` → same LLM call, but via `TraceRecorder` so the prompt/tool calls/output are captured as a trace
- `supportedFixActions(finding)` → returns `['brief', 'patch-seed', 'patch-doc', 'reseed']`
- `proposeFix(...)` → same Sonnet call paths as today
- `applyFix(...)` → same file write / doc update / process spawn paths

### WS4.2 — Endpoint shims

The existing `/api/cms/records/audit/tests/...` endpoints rewrite to:

```ts
// inside +server.ts
import { assuranceRegistry } from '$lib/server/services/governance/index.js';
const adapter = assuranceRegistry.get('cms');
return adapter.runAssertion(...);
```

The migration is mostly subtractive — the test runner becomes a 30-line file that delegates to the adapter, while the gnarly context-gathering + LLM-prompting logic moves into the adapter.

### WS4.3 — UI compatibility

The `StructureTab.svelte` Tests view stays. Its fetch URLs are unchanged. The
substrate change is invisible to the user.

### WS4.4 — Data migration

Existing `cms_audit_tests` and `cms_audit_test_runs` documents continue to
work. A one-time backfill writes them as `assurance_assertions` and
`assurance_runs` records:

- `scripts/migrate-cms-tests-to-assurance.cjs`
- Run with `--dry-run` first; verify counts match; then commit

---

## WS5 — Replay endpoint

### WS5.1 — Reconstruction primitive

```ts
async function replayTrace(
  trace_id: string,
  mode: 'exact' | 'behavioural',
): Promise<ReplayResult>
```

For Phase 1, `replayTrace` recomposes the inputs + retrieved evidence +
wisdom and calls the model — Mode A pins temperature to 0; Mode B uses
original parameters. Side-effecting tools are substituted from snapshot
in both modes.

### WS5.2 — Public endpoint

```
POST /api/governance/replay/{trace_id}        body: { mode }
GET  /api/governance/traces/{trace_id}        // metadata view
```

**Auth**: developer-only initially (gated by `authManager`).

---

## WS6 — Verify + scheduled integrity

### WS6.1 — On-demand verify

```
POST /api/governance/audit/verify             body: { tenant, day?, range? }
```

### WS6.2 — Scheduled integrity check

**File**: `src/lib/server/queues/workers/ScheduledWorker.ts`

New scheduled task `governance-audit-integrity-check`:

- Runs every 6 hours
- For each tenant: verifyDay against the previous 24 hours
- Emits a `guardrail` audit event of severity `info` on success
- Emits a `guardrail` audit event of severity `fail` on integrity violation
- Existing alerting wires up to the fail event

---

## Cross-cutting

### Build artefacts

Per project rule 05 #5: every `.ts` under `src/lib/server/services/governance/`
needs a `.js` sibling. CI must enforce.

### Tests

- Unit tests for `auditChain`: append → verifyChain → verifyDay round trips
- Tampering tests: mutate payload, delete row, swap seal — verifyChain catches each
- `TraceRecorder` tests: trace start → finalize → audit event correlation
- Adapter tests: CMS adapter against a fixture change document

### Telemetry

Add metrics:
- `regno_audit_events_total{kind, tenant}` (counter)
- `regno_audit_verify_failures_total{tenant, day}` (counter)
- `regno_assurance_runs_total{module, verdict}` (counter)
- `regno_execution_traces_total{module, status}` (counter)

---

## Sequencing within Phase 1

```
Week 1-2     WS1.1, WS1.2          Substrate + append path
Week 2-3     WS2.1, WS2.2          ExecutionTrace
Week 3       WS1.3                 Verify
Week 3-4     WS3.1, WS3.2, WS3.3   Assurance API
Week 4-5     WS4                   CMS migration
Week 5       WS5, WS6              Replay + integrity check
Week 6       Hardening, tests, docs
```

Six weeks calendar. Two engineers full-time, or one engineer part-time over
twelve weeks if other work is in flight.

---

## Definition of done — Phase 1

A developer in the CMS team can:

1. Define a test against an SC change via the existing UI
2. Run it; see findings; apply a fix
3. Click "Replay this run" and watch the substrate reconstruct the exact
   reasoning that produced the original finding
4. Run `verifyDay` against the last 24h of audit and see all rows verify
5. Watch a `cortex-flow` agent run also produce audit rows in the same
   substrate — without any CMS code being involved

That last point is the proof that the substrate is real platform
infrastructure, not a CMS feature.
