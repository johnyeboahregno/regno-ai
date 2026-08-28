# STAGE + FLUX Pipeline Integration Architecture

## Core Concept

**Instead of borrowing FLUX UI components, STAGE should create and execute actual FLUX pipelines.**

This provides:
- ✅ True DRY - no data duplication
- ✅ Full FLUX feature parity automatically
- ✅ Shared credential management
- ✅ Shared execution history
- ✅ Shared node configurations
- ✅ Easier maintenance

---

## Current vs. Proposed Architecture

### Current (Problematic)
```
STAGE Phase: "Data Extraction"
  ↓
User configures via FLUX UI (borrowed component)
  ↓
STAGE stores config in MongoDB: staged_project_states
  ↓
STAGE has custom data retrieval helper
  ↓
STAGE duplicates FLUX execution logic
  ↓
Results displayed in STAGE UI
```

**Issues:**
- ❌ Duplicate credential storage
- ❌ Duplicate execution logic
- ❌ Different MongoDB collections
- ❌ Config drift between FLUX and STAGE
- ❌ Hard to maintain feature parity

### Proposed (Clean)
```
STAGE Phase: "Data Extraction"
  ↓
STAGE creates/reuses FLUX pipeline (type: 'stage')
  ↓
Add data-source node to pipeline
  ↓
User configures node using FLUX's native storage
  ↓
Execute node using FLUX's executor
  ↓
Results displayed in STAGE UI (with FLUX execution data)
```

**Benefits:**
- ✅ Single source of truth for credentials
- ✅ Single execution engine (FLUX)
- ✅ Same MongoDB collections
- ✅ Automatic feature parity
- ✅ Easy maintenance

---

## Implementation Design

### 1. STAGE Project Creates FLUX Pipeline

When STAGE project is created:

```typescript
// src/lib/server/stage/StagedProjectExecutor.ts

async function createStagePipeline(projectId: string, projectName: string) {
  const pipeline = {
    id: `stage-${projectId}`,
    name: `STAGE: ${projectName}`,
    type: 'stage',           // Mark as STAGE pipeline
    hidden: true,            // Don't show in FLUX UI pipeline list
    metadata: {
      stageProjectId: projectId,
      createdBy: 'stage',
      purpose: 'Temporary pipeline for STAGE project execution'
    },
    nodes: [],
    edges: []
  };

  // Store in FLUX's pipelines collection
  const pipelinesCollection = await getMongoCollection('pipelines');
  await pipelinesCollection.insertOne(pipeline);

  return pipeline;
}
```

### 2. Add FLUX Nodes for Each Phase

When phase needs data-source:

```typescript
async function addDataSourceNode(pipelineId: string, phaseNum: number, phaseName: string) {
  const node = {
    id: `stage-datasource-${phaseNum}`,
    type: 'data-source',
    label: `Data Source - ${phaseName}`,
    position: { x: 100, y: 100 * phaseNum },
    data: {
      // FLUX node config structure
      sourceType: 'mongo',
      credentialId: '',  // Set by user via FLUX UI
      collectionName: '',
      // ... all FLUX data-source fields
    }
  };

  // Add to FLUX pipeline
  await updatePipeline(pipelineId, {
    $push: { nodes: node }
  });

  return node;
}
```

### 3. Execute Using FLUX Executor

```typescript
// Use FLUX's existing execution infrastructure
import { executeNode } from '$lib/server/execution/executors/NodeExecutor';

async function executeDataSourcePhase(pipelineId: string, nodeId: string) {
  const pipeline = await getPipeline(pipelineId);
  const node = pipeline.nodes.find(n => n.id === nodeId);

  // Execute using FLUX's executor (no duplication!)
  const result = await executeNode(node, {
    pipelineId,
    executionId: `stage-exec-${Date.now()}`,
    // ... execution context
  });

  return result;
}
```

### 4. Display Results in STAGE UI

STAGE UI shows FLUX execution results:

```typescript
// Phase execution results come from FLUX
const phaseResult = {
  details: result.output,           // FLUX output
  dbOperations: result.dbOperations, // FLUX tracking
  llmActivity: result.llmActivity,   // FLUX LLM calls
  cost: result.cost,                 // FLUX cost tracking
  // All FLUX execution metadata available
};
```

---

## Pipeline Type Strategy

### Option 1: `type` field
```typescript
{
  type: 'stage',  // or 'flux', 'maestro', etc.
  hidden: true
}
```

### Option 2: `metadata.context` field
```typescript
{
  type: 'flux',  // Still a FLUX pipeline
  metadata: {
    context: 'stage',  // Created by STAGE
    temporary: true,
    projectId: 'xxx'
  }
}
```

### Option 3: `visibility` field
```typescript
{
  visibility: 'hidden',  // or 'public', 'internal'
  createdBy: 'stage'
}
```

**Recommendation:** Use `metadata.context: 'stage'` to maintain FLUX pipeline type while marking ownership.

---

## Data Storage Architecture

### Before (Duplicated)
```
MongoDB Collections:
├── staged_projects              (STAGE)
├── staged_project_states        (STAGE)
│   └── stageData.validatedCredential  ❌ Duplicate
│   └── stageData.fullConfig           ❌ Duplicate
├── credentials                  (FLUX)
├── pipelines                    (FLUX)
└── pipeline_executions          (FLUX)
```

### After (Unified)
```
MongoDB Collections:
├── staged_projects              (STAGE metadata only)
│   └── pipelineId: 'stage-xxx'  ✅ Links to FLUX
├── pipelines                    (FLUX - shared)
│   └── { id: 'stage-xxx', metadata: { context: 'stage' } }
├── credentials                  (FLUX - shared)
└── pipeline_executions          (FLUX - shared)
    └── { pipelineId: 'stage-xxx', ... }  ✅ Full execution history
```

**Result:** Single source of truth, no duplication!

---

## User Experience Flow

### Phase Execution with FLUX Pipeline

```
1. User creates STAGE project
   ↓
2. STAGE creates hidden FLUX pipeline: "stage-{projectId}"
   ↓
3. Phase 2: Data Extraction needs data
   ↓
4. STAGE adds data-source node to FLUX pipeline
   ↓
5. FLUX UI appears inline (native FLUX component)
   ↓
6. User configures node → Stored in FLUX's node.data
   ↓
7. User clicks "Execute"
   ↓
8. STAGE calls FLUX executor with node
   ↓
9. FLUX executor runs (using its credential store, connection logic, etc.)
   ↓
10. Results stored in FLUX's pipeline_executions collection
    ↓
11. STAGE displays results (from FLUX execution)
```

### Viewing STAGE Pipeline in FLUX

User could optionally view the STAGE pipeline in FLUX:

```typescript
// In FLUX UI, filter option:
Show hidden pipelines: [ ] STAGE pipelines

// If enabled, shows:
📊 FLUX Pipeline: "STAGE: Customer Segmentation"
   ├── 🗃️ Data Source - Phase 2
   ├── 🔄 Mapper - Phase 3
   └── 💡 Insight - Phase 4

   Execution History: 5 runs
   Last Run: 2 minutes ago
```

---

## Benefits Summary

### For Development
- ✅ **No code duplication:** Use FLUX executors directly
- ✅ **Automatic updates:** FLUX improvements automatically available in STAGE
- ✅ **Shared testing:** Test FLUX = test STAGE
- ✅ **Single codebase:** One execution engine

### For Users
- ✅ **Consistent behavior:** Same execution logic everywhere
- ✅ **Shared credentials:** Configure once, use in FLUX and STAGE
- ✅ **Full history:** See all executions in one place
- ✅ **Interoperability:** Export STAGE pipeline to FLUX

### For System
- ✅ **Single database:** No duplicate collections
- ✅ **Unified monitoring:** One LLM activity tracker
- ✅ **Shared resources:** Connection pools, caching
- ✅ **Better architecture:** Clean separation of concerns

---

## Implementation Plan

### Phase 1: Pipeline Creation
1. Create `createStagePipeline()` function
2. Store in FLUX's `pipelines` collection with `metadata.context: 'stage'`
3. Link STAGE project to pipeline ID

### Phase 2: Node Management
1. Create `addNodeToPipeline()` function
2. Use FLUX node structure
3. Configure nodes using FLUX's native storage

### Phase 3: Execution Integration
1. Import FLUX executors
2. Call FLUX execution engine
3. Store results in FLUX's execution history

### Phase 4: UI Integration
1. Keep FLUX UI components inline (current approach)
2. Load/save from FLUX pipeline nodes
3. Display FLUX execution results

### Phase 5: Cleanup
1. Remove `staged_project_states` collection
2. Remove custom data retrieval helpers
3. Remove duplicate credential storage
4. Use FLUX infrastructure exclusively

---

## Example Code

### Create Pipeline for STAGE Project

```typescript
// src/lib/server/stage/FluxPipelineManager.ts

export class StagePipelineManager {
  async createOrGetPipeline(projectId: string, projectName: string) {
    const pipelineId = `stage-${projectId}`;

    // Check if already exists
    const pipelinesCollection = await getMongoCollection('pipelines');
    let pipeline = await pipelinesCollection.findOne({ id: pipelineId });

    if (!pipeline) {
      pipeline = {
        id: pipelineId,
        name: `STAGE: ${projectName}`,
        description: 'Auto-generated pipeline for STAGE project execution',
        nodes: [],
        edges: [],
        metadata: {
          context: 'stage',
          stageProjectId: projectId,
          hidden: true,
          createdAt: Date.now()
        },
        userId: null, // System-created
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await pipelinesCollection.insertOne(pipeline);
    }

    return pipeline;
  }

  async addDataSourceNode(pipelineId: string, phaseNum: number, phaseName: string) {
    const nodeId = `stage-ds-${phaseNum}`;

    const node = {
      id: nodeId,
      type: 'data-source',
      label: `${phaseName}`,
      position: { x: 100, y: 100 * phaseNum },
      data: {
        sourceType: 'mongo',
        credentialId: '',
        collectionName: '',
        aggregationPipeline: '',
        limit: 1000,
        useAggregation: false,
        // All FLUX data-source fields
      }
    };

    const pipelinesCollection = await getMongoCollection('pipelines');
    await pipelinesCollection.updateOne(
      { id: pipelineId },
      {
        $push: { nodes: node },
        $set: { updatedAt: new Date() }
      }
    );

    return node;
  }

  async executeNode(pipelineId: string, nodeId: string) {
    // Import FLUX executor
    const { DataSourceExecutor } = await import('$lib/server/execution/executors/DataSourceExecutor');

    // Get pipeline and node
    const pipeline = await this.getPipeline(pipelineId);
    const node = pipeline.nodes.find(n => n.id === nodeId);

    if (!node) throw new Error(`Node ${nodeId} not found`);

    // Execute using FLUX infrastructure
    const executor = new DataSourceExecutor();
    const result = await executor.execute(node, {
      pipelineId,
      executionId: `stage-exec-${Date.now()}`,
      // ... context
    });

    return result;
  }
}
```

### Use in STAGE Executor

```typescript
// src/lib/server/stage/StagedProjectExecutor.ts

import { StagePipelineManager } from './FluxPipelineManager';

export class StagedProjectExecutor {
  private pipelineManager = new StagePipelineManager();

  async executeDataExtractionPhase(context: ExecutionContext): Promise<PhaseResult> {
    // Ensure pipeline exists
    const pipeline = await this.pipelineManager.createOrGetPipeline(
      context.projectId,
      context.projectName
    );

    // Add or get data-source node
    let node = pipeline.nodes.find(n => n.type === 'data-source' && n.id === 'stage-ds-2');
    if (!node) {
      node = await this.pipelineManager.addDataSourceNode(pipeline.id, 2, 'Data Extraction');
    }

    // Execute using FLUX
    const result = await this.pipelineManager.executeNode(pipeline.id, node.id);

    // Return in STAGE format (but data comes from FLUX)
    return {
      details: result.output,
      dbOperations: result.dbOperations,
      llmActivity: result.llmActivity,
      cost: result.cost,
      llmCalls: result.llmCalls
    };
  }
}
```

---

## Migration Strategy

### Phase 1: New Projects (Non-Breaking)
- New STAGE projects create FLUX pipelines
- Existing projects continue with old system

### Phase 2: Dual Mode (Transitional)
- Support both approaches
- Gradual migration of existing projects

### Phase 3: Full Migration
- Convert all existing STAGE projects to FLUX pipelines
- Remove old storage and execution logic

### Phase 4: Cleanup
- Delete redundant code
- Archive old MongoDB collections

---

## Questions to Answer

1. **Pipeline Visibility:**
   - Should users see STAGE pipelines in FLUX UI?
   - Filter option: "Show STAGE pipelines"?

2. **Pipeline Lifecycle:**
   - Delete pipeline when STAGE project deleted?
   - Keep for history/audit trail?

3. **Execution History:**
   - Show STAGE executions in FLUX history?
   - Separate filtering?

4. **Credentials:**
   - STAGE uses existing FLUX credentials directly
   - No separate credential store

5. **Node Configuration:**
   - Store in FLUX node.data
   - No separate STAGE config storage

---

## Summary

**Current Approach:** Borrow FLUX UI, duplicate everything else
**Proposed Approach:** Create actual FLUX pipelines, use entire FLUX infrastructure

**Key Change:**
```
STAGE Project → Creates/Links to FLUX Pipeline (type: 'stage')
              → Uses FLUX nodes, executors, storage
              → Displays results in STAGE UI
```

**Benefits:**
- True DRY architecture
- Automatic feature parity
- Single source of truth
- Easier maintenance
- Better system integration

**User Quote:**
> "if we use components from other regno.ai sub systems in /stage -> then we need to understand that those components already persist data -> so lets not repeat data -> just link to existing"

**Achievement:** ✅ Link to FLUX, don't duplicate!
