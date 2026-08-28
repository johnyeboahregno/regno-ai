# Gems Registry

Development task gems — feature specs that drive cortex-flow development. Managed via `/gems` command and tracked in `.cortex-flow/gems/registry.json`.

**Last updated:** 2026-02-10

---

## Summary

| # | Gem | Status | Category |
|---|-----|--------|----------|
| 1 | [Agent Memory Profiles](#1-agent-memory-profiles) | Completed | Backend |
| 2 | [Delegation Chains](#2-delegation-chains) | Completed | Backend |
| 3 | [Supervisor Dashboard](#3-supervisor-dashboard) | Completed | Frontend + Backend |
| 4 | [Live Agent Split View](#4-live-agent-split-view) | In Progress | Frontend |
| 5 | [Real-Time Telemetry](#5-real-time-telemetry) | Pending | Architecture |
| 6 | [Video Podcast Agent](#6-video-podcast-agent) | Pending | Agent |
| 7 | [WhatsApp Integration](#7-whatsapp-integration) | Completed | Integration |
| 8 | [AI Companies Article](#8-ai-companies-article) | Completed | Reference |

**Totals:** 5 completed, 1 in progress, 2 pending

---

## 1. Agent Memory Profiles

**Status:** Completed
**Spec:** `.cortex-flow/gems/agent-memory-profiles.md`

### What it does
Per-agent persistent memory scoped by project and user. Each agent remembers facts, preferences, patterns, and errors across sessions. Memories are injected into phase prompts and extracted from outputs automatically.

### How it was implemented

**Service:** `src/lib/server/cortex-flow/services/AgentMemoryService.ts`
- `retrieveMemories(agentSlug, userId, prompt, limit)` — text search + recency weighting
- `saveMemory(agentSlug, userId, memory)` — deduplication, relevance reinforcement
- `pruneStaleMemories(agentSlug, userId, maxAge)` — removes old/low-relevance entries
- `formatMemoriesSection(memories)` — markdown output grouped by category
- MongoDB collection: `cortex_agent_memories`

**API:** `src/routes/api/cortex-flow/memory/agent/+server.ts`
- `GET` — list memories for agent/user
- `POST` — save a new memory
- `DELETE` — delete by content match

**Integration:**
- `src/lib/server/cortex-flow/v2/ContextBuilder.ts` — `retrieveAgentMemory()` injects `## Agent Memory` section into phase prompts
- `src/lib/server/cortex-flow/v2/Orchestrator.ts` — `extractAndSaveAgentMemories()` fires after each phase, extracts bullet-point facts and error patterns

### Where it's used
- Automatically active for all agent-routed executions
- Memories visible in Cortex Supervisor > Agent Memory tab

---

## 2. Delegation Chains

**Status:** Completed
**Spec:** `.cortex-flow/gems/delegation-chains.md`

### What it does
After a phase completes, the system evaluates whether output should be handed off to a different, more specialized agent. Rules support keyword matching, confidence detection, and category triggers.

### How it was implemented

**Service:** `src/lib/server/cortex-flow/services/DelegationEvaluator.ts`
- `evaluate(fromAgentSlug, phaseOutput, prompt)` — checks rules, returns delegation decision
- `matchRule()` — three trigger types: `keyword`, `confidence`, `category`
- CRUD: `listRules()`, `createRule()`, `updateRule()`, `deleteRule()`
- `seedBuiltInRules()` — seeds default research->synthesis->report chains
- `BUILT_IN_DELEGATION_PATTERNS` — 4 pre-configured patterns
- MongoDB collection: `cortex_delegation_rules`

**API:** `src/routes/api/cortex-flow/agents/delegation/+server.ts`
- `GET` — list rules (optional `?from=` filter)
- `POST` — create rule with validation
- `DELETE` — delete rule by from/to slugs

**Integration:**
- `src/lib/server/cortex-flow/v2/Orchestrator.ts` — `checkDelegation()` runs after each phase. Enforces chain depth limit (max 5). Injects delegation phases into the plan. Tracks chain in `plan.metadata.delegationChain`.
- `src/lib/server/cortex-flow/v2/OrchestratorWorker.ts` — passes `enableDelegation` from settings
- `src/lib/types/cortexFlow.ts` — `advanced.enableDelegation` setting
- `src/lib/components/cortex-flow/SystemStatusPanel.svelte` — toggle in Execution Settings
- `src/lib/components/cortex-flow/AppHeader.svelte` — wires toggle to store

### Where it's used
- Automatically active during plan execution (can be toggled off in SystemStatusPanel)
- Delegation rules managed in Cortex Supervisor > Delegation tab
- Events emitted as `delegation_started` via Redis pub/sub

---

## 3. Supervisor Dashboard

**Status:** Completed
**Spec:** `.cortex-flow/gems/supervisor-dashboard.md`

### What it does
Bird's-eye kanban view of all active cortex-flow executions. Three columns (Queued, Running, Completed) with live-updating cards showing agent, progress, elapsed time.

### How it was implemented

**Components:**
- `src/lib/components/cortex-flow/SupervisorDashboard.svelte` — 3-column kanban, refresh button, card click navigation
- `src/lib/components/cortex-flow/DashboardTaskCard.svelte` — status dot, agent badge, progress bar, elapsed time

**API:**
- `src/routes/api/cortex-flow/dashboard/+server.ts` — `GET` queries MongoDB for last 24h executions, groups by status
- `src/routes/api/cortex-flow/dashboard/stream/+server.ts` — SSE endpoint subscribing to `CHANNELS.CORTEX_FLOW_ALL`, 30s heartbeat

**Store:** `src/lib/stores/cortexFlowStore.svelte.ts`
- `DashboardExecution` interface
- `loadDashboardExecutions()`, `connectToDashboardStream()`, `disconnectDashboardStream()`
- `handleDashboardEvent()` — processes real-time status updates

**Lab app:** `src/routes/lab/cortex-supervisor/+page.svelte`
- Registered in `src/lib/components/apps/LabApp.svelte` as "Cortex Supervisor" (Eye icon, orange, 2nd in list)
- Three tabs: Dashboard, Delegation, Agent Memory

### Where it's used
- Accessible at `/lab/cortex-supervisor` within Regno Labs

---

## 4. Live Agent Split View

**Status:** In Progress
**Spec:** `.cortex-flow/gems/live-agent-split-view.md`

### What it does
Split-pane UI showing multiple agent executions side-by-side with independent SSE streams for real-time monitoring.

### How it was implemented (partial)

**Components (built but orphaned):**
- `src/lib/components/cortex-flow/AgentSplitView.svelte` — resizable split panes with mouse-drag dividers
- `src/lib/components/cortex-flow/AgentPane.svelte` — per-pane SSE connection, status indicators, message streaming

**Store:** `src/lib/stores/cortexFlowStore.svelte.ts`
- `SplitPane` interface, `splitPanes` state
- `addSplitPane(executionId)` — max 4 panes, duplicate prevention
- `removeSplitPane(index)` — auto-switches viewMode when last pane removed

### What's missing
- **Not rendered anywhere** — removed from CortexFlowApp.svelte during refactor, never re-wired into Supervisor page
- Needs a host page that conditionally renders `AgentSplitView` when `viewMode === 'split'`
- SupervisorDashboard calls `addSplitPane()` + `setViewMode('split')` but nothing renders the split view

---

## 5. Real-Time Telemetry

**Status:** Pending
**Spec:** `.cortex-flow/gems/real-time telemetry.md`

### What it does
AI agents providing real-time feedback on fast telemetric data. Proposes a "Fast & Slow" hierarchical architecture with stream processing (fast layer) and AI reasoning (slow layer).

### Implementation
Not started.

---

## 6. Video Podcast Agent

**Status:** Pending
**Spec:** `.cortex-flow/gems/video.md`

### What it does
AI agent that watches video podcasts, transcribes with speaker diarization, and generates structured summaries. Includes a test suite of 5 podcast categories.

### Implementation
Not started.

---

## 7. WhatsApp Integration

**Status:** Completed
**Spec:** `.cortex-flow/gems/whatsapp-integration.md`

### What it does
Two-way WhatsApp Business API integration. Users send a message via WhatsApp, which triggers a cortex-flow AI agent execution. The formatted result is sent back as a WhatsApp reply with smart chunking.

### How it was implemented

**Core service:** `src/lib/server/services/WhatsAppService.ts`
- `sendTextMessage()`, `sendMediaMessage()` — Meta Cloud API (configurable version)
- `formatCortexFlowOutput()` — HTML-to-WhatsApp text conversion (bold, italic, links, lists, tables)
- Smart chunking at 4096 char limit with paragraph boundary detection
- Credential caching (5-minute TTL) from MongoDB
- HMAC-SHA256 signature verification for webhooks
- Execution tracking in `whatsapp_executions` collection

**Webhook:** `src/routes/api/whatsapp/webhook/+server.ts`
- `GET` — Meta subscription verification
- `POST` — incoming message handler (signature verify, user lookup by phone, permission check, cortex-flow job submission)

**Credentials:**
- `src/routes/api/credentials/whatsapp/+server.ts` — GET, POST
- `src/routes/api/credentials/whatsapp/[id]/+server.ts` — GET, PUT, DELETE
- `src/routes/api/credentials/whatsapp/test/+server.ts` — POST (test connection)
- `src/lib/server/services/mongoCredentials.ts` — encrypted storage (accessToken, appSecret, webhookVerifyToken)

**Queue integration:**
- `src/lib/server/queues/workers/NotificationWorker.ts` — `handleWhatsApp()` method, HTML formatting, chunked delivery
- `src/lib/server/services/queuedNotificationService.ts` — `sendWhatsAppNotification()` helper

**Orchestrator hook:** `src/lib/server/cortex-flow/v2/OrchestratorWorker.ts`
- Detects `metadata.source === 'whatsapp'` after execution
- Auto-sends formatted results back to WhatsApp user
- Updates execution status in MongoDB

**Frontend:**
- `src/lib/components/WhatsAppCredentialForm.svelte` — credential form with test button
- `src/lib/services/whatsAppCredentialsService.ts` — client-side CRUD service

### Where it's used
- Incoming: Meta webhook → `/api/whatsapp/webhook` → cortex-flow v2 job
- Outgoing: OrchestratorWorker post-execution hook + NotificationWorker queue jobs
- Admin: Credential management in admin panel

---

## 8. AI Companies Article

**Status:** Completed
**Spec:** `.cortex-flow/gems/AI companies want you to stop chatting with bots and start managing them.md`

### What it does
Source article from Anthropic/OpenAI about managing teams of AI agents. Used as inspiration to generate the four core multi-agent gems (1-4).

### Implementation
No direct implementation — reference material only.

---

## How Gems Work

### File structure
```
.cortex-flow/gems/
  registry.json          # Status tracking for all gems
  agent-memory-profiles.md
  delegation-chains.md
  supervisor-dashboard.md
  live-agent-split-view.md
  real-time telemetry.md
  video.md
  whatsapp-integration.md
  AI companies want you to stop chatting with bots and start managing them.md
```

### Management
- `/gems` — interactive menu (Create, Status, Implement)
- `/gems status` — status table
- `/gems create` — create a new gem interactively
- `/gems implement` — pick a pending gem to work on
- API: `GET/PATCH /api/cortex-flow/dev-tasks` — programmatic access

### Lifecycle
1. Drop a `.md` spec file in `.cortex-flow/gems/`
2. `/gems` auto-syncs the registry
3. Pick a gem via `/gems implement`
4. Implement, update registry status to `completed`
5. Update this doc (`doc/gems.md`)
