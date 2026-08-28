# Context Curator

## Overview

The Context Curator is a foundational "Memory & Learning" meta-agent that provides intelligent context management across the agent system. It integrates with all three Cortex databases to deliver semantic memory, entity relationships, and session state management.

## Location

```
src/lib/server/cortex-flow/agents/ContextCurator.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONTEXT CURATOR                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SEMANTIC MEMORY (Qdrant)                           │   │
│  │  • findSimilarWork() - Vector similarity search                       │   │
│  │  • rememberExecution() - Store execution with embeddings              │   │
│  │  • forgetExecution() - Delete from memory                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   ENTITY RELATIONSHIPS (Neo4j)                        │   │
│  │  • findRelatedEntities() - Graph traversal                            │   │
│  │  • trackEntity() - Store entity nodes                                 │   │
│  │  • linkEntities() - Create relationship edges                         │   │
│  │  • getUserEntityGraph() - Get user's knowledge graph                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     SESSION STATE (MongoDB)                           │   │
│  │  • saveCheckpoint() - Checkpoint long-running execution               │   │
│  │  • getLatestCheckpoint() - Retrieve for resumption                    │   │
│  │  • deleteCheckpoint() - Clear after completion                        │   │
│  │  • buildConversationSummary() - Summarize session history             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Collections

### MongoDB Collections

| Collection | Purpose | TTL |
|------------|---------|-----|
| `cortex_memories` | Execution memories with insights | Optional (configurable) |
| `cortex_checkpoints` | Session checkpoints for resumption | 24 hours |
| `cortex_entities` | Entity nodes (synced to Neo4j) | None |

### Qdrant Collection

- `cortex_patterns` - Vector embeddings for semantic search (shared with CortexPatternStore)

### Neo4j Nodes & Relationships

**Node Types:**
- `user` - User profiles
- `project` - Projects/tasks
- `topic` - Research topics
- `tool` - Tools used
- `source` - Data sources accessed
- `concept` - Abstract concepts
- `person` - People mentioned in research
- `company` - Companies/organizations
- `product` - Products mentioned
- `location` - Geographic locations

**Relationship Types:**
- `WORKS_ON` - User → Project
- `RESEARCHED` - User → Topic
- `USES` - Execution → Tool
- `RELATED_TO` - Entity → Entity (co-occurrence)
- `LEARNED_FROM` - Entity → Source
- `CITED` - Output → Source

## Main API

### curate()

The primary entry point for context enrichment.

```typescript
const context = await contextCurator.curate(prompt, {
  userId: 'user123',
  sessionId: 'sess456',
  maxSimilarWork: 5,
  maxRelatedEntities: 10,
  similarityThreshold: 0.65,
  includeSemanticSearch: true,
  includeGraphSearch: true,
  includeCheckpoints: true,
  domain: 'market-research',
  tags: ['tesla', 'earnings'],
  maxAge: 30 // days
});
```

**Returns:**
```typescript
interface CuratedContext {
  // Semantic matches from Qdrant
  similarWork: Array<{
    memory: ExecutionMemory;
    similarity: number;
    relevantInsights: string[];
  }>;

  // Graph connections from Neo4j
  relatedEntities: EntityNode[];
  entityPaths: Array<{ from: EntityNode; to: EntityNode; path: EntityRelation[] }>;

  // Session continuity from MongoDB
  recentCheckpoint?: SessionCheckpoint;
  conversationSummary?: string;

  // Synthesized for prompt injection
  contextSummary: string;
  suggestedApproach?: string;

  // Stats
  searchTime: number;
  sourcesQueried: number;
}
```

### rememberExecution()

Store an execution for future recall.

```typescript
await contextCurator.rememberExecution({
  executionId: 'exec123',
  userId: 'user123',
  prompt: 'Research Tesla Q4 earnings',
  outcome: 'success', // 'success' | 'partial' | 'failed'
  insights: [
    'Q4 revenue was $25.17B',
    'Cybertruck deliveries started in November'
  ],
  toolsUsed: ['WebSearch', 'WebFetch', 'DocumentRender'],
  sourcesAccessed: ['bloomberg.com', 'tesla.com'],
  duration: 45000,
  tokenCost: 12500,
  domain: 'market-research',
  category: 'earnings-analysis',
  tags: ['tesla', 'earnings', 'automotive', 'q4-2024']
}, { ttlDays: 90 }); // Optional TTL
```

### saveCheckpoint()

Save checkpoint for long-running execution.

```typescript
const checkpointId = await contextCurator.saveCheckpoint({
  sessionId: 'sess123',
  executionId: 'exec456',
  userId: 'user789',
  phase: 'Research',
  phaseIndex: 2,
  progress: 65, // percentage
  partialOutput: 'Found 5 relevant sources...',
  toolResults: [
    { name: 'WebSearch', success: true, summary: 'Found 12 results' }
  ],
  discoveredEntities: ['Tesla', 'Elon Musk', 'Cybertruck'],
  resumePrompt: 'Continue researching Tesla earnings...',
  remainingPhases: 3,
  reason: 'auto' // 'auto' | 'user_pause' | 'error' | 'timeout'
});
```

### trackEntity() & linkEntities()

Build knowledge graph.

```typescript
// Track an entity
const entityId = await contextCurator.trackEntity({
  type: 'topic',
  name: 'Electric Vehicles',
  properties: {
    industry: 'automotive',
    subTopics: ['batteries', 'charging', 'range']
  }
});

// Link entities
await contextCurator.linkEntities({
  fromId: 'entity_user_abc123',
  toId: entityId,
  type: 'RESEARCHED',
  weight: 0.9,
  metadata: { timestamp: new Date(), depth: 'comprehensive' }
});
```

## Integration Points

### PlanEngine Integration

Context is curated before plan generation:

```typescript
// In PlanEngine.generate()
const curatedContext = await contextCurator.curate(prompt, {
  userId: context.userId,
  sessionId: context.sessionId,
  // ...options
});

// Enrich prompt with context
const enrichedPrompt = this.enrichPromptWithContext(prompt, curatedContext);

// Generate plan with enriched prompt
const plan = await this.generatePlan(enrichedPrompt, ...);
```

### Orchestrator Integration

Memory is stored after execution completes:

```typescript
// In Orchestrator
// After each phase
if (this.enableMemory && this.sessionId) {
  await this.saveExecutionCheckpoint(result, phase, phaseIndex);
}

// On completion
if (this.state.status === 'completed') {
  await this.rememberExecution();
  await this.clearCheckpoint();
}

// On failure
if (!result.success) {
  await this.saveErrorCheckpoint(result, phase, phaseIndex);
}
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXECUTION LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. PLAN GENERATION
   User Prompt → Context Curator.curate() → Enriched Prompt → PlanEngine

2. EXECUTION
   Phase 1 → Checkpoint + Entity Tracking → Phase 2 → ... → Phase N

3. ENTITY TRACKING (per phase)
   Phase Output → Extract Entities → Classify Type → Track to Neo4j → Link Entities

4. COMPLETION
   Success → rememberExecution() + clearCheckpoint()
   Failure → saveErrorCheckpoint()
   Pause   → savePauseCheckpoint()

5. FUTURE EXECUTION
   New Prompt → curate() finds similar work + related entities → Uses context
```

## Automatic Entity Tracking

During execution, the Orchestrator automatically extracts and tracks entities from each phase's output:

### Entity Extraction
- Extracts capitalized words/phrases (proper nouns)
- Filters out common words and short entities
- Limits to 20 entities per phase

### Entity Classification
Entities are classified by type using heuristics:
- **company** - Contains Inc, Corp, LLC, or known company names
- **person** - Two capitalized words (First Last pattern)
- **product** - Contains Pro, Plus, Max, Ultra, etc.
- **location** - Contains City, State, Country, etc.
- **topic** - Default for unclassified entities

### Relationship Building
- User → Entity: `RESEARCHED` relationship (weight: 0.5)
- Entity → Entity: `RELATED_TO` relationship for co-occurring entities (weight: 0.3)

### Example
```
Phase Output: "Tesla CEO Elon Musk announced the Cybertruck..."
                ↓
Extracted: ["Tesla", "Elon Musk", "Cybertruck"]
                ↓
Classified: Tesla (company), Elon Musk (person), Cybertruck (product)
                ↓
Tracked to Neo4j + Linked as RELATED_TO
```

## Memory Decay

Memories can have optional TTL for automatic expiration:

```typescript
// Memory with 90-day TTL
await contextCurator.rememberExecution(execution, { ttlDays: 90 });

// Checkpoints always expire after 24 hours (MongoDB TTL index)
```

### Automatic Cleanup Job

A scheduled job runs every 6 hours to clean up expired memories and checkpoints:

```typescript
// Set up during server startup
await setupMemoryCleanupJob();
```

This adds a repeatable job to the scheduled queue that calls:
```typescript
const { memoriesDeleted, checkpointsDeleted } = await contextCurator.cleanup();
```

Manual cleanup via API:
```bash
POST /api/cortex-flow/memory
Content-Type: application/json

{ "action": "cleanup" }
```

Manual cleanup via scheduled task:
```typescript
import { addScheduledJob } from '$lib/server/queues';

await addScheduledJob({
  task: 'cleanup',
  params: { type: 'memory' }
});
```

## Statistics

```typescript
const stats = await contextCurator.getStats(userId);
// {
//   totalMemories: 156,
//   totalCheckpoints: 3,
//   totalEntities: 89,
//   memoriesByOutcome: { success: 142, partial: 10, failed: 4 },
//   topDomains: [
//     { domain: 'market-research', count: 67 },
//     { domain: 'code-analysis', count: 45 },
//     ...
//   ]
// }
```

## UI Context Suggestions

A Svelte component is available to display context-based suggestions to users before they execute a prompt.

### Component: ContextSuggestionsPanel

**Location:** `src/lib/components/cortex-flow/ContextSuggestionsPanel.svelte`

**Features:**
- Shows resumable checkpoints with progress bar and resume/dismiss options
- Displays similar past work with relevance scores and insights
- Lists related entities from the knowledge graph
- Shows suggested approaches based on context

**Usage:**
```svelte
<script>
  import ContextSuggestionsPanel from '$lib/components/cortex-flow/ContextSuggestionsPanel.svelte';

  let contextData = $state(null);

  async function fetchContext(prompt) {
    const response = await fetch('/api/cortex-flow/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId: 'task-123' })
    });
    contextData = await response.json();
  }
</script>

{#if contextData}
  <ContextSuggestionsPanel
    similarWork={contextData.similarWork}
    relatedEntities={contextData.relatedEntities}
    checkpoint={contextData.checkpoint}
    suggestedApproach={contextData.suggestedApproach}
    onResumeCheckpoint={() => resumeExecution()}
    onDismissCheckpoint={() => startFresh()}
    onClose={() => contextData = null}
  />
{/if}
```

### Context API Endpoint

**POST** `/api/cortex-flow/context`

Fetch curated context for a prompt before execution.

**Request:**
```json
{
  "prompt": "Research Tesla Q4 earnings",
  "sessionId": "task-123",
  "maxSimilarWork": 5,
  "maxRelatedEntities": 10,
  "domain": "market-research",
  "tags": ["tesla", "earnings"]
}
```

**Response:**
```json
{
  "similarWork": [
    {
      "executionId": "exec-456",
      "prompt": "Analyze Tesla financials",
      "outcome": "success",
      "similarity": 0.87,
      "relevantInsights": ["Q3 revenue was $23.4B"],
      "createdAt": "2026-02-05T14:30:00Z",
      "domain": "market-research",
      "tags": ["tesla", "financials"]
    }
  ],
  "relatedEntities": [
    { "id": "entity_company_tesla", "name": "Tesla", "type": "company", "lastSeenAt": "..." }
  ],
  "checkpoint": null,
  "suggestedApproach": "Based on your previous Tesla research, focus on comparing Q4 to Q3 results.",
  "searchTime": 145
}
```

## Activation

### Status: Implemented and ON by default

The Context Curator (memory, checkpoints, entity tracking) is **enabled by default** in the Orchestrator.

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableMemory: true,            // Enable memory & checkpoints (default: true)
  sessionId: 'session-123',      // Required for checkpoints
  originalPrompt: 'user prompt'  // Required for memory storage
});
```

### To Disable

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableMemory: false  // Disable memory & checkpoints
});
```

### API Endpoints (Always Available)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cortex-flow/context` | POST | Get curated context for a prompt |
| `/api/cortex-flow/memory/stats` | GET | View memory statistics |
| `/api/cortex-flow/memory/checkpoint` | GET | Get latest checkpoint for session |
| `/api/cortex-flow/memory/cleanup` | POST | Trigger memory cleanup |
| `/api/cortex-flow/memory/forget` | DELETE | Forget specific execution |

### UI Component

```svelte
<script>
  import ContextSuggestionsPanel from '$lib/components/cortex-flow/ContextSuggestionsPanel.svelte';
</script>

<ContextSuggestionsPanel userId={userId} prompt={currentPrompt} />
```

## Configuration

The Context Curator auto-initializes on first use. It requires:

1. **MongoDB** - Connection via `getMongoService()`
2. **Qdrant** - Via `qdrantService` (optional, graceful degradation)
3. **Neo4j** - Via `neo4jService` (optional, graceful degradation)
4. **Embedding Service** - Via `embeddingService` (OpenAI, Cohere, or local)

If Qdrant or Neo4j are unavailable, the curator continues with reduced functionality.
