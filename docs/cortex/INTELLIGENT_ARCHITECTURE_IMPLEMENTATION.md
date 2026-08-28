# Intelligent Architecture Implementation

## Overview

Regno has been refactored from hardcoded decision trees to a **CORTEX-driven, self-learning, adaptive system**.

## What Was Implemented

### 1. CORTEX Pattern Service (`src/lib/server/cortex/CortexPatternService.ts`)

**Purpose**: Regno's learning brain - stores and retrieves patterns from all executions.

**Key Features**:
- **Pattern Storage**: Stores learned patterns with confidence scores
- **Pattern Querying**: Finds relevant patterns based on keywords, context, domain
- **Outcome Tracking**: Updates confidence based on success/failure/acceptance/rejection
- **Self-Pruning**: Removes low-confidence patterns that haven't been validated
- **Statistics**: Tracks pattern effectiveness over time

**Pattern Schema**:
```typescript
{
  domain: 'goal_understanding' | 'schema_analysis' | etc.,
  trigger: {
    keywords: string[],
    context: Record<string, any>,
    conditions: string[],
    description: string
  },
  action: {
    type: string,
    parameters: Record<string, any>,
    reasoning: string,
    alternatives: string[]
  },
  outcomes: {
    success: number,
    failure: number,
    rejected: number,
    accepted: number
  },
  confidence: 0.0 to 1.0,
  metadata: {
    created: Date,
    lastUsed: Date,
    useCount: number,
    sourceExecution: string
  }
}
```

### 2. Multi-Stage Reasoning Engine (`src/lib/server/cortex/ReasoningEngine.ts`)

**Purpose**: Handles iterative LLM reasoning instead of single-shot prompts.

**Capabilities**:
- **Multi-Round Reasoning**: Up to 3 iterations of refinement
- **Self-Validation**: LLM validates its own conclusions
- **Confidence Scoring**: Every conclusion has a confidence level
- **Adaptive Strategy**: Adjusts approach based on validation feedback
- **Pattern Integration**: Uses CORTEX patterns to inform reasoning

**Process**:
1. Initial reasoning with pattern context
2. Self-validation of reasoning
3. If confidence < 0.7, refine with validation feedback
4. Repeat up to max iterations
5. Return final conclusion with confidence & uncertainties

### 3. Intelligent GoalUnderstandingPhase (Refactored)

**Old Approach** (hardcoded):
```typescript
if (hasGenericDataSource) {
  pauseForDataSource = true; // Hardcoded assumption
}
```

**New Approach** (intelligent):
```typescript
// Stage 1: Query CORTEX for similar patterns
const patterns = await cortexPatternService.findSimilar('goal_understanding', userGoal);

// Stage 2: Multi-stage reasoning
const reasoning = await reasoningEngine.reason({
  domain: 'goal_understanding',
  input: { goal: userGoal },
  patterns: patterns
}, 'Analyze goal and decide next action', ...);

// Stage 3: Decide based on confidence, not hardcoded rules
const nextAction = decideNextAction(reasoning);

// Stage 4: Store pattern for future learning
await cortexPatternService.storePattern(...);
```

**Flow**:
1. 🧠 Query CORTEX for learned patterns from similar goals
2. 🔍 Multi-stage reasoning to analyze goal (3 iterations max)
3. ✅ Parse structured output from reasoning
4. 🎯 Decide next action based on confidence (not hardcoded!)
5. 💾 Store pattern in CORTEX for future use

**Dynamic Decision Making**:
- If reasoning confidence > 0.8 → proceed directly
- If reasoning confidence 0.5-0.8 → use intelligent defaults
- If reasoning confidence < 0.5 → pause for data source or clarifications
- Decision is **reasoned**, not hardcoded!

### 4. Coding Guidelines (`coding_guidelines` memory)

Permanent guidelines that govern ALL future development:

**Core Rules**:
1. ❌ **NO hardcoded decision trees** for domain logic
2. ✅ **ALWAYS query CORTEX first** before making decisions
3. ✅ **Multi-stage reasoning**, not single LLM calls
4. ✅ **Confidence-based decisions**, not assumptions
5. ✅ **Store learnings** after every execution
6. ✅ **Capture feedback** and update confidence scores

**Executor Template**:
```typescript
async execute(context) {
  // 1. Query CORTEX
  const patterns = await cortex.findRelevantPatterns(context);

  // 2. Initial reasoning
  const reasoning = await this.reason(context, patterns);

  // 3. Validation loop
  while (!validated && attempts < 3) {
    const analysis = await this.analyze(reasoning);
    const validation = await this.validate(analysis);
    if (validation.confident) break;
    reasoning = await this.adjust(reasoning, validation.concerns);
  }

  // 4. Decide action dynamically
  const action = await this.decideAction(context, reasoning);

  // 5. Store learnings
  await cortex.store(context, reasoning, action);

  return action;
}
```

## Benefits of New Architecture

### 1. Self-Learning
- Every execution stores a pattern
- Future executions benefit from past learnings
- System gets smarter over time automatically

### 2. Adaptive
- No hardcoded assumptions about "MongoDB = generic"
- Decisions based on past similar cases
- Handles edge cases through reasoning, not conditionals

### 3. Confidence-Aware
- Every decision has a confidence score
- Low confidence → ask user
- High confidence → proceed automatically
- Medium confidence → use intelligent defaults

### 4. Self-Correcting
- User rejections lower pattern confidence
- User acceptances increase pattern confidence
- Low-confidence patterns are pruned over time
- System learns from mistakes

### 5. Transparent
- All reasoning steps are logged
- Uncertainties are explicitly stated
- Patterns used are tracked
- Can explain WHY a decision was made

### 6. Flexible
- Easy to add new reasoning stages
- Can incorporate new pattern types
- Handles unknown situations gracefully
- Improves without code changes

## Example: Goal Understanding Flow

**User Goal**: "Analyze sales data"

**Old Hardcoded Approach**:
```
1. Parse goal
2. Check if dataSource specified
3. If MongoDB && !collection → pause (HARDCODED)
4. Done
```

**New Intelligent Approach**:
```
1. Query CORTEX:
   - Found 3 similar patterns from past "sales analysis" goals
   - 2 patterns suggested: pause_for_data_source (confidence: 0.7)
   - 1 pattern suggested: proceed_directly (confidence: 0.4)

2. Reasoning Iteration 1:
   "Goal is to analyze sales data. Based on learned patterns,
   sales analysis typically requires transaction data from a database.
   No specific database or collection mentioned.
   Uncertainty: Which database contains sales data?"
   Confidence: 0.6

3. Self-Validation:
   Concern: "Assuming need for data source, but user might have data already"
   Suggestion: "Check if user provided data location in context"

4. Reasoning Iteration 2 (refined):
   "User goal doesn't mention data location. Past similar projects
   with 70% success rate paused for data source first.
   Recommended: pause_for_data_source"
   Confidence: 0.75

5. Validation: ✅ Confident (0.75 > 0.7 threshold)

6. Decision: pause_for_data_source
   Reasoning: "Past patterns show 70% success when pausing for data source
   selection in sales analysis scenarios"

7. Store Pattern:
   - Keywords: ['sales', 'analyze', 'data']
   - Action: pause_for_data_source
   - Confidence: 0.75
   - For future similar goals
```

## Learning Cycle

```
User Action → Execution → CORTEX Storage → Pattern Update → Smarter Future Decisions

Example:
1. System pauses for data source (confidence: 0.75)
2. User selects data source
3. Pipeline completes successfully
4. CORTEX updates: confidence 0.75 → 0.80 ✅
5. Next similar goal uses updated pattern
```

## Feedback Integration

```
User Accepts Default:
→ Pattern confidence +0.05
→ outcomes.accepted++

User Rejects/Overrides:
→ Pattern confidence -0.1
→ outcomes.rejected++

Execution Success:
→ Pattern confidence +0.03
→ outcomes.success++

Execution Failure:
→ Pattern confidence -0.05
→ outcomes.failure++
```

## Migration Path

### Phase 1: ✅ COMPLETED
- [x] Created CORTEX Pattern Service
- [x] Created Multi-Stage Reasoning Engine
- [x] Refactored GoalUnderstandingPhase
- [x] Established coding guidelines
- [x] Build verified successful

### Phase 2: NEXT STEPS
- [ ] Refactor other MAESTRO phases (CapabilityDiscovery, PipelineConstruction, etc.)
- [ ] Add user feedback capture mechanism
- [ ] Build CORTEX analytics dashboard
- [ ] Implement pattern pruning cron job
- [ ] Add confidence thresholds configuration

### Phase 3: FUTURE
- [ ] Use embeddings for better pattern matching
- [ ] Implement A/B testing for competing patterns
- [ ] Add cross-domain pattern transfer
- [ ] Build pattern explanation UI
- [ ] Implement reinforcement learning from outcomes

## Key Takeaways

1. **No More Hardcoded Logic**: Every decision is reasoned or pattern-based
2. **Gets Smarter Over Time**: Each execution improves future executions
3. **Self-Correcting**: Learns from mistakes through confidence updates
4. **Transparent**: Can explain reasoning behind every decision
5. **Adaptive**: Handles edge cases without code changes

## Files Changed/Created

**Created**:
- `src/lib/server/cortex/CortexPatternService.ts` - Pattern storage & retrieval
- `src/lib/server/cortex/ReasoningEngine.ts` - Multi-stage reasoning
- `.serena/memories/coding_guidelines` - Permanent development guidelines
- `.serena/memories/executor_architecture_principles` - Architecture documentation

**Modified**:
- `src/lib/server/execution/phases/maestro/GoalUnderstandingPhase.ts` - Refactored to intelligent
- Old version backed up as `GoalUnderstandingPhase.old.ts`

**Database**:
- New MongoDB collection: `cortex_patterns`

## Usage Example

```typescript
// In any MAESTRO phase:

// 1. Query CORTEX
const patterns = await cortexPatternService.query({
  domain: 'my_domain',
  keywords: ['sales', 'analysis'],
  minimumConfidence: 0.6,
  limit: 5
});

// 2. Reason with patterns
const reasoning = await reasoningEngine.reason(
  {
    domain: 'my_domain',
    input: myInput,
    patterns: patterns
  },
  'What should I do next?',
  llmCredentialId,
  model,
  userId,
  executionId
);

// 3. Make decision based on confidence
if (reasoning.confidence > 0.8) {
  // High confidence - proceed
  await execute(reasoning.suggestedActions[0]);
} else {
  // Low confidence - ask user
  await pauseForInput();
}

// 4. Store pattern
await cortexPatternService.storePattern({
  domain: 'my_domain',
  trigger: { ... },
  action: { ... },
  confidence: reasoning.confidence,
  metadata: { sourceExecution: executionId }
});

// 5. Update based on outcome
await cortexPatternService.updateFromOutcome({
  patternId: usedPattern.id,
  outcome: 'success', // or 'failure', 'rejected', 'accepted'
  executionContext: { executionId }
});
```

---

**Remember**: "We're not building a pipeline generator - we're building a system that learns to generate better pipelines every time it runs."
