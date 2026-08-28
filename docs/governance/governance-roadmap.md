# Regno.ai — Governance & Trust Roadmap

> **Purpose.** A working backlog mapping the five-layer enterprise governance model
> (Information & RBAC · Pre-Deployment Gating · Runtime Enforcement · Observability ·
> Compliance & Standards) onto concrete Regno.ai work items. Each task names the
> files and services it touches, the current state, and what "done" looks like.
>
> **Read order.** Layer 4 (Observability) is the foundation — stand it up first.
> Layer 2 (Gates) once you can see what's running. Layer 3 (Runtime) once gates
> stop unsafe configs reaching prod. Layer 1 (RBAC) and Layer 5 (Compliance)
> compound across all the others.

---

## Layer 1 — Information & RBAC Governance

The AI surface must inherit, never widen, the human caller's permissions.

### 1.1 RBAC propagation into the agent perimeter
- **State.** SvelteKit routes resolve `authManager` per request; downstream LLM calls receive request context but no formalised principal object.
- **Target.** Every LLM invocation, Qdrant lookup, Mongo read inside an agent step carries a typed `AgentPrincipal` (userId, tenantId, roles[], scopes[]). The agent fails closed if the principal lacks the right scope for the data it would otherwise return.
- **Touch.**
  - `src/lib/server/services/cortex-flow/` — thread the principal through Orchestrator → executors → tools
  - `src/lib/server/services/llmCredentialsStore.ts` — bind credential resolution to principal scopes
  - `src/lib/server/services/AgentMemoryService.ts` — filter retrievals by tenant
- **Work.**
  - [ ] Define `AgentPrincipal` shape in `src/lib/types/principal.ts`
  - [ ] Add `principal` field to every BullMQ job payload (worker-entry.ts)
  - [ ] Add scope check at every tool entry point
  - [ ] Add tests: agent X invoked by user without scope Y must refuse data Y

### 1.2 Data provenance + lineage on ingest
- **State.** Knowledge ingestion writes to Qdrant with collection metadata; per-chunk source tracking exists but not exposed for audit.
- **Target.** Every embedded chunk carries `{ source, ingestedAt, ingestedBy, sourcePolicy }`. Any output that uses a chunk attaches its provenance to the response payload so the egress layer can verify lineage.
- **Touch.**
  - `src/lib/server/services/KnowledgePipelineService.ts`
  - `src/lib/server/services/ContextualChunkingService.ts`
  - `src/lib/server/services/cms*Audit/` (analogous capture pattern)
- **Work.**
  - [ ] Add `sourcePolicy` enum to ingest config (public / internal / confidential / restricted)
  - [ ] Block ingest if a source is unclassified
  - [ ] Add lineage trace endpoint: given an LLM response id, list every chunk that fed it
  - [ ] Surface lineage in the Cortex admin UI

### 1.3 Per-tenant collection isolation
- **State.** Qdrant collections are namespaced by domain not tenant.
- **Target.** A tenant's vectors are physically isolated. Cross-tenant queries blocked at the collection name resolver.
- **Touch.** `src/lib/server/services/qdrant*`, `src/lib/server/services/KnowledgeIngestTool.ts`
- **Work.**
  - [ ] Add `tenantId` to every Qdrant collection name
  - [ ] Add allow-list check at query time
  - [ ] Migration tool for existing shared collections

---

## Layer 2 — Pre-Deployment Gating

Subjective approvals replaced with deterministic checks before a config touches prod.

### 2.1 Operational Model Cards
- **State.** Agent definitions are MongoDB docs (`cortex_agents`); no formal "card" with allowed tools, denied behaviours, max cost ceiling, max tokens per phase.
- **Target.** Every agent has a Model Card stored as a versioned document with explicit allow-list and deny-list, deployable through a single gate.
- **Touch.** `cortex_agents` collection, `src/lib/server/services/cortex-flow/AgentPhaseTemplate.ts`
- **Work.**
  - [ ] Define `ModelCard` schema: `{ id, version, allowedTools[], deniedBehaviours[], costCeilingUsd, maxTokens, allowedDataPolicies[], regulatoryClass }`
  - [ ] Card editor in admin UI under Cortex → Agents
  - [ ] Reject any phase template that exceeds its card's allowances
  - [ ] Diff viewer for card-version-N vs N-1

### 2.2 Pre-deployment red-team suite
- **State.** No automated red-team. Prompt-injection vulnerabilities only surface on user complaint.
- **Target.** Every agent passes a regression battery of prompt-injection, jailbreak, system-prompt-exfiltration, and tool-misuse attempts before a card version is marked deployable.
- **Touch.** New service `src/lib/server/services/cortex-flow/RedTeamRunner.ts`; expose via `/api/cortex-flow/redteam`
- **Work.**
  - [ ] Curate attack-prompt corpus (start with OWASP LLM Top 10 + custom domain probes)
  - [ ] Runner that executes each attack against the card-under-test, scores by Claude judge
  - [ ] Threshold: card cannot promote to `prod` ring until red-team score >= X
  - [ ] Quarterly corpus refresh task in `ScheduledWorker.ts`

### 2.3 Cost + quota gates
- **State.** Cost ceilings exist on Cortex Flow executions (e.g. Deep-Dive: $4.00), but per-tenant + per-day quotas not enforced.
- **Target.** Hard ceilings at tenant, agent, and call level. Soft warnings at 80%. Card promotion blocked if cost projection > tenant budget.
- **Touch.** `src/lib/server/services/cortex-flow/Orchestrator.ts`, BullMQ rate limiter
- **Work.**
  - [ ] Add `tenant_quotas` collection
  - [ ] Pre-execution check: estimated cost + month-to-date usage vs quota
  - [ ] Degrade-mode swap (Sonnet→Haiku, depth=deep→standard) instead of hard fail
  - [ ] Quota dashboard in admin UI

---

## Layer 3 — Runtime Enforcement

Live ingress + egress policing, with explicit degradation modes when checks fail.

### 3.1 Ingress guardrails
- **State.** No PII scrubber, no injection detector before prompts reach the LLM.
- **Target.** Every inbound message routed through a guardrail chain. Detected PII is masked + restorable post-response. Detected injection blocked or quarantined.
- **Touch.** New `src/lib/server/services/cortex-flow/Guardrails.ts`, wired into Orchestrator before the first phase
- **Work.**
  - [ ] PII redaction (Presidio integration or a small in-house regex+ML pipeline)
  - [ ] Prompt-injection classifier (Haiku-based judge, ~$0.0002/call)
  - [ ] Per-tenant policy: which categories to mask vs block vs allow
  - [ ] Audit row on every guardrail trigger

### 3.2 Egress guardrails
- **State.** No structural schema enforcement on LLM output; Cortex Flow's DocumentRenderTool accepts whatever HTML the model produces.
- **Target.** Before any response leaves the system: schema validation (Zod), grounding check against retrieval evidence, data-exfiltration scan, hallucination/contradiction check against the source set.
- **Touch.** `src/lib/server/services/cortex-flow/Orchestrator.ts` (post-phase hook), `DocumentRenderTool`
- **Work.**
  - [ ] Wrap every tool output in `assertContract<T>(value, schema)` — fail closed
  - [ ] Grounding check: every claim that cites a chunk must trace back to that chunk's content (hash compare)
  - [ ] Data-exfiltration scan: regex + entity-recognition against tenant's "do-not-output" set
  - [ ] Confidence + grounding scores attached to every response

### 3.3 Explicit degradation modes
- **State.** Failures throw → user sees an error toast. No graceful fallback.
- **Target.** Three modes per agent: `creative` (current), `restricted` (drops tools that can write, narrows model to Haiku), `safe-refuse` (canned response). Mode selection driven by upstream guardrail signals.
- **Touch.** `src/lib/server/services/cortex-flow/Orchestrator.ts`, `AgentPhaseTemplate.ts`
- **Work.**
  - [ ] Mode metadata on every Cortex agent
  - [ ] Auto-degrade when egress confidence < threshold
  - [ ] User-visible mode badge on outputs ("Standard" / "Restricted" / "Refused")

### 3.4 SSE / runtime kill switch
- **State.** Long-running BullMQ jobs can only be cancelled by removing from the queue.
- **Target.** Per-job SIGTERM via SSE control channel; per-tenant emergency stop in admin UI.
- **Touch.** `services/realtime/`, BullMQ worker entry, admin UI
- **Work.**
  - [ ] Add `cortex.kill` SSE event with job-id payload
  - [ ] Worker poll between phases for kill signal
  - [ ] Emergency-stop button + audit row

---

## Layer 4 — Complete Observability

Foundation layer. Stand this up first; everything else builds on it.

### 4.1 Immutable audit trail
- **State.** `cms_audit_*` collections exist for the CMS surface only. Cortex Flow executions logged inconsistently. No write-once guarantees.
- **Target.** Every prompt, system instruction, retrieved chunk, model invocation, tool call, guardrail trigger, principal context, and timing recorded into an append-only log.
- **Touch.** New collection `audit_events` with mongo `capped: false` + application-level immutability check
- **Work.**
  - [ ] Define `AuditEvent` schema (event_id, ts, principal, kind, payload_hash, payload_compressed, signature)
  - [ ] Append-only API; reject any patch/delete in code
  - [ ] HMAC sign each event with a daily rotated key — tampering becomes detectable
  - [ ] Stream to long-term store (S3 / GCS) for retention

### 4.2 System reconstructability
- **State.** Sufficient data exists to reconstruct a CMS doc's state at any history point via the snapshot architecture. Equivalent doesn't exist for an agent execution.
- **Target.** Given an `execution_id`, fully reproduce: model version, prompt manifest, retrieved chunks (with content hash), temperature, user permissions, exact Mongo + Qdrant snapshot timestamps.
- **Touch.** `src/lib/server/services/cortex-flow/Orchestrator.ts`, `AgentMemoryService.ts`
- **Work.**
  - [ ] Stamp every execution with a content-addressable hash of its inputs
  - [ ] Snapshot retrieval evidence (chunk IDs + content hashes) into the audit event
  - [ ] Replay endpoint: `POST /api/cortex-flow/replay/{executionId}` — same inputs, same model, same retrievals
  - [ ] Replay can succeed even if upstream data has since changed (uses snapshot)

### 4.3 Real-time observability dashboard
- **State.** Per-execution console + per-agent memory dashboard exist. No cross-tenant rollup.
- **Target.** Live view: requests/min, p50/p95 latency, cost burn, guardrail trigger rate, model breakdown, top failing agents.
- **Touch.** New `/api/cortex-flow/observability` endpoint backed by audit events
- **Work.**
  - [ ] Materialised rollup view (refresh every 60s)
  - [ ] Cards on existing Cortex Health tab
  - [ ] Alert rules: cost spike, guardrail trigger spike, p95 latency spike

### 4.4 Distributed tracing
- **State.** Logs per service, no propagation.
- **Target.** OpenTelemetry traces across SvelteKit → BullMQ → Execution → external APIs.
- **Touch.** All three servers
- **Work.**
  - [ ] Add `@opentelemetry/sdk-node`
  - [ ] Propagate `traceparent` through BullMQ job options
  - [ ] Export to Jaeger or OTLP collector

---

## Layer 5 — Compliance & Structural Standards

Map operational controls onto recognised frameworks so audit becomes mechanical.

### 5.1 ISO/IEC 42001 alignment
- **State.** No formal AIMS documentation.
- **Target.** Internal AIMS document referencing Regno's controls per ISO 42001 clauses 6 (planning), 7 (support), 8 (operation), 9 (performance evaluation).
- **Work.**
  - [ ] Map each layer above to its ISO 42001 clause
  - [ ] Identify gaps; raise as backlog items
  - [ ] Annual internal audit cadence

### 5.2 NIST AI RMF classification
- **State.** All agents treated equivalently.
- **Target.** Every agent + every Cortex Flow execution classified by risk tier (low / medium / high). Higher tier = stricter guardrails, lower cost ceilings, mandatory human-in-the-loop on outputs.
- **Touch.** Agent metadata, Orchestrator risk routing
- **Work.**
  - [ ] Risk-tier field on agents
  - [ ] Classification questionnaire when defining an agent
  - [ ] Tier-gated rules engine: tier-3 agents cannot bypass red-team, cannot deploy without human sign-off

### 5.3 SOC 2 + GDPR readiness
- **State.** Implicit, not documented.
- **Target.** Control matrix mapping Regno's mechanisms (encryption, RBAC, audit trail, principal scope, right-to-erasure) onto each control.
- **Work.**
  - [ ] Erasure pipeline: deleting a user erases their audit events, their inserted memories, their ingested chunks
  - [ ] Data residency: per-tenant region pinning in Mongo + Qdrant
  - [ ] Annual penetration test (external)

### 5.4 Customer-facing trust manifest
- **State.** No `trust.json` or equivalent.
- **Target.** Public-facing manifest at `regno.ai/.well-known/trust.json` listing certifications, data residencies, subprocessors, retention windows, breach SLAs.
- **Work.**
  - [ ] Manifest schema (machine-readable)
  - [ ] Auto-update from internal status board

---

## Cross-cutting

### CC.1 — Threat model the agentic primitives
- [ ] Threat model: prompt injection through retrieved knowledge
- [ ] Threat model: tool chaining to bypass scope checks
- [ ] Threat model: memory poisoning (a malicious confirmation seeding a bad wisdom)
- [ ] Threat model: cost exfiltration (jailbreak to burn budget)

### CC.2 — Test the framework
- [ ] Chaos drill: cut the Qdrant connection — does egress still work in safe-refuse mode?
- [ ] Chaos drill: corrupt an audit row — does signature verification flag it?
- [ ] Chaos drill: trigger every guardrail under load — measure p95 latency

---

## Sequencing recommendation

```
Quarter 1   Layer 4 (Observability)    — see what's happening
Quarter 1   Layer 5.2 (Risk tiers)     — classify before you regulate
Quarter 2   Layer 2 (Gating)           — codify "production-ready"
Quarter 2   Layer 1.1 (Principal)      — thread identity end-to-end
Quarter 3   Layer 3 (Runtime)          — police live traffic
Quarter 4   Layer 5.1, 5.3, 5.4        — certify, publish manifest
```

Track this file as the master backlog. Each completed checkbox should link to the
PR that closed it.
