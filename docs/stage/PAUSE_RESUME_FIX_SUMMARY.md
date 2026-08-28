# Pause/Resume Fix - Summary

## Issue
When MAESTRO paused and the phase status showed "Waiting for your input...", no input requests were displayed in the UI.

## Root Cause
The SSE event handler was setting `phase.status = 'needs_input'` but NOT updating `phase.outputs` with the `userInputRequests` data from the event.

The UI requires BOTH conditions:
```svelte
{#if isWaitingForInput && phase.outputs?.needsUserInput}
```

## Solution

### 1. Fixed SSE Event Handler (src/routes/stage/+page.svelte:703-726)
```typescript
case 'awaiting_input':
  const pausedPhaseNum = data.data?.phaseNumber || data.phase || 1;
  const pausedPhaseIndex = generationProgress.phases.findIndex(p => p.num === pausedPhaseNum);
  if (pausedPhaseIndex !== -1) {
    generationProgress.phases[pausedPhaseIndex].status = 'needs_input';
    generationProgress.phases[pausedPhaseIndex].progress = 100;

    // CRITICAL FIX: Update phase outputs with input request data
    if (!generationProgress.phases[pausedPhaseIndex].outputs) {
      generationProgress.phases[pausedPhaseIndex].outputs = {};
    }
    generationProgress.phases[pausedPhaseIndex].outputs.needsUserInput = true;
    generationProgress.phases[pausedPhaseIndex].outputs.userInputRequests = data.data?.userInputRequests || [];
  }
```

###2. Fixed Svelte Syntax (src/routes/stage/+page.svelte:4343-4455)
Wrapped input requests display in `{#if userInputRequests.length > 0}` block to ensure `{@const}` tag has valid parent.

### 3. Shortened Button Text
Changed "Continue Orchestration" to just "Continue" for cleaner UI.

## How It Works Now

### Fresh Generation Flow
```
User starts orchestration
  ↓
Phase 1 executes
  ↓
Phase sets: outputs.needsUserInput = true
            outputs.userInputRequests = [...]
  ↓
MAESTRO emits 'awaiting_input' event with userInputRequests
  ↓
SSE handler receives event
  ↓
Frontend updates:
  - phase.status = 'needs_input'
  - phase.outputs.needsUserInput = true
  - phase.outputs.userInputRequests = [...]
  ↓
UI detects:isWaitingForInput && phase.outputs?.needsUserInput
  ↓
Shows input request cards with buttons
```

### Page Refresh Flow
```
User refreshes page
  ↓
selectProject(pausedProjectId)
  ↓
Loads orchestrationPhases from MongoDB
  ↓
Maps to generationProgress.phases:
  outputs: phase.outputs || {} // Includes needsUserInput and userInputRequests
  ↓
UI detects:
  isWaitingForInput && phase.outputs?.needsUserInput
  ↓
Shows input request cards with buttons
```

## MongoDB Data Structure

When a phase pauses, it's saved to MongoDB with:
```javascript
{
  orchestrationPhases: [
    {
      phaseNumber: 1,
      name: "Goal Understanding",
      status: "success",
      duration: 5000,
      outputs: {
        goal: "...",
        requirements: [...],
        needsUserInput: true,  // <- Key flag
        userInputRequests: [   // <- Input definitions
          {
            type: 'data_source',
            description: 'Select data source',
            required: true
          },
          {
            type: 'clarification',
            description: 'Answer clarification questions',
            questions: [...],
            required: true
          }
        ],
        dataSourceConfig: null,  // Will be filled when user provides
        clarificationAnswers: {} // Will be filled when user provides
      }
    }
  ],
  status: 'awaiting_input',
  maestroExecutionId: '...'
}
```

## Testing Checklist

### ✅ Scenario 1: Fresh Generation
1. Start new project with data-based goal
2. Phase 1 completes and pauses
3. **Verify:** Input request cards show with buttons
4. **Verify:** Each request type shows correct icon (🗄️ for data_source, 💡 for clarification)
5. **Verify:** Continue button appears when all inputs provided

### ✅ Scenario 2: Page Refresh
1. Start project, let it pause
2. Refresh page (F5)
3. Click on paused project in sidebar
4. **Verify:** Input request cards show exactly as before refresh
5. **Verify:** State is preserved (phase progress, status, etc.)

### ✅ Scenario 3: Provide Inputs
1. Click "Select Data Source" button
2. Choose database and collection
3. **Verify:** Data source card shows green checkmark with details
4. Click "Answer Questions" button
5. Answer all questions
6. **Verify:** Clarifications card shows green checkmark
7. **Verify:** "Continue" button appears
8. Click "Continue"
9. **Verify:** Phases 2-7 begin streaming

## Files Modified

1. **src/routes/stage/+page.svelte**
   - Lines 703-726: SSE event handler - update phase.outputs
   - Lines 4343-4455: Generic input request UI with syntax fix
   - Line 4447: Button text changed to "Continue"

## Benefits

1. **Consistent UX** - Same experience whether fresh or loaded
2. **No data loss** - Outputs preserved across page refreshes
3. **Generic** - Works for any phase that needs input (not just Phase 1)
4. **Debuggable** - Console logs show when outputs are updated

## Related Documentation

- `docs/PAUSE_RESUME_REDESIGN_COMPLETE.md` - Full redesign summary
- `docs/PAUSE_RESUME_GENERIC_DESIGN.md` - Generic architecture
- `docs/DEPENDENT_INPUT_REQUESTS_DESIGN.md` - Future enhancement for cascading inputs
