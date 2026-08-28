# Anti-Hallucination Architecture — Design & Build Plan

> Engineering reference + plan (rule 09 §2c). Every path/symbol below is real;
> if one drifts, this doc is wrong — fix it. Registry: **TRUST-HALLUCINATION**.
> Companion (external positioning): `doc/strategy/regno-trust-moat.html`.
> Prime principle: `.claude/rules/10-ai-the-right-way.md`.

## Contents
- [1. Why this doc exists](#1-why-this-doc-exists)
- [2. Threat model — where LLMs confabulate](#2-threat-model--where-llms-confabulate)
- [3. The principle: ground, then generate; refuse to invent](#3-the-principle-ground-then-generate-refuse-to-invent)
- [4. Existing controls (built)](#4-existing-controls-built)
- [5. The per-pillar build plan (gaps → work)](#5-the-per-pillar-build-plan-gaps--work)
- [6. Verification — how we prove it](#6-verification--how-we-prove-it)
- [7. Built vs planned](#7-built-vs-planned)

## 1. Why this doc exists

Hallucination — a model stating something false with the same fluency it
states something true — is the single biggest blocker to enterprise trust in
AI. For a platform whose thesis is *replacing the cost of work*
([[project_wage_bill_thesis]]), a confident wrong answer is not a cosmetic
defect; it is the difference between a system a regulated buyer can rely on and
a demo they can't.

This doc is the **engineering plan**: the threat model, the controls that
already exist in this codebase (with the files that prove them), the gaps, and
the per-pillar work to close them. It is deliberately concrete — the external
"why this is a moat" framing lives in the companion
`doc/strategy/regno-trust-moat.html`; this is the *how*.

The cautionary tale that started it is recorded verbatim in rule 10: the
`html-author` agent, asked for "USP for process runner", produced a polished
document about a **commercial product of the same name found on the web**,
because nothing in its tool kit could see that *Process Runner* is an internal
CMS feature. That was not a model failure — it was a **grounding** failure. The
whole architecture below follows from refusing to let that recur.

## 2. Threat model — where LLMs confabulate

Confabulation is not random; it concentrates at predictable seams. Naming the
seams is what lets us put a control on each.

| # | Seam | What goes wrong | Control surface |
|---|---|---|---|
| H1 | **Unknown subject** | The remit names a thing the model can't see; it substitutes a plausible namesake (the process-runner failure). | Grounding tools must reach the real subject. |
| H2 | **Missing data** | Asked for a figure it doesn't have, the model invents a number that "looks right". | Live data query; refuse-to-answer over guess. |
| H3 | **Silent fallback** | Code papers over a missing value with a default, so the model reasons on fiction it believes is fact. | No-fallbacks; throw clear errors. |
| H4 | **Stale grounding** | The grounding corpus drifts from the code; the model grounds confidently in something no longer true. | Drift detection on the corpus. |
| H5 | **Raw-context overload** | A whole document is dumped into the prompt; the model conflates and mis-attributes across it. | Deterministic condensation before the LLM. |
| H6 | **Unverifiable claim** | Output asserts something with no traceable source; a reader can't tell true from invented. | Provenance / citation to a real path. |
| H7 | **Compounding error** | An early wrong fact propagates through a multi-step chain unchecked. | Iterate-and-self-critique inside the loop. |

The rest of this doc maps each control surface to code (built) or to a plan
item (gap).

## 3. The principle: ground, then generate; refuse to invent

`.claude/rules/10-ai-the-right-way.md` is the prime design principle and the
operational expression of **Pillar 1 — Trust the LLM**. Trust does *not* mean
"let it guess"; it means **"give it what it needs to be right, then let it
work."** Five tenets, each an anti-hallucination control:

1. **One agentic loop** — investigate → act → observe → refine. Iteration is
   where early errors get caught (H7), not a rigid pre-phase bolted on to force
   good behaviour.
2. **Ground before you generate** — establish *what the subject actually is*
   first. Order of trust: **provided context → internal sources
   (RepoGrounding, insights/, code, graph) → the open web last**, only to fill
   a confirmed gap. (H1)
3. **The right tool must see the real subject** — an agent is only as grounded
   as its kit. A tool that pulls *wrong* material (web search on an
   internally-named subject) is worse than no tool. (H1)
4. **Refuse to invent** — when the subject can't be grounded, the correct
   output is *"I could not confirm X"*, stated plainly. Never substitute a
   namesake, never paper the gap with confident generic prose. Surfacing a gap
   is a **success**. (H1, H2, H6)
5. **Iterate to improve** — quality comes from self-critique against a bar
   (rule 09 for docs), inside the one loop. (H7)

This is the AI-agent corollary of two older rules: **rule 05 §1 "No Fallbacks"**
and **rule 04 §3 "throw clear, contextual errors rather than fail silently"**.
Where they say "don't let *code* paper over a gap", rule 10 says "don't let the
*model* paper over a gap." Same discipline, two layers.

## 4. Existing controls (built)

These are in the repo today. Each cites the file that proves it (rule 09 §2c).

### 4.1 `RepoGroundingTool` — the agent can see the real subject (H1)
`src/lib/server/cortex-flow/tools/RepoGroundingTool.ts`. Read-only grounding
over the **live** repository — the antidote to the process-runner namesake.
Actions:
- `insights` — list/read the curated corpus (surfaced **first**: it holds the
  non-derivable "what is X / why").
- `search` — regex across repo source + docs (returns `file:line` + snippet).
- `find` — glob for files by path.
- `read` — read one file (line-numbered, range-selectable).
- `history` — recent `git log` (skipped gracefully if no `.git`).

Design constraints that matter for trust: **read-only** (no writes, no
blackboard side-effects — safe to call freely during grounding); **secret-safe**
(`SECRET_DENY` denylist blocks `.env`, credentials, keys, so grounding can never
exfiltrate); **degrades gracefully** (missing `insights/` or `.git` returns a
note, not an error). Root is `process.cwd()`, overridable via `CORTEX_REPO_ROOT`
so it survives the unzipped deployment tree.

### 4.2 The `insights/` corpus — curated, drift-checked grounding (H1, H4)
`insights/` is the **L2 grounding corpus** (`GLOSSARY.md`, `ARCHITECTURE.md`,
`DECISIONS.md`, `README.md`), read via `RepoGrounding{action:"insights"}`. It
holds the knowledge that *cannot be reconstructed by grepping source*: what
internal names mean and **why** the system is built as it is. Every factual
claim is deliberately tied to a real repo path, so drift is **detectable**.

That detection is automated (H4):
- `scripts/check-insights-sync.cjs` scans `insights/*.md` for path references
  (`PATH_RE` over `src|services|scripts|doc|…`) and verifies each still exists.
  Exit 0 = all resolve; 1 = at least one is stale (CI-friendly).
- The worker-side equivalent is
  `src/lib/server/cortex-flow/services/insightsSyncCheck.ts`, run as the
  scheduled `insights-sync-check` task (booted in `src/worker-entry.ts`,
  registered in `src/lib/server/queues/index.ts`, ~04:15 UTC daily). Green =
  every referenced path exists, so the grounding layer can't silently rot.

### 4.3 No-fallbacks + clear errors — code can't feed the model fiction (H3)
`.claude/rules/05-architecture-principles.md §1` ("No Fallbacks — Fix the Root
Cause") and `.claude/rules/04-code-craftsmanship.md §3` ("throw clear,
contextual errors rather than fail silently"). A missing value surfaces as an
error, not a silent default the model would then reason on as fact. The
pre-commit `audit-silent-imports` hook (visible on every commit in this repo)
enforces the same discipline at the import boundary.

### 4.4 `DataSourceQueryBridge` — real data, not guessed numbers (H2)
`src/lib/server/cortex-flow/services/DataSourceQueryBridge.ts` +
`src/lib/server/cortex-flow/services/RegnoStandardQueryExecutor.ts`. A
natural-language question becomes an LLM-
generated MongoDB query **plan**, executed against the live store; the facts are
merged into synthesis with the instruction to *prioritise the live query
results*. The model reports measured values rather than confabulating
plausible ones. (See memory `data-query-bridge`.)

### 4.5 Deterministic condensation — shrink the confabulation surface (H5)
`.claude/rules/05-architecture-principles.md §6`: **never pass raw documents to
LLMs. Condense deterministically first, then the LLM compiles. Store the
artifact.** Less raw context = fewer mis-attributions across it, and the stored
artifact is auditable.

### 4.6 Governance substrate — provenance + audit (H6)
`doc/governance/governance-platform.md`. The audit trail and scoped access
(e.g. Scoped Token Exchange at the tool boundary, registry **WS8**) give every
agent action a traceable origin — the substrate a "show me why you said that"
provenance feature plugs into (§5.4).

## 5. The per-pillar build plan (gaps → work)

The controls above cover H1, H3, H4, plus first-cut H2/H5. The gaps are H6
(machine-checkable provenance), H7 (an explicit self-critique pass), and
**making refuse-to-invent measurable** rather than prompt-only. Work is grouped
by pillar so it slots into the existing model.

### 5.1 Pillar 1 (Trust the LLM) — make "refuse to invent" measurable
- **Gap**: refuse-to-invent is currently *instructed* (rule 10 tenet 4) but not
  *measured*. We can't yet say "this agent surfaces gaps X% of the time it
  should."
- **Plan**: add an **ungroundable-probe** to the quality harness — a small set
  of remits naming subjects that do **not** exist in the repo. A passing agent
  responds "could not confirm"; a failing agent invents. Score it in the
  existing Quality Knowledge Loop (memory `Quality Knowledge Loop`) and inject
  the result as a shared agent memory so the behaviour compounds.
- **Touches**: the agent-eval path + `cortex_agent_memories` (shared memory,
  `agentSlug:null, userId:null`). No new mechanical restriction (Pillar 1 — no
  `restrictedTools`); the probe *measures* the prompt-driven behaviour.

### 5.2 Pillar 2 (declarative config) — grounding as a phase contract
- **Gap**: grounding order (provided → internal → web) is convention, not a
  declared, inspectable property of a phase template.
- **Plan**: surface a declarative `grounding` hint on `AgentPhaseTemplate`
  (alongside the existing `depths?`) so a phase can state "internal-only" vs
  "web-allowed". This makes the H1 control *visible* in config and lets us flag
  any phase that allows web search on an internally-named subject (the original
  footgun). Filtering stays at conversion time, declarative — no hardcoded
  per-agent logic.

### 5.3 Pillar 3 (the LLM is the template engine) — cite-or-omit in authored docs
- **Gap**: `html-author` / data-analyst output asserts; rule 09 scores honesty
  but nothing *mechanically* ties a claim to a source.
- **Plan**: a lightweight **cite-or-omit** convention for authored artefacts —
  every load-bearing claim carries a grounding reference (a real path, an
  `insights/` anchor, or a live-query id), or it is cut. The doc-author phase
  prompt already grounds via RepoGrounding; this makes the *output* carry the
  provenance (H6). Validated by extending `check-insights-sync`-style path
  resolution to authored docs (it already verifies `doc/…` references).

### 5.4 Governance — provenance you can replay (H6)
- **Gap**: the audit trail records *that* an action happened; it doesn't yet
  give a one-click "why did you say that — show the grounding".
- **Plan**: attach the grounding set (the RepoGrounding reads + live-query ids
  an agent used) to the governed action record, so a reviewer can replay the
  evidence behind any answer. Plugs into the existing governance audit
  (`governance-audit-daily-root` scheduled task) — no new store.

### 5.5 Cross-cutting — an explicit self-critique pass for high-stakes output (H7)
- **Gap**: iteration is encouraged (tenet 5) but a *completeness/honesty critic*
  is not a standard step for high-stakes generations.
- **Plan**: an optional **critic** sub-step (one extra LLM pass) that asks "what
  here is unverified, what claim has no source, what was assumed?" — the
  output's gaps become the next iteration's work. Reuses the single-loop model
  (no rigid phase); enable per-template for high-stakes agents only, to keep
  cost down.

## 6. Verification — how we prove it

Trust claims must themselves be falsifiable (the whole point of rule 09 §4
honest scoring, applied to the platform):

- **Grounding integrity**: `node scripts/check-insights-sync.cjs` exits 0;
  the daily `insights-sync-check` task is green. A red run *is* the drift alarm.
- **Refuse-to-invent**: the §5.1 ungroundable-probe passes (agent says "could
  not confirm" on a non-existent subject) — a regression test for the
  process-runner failure.
- **No silent fallbacks**: the pre-commit `audit-silent-imports` hook reports
  `0 HIGH` (the standing bar on every commit in this repo).
- **Live data over guesses**: spot-check that `DataSourceQueryBridge` answers
  carry measured values traceable to a query plan, not free-text numbers.

## 7. Built vs planned

**Built**: rule 10 (ground-before-generate / refuse-to-invent / right-tool);
`RepoGroundingTool` (read-only, secret-safe, 5 actions); `insights/` L2 corpus +
`check-insights-sync.cjs` + scheduled `insights-sync-check` drift detection;
no-fallbacks (rule 05 §1) + clear-errors (rule 04 §3) + `audit-silent-imports`
hook; `DataSourceQueryBridge` live queries; deterministic condensation (rule 05
§6); governance audit substrate.

**Planned** (§5): measurable refuse-to-invent (ungroundable-probe in the
quality loop); declarative `grounding` phase contract; cite-or-omit provenance
on authored docs; replayable grounding on governed actions; optional
self-critique pass for high-stakes output.

**Honesty note**: nothing above claims hallucination is "solved". The claim is
narrower and defensible — *the architecture is built so that the cheap,
common failure modes (invent-a-namesake, guess-a-number, reason-on-a-silent-
default, ground-in-stale-truth) are foreclosed by design, and the residual
risk is measured rather than assumed.* That is the line the companion
positioning doc must hold to.
