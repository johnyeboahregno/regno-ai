# Cortex Flow — Design, Tools, and the "Tool-on-top-of-an-Engine" Pattern

> Audience: engineers working on Regno.ai. This is a codebase reference,
> not an external brief — the rule-09 HTML rubric does not apply.
> Updated: 2026-06-04.

Cortex Flow is Regno.ai's agentic execution engine. The north star: behave
like a single, highly capable agent session — one strong reasoning pass
with a full toolkit, deciding turn by turn what to reach for — but backed
by Regno's superpowers: the wisdom system, cortex patterns, the local
`/doc` corpus, and live access to MongoDB, Qdrant, and Neo4j.

This document covers the questions the team keeps asking about:

1. The full flow of a request through the system.
2. Every tool an execution can use, and what it's for.
3. How the engine **scales and stays robust** under a growing toolkit and
   long tool loops — discovery, in-sandbox tool calling, context
   compaction, structured output, and prompt presets.
4. How **Studio "Script"** is not a separate product — it's an *elevated,
   focused tool* built on top of Cortex Flow, optimised for one job
   (authoring documents).
5. Twenty-five more tools we could build the same way, across sectors.
6. How every execution runs **inside the governance substrate** —
   identity-bounded, audit-chained, replayable — so capability and
   assurance grow together rather than as bolt-ons.

Two threads run through all of it. **Robustness** (section 3f) is what
keeps a single strong pass viable as the toolkit and the conversation
grow. **Governance** (section 7) is what makes every one of those passes
attributable and reconstructable. Where a capability is built it says so;
where it is designed-but-not-yet-built it is marked *(designed)*.

---

## 1. The Core Idea — `(agent, topology)`

Every execution resolves to two choices:

- **Which agent?** An *agent* is a thin, declarative config (`scripts/agents/*.cjs`
  → `cortex_agents` Mongo collection): a name, trigger keywords, a tool
  manifest (`capabilities.tools`), and a `planTemplate` of phases. The
  agent carries *domain* behaviour in its phase prompts — nothing more.
- **Which topology?** How many phases actually run, decided by
  `analysisDepth` (`quick` | `standard` | `deep`). Each phase declares
  `depths?: AnalysisDepth[]`; at conversion time
  (`AgentExecutor.convertAgentPhases`) phases not matching the chosen
  depth are dropped. Omit `depths` → the phase always runs.

This is **compose-first**:

- Default to a **single strong reasoning pass** with the whole toolkit in
  hand.
- Gather facts only when the agent hits a gap — and from the *cheapest
  sufficient* source first (local knowledge before the web).
- Use the **refine loop** as the escalation signal: grade the output, and
  if a weakness traces to a missing fact, fetch it and rewrite.

There is no upfront 3-way "complexity classifier." The only upfront
signal is a **binary gap hint**: does the remit name external/current
material (`latest`, `market`, `pricing`, `2027`, …)? If yes, start at
research-first (`deep`); otherwise start at `quick` and let the loop pull
in what it needs. See `PlanEngine.selectComposeFirstDepth()`.

### Default-path-as-agent

There is no "non-agent" path any more. When no specialised agent matches
the request, `PlanEngine` routes to the **`general-assistant`** agent —
the default, carrying the full toolkit. So *every* execution is
`(agent, topology)`, uniformly.

---

## 2. Full Flow Through the System

```
  Browser / API caller
        │  POST (prompt | remit, settings{analysisDepth, llm, advanced})
        ▼
  SvelteKit route  (src/routes/api/…)         ── NO INFERENCE HERE (rule 05) ──
        │  enqueue job on BullMQ (getCortexFlowV2Queue().add('orchestrate', …))
        ▼
  BullMQ (Redis)  ── priority queue, jobId = executionId ──
        │
        ▼
  Execution server  (npm run execution → worker-entry → Orchestrator)
        │
        ├─ 1. PlanEngine.generate(prompt, settings, context)
        │       • forceAgent?  → that agent (bypasses confidence)
        │       • else route:  agentRouter.routePrompt → confidence ≥ 0.7? → that agent
        │       •                else → general-assistant (default-path-as-agent)
        │       • selectComposeFirstDepth(prompt, depth) picks topology
        │       • AgentExecutor.createPlanFromAgent → Plan{ phases[] }
        │
        ├─ 2. For each phase:
        │       • ToolRegistry.configureFromSettings()  → core tools on,
        │         enableAgentTools(agent.capabilities.tools) elevates advanced ones
        │       • ContextBuilder injects only the `needs` the phase declares
        │         (knowledgeFacts / priorDocuments / agentMemory / userMemories / …)
        │       • Executor runs the turn-loop: the agent calls tools
        │         (Read, Grep, KnowledgeBase, DataSourceQuery, PythonExec, …),
        │         observes results, continues until it emits its phase output
        │       • In-loop context compaction keeps a long tool loop inside the
        │         model's window (see 3f) — the append-only history is
        │         deterministically trimmed in the middle, never the task
        │         message or the most recent turns
        │
        ├─ 3. If final phase → Orchestrator.runRefineLoop:
        │       • QualityAuditor grades output against the rubric
        │       • below target & weakness is fact-shaped → critique tells the
        │         re-run to fetch via KnowledgeBase/WebSearch/WebFetch FIRST
        │       • regenerate with critique as refineFeedback; repeat until
        │         targetScore or maxPasses/costCeiling
        │
        ├─ 4. Persist artifacts (DocumentRender output, files, finalScore)
        │       and [WISDOM] insights → AgentMemoryService (compounds over time)
        │
        ▼
  Realtime server  (services/realtime/ SSE)
        │  streams v2_agent_routing, phase progress, tokens, final result
        ▼
  Browser follows /api/cortex-flow/{executionId}/events
```

Key invariants:

- **No inference in the SvelteKit process** (rule 05). Routes only enqueue.
- **Server-side everything** — the client renders; it never computes.
- **Wisdom flywheel** — every execution can read shared agent memories on
  the way in and write `[WISDOM]` insights on the way out, so quality
  compounds across runs.
- **Governed by construction** *(designed — see section 7)* — the same
  job carries an identity (a `Principal`) from the enqueue through every
  phase and every tool call; each step appends to an HMAC-chained audit
  log and snapshots a replayable trace. Nothing the engine does is meant
  to be off the record.

---

## 3. The Toolkit — Everything an Execution Can Use

Tools come in two tiers (`src/lib/server/cortex-flow/ToolRegistry.ts`):

- **Core tools** — always enabled by default (Pillar 1: trust the agent to
  decide *when* to use them).
- **Advanced tools** (`src/lib/types/advancedTools.ts`) — gated/off by
  default; auto-elevated for an agent when listed in its
  `capabilities.tools` (`enableAgentTools`). Some require credentials.

### 3a. Filesystem & shell primitives (core)

| Tool | What it does |
|---|---|
| `Read` | Read a file (line ranges; resolves WebFetch-archived URLs). |
| `Write` | Create/overwrite a file. |
| `Edit` | Exact-string replace within a file. |
| `Glob` | Find files by glob pattern. |
| `Grep` | Regex search across files (content/files/count modes, context lines). |
| `Bash` | Run a shell command. |
| `TodoWrite` | **(new)** In-turn multi-step planning — the agent lays out and keeps a live checklist; exactly one step `in_progress`. The in-turn planning primitive. |
| `Task` / `TaskOutput` / `ParallelTask` | Spawn sub-agent work; read its output; fan out parallel sub-tasks. |

### 3b. Web & ingestion (core)

| Tool | What it does |
|---|---|
| `WebSearch` | Search the web, returns snippets. |
| `WebFetch` | Fetch a URL → readable text, archived to disk. |
| `SitemapDiscovery` | Enumerate a site's real URLs from robots.txt/sitemap.xml before crawling. |
| `SiteCrawler` | Crawl a site (no arbitrary page cap — rule 06.4). |
| `KnowledgeIngest` | Ingest content into the knowledge base (relevance-filtered, contextual chunking). |
| `DocumentRouter` | Classify/route an incoming document to the right bucket. |

### 3c. Regno superpowers (core)

| Tool | What it does |
|---|---|
| `KnowledgeBase` | Query Regno's indexed knowledge — Qdrant vector + Neo4j graph across all 16 collections. The semantic memory of the platform. |
| `DocLibrary` | Read the local `/doc` corpus (engineering docs, references). |
| `CortexPattern` | Retrieve a proven approach/preset (declarative, avoids reinventing). |
| `Cortex` | Lower-level cortex pattern/config access. |
| `DataSourceQuery` | Read-only `find`/`aggregate` against a connected external MongoDB data source. |
| `AssetRetrieve` | Find images/diagrams/layouts in the asset store → embeddable URLs. |

### 3d. Documents & media (core)

| Tool | What it does |
|---|---|
| `DocumentRender` | Save a complete self-contained HTML doc as-is (Pillar 3: the engine is the template). |
| `PdfRead` | Extract text from a PDF. |
| `VideoFetch` | Fetch/transcode a video. |
| `AudioTranscribe` | Speech-to-text. |

### 3e. Advanced tools (gated; elevated per-agent)

`python-exec` (PythonExec — calc/data crunching), `sql-query`,
`dataframe-analyze`, `chart-generate`, `image-generate`, `image-analyze`,
`pdf-read`, `ocr`, `embeddings`, `pdf-parse`, `pdf-generate`,
`excel-process`, `arxiv-search`, `wikipedia-query`, `news-aggregate`,
`email-send`, `slack-post`, plus credentialed `regno-*` variants.

> An agent gets exactly the tools its job needs by listing them in
> `capabilities.tools`. The `general-assistant` default agent advertises
> an 18-tool kit spanning every group above so the fallback path is as
> capable as a fresh agent session with everything turned on.

### 3f. How the engine stays robust as it scales

The "single strong pass with the whole toolkit" north star only holds if
the pass survives a big toolkit and a long loop. Five mechanisms keep it
viable — the same patterns a mature agent harness relies on, expressed in
Regno's own surfaces.

**Context compaction (built).** A long tool loop grows the append-only
history past the model's window; without compaction the run dies on a
context-overflow instead of finishing. The executor deterministically
trims the *oldest middle* of the conversation — preserving the original
task message and the last `keepRecent` turns — and never splits a
`tool_use`/`tool_result` pair, a thinking block, or an image. This is the
turn-loop's survival mechanism, not a quality knob: the agent keeps the
context it is actively reasoning over and sheds the stale middle.

**Tool discovery** *(designed — AGENT-TOOL-DISCOVERY)*. Today the full
tool-definition set ships flat on every request (`getToolDefinitions`).
As the registry grows this burns cache-prefix tokens and dilutes
selection. The plan is a retrieval step keyed off the request + the
agent's kit that surfaces only the relevant subset — or defers a tool's
full schema until first use — mirroring the deferred-tool pattern. The
manifest (`capabilities.tools`) stays the outer bound; discovery narrows
*within* it per request.

**Programmatic tool calling** *(designed — AGENT-PTC)*. `PythonExec` runs
in a stateless sandbox today. PTC lets that sandbox call registry tools
in-process, so the agent can orchestrate a multi-tool computation in one
code block (fetch → filter → aggregate) instead of a chatty per-call
round-trip. It cuts tokens and latency on data-heavy agents (Deep-Dive,
Data-Analyst), and the bridge honours the *same* availability and budget
rules as a direct tool call — a tool the agent can't reach directly it
can't reach through Python either.

**Structured output** *(designed — AGENT-STRUCTURED-OUT)*. Some callers
need a machine-parseable result, not prose. Rather than hand-rolling JSON
parsing at each call site, the plan is one contract — schema-constrained
output (tool-as-schema) — so an agent can return a validated payload. This
is also the natural seam for the governance egress check (section 7): a
declared output schema is something `assertContract` can fail closed on.

**Prompt presets** *(designed — AGENT-PROMPT-PRESETS)*. Phase prompts
carry all domain behaviour today, hand-written per agent. The preset
library turns prefills, few-shot exemplars, and reusable instruction
blocks into cortex presets, so a phase prompt *composes* from a curated,
versioned library instead of being authored from scratch. It pairs with
the existing cortex pattern store — the same declarative substrate that
already stores proven approaches.

> The throughline: a request brings in only the tools it needs (discovery),
> a long loop stays inside the window (compaction), heavy multi-tool work
> collapses into one sandboxed block (PTC), results come back validated
> (structured output), and the prompts that drive it are composed, not
> copy-pasted (presets). Capability scales without the single-pass model
> falling over.

---

## 4. A Worked Example — One Request, Many Tools

**Request:** *"Why did our largest tenant's onboarding stall last month,
and draft a one-page remediation note for the account team."*

No specialised agent matches → routes to `general-assistant`. The remit
names "last month" → still `quick` (internal data, not external), single
compose-first pass. Inside that pass the agent:

1. `TodoWrite` — lays out: (a) find the tenant, (b) pull onboarding
   events, (c) find the stall, (d) draft the note.
2. `DataSourceQuery` — `aggregate` over the onboarding collection to find
   the largest tenant and its event timeline.
3. `KnowledgeBase` — semantic lookup: "onboarding stall causes" surfaces
   a prior incident write-up and the SLA spec from `/doc`.
4. `Grep` + `Read` — confirm the actual gate logic in the snapshot
   service so the note's claim about *why* it stalled is accurate.
5. `PythonExec` — compute the exact business-day delay against the SLA.
6. Drafts the note; `DocumentRender` saves a clean one-pager.
7. The refine loop grades it; "specificity" is weak because a date was
   vague → critique says *fetch the exact timestamp first* → re-run pulls
   it via `DataSourceQuery`, rewrites, clears target.
8. Emits a `[WISDOM]` line ("onboarding stalls cluster at the IA gate when
   reviewer list is empty") → stored for future runs.

One agent, one strong pass, six tools, a self-correcting loop — no fixed
pipeline was hardcoded for "onboarding analysis."

---

## 5. Studio "Script" — An Elevated, Focused Tool on the Engine

Studio's **Script** tab (the `/admin` document author) is the clearest
example of the pattern this whole system enables: **a focused product
surface that is really just one agent + a tuned topology on top of Cortex
Flow.**

It is the *same engine* as the worked example above — but narrowed and
tuned for exactly one job: **authoring high-quality HTML documents.**

What makes it "elevated/focused" rather than a new system:

- **One forced agent.** `POST /api/admin/studio/generate` enqueues a
  normal Cortex Flow job with `forceAgent: 'html-author'`
  (`scripts/agents/html-author.cjs`). No router guesswork — the surface
  *knows* its job.
- **A purpose-built topology.** `html-author`'s three phases are
  depth-tagged so the three depths are distinct authoring strategies:
  - `quick` → **Compose only** (a single pass writes the whole doc).
  - `standard` → Internal Knowledge + Compose.
  - `deep` → Web Research + Internal Knowledge + Compose.
  Compose-first means Studio defaults to `quick` and only escalates when
  the remit names external/current material.
- **A domain rubric baked into the loop.** The compose phase is the final
  phase, so `Orchestrator.runRefineLoop` grades it against the **rule-09**
  10-criterion quality rubric (`settings.advanced.refineLoop`
  `{targetScore, maxPasses}`) and iterates to the target band (93–95+).
  "Script" exposes the target as the only knob — 95 is definitive, pass
  count is irrelevant.
- **A tuned tool subset.** It advertises only what authoring needs:
  `WebSearch`, `WebFetch`, `KnowledgeBase`, `DocumentRender`,
  `AssetRetrieve`. Same registry, narrower manifest.
- **A dedicated UI + persistence.** A tracking record in `authored_docs`,
  an SSE stream for live progress, an optional audit tab, a `/doc`
  template library, a refine endpoint (`…/docs/[id]/refine`).

So "Script" = **Cortex Flow engine** + **one agent config** + **one
rubric** + **one tuned UI**. Nothing about the engine is special-cased for
it. That is exactly why we can stamp out more such tools cheaply.

**The recipe to build one:**

1. Write `scripts/agents/<slug>.cjs` — phases (depth-tagged for topology),
   prompts (all domain behaviour lives here), `capabilities.tools`
   manifest. Seed it (`node scripts/seed-system-agents.cjs`).
2. (Optional) Define a rubric / `refineLoop` config if output quality
   should iterate to a target.
3. Add a thin SvelteKit route that enqueues an `orchestrate` job with
   `forceAgent: '<slug>'` and the right `settings`. No inference in the
   route.
4. (Optional) A focused UI surface + a persistence collection + SSE.

---

## 6. Twenty-Five Tools We Could Build the Same Way

Each is "an agent + tuned topology + thin surface" — the Studio recipe.
Grouped by sector. (Status: all are proposals; none built yet.)

### Sales & Marketing
1. **Proposal/RFP Responder** — ingests an RFP (PdfRead), pulls win-themes
   from KnowledgeBase, drafts a scored response; rubric = compliance +
   persuasion.
2. **Battlecard Builder** — WebSearch/news-aggregate on a competitor +
   internal KnowledgeBase → one-page battlecard, refreshed on a schedule.
3. **Outbound Sequence Writer** — persona-targeted email sequence
   (audience-first like rule-09), A/B variants, email-send to a sandbox.
4. **Landing-Page Copy Generator** — DocumentRender HTML, brand assets via
   AssetRetrieve, scored on conversion-copy rubric.

### Finance & Operations
5. **Board-Pack Compiler** — DataSourceQuery over finance Mongo +
   PythonExec for variance analysis → DocumentRender deck-style HTML.
6. **Invoice/Expense Auditor** — OCR + excel-process on receipts,
   policy-check against KnowledgeBase, flags anomalies (never deletes —
   rule 06.2).
7. **Cash-Flow Forecaster** — sql-query/DataSourceQuery historicals +
   PythonExec forecast → chart-generate + narrative.
8. **Procurement Spend Analyser** — aggregate spend by vendor, KnowledgeBase
   contract terms, surfaces consolidation savings.

### Legal & Compliance
9. **Contract Clause Reviewer** — PdfParse the contract, KnowledgeBase the
   playbook, flags off-standard clauses with rationale.
10. **Regulatory Change Monitor** — scheduled WebFetch of regulator sites,
    diffs against last snapshot, emails a digest of what changed.
11. **Policy Drafting Assistant** — composes a policy doc, rubric = clarity
    + coverage + enforceability; cites the source regs (cross-links).
12. **DPA / Privacy Mapper** — maps a data flow against GDPR articles from
    KnowledgeBase, gap report.

### HR & People
13. **JD → Interview Kit** — from a job description, generate scorecards,
    structured questions, and a rubric per competency.
14. **Onboarding Plan Generator** — role + team context → a 30/60/90 plan,
    pulling team docs from DocLibrary.
15. **Policy Q&A Agent** — answers employee policy questions strictly from
    the HR KnowledgeBase, refuses when unsupported (discipline rubric).

### Engineering & Data (internal dogfood)
16. **Incident Post-Mortem Author** — pulls timeline from logs
    (DataSourceQuery) + Grep the offending code → blameless RCA doc.
17. **Codebase Explainer** — Grep/Glob/Read a module → an architecture
    brief for new joiners (this is `code-explorer` territory).
18. **Migration Planner** — reads schema + usages, drafts a phased,
    reversible migration plan with rollback steps.
19. **Test-Gap Reporter** — Grep for untested exports, ranks by blast
    radius, proposes a test backlog.
20. **Data-Dictionary Generator** — introspects a connected DB, documents
    every collection/field with sample values.

### Customer & Support
21. **KB Article Writer** — turns resolved tickets into polished help-center
    articles; rubric = findability + completeness.
22. **Churn-Risk Briefer** — DataSourceQuery usage signals + PythonExec
    scoring → per-account risk note for the CSM.
23. **Voice-of-Customer Synthesiser** — AudioTranscribe support calls →
    themed insight report with quote evidence.

### Research & Strategy
24. **Market-Landscape Report** — deep topology: WebSearch + arxiv-search +
    KnowledgeBase → a sourced, scored landscape doc (close to
    `market-research-agent`/`deep-research-agent`).
25. **Competitive Pricing Tracker** — scheduled crawl of competitor pricing
    pages (SiteCrawler), diff + chart-generate trend, alert on change.

> Each reuses the engine wholesale. The build cost is a `.cjs` agent
> config, an optional rubric, and a thin enqueue route — the same shape as
> Studio "Script."

---

## 7. Governance & Assurance — the substrate the engine runs inside

Cortex Flow does not sit on top of a governance layer; it runs *inside*
one. Regno's governance substrate is a platform-wide, module-agnostic
infrastructure for identity-bounded execution, append-only HMAC-chained
audit logging, and fully-replayable execution traces. The CMS test suite
is its first consumer (Phase 1, built); Cortex Flow is the next adopter
(Phase 2, designed). The point of folding it into *this* doc is that the
governance hooks land on exactly the seams described above — they are not
a separate pipeline.

**What is built (Phase 1).** Every governed event appends to an
HMAC-chained store (`audit_events`), sealed daily with a signed Merkle
root, and any past execution is reconstructable from a frozen
`execution_traces` snapshot. There is a generalised Assurance API
(test-suites → runs → findings → fixes) and a Replay endpoint. Adding a
module as a consumer is one adapter file.

**How it threads through Cortex Flow** *(designed — Phase 2/3)*. The
hooks map onto the flow in section 2, one per seam:

- **Identity travels with intent** *(WS7)*. A `Principal` is attached to
  the BullMQ job and threaded Orchestrator → phase → tool call → audit
  event. Anything above the credential boundary takes the `Principal` as
  its first argument. An agent invoked without the scope a piece of data
  requires *refuses* it, and the refusal itself lands in the audit chain.
- **Scope at the tool boundary** *(WS8)*. Each tool declares its upstream
  and required scope; a token-exchange step mints a short-lived,
  scope-intersected assertion (the agent is the actor, the user the
  subject). This is the enforcement layer under the per-agent tool
  manifest — the manifest says *what an agent may reach*, the exchange
  proves *this caller may reach it now*.
- **Model cards bound the agent** *(WS10)*. A versioned card on each
  agent (`allowedTools`, `deniedBehaviours`, `costCeiling`, `maxTokens`,
  `regulatoryClass`) is the declarative ceiling a phase cannot exceed at
  runtime, and a new card version cannot promote without diff approval.
  This is the governable form of the `(agent, topology)` config.
- **Cost & quota gates** *(WS12)*. A pre-execution check compares
  projected + month-to-date cost against the tenant quota and prefers a
  *degrade-mode swap* — a cheaper model tier, or `deep`→`standard`
  topology — over a hard fail. It reuses the depth machinery from
  section 1.
- **Egress is contract-checked** *(WS14)*. Tool and phase outputs are
  wrapped in a fail-closed `assertContract` — which is exactly why the
  structured-output work in 3f matters: a declared output schema is the
  thing egress can verify, alongside grounding (every claim traces to a
  retrieved chunk's content hash).
- **Kill switch** *(WS16)*. Workers poll for a `cortex.kill` signal at
  phase boundaries; every kill is an audit row.

The wisdom flywheel and the red-team battery close the loop:
adversarial findings *(WS11)* flow into the shared wisdom store as
anti-patterns, so the same memory that compounds quality also compounds
safety. Evaluators are rotated across vendors *(WS20)* so no single model
both generates and unilaterally clears a promotion.

> The shape to remember: **capability and assurance grow on the same
> seams.** Every robustness mechanism in 3f has a governance counterpart
> here — discovery narrows the tool surface that scope-exchange then
> guards; structured output is what egress verifies; the agent config is
> what the model card bounds. Building one does not bolt the other on
> later; they are the same construction.

---

## 8. Where the Code Lives

| Concern | File |
|---|---|
| Routing / topology selection | `src/lib/server/cortex-flow/v2/PlanEngine.ts` |
| Agent → plan conversion, depth filtering | `src/lib/server/cortex-flow/services/AgentExecutor.ts` |
| Confidence routing | `src/lib/server/cortex-flow/services/AgentRouter.ts` |
| Agent registry (Mongo) | `src/lib/server/cortex-flow/services/AgentRegistryService.ts` |
| Orchestration + refine loop | `src/lib/server/cortex-flow/v2/Orchestrator.ts` |
| Tool registry (core + advanced) | `src/lib/server/cortex-flow/ToolRegistry.ts` |
| Advanced tool catalog | `src/lib/types/advancedTools.ts` |
| Agent configs | `scripts/agents/*.cjs` (seed: `scripts/seed-system-agents.cjs`) |
| Studio surface | `src/routes/api/admin/studio/**`, `scripts/agents/html-author.cjs` |
| Quality rubric (docs) | `rule-09` — `09-html-doc-quality.md` in the project rules dir |
| Governance public surface | `src/lib/server/services/governance/index.ts` |
| Audit chain / execution trace | `src/lib/server/services/governance/auditChain.ts`, `executionTrace.ts` |
| Assurance runner + adapters | `src/lib/server/services/governance/assurance.ts`, `adapters/` |
| Governance design + roadmap | `doc/governance/governance-platform.md` |
```
