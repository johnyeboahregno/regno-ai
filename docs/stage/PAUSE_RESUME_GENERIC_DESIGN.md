# Generic Pause/Resume Design

## Problem with Current Approach
- Hardcoded to check "phaseNumber === 1"
- Assumes exactly 7 phases
- Assumes "Phase 1" is always goal understanding
- Not flexible for different orchestration types

## Generic Solution

### 1. Any Phase Can Pause
```typescript
// MaestroExecutor - After ANY phase completes
for (const phase of this.phases) {
  const result = await phase.execute(context, config, inputs);

  // Check if THIS phase needs user input
  const needsUserInput = this.checkPhaseNeedsInput(result.audit.outputs);

  if (needsUserInput) {
    return {
      success: false,
      paused: true,
      status: 'awaiting_input',
      pausedAtPhase: phaseNumber,
      phaseAudits,
      results: previousPhaseData
    };
  }
}
```

### 2. Phase Outputs Define What's Needed
```typescript
// Any phase can output these flags:
interface PhaseOutputs {
  // ... phase-specific outputs ...

  // Generic input request system:
  needsUserInput?: boolean;
  userInputRequests?: {
    type: 'data_source' | 'clarification' | 'approval' | 'file_upload' | 'custom';
    questions?: Question[];
    description: string;
    required: boolean;
  }[];
}
```

### 3. Generic UI Rendering
```svelte
<!-- For ANY phase that needs input -->
{#each orchestrationPhases as phase}
  {#if phase.outputs?.needsUserInput && project.status === 'awaiting_input'}
    <div class="phase-needs-input">
      <h4>⚠️ {phase.name} needs your input</h4>

      {#each phase.outputs.userInputRequests as request}
        {#if request.type === 'data_source'}
          <DataSourceSelector />
        {:else if request.type === 'clarification'}
          <ClarificationPanel questions={request.questions} />
        {:else if request.type === 'approval'}
          <ApprovalPanel />
        {:else}
          <GenericInputPanel request={request} />
        {/if}
      {/each}
    </div>
  {/if}
{/each}
```

### 4. Resume from Any Phase
```typescript
// ProjectGenerator - Check which phase paused
const existingProject = await loadProject(projectId);

if (existingProject.status === 'awaiting_input') {
  // Find the paused phase
  const pausedPhase = existingProject.orchestrationPhases.find(
    p => p.outputs?.needsUserInput
  );

  const nextPhaseIndex = pausedPhase ? pausedPhase.phaseNumber : 0;

  // Resume from next phase
  const result = await maestroExecutor.execute({
    ...context,
    resumeFromPhase: nextPhaseIndex + 1,
    previousPhaseData: extractPreviousPhaseData(existingProject)
  });
}
```

## Flexible Phase Structure

### Example 1: Simple 3-Phase Project
```
Phase 1: Define Goal
Phase 2: Execute Analysis
Phase 3: Generate Report
```
- Phase 1 might pause for clarifications
- Phase 2 might pause for data source
- Phase 3 might pause for approval

### Example 2: Complex 12-Phase Pipeline
```
Phase 1: Goal Understanding
Phase 2: Data Discovery
Phase 3: Schema Analysis (pauses for data source)
Phase 4: Data Validation
Phase 5: Transformation Planning
Phase 6: Execute Transforms
Phase 7: Quality Check (pauses for approval)
...
```

### Example 3: Non-Data Project
```
Phase 1: Research Topic
Phase 2: Gather Sources (pauses for URL list)
Phase 3: Analyze Content
Phase 4: Synthesize Findings
Phase 5: Generate Report (pauses for format selection)
```

## Implementation Rules

### ❌ DON'T:
- Hardcode `if (phaseNumber === 1)`
- Assume "Phase 1" exists
- Assume exactly 7 phases
- Assume specific phase names
- Check for "Goal Understanding" phase

### ✅ DO:
- Check `phase.outputs?.needsUserInput` for ANY phase
- Store `pausedAtPhase` number in project
- Resume from `pausedAtPhase + 1`
- Let phases self-describe what they need
- Make UI render based on phase outputs

## Updated MaestroExecutor

```typescript
// After each phase execution
for (let i = startPhaseIndex; i < this.phases.length; i++) {
  const phase = this.phases[i];
  const result = await phase.execute(context, config, inputs);

  phaseAudits.push(result.audit);
  previousPhaseData = { ...previousPhaseData, ...result.outputs };

  // Generic check: Does THIS phase need user input?
  if (result.outputs?.needsUserInput) {
    console.log(`[MAESTRO] 🛑 ${phase.name} (Phase ${i+1}) needs user input`);

    // Emit generic event
    await emitAndSaveEvent({
      type: 'awaiting_input',
      payload: {
        phaseNumber: i + 1,
        phaseName: phase.name,
        userInputRequests: result.outputs.userInputRequests || [],
        message: `${phase.name} needs user input to continue`
      }
    });

    // Save with paused status
    await maestroStorage.saveExecution({
      // ... standard fields ...
      status: 'awaiting_input',
      pausedAtPhase: i + 1,
      resumeState: {
        nextPhaseIndex: i + 1, // Resume from next phase
        // ... other state ...
      }
    });

    return {
      success: false,
      paused: true,
      status: 'awaiting_input',
      pausedAtPhase: i + 1,
      phaseAudits,
      results: previousPhaseData
    };
  }
}
```

## Frontend Changes

### Generic Phase Status Badge
```svelte
{#each orchestrationPhases as phase}
  <div class="phase-panel">
    <h3>{phase.name}</h3>

    <!-- Show if THIS phase needs input -->
    {#if phase.outputs?.needsUserInput && project.status === 'awaiting_input'}
      <div class="needs-input-badge">
        ⚠️ This phase needs your input

        {#each phase.outputs.userInputRequests || [] as request}
          <div class="input-request">
            <h4>{request.description}</h4>

            <!-- Generic input handler -->
            <InputHandler
              type={request.type}
              data={request}
              onSubmit={(answers) => handlePhaseInputSubmit(phase.phaseNumber, request.type, answers)}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/each}
```

### Continue Button Logic
```svelte
<!-- Show continue button when paused phase has all inputs -->
{@const pausedPhase = orchestrationPhases.find(p => p.outputs?.needsUserInput)}
{#if pausedPhase && allInputsProvided(pausedPhase)}
  <button onclick={continueOrchestration}>
    Continue from {pausedPhase.name} →
  </button>
{/if}
```

## Benefits

1. **Works for any number of phases** - 3, 7, 12, doesn't matter
2. **Any phase can pause** - Not just "Phase 1"
3. **Multiple pause points** - Phase 3 and Phase 7 both could pause
4. **Different project types** - Data, research, creative, anything
5. **Self-describing** - Phases declare what they need
6. **Future-proof** - New input types can be added easily
