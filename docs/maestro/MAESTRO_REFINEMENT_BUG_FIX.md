# MAESTRO Refinement System - Critical Bug Fix

## Problem Statement

The MAESTRO refinement system generates improvement suggestions but **does NOT actually apply them** when re-running. Users get the same suggestions repeatedly because the refinements are never integrated into the execution.

## Root Cause Analysis

### 1. Empty Phase Refinements (Line 533 in MaestroExecutor.ts)

```typescript
// CURRENT (BROKEN):
phaseRefinements: [],  // ← Always empty!

// SHOULD BE:
phaseRefinements: refinementStrategy?.phaseRefinements || []
```

### 2. Phases Don't Use Refinement Data

The `PhaseExecutor` and individual phases never check for or apply refinement guidance:
- No use of `enhancedPrompt`
- No use of `specificGuidance`
- No use of `avoidMistakes`
- No use of `successCriteria`

### 3. Missing Integration Points

The refinement strategy creates detailed guidance but it's never passed to the phase execution:

```typescript
{
  "phaseRefinements": [
    {
      "phaseNumber": 3,
      "phaseName": "Pipeline Generation",
      "enhancedPrompt": "Last time failed due to missing node configs...",
      "specificGuidance": [
        "Ensure all nodes have complete configurations",
        "Validate edges before creating pipeline"
      ],
      "avoidMistakes": [
        "Don't forget to set default values",
        "Don't skip validation"
      ]
    }
  ]
}
```

This valuable data is **completely ignored** during execution.

## Required Fixes

### Fix 1: Use Real Refinement Strategy

**File**: `src/lib/server/execution/executors/MaestroExecutor.ts`

**Line 520-540**: Replace the placeholder strategy with the actual refinement strategy:

```typescript
// BEFORE (BROKEN):
const refinementResults = await verifier.verify(
  previousEvaluation,
  currentEvaluation,
  {
    approach: {
      strategy: 'User-requested improvements',
      keyChanges: ['Address user feedback'],
      preservedAspects: [],
      newFocus: [improvementContext.userFeedback || 'General improvements']
    },
    phaseRefinements: [],  // ← BUG: Empty!
    verificationPoints: [],
    successMetrics: { mustHave: [], shouldHave: [], measurements: [] }
  },
  improvementContext.userFeedback,
  llmCredential,
  modelOverrides
);

// AFTER (FIXED):
// First, create the refinement strategy if it doesn't exist
let refinementStrategy = improvementContext.refinementStrategy;

if (!refinementStrategy) {
  const refiner = new MaestroRefiner();
  refinementStrategy = await refiner.createStrategy(
    previousEvaluation,
    improvementContext.userFeedback,
    context.node.config.goal,
    improvementContext.previousExecution,
    llmCredential,
    modelOverrides
  );
}

// Then use it for verification
const refinementResults = await verifier.verify(
  previousEvaluation,
  currentEvaluation,
  refinementStrategy,  // ← Use real strategy!
  improvementContext.userFeedback,
  llmCredential,
  modelOverrides
);
```

### Fix 2: Apply Refinements to Phases

**File**: `src/lib/server/execution/phases/PhaseExecutor.ts`

Add refinement context to phase execution:

```typescript
interface PhaseExecutionContext {
  goal: string;
  phase: Phase;
  previousResults: Map<string, any>;
  llmCredential: any;
  modelOverrides?: Record<string, string>;
  // NEW: Refinement guidance for this specific phase
  refinement?: {
    enhancedPrompt?: string;
    specificGuidance: string[];
    avoidMistakes: string[];
    successCriteria: string[];
  };
}

async executePhase(context: PhaseExecutionContext): Promise<PhaseResult> {
  const { goal, phase, previousResults, llmCredential, modelOverrides, refinement } = context;

  // Build the base prompt for the phase
  let prompt = this.buildPhasePrompt(goal, phase, previousResults);

  // NEW: Enhance with refinement guidance
  if (refinement) {
    prompt += `\n\n## REFINEMENT GUIDANCE (Learn from previous attempt):`;

    if (refinement.enhancedPrompt) {
      prompt += `\n\n${refinement.enhancedPrompt}`;
    }

    if (refinement.specificGuidance.length > 0) {
      prompt += `\n\n### Specific Instructions:`;
      refinement.specificGuidance.forEach(g => {
        prompt += `\n- ${g}`;
      });
    }

    if (refinement.avoidMistakes.length > 0) {
      prompt += `\n\n### Avoid These Mistakes (from previous run):`;
      refinement.avoidMistakes.forEach(m => {
        prompt += `\n- ❌ ${m}`;
      });
    }

    if (refinement.successCriteria.length > 0) {
      prompt += `\n\n### Success Criteria:`;
      refinement.successCriteria.forEach(c => {
        prompt += `\n- ✓ ${c}`;
      });
    }
  }

  // Execute with enhanced prompt
  const result = await callLLM({
    credentialId: llmCredential.id,
    model: recommendedModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    maxTokens: 4000
  });

  // ... rest of execution
}
```

### Fix 3: Pass Refinements to Orchestrator

**File**: `src/lib/server/execution/executors/MaestroExecutor.ts`

When calling the orchestrator, pass the refinement strategy:

```typescript
// Around line 200-250 where orchestrator is called
const orchestratorResult = await runMaestroOrchestration(
  context.node.config.goal,
  llmCredential,
  modelOverrides,
  context,
  reusingPipeline ? pipeline : null,
  improvementContext?.refinementStrategy  // ← Pass refinements!
);
```

Then in the orchestration function, use the refinements when executing each phase:

```typescript
async function runMaestroOrchestration(
  goal: string,
  llmCredential: any,
  modelOverrides: Record<string, string>,
  context: any,
  existingPipeline: any,
  refinementStrategy?: RefinementStrategy  // ← Accept refinements
) {
  // ...

  for (const phase of phases) {
    const phaseNumber = phase.number;

    // Find refinement for this phase
    const phaseRefinement = refinementStrategy?.phaseRefinements?.find(
      r => r.phaseNumber === phaseNumber
    );

    // Skip phase if refinement says so
    if (phaseRefinement && !phaseRefinement.shouldRun) {
      console.log(`[MAESTRO] ⏭️  Skipping Phase ${phaseNumber} (refinement says not needed)`);
      continue;
    }

    // Execute phase with refinement guidance
    const result = await phaseExecutor.executePhase({
      goal,
      phase,
      previousResults,
      llmCredential,
      modelOverrides,
      refinement: phaseRefinement ? {
        enhancedPrompt: phaseRefinement.enhancedPrompt,
        specificGuidance: phaseRefinement.specificGuidance,
        avoidMistakes: phaseRefinement.avoidMistakes,
        successCriteria: phaseRefinement.successCriteria
      } : undefined
    });

    // ...
  }
}
```

## Testing the Fix

1. Run a MAESTRO orchestration (initial attempt)
2. Get refinement suggestions
3. Select some improvements and re-run
4. **Verify** that the new execution:
   - Uses different prompts (enhanced with guidance)
   - Avoids the previous mistakes
   - Meets the success criteria
5. Check the next refinement:
   - Should recognize improvements made
   - Should suggest DIFFERENT improvements
   - Or say "no improvements needed" if perfect

## Success Criteria

✅ Phase prompts are enhanced with refinement guidance
✅ Refinements are not empty - they contain the actual strategy
✅ Subsequent refinements recognize what was already improved
✅ Users see actual improvement in results
✅ System truly self-improves over iterations

## Current Status

🔴 **BROKEN** - Refinements are created but never applied
⏳ **NEEDS FIX** - Implement the 3 fixes above
