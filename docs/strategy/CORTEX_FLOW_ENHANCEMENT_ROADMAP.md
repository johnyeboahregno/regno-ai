# Cortex Flow Enhancement Roadmap

## Overview

This document outlines four strategic enhancements to Cortex Flow based on comprehensive analysis of the AI orchestration landscape in 2026.

**Priority Order:**
1. MCP First-Class Integration (CRITICAL)
2. Langfuse Observability
3. GraphRAG with Cortex Brain
4. DSPy Prompt Optimization

---

## Three-Layer Architecture (Completed)

The cover page has been updated to reflect the three-layer architecture:

| Layer | Components | Purpose |
|-------|------------|---------|
| **Layer 1: Providers** | Claude, OpenAI, Gemini, Llama, Perplexity | Direct LLM access |
| **Layer 2: Orchestrators** | Multi-Agent, Debate, LangGraph | Multi-agent coordination (can use any provider) |
| **Layer 3: Routers** | Auto, Hybrid | Intelligent framework selection |

**Key Changes:**
- Orchestrators now support configurable underlying providers (not just Claude)
- Two-stage routing: decides execution mode, then selects optimal provider
- UI updated to show provider compatibility badges on orchestrator cards

---

## Enhancement 0: MCP First-Class Integration (CRITICAL)

### Why MCP is Critical

MCP (Model Context Protocol) has become the **de-facto standard** for AI tool integration:
- **10,000+ published MCP servers** covering everything from developer tools to Fortune 500 deployments
- **Adopted by**: Claude, ChatGPT, Gemini, VS Code, Microsoft Copilot, Cursor
- **December 2025**: Anthropic donated MCP to the Linux Foundation's [Agentic AI Foundation (AAIF)](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
- **Platinum members**: AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI

> "MCP will become as fundamental to AI development as containers are to cloud infrastructure"

### Current MCP Implementation (Already Have)

```
┌─────────────────────────────────────────────────────────────┐
│                  EXISTING MCP INFRASTRUCTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  src/lib/server/cortex-flow/McpServerManager.ts             │
│  ├── connectServer() - stdio/http/websocket                 │
│  ├── executeTool() - run MCP tools                          │
│  ├── getEnabledTools() - list available tools               │
│  └── getServerStatuses() - connection health                │
│                                                              │
│  src/lib/types/mcpServer.ts                                 │
│  ├── MCP_SERVER_DIRECTORY (10+ curated servers)             │
│  │   ├── filesystem - file operations                       │
│  │   ├── brave-search - web search                          │
│  │   ├── github - repo operations                           │
│  │   ├── puppeteer - browser automation                     │
│  │   ├── postgres - database queries                        │
│  │   ├── slack - messaging                                  │
│  │   ├── memory - persistent storage                        │
│  │   ├── fetch - HTTP requests                              │
│  │   ├── sequential-thinking - reasoning                    │
│  │   └── serena - semantic code analysis                    │
│  │                                                          │
│  └── Full type system (Tools, Resources, Prompts)           │
│                                                              │
│  UI Components                                               │
│  ├── McpServerPanel.svelte - server management              │
│  └── McpConfigSection.svelte - node configuration           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### What "First-Class Citizen" Means

```
┌─────────────────────────────────────────────────────────────┐
│              MCP AS FIRST-CLASS CITIZEN                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. UNIVERSAL TOOL PROVIDER                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Any executor can use any MCP tool automatically         ││
│  │                                                          ││
│  │ ClaudeExecutor ─────┐                                   ││
│  │ OpenAIExecutor ─────┼──► MCP Tool Registry ──► Tools    ││
│  │ GeminiExecutor ─────┤    (unified interface)            ││
│  │ Multi-AgentExec ────┘                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  2. CONTEXT PROVIDER (Resources)                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ MCP Resources inject context into prompts               ││
│  │                                                          ││
│  │ Before execution:                                        ││
│  │ ├── Fetch relevant MCP resources                        ││
│  │ ├── Include as system context                           ││
│  │ └── Available to all frameworks                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  3. PIPELINE STAGE INTEGRATION                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ MCP servers as pipeline nodes                           ││
│  │                                                          ││
│  │ [Research] ──► [MCP:GitHub] ──► [Analysis] ──► [Output] ││
│  │               (fetch repos)                              ││
│  │                                                          ││
│  │ [Input] ──► [MCP:Puppeteer] ──► [MCP:Claude] ──► [Out]  ││
│  │            (scrape page)        (analyze)               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  4. DYNAMIC TOOL DISCOVERY                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Auto-discover and connect to MCP servers                ││
│  │                                                          ││
│  │ ├── Scan for local MCP servers (stdio)                  ││
│  │ ├── Connect to remote registries (http)                 ││
│  │ ├── Import from claude_desktop_config.json              ││
│  │ └── Community server marketplace                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  5. AGENT-TO-AGENT VIA MCP                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Cortex Flow agents expose tools via MCP                 ││
│  │                                                          ││
│  │ External Agent ──► MCP ──► Cortex Flow Pipeline         ││
│  │                                                          ││
│  │ Cortex Flow can BE an MCP server for other systems      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 ENHANCED MCP ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  src/lib/server/mcp/                                        │
│  ├── McpRegistry.ts          # Central registry of servers  │
│  ├── McpToolProvider.ts      # Unified tool interface       │
│  ├── McpResourceProvider.ts  # Context injection            │
│  ├── McpPromptProvider.ts    # Prompt templates from MCP    │
│  ├── McpDiscovery.ts         # Auto-discovery service       │
│  ├── McpServerBridge.ts      # Expose Cortex as MCP server  │
│  └── index.ts                                               │
│                                                              │
│  Integration with Executors                                  │
│  ├── IAgentExecutor.ts       # Add getMcpTools() method     │
│  ├── BaseAgentExecutor.ts    # Default MCP integration      │
│  └── ToolRegistry.ts         # Merge MCP tools + built-in   │
│                                                              │
│  New Pipeline Nodes                                          │
│  ├── McpToolNode             # Execute any MCP tool         │
│  ├── McpResourceNode         # Fetch MCP resources          │
│  └── McpPromptNode           # Use MCP prompt templates     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### MCP Tool Registry (Unified Interface)

```typescript
// All tools available through single interface
interface McpToolRegistry {
  // Get all tools from all connected servers
  getAllTools(): McpToolDefinition[];

  // Get tools by capability
  getToolsByCapability(cap: 'search' | 'file' | 'database' | 'api'): McpToolDefinition[];

  // Execute tool (routes to correct server)
  executeTool(name: string, params: Record<string, any>): Promise<any>;

  // For LLM tool calling - returns OpenAI/Claude tool format
  getToolsForLLM(format: 'openai' | 'claude' | 'gemini'): any[];
}
```

### Auto-Discovery Configuration

```typescript
// mcp-config.json (project root or ~/.config/cortex-flow/)
{
  "discovery": {
    "enabled": true,
    "sources": [
      // Import from Claude Desktop
      { "type": "claude-desktop", "path": "~/.config/claude/claude_desktop_config.json" },

      // Local stdio servers
      { "type": "local", "patterns": ["./mcp-servers/*"] },

      // Remote registries
      { "type": "registry", "url": "https://mcp.anthropic.com/registry" },

      // Custom servers
      { "type": "custom", "servers": [
        { "name": "internal-api", "command": "node", "args": ["./internal-mcp-server.js"] }
      ]}
    ]
  },
  "defaults": {
    "timeout": 30000,
    "retryAttempts": 3
  }
}
```

### Cortex Flow AS an MCP Server

```typescript
// Expose Cortex Flow pipelines as MCP tools
// Other AI systems can call your pipelines!

// mcp-server.ts
const cortexMcpServer = new McpServerBridge({
  name: 'cortex-flow',
  description: 'AI pipeline execution',
  tools: [
    {
      name: 'execute_pipeline',
      description: 'Run a Cortex Flow pipeline',
      inputSchema: {
        type: 'object',
        properties: {
          pipelineId: { type: 'string' },
          input: { type: 'object' }
        }
      }
    },
    {
      name: 'query_knowledge',
      description: 'Query Cortex Brain knowledge base',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          useGraphRAG: { type: 'boolean' }
        }
      }
    }
  ]
});

// Now external agents can:
// - Claude Desktop can call Cortex Flow pipelines
// - Other MCP clients can use your knowledge base
// - Agent-to-agent communication standardized
```

### Security Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP SECURITY MODEL                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  KNOWN RISKS (April 2025 security research):                │
│  ├── Prompt injection via tool responses                    │
│  ├── Tool permission escalation (combining tools)           │
│  └── Lookalike tools (malicious tool impersonation)         │
│                                                              │
│  MITIGATIONS:                                                │
│  ├── Tool allowlisting (only approved servers)              │
│  ├── Sandboxed execution (containerized tool calls)         │
│  ├── Output sanitization (strip injection attempts)         │
│  ├── Rate limiting per server                               │
│  ├── Audit logging (all tool calls via Langfuse)           │
│  └── User approval for sensitive operations                 │
│                                                              │
│  GUARDIAN INTEGRATION:                                       │
│  ├── Guardian L1: Basic tool output validation              │
│  ├── Guardian L2: Semantic analysis of tool responses       │
│  └── Guardian L3: Deep reasoning about tool chain safety    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

| Phase | Task | Effort |
|-------|------|--------|
| **0.1** | Unified McpToolRegistry | 2 days |
| **0.2** | Executor integration (all tools available to all executors) | 3 days |
| **0.3** | Pipeline node types (McpToolNode, McpResourceNode) | 2 days |
| **0.4** | Auto-discovery service | 2 days |
| **0.5** | Cortex-as-MCP-server bridge | 3 days |
| **0.6** | Security hardening + Guardian integration | 2 days |

**Total: ~2 weeks**

### Success Metrics

| Metric | Target |
|--------|--------|
| MCP servers connectable | 50+ (community ecosystem) |
| Tool discovery latency | < 1s |
| Tool execution overhead | < 100ms |
| External MCP client connections | Support 10+ concurrent |

---

## Enhancement 1: Langfuse Observability Integration

### Why Langfuse?

- **Open-source** (MIT licensed) with 6M+ SDK installs/month
- **Full observability**: tracing, logging, prompt management, evaluation
- **LLM-as-judge evaluations** open-sourced in June 2025
- **Self-hostable** with generous free tier
- **Framework agnostic** - works with all our providers

### What to Track

```
┌─────────────────────────────────────────────────────────────┐
│                    Langfuse Observability                    │
├─────────────────────────────────────────────────────────────┤
│  Traces                                                      │
│  ├── Pipeline Execution (full trace)                        │
│  │   ├── Stage 1: Research (span)                           │
│  │   │   ├── LLM Call (generation)                          │
│  │   │   └── Tool Calls (spans)                             │
│  │   ├── Stage 2: Analysis (span)                           │
│  │   └── Stage 3: Generation (span)                         │
│  │                                                          │
│  Metrics                                                     │
│  ├── Token usage per provider                               │
│  ├── Latency per stage                                      │
│  ├── Cost per execution                                     │
│  ├── Error rates                                            │
│  └── Model performance comparisons                          │
│                                                              │
│  Evaluations                                                 │
│  ├── LLM-as-judge scoring                                   │
│  ├── User feedback correlation                              │
│  └── Prompt version A/B testing                             │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **CortexFlowExecutor** - Wrap execution with Langfuse trace
2. **All Executors** (Claude, OpenAI, Gemini, etc.) - Log generations
3. **Tool Calls** - Log as spans within generations
4. **Multi-Agent/Debate** - Nested traces for agent interactions
5. **Pipeline Stages** - Track stage transitions and intermediate outputs

### Implementation Plan

```typescript
// Example integration pattern
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// In executor
const trace = langfuse.trace({
  name: 'cortex-flow-execution',
  metadata: {
    frameworkId,
    pipelineId,
    userId
  }
});

const generation = trace.generation({
  name: 'claude-completion',
  model: 'claude-sonnet-4',
  input: messages,
  output: response,
  usage: { inputTokens, outputTokens }
});
```

### Files to Modify

- `src/lib/server/cortex-flow/IAgentExecutor.ts` - Add observability hooks
- `src/lib/server/cortex-flow/executors/*.ts` - Instrument all executors
- `src/lib/server/cortex-flow/ExecutorFactory.ts` - Initialize Langfuse
- `src/routes/api/cortex-flow/+server.ts` - Trace API calls
- New: `src/lib/server/observability/LangfuseClient.ts`

---

## Enhancement 2: DSPy-Powered Prompt Optimization ✅ COMPLETE

### Why DSPy?

- **Paradigm shift**: Prompts as learnable parameters
- **18% improvement** over hand-crafted prompts in experiments
- **Automatic optimization** based on evaluation metrics
- **Reduces prompt brittleness** across different LLM providers

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    DSPy Optimization Flow                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Define Signature (what you want)                        │
│     ┌─────────────────────────────────────┐                 │
│     │ Input: context, question            │                 │
│     │ Output: answer, confidence          │                 │
│     └─────────────────────────────────────┘                 │
│                                                              │
│  2. Create Module (how to do it)                            │
│     ┌─────────────────────────────────────┐                 │
│     │ ChainOfThought(signature)           │                 │
│     │ or ReAct(signature, tools)          │                 │
│     └─────────────────────────────────────┘                 │
│                                                              │
│  3. Compile with Optimizer                                  │
│     ┌─────────────────────────────────────┐                 │
│     │ optimizer = BootstrapFewShot(       │                 │
│     │   metric=answer_accuracy            │                 │
│     │ )                                   │                 │
│     │ optimized = optimizer.compile(      │                 │
│     │   module, trainset                  │                 │
│     │ )                                   │                 │
│     └─────────────────────────────────────┘                 │
│                                                              │
│  4. Use Optimized Module                                    │
│     - Automatically selected few-shot examples              │
│     - Optimized instructions                                │
│     - Works across different LLM providers                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Expert Nodes

```
┌─────────────────────────────────────────────────────────────┐
│                Expert Node + DSPy Integration                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Expert Configuration                                        │
│  ├── Domain: "Financial Analysis"                           │
│  ├── Base Prompt: "Analyze the following data..."           │
│  └── [New] DSPy Optimization: Enabled                       │
│                                                              │
│  Optimization Process                                        │
│  ├── 1. Collect successful executions (from Langfuse)       │
│  ├── 2. Extract input/output pairs as training data         │
│  ├── 3. Define evaluation metric (quality score)            │
│  ├── 4. Run DSPy optimizer                                  │
│  └── 5. Store optimized prompt in Cortex Patterns           │
│                                                              │
│  Runtime                                                     │
│  ├── Check for optimized prompt version                     │
│  ├── Use optimized prompt if available                      │
│  └── Fall back to base prompt if not                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation — COMPLETE

#### TypeScript Optimization Module (`src/lib/server/optimization/`)

| File | Purpose |
|------|---------|
| `DSPyClient.ts` | Native BootstrapFewShot + MIPRO optimizer (uses platform `callLLM`) |
| `PromptVersionManager.ts` | MongoDB-backed versioning, A/B testing, auto-promotion |
| `PromptOptimizer.ts` | Orchestrates full optimization cycle |
| `index.ts` | Public API barrel export |

No Python sidecar — runs entirely in-process using the platform's existing LLM infrastructure.

#### MongoDB Collections

- **`prompt_versions`** — Stores all prompt versions with metrics (successRate, usageCount, avgConfidence). Indexes: `{ patternId, isActive }`, `{ patternId, createdAt }`, `{ versionId }` (unique)
- **`prompt_ab_configs`** — A/B test configuration per pattern (trafficSplit, minSamples, improvementThreshold)

#### Executor Integration

| Component | Integration |
|-----------|-------------|
| **ExpertNodeRunner.ts** | Checks `getActivePrompt()` before LLM call, records usage on success/failure |
| **ExpertPatternExecutor.ts** | Records version usage in `recordWorkflowSuccess()` and `recordWorkflowFailure()` |
| **CortexFlowExecutor.ts** | Checks for optimized prompt after `composeSystemPrompt()` |
| **OpenAIExecutor.ts** | Wraps `OPENAI_SYSTEM_PROMPT` with version manager lookup |
| **LlamaExecutor.ts** | Wraps system prompt with version manager lookup |
| **MultiAgentOrchestrator.ts** | Checks per-role optimized prompt before each agent LLM call |
| **GeminiExecutor.ts** | Optimization applied via CortexFlowExecutor wrapper (sync method) |

All integrations use dynamic `import()` with try/catch — the optimization module is fully optional.

#### API + UI

- **`/api/optimization`** — GET status/health, POST optimize/promote/setABTest/history
- **`AdminOptimizationTab.svelte`** — Dashboard with optimizer status, version history, optimization form, A/B controls, score metrics
- **`AdminPanelConfig.ts`** — "Optimization" tab added (requires `admin.optimization` or `monitoring.metrics`)

No Docker changes needed — runs in the existing SvelteKit process.

#### A/B Testing Flow

1. Run optimization via Admin UI or API
2. Baseline + optimized versions created and activated
3. `getActivePrompt()` randomly selects based on `trafficSplit`
4. Each execution records success/failure via `recordUsage()`
5. After `minSamples`, `checkAutoPromotion()` evaluates improvement
6. Auto-promotes if `improvementThreshold` exceeded; disables A/B test

See also: `doc/architecture/DSPY_PROMPT_OPTIMIZATION.md` for detailed architecture documentation.

---

## Enhancement 3: GraphRAG with Cortex Brain

### Current Cortex Brain Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CORTEX BRAIN                            │
│                   (Tri-Database System)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   MongoDB   │  │   Qdrant    │  │   Neo4j     │          │
│  │             │  │             │  │             │          │
│  │ - Documents │  │ - Vectors   │  │ - Knowledge │          │
│  │ - Metadata  │  │ - Embeddings│  │   Graph     │          │
│  │ - Patterns  │  │ - Semantic  │  │ - Entities  │          │
│  │ - Config    │  │   Search    │  │ - Relations │          │
│  │             │  │             │  │             │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                   Current Usage:                             │
│                   - Separate queries                         │
│                   - No unified retrieval                     │
│                   - Limited graph traversal                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Proposed GraphRAG Enhancement

```
┌─────────────────────────────────────────────────────────────┐
│                   ENHANCED CORTEX BRAIN                      │
│                      with GraphRAG                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query: "What are the risks of our battery supplier?"        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  HYBRID RETRIEVAL                        ││
│  │                                                          ││
│  │  Step 1: Vector Search (Qdrant)                         ││
│  │  ┌─────────────────────────────────────────────────┐    ││
│  │  │ Find semantically similar documents             │    ││
│  │  │ → "Battery supplier contract", "Risk report"    │    ││
│  │  └─────────────────────────────────────────────────┘    ││
│  │                         │                                ││
│  │                         ▼                                ││
│  │  Step 2: Entity Extraction                               ││
│  │  ┌─────────────────────────────────────────────────┐    ││
│  │  │ Extract entities: "Sungrow", "Battery", "Risk"  │    ││
│  │  └─────────────────────────────────────────────────┘    ││
│  │                         │                                ││
│  │                         ▼                                ││
│  │  Step 3: Graph Traversal (Neo4j)                        ││
│  │  ┌─────────────────────────────────────────────────┐    ││
│  │  │ MATCH (s:Supplier {name: "Sungrow"})            │    ││
│  │  │ -[:SUPPLIES]->(p:Product)                       │    ││
│  │  │ -[:HAS_RISK]->(r:Risk)                          │    ││
│  │  │ RETURN s, p, r, relationships                   │    ││
│  │  │                                                 │    ││
│  │  │ Discovered:                                     │    ││
│  │  │ - Sungrow → supplies → Battery System          │    ││
│  │  │ - Battery System → has_risk → Supply Chain     │    ││
│  │  │ - Sungrow → located_in → China                 │    ││
│  │  │ - China → has_risk → Tariff Uncertainty        │    ││
│  │  └─────────────────────────────────────────────────┘    ││
│  │                         │                                ││
│  │                         ▼                                ││
│  │  Step 4: Context Assembly                                ││
│  │  ┌─────────────────────────────────────────────────┐    ││
│  │  │ Combine:                                        │    ││
│  │  │ - Vector search results (semantic context)     │    ││
│  │  │ - Graph relationships (structural context)     │    ││
│  │  │ - Entity metadata from MongoDB                 │    ││
│  │  └─────────────────────────────────────────────────┘    ││
│  │                         │                                ││
│  │                         ▼                                ││
│  │  Step 5: LLM Generation                                  ││
│  │  ┌─────────────────────────────────────────────────┐    ││
│  │  │ Enhanced context enables reasoning about:       │    ││
│  │  │ - Direct risks (from documents)                │    ││
│  │  │ - Indirect risks (from graph relationships)    │    ││
│  │  │ - Hidden connections (multi-hop traversal)     │    ││
│  │  └─────────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### GraphRAG Query Patterns

```cypher
// Pattern 1: Entity-centric retrieval
MATCH (e:Entity {name: $entity})
OPTIONAL MATCH (e)-[r*1..3]-(related)
RETURN e, collect(distinct related) as context,
       collect(distinct type(r)) as relationships

// Pattern 2: Concept expansion
MATCH (c:Concept {name: $concept})
CALL {
  WITH c
  MATCH (c)-[:RELATED_TO|:IS_A|:PART_OF*1..2]-(related:Concept)
  RETURN related
}
RETURN c, collect(related) as expanded_concepts

// Pattern 3: Document-Entity linking
MATCH (d:Document)-[:MENTIONS]->(e:Entity)
WHERE d.id IN $vector_search_results
MATCH (e)-[r]-(connected)
RETURN d, e, connected, type(r) as relationship
```

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  GraphRAG Service Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  src/lib/server/cortex-brain/                               │
│  ├── GraphRAGRetriever.ts      # Main retrieval orchestrator│
│  ├── HybridSearchEngine.ts     # Combines vector + graph    │
│  ├── EntityExtractor.ts        # Extract entities from query│
│  ├── GraphTraverser.ts         # Neo4j query builder        │
│  ├── ContextAssembler.ts       # Merge results              │
│  └── index.ts                                               │
│                                                              │
│  Integration Points:                                         │
│  ├── KnowledgeSourceNode       # Use GraphRAG for retrieval │
│  ├── ExpertNode                # Enhanced context injection │
│  ├── ResearchAgent             # Multi-hop reasoning        │
│  └── CortexFlowExecutor        # Automatic context fetching │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Knowledge Graph Schema (Neo4j)

```
┌─────────────────────────────────────────────────────────────┐
│                   Neo4j Graph Schema                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Node Types:                                                 │
│  ├── (:Document {id, title, source, created_at})            │
│  ├── (:Entity {name, type, description})                    │
│  ├── (:Concept {name, domain, definition})                  │
│  ├── (:Pattern {id, category, content})    # Cortex Pattern │
│  └── (:Chunk {id, text, embedding_id})     # Links to Qdrant│
│                                                              │
│  Relationship Types:                                         │
│  ├── [:MENTIONS]       Document → Entity                    │
│  ├── [:CONTAINS]       Document → Chunk                     │
│  ├── [:RELATED_TO]     Entity ↔ Entity                      │
│  ├── [:IS_A]           Entity → Concept                     │
│  ├── [:PART_OF]        Entity → Entity                      │
│  ├── [:CAUSES]         Entity → Entity (for causal chains)  │
│  ├── [:DEPENDS_ON]     Entity → Entity                      │
│  └── [:IMPLEMENTS]     Pattern → Concept                    │
│                                                              │
│  Indexes:                                                    │
│  ├── Entity.name (fulltext)                                 │
│  ├── Concept.name (fulltext)                                │
│  └── Document.id (unique)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Ingestion Pipeline Enhancement

```
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Knowledge Ingestion                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Flow:                                               │
│  Document → Chunk → Embed → Store in Qdrant                 │
│                                                              │
│  Enhanced Flow:                                              │
│  Document                                                    │
│     │                                                        │
│     ├──► Chunk → Embed → Qdrant (vectors)                   │
│     │                                                        │
│     ├──► Entity Extraction (LLM) → Neo4j (nodes)            │
│     │    └── Extract: people, orgs, products, concepts      │
│     │                                                        │
│     ├──► Relationship Extraction (LLM) → Neo4j (edges)      │
│     │    └── Extract: causes, relates_to, depends_on        │
│     │                                                        │
│     └──► Metadata → MongoDB (documents)                     │
│                                                              │
│  Entity Extraction Prompt:                                   │
│  "Extract all named entities from this text. For each:      │
│   - Name, Type (person/org/product/concept/location)        │
│   - Relationships to other entities mentioned               │
│   - Confidence score"                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Phase | Enhancement | Effort | Impact |
|-------|-------------|--------|--------|
| **Phase 0** | MCP First-Class | 2 weeks | CRITICAL - Industry standard |
| **Phase 1** | Langfuse Integration | 2 weeks | High - Production visibility |
| **Phase 2** | GraphRAG Retrieval | 3 weeks | High - Better reasoning |
| **Phase 3** | DSPy Optimization | 2 weeks | Medium - Quality improvement |

### Phase 0: MCP First-Class (Week 1-2)
- Unified McpToolRegistry
- Executor integration (all tools to all executors)
- Pipeline node types (McpToolNode, McpResourceNode)
- Auto-discovery service
- Cortex-as-MCP-server bridge
- Security + Guardian integration

### Phase 1: Langfuse (Week 3-4)
- Install Langfuse SDK
- Instrument executors with tracing
- Set up dashboards for cost/latency/errors
- Add LLM-as-judge evaluations

### Phase 2: GraphRAG (Week 5-7)
- Enhance ingestion pipeline with entity extraction
- Build GraphRAGRetriever service
- Integrate with KnowledgeSourceNode
- Add graph visualization in UI

**Completion Log (Phase 2):**
- ✅ **EntityRelationshipExtractor** (`src/lib/server/cortex-brain/EntityRelationshipExtractor.ts`) - LLM-based entity/relationship extraction with chunking, deduplication, confidence scoring
- ✅ **KnowledgeGraphService** (`src/lib/server/cortex-brain/KnowledgeGraphService.ts`) - Neo4j CRUD for Entity/Document/Concept nodes, fulltext search, path finding, graph expansion
- ✅ **GraphRAGRetriever** (`src/lib/server/cortex-brain/GraphRAGRetriever.ts`) - Hybrid retrieval combining vector search + graph traversal with configurable weights
- ✅ **KnowledgeStagingService integration** - Auto-extracts entities/relationships on document promotion and stores in Neo4j knowledge graph
- ✅ **CortexBrain integration** - `intelligentSearch()` now includes GraphRAG hybrid retrieval as Step 2.5
- ✅ **KnowledgeSourceNode integration** - `useGraphRAG` config option in KnowledgeSourceExecutor with augmentation pattern; UI config panel in KnowledgeSourceConfigSection.svelte
- ✅ **Graph visualization in UI** - KnowledgeGraphViewer.svelte (D3 force-directed graph), KnowledgeGraphPanel.svelte (search/stats wrapper), API endpoint at `/api/cortex/knowledge-graph`

**Phase 2: GraphRAG - COMPLETE**

### Phase 3: DSPy (Week 8-9)
- ✅ Native TypeScript optimizer (`src/lib/server/optimization/DSPyClient.ts`)
- ✅ Build prompt versioning (`prompt_versions` MongoDB collection)
- ✅ Implement optimization pipeline (BootstrapFewShot + MIPRO-style)
- ✅ A/B testing infrastructure with auto-promotion
- ✅ Expert Node integration (ExpertNodeRunner + ExpertPatternExecutor)
- ✅ Cortex Flow integration (CortexFlowExecutor, OpenAI, Llama, MultiAgent)
- ✅ Admin UI tab (AdminOptimizationTab.svelte)
- ✅ API endpoints (`/api/optimization`)

**Note:** Implemented as pure TypeScript using the platform's `callLLM` infrastructure instead of a Python DSPy sidecar. No external service or Docker dependency.

**Phase 3: Prompt Optimization - COMPLETE**

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| **MCP** | | |
| MCP servers connectable | 10 | 50+ (community ecosystem) |
| Tool discovery latency | N/A | < 1s |
| External MCP clients supported | 0 | 10+ concurrent |
| **Observability** | | |
| Mean latency visibility | None | Full tracing |
| Cost attribution | Partial | 100% per-execution |
| **GraphRAG** | | |
| Retrieval accuracy | TBD | +25% |
| Multi-hop reasoning success | TBD | +40% |
| **DSPy** | | |
| Prompt optimization lift | 0% | +15% |

---

## References

### MCP (Model Context Protocol)
- [MCP Official Site](https://modelcontextprotocol.io/)
- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol)
- [Agentic AI Foundation (AAIF)](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
- [MCP Security Considerations](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [Building AI Agents with MCP - Red Hat](https://developers.redhat.com/articles/2026/01/08/building-effective-ai-agents-mcp)

### Observability
- [Langfuse Documentation](https://langfuse.com/docs)
- [Arize Phoenix](https://phoenix.arize.com/)

### GraphRAG
- [Neo4j GraphRAG](https://neo4j.com/blog/genai/advanced-rag-techniques/)
- [LlamaIndex + Neo4j Integration](https://neo4j.com/labs/genai-ecosystem/llamaindex/)

### DSPy
- [DSPy GitHub](https://github.com/stanfordnlp/dspy)

---

*Document created: 2026-01-28*
*Last Updated: 2026-01-28*
*Status: **All Phases Complete** - MCP, Langfuse, GraphRAG, and DSPy implemented*

---

## Implementation Progress Log

### 2026-01-28 - Phase 0.1 Started

**Discovery:**
- MCP infrastructure is ~80% complete
- McpServerManager handles stdio/HTTP connections properly
- ToolRegistry has `loadMcpTools()` method that's never called
- **Critical gap:** Executors never initialize MCP tools

**Key Finding:** The 5-step integration is straightforward:
1. Initialize McpServerManager in executor
2. Connect enabled servers from settings
3. Load tools via ToolRegistry.loadMcpTools()
4. Register tools in executor's tool map
5. Include MCP tool definitions in LLM API calls

**Files identified for modification:**
- `src/lib/server/cortex-flow/CortexFlowExecutor.ts` - Main integration point
- `src/lib/server/cortex-flow/executors/BaseAgentExecutor.ts` - For all executors

**Starting implementation:** Creating unified McpRegistry service...

---

### 2026-01-28 - Phase 0.1 Complete ✅

**Created Files:**
- `src/lib/server/mcp/McpRegistry.ts` - Unified MCP tool provider
- `src/lib/server/mcp/index.ts` - Module exports

**McpRegistry Features:**
- Server connection management (connect/disconnect/status)
- Unified tool access via `getAllTools()`, `getToolsByCapability()`
- Multi-LLM format support: `getToolsForClaude()`, `getToolsForOpenAI()`, `getToolsForGemini()`
- Tool execution via `executeTool()`
- Stats and health check methods
- Future-proofed for Resources and Prompts (Phase 0.3)

**Updated BaseAgentExecutor with MCP support:**
- Added `mcpRegistry` property to all executors
- `initializeMcpTools(settings)` - Initialize MCP from settings
- `getMcpToolsForLLM(format)` - Get tools in LLM-specific format
- `executeMcpTool(name, params)` - Execute MCP tools
- `isMcpTool(name)` - Check if tool is MCP
- `getMcpStats()` - Get registry statistics

**CortexFlowSettings already has:**
```typescript
mcpServers?: Array<{
  serverId: string;
  enabled: boolean;
  enabledTools: string[];
  authCredentials?: Record<string, string>;
  customEnv?: Record<string, string>;
  timeout?: number;
}>;
```

**Next:** Phase 0.2 - Integrate into ClaudeExecutor to enable MCP tools in API calls

---

### 2026-01-28 - Phase 0.2 Complete ✅

**Integrated MCP into CortexFlowExecutor:**

Modified `src/lib/server/cortex-flow/CortexFlowExecutor.ts`:
1. Added import for `getMcpRegistry`
2. Added `mcpRegistry` and `mcpToolsLoaded` properties
3. Added `initializeMcpTools(settings)` method that:
   - Reads MCP server configs from settings.mcpServers
   - Initializes the McpRegistry with server configs
   - Registers all MCP tools in the executor's tools map
4. Added `getMcpToolDefinitions()` method for Claude API format
5. Updated `runAgentLoop()` to:
   - Call `initializeMcpTools()` at start
   - Merge MCP tools with core tools for API calls

**How MCP tools flow through the system:**
```
Settings → mcpServers[] → McpRegistry.initialize()
                            ↓
                    Connect to MCP servers (stdio/http)
                            ↓
                    Load tool definitions
                            ↓
                    Register in executor's tools map
                            ↓
                    Include in Claude API tools array
                            ↓
                    Claude can request MCP tools
                            ↓
                    executeTool() handles MCP tools via tools.get()
```

**Also Updated `src/lib/server/cortex-flow/IAgentExecutor.ts`:**
- Added `mcpRegistry` property to BaseAgentExecutor
- Added `initializeMcpTools()`, `getMcpToolsForLLM()`, `executeMcpTool()`, `isMcpTool()`, `getMcpStats()`
- All executors that extend BaseAgentExecutor now have MCP support built-in

**TypeScript: ✅ No errors in MCP-related files**

**Next:** Phase 0.3 - Pipeline node types (McpToolNode, McpResourceNode)

---

### 2026-01-28 - Phase 0.3 Complete ✅

**Created Pipeline Node Types for MCP:**

**1. Node Metadata (NodeMetadataRegistry.ts):**
- Added `mcp-tool` node definition with wrench icon, violet color, AI/tool category
- Added `mcp-resource` node definition with database icon, indigo color, source/AI category

**2. Executors:**
- `McpToolExecutor.ts` - Execute MCP tools as pipeline stages
  - Server connection management (auto-connect if needed)
  - Parameter building from config or input data
  - Parameter mapping support (map input fields to tool params)
  - Timeout handling
  - Debug data tracking

- `McpResourceExecutor.ts` - Fetch MCP resources for context
  - Resource URI from config or dynamic from input
  - Template interpolation (${field.path} syntax)
  - Caching with configurable TTL
  - Output format options (raw, json, text)

**3. Registered in ExecutorRegistry.ts:**
```typescript
this.executors.set('mcp-tool', new McpToolExecutor());
this.executors.set('mcp-resource', new McpResourceExecutor());
```

**4. Modal Configurations:**
- `McpToolModalConfig.ts` - Modal config for MCP Tool node
- `McpResourceModalConfig.ts` - Modal config for MCP Resource node
- Registered in `ModalConfigFactory.ts`

**5. UI Config Sections:**
- `McpToolConfigSection.svelte` - UI for configuring MCP tool execution
  - Server dropdown (from connected servers)
  - Tool dropdown (from selected server)
  - Dynamic parameter form based on tool schema
  - Input data mapping configuration
  - Timeout setting

- `McpResourceConfigSection.svelte` - UI for configuring MCP resource fetching
  - Server dropdown
  - Resource dropdown (from selected server)
  - Manual URI input
  - Dynamic URI template support
  - Output format selection
  - Cache TTL configuration

**6. API Endpoints:**
- `GET /api/mcp/servers` - List configured MCP servers
- `GET /api/mcp/servers/[serverId]/tools` - List tools from a server
- `GET /api/mcp/servers/[serverId]/resources` - List resources from a server

**7. McpRegistry Enhancements:**
- Added `getConnectedServers()` for API responses
- Added `listResources(serverId)` for server-specific resources
- Enhanced `getAllTools()` to include serverId for filtering
- Updated `readResource()` implementation

**8. McpServerManager Enhancements:**
- Added `listResources(serverId)` method
- Added `readResource(uri)` method

**Visual Pipeline Example:**
```
[Data Source] ──► [MCP:GitHub] ──► [Expert Analysis] ──► [Output]
                 (fetch repos)

[Input] ──► [MCP:Puppeteer] ──► [MCP:Brave Search] ──► [Synthesis]
           (scrape page)        (enrich data)
```

### 2026-01-28 - Phase 0.2b Complete ✅

**Multi-Framework MCP Integration**

Extended MCP tool support beyond ClaudeExecutor to all other frameworks:

**Files Modified:**
1. `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts`
   - Added `loadMcpTools()` method
   - Updated `executeToolCall()` to route MCP tools to registry

2. `src/lib/server/cortex-flow/executors/GeminiExecutor.ts`
   - Added `loadMcpTools()` method with Gemini format support
   - Updated `executeToolCall()` to handle MCP tools

3. `src/lib/server/cortex-flow/executors/LlamaExecutor.ts`
   - Added `loadMcpTools()` with execute functions for OpenAI-compatible API
   - MCP tools automatically available for tool-supporting Llama models

4. `src/lib/server/cortex-flow/executors/MultiAgentOrchestrator.ts`
   - Updated `getToolsForAgent()` to include MCP tools in Claude format
   - Updated `executeToolCall()` to route MCP tool calls

5. `src/lib/server/cortex-flow/executors/LangGraphToolAdapter.ts`
   - Added MCP tool conversion to LangChain `DynamicStructuredTool` format
   - MCP tools now available in LangGraph workflows

**Framework Support Matrix:**

| Framework | MCP Support | Format Used | Notes |
|-----------|-------------|-------------|-------|
| Claude | ✅ Full | Claude native | Via CortexFlowExecutor (Phase 0.2) |
| OpenAI | ✅ Full | ChatCompletionTool | Function calling format |
| Gemini | ✅ Full | FunctionDeclaration | Google AI format |
| Llama | ✅ Full | OpenAI-compatible | Via Together/Groq/etc |
| Multi-Agent | ✅ Full | Claude native | Agents can use MCP tools |
| LangGraph | ✅ Full | DynamicStructuredTool | Via LangChain adapter |
| Debate | ⏭️ Skip | N/A | Structured debate, not tool-using |
| Perplexity | ⏭️ Skip | N/A | No tool support (built-in search) |

**Key Design Decisions:**
- Each executor initializes MCP tools in its native format
- Tool routing uses `mcp:` prefix in tool name mapping
- Failed MCP server connections are logged but don't block execution
- Consistent error handling across all frameworks

**Next:** Phase 0.4 - Auto-discovery service

---

### 2026-01-28 - Phase 0.4 Complete ✅

**Created MCP Auto-Discovery Service**

**File:** `src/lib/server/mcp/McpDiscoveryService.ts` (695 lines)

**Features:**
- Multi-source discovery:
  - **Claude Desktop**: Reads `claude_desktop_config.json` (cross-platform paths)
  - **Local**: Scans `~/.mcp`, `~/.local/share/mcp`, project directories
  - **Registry**: Fetches from remote registry URLs
  - **Custom**: User-defined server configurations
  - **Builtin**: Pre-configured servers from `MCP_SERVER_DIRECTORY`

- Cross-platform support:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
  - Linux: `~/.config/claude/claude_desktop_config.json`

- Server categorization: file-system, database, web, cloud, ai, communication, development, custom
- Wildcard pattern matching for server IDs
- Automatic `alreadyConfigured` detection
- `discoverAndMerge()` for startup integration

**API:**
```typescript
const discovery = getMcpDiscoveryService();
const result = await discovery.discover();
await discovery.addServer('claude-filesystem');
```

**Configuration:** `mcp-config.json` in project root or `~/.config/cortex-flow/`

---

### 2026-01-28 - Phase 0.5 Complete ✅

**Created Cortex-as-MCP-Server Bridge**

**File:** `src/lib/server/mcp/McpServerBridge.ts` (823 lines)

**Exposes Cortex Flow pipelines as an MCP server for external agents (Claude Desktop, etc.)**

**Protocol Support:**
- **stdio mode**: For Claude Desktop integration
- **HTTP mode**: For remote access with optional auth token

**MCP Tools Exposed:**
| Tool | Description |
|------|-------------|
| `execute_pipeline` | Run a Cortex Flow pipeline by ID |
| `list_pipelines` | List available pipelines |
| `query_knowledge` | Query Cortex Brain knowledge base |
| `get_execution_status` | Check pipeline execution status |

**JSON-RPC 2.0 Methods:**
- `initialize` - Server handshake with capabilities
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List resources (future)
- `shutdown` - Stop the server

**API:**
```typescript
const bridge = getMcpServerBridge({
  mode: 'http',
  port: 3100,
  authToken: 'secret-token'
});
await bridge.start();
```

**CLI Entry Point:** `src/lib/server/mcp/startMcpServer.ts`

---

### 2026-01-28 - Phase 0.6 Complete ✅

**Created MCP Security Hardening**

**Files:**
- `src/lib/server/mcp/McpSecurityManager.ts` (780 lines)
- `src/lib/server/mcp/McpGuardian.ts` (825 lines)

**McpSecurityManager Features:**

| Feature | Description |
|---------|-------------|
| **Allowlisting** | Server and tool allowlists with wildcard support (`*`, `read_*`, `github-*`) |
| **Rate Limiting** | Global (60/min) and per-server (30/min) limits |
| **Sanitization** | Input parameter sanitization (path traversal, null bytes) |
| **Output Sanitization** | Injection pattern detection and removal |
| **Audit Logging** | Comprehensive logging with filtering and statistics |

**Injection Detection Patterns:**
- `[SYSTEM]`, `[INST]`, `<|system|>` - Direct instruction injection
- `ignore previous instructions` - Role manipulation
- `base64:` long encoded data - Encoded payloads
- `../../etc/passwd` - Path traversal
- `$(command)` - Shell injection

**McpGuardian Multi-Level Validation:**

| Level | Name | Description |
|-------|------|-------------|
| **L1** | Basic | Size limits, format checks, structural validation |
| **L2** | Semantic | Pattern detection for injection, exfiltration, escalation |
| **L3** | Deep | Tool chain analysis, lookalike detection, approval workflow |

**Risk Categories with Weights:**
- `instructionInjection`: 30
- `roleManipulation`: 25
- `dataExfiltration`: 35
- `privilegeEscalation`: 40
- `toolChainManipulation`: 30
- `sensitiveData`: 20

**Dangerous Tool Chain Detection:**
- `read_file → send_email` (data exfiltration)
- `list_directory → read_file → http_request` (data theft)
- `execute_command × 3` (script execution)

**API:**
```typescript
const security = getMcpSecurityManager();
const result = await security.preExecutionCheck(serverId, toolName, params, { userId });

const guardian = getMcpGuardian({ defaultLevel: 'L2' });
const validation = await guardian.validate(output, { serverId, toolName, level: 'L2' });
```

---

### 2026-01-28 - Phase 1 Complete ✅

**Langfuse Observability Integration**

**Files Created:**
- `src/lib/server/observability/LangfuseClient.ts` - Core Langfuse client wrapper
- `src/lib/server/observability/ObservabilityHooks.ts` - Executor event interface
- `src/lib/server/observability/index.ts` - Module exports

**Executors Instrumented:**

| Executor | Tracked Events |
|----------|----------------|
| **CortexFlowExecutor** | Execution start/end, LLM generations, tool calls, phase changes |
| **DebateExecutor** | Claude/OpenAI/Gemini API calls, debate phases, token usage |
| **MultiAgentExecutor** | Agent generations, orchestrator tool calls, execution stats |

**Hook Events Interface:**
```typescript
interface ExecutorObservabilityHooks {
  onExecutionStart(data: ExecutionStartData): void;
  onGeneration(data: GenerationData): void;
  onToolStart(toolName: string, params: any): void;
  onToolEnd(toolName: string, result: any, success: boolean, duration: number): void;
  onPhaseChange(phase: string, detail?: string): void;
  onExecutionEnd(data: ExecutionEndData): void;
  onEvent(name: string, data: any): void;
  onEvaluation(data: EvaluationData): void;
}
```

**Integration Points in CortexFlowExecutor:**
- Line 1273: Property declaration
- Line 1969: Hooks initialization with trace metadata
- Line 1981: `onExecutionStart` trace begin
- Line 2682: `onExecutionEnd` success path
- Line 2783: `onExecutionEnd` failure path
- Line 3229: `onGeneration` after LLM streaming
- Line 3852/3859/3872: `onToolStart`/`onToolEnd` tracking

**Documentation Created:**
- `doc/architecture/MCP_FIRST_CLASS_INTEGRATION.md` - Comprehensive architecture doc

---

## Summary: Phase 0 + Phase 1 Complete 🎉

**All MCP First-Class Integration phases completed:**

| Phase | Status | Lines of Code |
|-------|--------|---------------|
| 0.1 | ✅ Complete | McpRegistry.ts (~400 lines) |
| 0.2 | ✅ Complete | CortexFlowExecutor MCP integration |
| 0.2b | ✅ Complete | All executor MCP integration |
| 0.3 | ✅ Complete | Pipeline node types |
| 0.4 | ✅ Complete | McpDiscoveryService.ts (695 lines) |
| 0.5 | ✅ Complete | McpServerBridge.ts (823 lines) |
| 0.6 | ✅ Complete | McpSecurityManager.ts (780 lines) + McpGuardian.ts (825 lines) |

**Phase 1 Langfuse Observability completed:**

| Component | Status |
|-----------|--------|
| LangfuseClient.ts | ✅ Complete |
| ObservabilityHooks.ts | ✅ Complete |
| CortexFlowExecutor instrumentation | ✅ Complete |
| DebateExecutor instrumentation | ✅ Complete |
| MultiAgentExecutor instrumentation | ✅ Complete |

**Total new code: ~3,500+ lines**

**Next Steps:**
- All phases complete. See individual phase logs above.

---

### 2026-01-28 - Phase 3 Complete ✅

**Prompt Optimization — Native TypeScript Implementation**

Implemented as pure TypeScript using the platform's `callLLM` infrastructure. No Python sidecar, no Docker dependency, no inter-process HTTP calls.

**Files Created (6):**

*TypeScript Optimization Module:*
- `src/lib/server/optimization/DSPyClient.ts` — Native BootstrapFewShot + MIPRO optimizer (uses `callLLM`)
- `src/lib/server/optimization/PromptVersionManager.ts` — MongoDB versioning + A/B testing
- `src/lib/server/optimization/PromptOptimizer.ts` — Orchestrator
- `src/lib/server/optimization/index.ts` — Barrel export

*API + UI:*
- `src/routes/api/optimization/+server.ts` — REST endpoints
- `src/lib/components/admin/AdminOptimizationTab.svelte` — Dashboard

**Files Modified (9):**
- `src/lib/server/execution/nodes/ExpertNodeRunner.ts` — Prompt version lookup + usage recording
- `src/lib/server/execution/ExpertPatternExecutor.ts` — Usage recording in success/failure handlers
- `src/lib/server/cortex-flow/CortexFlowExecutor.ts` — Optimized prompt lookup
- `src/lib/server/cortex-flow/executors/OpenAIExecutor.ts` — Optimized prompt lookup
- `src/lib/server/cortex-flow/executors/GeminiExecutor.ts` — Comment (sync method)
- `src/lib/server/cortex-flow/executors/LlamaExecutor.ts` — Optimized prompt lookup
- `src/lib/server/cortex-flow/executors/MultiAgentOrchestrator.ts` — Per-role optimization
- `src/lib/components/admin/AdminPanelConfig.ts` — Added optimization tab
- `src/lib/components/admin/AdminTabContent.svelte` — Renders optimization tab

**Documentation:**
- `doc/architecture/DSPY_PROMPT_OPTIMIZATION.md` — Full architecture doc

---

## Summary: All Phases Complete 🎉

| Phase | Status | Description |
|-------|--------|-------------|
| 0.1 | ✅ Complete | Unified McpRegistry |
| 0.2 | ✅ Complete | CortexFlowExecutor MCP integration |
| 0.2b | ✅ Complete | All executor MCP integration |
| 0.3 | ✅ Complete | Pipeline node types (McpToolNode, McpResourceNode) |
| 0.4 | ✅ Complete | MCP Auto-Discovery Service |
| 0.5 | ✅ Complete | Cortex-as-MCP-Server Bridge |
| 0.6 | ✅ Complete | MCP Security Hardening + Guardian |
| 1 | ✅ Complete | Langfuse Observability |
| 2 | ✅ Complete | GraphRAG with Cortex Brain |
| 3 | ✅ Complete | DSPy Prompt Optimization |
