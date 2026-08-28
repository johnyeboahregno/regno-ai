# Cortex Flow Multi-Framework Implementation Progress

> **Started**: January 2026
> **Status**: In Progress
> **Lead**: AI Architecture Team

---

## Overview

Transforming Cortex Flow from a single-framework (Claude) system into a unified multi-framework ecosystem with intelligent routing.

**Current State**: 10 framework executors fully implemented and operational.

| Category | Executors | Purpose |
|----------|-----------|---------|
| **Direct Models** | Claude, OpenAI, Gemini, Llama, Perplexity | Direct API access to major AI providers |
| **Orchestration** | LangGraph, Multi-Agent, Debate, Auto, Pipeline | Advanced workflow patterns |

---

## Framework Capabilities & When to Use

### Direct Model Executors

| Framework | Best For | Key Capabilities | When NOT to Use |
|-----------|----------|------------------|-----------------|
| **Claude** | Complex reasoning, code generation, long documents | Extended thinking, 200K context, vision, tool use | Real-time web search |
| **OpenAI** | General tasks, code execution, image generation | GPT-5, o3 reasoning, DALL-E 3, code interpreter, structured output | Cost-sensitive workloads |
| **Gemini** | Multimodal (video/audio), very long documents | 1M context, native image gen, video/audio analysis, Google grounding | Smaller/faster tasks |
| **Llama** | Self-hosted, cost control, open-source | 8 providers, Llama 4/3.3/3.2, Code Llama, Llama Guard | Needs managed service |
| **Perplexity** | Research, fact-checking, cited information | Real-time web search, auto citations, search recency, domain filters | Creative writing, coding |

### Orchestration Executors

| Framework | Best For | Key Capabilities | When NOT to Use |
|-----------|----------|------------------|-----------------|
| **LangGraph** | Complex workflows, resumable tasks | MongoDB checkpoints, human-in-the-loop, stateful graphs, any underlying model | Simple single-shot queries |
| **Multi-Agent** | Task decomposition, collaborative analysis | 7 roles (researcher, analyst, writer, etc.), parallel/sequential/adaptive | Single-domain tasks |
| **Debate** | Decision making, balanced analysis | Advocate/Critic/Judge, 1-3 rounds, adversarial/constructive styles | Straightforward questions |
| **Auto** | Unknown task types, dynamic selection | Task analysis, capability matching, cost-aware routing, hybrid pipelines | Known best framework |
| **Pipeline** | Multi-stage workflows, quality gates | 6 presets, stage chaining, context accumulation, framework mixing | Single-step tasks |

### Detailed Capability Matrix

| Capability | Claude | OpenAI | Gemini | Llama | Perplexity | LangGraph | Multi-Agent | Debate | Auto | Pipeline |
|------------|--------|--------|--------|-------|------------|-----------|-------------|--------|------|----------|
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool Use | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vision | ✅ | ✅ | ✅ | ✅* | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ |
| Extended Thinking | ✅ | ✅* | ❌ | ❌ | ✅* | ✅ | ❌ | ❌ | ✅ | ✅ |
| Code Execution | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Image Generation | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Web Search | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real-time Search | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Citations | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Checkpoints | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Human-in-Loop | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Self-Hosted | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

*✅* = Model-dependent

### Use Case Recommendations

| Use Case | Recommended Framework | Rationale |
|----------|----------------------|-----------|
| **Research with citations** | Perplexity | Built-in web search with automatic source attribution |
| **Complex reasoning tasks** | Claude | Extended thinking with step-by-step reasoning |
| **Code generation/review** | Claude, OpenAI, Llama (Code) | Strong coding capabilities |
| **Multimodal analysis (video/audio)** | Gemini | Native video/audio processing |
| **Very long documents (100K+ tokens)** | Gemini, Claude | 1M and 200K context respectively |
| **Resumable long-running tasks** | LangGraph | Checkpoint persistence with MongoDB |
| **Tasks requiring user approval** | LangGraph | Human-in-the-loop via interrupt() |
| **Comprehensive reports** | Multi-Agent | Multiple specialized agents collaborating |
| **Decision making/analysis** | Debate | Structured adversarial reasoning |
| **Complex multi-step workflows** | Pipeline | Stage chaining with quality gates |
| **Cost-sensitive workloads** | Llama (self-hosted) | No per-token costs with local deployment |
| **Unknown task types** | Auto | Intelligent routing based on task analysis |

---

## Implementation Phases

### Phase 1: Foundation & Control Panel UI ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Create framework types | ✅ Done | `src/lib/types/frameworkTypes.ts` | All 7 frameworks defined with capabilities |
| Framework definitions | ✅ Done | `src/lib/types/frameworkTypes.ts` | Claude, OpenAI, Gemini, LangGraph, Multi-Agent, Debate, Auto |
| Capability declarations | ✅ Done | `src/lib/types/frameworkTypes.ts` | Used for intelligent routing |
| Control Panel cover page | ✅ Done | `src/lib/components/cortex-flow/ControlPanelCover.svelte` | Framework selection UI with cards |
| Settings modal refactor | ✅ Done | `src/lib/components/cortex-flow/CortexFlowSettingsModal.svelte` | Cover page + slide transitions |
| Framework-specific panels | ✅ Done | `src/lib/components/cortex-flow/settings/` | Full panels for OpenAI/Gemini, placeholders for others |
| Reusable placeholder component | ✅ Done | `src/lib/components/cortex-flow/settings/FrameworkPlaceholder.svelte` | Generic "coming soon" panel |
| Settings exports index | ✅ Done | `src/lib/components/cortex-flow/settings/index.ts` | Clean exports for all panels |

### Phase 2: Claude Executor Refactor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Extract IAgentExecutor interface | ✅ Done | `src/lib/server/cortex-flow/IAgentExecutor.ts` | Base interface with capabilities |
| Refactor current executor | ✅ Done | `src/lib/server/cortex-flow/executors/ClaudeExecutor.ts` | Wrapper implementing interface |
| ExecutorFactory | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Singleton factory with registration |
| Executors index | ✅ Done | `src/lib/server/cortex-flow/executors/index.ts` | Clean exports |
| SSE event normalization | ✅ Done | `src/lib/server/cortex-flow/IAgentExecutor.ts` | Unified event emission in BaseAgentExecutor |

### Phase 3: OpenAI Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| OpenAI SDK integration | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | Full implementation with streaming |
| Credential system integration | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | Uses `getLlmCredentialById()` |
| Function calling (tools) | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | WebSearch, WebFetch, Read, Write, Bash |
| Agent loop | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | Full agent loop with tool execution |
| Cost tracking | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | GPT-4o, o1 series pricing |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/OpenAISettings.svelte` | Full settings with credential selection |
| Test connection endpoint | ✅ Done | `src/routes/api/cortex-flow/test-connection/+server.ts` | Multi-framework test endpoint |
| DALL-E tool integration | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | DALL-E 3 image generation with size/quality/style options |
| Structured output support | ✅ Done | `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | JSON mode with optional schema validation |

### Phase 4: Gemini Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Gemini SDK integration | ✅ Done | `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` | Full implementation with streaming |
| Credential system integration | ✅ Done | `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` | Uses `getLlmCredentialById()` |
| Function calling (tools) | ✅ Done | `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` | WebSearch, WebFetch, Read, Write, Bash |
| Agent loop | ✅ Done | `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` | Full agent loop with tool execution |
| Cost tracking | ✅ Done | `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` | Gemini 1.5/2.0 pricing |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/GeminiSettings.svelte` | Full settings with credential selection |
| 1M context support | ✅ Done | | Large document handling enabled |
| Image generation (NanoBanana) | ✅ Done | `GeminiExecutor.ts` | Gemini 2.0 Flash native image generation |
| Video/audio processing | ✅ Done | `GeminiExecutor.ts` | Native multimodal analysis for video (mp4, avi, mov) and audio (mp3, wav, m4a) |
| Google grounding | ✅ Done | `GeminiExecutor.ts` | Real-time Google Search grounding with dynamic retrieval |

### Phase 5: Worker & Settings Integration ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Add framework to CortexFlowSettings | ✅ Done | `src/lib/types/cortexFlow.ts` | `llm.framework` field added |
| Add framework to job data | ✅ Done | `src/lib/server/queues/types.ts` | `CortexFlowJobData.llm.framework` |
| Update execute endpoint | ✅ Done | `src/routes/api/cortex-flow/execute/+server.ts` | Passes framework to worker |
| Update CortexFlowWorker | ✅ Done | `src/lib/server/queues/workers/CortexFlowWorker.ts` | Uses ExecutorFactory |
| Framework selection persistence | ✅ Done | `src/lib/components/cortex-flow/CortexFlowSettingsModal.svelte` | Syncs to localSettings |
| Mark OpenAI/Gemini as available | ✅ Done | `src/lib/types/frameworkTypes.ts` | Changed from 'coming-soon' |

### Phase 6: LangGraph Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| LangGraph.js integration | ✅ Done | `src/lib/server/cortex-flow/executors/LangGraphExecutor.ts` | Full StateGraph implementation |
| Type definitions | ✅ Done | `src/lib/types/langGraphTypes.ts` | Config, phases, tool calls, checkpoints |
| State schema | ✅ Done | `src/lib/server/cortex-flow/executors/LangGraphStateSchema.ts` | Annotation with reducers |
| Checkpoint system | ✅ Done | `src/lib/server/cortex-flow/executors/LangGraphCheckpointer.ts` | MongoDB persistence with TTL |
| Model factory | ✅ Done | `src/lib/server/cortex-flow/executors/LangGraphModelFactory.ts` | Claude/OpenAI/Gemini support |
| Tool adapter | ✅ Done | `src/lib/server/cortex-flow/executors/LangGraphToolAdapter.ts` | Converts Cortex Flow tools to LangChain |
| Agent graph | ✅ Done | `src/lib/server/cortex-flow/graphs/AgentGraph.ts` | Graph with agent loop and routing |
| Human-in-loop support | ✅ Done | `src/lib/server/cortex-flow/executors/LangGraphExecutor.ts` | Via LangGraph interrupt() |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/LangGraphSettings.svelte` | Full panel with 3 tabs |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Registered with capabilities |
| Framework marked available | ✅ Done | `src/lib/types/frameworkTypes.ts` | Changed from 'coming-soon' |
| Graph visualization | ✅ Done | `LangGraphSettings.svelte` | Interactive SVG workflow diagram with dynamic human-in-loop display |

### Phase 7: Multi-Agent Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/multiAgentTypes.ts` | Roles, strategies, tasks, communication |
| Multi-agent orchestrator | ✅ Done | `src/lib/server/cortex-flow/executors/MultiAgentOrchestrator.ts` | Coordination logic with parallel/sequential/adaptive |
| Multi-agent executor | ✅ Done | `src/lib/server/cortex-flow/executors/MultiAgentExecutor.ts` | IAgentExecutor implementation |
| Role-based agents | ✅ Done | `src/lib/types/multiAgentTypes.ts` | Researcher, Analyst, Writer, Critic, Coder, Planner, Coordinator |
| Execution strategies | ✅ Done | | Sequential, Parallel, Adaptive |
| Agent communication | ✅ Done | | Broadcast, Directed, Hierarchical modes |
| Task decomposition | ✅ Done | | Break tasks into subtasks with dependencies |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/MultiAgentSettings.svelte` | Full 3-tab panel (Agents, Execution, Capabilities) |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Registered with capabilities |
| Framework marked available | ✅ Done | `src/lib/types/frameworkTypes.ts` | Changed from 'coming-soon' |

### Phase 8: Debate Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/debateTypes.ts` | Roles, phases, styles, arguments, critiques |
| Debate executor | ✅ Done | `src/lib/server/cortex-flow/executors/DebateExecutor.ts` | Full IAgentExecutor implementation |
| Advocate agent | ✅ Done | `src/lib/types/debateTypes.ts` | Arguments FOR positions with evidence |
| Critic agent | ✅ Done | `src/lib/types/debateTypes.ts` | Challenges and counterarguments |
| Judge synthesis | ✅ Done | `src/lib/server/cortex-flow/executors/DebateExecutor.ts` | Balanced verdict with assessments |
| Multi-round debates | ✅ Done | | 1-3 configurable rounds |
| Debate styles | ✅ Done | | Constructive, adversarial, balanced |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/DebateSettings.svelte` | Full 3-tab panel |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Latest model support |
| Framework marked available | ✅ Done | `src/lib/types/frameworkTypes.ts` | Changed from 'coming-soon' |

### Phase 9: Intelligent Router ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/intelligentRouterTypes.ts` | Task types, requirements, routing decisions |
| Task analyzer | ✅ Done | `src/lib/server/cortex-flow/routing/TaskAnalyzer.ts` | Analyzes prompts for task type, complexity, urgency |
| Framework scorer | ✅ Done | `src/lib/server/cortex-flow/routing/FrameworkScorer.ts` | Multi-factor scoring with capability matching |
| Intelligent router | ✅ Done | `src/lib/server/cortex-flow/routing/IntelligentRouter.ts` | Orchestrates analysis and selection |
| Auto executor | ✅ Done | `src/lib/server/cortex-flow/executors/AutoExecutor.ts` | IAgentExecutor that uses router |
| Hybrid pipeline support | ✅ Done | `src/lib/server/cortex-flow/executors/AutoExecutor.ts` | Multi-framework chaining |
| Cost-aware routing | ✅ Done | `src/lib/types/intelligentRouterTypes.ts` | Budget constraints in preferences |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/AutoSettings.svelte` | Full 3-tab panel |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Auto registered with capabilities |
| Framework marked available | ✅ Done | `src/lib/types/frameworkTypes.ts` | Changed from 'coming-soon' |

### Phase 10: Cost Tracking ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/costTrackingTypes.ts` | CostEvent, CostSummary, BudgetLimit, CostTrend, etc. |
| Pricing registry | ✅ Done | `src/lib/server/cortex-flow/cost/PricingRegistry.ts` | Claude, OpenAI, Gemini models with per-token pricing |
| Cost tracker | ✅ Done | `src/lib/server/cortex-flow/cost/CostTracker.ts` | Real-time tracking, MongoDB persistence, SSE events |
| Budget manager | ✅ Done | `src/lib/server/cortex-flow/cost/BudgetManager.ts` | Daily/weekly/monthly/per-execution limits with warnings |
| Cost analytics | ✅ Done | `src/lib/server/cortex-flow/cost/CostAnalytics.ts` | Trends, reports, insights, recommendations |
| Cost integration | ✅ Done | `src/lib/server/cortex-flow/cost/CostIntegration.ts` | Easy executor integration helpers |
| Cost API endpoints | ✅ Done | `src/routes/api/cortex-flow/cost/` | Summary, budget, analytics, pricing endpoints |
| Cost dashboard UI | ✅ Done | `src/lib/components/cortex-flow/CostDashboard.svelte` | Full dashboard with charts, budgets, insights |

### Phase 11: Pipeline Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/pipelineTypes.ts` | PipelineDefinition, PipelineStage, StageRole, etc. |
| Pipeline executor | ✅ Done | `src/lib/server/cortex-flow/executors/PipelineExecutor.ts` | Full IAgentExecutor implementation |
| Stage management | ✅ Done | `src/lib/server/cortex-flow/executors/PipelineExecutor.ts` | Hand-off between stages with accumulated context |
| Pipeline presets | ✅ Done | `src/lib/server/cortex-flow/executors/PipelinePresets.ts` | 6 presets: deep-research, code-review, content-creation, data-analysis, problem-solving, document-writing |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/PipelineSettings.svelte` | Full 3-tab panel (Presets, Stages, Settings) |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Registered as 'hybrid' framework |
| Framework type | ✅ Done | `src/lib/types/frameworkTypes.ts` | Added 'hybrid' to FrameworkId |

---

## Files Created/Modified

### New Files

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/types/frameworkTypes.ts` | Framework type definitions | ✅ Created |
| `src/lib/components/cortex-flow/ControlPanelCover.svelte` | Framework selection UI | ✅ Created |
| `src/lib/components/cortex-flow/settings/OpenAISettings.svelte` | OpenAI-specific settings | ✅ Created |
| `src/lib/components/cortex-flow/settings/GeminiSettings.svelte` | Gemini-specific settings | ✅ Created |
| `src/lib/components/cortex-flow/settings/LangGraphSettings.svelte` | LangGraph-specific settings | ✅ Full implementation |
| `src/lib/components/cortex-flow/settings/MultiAgentSettings.svelte` | Multi-agent settings | ✅ Full implementation |
| `src/lib/components/cortex-flow/settings/DebateSettings.svelte` | Debate-specific settings | ✅ Full implementation |
| `src/lib/types/debateTypes.ts` | Debate type definitions | ✅ Created |
| `src/lib/components/cortex-flow/settings/AutoSettings.svelte` | Auto-routing settings | ✅ Full implementation |
| `src/lib/components/cortex-flow/settings/FrameworkPlaceholder.svelte` | Generic placeholder | ✅ Created |
| `src/lib/server/cortex-flow/IAgentExecutor.ts` | Executor interface | ✅ Created |
| `src/lib/server/cortex-flow/ExecutorFactory.ts` | Factory pattern | ✅ Created |
| `src/lib/server/cortex-flow/executors/index.ts` | Executors export index | ✅ Created |
| `src/lib/server/cortex-flow/executors/ClaudeExecutor.ts` | Claude impl | ✅ Created |
| `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` | OpenAI impl | ✅ Created |
| `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` | Gemini impl | ✅ Created |
| `src/routes/api/cortex-flow/test-connection/+server.ts` | Multi-framework test | ✅ Created |
| `src/lib/types/intelligentRouterTypes.ts` | Routing type definitions | ✅ Created |
| `src/lib/server/cortex-flow/routing/TaskAnalyzer.ts` | Task analysis | ✅ Created |
| `src/lib/server/cortex-flow/routing/FrameworkScorer.ts` | Framework scoring | ✅ Created |
| `src/lib/server/cortex-flow/routing/IntelligentRouter.ts` | Smart routing orchestrator | ✅ Created |
| `src/lib/server/cortex-flow/routing/index.ts` | Routing module exports | ✅ Created |
| `src/lib/server/cortex-flow/executors/AutoExecutor.ts` | Auto executor impl | ✅ Created |
| `src/lib/types/langGraphTypes.ts` | LangGraph type definitions | ✅ Created |
| `src/lib/server/cortex-flow/executors/LangGraphExecutor.ts` | LangGraph executor | ✅ Created |
| `src/lib/server/cortex-flow/executors/LangGraphStateSchema.ts` | State annotation | ✅ Created |
| `src/lib/server/cortex-flow/executors/LangGraphCheckpointer.ts` | MongoDB checkpointer | ✅ Created |
| `src/lib/server/cortex-flow/executors/LangGraphModelFactory.ts` | Model client factory | ✅ Created |
| `src/lib/server/cortex-flow/executors/LangGraphToolAdapter.ts` | Tool adapter | ✅ Created |
| `src/lib/server/cortex-flow/graphs/AgentGraph.ts` | Agent graph definition | ✅ Created |
| `src/lib/types/multiAgentTypes.ts` | Multi-agent type definitions | ✅ Created |
| `src/lib/server/cortex-flow/executors/MultiAgentOrchestrator.ts` | Orchestration logic | ✅ Created |
| `src/lib/server/cortex-flow/executors/MultiAgentExecutor.ts` | Multi-agent impl | ✅ Created |
| `src/lib/server/cortex-flow/executors/DebateExecutor.ts` | Debate impl | ✅ Created |
| `src/lib/server/cortex-flow/executors/PipelineExecutor.ts` | Pipeline impl | ✅ Created |
| `src/lib/server/cortex-flow/executors/PipelinePresets.ts` | Pipeline presets | ✅ Created |
| `src/lib/types/pipelineTypes.ts` | Pipeline type definitions | ✅ Created |
| `src/lib/components/cortex-flow/settings/PipelineSettings.svelte` | Pipeline settings panel | ✅ Created |
| `src/lib/types/costTrackingTypes.ts` | Cost tracking types | ✅ Created |
| `src/lib/server/cortex-flow/cost/PricingRegistry.ts` | Model pricing registry | ✅ Created |
| `src/lib/server/cortex-flow/cost/CostTracker.ts` | Real-time cost tracker | ✅ Created |
| `src/lib/server/cortex-flow/cost/BudgetManager.ts` | Budget limits manager | ✅ Created |
| `src/lib/server/cortex-flow/cost/CostAnalytics.ts` | Cost analytics service | ✅ Created |
| `src/lib/server/cortex-flow/cost/CostIntegration.ts` | Executor integration helpers | ✅ Created |
| `src/lib/server/cortex-flow/cost/index.ts` | Cost module exports | ✅ Created |
| `src/routes/api/cortex-flow/cost/+server.ts` | Cost summary API | ✅ Created |
| `src/routes/api/cortex-flow/cost/budget/+server.ts` | Budget management API | ✅ Created |
| `src/routes/api/cortex-flow/cost/analytics/+server.ts` | Cost analytics API | ✅ Created |
| `src/routes/api/cortex-flow/cost/pricing/+server.ts` | Pricing info API | ✅ Created |
| `src/lib/components/cortex-flow/CostDashboard.svelte` | Cost dashboard UI | ✅ Created |
| `src/lib/types/llamaTypes.ts` | Llama type definitions | ✅ Created |
| `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | Llama executor impl | ✅ Created |
| `src/lib/components/cortex-flow/settings/LlamaSettings.svelte` | Llama settings panel | ✅ Created |
| `src/lib/types/perplexityTypes.ts` | Perplexity type definitions | ✅ Created |
| `src/lib/server/cortex-flow/executors/PerplexityExecutor.ts` | Perplexity executor impl | ✅ Created |
| `src/lib/components/cortex-flow/settings/PerplexitySettings.svelte` | Perplexity settings panel | ✅ Created |
| `src/lib/components/cortex-flow/settings/index.ts` | Settings exports index | ✅ Updated |

### Modified Files

| File | Changes | Status |
|------|---------|--------|
| `src/lib/components/cortex-flow/CortexFlowSettingsModal.svelte` | Add framework nav, cover page, slide transitions, framework persistence, Llama/Perplexity routing | ✅ Done |
| `src/lib/components/cortex-flow/settings/index.ts` | Added exports for LlamaSettings and PerplexitySettings | ✅ Done |
| `src/lib/types/cortexFlow.ts` | Add `llm.framework` field to settings | ✅ Done |
| `src/lib/server/queues/types.ts` | Add framework to CortexFlowJobData | ✅ Done |
| `src/lib/server/queues/workers/CortexFlowWorker.ts` | Use ExecutorFactory for dynamic executor creation | ✅ Done |
| `src/routes/api/cortex-flow/execute/+server.ts` | Pass framework to job data | ✅ Done |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORTEX FLOW CONTROL PANEL                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      COVER PAGE (Framework Selection)                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ 🧠 Auto │ │🟠Claude │ │🟢OpenAI │ │🔵Gemini │ │🟣LangGr │ ...   │   │
│  │  │(Coming) │ │✅Active │ │✅Active │ │✅Active │ │(Coming) │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  └───────┼──────────┼──────────┼──────────┼──────────┼────────────────┘   │
│          │          │          │          │          │                     │
│          ▼          ▼          ▼          ▼          ▼                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              FRAMEWORK-SPECIFIC SETTINGS (Slides in)                │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │ Framework Settings (model, credentials, parameters)           │  │   │
│  │  │ ├── Credential Selection                                      │  │   │
│  │  │ ├── Model Selection                                           │  │   │
│  │  │ ├── Temperature / Max Tokens                                  │  │   │
│  │  │ ├── Test Connection                                           │  │   │
│  │  │ └── Framework-specific options                                │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Executor Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              EXECUTOR ARCHITECTURE                                     │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────┐      │
│  │                       ExecutorFactory (Singleton)                            │      │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │      │
│  │  │ createExecutor({ frameworkId, settings, autoRoute })                  │  │      │
│  │  │ registerExecutor(frameworkId, executor, capabilities)                 │  │      │
│  │  │ routeIntelligently(settings) → RoutingDecision                        │  │      │
│  │  │ findBestFramework(requirements) → FrameworkId                         │  │      │
│  │  └───────────────────────────────────────────────────────────────────────┘  │      │
│  └─────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                   │
│                                    ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐      │
│  │                       IAgentExecutor Interface                               │      │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │      │
│  │  │ execute(prompt, settings, options): Promise<void>                     │  │      │
│  │  │ onEvent(callback): void                                               │  │      │
│  │  │ abort(): void                                                         │  │      │
│  │  │ getCapabilities(): ExecutorCapabilities                               │  │      │
│  │  └───────────────────────────────────────────────────────────────────────┘  │      │
│  └─────────────────────────────────────────────────────────────────────────────┘      │
│                                    │                                                   │
│    ┌───────────┬───────────┬───────┴───────┬───────────┬───────────┐                  │
│    │           │           │               │           │           │                  │
│    ▼           ▼           ▼               ▼           ▼           ▼                  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐                │
│ │ Claude │ │ OpenAI │ │ Gemini │ │   Llama  │ │Perplexity│ │LangGrph│ + 4 more      │
│ │✅Active│ │✅Active│ │✅Active│ │ ✅Active │ │ ✅Active │ │✅Active│                │
│ └───┬────┘ └───┬────┘ └───┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘                │
│     │          │          │           │            │           │                      │
│     ▼          ▼          ▼           ▼            ▼           ▼                      │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐                │
│ │Anthropc│ │ OpenAI │ │GoogleAI│ │ Together │ │Perplexity│ │LangChn │                │
│ │  SDK   │ │  SDK   │ │  SDK   │ │ Groq/*8  │ │   API    │ │  SDK   │                │
│ └────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘ └────────┘                │
│                                                                                        │
│  Available Executors (10 total):                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐      │
│  │ DIRECT MODEL EXECUTORS                                                       │      │
│  │ • Claude     - Anthropic (claude-opus-4-5, claude-sonnet-4-5)               │      │
│  │ • OpenAI     - GPT-5, GPT-4.1, o3 reasoning series                          │      │
│  │ • Gemini     - Gemini 3, Gemini 2.5/2.0, 1M context, video/audio            │      │
│  │ • Llama      - Meta Llama 4/3.3/3.2 via Together/Groq/Fireworks/Ollama/etc  │      │
│  │ • Perplexity - Search-native AI (sonar, sonar-pro, sonar-reasoning)         │      │
│  ├─────────────────────────────────────────────────────────────────────────────┤      │
│  │ ORCHESTRATION EXECUTORS                                                      │      │
│  │ • LangGraph  - Stateful workflows with MongoDB checkpoints                  │      │
│  │ • Multi-Agt  - 7 role-based agents with parallel/sequential execution       │      │
│  │ • Debate     - Advocate/Critic/Judge adversarial pattern                    │      │
│  │ • Auto       - Intelligent routing to optimal framework                     │      │
│  │ • Pipeline   - Multi-stage framework chaining (6 presets)                   │      │
│  └─────────────────────────────────────────────────────────────────────────────┘      │
│                                                                                        │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Current Session Progress

### January 22, 2026

**Completed:**
1. ✅ Created comprehensive feasibility report (`doc/cortex-flow/MULTI_FRAMEWORK_FEASIBILITY_REPORT.md`)
2. ✅ Documented intelligent routing architecture
3. ✅ Documented cost tracking system
4. ✅ Documented feature parity strategy
5. ✅ Created framework types (`src/lib/types/frameworkTypes.ts`)
6. ✅ Created Control Panel cover page (`src/lib/components/cortex-flow/ControlPanelCover.svelte`)
7. ✅ Modified Settings Modal with cover page integration and slide transitions
8. ✅ Added framework selection state and navigation handlers
9. ✅ Added CSS for view container, cover/settings panels, back button, framework indicator
10. ✅ Created settings directory structure (`src/lib/components/cortex-flow/settings/`)
11. ✅ Created reusable FrameworkPlaceholder component for coming-soon frameworks
12. ✅ Created individual placeholder panels for all frameworks:
    - OpenAISettings.svelte
    - GeminiSettings.svelte
    - LangGraphSettings.svelte
    - MultiAgentSettings.svelte
    - DebateSettings.svelte
    - AutoSettings.svelte
13. ✅ Created settings index.ts for clean exports
14. ✅ Updated modal with framework-specific routing (shows placeholders for non-Claude)
15. ✅ Verified all new code compiles without errors

**Phase 1 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 2)

**Completed:**
1. ✅ Created `IAgentExecutor` interface (`src/lib/server/cortex-flow/IAgentExecutor.ts`):
   - Defined execution contract with `execute()`, `abort()`, `onEvent()`
   - Added `ExecutorCapabilities` for framework capability declarations
   - Added `ExecutorOptions`, `ExecutionStats`, `ExecutionResult` types
   - Created `BaseAgentExecutor` abstract class with common functionality
   - Included SSE event emission helpers

2. ✅ Created `ExecutorFactory` (`src/lib/server/cortex-flow/ExecutorFactory.ts`):
   - Singleton factory pattern for executor instantiation
   - Registration system for framework executors
   - Capability-based framework selection with `findBestFramework()`
   - Placeholder for intelligent routing with `routeIntelligently()`
   - Framework status and availability tracking

3. ✅ Created `ClaudeExecutor` (`src/lib/server/cortex-flow/executors/ClaudeExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - Wraps existing `CortexFlowExecutor` for backward compatibility
   - Declares Claude-specific capabilities
   - Forwards SSE events to unified event emitter

4. ✅ Created executors index (`src/lib/server/cortex-flow/executors/index.ts`):
   - Clean exports for all executor classes
   - Re-exports types from IAgentExecutor

5. ✅ Verified all code compiles without errors

**Phase 2 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 3 & 4)

**Completed:**
1. ✅ OpenAI Executor fully implemented (`src/lib/server/cortex-flow/executors/OpenAIExecutor.ts`):
   - Full OpenAI SDK integration with streaming
   - Agent loop with tool execution
   - Function calling support (WebSearch, WebFetch, Read, Write, Bash)
   - Cost tracking for GPT-4o, o1 series
   - Fixed to use credential system (`getLlmCredentialById()`) instead of env vars

2. ✅ Gemini Executor fully implemented (`src/lib/server/cortex-flow/executors/GeminiExecutor.ts`):
   - Full Google AI SDK integration with streaming
   - Agent loop with tool execution
   - Function declarations support
   - Cost tracking for Gemini 1.5/2.0 series
   - Fixed to use credential system (`getLlmCredentialById()`) instead of env vars

3. ✅ OpenAI Settings panel implemented (`src/lib/components/cortex-flow/settings/OpenAISettings.svelte`):
   - Full credential selection
   - Model picker with GPT-4o, o1 series
   - Temperature and max tokens sliders
   - Test connection button
   - Capabilities display

4. ✅ Gemini Settings panel implemented (`src/lib/components/cortex-flow/settings/GeminiSettings.svelte`):
   - Full credential selection (google-ai provider)
   - Model picker with Gemini 2.0/1.5 series (Flash, Pro, Exp)
   - Temperature and max tokens sliders
   - **ImageGeneration toggle** (enable/disable Nano Banana native image generation)
   - Model compatibility notice for image generation
   - Test connection button
   - Capabilities display with multimodal features

5. ✅ Created multi-framework test connection endpoint (`src/routes/api/cortex-flow/test-connection/+server.ts`):
   - Supports Claude, OpenAI, and Gemini
   - Uses credential system
   - Returns success/error status

**Phase 3 Status: COMPLETE** ✅
**Phase 4 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 5: Integration)

**Completed:**
1. ✅ Added `framework` field to `CortexFlowSettings.llm` (`src/lib/types/cortexFlow.ts`)
2. ✅ Added `framework` to `CortexFlowJobData.llm` (`src/lib/server/queues/types.ts`)
3. ✅ Updated execute endpoint to pass framework (`src/routes/api/cortex-flow/execute/+server.ts`)
4. ✅ Refactored `CortexFlowWorker` to use `ExecutorFactory`:
   - Dynamically creates executor based on `framework` setting
   - Changed `activeExecutors` map to use `IAgentExecutor` interface
   - Fixed TypeScript error for optional `submitReviewResponse` method
5. ✅ Updated `CortexFlowSettingsModal` to persist framework selection:
   - Initialize `currentFramework` from `settings.llm.framework`
   - Sync selection to `localSettings.llm.framework` on change
6. ✅ Marked OpenAI and Gemini as 'available' in `frameworkTypes.ts`

**Phase 5 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 6: LangGraph Executor)

**Completed:**
1. ✅ Installed LangGraph dependencies:
   - `@langchain/langgraph`
   - `@langchain/langgraph-checkpoint-mongodb`
   - `@langchain/anthropic`, `@langchain/openai`, `@langchain/google-genai`
   - `@langchain/core`

2. ✅ Created type definitions (`src/lib/types/langGraphTypes.ts`):
   - `LangGraphConfig` for executor configuration
   - `LangGraphPhase` for execution phases
   - `LangGraphToolCall` and `LangGraphToolResult`
   - `CheckpointMetadata` for persistence
   - Model pricing constants

3. ✅ Created state schema (`src/lib/server/cortex-flow/executors/LangGraphStateSchema.ts`):
   - `AgentStateAnnotation` with LangGraph Annotation system
   - State reducers for messages, tool calls, metadata
   - `createInitialState()` helper
   - `StateUpdates` utility class

4. ✅ Created MongoDB checkpointer (`src/lib/server/cortex-flow/executors/LangGraphCheckpointer.ts`):
   - Wraps `MongoDBSaver` from LangGraph
   - TTL index for automatic cleanup (configurable days)
   - Custom metadata storage alongside checkpoints
   - Thread management and resumability checks

5. ✅ Created model factory (`src/lib/server/cortex-flow/executors/LangGraphModelFactory.ts`):
   - `createModelClient()` for Claude, OpenAI, Gemini
   - Uses existing credential system (`getLlmCredentialById()`)
   - Supports extended thinking for Claude
   - `testModelConnection()` for settings panel

6. ✅ Created tool adapter (`src/lib/server/cortex-flow/executors/LangGraphToolAdapter.ts`):
   - Converts Cortex Flow tools to LangChain `DynamicStructuredTool`
   - JSON Schema to Zod conversion
   - Tool execution with context
   - `createLangChainTools()` and `createToolsMap()` helpers

7. ✅ Created agent graph (`src/lib/server/cortex-flow/graphs/AgentGraph.ts`):
   - StateGraph with nodes: initialize, agent, tools, review, human_input
   - Conditional routing via `routerFunction()`
   - Human-in-the-loop via `interrupt()`
   - SSE event emission throughout

8. ✅ Created LangGraphExecutor (`src/lib/server/cortex-flow/executors/LangGraphExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - `execute()` builds and runs the graph
   - `submitReviewResponse()` for human-in-the-loop
   - `abort()` for cancellation
   - Token and cost tracking

9. ✅ Updated exports and registration:
   - Added to `executors/index.ts`
   - Registered in `ExecutorFactory.ts`
   - Marked as 'available' in `frameworkTypes.ts`

10. ✅ Created full settings panel (`src/lib/components/cortex-flow/settings/LangGraphSettings.svelte`):
    - 3 tabs: Model, Workflow, Capabilities
    - Underlying model provider selection (Claude/OpenAI/Gemini)
    - Credential filtering by provider
    - Checkpoint and human-in-the-loop configuration
    - Test connection functionality

11. ✅ Build verification passed

**Phase 6 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 7: Multi-Agent Executor)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/multiAgentTypes.ts`):
   - `AgentRole` enum: researcher, analyst, writer, critic, coder, planner, coordinator
   - `ExecutionStrategy` enum: sequential, parallel, adaptive
   - `CommunicationMode` enum: broadcast, directed, hierarchical
   - `AgentTask`, `AgentMessage`, `AgentState` types
   - `MultiAgentConfig` for executor configuration
   - `AGENT_ROLE_DEFINITIONS` with prompts and capabilities

2. ✅ Created MultiAgentOrchestrator (`src/lib/server/cortex-flow/executors/MultiAgentOrchestrator.ts`):
   - Core orchestration logic for multi-agent coordination
   - Execution strategy implementations (sequential, parallel, adaptive)
   - Task decomposition and dependency management
   - Agent state tracking and inter-agent communication
   - Message passing between agents
   - Phase-based execution with SSE events

3. ✅ Created MultiAgentExecutor (`src/lib/server/cortex-flow/executors/MultiAgentExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - Uses MultiAgentOrchestrator for actual coordination
   - SSE event emission for real-time updates
   - `execute()`, `abort()`, `getCapabilities()` methods
   - Token and cost tracking across all agents

4. ✅ Created full settings panel (`src/lib/components/cortex-flow/settings/MultiAgentSettings.svelte`):
   - 3 tabs: Agent Roles, Execution, Capabilities
   - Agent role selection grid with toggles
   - Execution strategy selector (sequential/parallel/adaptive)
   - Max concurrent agents, iterations, timeout sliders
   - Credential and model selection
   - Test connection functionality

5. ✅ Updated exports and registration:
   - Added to `executors/index.ts`
   - Registered in `ExecutorFactory.ts`
   - Marked as 'available' in `frameworkTypes.ts`

6. ✅ Updated Cortex Flow branding:
   - Description updated to "Multi-Framework AI Execution Platform"
   - Updated in PlaygroundApp.svelte, TerminalOutput.svelte, seed-consolidated-privileges.cjs

7. ✅ Redesigned toolbar with hierarchical groups:
   - Outputs group (green) - generated files
   - Execution group (blue) - history, timeline, clear
   - Framework group (orange) - debug, settings
   - Visual dividers and hover labels

8. ✅ Build verification passed

**Phase 7 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 8: Debate Executor)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/debateTypes.ts`):
   - `DebateRole` enum: advocate, critic, judge
   - `DebatePhase` enum: setup, opening, critique, rebuttal, counter, synthesis, judgment, complete
   - `DebateStyle` enum: constructive, adversarial, balanced
   - `DebateRounds` type: 1, 2, or 3 rounds
   - `DebateArgument` and `CritiquePoint` for argument tracking
   - `DebateParticipantState` for agent state management
   - `DebateVerdict` with assessments and synthesis
   - `DebateConfig` and `DEFAULT_DEBATE_CONFIG`
   - `DEBATE_ROLE_DEFINITIONS` with prompts for each role
   - `DEBATE_MODEL_PRICING` for cost tracking

2. ✅ Created DebateExecutor (`src/lib/server/cortex-flow/executors/DebateExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - Multi-phase debate orchestration:
     - Setup phase: analyze topic and set context
     - Opening phase: Advocate presents position
     - Critique phase: Critic challenges arguments
     - Rebuttal phase: Advocate responds to critiques
     - Counter phase: Critic's final counterarguments
     - Synthesis phase: Judge reviews all arguments
     - Judgment phase: Final balanced verdict
   - Multi-provider support (Claude, OpenAI, Gemini)
   - SSE event streaming for real-time updates
   - Token and cost tracking

3. ✅ Created full settings panel (`src/lib/components/cortex-flow/settings/DebateSettings.svelte`):
   - 3 tabs: Participants, Debate Settings, Capabilities
   - Participant display with color-coded cards (Advocate/Critic/Judge)
   - Debate style selector (constructive, adversarial, balanced)
   - Round configuration (1-3 rounds)
   - Research capability toggles for Advocate/Critic
   - Credential and model selection
   - Test connection functionality

4. ✅ Updated exports and registration:
   - Added to `executors/index.ts`
   - Registered in `ExecutorFactory.ts` with latest models:
     - Claude 4.5 series (claude-opus-4-5-20251101, claude-sonnet-4-5-20251101)
     - GPT-5.2 series (gpt-5.2-instant, gpt-5.2-thinking, gpt-5.2-pro)
     - Gemini 3 series (gemini-3-pro-preview, gemini-3-flash-preview)
   - Marked as 'available' in `frameworkTypes.ts`

5. ✅ Build verification passed

**Phase 8 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 9: Intelligent Router)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/intelligentRouterTypes.ts`):
   - `TaskType` enum: research, coding, analysis, creative, reasoning, math, summarization, translation, general
   - `TaskComplexity` and `TaskUrgency` enums
   - `TaskRequirements` with capability detection
   - `FrameworkScore` for multi-factor scoring
   - `RoutingDecision` with hybrid pipeline support
   - `RoutingPreferences` for user-customizable routing
   - `HybridPipelineStage` for multi-framework chaining
   - `CostConstraint` for budget-aware routing
   - `TASK_TYPE_PATTERNS` with weighted keyword matching
   - `FRAMEWORK_TASK_STRENGTHS` for task-to-framework mapping
   - `MODEL_PRICING` for cost calculations

2. ✅ Created TaskAnalyzer (`src/lib/server/cortex-flow/routing/TaskAnalyzer.ts`):
   - Analyzes prompts to detect task requirements
   - Detects task type, complexity, urgency
   - Identifies required capabilities (tools, vision, code execution)
   - Uses weighted keyword/phrase pattern matching
   - Singleton `taskAnalyzer` export

3. ✅ Created FrameworkScorer (`src/lib/server/cortex-flow/routing/FrameworkScorer.ts`):
   - Multi-factor scoring system for framework selection
   - Factors: capabilityMatch, taskTypeMatch, complexityMatch, costEfficiency, qualityExpectation, speedFactor
   - Weighted scoring based on routing preferences
   - Returns sorted scores with reasoning
   - Singleton `frameworkScorer` export

4. ✅ Created IntelligentRouter (`src/lib/server/cortex-flow/routing/IntelligentRouter.ts`):
   - Main orchestrator combining TaskAnalyzer + FrameworkScorer
   - `route()` method returns complete routing decision
   - Supports hybrid pipeline recommendations for complex tasks
   - Configurable via `IntelligentRouterConfig`
   - Singleton `intelligentRouter` export

5. ✅ Created routing module index (`src/lib/server/cortex-flow/routing/index.ts`):
   - Clean exports for all routing components and types

6. ✅ Created AutoExecutor (`src/lib/server/cortex-flow/executors/AutoExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - Uses IntelligentRouter for framework selection
   - Delegates execution to selected framework
   - Supports hybrid pipeline execution (multi-framework chaining)
   - Forwards SSE events with routing context enrichment
   - Tracks aggregated stats across stages

7. ✅ Created full settings panel (`src/lib/components/cortex-flow/settings/AutoSettings.svelte`):
   - 3 tabs: Routing, Preferences, Capabilities
   - Quality vs Speed slider for routing balance
   - Confidence threshold configuration
   - Framework preference grid (prefer/neutral/avoid)
   - Hybrid pipeline toggle
   - Extended thinking, multi-agent, and debate preferences
   - Cost constraint settings (daily, monthly, per-task limits)
   - Shows all capabilities available via routing

8. ✅ Updated exports and registration:
   - Added AutoExecutor to `executors/index.ts`
   - Registered in `ExecutorFactory.ts` with separate `initializeAutoExecutor()` method
   - Marked as 'available' in `frameworkTypes.ts`

9. ✅ Build verification passed

**Phase 9 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 10: Cost Tracking)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/costTrackingTypes.ts`):
   - `CostEvent` for individual cost records
   - `CostSummary` with daily/weekly/monthly/total aggregations
   - `BudgetLimit` for spending constraints
   - `CostTrend`, `CostReport`, `CostInsight`, `CostRecommendation`
   - `CostEventSource` type for tracking origin

2. ✅ Created PricingRegistry (`src/lib/server/cortex-flow/cost/PricingRegistry.ts`):
   - Model pricing for Claude, OpenAI, Gemini
   - Per-token input/output costs
   - Thinking token costs for extended reasoning
   - `calculateCost()` and `getModelInfo()` methods

3. ✅ Created CostTracker (`src/lib/server/cortex-flow/cost/CostTracker.ts`):
   - Real-time cost event tracking
   - MongoDB persistence with indexes
   - SSE event emission for live updates
   - Cost summaries with period calculations

4. ✅ Created BudgetManager (`src/lib/server/cortex-flow/cost/BudgetManager.ts`):
   - Daily, weekly, monthly, per-execution limits
   - Warning thresholds and enforcement
   - `checkBudget()` returns status with remaining amount

5. ✅ Created CostAnalytics (`src/lib/server/cortex-flow/cost/CostAnalytics.ts`):
   - `analyzeTrend()` for period-over-period comparison
   - `generateReport()` for detailed breakdowns
   - `generateInsights()` for smart recommendations
   - Cost distribution by model and framework

6. ✅ Created API endpoints:
   - GET/POST `/api/cortex-flow/cost` - Cost summary
   - GET/POST/DELETE `/api/cortex-flow/cost/budget` - Budget management
   - GET `/api/cortex-flow/cost/analytics` - Trends and insights
   - GET `/api/cortex-flow/cost/pricing` - Model pricing info

7. ✅ Created CostDashboard (`src/lib/components/cortex-flow/CostDashboard.svelte`):
   - 3 tabs: Overview, Budgets, Insights
   - Cost summary cards with period toggles
   - Budget limit configuration and status
   - Trend analysis and recommendations

8. ✅ Build verification passed

**Phase 10 Status: COMPLETE** ✅

### January 22, 2026 (Continued - Phase 11: Pipeline Executor)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/pipelineTypes.ts`):
   - `StageRole` enum: research, analyze, plan, generate, review, refine, synthesize, execute, custom
   - `StageInputSource` enum: user, previous, specific, accumulated, parallel
   - `StageOutputHandling` enum: pass, accumulate, store, final, branch
   - `PipelineStage` with framework config, prompt templates, quality gates
   - `PipelineDefinition` with stages, execution mode, error strategy
   - `PipelineExecutionState` for tracking progress
   - `PipelineSSEEvent` for real-time updates
   - `DEFAULT_PIPELINE_CONFIG`

2. ✅ Created PipelineExecutor (`src/lib/server/cortex-flow/executors/PipelineExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - Sequential and parallel stage execution
   - Context accumulation between stages
   - Stage-specific framework configuration
   - Error handling with retry and fallback strategies
   - SSE events for stage progress

3. ✅ Created PipelinePresets (`src/lib/server/cortex-flow/executors/PipelinePresets.ts`):
   - `deep-research`: 4 stages (gather → analyze → verify → synthesize)
   - `code-review`: 5 stages (understand → security → quality → performance → report)
   - `content-creation`: 5 stages (research → outline → draft → review → polish)
   - `data-analysis`: 3 stages (explore → analyze → insights)
   - `problem-solving`: 4 stages (understand → options → debate → recommend)
   - `document-writing`: 5 stages (requirements → research → draft → review → finalize)

4. ✅ Created settings panel (`src/lib/components/cortex-flow/settings/PipelineSettings.svelte`):
   - 3 tabs: Presets, Stages, Settings
   - Preset selection grid with descriptions
   - Stage list with framework and role display
   - Global pipeline settings (output format, quality gates)
   - Cost controls and execution preferences

5. ✅ Updated exports and registration:
   - Added `hybrid` to `FrameworkId` in `frameworkTypes.ts`
   - Added PipelineExecutor to `executors/index.ts`
   - Registered in `ExecutorFactory.ts` with capabilities

6. ✅ Build verification passed

**Phase 11 Status: COMPLETE** ✅

### January 23, 2026 (Continued - Phase 12: Llama Executor)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/llamaTypes.ts`):
   - `LlamaProvider` enum: together, groq, fireworks, replicate, ollama, vllm, bedrock, azure
   - `LlamaModelFamily` type: llama-4, llama-3.3, llama-3.2, llama-3.1, code-llama, llama-guard
   - `LlamaModelDefinition` with context lengths, vision support, quantization info
   - `LLAMA_MODELS` comprehensive model catalog:
     - Llama 4: maverick-17b (128K), maverick-17b-128e (128K), scout-17b (128K)
     - Llama 3.3: 70B Instruct (128K context)
     - Llama 3.2: 90B Vision, 11B Vision, 3B, 1B
     - Code Llama: 70B Instruct, 34B Instruct
     - Llama Guard: Guard 3 11B Vision, Guard 3 8B
   - `LLAMA_PROVIDER_ENDPOINTS` with base URLs for all 8 providers
   - `LLAMA_PROVIDER_PRICING` per-model pricing for Together, Groq, Fireworks
   - `LlamaExecutorConfig` interface for settings

2. ✅ Created LlamaExecutor (`src/lib/server/cortex-flow/executors/LlamaExecutor.ts`):
   - Implements `IAgentExecutor` interface with full agent loop
   - Multi-provider architecture via OpenAI-compatible API pattern
   - Provider-specific endpoint configuration
   - Vision support for Llama 4 and 3.2 Vision models
   - Tool support: WebSearch, WebFetch, Read, Write, Edit, Bash, Glob, Grep
   - Function calling with JSON schema definitions
   - Streaming response handling with SSE events
   - Cost tracking with provider-specific pricing
   - Error handling with retry logic
   - `getCapabilities()` returns dynamic capabilities based on model selection

3. ✅ Created full settings panel (`src/lib/components/cortex-flow/settings/LlamaSettings.svelte`):
   - 3 tabs: Provider, Model, Capabilities
   - **Provider Tab**:
     - Provider selector with 8 options (Together, Groq, Fireworks, Replicate, Ollama, vLLM, Bedrock, Azure)
     - Provider-specific credential filtering
     - Endpoint URL display/override for self-hosted (Ollama, vLLM)
     - Test connection functionality
   - **Model Tab**:
     - Model family filter (All, Llama 4, Llama 3.3, Llama 3.2, Code Llama, Guard)
     - Model picker with context length and vision indicators
     - Temperature and max tokens sliders
     - Model-specific capability badges
   - **Capabilities Tab**:
     - Feature grid showing: streaming, tools, vision, code generation, safety
     - Provider availability matrix
     - Model recommendations by use case

4. ✅ Updated framework types (`src/lib/types/frameworkTypes.ts`):
   - Added 'llama' to `FrameworkId` union type
   - Added `LlamaFrameworkConfig` interface
   - Added Llama framework definition to `FRAMEWORK_DEFINITIONS`:
     - Status: 'available'
     - Description: "Open-source models via multiple providers"
     - Capabilities: streaming, tools, vision (model-dependent)
     - Icon and color theme

5. ✅ Updated exports and registration:
   - Added `LlamaExecutor` export to `executors/index.ts`
   - Added to `getExecutorRegistrations()` function
   - Registered in `ExecutorFactory.ts` with capabilities:
     - supportsStreaming: true
     - supportsTools: true
     - supportsVision: true (model-dependent)
     - maxContextLength: 128000
     - supportedModels: all Llama model IDs
   - Added `LlamaSettings` export to `settings/index.ts`
   - Added conditional routing in `CortexFlowSettingsModal.svelte`

6. ✅ Build verification passed

**Phase 12 Status: COMPLETE** ✅

**Key Llama Framework Capabilities:**
- **8 Provider Options**: Cloud (Together, Groq, Fireworks, Replicate, Bedrock, Azure) and Self-Hosted (Ollama, vLLM)
- **Llama 4 Family**: Latest models with 128K context, multimodal vision support
- **Code Llama**: Specialized for code generation (70B and 34B variants)
- **Llama Guard**: Safety models for content moderation
- **Cost Efficiency**: Open-source models with competitive or zero (self-hosted) pricing
- **OpenAI-Compatible**: Uses standard OpenAI SDK pattern for all providers

**When to Use Llama:**
- Self-hosted deployments requiring data privacy
- Cost-sensitive workloads (especially with Groq's free tier or local Ollama)
- Code generation tasks (Code Llama models)
- Content safety filtering (Llama Guard models)
- Open-source requirement for compliance
- Low-latency inference (Groq, local deployment)

---

### January 23, 2026 (Continued - Phase 13: Perplexity Executor)

**Completed:**
1. ✅ Created type definitions (`src/lib/types/perplexityTypes.ts`):
   - `PerplexityModel` type: sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, sonar-deep-research
   - `SearchRecency` type: hour, day, week, month, year, none
   - `PerplexityModelDefinition` with context lengths, reasoning support, search capabilities
   - `PERPLEXITY_MODELS` comprehensive model catalog:
     - sonar: Fast search-augmented (128K context)
     - sonar-pro: Enhanced search with more sources (200K context, images)
     - sonar-reasoning: Extended thinking for research (128K context)
     - sonar-reasoning-pro: Most capable reasoning (200K context)
     - sonar-deep-research: Autonomous multi-step research agent
   - `PERPLEXITY_PRICING` per-model pricing with search costs:
     - Input/output token costs
     - Per-1000-search request costs
   - `PerplexityCitation` interface for source tracking
   - `PerplexityExecutorConfig` interface with search options
   - `PERPLEXITY_API_ENDPOINT` constant
   - `DEFAULT_PERPLEXITY_CONFIG` with sensible defaults

2. ✅ Created PerplexityExecutor (`src/lib/server/cortex-flow/executors/PerplexityExecutor.ts`):
   - Implements `IAgentExecutor` interface
   - Uses OpenAI SDK with custom base URL (OpenAI-compatible API)
   - **Real-time web search** built into every response
   - **Automatic citation tracking**:
     - `processCitations()` extracts URLs, titles, snippets, domains
     - Emits citation events as `tool_end` SSE events
     - `getCitations()` returns collected citations
   - **Search recency filtering**: hour, day, week, month, year, none
   - **Domain filtering**: include/exclude specific domains
   - **Response options**: return_citations, return_images, return_related_questions
   - Streaming response handling
   - Cost calculation including search costs
   - `getCapabilities()` returns Perplexity-specific capabilities:
     - realTimeSearch: true
     - citations: true
     - searchRecencyFilter: true
     - domainFiltering: true

3. ✅ Created full settings panel (`src/lib/components/cortex-flow/settings/PerplexitySettings.svelte`):
   - 3 tabs: Model, Search, Capabilities
   - **Model Tab**:
     - Credential selector (perplexity provider filter)
     - Model picker with reasoning/search indicators
     - Context length and capability badges
     - Temperature and max tokens sliders
     - Test connection functionality
   - **Search Tab**:
     - Search recency filter dropdown (hour → none)
     - Domain filtering configuration:
       - Include domains (whitelist)
       - Exclude domains (blacklist)
       - Tag-based input for easy management
     - Response options toggles:
       - Return citations (default: on)
       - Return images (default: off)
       - Return related questions (default: off)
   - **Capabilities Tab**:
     - Feature grid showing unique Perplexity capabilities
     - Model comparison (sonar vs sonar-pro vs reasoning)
     - Use case recommendations

4. ✅ Updated framework types (`src/lib/types/frameworkTypes.ts`):
   - Added 'perplexity' to `FrameworkId` union type
   - Added `PerplexityFrameworkConfig` interface with:
     - modelId, credentialId
     - searchRecency, searchDomainFilter
     - returnCitations, returnImages, returnRelatedQuestions
   - Added Perplexity framework definition to `FRAMEWORK_DEFINITIONS`:
     - Status: 'available'
     - Description: "Search-native AI with real-time web grounding"
     - Capabilities: streaming, web search, citations

5. ✅ Updated exports and registration:
   - Added `PerplexityExecutor` export to `executors/index.ts`
   - Added to `getExecutorRegistrations()` function
   - Registered in `ExecutorFactory.ts` with capabilities:
     - supportsStreaming: true
     - supportsTools: false (uses built-in search instead)
     - supportsVision: true (sonar-pro models)
     - supportsWebSearch: true
     - maxContextLength: 200000
   - Added `PerplexitySettings` export to `settings/index.ts`
   - Added conditional routing in `CortexFlowSettingsModal.svelte`

6. ✅ Build verification passed

**Phase 13 Status: COMPLETE** ✅

**Key Perplexity Framework Capabilities:**
- **Real-Time Web Search**: Every response grounded in live internet data
- **Automatic Citations**: Sources with URLs, titles, snippets, domains
- **Search Recency**: Filter results by time (hour to year)
- **Domain Filtering**: Include/exclude specific websites
- **Reasoning Models**: Extended thinking for complex research tasks
- **Deep Research**: Autonomous multi-step research agent (sonar-deep-research)
- **No Tool Configuration**: Search is built-in, not a separate tool

**When to Use Perplexity:**
- Research requiring up-to-date information
- Fact-checking and verification tasks
- Reports needing source citations
- Current events and recent developments
- Academic research with sources
- Competitive analysis with web data
- News aggregation and summarization

**When NOT to Use Perplexity:**
- Creative writing (no web search needed)
- Code generation (use Claude, OpenAI, or Llama)
- Tasks requiring custom tools (Perplexity doesn't support external tools)
- Private data analysis (all queries involve web search)

---

### Phase 12: Llama Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/llamaTypes.ts` | Provider types, model definitions, pricing |
| Multi-provider support | ✅ Done | `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | Together, Groq, Fireworks, Replicate, Ollama, vLLM, Bedrock, Azure |
| Llama 4 family | ✅ Done | `src/lib/types/llamaTypes.ts` | Maverick 17B, Maverick 17B 128E, Scout 17B |
| Llama 3.3/3.2 family | ✅ Done | `src/lib/types/llamaTypes.ts` | 70B, 90B Vision, 11B Vision, 3B, 1B |
| Code Llama family | ✅ Done | `src/lib/types/llamaTypes.ts` | 70B, 34B for code generation |
| Llama Guard safety | ✅ Done | `src/lib/types/llamaTypes.ts` | Guard 3 11B Vision, Guard 3 8B |
| OpenAI-compatible API | ✅ Done | `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | Uses OpenAI SDK for API calls |
| Credential system | ✅ Done | `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | Uses `getLlmCredentialById()` |
| Tool support | ✅ Done | `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | WebSearch, WebFetch, Read, Write, Bash |
| Agent loop | ✅ Done | `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | Full agent loop with tool execution |
| Cost tracking | ✅ Done | `src/lib/types/llamaTypes.ts` | Per-provider pricing (Together, Groq, Fireworks) |
| Vision support | ✅ Done | `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` | For Llama 4 and 3.2 Vision models |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/LlamaSettings.svelte` | 3 tabs: Provider, Model, Capabilities |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Registered with full capabilities |
| Framework type | ✅ Done | `src/lib/types/frameworkTypes.ts` | Added 'llama' to FrameworkId |
| Executors index export | ✅ Done | `src/lib/server/cortex-flow/executors/index.ts` | Export LlamaExecutor |

**Phase 12 Status: COMPLETE** ✅

### Phase 13: Perplexity Executor ✅ COMPLETE

| Task | Status | File(s) | Notes |
|------|--------|---------|-------|
| Type definitions | ✅ Done | `src/lib/types/perplexityTypes.ts` | Model definitions, search config, pricing |
| Search-native models | ✅ Done | `src/lib/types/perplexityTypes.ts` | sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, sonar-deep-research |
| Citation tracking | ✅ Done | `src/lib/server/cortex-flow/executors/PerplexityExecutor.ts` | Automatic source extraction and URLs |
| Search recency filter | ✅ Done | `src/lib/types/perplexityTypes.ts` | hour, day, week, month, year, none |
| Domain filtering | ✅ Done | `src/lib/types/perplexityTypes.ts` | Include/exclude specific domains |
| OpenAI-compatible API | ✅ Done | `src/lib/server/cortex-flow/executors/PerplexityExecutor.ts` | Uses OpenAI SDK with custom base URL |
| Credential system | ✅ Done | `src/lib/server/cortex-flow/executors/PerplexityExecutor.ts` | Uses `getLlmCredentialById()` |
| Streaming support | ✅ Done | `src/lib/server/cortex-flow/executors/PerplexityExecutor.ts` | Real-time response streaming |
| Cost tracking | ✅ Done | `src/lib/types/perplexityTypes.ts` | Per-model pricing with search costs |
| Settings panel | ✅ Done | `src/lib/components/cortex-flow/settings/PerplexitySettings.svelte` | 3 tabs: Model, Search, Capabilities |
| ExecutorFactory registration | ✅ Done | `src/lib/server/cortex-flow/ExecutorFactory.ts` | Registered with full capabilities |
| Framework type | ✅ Done | `src/lib/types/frameworkTypes.ts` | Added 'perplexity' to FrameworkId |
| Executors index export | ✅ Done | `src/lib/server/cortex-flow/executors/index.ts` | Export PerplexityExecutor |

**Phase 13 Status: COMPLETE** ✅

---

## Model Updates (January 2026)

### OpenAI Models Updated
- Added GPT-5 family: `gpt-5`, `gpt-5-mini`, `gpt-5-turbo`
- Added GPT-4.1 family: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
- Added o3 reasoning series: `o3`, `o3-mini`
- Default changed from `gpt-4o` to `gpt-5`

### Gemini Models Updated
- Added Gemini 3 family: `gemini-3-ultra`, `gemini-3-pro`, `gemini-3-flash`
- Added Gemini 2.5 series: `gemini-2.5-pro`, `gemini-2.5-flash`
- Default changed from `gemini-2.0-flash` to `gemini-3-pro`
- Image generation check updated for Gemini 3.x models

### LangGraph Underlying Models Updated
- Claude: claude-opus-4-5, claude-sonnet-4-5
- OpenAI: gpt-5, gpt-5-mini, gpt-4.1, o3, o3-mini
- Gemini: gemini-3-ultra, gemini-3-pro, gemini-3-flash, gemini-2.5-pro

### Llama Models Added
- **Llama 4 Family**: maverick-17b, maverick-17b-128e, scout-17b
- **Llama 3.3**: 70B (latest general-purpose)
- **Llama 3.2**: 90B Vision, 11B Vision, 3B, 1B
- **Code Llama**: 70B, 34B (code-specialized)
- **Llama Guard**: Guard 3 11B Vision, Guard 3 8B (safety)
- **Providers**: Together, Groq, Fireworks, Replicate, Ollama, vLLM, Bedrock, Azure

### Perplexity Models Added
- **sonar**: Fast search-augmented model (128K context)
- **sonar-pro**: Enhanced search with more sources (200K context)
- **sonar-reasoning**: Extended thinking for complex research
- **sonar-reasoning-pro**: Most capable reasoning model
- **sonar-deep-research**: Multi-step autonomous research agent
- **Features**: Real-time web search, automatic citations, search recency filtering, domain filtering

---

**All 13 Phases Complete!**

The Cortex Flow Multi-Framework Implementation is now fully functional with:

### 10 Framework Executors

| Executor | Provider | Key Features | Status |
|----------|----------|--------------|--------|
| **Claude** | Anthropic | Extended thinking, vision, 200K context | ✅ Active |
| **OpenAI** | OpenAI | GPT-5, o3 reasoning, DALL-E 3, code interpreter | ✅ Active |
| **Gemini** | Google | 1M context, native image gen, video/audio analysis, Google grounding | ✅ Active |
| **Llama** | Meta (8 providers) | Llama 4, 3.3, Code Llama, Llama Guard; Together, Groq, Fireworks, Ollama, vLLM, Bedrock, Azure | ✅ Active |
| **Perplexity** | Perplexity AI | Search-native AI, real-time web grounding, automatic citations, domain filtering | ✅ Active |
| **LangGraph** | LangChain | Stateful workflows, MongoDB checkpoints, human-in-the-loop, underlying model selection | ✅ Active |
| **Multi-Agent** | Orchestrated | 7 role types, parallel/sequential/adaptive execution, inter-agent communication | ✅ Active |
| **Debate** | Adversarial | Advocate/Critic/Judge pattern, 1-3 rounds, constructive/adversarial/balanced styles | ✅ Active |
| **Auto** | Intelligent Router | Task analysis, capability matching, cost-aware routing, hybrid pipelines | ✅ Active |
| **Pipeline** | Multi-stage | 6 presets, stage chaining, context accumulation, quality gates | ✅ Active |

### Key Capabilities

- **Latest Model Support**: GPT-5, Gemini 3, Llama 4, Claude Opus 4.5, Perplexity Sonar
- **Intelligent Routing**: Task analysis + framework scoring for optimal selection
- **Cost Tracking**: Real-time tracking, budgets, analytics, recommendations
- **Pipeline Orchestration**: Multi-stage workflows with framework chaining
- **Human-in-the-Loop**: LangGraph interrupt(), review phases, user input integration
- **Multi-Provider Llama**: 8 deployment options from cloud to local

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | Node.js only | Single stack, simpler ops |
| Framework UI | Cover page + slide | Elegant discovery UX |
| Feature parity | Intentional gaps | Better to skip than implement poorly |
| Cost tracking | 3-layer system | L1 always, L2/L3 optional |
| Routing | Capability-based | Features drive selection |
| Credential handling | Database storage | Secure, shareable credentials |

---

## Testing Instructions

### Test OpenAI Executor
1. Start the application with MongoDB running
2. Go to Admin > Credentials
3. Add an OpenAI credential:
   - Provider: `openai`
   - API Key: Your OpenAI API key
   - Default Model: `gpt-4o-mini`
4. Go to Cortex Flow > Settings
5. Select OpenAI framework from the cover page
6. Select your credential
7. Click "Test Connection"
8. Submit a prompt to test execution

### Test Gemini Executor
1. Add a Gemini credential:
   - Provider: `gemini`
   - API Key: Your Google AI API key
   - Default Model: `gemini-1.5-flash`
2. Select Gemini framework in settings
3. Test connection and execute prompts

---

## Related Documents

- [Multi-Framework Feasibility Report](./MULTI_FRAMEWORK_FEASIBILITY_REPORT.md)
- [Cortex Flow Architecture](./CORTEX_FLOW_ARCHITECTURE.md)
- [Review Phase Plan](../plans/CORTEX_FLOW_REVIEW_PHASE.md)

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Completed |
| 🔄 In Progress | Currently working on |
| ⏳ Pending | Not started |
| ❌ Blocked | Waiting on dependency |
