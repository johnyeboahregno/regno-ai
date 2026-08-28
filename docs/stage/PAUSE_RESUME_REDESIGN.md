# STAGE Pause/Resume Redesign

## Problem
The current pause/resume mechanism is overcomplicated with multiple state flags, duplicate UI panels, and unclear control flow.

## Simple Design

### Core Principle
**Phase 1 is the single source of truth for what user input is needed.**

### Flow

#### 1. During SSE Generation
```
User starts generation
  ↓
Phase 1 runs FULLY to completion
  ↓
Phase 1 outputs include:
  - needsDataSource: boolean
  - storedClarificationQuestions: Question[]
  - dataSourceConfig?: DataSourceConfig (if already provided)
  ↓
MaestroExecutor checks outputs:
  - If needsDataSource OR questions.length > 0 → Pause
  - Set project.status = 'awaiting_input'
  - Emit SSE event: 'awaiting_input'
  ↓
Frontend receives 'awaiting_input' event:
  - Close SSE stream
  - Mark Phase 1 as 'completed_needs_input'
  - Show toast: "Phase 1 complete - please provide additional information"
```

#### 2. On Page Load / Refresh
```
Load project from database
  ↓
Check project.status:
  ↓
If status === 'awaiting_input':
  ↓
  Phase 1 is shown as "completed but needs input"
  ↓
  Inside Phase 1 panel, show indicator badges:
    - ⚠️ Data Source Required (if !phase1.outputs.dataSourceConfig)
    - ⚠️ Clarifications Needed (if phase1.outputs.storedClarificationQuestions.length > 0)
  ↓
  User clicks badge to expand inline editor
  ↓
  User provides input
  ↓
  Submit → Save to Phase 1 outputs
  ↓
  If ALL inputs provided:
    - Show "Continue Orchestration" button
    - Button calls /api/stage/generate-project-stream with projectId
```

#### 3. Continue Orchestration
```
User clicks "Continue Orchestration"
  ↓
Update project status to 'generating'
  ↓
Start SSE stream with:
  - projectId (existing project)
  - context: { dataSourceConfig: phase1.outputs.dataSourceConfig }
  ↓
ProjectGenerator receives request:
  - Loads existing project
  - Sees Phase 1 already complete
  - Starts from Phase 2
  ↓
Phases 2-7 stream normally
```

### State Management

#### Single Project Status
```typescript
type ProjectStatus =
  | 'draft'           // Not started
  | 'generating'      // Actively generating phases
  | 'awaiting_input'  // Phase 1 done, needs user input
  | 'completed'       // All phases done
  | 'failed'          // Error occurred

// Remove: pauseForDataSource, awaiting_data_source, awaiting_clarification, needs_input
```

#### Phase 1 Outputs (Source of Truth)
```typescript
interface Phase1Outputs {
  goal: string;
  requirements: string[];
  successCriteria: string[];

  // User input flags
  needsDataSource: boolean;
  dataSourceConfig?: {
    type: string;
    credentialId: string;
    database: string;
    collection?: string;
    table?: string;
  };

  storedClarificationQuestions: {
    id: string;
    question: string;
    category: string;
    required: boolean;
  }[];
  storedClarificationReason?: string;

  clarificationAnswers?: Record<string, string>;
}
```

#### Frontend State (Minimal)
```typescript
// ONLY for controlling UI expansion
let expandedDataSourceEditor = $state(false);
let expandedClarificationEditor = $state(false);

// NO MORE:
// - awaitingDataSource
// - awaitingClarification
// - pauseForDataSource
// - showInlineDataSourceSelector
// - showInlineClarifications
// - inlineEditPhase
// - dataSourceProjectId
// - clarificationProjectId
```

### UI Components

#### Phase 1 Panel Structure
```svelte
{#if phase.num === 1}
  <!-- Always show outputs -->
  <div>Goal: {phase.outputs.goal}</div>
  <div>Requirements: {phase.outputs.requirements}</div>

  <!-- Input Status Badges -->
  {#if project.status === 'awaiting_input'}
    <div class="input-status">

      <!-- Data Source Status -->
      {#if !phase.outputs.dataSourceConfig}
        <button onclick={() => expandedDataSourceEditor = true}>
          ⚠️ Data Source Required - Click to Specify
        </button>
      {:else}
        <div>✓ Data Source: {phase.outputs.dataSourceConfig.collection}</div>
        <button onclick={() => expandedDataSourceEditor = true}>Change</button>
      {/if}

      <!-- Clarifications Status -->
      {#if phase.outputs.storedClarificationQuestions.length > 0}
        {@const answered = Object.keys(phase.outputs.clarificationAnswers || {}).length}
        {@const total = phase.outputs.storedClarificationQuestions.length}

        {#if answered < total}
          <button onclick={() => expandedClarificationEditor = true}>
            ⚠️ Answer {total - answered} Questions
          </button>
        {:else}
          <div>✓ All {total} questions answered</div>
          <button onclick={() => expandedClarificationEditor = true}>Review</button>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Inline Editors (only shown when expanded) -->
  {#if expandedDataSourceEditor}
    <DataSourceSelector onSubmit={handleDataSourceSubmit} onCancel={() => expandedDataSourceEditor = false} />
  {/if}

  {#if expandedClarificationEditor}
    <ClarificationPanel questions={phase.outputs.storedClarificationQuestions} onSubmit={handleClarificationSubmit} onCancel={() => expandedClarificationEditor = false} />
  {/if}

  <!-- Continue Button (only if all inputs provided) -->
  {#if project.status === 'awaiting_input' && allInputsProvided(phase.outputs)}
    <button onclick={continueOrchestration}>
      Continue Orchestration →
    </button>
  {/if}
{/if}
```

### Backend Changes

#### MaestroExecutor.ts
```typescript
// After Phase 1 completes
if (phaseNumber === 1) {
  const needsDataSource = !result.audit.outputs?.dataSourceConfig;
  const needsClarifications = (result.audit.outputs?.storedClarificationQuestions?.length || 0) > 0;

  if (needsDataSource || needsClarifications) {
    // Update project status
    await updateProject(context.executionId, {
      status: 'awaiting_input'
    });

    // Emit SSE event
    await emitEvent({
      type: 'awaiting_input',
      data: {
        phaseNumber: 1,
        needsDataSource,
        needsClarifications,
        clarificationCount: result.audit.outputs?.storedClarificationQuestions?.length || 0
      }
    });

    // Return paused
    return {
      success: true,
      paused: true,
      phaseAudits,
      results: previousPhaseData
    };
  }
}

// Continue to Phase 2
```

#### ProjectGenerator.ts
```typescript
async generateProject(request) {
  const project = await loadProject(request.projectId);

  // Check if Phase 1 already complete
  const phase1 = project.orchestrationPhases?.find(p => p.phaseNumber === 1);

  if (phase1?.status === 'success') {
    console.log('Phase 1 already complete - starting from Phase 2');

    // Extract data source config from Phase 1
    const dataSourceConfig = phase1.outputs.dataSourceConfig;

    // Start MAESTRO from Phase 2
    const result = await maestroExecutor.execute({
      ...context,
      resumeFromPhase: 2,
      previousPhaseData: phase1.outputs,
      node: {
        ...context.node,
        config: {
          ...context.node.config,
          dataSourceConfig
        }
      }
    });
  } else {
    // Start from Phase 1
    const result = await maestroExecutor.execute(context);
  }
}
```

### Benefits

1. **Single Source of Truth**: Phase 1 outputs tell us everything
2. **No Duplicate State**: One status field, not 5
3. **Clear UI**: User always knows what's needed and where
4. **Simple Resume**: Just start from Phase 2 with Phase 1 data
5. **Works on Refresh**: Load project, check status, render accordingly
6. **No Auto-Show**: User clicks to expand what they need

### Migration Steps

1. Remove all old state flags
2. Update MaestroExecutor pause logic
3. Update ProjectGenerator resume logic
4. Simplify frontend to check `project.status === 'awaiting_input'`
5. Show inline editors only on user click
6. Show Continue button when all inputs provided
