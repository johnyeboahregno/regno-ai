# Cortex Flow Phase 2: Subagent System

## Overview

The Subagent System brings Claude Code-style Task tool functionality to Cortex Flow, enabling the AI to spawn specialized child agents for parallel research, code exploration, and delegated tasks. This significantly enhances Regno.ai's capabilities for complex, multi-step operations.

## What This Functionality Provides

### 1. **Parallel Research & Exploration**
Instead of sequential tool calls, Cortex Flow can now spawn multiple subagents to:
- Search multiple topics simultaneously
- Explore different parts of a codebase in parallel
- Gather information from multiple sources concurrently

### 2. **Cost Optimization**
Subagents use model-appropriate selection:
- **Haiku** for fast, simple tasks (explore, bash) - 10x cheaper than Sonnet
- **Sonnet** for complex reasoning (plan, research, general)
- Reduced thinking budgets for child agents

### 3. **Specialized Task Handling**
Each subagent type has optimized tools and prompts:
- **Explore**: Fast codebase navigation with Read, Glob, Grep
- **Plan**: Architecture design with documentation access
- **Bash**: System command execution
- **Research**: Web research with WebSearch, WebFetch
- **General**: Full toolkit for complex tasks

### 4. **Claude Code Parity**
Matches Claude Code's Task tool capabilities for:
- Delegating complex subtasks
- Background task execution
- Progress tracking and status reporting

---

## How It Enhances Regno.ai

### Research Quality
- **Before**: Sequential web searches, one at a time
- **After**: 3-5 parallel research agents gathering information simultaneously

### Codebase Analysis
- **Before**: Single-threaded file exploration
- **After**: Explore subagents can fan out across directories in parallel

### Document Generation
- **Before**: Research, then write, sequentially
- **After**: Research subagent gathers sources while main agent plans document structure

### Cost Efficiency
- **Typical savings**: 30-50% on research-heavy tasks
- Haiku subagents for exploration: ~$0.001 per search vs $0.01 with Sonnet

---

## Settings Configuration

### Location in UI
**Settings > Advanced > Subagent Settings**

### Available Settings

```typescript
subagents: {
  enabled: boolean;          // Master toggle for Task tool
  maxConcurrent: number;     // Max parallel subagents (1-5)
  allowedTypes: string[];    // Which subagent types can be spawned
  maxTotalCost: number;      // Budget limit for all subagents ($)
  inheritCredentials: boolean; // Pass API credentials to children
}
```

### Setting Descriptions

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable the Task tool entirely |
| `maxConcurrent` | `3` | Maximum parallel subagents (higher = faster but more API calls) |
| `allowedTypes` | `['explore', 'research', 'general']` | Which subagent types are permitted |
| `maxTotalCost` | `$5` | Combined budget limit for all subagents in one execution |
| `inheritCredentials` | `true` | Whether subagents use parent's API credentials |

### Advanced Settings

```typescript
advanced: {
  allowSubagents: boolean;  // Set to false to disable (prevents recursion in subagents)
}
```

---

## Preset Configurations

Each preset is optimized with appropriate subagent settings:

### Quick Answer
```
Subagents: DISABLED
Reason: Speed-focused, subagents add latency
```

### Research
```
Subagents: ENABLED
Max Concurrent: 3
Allowed Types: explore, research, general
Max Cost: $5
```

### Deep Research
```
Subagents: ENABLED
Max Concurrent: 5
Allowed Types: ALL (explore, plan, bash, research, general)
Max Cost: $10
```
This is the most powerful preset for comprehensive research.

### Document Generation
```
Subagents: ENABLED
Max Concurrent: 2
Allowed Types: explore, research
Max Cost: $3
```

### Code Analysis
```
Subagents: ENABLED
Max Concurrent: 4
Allowed Types: explore, plan, bash, general
Max Cost: $5
```
The `explore` subagent is particularly valuable for fast codebase navigation.

### Creative Writing
```
Subagents: DISABLED
Reason: Creative focus, not research-dependent
```

### Data Analysis
```
Subagents: ENABLED
Max Concurrent: 2
Allowed Types: explore, bash
Max Cost: $5
```

### Interview Prep
```
Subagents: ENABLED
Max Concurrent: 3
Allowed Types: explore, research
Max Cost: $5
```

---

## Subagent Types Reference

### Explore
- **Model**: claude-3-5-haiku-20241022 (fast, cheap)
- **Tools**: Read, Glob, Grep
- **Max Iterations**: 15
- **Thinking Budget**: 8,000 tokens
- **Use For**: Finding files, searching code, understanding codebase structure

### Plan
- **Model**: claude-sonnet-4-20250514
- **Tools**: Read, Glob, Grep, WebSearch
- **Max Iterations**: 20
- **Thinking Budget**: 16,000 tokens
- **Use For**: Architecture design, implementation planning, trade-off analysis

### Bash
- **Model**: claude-3-5-haiku-20241022 (fast, cheap)
- **Tools**: Bash only
- **Max Iterations**: 10
- **Thinking Budget**: 8,000 tokens
- **Use For**: Git operations, npm/pip commands, system tasks

### Research
- **Model**: claude-sonnet-4-20250514
- **Tools**: WebSearch, WebFetch
- **Max Iterations**: 25
- **Thinking Budget**: 16,000 tokens
- **Use For**: Web research, information gathering, source verification

### General
- **Model**: claude-sonnet-4-20250514
- **Tools**: All tools (Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Bash)
- **Max Iterations**: 30
- **Thinking Budget**: 16,000 tokens
- **Use For**: Complex multi-step tasks, full-capability delegation

---

## Usage Examples

### Example 1: Parallel Research
```
User: Research the top 3 JavaScript frameworks for building dashboards

AI Response: I'll spawn research subagents to investigate each framework in parallel.

[Spawns 3 research subagents]
- Subagent 1: Researching React dashboard capabilities
- Subagent 2: Researching Vue dashboard capabilities
- Subagent 3: Researching Angular dashboard capabilities

[Results consolidated into comprehensive comparison]
```

### Example 2: Codebase Exploration
```
User: Find all authentication-related files in this project

AI Response: I'll use explore subagents to search different areas.

[Spawns 2 explore subagents]
- Subagent 1: Searching src/ for auth patterns
- Subagent 2: Searching lib/ for auth patterns

[Results: Found 12 files across src/auth, src/middleware, lib/security]
```

### Example 3: Background Task
```
User: Analyze this large codebase while I continue working

AI Response: I'll start a background task for the analysis.

[Task started in background]
Task ID: abc-123
You can continue working. I'll notify you when complete.
```

---

## API Reference

### SSE Events

The subagent system emits these SSE events for real-time UI updates:

```typescript
// When a subagent starts
interface SSESubagentStartEvent {
  type: 'subagent_start';
  subagentId: string;
  subagentType: 'explore' | 'plan' | 'bash' | 'research' | 'general';
  description: string;
  parentExecutionId: string;
}

// Progress updates
interface SSESubagentProgressEvent {
  type: 'subagent_progress';
  subagentId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: string;
  iteration: number;
  maxIterations: number;
}

// When a subagent completes
interface SSESubagentCompleteEvent {
  type: 'subagent_complete';
  subagentId: string;
  success: boolean;
  resultSummary: string;
  stats: {
    iterations: number;
    toolCalls: number;
    duration: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}
```

### Tool Definitions

```typescript
// Task tool - spawns subagents
{
  name: 'Task',
  parameters: {
    subagent_type: 'explore' | 'plan' | 'bash' | 'research' | 'general',
    prompt: string,           // Task description
    description: string,      // Short 3-5 word summary
    model?: 'haiku' | 'sonnet' | 'opus',  // Optional override
    max_turns?: number,       // Optional iteration limit
    run_in_background?: boolean  // Background execution
  }
}

// TaskOutput tool - check background task results
{
  name: 'TaskOutput',
  parameters: {
    task_id: string,          // Task ID from background task
    block?: boolean,          // Wait for completion (default: true)
    timeout?: number          // Timeout in ms (default: 30000)
  }
}
```

---

## Files Created/Modified

### New Files
- `src/lib/types/subagent.ts` - Type definitions
- `src/lib/server/cortex-flow/SubagentManager.ts` - Subagent lifecycle management
- `src/lib/server/cortex-flow/tools/TaskTool.ts` - Task and TaskOutput tools
- `src/lib/components/cortex-flow/SubagentStatusPanel.svelte` - UI component

### Modified Files
- `src/lib/types/cortexFlow.ts` - Added subagent settings and SSE events
- `src/lib/server/cortex-flow/CortexFlowExecutor.ts` - Integrated TaskTool
- `src/lib/stores/cortexFlowStore.svelte.ts` - Subagent state tracking
- `src/lib/components/cortex-flow/CortexFlowApp.svelte` - UI integration
- `scripts/seed-cortex-flow-presets.cjs` - Updated presets with subagent settings

---

## Verification Checklist

1. **Basic Spawn**: Ask "Search the codebase for authentication handlers"
   - Should spawn `explore` subagent
   - SubagentStatusPanel should show progress
   - Results should be returned

2. **Parallel Subagents**: Ask "Research React vs Vue, and find our frontend framework"
   - Should spawn multiple subagents in parallel
   - Both should show in status panel
   - Results should be consolidated

3. **Background Task**: Use `run_in_background: true`
   - Should return immediately with task ID
   - TaskOutput should retrieve results

4. **Cost Control**: Verify costs
   - Haiku used for explore/bash
   - Reduced thinking budgets
   - Cost tracking per subagent

5. **Preset Integration**: Select "Deep Research" preset
   - Subagents should be enabled with 5 concurrent limit
   - All types should be available

---

## Version History

- **v1.0** (Phase 2) - Initial implementation with 5 subagent types, SSE events, UI panel
