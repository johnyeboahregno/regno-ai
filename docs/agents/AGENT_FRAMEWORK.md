# Agent Framework

## Overview

The Agent Framework provides specialized, pre-built workflows (agents) that automatically activate based on user prompts. Agents are implemented as Cortex plans with intelligent routing and self-correction capabilities.

## Status: Fully Implemented

All components are complete and integrated.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Prompt                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AgentRouter                                 │
│  • Analyzes prompt (intent, URLs, file refs)                     │
│  • Queries AgentRegistry for matching agents                     │
│  • Uses LLM for nuanced selection (confidence scoring)           │
│  • Returns agent + chain if confidence >= 0.7                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (if confidence >= 0.7)
┌─────────────────────────────────────────────────────────────────┐
│                     AgentExecutor                                │
│  • Validates agent requirements (tools, auth)                    │
│  • Converts agent definition → Cortex Plan                       │
│  • Interpolates {{userPrompt}}, {{previousOutput}}               │
│  • Handles self-correction on phase failures                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Existing Infrastructure                        │
│  PlanEngine → Orchestrator → PhaseRunner → Tools                 │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Files

| Component | File | Description |
|-----------|------|-------------|
| Agent Types | `src/lib/types/cortexFlow.ts` | AgentDefinition, AgentRoute, etc. |
| Agent Registry | `src/lib/server/cortex-flow/services/AgentRegistryService.ts` | MongoDB CRUD |
| Agent Router | `src/lib/server/cortex-flow/services/AgentRouter.ts` | LLM-based routing |
| Agent Executor | `src/lib/server/cortex-flow/services/AgentExecutor.ts` | Plan conversion |
| VideoFetch Tool | `src/lib/server/cortex-flow/tools/VideoFetchTool.ts` | yt-dlp integration |
| AudioTranscribe | `src/lib/server/cortex-flow/tools/AudioTranscribeTool.ts` | Whisper API |
| Tool Registration | `src/lib/server/cortex-flow/ToolRegistry.ts` | VideoFetch, AudioTranscribe |
| PlanEngine Integration | `src/lib/server/cortex-flow/v2/PlanEngine.ts` | Auto-routing |
| API Endpoints | `src/routes/api/cortex-flow/agents/+server.ts` | CRUD operations |
| Execute Endpoint | `src/routes/api/cortex-flow/agents/execute/+server.ts` | Direct execution |
| Agent Builder UI | `src/lib/components/cortex-flow/AgentBuilder.svelte` | User creation |
| Seed Script | `scripts/seed-system-agents.cjs` | System agents |

---

## Activation

### 1. Seed System Agents (Required Once)

Run the seed script to populate the database with built-in agents:

```bash
node scripts/seed-system-agents.cjs
```

This creates 8 system agents:

| Agent | Slug | Triggers On |
|-------|------|-------------|
| Video Intelligence Scout | `video-intelligence-scout` | youtube, video, keynote, presentation |
| Deep Research Agent | `deep-research-agent` | research, investigate, analyze market |
| Document Analyst | `document-analyst` | pdf, document, file analysis |
| Code Explorer | `code-explorer` | codebase, code review, architecture |
| Report Generator | `report-generator` | report, document, write summary |
| Market Research Agent | `market-research-agent` | market, competitive, industry |
| Document Synthesis Agent | `document-synthesis-agent` | multiple documents, compare files |
| Code Auditor Agent | `code-auditor-agent` | security, audit, vulnerability |

### 2. Automatic Activation

Once agents are seeded, routing happens **automatically** in PlanEngine:

```typescript
// In PlanEngine.ts - this happens automatically
const agentRoute = await agentRouter.routePrompt(prompt, context);
if (agentRoute && agentRoute.confidence >= 0.7) {
  return agentExecutor.createPlanFromRoute(agentRoute, context);
}
// Falls back to standard plan generation if no confident match
```

### 3. Skip Agent Routing (Optional)

To bypass agent routing for a specific request:

```typescript
const plan = await planEngine.generate(prompt, {
  settings,
  skipAgentRouting: true  // Use standard planning only
});
```

---

## Verifying Agents Are Active

### Check if Agents Exist in Database

```bash
# Using mongosh
mongosh
use regno
db.cortex_agents.find({ createdBy: 'system' }).count()
# Should return 8
```

### Check Agent Routing in Logs

When an agent activates, PlanEngine logs:
```
[PlanEngine] Agent routed: Video Intelligence Scout (confidence: 0.85)
[PlanEngine] Agent reasoning: Prompt mentions YouTube URL and asks for analysis
```

### API Check

```bash
# List all agents
curl -X GET "http://localhost:5173/api/cortex-flow/agents" \
  -H "Authorization: Bearer <token>"

# Execute specific agent
curl -X POST "http://localhost:5173/api/cortex-flow/agents/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "agentSlug": "video-intelligence-scout",
    "prompt": "Analyze NVIDIA GTC 2024 keynote",
    "settings": {...}
  }'
```

---

## System Agents

### Video Intelligence Scout

**Triggers:** youtube, video, keynote, presentation, earnings call

**Phases:**
1. **Discovery** - Search for official video, validate source
2. **Extraction** - Extract audio with VideoFetch, transcribe with AudioTranscribe
3. **Analysis** - Strategic insights with timestamp references
4. **Report** - Generate intelligence report with DocumentRender

**Example prompt:**
```
"Analyze Jensen Huang's GTC 2024 keynote for robotics announcements"
```

### Deep Research Agent

**Triggers:** research, investigate, analyze, market study

**Phases:**
1. **Discovery** - Find authoritative sources
2. **Collection** - Gather data from multiple sources
3. **Analysis** - Synthesize findings
4. **Report** - Structured research output

**Example prompt:**
```
"Research the current state of solid-state batteries for EVs"
```

### Document Analyst

**Triggers:** pdf, document, file, analyze this

**Phases:**
1. **Ingestion** - Read document(s) with PdfRead
2. **Extraction** - Key data extraction
3. **Analysis** - Content analysis
4. **Summary** - Structured findings

**Example prompt:**
```
"Analyze the attached SEC filing for risk factors"
```

---

## Creating Custom Agents

### Via API

```typescript
// POST /api/cortex-flow/agents
const agent = {
  name: "My Custom Agent",
  slug: "my-custom-agent",
  description: "Does something specific",
  icon: "star",
  category: "research",
  triggers: {
    keywords: ["custom", "specific"],
    patterns: ["do.*specific.*thing"],
    intentTypes: ["analysis"]
  },
  capabilities: {
    inputs: ["text", "url"],
    outputs: ["markdown"],
    tools: ["WebSearch", "WebFetch"],
    modelTiers: ["analyst"]
  },
  planTemplate: {
    phases: [
      {
        id: "phase1",
        name: "Research Phase",
        promptTemplate: "Research {{userPrompt}}",
        tools: ["WebSearch"],
        modelTier: "analyst",
        onFailure: "retry",
        maxRetries: 2
      }
    ],
    maxRetries: 3,
    selfCorrection: true
  },
  chaining: {
    canChainTo: ["report-generator"],
    canChainFrom: []
  },
  isPublic: false
};
```

### Via UI

Use the AgentBuilder component:
```svelte
<script>
  import AgentBuilder from '$lib/components/cortex-flow/AgentBuilder.svelte';
</script>

<AgentBuilder on:save={handleAgentSave} />
```

---

## Template Variables

Agent phase prompts support these placeholders:

| Variable | Description |
|----------|-------------|
| `{{userPrompt}}` | Original user prompt |
| `{{previousOutput}}` | Output from previous agent in chain |
| `{{previousPhaseOutput}}` | Output from previous phase |
| `{{chainPosition}}` | Position in agent chain (1, 2, 3...) |
| `{{chainLength}}` | Total agents in chain |
| `{{timestamp}}` | Current ISO timestamp |

---

## Failure Handling

Each phase can specify `onFailure`:

| Action | Behavior |
|--------|----------|
| `retry` | Simple retry with delay |
| `self-correct` | LLM analyzes failure, modifies prompt |
| `skip` | Continue to next phase |
| `abort` | Stop execution |

Self-correction uses the Retry Strategist for intelligent error recovery.

---

## Related Documentation

- [Agent OS Architecture](./AGENT_OS_ARCHITECTURE.md) - Overall architecture
- [Retry Strategist](./RETRY_STRATEGIST.md) - Error recovery
- [Pattern Learner](./PATTERN_LEARNER.md) - Learning from executions
