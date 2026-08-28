# Zero Trust for Regno.ai Agents — gap analysis & enhancement plan

> **Source corpus:** [`doc/anthropic/`](../anthropic/MANIFEST.md) — Anthropic's
> *Zero Trust for AI Agents* ebook + current agent-engineering essays (pulled 2026-07-10).
> **Tracking:** registry tickets `ZT-*` under *Governance Substrate* in
> [`doc/platform-todo-registry.md`](../platform-todo-registry.md).
> **Status:** analysis complete; ZT items opened. Built-vs-planned is marked per row.

## Why this doc

Anthropic's framework verifies **every agent action**, grants **least agency**, and
**contains blast radius when compromise occurs** — architected for breach from day one.
Regno.ai already has a strong governance spine (audit substrate, route-auth, autonomy
bands, AI-BOM). This doc maps the framework onto what we have, finds the real gaps, and
opens targeted work. It deliberately **extends existing tickets** rather than duplicating.

## The one architectural tension worth stating plainly

Pillar 1 (**Trust the LLM** — `ToolRegistry.configureFromSettings()` enables *all* tools,
no mechanical `restrictedTools`) reads, at first glance, as the opposite of the ebook's
**Least Agency / deny-by-default / tool allow-listing**. It is not — they operate at
different layers, and conflating them is the mistake to avoid:

- **Trust-the-LLM governs *capability selection within a bounded set*** — given the tools
  an agent legitimately holds, the model (not a hardcoded `if`) decides when to use them.
  This is correct and stays.
- **Zero Trust governs *the boundary itself*** — which tools/credentials/data an agent
  instance is *provisioned* with, under what identity, with what blast radius. This is
  orthogonal to, and *upstream of*, the model's choice.

So the synthesis (ticket **ZT-AGENCY**): keep no in-loop `restrictedTools`, but make the
**provisioned tool set per agent** deny-by-default and scoped to the agent's function.
Claude Code itself embodies exactly this — the model chooses freely, but only from a set
the operator granted, behind `ask`/`deny` permission policies. That is the model to copy.

## Capability-domain map (ebook → regno.ai)

| Domain (ebook) | Regno.ai today (real paths / tickets) | Gap → ticket |
|---|---|---|
| **Agent identity & auth** | Route-auth `SEC1/.a–.f` (`requirePermission`/`ensureAdmin`, `scripts/audit-route-auth.cjs`); principal threading `WS7`. No per-*agent-instance* cryptographic identity. | Per-agent identity propagated into the audit chain → **ZT-IDCRED** |
| **Access control / least agency** | Autonomy bands `AUTBAND1` (advisory→autonomous); Pillar 1 tool model. Provisioned tool set is *global-on*, not per-agent-scoped. | Deny-by-default per-agent tool boundary → **ZT-AGENCY** |
| **Credentials** | Anthropic key **encrypted at rest** in `credentials` (`llmCredentialsStore.ts`) — but long-lived & shared across agents. | Short-lived / per-agent creds, secret-manager retrieval → **ZT-IDCRED** |
| **Resource boundaries / sandbox** | Execution server runs agents via BullMQ; tools incl. Bash/WebFetch/code-exec. Sandboxing + egress control unclear. Spend caps `COSTUX1`. | Sandbox + network-egress approval + circuit breakers → **ZT-SANDBOX** |
| **Input validation (prompt injection)** | Knowledge ingestion 3-layer relevance filter + audit/quarantine. No explicit *injection* gate / input-isolation for untrusted external content (WebFetch/WebSearch/RAG/RepoGrounding). | Input isolation + spotlighting untrusted tokens → **ZT-INJECT** |
| **Observability / traceability** | **Strong**: `REGNO-AUDIT` tamper-evident chain, evidence packs, crypto-shred, RFC-3161 anchoring, anomaly heuristics, "ask the audit log". Drift `EVAL1`. | Full input→context→tool→output provenance; dwell-time & coverage metrics → **ZT-TRACE** |
| **Behavioural monitoring** | `EVAL1` continuous eval + drift paging; audit anomaly heuristics. | Per-agent behavioural baselines (fold into ZT-TRACE / EVAL1) |
| **Integrity & recovery (config)** | Agent defs in `cortex_agents`; model cards `WS10`. Configs not signed / drift-guarded. | Signed + version-controlled agent configs + drift guard → **ZT-CONFIG** |
| **Supply chain** | AI-BOM **per output** `AIBOM1`. No infra-side MCP/tool/model supply-chain assurance. | Verify+pin MCP servers, tool provenance, dep health; extend AI-BOM to infra → **ZT-SUPPLY** |
| **Memory / context poisoning** | Qdrant RAG + knowledge audit (score/quarantine/purge). Persisted Cortex-Flow context integrity unaddressed. | Source-attribution + integrity validation + TTL on high-risk context → **ZT-MEM** |
| **Governance / maturity** | `/admin/governance` dashboard; risk tier `WS17`. | Foundation/Enterprise/Advanced ladder + "impossible vs tedious" gate → **ZT-TIER** |

## Cross-cutting agent-quality wins (from the essays, not just the ebook)

These aren't security, but the corpus surfaced them and they sharpen Cortex Flow directly:

- **Context engineering** — treat context as a finite attention budget; adopt compaction +
  structured note-taking + sub-agent distillation for long-horizon Cortex-Flow runs.
  (Ties existing MEMORY: *Deep-Dive Explorer* single-phase, sub-agent summaries.)
- **Tool design** — audit Cortex-Flow tools for the "few high-impact, namespaced,
  token-efficient, high-signal-return" bar; resolve UUIDs→names in tool outputs. Feeds
  `EVAL1`. (Candidate future ticket, not opened yet — noted here.)
- **Just-in-time retrieval** — our `RepoGrounding` + `insights/` already embodies this
  (agents read live source on demand vs a stale digest). Keep that discipline.

## Built vs planned

- **Built today:** `REGNO-AUDIT` substrate, `SEC1` route-auth, `AIBOM1` (per-output),
  `AUTBAND1` bands, `EVAL1` drift, `COSTUX1` caps, `WS7` principal, `WS10` model cards,
  knowledge audit/quarantine, `RepoGrounding`. These are the load-bearing Zero-Trust
  foundations we build *on*.
- **Planned (this analysis):** `ZT-AGENCY, ZT-INJECT, ZT-IDCRED, ZT-SANDBOX, ZT-MEM,
  ZT-SUPPLY, ZT-TRACE, ZT-CONFIG, ZT-TIER`. None implemented yet — do not describe as done.

## Sequencing (recommended)

1. **P1 first** — `ZT-AGENCY` (settles the architecture), `ZT-INJECT` (real live risk via
   WebFetch/RAG), `ZT-IDCRED` (blast-radius foundation everything else attributes to).
2. **P2** — `ZT-SANDBOX`, `ZT-TRACE`, `ZT-CONFIG`, `ZT-MEM`, `ZT-SUPPLY`.
3. **P3** — `ZT-TIER` (the maturity ladder that scores agents against 1–2 in the dashboard).
