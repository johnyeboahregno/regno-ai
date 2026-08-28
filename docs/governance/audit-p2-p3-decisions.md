# REGNO-AUDIT P2/P3 — Engineering Decisions Log

> Decisions taken by the Regno.ai team while building REGNO-AUDIT P2/P3, each with its rationale and any
> open question, so the choices are reviewable rather than buried in commits. Status legend:
> ✅ done + tested · 🟡 built, needs a running server to fully exercise · ⏸ deferred (with reason).

## Scope
Complete REGNO-AUDIT **P2** and **P3** (registry §1). Each increment is tested and committed, the tree is
never left broken, and external-infrastructure pieces are built to a clean integration point and marked
honestly (rules 09/10) rather than faked.

## Infrastructure available (determines wire vs. structure)
- **Redis** — up (`redis://localhost:6379`). The BullMQ sealing daemon is fully buildable. ✅
- **Mongo hash-chain** — live (`audit_events`; `governance/auditChain.ts`; `AUDIT_MASTER_KEY` set). ✅
- **Audit store** — hardened in `regno_audit` (insert-only writer / find-only reader). ✅
- **Neo4j** — `neo4j-driver` + `cortex/Neo4jService` present; server may be down → build the writer, gate on availability. 🟡
- **Qdrant** — `@qdrant` + `cortex/QdrantService` present; same gating. 🟡

---

## Decisions

### D1 — Material-event set (what is sealed into the chain)
`gate.action, sign.apply, record.create, record.delete, file.delete, export, access.denied`.
**Rationale:** these are the compliance-bearing actions the domain pack maps to a control. Journey noise
(`nav.page`, `filter.apply`, `auth.login`) is journaled but not chained — sealing everything would bloat
the tamper-evident layer with low-value rows. **Open:** confirm the set (edit `MATERIAL_ACTIONS` in
`src/lib/server/audit/seal.ts`).

### D2 — The chain stays in the app DB (`regno`), not the hardened `regno_audit`
The chain's tamper-evidence derives from the HMAC master key, not RBAC — a deleted or edited `audit_events`
row is *detected* by `verifyChain` regardless of who can write it. Keeping the chain in `regno` matches the
existing governance chain (one chain, one verifier). **Open:** acceptable, or move the chain behind the
insert-only account as well (availability, not just integrity)?

### D3 — Seal serialization: in-process mutex first, BullMQ daemon second
`appendEvent` is sequential (each seal binds the prior `tail_seal`), so it must be serialized. P2 increment 1
uses a single-process promise mutex; increment 4 swaps in a BullMQ single-consumer queue for cross-process
durability and crash-safety. The public surface (`sealMaterial`) is unchanged by the swap. **Open:** keep as
a two-step, or go straight to the daemon.

### D4 — Crypto-shred erases the chain payload, not the journal
GDPR erasure redacts a subject's PII in `audit_events` (payload → empty, `erased: true`) while keeping
`payload_hash`/`seal`/`prev_seal`, so verifyChain still holds (it skips the payload re-hash for erased rows).
The time-series JOURNAL in the insert-only `regno_audit` DB is intentionally not app-mutable — erasing
journal rows is an out-of-band admin/retention operation, not an app capability. The erasure act is itself
audited (`record.delete`, kind `crypto-shred`) and the chain is re-verified afterwards. **Open:** confirm
journal-side erasure should stay an admin op rather than an app endpoint.

### D5 — Durable seal daemon is opt-in (AUDIT_SEAL_QUEUE=1)
The in-process mutex seals correctly within one process — right for the current single-instance deploy.
For clustered/multi-instance, AUDIT_SEAL_QUEUE=1 routes the emit flush through a BullMQ `audit-seal` queue
drained by ONE concurrency-1 worker (started in worker-entry under the same flag), preserving the chain's
global ordering across processes + crash-durability. Default OFF so the proven path is unchanged and bullmq
isn't pulled into the default emit graph (lazy-imported). **Open:** decide if/when to flip it on in prod.

### D6 — External anchoring COMPLETE (RFC-3161 codec built + verified against a real TSA)
Done: `rfc3161.ts` DER-encodes a proper `TimeStampReq` (SHA-256 message imprint + nonce + certReq) and parses
the `TimeStampResp` (PKIStatus + lifts the timeStampToken); `anchor.ts` sends it, checks status, and persists
the granted token next to the archived root, gated on AUDIT_TSA_URL and wired into the daily-root job
(best-effort). **Verified live against FreeTSA**: HTTP 200, PKIStatus 0 (granted), a 4,634-byte token parsed
cleanly. Turn on by setting `AUDIT_TSA_URL` (e.g. `https://freetsa.org/tsr`). **Open:** which TSA to
standardise on for prod (FreeTSA is free/public; DigiCert/internal for an SLA).

### D7 — Neo4j lineage graph COMPLETE (built on a new generic Neo4j primitive)
Done: added a generic `neo4jService.run(cypher, params)` primitive (reuses the live driver — no private
internals, no second connection) and a thin, decoupled `graphLink.ts` that mirrors material events as
`(:AuditUser)-[:PERFORMED]->(:AuditEntity)`. `entityLineage(key)` returns who acted on an entity + the
2-hop neighbours (other entities those actors touched) — the cross-entity relationship view the journal
can't do (basis for AIBOM / impact-propagation / cross-entity SoD). Opt-in (AUDIT_GRAPH=1) + gated on Neo4j
availability; lazy-imported into the flush; `/api/admin/audit/lineage` endpoint. **Verified live against the
running Neo4j**: edges written, 2-hop lineage returned, probe cleaned up. **Open:** turn AUDIT_GRAPH on in
which environments, and whether to add a graph visualisation to the console (endpoint is ready).

### D8 — Semantic search built; conversational agent wraps it via Cortex-Flow
"Ask the audit log in plain English" is delivered as the RETRIEVAL layer (semanticIndex.ts): events are
summarised → embedded → upserted to a Qdrant `audit_semantic` collection (indexing opt-in via
AUDIT_SEMANTIC_INDEX=1, ~1 embedding/event); `semanticSearch(query)` embeds a question and returns the most
relevant events. Exposed at GET /api/admin/audit/ask (degrades gracefully if Qdrant/embeddings are down).
The conversational layer ("summarise Jon's week", auto session narratives) is a thin Cortex-Flow tool that
calls semanticSearch + the structured queries — recorded as the integration point, not duplicated here.
**Open:** turn on AUDIT_SEMANTIC_INDEX in which environments (embedding cost), and whether to add the
Cortex-Flow Q&A tool now.
