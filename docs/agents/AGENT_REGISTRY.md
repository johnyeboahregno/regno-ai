# Agent Registry

## Overview

The Agent Registry is a central registry for all agent types (macro and micro). It provides agent discovery, selection, and plan generation capabilities.

## Location

```
src/lib/server/cortex-flow/agents/AgentRegistry.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT REGISTRY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      MACRO AGENTS                                     │   │
│  │  Complete multi-phase workflows for complex tasks                     │   │
│  │  • Video Intelligence Scout                                           │   │
│  │  • Deep Research Agent                                                │   │
│  │  • Document Analyst                                                   │   │
│  │  • Report Generator                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      MICRO AGENTS                                     │   │
│  │  Small, reusable, chainable agent primitives                          │   │
│  │  • Web Search                                                         │   │
│  │  • Content Extraction                                                 │   │
│  │  • Summarization                                                      │   │
│  │  • Fact Checking                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      AGENT CHAINS                                     │   │
│  │  Dynamic compositions of micro agents                                 │   │
│  │  • Research → Summarize → Report                                      │   │
│  │  • Extract → Analyze → Visualize                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Types

### AgentCapability

Tags for agent matching:

```typescript
type AgentCapability =
  | 'video-analysis'
  | 'audio-transcription'
  | 'web-research'
  | 'document-synthesis'
  | 'data-extraction'
  | 'fact-checking'
  | 'sentiment-analysis'
  | 'competitor-intelligence'
  | 'market-research'
  | 'code-analysis'
  | 'image-generation'
  | 'report-generation'
  | 'summarization'
  | 'translation'
  | 'content-creation'
  | 'data-visualization';
```

### DataType

Input/Output types for chaining compatibility:

```typescript
type DataType =
  | 'text'
  | 'url'
  | 'video-url'
  | 'audio-file'
  | 'transcript'
  | 'document'
  | 'structured-data'
  | 'report'
  | 'image'
  | 'code'
  | 'json';
```

### MacroAgent

Complete multi-phase workflow:

```typescript
interface MacroAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: AgentCapability[];
  triggerPatterns: string[];      // Keywords that activate this agent
  examplePrompts: string[];       // Sample prompts
  inputTypes: DataType[];
  outputType: DataType;
  phases: AgentPhase[];           // Ordered workflow phases
  costTier: 'low' | 'medium' | 'high' | 'very-high';
  avgDurationMs?: number;
  icon?: string;
}
```

### MicroAgent

Small, reusable, chainable agent:

```typescript
interface MicroAgent {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'processing' | 'analysis' | 'output';
  capabilities: AgentCapability[];
  inputTypes: DataType[];
  outputType: DataType;
  phase: AgentPhase;              // Single phase definition
  costTier: 'low' | 'medium' | 'high';
  avgDurationMs?: number;
}
```

### AgentPhase

Phase definition within an agent:

```typescript
interface AgentPhase {
  id: string;
  name: string;
  description: string;
  type: 'research' | 'processing' | 'analysis' | 'synthesis' | 'output' | 'validation';
  tools: string[];                // Allowed tools
  inputType: DataType | DataType[];
  outputType: DataType;
  modelTier: 'worker' | 'analyst' | 'thinker';
  frameworkHint?: 'claude' | 'gemini' | 'openai' | 'perplexity' | 'auto';
  promptTemplate: string;
  validationRules?: string[];
  parallelizable?: boolean;
  dependsOn?: string[];
}
```

## API

### Registration

```typescript
const registry = new AgentRegistry();

// Register a macro agent
registry.registerMacroAgent(videoScoutAgent);

// Register a micro agent
registry.registerMicroAgent(webSearchAgent);

// Register a chain
registry.registerChain(researchToReportChain);
```

### Discovery

```typescript
// Get all agents
const macros = registry.getAllMacroAgents();
const micros = registry.getAllMicroAgents();

// Find by capability
const { macro, micro } = registry.findByCapability('video-analysis');

// Find by I/O type
const acceptsUrl = registry.findByInputType('url');
const producesReport = registry.findByOutputType('report');

// Check chainability
const canConnect = registry.canChain(agentA, agentB);
```

### Plan Generation

```typescript
// Convert macro agent to Cortex plan
const plan = registry.macroAgentToPlan(videoScout, userPrompt);

// Convert micro agent chain to plan
const chainPlan = registry.chainToPlan(['web-search', 'summarize', 'report'], userPrompt);
```

## Built-in Agents

### Micro Agents

| ID | Name | Category | Input | Output |
|----|------|----------|-------|--------|
| `web-search` | Web Search | research | text | structured-data |
| `content-extract` | Content Extraction | processing | url | text |
| `summarize` | Summarization | analysis | text | text |
| `fact-check` | Fact Checking | analysis | text | structured-data |
| `report-gen` | Report Generation | output | text | report |

### Macro Agents

| ID | Name | Capabilities |
|----|------|--------------|
| `video-intelligence-scout` | Video Intelligence Scout | video-analysis, audio-transcription, summarization |
| `deep-research` | Deep Research Agent | web-research, fact-checking, document-synthesis |
| `document-analyst` | Document Analyst | data-extraction, summarization |
| `report-generator` | Report Generator | report-generation, data-visualization |

## Integration with AgentRouter

The AgentRouter uses the AgentRegistry to:

1. Match user prompts to appropriate agents
2. Score candidates by trigger pattern match
3. Build dynamic chains when no single agent fits
4. Generate execution plans

```typescript
const router = new AgentRouter(registry);
const route = await router.routePrompt(prompt, context);

// route.type: 'macro' | 'micro' | 'chain' | 'dynamic'
// route.agent: Selected agent
// route.confidence: Match score
// route.reasoning: Why this agent was chosen
```

## Related Documentation

- [Agent OS Architecture](./AGENT_OS_ARCHITECTURE.md) - Overall architecture
- [Context Curator](./CONTEXT_CURATOR.md) - Memory & Learning meta-agent
