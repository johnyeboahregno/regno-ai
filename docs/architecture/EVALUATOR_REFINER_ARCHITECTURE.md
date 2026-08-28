# MAESTRO Evaluator + Refiner + Verifier Architecture

## Overview

The Refinement System uses a sophisticated **3-stage pipeline** to intelligently improve MAESTRO orchestrations:

```
Previous Execution
        ↓
   📊 EVALUATOR (Deep Analysis)
        ↓
  Evaluation Report
        ↓
   🎯 REFINER (Strategy Creation)
        ↓
  Refinement Strategy
        ↓
   🎭 MAESTRO Executor (Apply Improvements)
        ↓
  Refined Execution
        ↓
   🔎 VERIFIER (Validate Improvements)
        ↓
  Verification Report
```

## Component 1: Evaluator (`Evaluator.ts`)

### Purpose
Deeply analyzes a previous MAESTRO execution to identify:
- What went wrong and why
- What worked well
- Performance bottlenecks
- Structural issues
- Opportunities for improvement

### Evaluation Report Structure

```typescript
interface EvaluationReport {
  // Quantitative scores (0-1)
  scores: {
    correctness: number;      // Did it accomplish the goal?
    completeness: number;     // Are all phases/outputs complete?
    performance: number;      // Speed, cost, efficiency
    reliability: number;      // Error handling, robustness
    quality: number;          // Code/pipeline quality
    overall: number;          // Weighted average
  };

  // Qualitative analysis
  analysis: {
    strengths: string[];              // What worked well
    weaknesses: string[];             // What didn't work
    criticalIssues: string[];         // Must-fix issues
    performanceBottlenecks: string[]; // Slow/expensive parts
    missingElements: string[];        // What's missing
  };

  // Phase-by-phase breakdown
  phaseAnalysis: Array<{
    phaseNumber: number;
    phaseName: string;
    status: 'success' | 'failed' | 'skipped';
    issues: string[];
    suggestions: string[];
    score: number;
  }>;

  // Root cause analysis
  rootCauses: Array<{
    issue: string;
    cause: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    affectedPhases: number[];
  }>;

  // Prioritized recommendations
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: 'correctness' | 'performance' | 'reliability' | 'quality';
    description: string;
    expectedImpact: string;
  }>;
}
```

### How It Works

1. **Receives**: Previous execution + export data + LLM credential
2. **Analyzes**: Uses LLM to perform comprehensive analysis
3. **Scores**: Evaluates on 5 dimensions (correctness, completeness, performance, reliability, quality)
4. **Identifies**: Finds root causes, not just symptoms
5. **Recommends**: Provides prioritized, actionable recommendations
6. **Returns**: Structured evaluation report

### Key Features

- **Deep Analysis**: Goes beyond surface-level issues to find root causes
- **Quantitative + Qualitative**: Combines scores with detailed insights
- **Phase-Level Granularity**: Analyzes each phase independently
- **Impact Assessment**: Prioritizes issues by impact level
- **Actionable Recommendations**: Provides specific, implementable suggestions

---

## Component 2: Refiner (`Refiner.ts`)

### Purpose
Takes evaluation report + user feedback and creates an actionable refinement strategy with:
- Enhanced prompts for each phase
- Specific guidance to avoid previous mistakes
- Learning from what worked
- Targeted improvements

### Refinement Strategy Structure

```typescript
interface RefinementStrategy {
  // Overall refinement approach
  approach: {
    strategy: string;              // High-level strategy
    keyChanges: string[];          // Main changes to apply
    preservedAspects: string[];    // What to keep from previous run
    newFocus: string[];            // New areas to emphasize
  };

  // Phase-specific refinements
  phaseRefinements: Array<{
    phaseNumber: number;
    phaseName: string;
    shouldRun: boolean;            // Whether to run this phase
    enhancedPrompt?: string;       // Additional context for LLM
    specificGuidance: string[];    // Explicit instructions
    avoidMistakes: string[];       // What not to do
    successCriteria: string[];     // How to know it succeeded
  }>;

  // Verification checkpoints
  verificationPoints: Array<{
    afterPhase: number;
    checks: string[];              // What to verify
    failureAction: 'retry' | 'stop' | 'continue';
  }>;

  // Success metrics
  successMetrics: {
    mustHave: string[];            // Required for success
    shouldHave: string[];          // Nice to have
    measurements: string[];        // What to measure
  };
}
```

### How It Works

1. **Receives**: Evaluation report + user feedback + original goal
2. **Strategizes**: Uses LLM to create comprehensive improvement plan
3. **Tailors**: Customizes approach for each phase based on issues found
4. **Preserves**: Keeps what worked well from previous run
5. **Guides**: Provides specific, phase-level instructions
6. **Verifies**: Adds checkpoints to catch issues early
7. **Returns**: Detailed refinement strategy

### Key Features

- **User-Centric**: Prioritizes user feedback above all else
- **Learning-Based**: Preserves successful patterns
- **Phase-Specific**: Custom guidance for each phase
- **Preventive**: Explicitly avoids previous mistakes
- **Checkpointed**: Adds verification at critical phases
- **Success-Oriented**: Defines clear success criteria

---

## Component 3: Verifier (`Verifier.ts`)

### Purpose
Compares refined execution against previous execution to determine if improvements were achieved:
- Did refinements address the issues?
- Are the scores better?
- Were user requirements met?
- What still needs work?

### Verification Report Structure

```typescript
interface VerificationReport {
  // Overall verdict
  verdict: {
    improved: boolean;             // Did it get better?
    issuesResolved: number;        // How many issues fixed
    issuesRemaining: number;       // How many still exist
    newIssuesIntroduced: number;   // Any new problems
    overallImprovement: number;    // -1 to 1 scale
  };

  // Detailed comparison
  comparison: {
    scoreChanges: {
      // Before/after for each dimension
      correctness: { before, after, delta };
      completeness: { before, after, delta };
      performance: { before, after, delta };
      reliability: { before, after, delta };
      quality: { before, after, delta };
      overall: { before, after, delta };
    };
    resolvedIssues: string[];
    persistingIssues: string[];
    newIssues: string[];
  };

  // Strategy effectiveness
  strategyEffectiveness: {
    goalsMet: string[];
    goalsPartiallyMet: string[];
    goalsMissed: string[];
    unexpectedOutcomes: string[];
  };

  // User feedback alignment
  userFeedbackAlignment: {
    addressed: string[];
    notAddressed: string[];
    satisfactionScore: number;
  };

  // Next steps
  nextSteps: {
    ifSatisfied: string[];
    ifNotSatisfied: string[];
    recommendedActions: string[];
  };
}
```

### How It Works

1. **Receives**: Previous evaluation + current evaluation + strategy + user feedback
2. **Compares**: Analyzes before/after differences quantitatively
3. **Verifies**: Checks if issues were resolved
4. **Assesses**: Evaluates strategy effectiveness
5. **Measures**: Determines user satisfaction alignment
6. **Recommends**: Suggests next steps based on results
7. **Returns**: Comprehensive verification report

### Key Features

- **Objective**: Uses quantitative metrics for comparison
- **Comprehensive**: Analyzes multiple dimensions
- **User-Focused**: Prioritizes user feedback satisfaction
- **Actionable**: Provides clear next steps
- **Honest**: Identifies new issues introduced
- **Balanced**: Recognizes partial successes

---

## Integration Flow

### 1. User Initiates Refinement
- User clicks "Refine" button on an orchestration
- Modal opens with:
  - Previous execution data
  - Validation issues
  - AI-generated improvement suggestions
  - User feedback textarea

### 2. Modal Loads Intelligence
```
User opens modal
     ↓
GET /api/maestro/export/execution/{id}
  → Loads full execution data
     ↓
POST /api/maestro/analyze-for-improvement
  → Evaluator analyzes execution
  → Returns targeted suggestions
     ↓
User sees intelligent suggestions + can add custom feedback
```

### 3. User Submits Refinement
```
User clicks "Start Refined Run"
     ↓
Improvement Context Created:
  - previousExecution (export data)
  - userFeedback (text)
  - validationIssues (from export)
  - improvementMode: true
     ↓
Passed to MAESTRO Executor
```

### 4. MAESTRO Executor (Enhanced with Refinement Mode)
```
if (improvementContext) {
  // STEP 1: Evaluate Previous Execution
  evaluator = new MaestroEvaluator()
  previousEval = await evaluator.evaluate(...)

  // STEP 2: Create Refinement Strategy
  refiner = new MaestroRefiner()
  strategy = await refiner.createStrategy(
    previousEval,
    userFeedback,
    goal,
    previousExecution
  )

  // STEP 3: Execute with Refinements
  for each phase:
    - Apply enhancedPrompt from strategy
    - Follow specificGuidance
    - Avoid previous mistakes
    - Check verificationPoints

  // STEP 4: Verify Improvements
  verifier = new MaestroVerifier()
  currentEval = await evaluator.evaluate(newExecution)
  verification = await verifier.verify(
    previousEval,
    currentEval,
    strategy,
    userFeedback
  )

  // STEP 5: Return Enhanced Results
  return {
    ...standardResults,
    refinement: {
      previousEval,
      strategy,
      currentEval,
      verification,
      improved: verification.verdict.improved
    }
  }
}
```

---

## Benefits of This Architecture

### 1. **Intelligent Learning**
- Learns from both successes and failures
- Preserves what works, fixes what doesn't
- Adapts strategy based on specific issues

### 2. **User-Centric**
- Prioritizes user feedback
- Provides transparent analysis
- Shows clear before/after comparisons

### 3. **Systematic Improvement**
- Structured, repeatable process
- Phase-by-phase refinement
- Verification checkpoints

### 4. **Root Cause Focus**
- Identifies underlying issues, not symptoms
- Prevents cascading failures
- Addresses problems at their source

### 5. **Measurable Results**
- Quantitative scores for comparison
- Clear success metrics
- Objective improvement tracking

### 6. **Iterative by Design**
- Can refine multiple times
- Each iteration learns from previous
- Verification guides next iteration

---

## Example Flow

```
User Goal: "Create a pipeline to process MongoDB data and generate charts"

🔴 FIRST RUN:
- Phase 3: Created nodes but without configs
- Phase 4: Saved pipeline with empty configs
- Result: Pipeline not executable ❌
- Score: 45%

↓

📊 EVALUATOR ANALYZES:
- Critical Issue: "Pipeline nodes have empty configs"
- Root Cause: "Phase 3 LLM didn't generate node configurations"
- Weakness: "No validation before Phase 4"
- Recommendation: "Add explicit config generation in Phase 3"

↓

🎯 REFINER CREATES STRATEGY:
- Phase 3 Enhanced Prompt: "Generate complete node configurations with all required fields. Include MongoDB connection details, query parameters, and output specifications."
- Phase 3 Specific Guidance: ["Ensure each node has a populated 'config' object", "Include database credentials", "Define data transformations"]
- Phase 3 Avoid Mistakes: ["Don't create nodes without configs", "Don't skip configuration validation"]
- Verification Point after Phase 3: ["Check that all nodes have non-empty config objects", "Verify configs have required fields"]

↓

🎭 MAESTRO EXECUTES WITH REFINEMENTS:
- Phase 3: Runs with enhanced prompt + guidance
- Verification after Phase 3: ✅ All nodes have configs
- Phase 4: Saves pipeline with complete configs
- Result: Pipeline executable ✅
- Score: 85%

↓

🔎 VERIFIER CONFIRMS:
- Issues Resolved: 3
- Score Improvement: +40%
- User Feedback Addressed: ✅
- Verdict: IMPROVED ✅
```

---

## Next Steps for Integration

### 1. Update MaestroExecutor
- [ ] Add improvementContext parameter handling
- [ ] Integrate Evaluator at start of refinement mode
- [ ] Integrate Refiner to create strategy
- [ ] Apply enhanced prompts to each phase
- [ ] Add verification checkpoints
- [ ] Integrate Verifier at end
- [ ] Return enhanced results with refinement data

### 2. Update API Endpoint
- [ ] Modify /api/maestro/orchestrate to accept improvementContext
- [ ] Pass context through to MaestroExecutor

### 3. Update UI
- [ ] Display verification results in modal after refinement
- [ ] Show before/after scores
- [ ] Highlight resolved issues
- [ ] Offer "Refine Again" if not satisfied

### 4. Testing
- [ ] Test with failed executions
- [ ] Test with successful executions that need optimization
- [ ] Test iterative refinement (refine multiple times)
- [ ] Verify learning persistence

---

## Files Created

1. `/disks/disk1/chat/src/lib/server/execution/maestro-refinement/Evaluator.ts`
   - Comprehensive execution evaluation
   - Scoring system
   - Root cause analysis

2. `/disks/disk1/chat/src/lib/server/execution/maestro-refinement/Refiner.ts`
   - Strategy generation
   - Phase-specific guidance
   - Verification checkpoints

3. `/disks/disk1/chat/src/lib/server/execution/maestro-refinement/Verifier.ts`
   - Before/after comparison
   - Improvement verification
   - Next steps recommendation

4. `/disks/disk1/chat/EVALUATOR_REFINER_ARCHITECTURE.md` (this file)
   - Architecture documentation
   - Integration guide
   - Example flows

---

## Conclusion

The Evaluator + Refiner + Verifier architecture provides a **systematic, intelligent, and measurable** approach to orchestration refinement. It learns from mistakes, preserves successes, and continuously improves through iteration.

This is a **self-improving system** that gets smarter with each refinement, building institutional knowledge about what works and what doesn't in MAESTRO orchestrations.
