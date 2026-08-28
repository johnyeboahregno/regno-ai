# Anthropic Corpus Coverage Audit (AICAP.CORPUS-AUDIT)

> **What this is.** A grounded, notebook-level evaluation of the *entire* downloaded Anthropic
> corpus (`doc/anthropic/` — 89 cookbook notebooks + 67 course notebooks + 16 docs = 172 items)
> against what Regno.ai actually implements. Supersedes the prior *pattern-level* pass
> (`anthropic-alignment.md`) and the landscape-probe's self-scored "91%".
>
> **Method.** The 172 items collapse to ~50 distinct techniques (the 13-chapter prompt tutorial
> alone is triplicated → 39 notebooks). Each technique is classified **✅ Implemented / ⚠ Partial /
> ❌ Gap** with a **real code pointer** (rule 10 — no claim without a file). Ambiguous ones were
> grepped, not assumed.
>
> Audited 2026-07-13. Status is honest as of that date.

## Legend
✅ Implemented · ⚠ Partial (exists but narrower than the cookbook) · ❌ Gap (no implementation found)

---

## 1. Retrieval & Knowledge

| Technique (corpus source) | Status | Where / note |
|---|---|---|
| RAG | ✅ | `rag` node; `KnowledgeBaseTool`, Qdrant + Neo4j stores |
| Contextual Retrieval / Contextual Embeddings | ✅ | `ContextualChunkingService.ts` (AI context prefix per chunk) |
| Reranking (precision layer) | ✅ | 11 scoring engines — `scoreFactsBatch`, Cohere/Voyage/Zerank/BGE |
| Knowledge Graph construction | ✅ | Neo4j + `EntityRelationshipExtractor.ts` |
| Summarization | ✅ | `KnowledgeDistiller.ts`, context condensation |
| Classification | ✅ | CMS task routing / rules engine; cross-encoder scoring |
| Text-to-SQL (NL → SQL) | ❌ | `DataSourceQueryTool` runs queries, but no NL→SQL generation step |
| Router / Sub-question query engines | ⚠ | `intent-routing` + PlanEngine decomposition; not a named router-query engine |

## 2. Agents & Orchestration

| Technique | Status | Where / note |
|---|---|---|
| Orchestrator–Workers | ✅ | `Orchestrator.ts`, `MultiAgentOrchestrator.ts` |
| Evaluator–Optimizer | ✅ | `evaluator-optimizer` node; DelegationEvaluator |
| Prompt chaining / routing / parallelization (basic workflows) | ✅ | `pat-chaining/routing/parallel` nodes; PlanEngine phases |
| Async multi-agent orchestration | ✅ | `MultiAgentOrchestrator.ts`, ParallelTaskTool |
| ReAct / agentic loop | ✅ | `CortexFlowExecutor` iterating loop |
| Sub-agents (small model as sub-agent) | ✅ | `subagents` node, ParallelTask, ExecutorPool |
| Coordinator (big-plan / small-execute) | ✅ | `depth`-aware plans + `ModelTierEvaluator.ts` |
| Data-analyst agent | ✅ | Deep-Dive Explorer (`deep-hourly` per-parameter analysis) |
| Explore unfamiliar codebase | ✅ | RepoGrounding tool + insights corpus |
| Human-in-the-loop gate | ✅ | CMS review gates; `clarification` (Asks-When-Unsure) |
| Iterate: do→observe→fix | ✅ | agentic loop + `agent-eval` regression |
| Verify with outcome grader | ✅ | `agentEval.ts` LLM-judge |
| Remember user preferences | ✅ | `memory-tool`, `userPrefs`, chat memory |
| Prompt versioning & rollback | ⚠ | prompt/pattern history in `ExpertPatternExecutor`; no first-class version+rollback UI |
| Operate in production / hosting | ✅ | execution server, BullMQ, health/monitoring |

## 3. Tool Use

| Technique | Status | Where / note |
|---|---|---|
| Tool use basics + tool_choice | ✅ | `ToolRegistry.ts`, `tool-use` node |
| Parallel tool calls | ✅ | `ParallelTaskTool.ts` |
| Structured JSON / JSON mode / tool-forced output | ✅ | `structured-output` node; DocumentRender schema |
| Calculator / code tool | ✅ | `PythonExecTool.ts` |
| Customer-service agent | ✅ | apps (F1, NEXUS) |
| Context engineering / auto context compaction | ✅ | `condensation`, ContextBuilder compression |
| Memory / context editing (long-running) | ✅ | `memory-tool`, `agent_memories` |
| Session memory compaction | ✅ | ContextBuilder + condensation |
| **Programmatic Tool Calling (PTC)** | ❌ | newer pattern — no implementation |
| **Tool Search with embeddings** (scale to 1000s of tools) | ❌ | `ToolRegistry` is static/enumerated; no embedding-based tool selection |

## 4. Thinking & Prompting

| Technique | Status | Where / note |
|---|---|---|
| Extended thinking (+ with tool use) | ✅ | `extended-thinking` node; adaptive-thinking API |
| Prompt-engineering fundamentals (structure, clarity, roles, few-shot, step-by-step, chaining, hallucination-avoidance) | ✅ | `prompt-composition`, `PromptEnhancer.ts`, rule-10 refuse-to-invent |
| Metaprompt / automatic prompt improvement | ⚠ | `PromptEnhancer.ts` (APE) enhances the user query; not a full meta-prompt authoring loop |
| Prompt caching | ✅ | `prompt-caching` node (AICAP.CACHE) |
| **Speculative prompt caching** | ❌ | optimization not implemented |
| Sampling past max-tokens (continuation) | ❌ | not implemented (niche) |

## 5. Multimodal

| Technique | Status | Where / note |
|---|---|---|
| Vision — image input / analysis | ⚠ | `ImageAnalyzeTool.ts`; vision refs in CortexFlowExecutor — not a full vision-agent path (AICAP.MULTIMODAL) |
| Vision best-practices / charts-graphs / crop tool | ❌ | not implemented |
| PDF upload / summarization | ✅ | `PdfReadTool.ts` |
| Audio transcription | ✅ | `AudioTranscribeTool.ts` |

## 6. Evaluation & Observability

| Technique | Status | Where / note |
|---|---|---|
| Building evals / eval fundamentals | ✅ | `agentEval.ts` (golden tasks) + query-engine eval |
| Code-graded / model-graded evals | ✅ | `agentEval.ts` LLM-judge |
| Tool evaluation | ⚠ | `agent-eval` grades answers; no dedicated tool-call eval |
| **Synthetic test-data generation** (for eval suites) | ❌ | CMS scenario seeding exists but not eval test-data |
| **Promptfoo-style external eval harness** | ❌ | we have our own; promptfoo integration is a gap (low priority) |
| Usage & cost / observability | ✅ | `agentTrace.ts`, `ExecutionAnalysisService`, monitoring |

## 7. Platform / API techniques

| Technique | Status | Where / note |
|---|---|---|
| Citations / source attribution | ✅ | `citations` node (AICAP.CITE) |
| Streaming | ✅ | `CortexFlowExecutor` stream + realtime SSE |
| MCP connector | ✅ | `src/lib/server/mcp/` (AICAP.MCP) |
| Agent Skills | ⚠ | `SkillLoader.ts` + `SkillExporter.ts` exist; not yet exposed/composed in the agent UI (AICAP.SKILLS) |
| Model routing by difficulty + fallback | ⚠ | `ModelTierEvaluator.ts` routes by tier; **fallback billing** ❌ not implemented |
| Batch API (Message Batches) | ⚠ | `BatchExtractionService.ts` exists — verify it uses the Batches API vs looped calls (AICAP.BATCH) |
| **Computer use** | ❌ | no computer-use tool (AICAP.COMPUTER) |
| **Content moderation filter** | ❌ | relevance filtering ≠ content moderation; no moderation classifier |
| Finetuning | ❌ (out of scope) | Regno.ai orchestrates hosted models; not owning weights — intentional non-goal |
| Frontend-aesthetics prompting | n/a | a prompting guide, not a platform capability |
| 3rd-party vector stores (Pinecone/Mongo/LlamaIndex) | ✅ (equiv) | we use Qdrant + Neo4j instead — equivalent, not a gap |
| Wolfram Alpha tool | ❌ | not integrated (low priority — PythonExec covers most compute) |
| Wikipedia search tool | ✅ | `WikipediaQueryTool.ts` |

---

## Findings — corrections to the prior assessment

The pattern-level pass under- or over-counted several items. Grounded truth:

- **Partially built, not gaps** (registry had these as open gaps): model **routing** (`ModelTierEvaluator`), **metaprompt** (`PromptEnhancer`), agent **skills** (`SkillLoader`/`SkillExporter`), **batch** (`BatchExtractionService`). → downgrade from "Gap" to "Partial — finish + surface."
- **Genuinely new gaps** (were not on any list):
  1. **Programmatic Tool Calling (PTC)** — newer high-value tool pattern.
  2. **Tool Search with embeddings** — needed once the tool count grows (we now expose ~25 tools; scaling further wants this).
  3. **Speculative prompt caching** — latency/cost optimisation.
  4. **Content moderation filter** — distinct from relevance filtering; a real safety gap.
  5. **Fallback billing** — the missing half of model routing.
  6. **Text-to-SQL** — NL→SQL over connected data sources.
  7. **Synthetic eval test-data generation**.
- **Confirmed gaps already tracked:** computer-use (AICAP.COMPUTER), full multimodal/vision-agent (AICAP.MULTIMODAL).
- **Intentional non-goals:** finetuning, promptfoo, Wolfram — noted, not tickets.

## Built-but-invisible → surface in VISION
Real features that deserve a node / stronger narration (feeds the "substrate USP" thread):
- **Model tier routing** (`ModelTierEvaluator`) — "right-sized model per task" is a cost/quality story.
- **Prompt enhancement / APE** (`PromptEnhancer`) — "it improves your prompt before running."
- **Agent Skills** (`SkillLoader`) — composable skills.
- **Batch extraction** — bulk processing at lower cost.
- **Context compaction / editing** — long-running agents that don't lose the thread.

## Recommended new tickets (for §9 AICAP)
P2: `AICAP.PTC` (programmatic tool calling), `AICAP.TOOLSEARCH` (embedding tool search), `AICAP.MODERATION` (content moderation filter).
P3: `AICAP.SPECULATIVE-CACHE`, `AICAP.FALLBACK-BILLING`, `AICAP.TEXT2SQL`, `AICAP.SYNTH-EVAL`.
Finish/partial → promote existing: routing (finish fallback), skills (expose), batch (confirm Batches API), metaprompt (meta-authoring loop), multimodal, computer-use.
