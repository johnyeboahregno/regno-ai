# AI-First Reasoning Principle (CORE ARCHITECTURE)

> **This is the foundational architectural principle for Regno.ai. All development must follow this.**

## The Problem We Must Avoid

**DO NOT** build hardcoded conditional logic for specific use cases:
```typescript
// ❌ BAD - Hardcoded logic
if (sourceType === 'mongo' || sourceType === 'postgres') {
  needsReview = true;
}

// ❌ BAD - Pattern matching with if/else chains
if (goal.includes('segmentation')) {
  recommendSourceType = 'mongo';
}
```

This approach:
- Creates rigid, non-adaptive behavior
- Requires code changes for each new use case
- Doesn't learn or improve over time
- Is the opposite of what an AI platform should be

## The Correct Approach: AI-Driven Reasoning

Regno.ai should behave like Claude's thinking process - using LLM calls to reason through decisions dynamically.

### Instead of hardcoded logic:
```typescript
// ✅ GOOD - AI-driven reasoning
const decision = await llm.reason({
  context: { goal, nodeConfig, availableCredentials },
  question: "Should this data source configuration require user review?",
  cortexPatterns: await cortex.getRelevantPatterns(context),
  outputSchema: { needsReview: boolean, reasoning: string }
});
```

### CORTEX Patterns as Learning Memory

CORTEX patterns should NOT be static lookup tables. They should be:

1. **Few-shot examples** - Guide LLM reasoning
2. **Accumulated knowledge** - System learns from successful/failed executions
3. **Dynamic and evolving** - Created and refined by AI as it encounters new scenarios
4. **Soft guidance** - Inform decisions, not dictate them

```typescript
// ✅ GOOD - AI creates new patterns from experience
if (executionSucceeded && wasNovelScenario) {
  await cortex.createPattern({
    domain: 'learned_inference',
    trigger: extractedTriggerFromGoal,
    action: whatWorked,
    confidence: initialConfidence,
    metadata: { source: 'ai_learning', learnedFrom: executionId }
  });
}
```

## Implementation Guidelines

### 1. Replace Conditionals with LLM Calls

When you find yourself writing:
- `if (someCondition) { doSomething }`
- Switch statements for use cases
- Keyword matching logic

**STOP** and ask: "Can an LLM reason through this?"

### 2. Use CORTEX as Context, Not Rules

```typescript
// ❌ BAD - CORTEX as rule engine
const pattern = await cortex.findMatchingPattern(input);
return pattern.action.parameters.value;

// ✅ GOOD - CORTEX as reasoning context
const relevantPatterns = await cortex.getRelevantPatterns(input);
const decision = await llm.reason({
  instruction: "Based on these patterns and the current context, determine...",
  patterns: relevantPatterns,
  context: input
});
```

### 3. AI Creates and Evolves Patterns

The system should:
- Learn from successful executions
- Create new patterns when encountering novel scenarios
- Update pattern confidence based on outcomes
- Prune patterns that consistently fail

### 4. Minimize Hardcoded Knowledge

Code should contain:
- Infrastructure (how to call LLMs, store patterns)
- Prompts and reasoning frameworks
- Execution machinery

Code should NOT contain:
- Domain-specific rules
- Use-case specific conditionals
- Static decision trees

## The Vision: A Thinking Machine

Regno.ai should reason like this:

```
User Goal: "Analyze customer purchasing patterns"

AI Reasoning:
1. This goal involves data analysis → needs data source
2. "Customer" and "purchasing" suggest business data → likely in a database
3. Checking CORTEX patterns... found 3 relevant patterns about customer data
4. Pattern confidence: MongoDB for customer data = 0.85
5. However, I should verify the user's data source before proceeding
6. Decision: Recommend MongoDB, but flag for user review
7. Reasoning: High confidence in source type, but data source selection
   is critical for analysis accuracy - user should confirm
```

This reasoning should happen via LLM, not hardcoded logic.

## Refactoring Priority

When working on any Stage/CORTEX code:
1. Identify hardcoded conditionals
2. Replace with AI reasoning calls
3. Ensure patterns inform (not dictate) decisions
4. Add learning mechanisms where appropriate

## Key Files to Refactor

- `SmartDefaultEngine.ts` - Replace hardcoded inference with LLM reasoning
- `LLMReasoningEngine.ts` - Central reasoning hub
- `CortexBrain.ts` - Pattern learning and evolution
- `ValidationEngine.ts` - AI-driven validation

## Remember

The goal is to build a system that can handle ANY goal submitted to it, not just the ones we've coded for. This requires AI reasoning, not hardcoded rules.
