# Cortex Flow: Multi-Framework Feasibility Report

> **Document Version**: 2.0
> **Date**: January 2026
> **Status**: Planning / Feasibility Analysis
> **Author**: AI Architecture Team
> **Decision**: Node.js-Only Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Decision: Node.js Only](#strategic-decision-nodejs-only)
3. [Current Architecture Assessment](#current-architecture-assessment)
4. [Proposed Architecture: Pluggable Executors](#proposed-architecture-pluggable-executors)
5. [Framework Analysis (Node.js)](#framework-analysis-nodejs)
   - [Claude SDK (Current)](#1-claude-sdk-current)
   - [OpenAI Agents SDK](#2-openai-agents-sdk)
   - [Google Gemini SDK](#3-google-gemini-sdk)
   - [LangGraph.js](#4-langgraphjs)
   - [Custom Multi-Agent System](#5-custom-multi-agent-system)
   - [Custom Agent Debate System](#6-custom-agent-debate-system)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Custom Pattern Implementations](#custom-pattern-implementations)
8. [Recommendation Matrix](#recommendation-matrix)
9. [Technical Specifications](#technical-specifications)
10. [Advanced: Framework Composition (Ecosystem Mode)](#advanced-framework-composition-ecosystem-mode)
11. [User Experience Design: Seamless & Agnostic](#user-experience-design-seamless--agnostic)
12. [Cross-Provider Cost Tracking](#cross-provider-cost-tracking)
13. [Feature Parity Strategy](#feature-parity-strategy)
14. [Appendix: Interface Definitions](#appendix-interface-definitions)

---

## Executive Summary

Enhancing Cortex Flow to support pluggable agent framework implementations is **highly feasible** using a **Node.js-only approach**. This eliminates microservice complexity while providing equivalent capabilities to Python frameworks.

### Key Decision

**We will implement all agent frameworks in Node.js/TypeScript**, avoiding Python microservices entirely. This provides:

- Single language stack (TypeScript everywhere)
- No microservice overhead
- Simpler deployment and operations
- Faster development velocity
- Full control over implementations

### Framework Implementation Status

| Framework | Approach | Effort | Status |
|-----------|----------|--------|--------|
| Claude SDK | Native TypeScript | Current | ✅ Done |
| OpenAI Agents SDK | Native TypeScript | 1-2 weeks | 📋 Planned |
| Google Gemini SDK | Native TypeScript | 2-3 weeks | 📋 Planned |
| LangGraph.js | Official Library | 2-3 weeks | 📋 Planned |
| Multi-Agent (CrewAI-like) | Custom Implementation | 2-3 weeks | 📋 Planned |
| Agent Debate (AutoGen-like) | Custom Implementation | 1-2 weeks | 📋 Planned |

**Total Implementation Time**: 8-12 weeks

---

## Strategic Decision: Node.js Only

### Why Node.js Over Python

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DECISION RATIONALE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FACTORS FAVORING NODE.JS:                                                  │
│  ─────────────────────────                                                  │
│  ✅ Existing stack is 100% TypeScript/SvelteKit                            │
│  ✅ No microservice infrastructure needed                                   │
│  ✅ Single deployment pipeline                                              │
│  ✅ One language = faster development                                       │
│  ✅ LangGraph.js officially exists and is mature                           │
│  ✅ OpenAI/Gemini have excellent TypeScript SDKs                           │
│  ✅ CrewAI/AutoGen patterns are simple to implement (~1000 LOC)            │
│                                                                             │
│  FACTORS WE ACCEPT:                                                         │
│  ──────────────────                                                         │
│  ⚠️  AI libraries may lag Python by weeks/months                           │
│  ⚠️  Fewer community examples (more self-reliance)                         │
│  ⚠️  Must implement multi-agent patterns ourselves                         │
│                                                                             │
│  WHAT WE AVOID:                                                             │
│  ───────────────                                                            │
│  ❌ Docker containers for Python services                                   │
│  ❌ Python versioning and dependency conflicts                              │
│  ❌ Two codebases to maintain                                               │
│  ❌ Cross-language debugging                                                │
│  ❌ Microservice networking and health checks                               │
│  ❌ 40% time spent on infrastructure vs features                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Key Insight

**CrewAI and AutoGen are implementations of patterns, not magic.**

The patterns are straightforward:
- **Multi-agent**: Multiple LLM calls with different system prompts
- **Role-playing**: Agents with defined personas and goals
- **Debate**: Agents critique each other's outputs
- **Handoffs**: Passing context between specialized agents

These patterns require **~1000 lines of TypeScript** to implement. We gain full control and avoid external dependencies.

---

## Current Architecture Assessment

### Current State

Cortex Flow is built around Claude Code patterns with a single executor:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORTEX FLOW TODAY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ CortexFlowApp   │───▶│ CortexFlowStore │                    │
│  │ (Svelte UI)     │    │ (State Mgmt)    │                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│                                  ▼                              │
│                    ┌─────────────────────────┐                  │
│                    │  CortexFlowExecutor     │ ◀── Claude-Only  │
│                    │  - Claude API calls     │                  │
│                    │  - Tool execution       │                  │
│                    │  - Extended thinking    │                  │
│                    │  - SSE streaming        │                  │
│                    └─────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Strengths to Preserve

1. **Clean SSE Streaming**: Well-defined event types for UI updates
2. **Tool Abstraction**: Tools defined as interfaces
3. **Settings System**: Configurable via `CortexFlowSettings`
4. **State Management**: Svelte 5 reactive store pattern
5. **Phase Tracking**: Clear execution phases

---

## Proposed Architecture: Pluggable Executors

### Target Architecture (Node.js Only)

```
┌──────────────────────────────────────────────────────────────────────────┐
│              CORTEX FLOW: PLUGGABLE ARCHITECTURE (NODE.JS)               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────┐ │
│  │ CortexFlowApp   │───▶│ CortexFlowStore │───▶│ ExecutorFactory      │ │
│  │ (Svelte UI)     │    │ (State Mgmt)    │    │ .create(framework)   │ │
│  └─────────────────┘    └─────────────────┘    └──────────┬───────────┘ │
│                                                           │             │
│                              ┌────────────────────────────┼──────┐      │
│                              │     IAgentExecutor         │      │      │
│                              │     (Common Interface)     ▼      │      │
│                              ├───────────────────────────────────┤      │
│                              │ execute(prompt, settings)         │      │
│                              │ onEvent(callback)                 │      │
│                              │ cancel()                          │      │
│                              │ getTools()                        │      │
│                              └───────────────────────────────────┘      │
│                                              │                          │
│        ┌─────────────┬─────────────┬────────┴────────┬─────────────┐   │
│        ▼             ▼             ▼                 ▼             ▼   │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐   ┌───────────┐ ┌─────────┐│
│  │  Claude   │ │  OpenAI   │ │  Gemini   │   │ LangGraph │ │  Multi  ││
│  │ Executor  │ │ Executor  │ │ Executor  │   │ Executor  │ │  Agent  ││
│  │ (current) │ │ (native)  │ │ (native)  │   │   (.js)   │ │(custom) ││
│  └───────────┘ └───────────┘ └───────────┘   └───────────┘ └─────────┘│
│       │             │             │               │             │      │
│       └─────────────┴─────────────┴───────────────┴─────────────┘      │
│                                   │                                     │
│                          ALL TYPESCRIPT                                 │
│                          SAME PROCESS                                   │
│                          NO MICROSERVICES                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Framework Analysis (Node.js)

### 1. Claude SDK (Current)

| Aspect | Details |
|--------|---------|
| **Status** | ✅ Currently Implemented |
| **Package** | `@anthropic-ai/sdk` |
| **Effort** | Done |

**Unique Strengths:**
- Extended thinking (budget_tokens)
- Best reasoning capabilities
- Native tool calling

**Current Implementation**: `CortexFlowExecutor.ts`

---

### 2. OpenAI Agents SDK

| Aspect | Details |
|--------|---------|
| **Feasibility** | ⭐⭐⭐⭐⭐ Excellent |
| **Package** | `openai` |
| **Effort** | 1-2 weeks |
| **Value** | GPT-4o/GPT-5/o1 access, built-in Code Interpreter |

**Why It's Easy:**
- Nearly identical architecture to Claude SDK
- Native TypeScript
- Excellent streaming support
- Tool calling maps 1:1

**Implementation:**

```typescript
// src/lib/server/cortex-flow/executors/OpenAIExecutor.ts

import OpenAI from 'openai';
import type { IAgentExecutor, SSEEvent, CortexFlowSettings } from '../types.js';

export class OpenAIExecutor implements IAgentExecutor {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly description = 'GPT-4o, GPT-5, and o1 models with native tool calling';

  readonly supportedFeatures = {
    streaming: true,
    extendedThinking: false,  // Not yet available
    multiAgent: false,
    codeExecution: true,      // Code Interpreter
    longContext: true,        // 128K tokens
    visionSupport: true,
    handoffs: true
  };

  private client: OpenAI;
  private currentRun: OpenAI.Beta.Threads.Run | null = null;

  constructor(config: { apiKey: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async *execute(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    // Convert tools to OpenAI format
    const tools = this.convertTools(settings.tools.enabled);

    // Create thread and add message
    const thread = await this.client.beta.threads.create();
    await this.client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt
    });

    // Stream the run
    const stream = this.client.beta.threads.runs.stream(thread.id, {
      assistant_id: settings.openai?.assistantId || await this.createAssistant(settings),
      tools,
      model: this.mapModel(settings.llm.model)
    });

    for await (const event of stream) {
      yield this.convertToSSE(event);
    }
  }

  private convertToSSE(event: OpenAI.Beta.AssistantStreamEvent): SSEEvent {
    switch (event.event) {
      case 'thread.message.delta':
        const content = event.data.delta.content?.[0];
        if (content?.type === 'text') {
          return { type: 'text', content: content.text?.value || '' };
        }
        break;

      case 'thread.run.step.created':
        if (event.data.step_details?.type === 'tool_calls') {
          const toolCall = event.data.step_details.tool_calls?.[0];
          if (toolCall?.type === 'function') {
            return {
              type: 'tool_start',
              name: toolCall.function?.name || '',
              input: JSON.parse(toolCall.function?.arguments || '{}')
            };
          }
        }
        break;

      case 'thread.run.completed':
        return { type: 'complete', success: true };

      case 'thread.run.failed':
        return {
          type: 'error',
          error: event.data.last_error?.message || 'Run failed'
        };
    }

    return { type: 'unknown', raw: event };
  }

  private convertTools(tools: string[]): OpenAI.Beta.AssistantTool[] {
    return tools.map(toolName => ({
      type: 'function' as const,
      function: {
        name: toolName,
        description: TOOL_REGISTRY[toolName].description,
        parameters: TOOL_REGISTRY[toolName].inputSchema
      }
    }));
  }

  async cancel(): Promise<void> {
    if (this.currentRun) {
      await this.client.beta.threads.runs.cancel(
        this.currentRun.thread_id,
        this.currentRun.id
      );
    }
  }
}
```

**OpenAI-Specific Settings:**

```typescript
interface OpenAISettings {
  assistantId?: string;          // Reuse existing assistant
  useCodeInterpreter?: boolean;  // Enable Code Interpreter tool
  useFileSearch?: boolean;       // Enable file search
  responseFormat?: 'text' | 'json_object';
}
```

---

### 3. Google Gemini SDK

| Aspect | Details |
|--------|---------|
| **Feasibility** | ⭐⭐⭐⭐⭐ Excellent |
| **Package** | `@google/generative-ai` |
| **Effort** | 2-3 weeks |
| **Value** | 1M+ token context, cost efficiency, multimodal |

**Why It's Valuable:**
- **1M+ token context** - load entire codebases
- Lower cost than Claude/OpenAI for many operations
- Strong multimodal (images, video, audio)
- Native TypeScript SDK

**Context Advantage:**

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTEXT WINDOW COMPARISON                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Claude Opus 4:     200K tokens   ████████░░░░░░░░░░░░░░░░     │
│  GPT-4 Turbo:       128K tokens   █████░░░░░░░░░░░░░░░░░░░     │
│  Gemini 1.5 Pro:    1M+ tokens    ████████████████████████████ │
│  Gemini 2.0:        2M+ tokens    ████████████████████████████+│
│                                                                 │
│  USE CASE: "Analyze this entire codebase"                       │
│                                                                 │
│  Claude/GPT: Chunking required, loses cross-file context        │
│  Gemini:     Load everything, perfect understanding             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// src/lib/server/cortex-flow/executors/GeminiExecutor.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAgentExecutor, SSEEvent, CortexFlowSettings } from '../types.js';

export class GeminiExecutor implements IAgentExecutor {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly description = 'Gemini models with 1M+ token context';

  readonly supportedFeatures = {
    streaming: true,
    extendedThinking: false,
    multiAgent: false,
    codeExecution: false,
    longContext: true,        // 1M+ tokens!
    visionSupport: true,
    audioSupport: true,
    videoSupport: true
  };

  private client: GoogleGenerativeAI;

  constructor(config: { apiKey: string }) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async *execute(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    const model = this.client.getGenerativeModel({
      model: settings.gemini?.model || 'gemini-1.5-pro',
      tools: [{ functionDeclarations: this.convertTools(settings.tools.enabled) }],
      systemInstruction: settings.systemPrompt
    });

    // For long context mode, load full codebase
    let fullContext = '';
    if (settings.gemini?.loadFullCodebase) {
      fullContext = await this.loadCodebase(settings);
      yield { type: 'phase', phase: 'loading', message: 'Loaded codebase into context' };
    }

    const chat = model.startChat();

    // Add context if loaded
    if (fullContext) {
      await chat.sendMessage(`Context:\n${fullContext}`);
    }

    // Stream response
    const result = await chat.sendMessageStream(prompt);

    for await (const chunk of result.stream) {
      // Handle text
      const text = chunk.text();
      if (text) {
        yield { type: 'text', content: text };
      }

      // Handle function calls
      const functionCalls = chunk.functionCalls();
      if (functionCalls) {
        for (const call of functionCalls) {
          yield {
            type: 'tool_start',
            name: call.name,
            input: call.args
          };

          // Execute tool
          const result = await this.executeTool(call.name, call.args, settings);

          yield {
            type: 'tool_end',
            name: call.name,
            result
          };

          // Send result back to model
          await chat.sendMessage([{
            functionResponse: {
              name: call.name,
              response: result
            }
          }]);
        }
      }
    }

    yield { type: 'complete', success: true };
  }

  private async loadCodebase(settings: CortexFlowSettings): Promise<string> {
    const glob = await import('glob');
    const fs = await import('fs/promises');

    const patterns = settings.gemini?.includePatterns || ['**/*.{ts,js,svelte}'];
    const excludes = settings.gemini?.excludePatterns || ['node_modules/**', 'dist/**'];

    const files = await glob.glob(patterns, {
      cwd: settings.tools.workingDirectory,
      ignore: excludes
    });

    const contents: string[] = [];
    for (const file of files.slice(0, 500)) { // Limit files
      try {
        const content = await fs.readFile(
          `${settings.tools.workingDirectory}/${file}`,
          'utf-8'
        );
        contents.push(`--- ${file} ---\n${content}\n`);
      } catch {}
    }

    return contents.join('\n');
  }
}
```

**Gemini-Specific Settings:**

```typescript
interface GeminiSettings {
  model?: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.0-pro';
  loadFullCodebase?: boolean;     // Load entire codebase into context
  includePatterns?: string[];     // Glob patterns for files
  excludePatterns?: string[];     // Patterns to exclude
  enableGrounding?: boolean;      // Google Search grounding
  safetySettings?: SafetySetting[];
}
```

---

### 4. LangGraph.js

| Aspect | Details |
|--------|---------|
| **Feasibility** | ⭐⭐⭐⭐⭐ Excellent |
| **Package** | `@langchain/langgraph` |
| **Effort** | 2-3 weeks |
| **Value** | Complex workflows, checkpoints, human-in-the-loop |

**This Is a Real Library:**

```bash
npm install @langchain/langgraph @langchain/core @langchain/anthropic
```

**Why It's Powerful:**
- Graph-based execution (nodes and edges)
- Built-in checkpointing (save/resume)
- Human-in-the-loop approval steps
- Conditional branching
- Parallel execution

**Execution Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    LANGGRAPH.JS EXECUTION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐   │
│  │  START  │────▶│  AGENT  │────▶│  TOOLS  │────▶│  AGENT  │   │
│  └─────────┘     └────┬────┘     └─────────┘     └────┬────┘   │
│                       │                               │         │
│                       │ needs_review?                 │         │
│                       ▼                               │         │
│                  ┌─────────┐                         │         │
│                  │ REVIEW  │◀────────────────────────┘         │
│                  │ (human) │                                    │
│                  └────┬────┘                                    │
│                       │ approved                                │
│                       ▼                                         │
│                  ┌─────────┐                                    │
│                  │   END   │                                    │
│                  └─────────┘                                    │
│                                                                 │
│  ✅ Checkpoints at each node                                   │
│  ✅ Human approval gates                                       │
│  ✅ Conditional routing                                        │
│  ✅ State persistence                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// src/lib/server/cortex-flow/executors/LangGraphExecutor.ts

import { StateGraph, END, START } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import type { IAgentExecutor, SSEEvent, CortexFlowSettings } from '../types.js';

interface GraphState {
  messages: Array<{ role: string; content: string }>;
  phase: string;
  toolResults: Record<string, any>;
  needsReview: boolean;
}

export class LangGraphExecutor implements IAgentExecutor {
  readonly id = 'langgraph';
  readonly name = 'LangGraph';
  readonly description = 'Complex workflows with checkpoints and human-in-the-loop';

  readonly supportedFeatures = {
    streaming: true,
    extendedThinking: false,
    multiAgent: true,
    codeExecution: true,
    longContext: false,  // Depends on underlying model
    visionSupport: true,
    checkpoints: true,   // Unique feature!
    humanInLoop: true    // Unique feature!
  };

  private graph: ReturnType<typeof StateGraph.prototype.compile> | null = null;
  private checkpointer = new MemorySaver();

  async *execute(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    // Build the graph
    const graph = this.buildGraph(settings);

    // Initial state
    const initialState: GraphState = {
      messages: [{ role: 'user', content: prompt }],
      phase: 'thinking',
      toolResults: {},
      needsReview: false
    };

    // Stream execution with checkpointing
    const config = {
      configurable: { thread_id: settings.executionId || crypto.randomUUID() }
    };

    for await (const event of graph.stream(initialState, config)) {
      // Convert LangGraph events to our SSE format
      for (const [nodeName, nodeOutput] of Object.entries(event)) {
        yield this.convertNodeOutput(nodeName, nodeOutput);
      }
    }

    yield { type: 'complete', success: true };
  }

  private buildGraph(settings: CortexFlowSettings) {
    const llm = this.createLLM(settings);
    const tools = this.createTools(settings);

    const graph = new StateGraph<GraphState>({
      channels: {
        messages: { default: () => [] },
        phase: { default: () => 'thinking' },
        toolResults: { default: () => ({}) },
        needsReview: { default: () => false }
      }
    });

    // Add nodes
    graph.addNode('agent', async (state) => {
      const response = await llm.invoke(state.messages);
      return {
        messages: [...state.messages, { role: 'assistant', content: response.content }],
        phase: 'analyzing'
      };
    });

    graph.addNode('tools', async (state) => {
      // Execute tool calls from last message
      const lastMessage = state.messages[state.messages.length - 1];
      const toolCalls = this.extractToolCalls(lastMessage);

      const results: Record<string, any> = {};
      for (const call of toolCalls) {
        results[call.name] = await this.executeTool(call.name, call.args, settings);
      }

      return { toolResults: results };
    });

    graph.addNode('review', async (state) => {
      // This node pauses for human review
      return { needsReview: true, phase: 'reviewing' };
    });

    // Add edges
    graph.addEdge(START, 'agent');

    graph.addConditionalEdges('agent', (state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (this.hasToolCalls(lastMessage)) {
        return 'tools';
      }
      if (settings.langgraph?.requireReview) {
        return 'review';
      }
      return END;
    });

    graph.addEdge('tools', 'agent');
    graph.addEdge('review', END);

    return graph.compile({ checkpointer: this.checkpointer });
  }

  private createLLM(settings: CortexFlowSettings) {
    const provider = settings.langgraph?.llmProvider || 'anthropic';

    if (provider === 'openai') {
      return new ChatOpenAI({
        modelName: settings.llm.model,
        temperature: settings.llm.temperature
      });
    }

    return new ChatAnthropic({
      modelName: settings.llm.model,
      temperature: settings.llm.temperature
    });
  }

  // Resume from checkpoint
  async resume(threadId: string, input?: any): Promise<AsyncIterable<SSEEvent>> {
    const config = { configurable: { thread_id: threadId } };
    return this.graph!.stream(input, config);
  }
}
```

**LangGraph-Specific Settings:**

```typescript
interface LangGraphSettings {
  llmProvider?: 'anthropic' | 'openai';
  requireReview?: boolean;        // Add human review step
  checkpointEnabled?: boolean;    // Enable save/resume
  maxIterations?: number;
  graphTemplate?: 'research' | 'coding' | 'analysis' | 'custom';
}
```

---

### 5. Custom Multi-Agent System

| Aspect | Details |
|--------|---------|
| **Feasibility** | ⭐⭐⭐⭐⭐ Excellent |
| **Package** | Custom Implementation |
| **Effort** | 2-3 weeks |
| **Value** | CrewAI-like role-based multi-agent collaboration |

**What We're Building:**

A TypeScript implementation of multi-agent patterns, equivalent to CrewAI's functionality.

```
┌─────────────────────────────────────────────────────────────────┐
│              MULTI-AGENT ORCHESTRATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Query: "Research and write a market analysis"            │
│                           │                                     │
│                           ▼                                     │
│               ┌───────────────────┐                            │
│               │   ORCHESTRATOR    │                            │
│               │   (coordinates)   │                            │
│               └─────────┬─────────┘                            │
│          ┌──────────────┼──────────────┐                       │
│          ▼              ▼              ▼                       │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│    │RESEARCHER│  │ ANALYST  │  │  WRITER  │                   │
│    │  Agent   │  │  Agent   │  │  Agent   │                   │
│    │          │  │          │  │          │                   │
│    │ Model:   │  │ Model:   │  │ Model:   │                   │
│    │ Sonnet   │  │ Haiku    │  │ Sonnet   │                   │
│    └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│         │             │             │                          │
│    WebSearch      Calculate     WriteFile                      │
│    WebFetch       Analyze       Format                         │
│                                                                 │
│  EXECUTION MODES:                                              │
│  • Sequential: Researcher → Analyst → Writer                   │
│  • Hierarchical: Manager delegates to specialists              │
│  • Parallel: Independent agents run concurrently               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// src/lib/server/cortex-flow/executors/MultiAgentExecutor.ts

import Anthropic from '@anthropic-ai/sdk';
import type { IAgentExecutor, SSEEvent, CortexFlowSettings } from '../types.js';

interface AgentConfig {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  tools: string[];
  model?: string;
}

interface MultiAgentSettings {
  agents: AgentConfig[];
  process: 'sequential' | 'hierarchical' | 'parallel';
  managerModel?: string;
  maxIterationsPerAgent?: number;
}

export class MultiAgentExecutor implements IAgentExecutor {
  readonly id = 'multi-agent';
  readonly name = 'Multi-Agent';
  readonly description = 'CrewAI-like role-based multi-agent collaboration';

  readonly supportedFeatures = {
    streaming: true,
    extendedThinking: true,  // If using Claude
    multiAgent: true,
    codeExecution: true,
    longContext: false,
    visionSupport: true
  };

  private client: Anthropic;
  private agents: Map<string, AgentConfig> = new Map();

  constructor(config: { apiKey: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async *execute(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    const multiAgentSettings = settings.multiAgent!;

    // Register agents
    for (const agent of multiAgentSettings.agents) {
      this.agents.set(agent.id, agent);
    }

    yield {
      type: 'phase',
      phase: 'initializing',
      message: `Initializing ${this.agents.size} agents`
    };

    // Execute based on process type
    switch (multiAgentSettings.process) {
      case 'sequential':
        yield* this.executeSequential(prompt, settings);
        break;
      case 'hierarchical':
        yield* this.executeHierarchical(prompt, settings);
        break;
      case 'parallel':
        yield* this.executeParallel(prompt, settings);
        break;
    }

    yield { type: 'complete', success: true };
  }

  private async *executeSequential(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    let context = prompt;
    const agents = Array.from(this.agents.values());

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];

      yield {
        type: 'agent_start',
        agentId: agent.id,
        role: agent.role,
        index: i + 1,
        total: agents.length
      };

      // Build agent-specific system prompt
      const systemPrompt = this.buildAgentPrompt(agent);

      // Execute agent
      const agentPrompt = i === 0
        ? context
        : `Previous agent output:\n${context}\n\nYour task: Continue based on the above.`;

      const response = await this.runAgent(agent, systemPrompt, agentPrompt, settings);

      yield {
        type: 'agent_complete',
        agentId: agent.id,
        role: agent.role,
        output: response.substring(0, 500) + '...'  // Summary
      };

      // Pass output to next agent
      context = response;
    }

    // Final output
    yield { type: 'text', content: context };
  }

  private async *executeHierarchical(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    const managerModel = settings.multiAgent?.managerModel || 'claude-sonnet-4-20250514';
    const agents = Array.from(this.agents.values());

    // Manager decides delegation
    const managerPrompt = `You are a manager coordinating a team of specialists.

Available team members:
${agents.map(a => `- ${a.role}: ${a.goal}`).join('\n')}

Task: ${prompt}

Decide how to delegate this task. For each step, specify:
1. Which team member should handle it
2. What specific instructions to give them

Output as JSON: { "delegations": [{ "agentId": "...", "task": "..." }] }`;

    yield { type: 'phase', phase: 'planning', message: 'Manager planning delegation...' };

    const plan = await this.client.messages.create({
      model: managerModel,
      max_tokens: 2000,
      messages: [{ role: 'user', content: managerPrompt }]
    });

    const planText = plan.content[0].type === 'text' ? plan.content[0].text : '';
    const delegations = this.parseDelegations(planText);

    // Execute delegations
    const results: string[] = [];
    for (const delegation of delegations) {
      const agent = this.agents.get(delegation.agentId);
      if (!agent) continue;

      yield {
        type: 'agent_start',
        agentId: agent.id,
        role: agent.role,
        task: delegation.task
      };

      const response = await this.runAgent(
        agent,
        this.buildAgentPrompt(agent),
        delegation.task,
        settings
      );

      results.push(`${agent.role}:\n${response}`);

      yield {
        type: 'agent_complete',
        agentId: agent.id,
        role: agent.role
      };
    }

    // Manager synthesizes results
    yield { type: 'phase', phase: 'synthesizing', message: 'Manager synthesizing results...' };

    const synthesis = await this.client.messages.create({
      model: managerModel,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Original task: ${prompt}\n\nTeam outputs:\n${results.join('\n\n')}\n\nSynthesize into final response.`
      }]
    });

    const finalOutput = synthesis.content[0].type === 'text' ? synthesis.content[0].text : '';
    yield { type: 'text', content: finalOutput };
  }

  private async *executeParallel(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    const agents = Array.from(this.agents.values());

    yield {
      type: 'phase',
      phase: 'executing',
      message: `Running ${agents.length} agents in parallel`
    };

    // Start all agents concurrently
    const promises = agents.map(async (agent) => {
      const response = await this.runAgent(
        agent,
        this.buildAgentPrompt(agent),
        prompt,
        settings
      );
      return { agent, response };
    });

    // Collect results as they complete
    const results = await Promise.all(promises);

    for (const { agent, response } of results) {
      yield {
        type: 'agent_complete',
        agentId: agent.id,
        role: agent.role,
        output: response.substring(0, 500) + '...'
      };
    }

    // Combine results
    const combined = results
      .map(r => `## ${r.agent.role}\n\n${r.response}`)
      .join('\n\n---\n\n');

    yield { type: 'text', content: combined };
  }

  private buildAgentPrompt(agent: AgentConfig): string {
    return `You are a ${agent.role}.

Goal: ${agent.goal}

Backstory: ${agent.backstory}

You have access to these tools: ${agent.tools.join(', ')}

Focus on your specific role and expertise. Be thorough but concise.`;
  }

  private async runAgent(
    agent: AgentConfig,
    systemPrompt: string,
    userPrompt: string,
    settings: CortexFlowSettings
  ): Promise<string> {

    const model = agent.model || settings.llm.model;
    const tools = this.getToolDefinitions(agent.tools);

    let messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt }
    ];

    // Agent loop (tool calling)
    for (let i = 0; i < (settings.multiAgent?.maxIterationsPerAgent || 10); i++) {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4000,
        system: systemPrompt,
        tools,
        messages
      });

      // Check for tool use
      const toolUse = response.content.find(c => c.type === 'tool_use');
      if (toolUse && toolUse.type === 'tool_use') {
        // Execute tool
        const result = await this.executeTool(toolUse.name, toolUse.input as Record<string, unknown>, settings);

        messages.push({ role: 'assistant', content: response.content });
        messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          }]
        });
        continue;
      }

      // Return text response
      const textBlock = response.content.find(c => c.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        return textBlock.text;
      }

      if (response.stop_reason === 'end_turn') break;
    }

    return '';
  }
}
```

**Multi-Agent Settings:**

```typescript
interface MultiAgentSettings {
  agents: Array<{
    id: string;
    role: string;
    goal: string;
    backstory: string;
    tools: string[];
    model?: string;  // Can use different models per agent
  }>;
  process: 'sequential' | 'hierarchical' | 'parallel';
  managerModel?: string;
  maxIterationsPerAgent?: number;
}
```

**Preset Configurations:**

```typescript
// Pre-configured agent teams
const AGENT_PRESETS = {
  research: {
    agents: [
      {
        id: 'researcher',
        role: 'Research Specialist',
        goal: 'Find comprehensive, accurate information',
        backstory: 'Expert researcher with 10 years experience in data gathering',
        tools: ['WebSearch', 'WebFetch'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        id: 'analyst',
        role: 'Data Analyst',
        goal: 'Analyze findings and extract key insights',
        backstory: 'Data scientist specializing in pattern recognition',
        tools: ['Calculate'],
        model: 'claude-3-5-haiku-20241022'  // Cheaper for analysis
      },
      {
        id: 'writer',
        role: 'Content Writer',
        goal: 'Produce clear, well-structured reports',
        backstory: 'Professional technical writer',
        tools: ['WriteFile'],
        model: 'claude-sonnet-4-20250514'
      }
    ],
    process: 'sequential'
  },

  coding: {
    agents: [
      {
        id: 'architect',
        role: 'Software Architect',
        goal: 'Design system architecture and technical approach',
        backstory: 'Senior architect with expertise in scalable systems',
        tools: ['Read', 'Glob', 'Grep'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        id: 'developer',
        role: 'Developer',
        goal: 'Implement code according to specifications',
        backstory: 'Full-stack developer with 8 years experience',
        tools: ['Read', 'Write', 'Edit', 'Bash'],
        model: 'claude-sonnet-4-20250514'
      },
      {
        id: 'reviewer',
        role: 'Code Reviewer',
        goal: 'Review code for bugs, security issues, and best practices',
        backstory: 'Security-focused senior developer',
        tools: ['Read', 'Grep'],
        model: 'claude-3-5-haiku-20241022'
      }
    ],
    process: 'sequential'
  }
};
```

---

### 6. Custom Agent Debate System

| Aspect | Details |
|--------|---------|
| **Feasibility** | ⭐⭐⭐⭐⭐ Excellent |
| **Package** | Custom Implementation |
| **Effort** | 1-2 weeks |
| **Value** | AutoGen-like agent debates for improved output quality |

**What We're Building:**

Agents that critique and improve each other's outputs through structured debate.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT DEBATE SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query: "Design an authentication system"                       │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   DEBATE ARENA                           │   │
│  │                                                          │   │
│  │  Round 1:                                                │   │
│  │  ┌──────────┐              ┌──────────┐                 │   │
│  │  │PROPOSER  │─────────────▶│  CRITIC  │                 │   │
│  │  │          │              │          │                 │   │
│  │  │"Use JWT  │              │"JWT has  │                 │   │
│  │  │ tokens"  │              │ security │                 │   │
│  │  │          │◀─────────────│ issues"  │                 │   │
│  │  └──────────┘              └──────────┘                 │   │
│  │                                                          │   │
│  │  Round 2:                                                │   │
│  │  ┌──────────┐              ┌──────────┐                 │   │
│  │  │PROPOSER  │─────────────▶│  CRITIC  │                 │   │
│  │  │          │              │          │                 │   │
│  │  │"Updated: │              │"Better,  │                 │   │
│  │  │ JWT +    │              │ but add  │                 │   │
│  │  │ refresh" │◀─────────────│ rotation"│                 │   │
│  │  └──────────┘              └──────────┘                 │   │
│  │                                                          │   │
│  │  Round 3: CONSENSUS REACHED                              │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Final: JWT + refresh tokens + rotation + revocation│ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// src/lib/server/cortex-flow/executors/DebateExecutor.ts

import Anthropic from '@anthropic-ai/sdk';
import type { IAgentExecutor, SSEEvent, CortexFlowSettings } from '../types.js';

interface DebateSettings {
  maxRounds: number;
  consensusThreshold: number;  // 0-1, how much agreement needed
  proposerModel?: string;
  criticModel?: string;
  judgeModel?: string;
}

export class DebateExecutor implements IAgentExecutor {
  readonly id = 'debate';
  readonly name = 'Agent Debate';
  readonly description = 'AutoGen-like agent debates for improved quality';

  readonly supportedFeatures = {
    streaming: true,
    extendedThinking: true,
    multiAgent: true,
    qualityImprovement: true  // Unique!
  };

  private client: Anthropic;

  async *execute(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    const debateSettings = settings.debate || {
      maxRounds: 3,
      consensusThreshold: 0.8
    };

    let currentProposal = '';
    let criticisms: string[] = [];
    let consensusReached = false;

    // Initial proposal
    yield { type: 'phase', phase: 'proposing', message: 'Generating initial proposal...' };

    currentProposal = await this.generateProposal(prompt, [], settings);

    yield {
      type: 'debate_round',
      round: 0,
      stage: 'proposal',
      content: currentProposal
    };

    // Debate rounds
    for (let round = 1; round <= debateSettings.maxRounds; round++) {
      yield {
        type: 'phase',
        phase: 'debating',
        message: `Debate round ${round}/${debateSettings.maxRounds}`
      };

      // Critic evaluates
      const criticism = await this.generateCriticism(
        prompt,
        currentProposal,
        criticisms,
        settings
      );

      yield {
        type: 'debate_round',
        round,
        stage: 'criticism',
        content: criticism
      };

      // Check if consensus
      const consensusScore = await this.evaluateConsensus(
        currentProposal,
        criticism,
        settings
      );

      yield {
        type: 'consensus_score',
        round,
        score: consensusScore
      };

      if (consensusScore >= debateSettings.consensusThreshold) {
        consensusReached = true;
        yield {
          type: 'phase',
          phase: 'consensus',
          message: `Consensus reached at round ${round}`
        };
        break;
      }

      // Proposer revises based on criticism
      criticisms.push(criticism);
      currentProposal = await this.generateProposal(prompt, criticisms, settings);

      yield {
        type: 'debate_round',
        round,
        stage: 'revision',
        content: currentProposal
      };
    }

    // Final synthesis
    yield { type: 'phase', phase: 'synthesizing', message: 'Creating final output...' };

    const finalOutput = await this.synthesize(
      prompt,
      currentProposal,
      criticisms,
      consensusReached,
      settings
    );

    yield { type: 'text', content: finalOutput };
    yield { type: 'complete', success: true };
  }

  private async generateProposal(
    task: string,
    previousCriticisms: string[],
    settings: CortexFlowSettings
  ): Promise<string> {

    const model = settings.debate?.proposerModel || settings.llm.model;

    let prompt = `Task: ${task}\n\n`;

    if (previousCriticisms.length > 0) {
      prompt += `Previous criticisms to address:\n`;
      previousCriticisms.forEach((c, i) => {
        prompt += `${i + 1}. ${c}\n`;
      });
      prompt += `\nProvide an improved solution addressing these concerns.`;
    } else {
      prompt += `Provide your best solution to this task.`;
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: 4000,
      system: `You are an expert problem solver. Provide thorough, well-reasoned solutions.`,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private async generateCriticism(
    task: string,
    proposal: string,
    previousCriticisms: string[],
    settings: CortexFlowSettings
  ): Promise<string> {

    const model = settings.debate?.criticModel || 'claude-3-5-haiku-20241022';

    const prompt = `Task: ${task}

Proposed solution:
${proposal}

${previousCriticisms.length > 0 ? `Previous criticisms (already addressed):\n${previousCriticisms.join('\n')}\n\n` : ''}

Critically evaluate this solution. Identify:
1. Logical flaws or gaps
2. Edge cases not handled
3. Security or safety concerns
4. Performance issues
5. Better alternatives

If the solution is excellent and addresses all concerns, say "APPROVED" and explain why.`;

    const response = await this.client.messages.create({
      model,
      max_tokens: 2000,
      system: `You are a critical reviewer. Find weaknesses and suggest improvements. Be constructive but thorough.`,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private async evaluateConsensus(
    proposal: string,
    criticism: string,
    settings: CortexFlowSettings
  ): Promise<number> {

    const model = settings.debate?.judgeModel || 'claude-3-5-haiku-20241022';

    const prompt = `Evaluate the level of agreement between the proposal and criticism.

Proposal:
${proposal}

Criticism:
${criticism}

On a scale of 0 to 1:
- 0 = Fundamental disagreement, major issues
- 0.5 = Some valid concerns remaining
- 0.8 = Minor refinements suggested
- 1.0 = Full approval (criticism says "APPROVED")

Return ONLY a number between 0 and 1.`;

    const response = await this.client.messages.create({
      model,
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '0.5';
    return parseFloat(text) || 0.5;
  }

  private async synthesize(
    task: string,
    finalProposal: string,
    criticisms: string[],
    consensusReached: boolean,
    settings: CortexFlowSettings
  ): Promise<string> {

    const model = settings.llm.model;

    const prompt = `Task: ${task}

Final proposal after ${criticisms.length} rounds of debate:
${finalProposal}

Key criticisms addressed:
${criticisms.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Consensus ${consensusReached ? 'was reached' : 'was not fully reached'}.

Synthesize into a final, polished response that incorporates the best insights from the debate.`;

    const response = await this.client.messages.create({
      model,
      max_tokens: 4000,
      system: `You are synthesizing a debate into a final answer. Be thorough and address all valid points raised.`,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}
```

---

## Implementation Roadmap

### Timeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION ROADMAP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Week 1-2: Foundation + OpenAI                                  │
│  ├── IAgentExecutor interface                                   │
│  ├── ExecutorFactory                                            │
│  ├── OpenAIExecutor implementation                              │
│  └── Settings UI for executor selection                         │
│                                                                 │
│  Week 3-4: Gemini                                               │
│  ├── GeminiExecutor implementation                              │
│  ├── Long context mode                                          │
│  └── Multimodal support                                         │
│                                                                 │
│  Week 5-6: LangGraph.js                                         │
│  ├── LangGraphExecutor implementation                           │
│  ├── Checkpoint/resume support                                  │
│  └── Human-in-the-loop integration                              │
│                                                                 │
│  Week 7-8: Multi-Agent                                          │
│  ├── MultiAgentExecutor implementation                          │
│  ├── Agent preset configurations                                │
│  └── Agent progress visualization                               │
│                                                                 │
│  Week 9-10: Debate + Polish                                     │
│  ├── DebateExecutor implementation                              │
│  ├── Testing and refinement                                     │
│  └── Documentation                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1: Foundation + OpenAI (Weeks 1-2)

**Goals:**
- Create abstraction layer
- Validate with most compatible framework
- Add executor selection to UI

**Deliverables:**
- `IAgentExecutor` interface
- `ExecutorFactory` class
- `OpenAIExecutor` implementation
- Executor dropdown in settings

### Phase 2: Gemini (Weeks 3-4)

**Goals:**
- Add long-context capability
- Enable full codebase analysis

**Deliverables:**
- `GeminiExecutor` implementation
- Codebase loading option
- Context size indicator in UI

### Phase 3: LangGraph.js (Weeks 5-6)

**Goals:**
- Complex workflow support
- Checkpoint/resume capability

**Deliverables:**
- `LangGraphExecutor` implementation
- Checkpoint management UI
- Human-in-the-loop review step

### Phase 4: Multi-Agent (Weeks 7-8)

**Goals:**
- Role-based agent collaboration
- Agent team presets

**Deliverables:**
- `MultiAgentExecutor` implementation
- Agent configuration UI
- Agent progress visualization

### Phase 5: Debate + Polish (Weeks 9-10)

**Goals:**
- Quality improvement through debate
- Overall polish and testing

**Deliverables:**
- `DebateExecutor` implementation
- Comprehensive testing
- Documentation

---

## Custom Pattern Implementations

### Lines of Code Estimates

| Component | Estimated LOC | Complexity |
|-----------|---------------|------------|
| IAgentExecutor interface | ~100 | Low |
| ExecutorFactory | ~150 | Low |
| OpenAIExecutor | ~300 | Medium |
| GeminiExecutor | ~350 | Medium |
| LangGraphExecutor | ~400 | Medium |
| MultiAgentExecutor | ~500 | Medium |
| DebateExecutor | ~300 | Medium |
| **Total** | **~2100** | - |

### Reusable Components

```typescript
// Shared across all executors

// Tool registry and execution
class ToolRegistry {
  static getDefinition(name: string): ToolDefinition;
  static execute(name: string, input: any, settings: CortexFlowSettings): Promise<any>;
  static convertToFormat(name: string, format: 'claude' | 'openai' | 'gemini'): any;
}

// SSE event normalization
class SSEAdapter {
  static fromClaude(event: ClaudeEvent): SSEEvent;
  static fromOpenAI(event: OpenAIEvent): SSEEvent;
  static fromGemini(event: GeminiEvent): SSEEvent;
  static fromLangGraph(event: LangGraphEvent): SSEEvent;
}

// Cost tracking
class CostTracker {
  static estimate(executor: string, tokens: TokenCount): CostEstimate;
  static track(executionId: string, usage: Usage): void;
  static getReport(executionId: string): CostReport;
}
```

---

## Recommendation Matrix

### Quick Selection Guide

| If You Want... | Use This | Why |
|----------------|----------|-----|
| **Best reasoning** | Claude (current) | Extended thinking |
| **GPT-4o/GPT-5** | OpenAI | Native support |
| **Largest context** | Gemini | 1M+ tokens |
| **Complex workflows** | LangGraph.js | Checkpoints, graphs |
| **Multi-agent teams** | Multi-Agent | Role specialization |
| **Quality improvement** | Debate | Iterative refinement |
| **Cheapest** | Gemini or Haiku | Lower token costs |

### Feature Comparison

| Feature | Claude | OpenAI | Gemini | LangGraph | Multi-Agent | Debate |
|---------|--------|--------|--------|-----------|-------------|--------|
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Extended Thinking | ✅ | ❌ | ❌ | ❌ | ✅* | ✅* |
| Long Context | 200K | 128K | 1M+ | Varies | Varies | Varies |
| Checkpoints | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Human-in-Loop | Manual | ❌ | ❌ | ✅ | ❌ | ❌ |
| Multi-Agent | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Code Interpreter | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

*When using Claude as the underlying model

---

## Technical Specifications

### File Structure

```
src/lib/server/cortex-flow/
├── executors/
│   ├── IAgentExecutor.ts         # Interface definition
│   ├── ExecutorFactory.ts        # Factory pattern
│   ├── ClaudeExecutor.ts         # Current implementation (refactored)
│   ├── OpenAIExecutor.ts         # OpenAI implementation
│   ├── GeminiExecutor.ts         # Gemini implementation
│   ├── LangGraphExecutor.ts      # LangGraph.js implementation
│   ├── MultiAgentExecutor.ts     # Multi-agent implementation
│   └── DebateExecutor.ts         # Debate implementation
├── shared/
│   ├── ToolRegistry.ts           # Shared tool definitions
│   ├── SSEAdapter.ts             # Event normalization
│   └── CostTracker.ts            # Cost tracking
└── types/
    └── executor.ts               # Type definitions
```

### Settings Schema

```typescript
interface CortexFlowSettings {
  // Executor selection
  executor: {
    id: 'claude' | 'openai' | 'gemini' | 'langgraph' | 'multi-agent' | 'debate';
    fallback?: string;
  };

  // Common settings
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
    thinkingBudget?: number;  // Claude only
  };

  tools: {
    enabled: string[];
    workingDirectory: string;
  };

  // Executor-specific settings
  openai?: OpenAISettings;
  gemini?: GeminiSettings;
  langgraph?: LangGraphSettings;
  multiAgent?: MultiAgentSettings;
  debate?: DebateSettings;
}
```

---

## Appendix: Interface Definitions

### IAgentExecutor Interface

```typescript
export interface IAgentExecutor {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supportedFeatures: ExecutorFeatures;

  // Lifecycle
  initialize?(config: ExecutorConfig): Promise<void>;
  dispose?(): Promise<void>;

  // Execution
  execute(
    prompt: string,
    settings: CortexFlowSettings,
    context?: ExecutionContext
  ): AsyncIterable<SSEEvent>;

  cancel(): Promise<void>;
  isRunning(): boolean;

  // Tools
  getToolDefinitions(): ToolDefinition[];
  supportsTools(toolName: string): boolean;

  // Cost
  estimateCost(prompt: string, settings: CortexFlowSettings): CostEstimate;
  getLastMetrics(): ExecutionMetrics;
}

export interface ExecutorFeatures {
  streaming: boolean;
  extendedThinking: boolean;
  multiAgent: boolean;
  codeExecution: boolean;
  longContext: boolean;
  maxContextTokens: number;
  visionSupport: boolean;
  checkpoints: boolean;
  humanInLoop: boolean;
}
```

### SSE Event Types

```typescript
export type SSEEvent =
  | SSEThinkingEvent
  | SSETextEvent
  | SSEToolStartEvent
  | SSEToolEndEvent
  | SSEPhaseChangeEvent
  | SSEAgentStartEvent      // Multi-agent
  | SSEAgentCompleteEvent   // Multi-agent
  | SSEDebateRoundEvent     // Debate
  | SSEConsensusEvent       // Debate
  | SSECheckpointEvent      // LangGraph
  | SSECompleteEvent
  | SSEErrorEvent;

export interface SSEAgentStartEvent {
  type: 'agent_start';
  agentId: string;
  role: string;
  task?: string;
  index?: number;
  total?: number;
}

export interface SSEAgentCompleteEvent {
  type: 'agent_complete';
  agentId: string;
  role: string;
  output?: string;
}

export interface SSEDebateRoundEvent {
  type: 'debate_round';
  round: number;
  stage: 'proposal' | 'criticism' | 'revision';
  content: string;
}

export interface SSEConsensusEvent {
  type: 'consensus_score';
  round: number;
  score: number;
}

export interface SSECheckpointEvent {
  type: 'checkpoint';
  checkpointId: string;
  canResume: boolean;
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | AI Architecture Team | Initial feasibility report |
| 2.0 | Jan 2026 | AI Architecture Team | Node.js-only implementation plan |

---

## Advanced: Framework Composition (Ecosystem Mode)

### Vision

Rather than selecting a single executor, Cortex Flow can **compose multiple frameworks** into an optimal execution pipeline. Each framework contributes its unique strength:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK COMPOSITION MODEL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRAMEWORK STRENGTHS:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ GEMINI      │ Long Context    │ Load 1M+ tokens of source material  │   │
│  │ CLAUDE      │ Deep Reasoning  │ Extended thinking for complex logic │   │
│  │ OPENAI      │ Code Execution  │ Built-in Code Interpreter           │   │
│  │ LANGGRAPH   │ Workflows       │ Checkpoints, human-in-the-loop      │   │
│  │ MULTI-AGENT │ Parallelism     │ Specialized roles working together  │   │
│  │ DEBATE      │ Quality         │ Iterative refinement through critique│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  COMPOSITION EXAMPLE:                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ GEMINI   │──▶│ MULTI-   │──▶│ DEBATE   │──▶│ CLAUDE   │                │
│  │ (load)   │   │ AGENT    │   │ (refine) │   │ (reason) │                │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Execution Pipeline Configuration

```typescript
interface ExecutionPipeline {
  id: string;
  name: string;
  description: string;

  stages: PipelineStage[];

  // Automatic stage selection based on task analysis
  autoOptimize?: boolean;
}

interface PipelineStage {
  id: string;
  executor: ExecutorId;

  // When to use this stage
  trigger: {
    type: 'always' | 'conditional' | 'on-demand';
    condition?: string;  // e.g., "context.sourceCount > 10"
  };

  // What this stage produces
  output: {
    type: 'context' | 'partial-result' | 'final-result';
    passTo?: string;  // Next stage ID
  };

  // Stage-specific settings
  settings: Partial<CortexFlowSettings>;
}

// Example: Research Pipeline
const researchPipeline: ExecutionPipeline = {
  id: 'deep-research',
  name: 'Deep Research Pipeline',
  description: 'Comprehensive research with quality assurance',

  stages: [
    {
      id: 'context-loading',
      executor: 'gemini',
      trigger: { type: 'conditional', condition: 'hasCodebase || hasDocuments' },
      output: { type: 'context', passTo: 'research' },
      settings: {
        gemini: { loadFullCodebase: true }
      }
    },
    {
      id: 'research',
      executor: 'multi-agent',
      trigger: { type: 'always' },
      output: { type: 'partial-result', passTo: 'quality-check' },
      settings: {
        multiAgent: {
          agents: [/* researcher, analyst */],
          process: 'sequential'
        }
      }
    },
    {
      id: 'quality-check',
      executor: 'debate',
      trigger: { type: 'conditional', condition: 'settings.qualityAssurance' },
      output: { type: 'partial-result', passTo: 'synthesis' },
      settings: {
        debate: { maxRounds: 2, consensusThreshold: 0.7 }
      }
    },
    {
      id: 'synthesis',
      executor: 'claude',
      trigger: { type: 'always' },
      output: { type: 'final-result' },
      settings: {
        llm: { thinkingBudget: 32000 }  // Deep thinking for final synthesis
      }
    }
  ]
};
```

### Pipeline Executor

```typescript
// src/lib/server/cortex-flow/executors/PipelineExecutor.ts

export class PipelineExecutor implements IAgentExecutor {
  readonly id = 'pipeline';
  readonly name = 'Execution Pipeline';
  readonly description = 'Compose multiple frameworks for optimal execution';

  private executors: Map<string, IAgentExecutor>;
  private pipeline: ExecutionPipeline;

  async *execute(
    prompt: string,
    settings: CortexFlowSettings
  ): AsyncIterable<SSEEvent> {

    const pipeline = settings.pipeline || this.getDefaultPipeline(prompt);
    let context: PipelineContext = { input: prompt, results: {} };

    yield {
      type: 'pipeline_start',
      pipelineId: pipeline.id,
      stages: pipeline.stages.map(s => s.id)
    };

    for (const stage of pipeline.stages) {
      // Check if stage should run
      if (!this.shouldRunStage(stage, context, settings)) {
        yield { type: 'stage_skip', stageId: stage.id, reason: 'Condition not met' };
        continue;
      }

      yield {
        type: 'stage_start',
        stageId: stage.id,
        executor: stage.executor
      };

      // Get or create executor for this stage
      const executor = this.getExecutor(stage.executor);
      const stageSettings = this.mergeSettings(settings, stage.settings);
      const stagePrompt = this.buildStagePrompt(stage, context);

      // Execute stage
      const stageResults: string[] = [];
      for await (const event of executor.execute(stagePrompt, stageSettings)) {
        // Forward events with stage prefix
        yield { ...event, _stage: stage.id };

        if (event.type === 'text') {
          stageResults.push(event.content);
        }
      }

      // Store results for next stage
      context.results[stage.id] = stageResults.join('');

      yield {
        type: 'stage_complete',
        stageId: stage.id,
        outputType: stage.output.type
      };
    }

    // Final output is from last stage with 'final-result' type
    const finalStage = pipeline.stages.findLast(s => s.output.type === 'final-result');
    if (finalStage) {
      yield { type: 'text', content: context.results[finalStage.id] };
    }

    yield { type: 'complete', success: true };
  }

  private getDefaultPipeline(prompt: string): ExecutionPipeline {
    // Analyze prompt to suggest optimal pipeline
    const hasResearchIntent = /research|analyze|investigate|study/i.test(prompt);
    const hasCodeIntent = /code|implement|build|create/i.test(prompt);
    const hasQualityIntent = /thorough|comprehensive|detailed/i.test(prompt);

    if (hasResearchIntent && hasQualityIntent) {
      return PIPELINE_PRESETS['deep-research'];
    }
    if (hasCodeIntent) {
      return PIPELINE_PRESETS['coding'];
    }
    return PIPELINE_PRESETS['default'];
  }
}
```

### Pre-configured Pipeline Presets

```typescript
const PIPELINE_PRESETS: Record<string, ExecutionPipeline> = {
  'default': {
    id: 'default',
    name: 'Default',
    description: 'Single executor, no pipeline',
    stages: [
      { id: 'main', executor: 'claude', trigger: { type: 'always' }, output: { type: 'final-result' } }
    ]
  },

  'deep-research': {
    id: 'deep-research',
    name: 'Deep Research',
    description: 'Multi-agent research with quality assurance',
    stages: [
      { id: 'research', executor: 'multi-agent', /* ... */ },
      { id: 'critique', executor: 'debate', /* ... */ },
      { id: 'synthesis', executor: 'claude', /* ... */ }
    ]
  },

  'long-context-analysis': {
    id: 'long-context-analysis',
    name: 'Long Context Analysis',
    description: 'Load full codebase with Gemini, analyze with Claude',
    stages: [
      { id: 'load', executor: 'gemini', /* loadFullCodebase: true */ },
      { id: 'analyze', executor: 'claude', /* extended thinking */ }
    ]
  },

  'coding-with-review': {
    id: 'coding-with-review',
    name: 'Coding with Review',
    description: 'Write code, then critique and improve',
    stages: [
      { id: 'implement', executor: 'claude', /* ... */ },
      { id: 'review', executor: 'debate', /* critic reviews code */ },
      { id: 'refine', executor: 'claude', /* apply feedback */ }
    ]
  },

  'parallel-research': {
    id: 'parallel-research',
    name: 'Parallel Research',
    description: 'Multiple agents research in parallel, then synthesize',
    stages: [
      { id: 'parallel', executor: 'multi-agent', /* process: 'parallel' */ },
      { id: 'synthesize', executor: 'claude', /* ... */ }
    ]
  }
};
```

### UI: Pipeline Configuration

For developer users, the settings modal would expose:

```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTION MODE                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ○ Single Executor                                              │
│    └── [Claude ▼] [OpenAI ▼] [Gemini ▼] [LangGraph ▼]         │
│                                                                 │
│  ● Execution Pipeline                                           │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Pipeline: [Deep Research ▼]                             │ │
│    │                                                          │ │
│    │ Stages:                                                  │ │
│    │ ┌────────┐    ┌────────┐    ┌────────┐                 │ │
│    │ │Research│───▶│Critique│───▶│Synthesis                 │ │
│    │ │Multi-  │    │Debate  │    │Claude  │                 │ │
│    │ │Agent   │    │        │    │        │                 │ │
│    │ └────────┘    └────────┘    └────────┘                 │ │
│    │                                                          │ │
│    │ [+ Add Stage] [Edit Pipeline] [Save as Preset]          │ │
│    └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ○ Auto-Optimize (AI selects best pipeline for task)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SSE Events for Pipelines

```typescript
export interface SSEPipelineStartEvent {
  type: 'pipeline_start';
  pipelineId: string;
  stages: string[];
}

export interface SSEStageStartEvent {
  type: 'stage_start';
  stageId: string;
  executor: string;
}

export interface SSEStageCompleteEvent {
  type: 'stage_complete';
  stageId: string;
  outputType: 'context' | 'partial-result' | 'final-result';
  duration?: number;
  tokenUsage?: TokenUsage;
}

export interface SSEStageSkipEvent {
  type: 'stage_skip';
  stageId: string;
  reason: string;
}
```

### Benefits of Composition Model

| Benefit | Example |
|---------|---------|
| **Best-of-breed** | Use Gemini for context, Claude for reasoning |
| **Cost optimization** | Use Haiku for critique, Opus for synthesis |
| **Quality assurance** | Add debate stage for important outputs |
| **Flexibility** | Swap stages without rebuilding |
| **Reusability** | Save pipelines as presets for different task types |

### Implementation Priority

This composition model builds on top of the individual executors:

1. **Phase 1-5**: Implement individual executors (current roadmap)
2. **Phase 6**: Add `PipelineExecutor` that orchestrates multiple executors
3. **Phase 7**: Add pipeline configuration UI
4. **Phase 8**: Add auto-optimization (AI-selected pipelines)

---

## User Experience Design: Seamless & Agnostic

A critical design principle: **end users should never need to understand or configure frameworks**. The ecosystem's power is exposed only to developers, while regular users experience a seamless, intelligent assistant.

### Two-Tier Experience Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    USER EXPERIENCE TIERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      END USER EXPERIENCE                             │   │
│  │                                                                       │   │
│  │  "Ask me anything..."                                                │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                                                                │  │   │
│  │  │    [Simple chat interface - no framework visibility]          │  │   │
│  │  │                                                                │  │   │
│  │  │    User types: "Research competitor pricing strategies"       │  │   │
│  │  │                                                                │  │   │
│  │  │    → System automatically selects optimal framework           │  │   │
│  │  │    → Pipeline orchestration happens invisibly                 │  │   │
│  │  │    → User sees: "Researching..." → "Analyzing..." → Results  │  │   │
│  │  │                                                                │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  WHAT END USERS SEE:                                                 │   │
│  │  ✓ Simple, clean chat interface                                      │   │
│  │  ✓ Progress indicators ("Searching...", "Analyzing...")              │   │
│  │  ✓ Quality results with sources                                      │   │
│  │  ✓ Optional: "Show reasoning" toggle                                 │   │
│  │                                                                       │   │
│  │  WHAT END USERS DON'T SEE:                                           │   │
│  │  ✗ Framework selection                                               │   │
│  │  ✗ Pipeline configuration                                            │   │
│  │  ✗ Model choices                                                     │   │
│  │  ✗ Technical parameters                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DEVELOPER EXPERIENCE                              │   │
│  │                    (Role: developer only)                            │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │  Settings ⚙️                                                   │  │   │
│  │  │  ├── Framework: [Auto | Claude | OpenAI | Gemini | Multi...]  │  │   │
│  │  │  ├── Pipeline: [Auto | Deep Research | Coding | Debate...]    │  │   │
│  │  │  ├── Models: Configure per stage                              │  │   │
│  │  │  ├── Tools: Enable/disable per framework                      │  │   │
│  │  │  ├── Debug Mode: Show internal reasoning                      │  │   │
│  │  │  └── Telemetry: Cost, tokens, timing breakdown                │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  DEVELOPER CAPABILITIES:                                             │   │
│  │  ✓ Full framework visibility and selection                          │   │
│  │  ✓ Custom pipeline creation and editing                             │   │
│  │  ✓ Per-stage model and parameter configuration                      │   │
│  │  ✓ Debug console with internal state                                │   │
│  │  ✓ Performance telemetry and cost analysis                          │   │
│  │  ✓ A/B testing different frameworks                                 │   │
│  │  ✓ Export/import pipeline configurations                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Intelligent Framework Routing

The system doesn't just "pick a framework" - it **analyzes the problem and routes to the best tool for the job**, including hybrid approaches when beneficial:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENT FRAMEWORK ROUTING                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Query                                                                 │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TASK ANALYZER                                     │   │
│  │  • What type of problem is this?                                     │   │
│  │  • What capabilities are needed?                                     │   │
│  │  • Which framework excels at this?                                   │   │
│  │  • Would a hybrid approach be better?                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FRAMEWORK STRENGTHS MAP                           │   │
│  │                                                                       │   │
│  │  CLAUDE excels at:                                                   │   │
│  │  • Deep reasoning & extended thinking                                │   │
│  │  • Code generation & review                                          │   │
│  │  • Nuanced writing & analysis                                        │   │
│  │  • Complex multi-step tasks                                          │   │
│  │                                                                       │   │
│  │  OPENAI excels at:                                                   │   │
│  │  • Function calling & tool orchestration                             │   │
│  │  • Structured JSON output                                            │   │
│  │  • Quick factual responses                                           │   │
│  │  • Image generation (DALL-E)                                         │   │
│  │                                                                       │   │
│  │  GEMINI excels at:                                                   │   │
│  │  • Large context windows (1M+ tokens)                                │   │
│  │  • Multi-modal (video, audio, images)                                │   │
│  │  • Document analysis & summarization                                 │   │
│  │  • Real-time data & Google integration                               │   │
│  │                                                                       │   │
│  │  LANGGRAPH excels at:                                                │   │
│  │  • Stateful workflows & loops                                        │   │
│  │  • Graph-based task decomposition                                    │   │
│  │  • Conditional branching                                             │   │
│  │  • Recoverable checkpoints                                           │   │
│  │                                                                       │   │
│  │  MULTI-AGENT excels at:                                              │   │
│  │  • Parallel specialist collaboration                                 │   │
│  │  • Role-based problem solving                                        │   │
│  │  • Comprehensive research tasks                                      │   │
│  │                                                                       │   │
│  │  DEBATE excels at:                                                   │   │
│  │  • Controversial/nuanced topics                                      │   │
│  │  • Bias detection & balanced views                                   │   │
│  │  • Quality through adversarial review                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ROUTING DECISION                                  │   │
│  │                                                                       │   │
│  │  Problem A: "Write a complex algorithm"                              │   │
│  │  → CLAUDE (best at deep reasoning + code)                            │   │
│  │                                                                       │   │
│  │  Problem B: "Generate an image of a sunset"                          │   │
│  │  → OPENAI (has DALL-E integration)                                   │   │
│  │                                                                       │   │
│  │  Problem C: "Analyze this 500-page PDF"                              │   │
│  │  → GEMINI (1M token context window)                                  │   │
│  │                                                                       │   │
│  │  Problem D: "Build a multi-step workflow with loops"                 │   │
│  │  → LANGGRAPH (stateful graph execution)                              │   │
│  │                                                                       │   │
│  │  Problem X: "Research competitors, analyze data, write report"       │   │
│  │  → HYBRID: Gemini (context) → Multi-Agent (research) → Claude (write)│   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// src/lib/server/cortex-flow/IntelligentRouter.ts

interface FrameworkStrength {
  framework: string;
  capabilities: string[];
  bestFor: string[];
  limitations: string[];
}

const FRAMEWORK_STRENGTHS: FrameworkStrength[] = [
  {
    framework: 'claude',
    capabilities: ['extended-thinking', 'code-generation', 'nuanced-writing', 'complex-reasoning'],
    bestFor: ['algorithms', 'code-review', 'detailed-analysis', 'creative-writing'],
    limitations: ['no-image-generation', 'smaller-context-than-gemini']
  },
  {
    framework: 'openai',
    capabilities: ['function-calling', 'structured-output', 'image-generation', 'embeddings'],
    bestFor: ['tool-orchestration', 'json-output', 'quick-facts', 'image-creation'],
    limitations: ['less-nuanced-reasoning', 'shorter-context']
  },
  {
    framework: 'gemini',
    capabilities: ['large-context', 'multi-modal', 'video-analysis', 'google-integration'],
    bestFor: ['document-analysis', 'video-processing', 'large-file-handling', 'real-time-data'],
    limitations: ['less-coding-ability', 'less-extended-thinking']
  },
  {
    framework: 'langgraph',
    capabilities: ['stateful-workflows', 'graph-execution', 'checkpoints', 'conditional-logic'],
    bestFor: ['complex-workflows', 'iterative-processes', 'state-machines', 'recoverable-tasks'],
    limitations: ['overhead-for-simple-tasks']
  },
  {
    framework: 'multi-agent',
    capabilities: ['parallel-execution', 'specialist-roles', 'collaborative-solving'],
    bestFor: ['research-tasks', 'multi-perspective-analysis', 'comprehensive-reports'],
    limitations: ['higher-cost', 'longer-execution']
  },
  {
    framework: 'debate',
    capabilities: ['adversarial-review', 'bias-detection', 'balanced-perspectives'],
    bestFor: ['controversial-topics', 'quality-critical-outputs', 'nuanced-decisions'],
    limitations: ['slower', 'overkill-for-simple-queries']
  }
];

export class IntelligentRouter {

  async routeToOptimalFramework(prompt: string, context?: ExecutionContext): Promise<RoutingDecision> {
    // 1. Analyze the task
    const analysis = await this.analyzeTask(prompt, context);

    // 2. Score each framework for this task
    const scores = this.scoreFrameworks(analysis);

    // 3. Determine if hybrid approach is better
    const hybridBenefit = this.assessHybridBenefit(analysis, scores);

    // 4. Make routing decision
    if (hybridBenefit.score > scores[0].score * 1.2) {
      // Hybrid is significantly better (20%+ improvement)
      return {
        type: 'hybrid',
        pipeline: hybridBenefit.pipeline,
        reasoning: hybridBenefit.reasoning
      };
    }

    // Single best framework
    return {
      type: 'single',
      framework: scores[0].framework,
      reasoning: `${scores[0].framework} is best for this task: ${scores[0].reasons.join(', ')}`
    };
  }

  private async analyzeTask(prompt: string, context?: ExecutionContext): Promise<TaskAnalysis> {
    // Use fast model (Haiku) to analyze task characteristics
    const analysis = await this.llm.analyze({
      prompt,
      schema: {
        taskType: 'string',           // research, coding, creative, analysis, etc.
        requiredCapabilities: 'string[]', // what the task needs
        complexity: 'simple | moderate | complex',
        estimatedSteps: 'number',
        hasMultiModal: 'boolean',     // needs image/video/audio
        needsLargeContext: 'boolean', // >100k tokens input
        needsStructuredOutput: 'boolean',
        isControversial: 'boolean',
        needsRealTimeData: 'boolean'
      }
    });

    return analysis;
  }

  private scoreFrameworks(analysis: TaskAnalysis): ScoredFramework[] {
    const scores: ScoredFramework[] = [];

    for (const fw of FRAMEWORK_STRENGTHS) {
      let score = 0;
      const reasons: string[] = [];

      // Match required capabilities
      for (const cap of analysis.requiredCapabilities) {
        if (fw.capabilities.includes(cap)) {
          score += 20;
          reasons.push(`has ${cap}`);
        }
      }

      // Match task type to bestFor
      if (fw.bestFor.some(b => analysis.taskType.includes(b))) {
        score += 30;
        reasons.push(`excels at ${analysis.taskType}`);
      }

      // Special case scoring
      if (analysis.needsLargeContext && fw.framework === 'gemini') {
        score += 40;
        reasons.push('needs large context window');
      }

      if (analysis.hasMultiModal && fw.framework === 'gemini') {
        score += 35;
        reasons.push('needs multi-modal processing');
      }

      if (analysis.needsStructuredOutput && fw.framework === 'openai') {
        score += 25;
        reasons.push('needs structured JSON output');
      }

      if (analysis.isControversial && fw.framework === 'debate') {
        score += 40;
        reasons.push('controversial topic benefits from debate');
      }

      if (analysis.complexity === 'complex' && fw.framework === 'claude') {
        score += 30;
        reasons.push('complex reasoning needed');
      }

      scores.push({ framework: fw.framework, score, reasons });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  private assessHybridBenefit(analysis: TaskAnalysis, scores: ScoredFramework[]): HybridAssessment {
    // Check if task has multiple distinct phases
    if (analysis.estimatedSteps < 3) {
      return { score: 0, pipeline: null, reasoning: 'Task too simple for hybrid' };
    }

    // Example: Research + Analysis + Writing benefits from hybrid
    if (
      analysis.requiredCapabilities.includes('research') &&
      analysis.requiredCapabilities.includes('analysis') &&
      analysis.requiredCapabilities.includes('writing')
    ) {
      return {
        score: 85,
        pipeline: {
          stages: [
            { executor: 'gemini', purpose: 'Load large context/documents' },
            { executor: 'multi-agent', purpose: 'Parallel research & analysis' },
            { executor: 'claude', purpose: 'Synthesize and write final output' }
          ]
        },
        reasoning: 'Multi-phase task benefits from specialized frameworks at each stage'
      };
    }

    // Code generation with quality assurance
    if (
      analysis.taskType === 'coding' &&
      analysis.complexity === 'complex'
    ) {
      return {
        score: 75,
        pipeline: {
          stages: [
            { executor: 'claude', purpose: 'Generate code with deep reasoning' },
            { executor: 'debate', purpose: 'Review code quality & edge cases' }
          ]
        },
        reasoning: 'Complex code benefits from generation + adversarial review'
      };
    }

    return { score: 0, pipeline: null, reasoning: 'Single framework sufficient' };
  }
}
```

### Role-Based UI Components

```svelte
<!-- src/lib/components/cortex-flow/CortexFlowInput.svelte -->

<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte.js';

  // Only show advanced options to developers
  const showAdvancedOptions = $derived(authStore.hasRole('developer'));

  let frameworkMode = $state<'auto' | 'manual'>('auto');
  let selectedFramework = $state('claude');
  let selectedPipeline = $state('auto');
</script>

<div class="cortex-input">
  <!-- Simple input always visible -->
  <textarea placeholder="Ask me anything..." bind:value={prompt} />

  <div class="input-actions">
    <button class="submit-btn" onclick={submit}>
      Send
    </button>

    <!-- Advanced options only for developers -->
    {#if showAdvancedOptions}
      <button class="options-btn" onclick={() => showOptions = !showOptions}>
        ⚙️
      </button>
    {/if}
  </div>

  <!-- Developer options panel -->
  {#if showAdvancedOptions && showOptions}
    <div class="developer-options">
      <label>
        Framework Mode
        <select bind:value={frameworkMode}>
          <option value="auto">Auto (Recommended)</option>
          <option value="manual">Manual Selection</option>
        </select>
      </label>

      {#if frameworkMode === 'manual'}
        <label>
          Framework
          <select bind:value={selectedFramework}>
            <option value="claude">Claude (Current)</option>
            <option value="openai">OpenAI Agents</option>
            <option value="gemini">Google Gemini</option>
            <option value="langgraph">LangGraph</option>
            <option value="multi-agent">Multi-Agent</option>
            <option value="debate">Agent Debate</option>
            <option value="pipeline">Custom Pipeline</option>
          </select>
        </label>

        {#if selectedFramework === 'pipeline'}
          <label>
            Pipeline
            <select bind:value={selectedPipeline}>
              <option value="deep-research">Deep Research</option>
              <option value="coding-with-review">Coding with Review</option>
              <option value="multi-perspective">Multi-Perspective Analysis</option>
              <option value="custom">Custom...</option>
            </select>
          </label>
        {/if}
      {/if}

      <label>
        <input type="checkbox" bind:checked={debugMode} />
        Show Debug Console
      </label>
    </div>
  {/if}
</div>
```

### Progress Indicators for End Users

End users see friendly, non-technical progress:

```typescript
// Progress messages for end users (framework-agnostic)
const USER_FRIENDLY_PROGRESS: Record<string, string> = {
  // Internal events → User-friendly messages
  'framework:initializing': 'Starting up...',
  'research:web_search': 'Searching the web...',
  'research:analyzing': 'Analyzing sources...',
  'thinking:extended': 'Thinking deeply...',
  'agent:spawned': 'Getting help from specialists...',
  'debate:round': 'Considering different perspectives...',
  'synthesis:generating': 'Putting it all together...',
  'verification:checking': 'Double-checking facts...',
  'pipeline:stage_complete': 'Making progress...',
};

// Developer sees detailed technical events
const DEVELOPER_PROGRESS: Record<string, string> = {
  'framework:initializing': 'Initializing LangGraph executor...',
  'research:web_search': 'WebSearch tool: 5 queries planned',
  'research:analyzing': 'Processing 12 sources with Gemini',
  'thinking:extended': 'Extended thinking: 15,432 tokens',
  'agent:spawned': 'Spawned explore subagent (Haiku)',
  'debate:round': 'Debate round 2/3: Critic responding',
  'synthesis:generating': 'Claude Opus synthesizing 3 perspectives',
  'verification:checking': 'Guardian L2: Fact-checking 8 claims',
  'pipeline:stage_complete': 'Stage 2/4 complete (research), starting analysis',
};
```

### Summary: UX Philosophy

| Aspect | End User | Developer |
|--------|----------|-----------|
| **Framework selection** | Hidden (Auto) | Full control |
| **Pipeline configuration** | Hidden | Create/edit pipelines |
| **Model choices** | Hidden | Per-stage configuration |
| **Progress indicators** | Friendly ("Searching...") | Technical ("WebSearch: 5 queries") |
| **Debug console** | Hidden | Available on toggle |
| **Cost/token info** | Hidden | Detailed telemetry |
| **Error messages** | Friendly ("Try rephrasing") | Full stack traces |
| **Settings** | Minimal (tone, detail level) | Comprehensive |

This two-tier approach ensures Regno.ai is **approachable for business users** while **powerful for technical users** - the complexity exists but is surfaced only when needed.

---

## Cross-Provider Cost Tracking

A critical challenge with multi-framework support: **different providers have wildly different pricing models**. This section defines how we track, compare, and optimize costs across the ecosystem.

### The Challenge

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRICING MODEL COMPLEXITY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLAUDE                          OPENAI                                     │
│  ├─ Input tokens: $3/M           ├─ Input tokens: $2.50/M (GPT-4o)         │
│  ├─ Output tokens: $15/M         ├─ Output tokens: $10/M                   │
│  ├─ Thinking tokens: $15/M       ├─ Cached: 50% discount                   │
│  └─ Cached: 90% discount         ├─ DALL-E: $0.04/image                    │
│                                  └─ Embeddings: $0.0001/M                   │
│                                                                             │
│  GEMINI                          HYBRID PIPELINES                           │
│  ├─ Input: $1.25/M (Pro)         ├─ Multiple providers per execution       │
│  ├─ Output: $5/M                 ├─ Different token counts per stage       │
│  ├─ Flash: $0.075/M input        └─ Need unified cost view                 │
│  └─ Context caching: $0.315/M/hr                                           │
│                                                                             │
│  KEY QUESTIONS:                                                             │
│  • How to compare Claude thinking tokens vs OpenAI reasoning?              │
│  • Image generation cost vs text cost?                                     │
│  • Cached vs uncached tokens?                                              │
│  • Budget limits across mixed workloads?                                   │
│  • Cost optimization recommendations?                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Solution: Layered Cost System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYERED COST TRACKING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: Foundation (Always On)                                            │
│  ════════════════════════════════                                           │
│  • Real-time USD calculation via pricing registry                           │
│  • Per-execution cost tracking                                              │
│  • Per-provider breakdown                                                   │
│  • Basic budget limits (daily/monthly/per-task)                            │
│                                                                             │
│  LAYER 2: Intelligence (Recommended)                                        │
│  ═══════════════════════════════════                                        │
│  • Capability-based breakdown (reasoning, generation, research...)         │
│  • Framework comparison analytics                                           │
│  • Cost anomaly detection                                                   │
│  • Optimization suggestions                                                 │
│                                                                             │
│  LAYER 3: Optimization (Advanced)                                           │
│  ════════════════════════════════                                           │
│  • Outcome-based cost tracking (cost per successful task)                  │
│  • Quality-adjusted cost metrics                                            │
│  • Automatic framework selection based on cost/quality ratio               │
│  • Predictive budgeting                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Views: End User vs Developer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COST DISPLAY                                    │
├───────────────────────────────┬─────────────────────────────────────────────┤
│                               │                                             │
│  END USER (simple):           │  DEVELOPER (detailed):                      │
│  ┌─────────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ This query: $0.23       │  │  │ Execution Cost Breakdown            │   │
│  │ Today: $4.50 / $50      │  │  │ ├─ Claude Sonnet: $0.18            │   │
│  │ ████████░░ 9%           │  │  │ │  ├─ Input: 2,340 tok ($0.01)     │   │
│  └─────────────────────────┘  │  │ │  ├─ Output: 890 tok ($0.01)      │   │
│                               │  │ │  └─ Thinking: 10.2K ($0.15)      │   │
│                               │  │ ├─ Gemini Flash: $0.04             │   │
│                               │  │ │  └─ Research: 45K tok            │   │
│                               │  │ └─ DALL-E: $0.04 (1 image)         │   │
│                               │  │                                     │   │
│                               │  │ Budget: $12.34 / $50 daily         │   │
│                               │  │                                     │   │
│                               │  │ ⚡ Optimization Suggestion:         │   │
│                               │  │ Could save 30% by using Gemini     │   │
│                               │  │ for initial research pass          │   │
│                               │  └─────────────────────────────────────┘   │
│                               │                                             │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/lib/server/cortex-flow/cost/CostTracker.ts

export class CostTracker {
  private pricingRegistry: PricingRegistry;
  private executionCosts: Map<string, ExecutionCost> = new Map();

  constructor() {
    this.pricingRegistry = new PricingRegistry();
  }

  /**
   * Track usage in real-time during execution
   */
  trackUsage(executionId: string, usage: TokenUsage): void {
    const cost = this.executionCosts.get(executionId) || this.createEmptyCost(executionId);
    const pricing = this.pricingRegistry.get(usage.model);

    // Calculate USD cost
    const usdCost =
      (usage.inputTokens * pricing.input) +
      (usage.outputTokens * pricing.output) +
      (usage.thinkingTokens || 0) * (pricing.thinking || pricing.output) +
      (usage.cachedTokens || 0) * pricing.cachedInput +
      (usage.images || 0) * (pricing.perImage || 0);

    // Update totals
    cost.totalUSD += usdCost;
    cost.byProvider[usage.provider] = (cost.byProvider[usage.provider] || 0) + usdCost;
    cost.byCapability[usage.capability] = (cost.byCapability[usage.capability] || 0) + usdCost;
    cost.breakdown.push({
      timestamp: Date.now(),
      model: usage.model,
      tokens: usage,
      cost: usdCost
    });

    this.executionCosts.set(executionId, cost);

    // Check budget limits
    this.checkBudgetLimits(cost);
  }

  /**
   * For hybrid pipelines - track cost per stage
   */
  trackStage(executionId: string, stageIndex: number, stageName: string, framework: string): CostStage {
    const cost = this.executionCosts.get(executionId);
    if (!cost) throw new Error('Execution not found');

    const stage: CostStage = {
      index: stageIndex,
      name: stageName,
      framework,
      startCost: cost.totalUSD,
      endCost: 0,  // Set when stage completes
    };

    cost.stages.push(stage);
    return stage;
  }

  /**
   * Budget limit enforcement
   */
  private checkBudgetLimits(cost: ExecutionCost): void {
    const dailyUsed = this.getDailyTotal();
    const config = this.getBudgetConfig();

    if (dailyUsed >= config.daily.limit) {
      throw new BudgetExceededError('Daily budget limit reached');
    }

    if (cost.totalUSD >= config.perTask.limit) {
      throw new BudgetExceededError(`Task budget limit ($${config.perTask.limit}) reached`);
    }

    // Emit warning events near limits
    if (dailyUsed >= config.daily.alert) {
      this.emit('budget:warning', {
        type: 'daily',
        used: dailyUsed,
        limit: config.daily.limit
      });
    }
  }

  /**
   * Generate optimization suggestions based on usage patterns
   */
  getOptimizationSuggestions(executionId: string): CostSuggestion[] {
    const cost = this.executionCosts.get(executionId);
    if (!cost) return [];

    const suggestions: CostSuggestion[] = [];

    // Check if expensive model used for simple task
    if (cost.taskComplexity === 'simple' && cost.byProvider['claude'] > 0.10) {
      suggestions.push({
        type: 'cheaper-model',
        message: 'Simple task used premium model. Could save ~70% with Gemini Flash.',
        potentialSavings: cost.byProvider['claude'] * 0.7
      });
    }

    // Check thinking token efficiency
    const thinkingTokens = cost.breakdown
      .filter(b => b.tokens.thinkingTokens)
      .reduce((sum, b) => sum + b.tokens.thinkingTokens!, 0);
    const outputTokens = cost.breakdown
      .reduce((sum, b) => sum + b.tokens.outputTokens, 0);
    const thinkingRatio = thinkingTokens / outputTokens;

    if (thinkingRatio > 20) {
      suggestions.push({
        type: 'thinking-heavy',
        message: `High thinking-to-output ratio (${thinkingRatio.toFixed(1)}:1). Consider reducing thinking budget.`,
        potentialSavings: cost.totalUSD * 0.3
      });
    }

    // Check if large context could use Gemini
    const maxInputTokens = Math.max(...cost.breakdown.map(b => b.tokens.inputTokens));
    if (maxInputTokens > 100000 && !cost.byProvider['gemini']) {
      suggestions.push({
        type: 'large-context',
        message: 'Large context detected. Gemini offers 1M token context at lower cost.',
        potentialSavings: cost.totalUSD * 0.5
      });
    }

    return suggestions;
  }

  /**
   * Historical analytics for dashboard
   */
  async getAnalytics(period: 'day' | 'week' | 'month'): Promise<CostAnalytics> {
    const history = await this.loadHistory(period);

    return {
      totalSpend: history.reduce((sum, h) => sum + h.totalUSD, 0),
      byFramework: this.aggregateByFramework(history),
      byCapability: this.aggregateByCapability(history),
      byTaskType: this.aggregateByTaskType(history),
      averageCostPerTask: this.calculateAverageCost(history),
      trends: this.calculateTrends(history),
      recommendations: this.generateRecommendations(history)
    };
  }
}
```

### Pricing Registry

```typescript
// src/lib/server/cortex-flow/cost/PricingRegistry.ts

export class PricingRegistry {
  private prices: Map<string, ModelPricing> = new Map();
  private lastUpdated: Date;

  constructor() {
    this.loadPrices();
  }

  private loadPrices(): void {
    // Claude Models
    this.prices.set('claude-sonnet-4-20250514', {
      provider: 'anthropic',
      input: 3.00 / 1_000_000,
      output: 15.00 / 1_000_000,
      thinking: 15.00 / 1_000_000,
      cachedInput: 0.30 / 1_000_000,  // 90% discount
    });

    this.prices.set('claude-opus-4-20250514', {
      provider: 'anthropic',
      input: 15.00 / 1_000_000,
      output: 75.00 / 1_000_000,
      thinking: 75.00 / 1_000_000,
      cachedInput: 1.50 / 1_000_000,
    });

    this.prices.set('claude-3-5-haiku-20241022', {
      provider: 'anthropic',
      input: 0.80 / 1_000_000,
      output: 4.00 / 1_000_000,
      cachedInput: 0.08 / 1_000_000,
    });

    // OpenAI Models
    this.prices.set('gpt-4o', {
      provider: 'openai',
      input: 2.50 / 1_000_000,
      output: 10.00 / 1_000_000,
      cachedInput: 1.25 / 1_000_000,  // 50% discount
    });

    this.prices.set('gpt-4o-mini', {
      provider: 'openai',
      input: 0.15 / 1_000_000,
      output: 0.60 / 1_000_000,
      cachedInput: 0.075 / 1_000_000,
    });

    this.prices.set('dall-e-3', {
      provider: 'openai',
      perImage: 0.04,  // Standard 1024x1024
      perImageHD: 0.08,  // 1792x1024
    });

    // Google Models
    this.prices.set('gemini-1.5-pro', {
      provider: 'google',
      input: 1.25 / 1_000_000,
      output: 5.00 / 1_000_000,
      cachedInput: 0.315 / 1_000_000,
    });

    this.prices.set('gemini-1.5-flash', {
      provider: 'google',
      input: 0.075 / 1_000_000,
      output: 0.30 / 1_000_000,
      cachedInput: 0.01875 / 1_000_000,
    });

    this.prices.set('gemini-2.0-flash', {
      provider: 'google',
      input: 0.10 / 1_000_000,
      output: 0.40 / 1_000_000,
      cachedInput: 0.025 / 1_000_000,
    });

    this.lastUpdated = new Date();
  }

  get(model: string): ModelPricing {
    // Try exact match first
    let pricing = this.prices.get(model);

    // Try partial match (e.g., "claude-sonnet-4" matches "claude-sonnet-4-20250514")
    if (!pricing) {
      for (const [key, value] of this.prices) {
        if (key.startsWith(model) || model.startsWith(key.split('-').slice(0, -1).join('-'))) {
          pricing = value;
          break;
        }
      }
    }

    if (!pricing) {
      console.warn(`No pricing found for model: ${model}, using default`);
      return {
        provider: 'unknown',
        input: 0.01 / 1_000_000,
        output: 0.03 / 1_000_000
      };
    }

    return pricing;
  }

  // Allow runtime updates (e.g., from admin panel or API)
  updatePricing(model: string, pricing: ModelPricing): void {
    this.prices.set(model, pricing);
    this.lastUpdated = new Date();
  }
}
```

### Types

```typescript
// src/lib/types/costTracking.ts

export interface TokenUsage {
  model: string;
  provider: 'anthropic' | 'openai' | 'google' | 'langgraph';
  capability: 'reasoning' | 'generation' | 'research' | 'imageGen' | 'embedding';
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  cachedTokens?: number;
  images?: number;
}

export interface ModelPricing {
  provider: string;
  input: number;           // Cost per token
  output: number;          // Cost per token
  thinking?: number;       // Cost per thinking token (Claude)
  cachedInput?: number;    // Cost per cached token
  perImage?: number;       // Cost per image (DALL-E)
  perImageHD?: number;     // Cost per HD image
}

export interface ExecutionCost {
  executionId: string;
  totalUSD: number;
  byProvider: Record<string, number>;
  byCapability: Record<string, number>;
  breakdown: CostBreakdownItem[];
  stages: CostStage[];
  taskComplexity?: 'simple' | 'moderate' | 'complex';
}

export interface CostBreakdownItem {
  timestamp: number;
  model: string;
  tokens: TokenUsage;
  cost: number;
}

export interface CostStage {
  index: number;
  name: string;
  framework: string;
  startCost: number;
  endCost: number;
}

export interface CostSuggestion {
  type: 'cheaper-model' | 'thinking-heavy' | 'large-context' | 'caching-opportunity';
  message: string;
  potentialSavings: number;
}

export interface BudgetConfig {
  daily: { limit: number; alert: number; used: number };
  monthly: { limit: number; alert: number; used: number };
  perTask: { limit: number; alert: number };
}

export interface CostAnalytics {
  totalSpend: number;
  byFramework: Record<string, number>;
  byCapability: Record<string, number>;
  byTaskType: Record<string, number>;
  averageCostPerTask: number;
  trends: { date: string; cost: number }[];
  recommendations: string[];
}
```

### Cost-Aware Routing Integration

The `IntelligentRouter` can use cost data to make smarter decisions:

```typescript
// Enhancement to IntelligentRouter

private scoreFrameworksWithCost(
  analysis: TaskAnalysis,
  budgetRemaining: number
): ScoredFramework[] {
  const scores = this.scoreFrameworks(analysis);

  // Adjust scores based on cost efficiency
  for (const score of scores) {
    const estimatedCost = this.estimateCost(score.framework, analysis);

    // Penalize if would exceed budget
    if (estimatedCost > budgetRemaining) {
      score.score *= 0.1;  // Heavy penalty
      score.reasons.push('exceeds budget');
      continue;
    }

    // Bonus for cost-efficient choices on simple tasks
    if (analysis.complexity === 'simple') {
      const cheapestCost = Math.min(...scores.map(s => this.estimateCost(s.framework, analysis)));
      if (estimatedCost === cheapestCost) {
        score.score *= 1.3;  // 30% bonus for cheapest on simple tasks
        score.reasons.push('most cost-efficient');
      }
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}

private estimateCost(framework: string, analysis: TaskAnalysis): number {
  // Rough estimates based on typical usage patterns
  const estimates: Record<string, Record<string, number>> = {
    'claude': { simple: 0.05, moderate: 0.15, complex: 0.50 },
    'openai': { simple: 0.03, moderate: 0.10, complex: 0.35 },
    'gemini': { simple: 0.01, moderate: 0.04, complex: 0.15 },
    'langgraph': { simple: 0.04, moderate: 0.12, complex: 0.40 },
    'multi-agent': { simple: 0.10, moderate: 0.30, complex: 0.80 },
    'debate': { simple: 0.15, moderate: 0.40, complex: 1.00 },
  };

  return estimates[framework]?.[analysis.complexity] || 0.20;
}
```

### Summary: Cost Tracking Layers

| Layer | What It Tracks | Complexity | Value |
|-------|----------------|------------|-------|
| **L1: USD Tracking** | Real costs, basic budgets | Low | Essential |
| **L2: Capability Breakdown** | Where money goes (reasoning, research, etc.) | Medium | High |
| **L3: Outcome Optimization** | Quality-adjusted ROI, cost per success | High | Long-term |

**Implementation Priority:**
1. **Phase 1**: Layer 1 (USD tracking + budgets) - ship with initial multi-framework support
2. **Phase 2**: Layer 2 (capability breakdown + suggestions) - add after gathering usage data
3. **Phase 3**: Layer 3 (outcome optimization) - requires quality feedback loop

---

## Feature Parity Strategy

Not all frameworks need to support all features. **Specialization is a feature, not a bug** - it informs intelligent routing decisions.

### Guiding Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FEATURE PARITY DECISION FRAMEWORK                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  QUESTION: Should Feature X be implemented in Framework Y?                  │
│                                                                             │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │ Is it feasible? │                                      │
│                    └────────┬────────┘                                      │
│                             │                                               │
│              ┌──────────────┴──────────────┐                                │
│              │ NO                          │ YES                            │
│              ▼                             ▼                                │
│     ┌────────────────┐          ┌─────────────────────┐                    │
│     │ Skip - mark as │          │ Does another        │                    │
│     │ "not supported"│          │ framework do it     │                    │
│     └────────────────┘          │ significantly       │                    │
│                                 │ better (>30%)?      │                    │
│                                 └──────────┬──────────┘                    │
│                                            │                               │
│                         ┌──────────────────┴──────────────────┐            │
│                         │ YES                                 │ NO         │
│                         ▼                                     ▼            │
│              ┌──────────────────────┐           ┌──────────────────────┐   │
│              │ Skip - route to the  │           │ Implement - aim for  │   │
│              │ better framework     │           │ universal support    │   │
│              └──────────────────────┘           └──────────────────────┘   │
│                                                                             │
│  KEY INSIGHT: Feature gaps become routing signals, not limitations.        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feature Classification

#### Tier 1: Universal Features (All Frameworks)

These MUST work consistently across all frameworks:

| Feature | Description | Why Universal |
|---------|-------------|---------------|
| **Basic Tools** | WebSearch, WebFetch, Read, Write, Glob, Grep | Core functionality |
| **SSE Streaming** | Real-time events to UI | UX consistency |
| **Cost Tracking** | Token/cost accounting | Business requirement |
| **Error Handling** | Graceful failures, retries | Reliability |
| **Token Counting** | Usage metrics | Cost control |
| **Timeout Management** | Execution limits | Safety |
| **Cancellation** | User abort support | UX requirement |

```typescript
// Every executor MUST implement these
interface IAgentExecutor {
  // Universal - required
  execute(prompt: string, settings: Settings): Promise<ExecutionResult>;
  cancel(): void;
  onEvent(handler: (event: SSEEvent) => void): void;
  getTokenUsage(): TokenUsage;

  // Framework-specific capabilities - optional
  getCapabilities(): FrameworkCapabilities;
}
```

#### Tier 2: Framework-Specialized Features

These are **intentionally framework-specific** because one framework does them significantly better:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK SPECIALIZATIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  CLAUDE-SPECIFIC                                                       ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  Extended Thinking          │ Unique to Claude - 100K+ thinking tokens ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Guardian L3 Verification   │ Deep reasoning required - Claude excels  ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Active Fact-Checking       │ Nuanced verification - Claude's strength ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Complex Code Analysis      │ Best reasoning for edge cases            ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Nuanced Writing            │ Tone, style, creative quality            ║ │
│  ║                                                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  OPENAI-SPECIFIC                                                       ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  DALL-E Image Generation    │ Native integration - no API juggling    ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Structured JSON Output     │ Native `response_format` support        ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Whisper Transcription      │ Audio → text (native)                   ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Embeddings                 │ text-embedding-3 quality + speed        ║ │
│  ║                                                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  GEMINI-SPECIFIC                                                       ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  1M+ Token Context          │ 10x larger than others - game changer   ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Native Video Analysis      │ Process hours of video directly         ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Audio Processing           │ Native audio understanding              ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Google Search Grounding    │ Real-time web data in responses         ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Google Workspace           │ Docs, Sheets, Drive integration         ║ │
│  ║                                                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  LANGGRAPH-SPECIFIC                                                    ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  Stateful Checkpoints       │ Save/resume execution state             ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Graph Visualization        │ Visual workflow debugging               ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Conditional Branching      │ Complex if/else workflow logic          ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Human-in-the-Loop          │ Built-in pause for human input          ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Time Travel Debugging      │ Replay from any checkpoint              ║ │
│  ║                                                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  MULTI-AGENT SPECIFIC                                                  ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  Parallel Execution         │ Multiple agents working simultaneously  ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Role Specialization        │ Researcher, Analyst, Writer agents      ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Inter-Agent Communication  │ Agents share findings in real-time      ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Consensus Building         │ Multiple agents validate conclusions    ║ │
│  ║                                                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  DEBATE-SPECIFIC                                                       ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                        ║ │
│  ║  Adversarial Review         │ Advocate vs Critic dynamic              ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Bias Detection             │ Multiple perspectives surface bias      ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Steel-Manning              │ Best version of opposing arguments      ║ │
│  ║  ──────────────────────────┼────────────────────────────────────────── ║ │
│  ║  Confidence Calibration     │ Debate reveals true uncertainty         ║ │
│  ║                                                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Tier 3: Best-Effort Features

These are implemented where feasible, but quality may vary:

| Feature | Claude | OpenAI | Gemini | LangGraph | Multi-Agent | Debate |
|---------|--------|--------|--------|-----------|-------------|--------|
| **Guardian L1** (Basic safety) | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Guardian L2** (Fact-check) | ✅ Full | ⚡ Basic | ⚡ Basic | ⚡ Basic | ✅ Good | ✅ Full |
| **Guardian L3** (Deep verify) | ✅ Full | ❌ Skip | ❌ Skip | ❌ Skip | ⚡ Basic | ✅ Good |
| **Extended Thinking** | ✅ Full | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| **Image Generation** | ❌ N/A | ✅ Full | ⚡ Basic | ❌ N/A | ❌ N/A | ❌ N/A |
| **Large Context (>200K)** | ⚡ 200K | ⚡ 128K | ✅ 1M+ | ⚡ Varies | ⚡ Varies | ⚡ Varies |
| **Structured Output** | ⚡ Good | ✅ Native | ⚡ Good | ⚡ Good | ⚡ Good | ⚡ Good |
| **Streaming** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚡ Partial | ⚡ Partial |

Legend: ✅ Full support | ⚡ Partial/Basic | ❌ Not available/Skip

### Capability Declaration

Each executor declares its capabilities, enabling intelligent routing:

```typescript
// src/lib/types/frameworkCapabilities.ts

export interface FrameworkCapabilities {
  // Identity
  framework: string;
  version: string;

  // Core capabilities
  maxContextTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsCancellation: boolean;

  // Specialized features
  features: {
    extendedThinking: boolean | { maxTokens: number };
    imageGeneration: boolean | { models: string[] };
    imageAnalysis: boolean;
    videoAnalysis: boolean;
    audioProcessing: boolean;
    structuredOutput: boolean | { native: boolean };
    embeddings: boolean;

    // Verification features
    guardianL1: boolean;
    guardianL2: boolean;
    guardianL3: boolean;
    factChecking: boolean;

    // Workflow features
    checkpoints: boolean;
    humanInLoop: boolean;
    parallelAgents: boolean;
    debateMode: boolean;
  };

  // Strengths (for routing decisions)
  strengths: string[];

  // Known limitations
  limitations: string[];
}

// Example: Claude executor capabilities
const CLAUDE_CAPABILITIES: FrameworkCapabilities = {
  framework: 'claude',
  version: 'sonnet-4',

  maxContextTokens: 200000,
  supportsStreaming: true,
  supportsTools: true,
  supportsCancellation: true,

  features: {
    extendedThinking: { maxTokens: 128000 },
    imageGeneration: false,
    imageAnalysis: true,
    videoAnalysis: false,
    audioProcessing: false,
    structuredOutput: { native: false },  // Works but not native
    embeddings: false,

    guardianL1: true,
    guardianL2: true,
    guardianL3: true,
    factChecking: true,

    checkpoints: false,
    humanInLoop: false,  // We implement this at orchestration level
    parallelAgents: false,
    debateMode: false,
  },

  strengths: [
    'deep-reasoning',
    'extended-thinking',
    'code-generation',
    'nuanced-writing',
    'complex-analysis',
    'safety-verification'
  ],

  limitations: [
    'no-image-generation',
    'no-native-embeddings',
    'context-smaller-than-gemini'
  ]
};

// Example: Gemini executor capabilities
const GEMINI_CAPABILITIES: FrameworkCapabilities = {
  framework: 'gemini',
  version: '1.5-pro',

  maxContextTokens: 1000000,  // 1M tokens!
  supportsStreaming: true,
  supportsTools: true,
  supportsCancellation: true,

  features: {
    extendedThinking: false,
    imageGeneration: { models: ['imagen-3'] },
    imageAnalysis: true,
    videoAnalysis: true,  // Native!
    audioProcessing: true,  // Native!
    structuredOutput: { native: false },
    embeddings: true,

    guardianL1: true,
    guardianL2: true,  // Basic
    guardianL3: false,  // Skip - Claude does it better
    factChecking: false,  // Skip - not its strength

    checkpoints: false,
    humanInLoop: false,
    parallelAgents: false,
    debateMode: false,
  },

  strengths: [
    'massive-context',
    'video-processing',
    'audio-processing',
    'multimodal',
    'google-integration',
    'cost-efficient'
  ],

  limitations: [
    'less-nuanced-reasoning',
    'weaker-code-generation',
    'no-extended-thinking'
  ]
};
```

### Routing Integration

The `IntelligentRouter` uses capabilities when scoring:

```typescript
// Enhancement to IntelligentRouter

private scoreFrameworksWithCapabilities(
  analysis: TaskAnalysis,
  requiredFeatures: string[]
): ScoredFramework[] {
  const scores: ScoredFramework[] = [];

  for (const [framework, capabilities] of this.frameworkCapabilities) {
    let score = 0;
    const reasons: string[] = [];
    const blockers: string[] = [];

    // Check required features
    for (const feature of requiredFeatures) {
      if (this.hasFeature(capabilities, feature)) {
        score += 25;
        reasons.push(`supports ${feature}`);
      } else {
        // Required feature missing - heavy penalty or block
        if (this.isHardRequirement(feature, analysis)) {
          blockers.push(`missing required: ${feature}`);
        } else {
          score -= 20;
          reasons.push(`lacks ${feature}`);
        }
      }
    }

    // If any blockers, this framework can't be used
    if (blockers.length > 0) {
      scores.push({ framework, score: -1, reasons: blockers, blocked: true });
      continue;
    }

    // Bonus for framework strengths matching task
    for (const strength of capabilities.strengths) {
      if (analysis.requiredCapabilities.includes(strength)) {
        score += 30;
        reasons.push(`strength: ${strength}`);
      }
    }

    // Penalty for known limitations affecting task
    for (const limitation of capabilities.limitations) {
      if (this.limitationAffectsTask(limitation, analysis)) {
        score -= 15;
        reasons.push(`limitation: ${limitation}`);
      }
    }

    scores.push({ framework, score, reasons, blocked: false });
  }

  return scores
    .filter(s => !s.blocked)
    .sort((a, b) => b.score - a.score);
}

// Determine if a feature is absolutely required
private isHardRequirement(feature: string, analysis: TaskAnalysis): boolean {
  // Extended thinking required for complex reasoning tasks
  if (feature === 'extendedThinking' && analysis.complexity === 'complex') {
    return false;  // Preferred but not hard requirement
  }

  // Image generation is hard requirement if explicitly requested
  if (feature === 'imageGeneration' && analysis.requiresImageGen) {
    return true;
  }

  // Large context is hard requirement if input > 200K tokens
  if (feature === 'largeContext' && analysis.estimatedInputTokens > 200000) {
    return true;
  }

  return false;
}
```

### Example Routing Decisions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ROUTING EXAMPLES WITH FEATURES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TASK: "Analyze this 500-page legal document and summarize key points"     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Required: Large context (500 pages ≈ 400K tokens)                         │
│  Routing Decision:                                                          │
│    ❌ Claude - blocked (200K limit)                                        │
│    ❌ OpenAI - blocked (128K limit)                                        │
│    ✅ GEMINI - selected (1M context)                                       │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  TASK: "Generate an image of a futuristic city skyline"                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Required: Image generation                                                 │
│  Routing Decision:                                                          │
│    ❌ Claude - blocked (no image gen)                                      │
│    ✅ OPENAI - selected (DALL-E native)                                    │
│    ⚠️ Gemini - possible (Imagen) but OpenAI better                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  TASK: "Write a complex recursive algorithm with edge case handling"       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Required: Deep reasoning, code generation                                  │
│  Routing Decision:                                                          │
│    ✅ CLAUDE - selected (extended thinking + code strength)                │
│    ⚠️ OpenAI - possible but less nuanced                                  │
│    ⚠️ Gemini - possible but weaker at complex code                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  TASK: "Verify this medical research paper for factual accuracy"           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Required: Guardian L3, fact-checking                                       │
│  Routing Decision:                                                          │
│    ✅ CLAUDE - selected (full Guardian L3 support)                         │
│    ⚠️ Debate - good alternative (adversarial verification)                │
│    ❌ Others - skip (Guardian L3 not supported)                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  TASK: "Analyze this 2-hour video recording of a meeting"                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Required: Video analysis                                                   │
│  Routing Decision:                                                          │
│    ❌ Claude - blocked (no video)                                          │
│    ❌ OpenAI - blocked (no native video)                                   │
│    ✅ GEMINI - selected (native video processing)                          │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  TASK: "Research topic from multiple angles, then write balanced report"   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Required: Multi-perspective, comprehensive research                        │
│  Routing Decision:                                                          │
│    ✅ HYBRID PIPELINE:                                                      │
│       Stage 1: Gemini (load large context/sources)                         │
│       Stage 2: Multi-Agent (parallel research)                             │
│       Stage 3: Debate (ensure balanced perspectives)                       │
│       Stage 4: Claude (synthesize final report)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Summary: Feature Parity Philosophy

| Principle | Description |
|-----------|-------------|
| **Universal Baseline** | All frameworks support core tools, streaming, cost tracking |
| **Intentional Specialization** | Some features stay framework-specific by design |
| **Capability Declaration** | Each executor declares what it can/can't do |
| **Routing Awareness** | IntelligentRouter uses capabilities in decisions |
| **Quality over Parity** | Better to skip than implement poorly |
| **Hybrid Compensation** | Pipelines can combine frameworks to cover gaps |

**The key insight:** Feature gaps aren't limitations - they're **routing signals** that help the system pick the right tool for each job.

---

## Related Documents

- [Cortex Flow Architecture](./CORTEX_FLOW_ARCHITECTURE.md)
- [Review Phase Implementation Plan](../plans/CORTEX_FLOW_REVIEW_PHASE.md)
- [Subagent System Design](../plans/CORTEX_FLOW_SUBAGENTS.md)
