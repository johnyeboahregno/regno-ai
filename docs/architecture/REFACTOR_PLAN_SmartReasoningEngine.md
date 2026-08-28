# Refactoring Plan: SmartDefaultEngine → AI-First Reasoning

> **Status:** Planned
> **Priority:** High
> **Related:** [AI_FIRST_REASONING_PRINCIPLE.md](./AI_FIRST_REASONING_PRINCIPLE.md)

## Overview

Transform `SmartDefaultEngine` from a hardcoded conditional engine into an AI-driven reasoning system that uses LLM calls with CORTEX patterns as context.

**Current state:** 2100+ lines of hardcoded if/else logic
**Target state:** LLM-driven reasoning with CORTEX patterns as learned context

## Current Architecture (Hardcoded)

```
User Goal → SmartDefaultEngine → Hardcoded Conditionals → Defaults
                                       ↓
                              if (sourceType === 'mongo') { ... }
                              if (goal.includes('segmentation')) { ... }
```

## Target Architecture (AI-First)

```
User Goal → SmartReasoningEngine → LLM Reasoning Call → Reasoned Defaults
                    ↓                      ↑
              Query CORTEX ────────→ Patterns as Context
                    ↓
              Store Learnings ←──── Outcome Feedback
```

---

## Phase 1: Create Core Reasoning Infrastructure

### 1.1 Create `ReasoningService` class

**File:** `src/lib/server/stage/v2/ReasoningService.ts`

```typescript
interface ReasoningRequest {
  question: string;           // What decision needs to be made
  context: Record<string, any>; // Current state (goal, node, credentials)
  outputSchema: object;       // Expected response structure
  cortexDomains?: string[];   // Which CORTEX domains to query
}

interface ReasoningResponse<T> {
  decision: T;
  reasoning: string;
  confidence: number;
  patternsUsed: string[];    // IDs of patterns that informed decision
}

class ReasoningService {
  constructor(
    private llm: LLMService,
    private cortex: CortexBrain
  ) {}

  async reason<T>(request: ReasoningRequest): Promise<ReasoningResponse<T>> {
    // 1. Query CORTEX for relevant patterns
    const patterns = await this.cortex.queryRelevantPatterns({
      domains: request.cortexDomains,
      context: request.context
    });

    // 2. Build reasoning prompt with patterns as few-shot examples
    const prompt = this.buildReasoningPrompt(request, patterns);

    // 3. Call LLM for reasoning
    const response = await this.llm.call(prompt, {
      outputSchema: request.outputSchema
    });

    // 4. Return structured response
    return {
      decision: response.decision,
      reasoning: response.reasoning,
      confidence: response.confidence,
      patternsUsed: patterns.map(p => p.id)
    };
  }
}
```

### 1.2 Enhance CortexBrain for Reasoning Context

**Updates to:** `src/lib/server/cortex/CortexBrain.ts`

```typescript
// New method for reasoning-oriented pattern retrieval
async queryRelevantPatterns(request: {
  domains: string[];
  context: Record<string, any>;
  limit?: number;
}): Promise<CortexPattern[]> {
  // Semantic search + keyword matching + confidence ranking
  // Returns patterns formatted as reasoning context
}

// New method for storing reasoning outcomes
async storeReasoningOutcome(outcome: {
  request: ReasoningRequest;
  decision: any;
  wasAccepted: boolean;
  userFeedback?: string;
}): Promise<void> {
  // Creates or updates patterns based on outcome
}
```

---

## Phase 2: Refactor Individual Inference Methods

### 2.1 Priority Order (by impact)

| Priority | Method | Lines | Complexity |
|----------|--------|-------|------------|
| **HIGH** | `inferDataType` | 1151-1451 | Most hardcoded logic |
| **HIGH** | `inferCredential` | 604-787 | Complex matching |
| **HIGH** | `inferLlmCredentialIntelligently` | 803-1045 | LLM selection |
| MEDIUM | `inferChartType` | 1456-1506 | Chart selection |
| MEDIUM | `inferMapperMode` | 1511-1548 | Mapper config |
| MEDIUM | `inferSystemPrompt` | 456-522 | Prompt generation |
| LOW | `inferHttpMethod` | 1999-2036 | HTTP method |
| LOW | `inferImageGenMode` | 553-599 | Image mode |
| LOW | `inferGoalComplexity` | 1114-1140 | Complexity |

### 2.2 Refactoring Template

For each method, replace:

```typescript
// ❌ BEFORE: Hardcoded
private async inferDataType(node, field, goalAnalysis, credentials) {
  if (field === 'sourceType' && goalAnalysis.includes('segmentation')) {
    return { value: 'mongo', confidence: 0.9 };
  }
  // ... more if/else
}
```

With:

```typescript
// ✅ AFTER: AI-driven
private async inferDataType(node, field, goalAnalysis, credentials) {
  const response = await this.reasoning.reason({
    question: `What data source type should be used for this goal?`,
    context: {
      goal: goalAnalysis,
      field,
      nodeType: node.type,
      availableCredentials: credentials.map(c => ({ type: c.type, name: c.name }))
    },
    outputSchema: {
      sourceType: 'string',
      reasoning: 'string',
      confidence: 'number',
      needsReview: 'boolean',
      reviewReason: 'string (if needsReview)'
    },
    cortexDomains: ['data_source_inference', 'node_configuration']
  });

  return {
    value: response.decision.sourceType,
    confidence: response.decision.confidence,
    reasoning: response.decision.reasoning,
    needsReview: response.decision.needsReview
  };
}
```

### 2.3 Specific Method Refactoring Plans

#### `inferDataType` (Lines 1151-1451)

**Current hardcoded logic:**
- Source type lists: `['mongo', 'mongodb', 'postgres', 'postgresql', 'smart-query']`
- Keyword matching for context vs database
- Project type checks: `projectType === 'image_generation'`
- File attachment detection

**AI-first approach:**
```typescript
const decision = await this.reasoning.reason({
  question: "What data source type should this pipeline use?",
  context: {
    goal: goalAnalysis,
    hasAttachedFiles: hasInputImage || hasInputDocument,
    projectType,
    availableCredentials
  },
  cortexDomains: ['data_source_inference', 'data_source_refinement']
});
```

#### `inferCredential` (Lines 604-787)

**Current hardcoded logic:**
- Type matching by node type
- Tier-based credential selection
- Default credential preference

**AI-first approach:**
```typescript
const decision = await this.reasoning.reason({
  question: "Which credential should be used for this node?",
  context: {
    nodeType: node.type,
    requiredCredentialType,
    availableCredentials,
    goalComplexity
  },
  cortexDomains: ['credential_selection', 'tier_requirements']
});
```

#### `inferLlmCredentialIntelligently` (Lines 803-1045)

**Current hardcoded logic:**
- Model capability tiers: 'basic', 'standard', 'advanced', 'premium'
- Model name matching: `modelId.includes('gpt-4')`
- Task complexity assessment

**AI-first approach:**
```typescript
const decision = await this.reasoning.reason({
  question: "Which LLM credential and model is best for this task?",
  context: {
    taskDescription: goalAnalysis,
    taskComplexity: await this.assessComplexity(goalAnalysis),
    availableLlmCredentials,
    costConstraints
  },
  cortexDomains: ['llm_selection', 'model_capabilities', 'cost_optimization']
});
```

---

## Phase 3: Implement Learning Loop

### 3.1 Capture Outcomes

```typescript
// After user accepts/rejects a default
async recordDefaultOutcome(
  defaultId: string,
  accepted: boolean,
  userOverride?: any,
  feedback?: string
) {
  await this.cortex.storeReasoningOutcome({
    defaultId,
    accepted,
    userOverride,
    feedback,
    timestamp: new Date()
  });

  // If rejected, create or update pattern
  if (!accepted && userOverride) {
    await this.cortex.learnFromRejection({
      originalDecision: this.getDefault(defaultId),
      userChoice: userOverride,
      context: this.getDefaultContext(defaultId)
    });
  }
}
```

### 3.2 Pattern Evolution

```typescript
// In CortexBrain
async learnFromRejection(data: {
  originalDecision: any;
  userChoice: any;
  context: any;
}) {
  // Find existing pattern that led to wrong decision
  const usedPattern = await this.findPatternByDecision(data.originalDecision);

  if (usedPattern) {
    // Lower confidence
    await this.updatePatternConfidence(usedPattern.id, -0.1);
  }

  // Create new pattern from user's choice
  await this.createPattern({
    domain: 'learned_corrections',
    trigger: this.extractTriggerFromContext(data.context),
    action: {
      type: 'inferred_default',
      parameters: data.userChoice
    },
    confidence: 0.7, // Start medium, will increase if confirmed
    metadata: {
      source: 'user_correction',
      learnedAt: new Date()
    }
  });
}
```

---

## Phase 4: Migrate Existing Patterns

### 4.1 Convert Static Patterns to Learning Context

Current patterns in `seed-validation-patterns.cjs` should become:
- **Few-shot examples** for LLM reasoning
- **Initial knowledge** that evolves with usage
- **Soft guidance** not hard rules

### 4.2 New CORTEX Domains

```javascript
// Reasoning-oriented domains
'reasoning_examples'      // Few-shot examples for LLM
'learned_decisions'       // Decisions that worked
'learned_corrections'     // User corrections
'confidence_adjustments'  // Pattern confidence updates
```

---

## Phase 5: Refactor Main Entry Point

### 5.1 Rename and Restructure

```typescript
// Rename: SmartDefaultEngine → SmartReasoningEngine
export class SmartReasoningEngine {
  private reasoning: ReasoningService;
  private cortex: CortexBrain;
  private llm: LLMService;

  async generateDefaults(
    pipeline: Pipeline,
    goalAnalysis: GoalAnalysis,
    credentials: Credential[]
  ): Promise<SmartDefault[]> {
    const defaults: SmartDefault[] = [];

    for (const node of pipeline.nodes) {
      // AI-driven field inference
      const nodeDefaults = await this.reasonNodeDefaults(node, goalAnalysis, credentials);
      defaults.push(...nodeDefaults);
    }

    return defaults;
  }

  private async reasonNodeDefaults(
    node: PipelineNode,
    goalAnalysis: GoalAnalysis,
    credentials: Credential[]
  ): Promise<SmartDefault[]> {
    // Single LLM call for all node defaults
    const response = await this.reasoning.reason({
      question: `What configuration defaults should be set for this ${node.type} node?`,
      context: {
        nodeType: node.type,
        goal: goalAnalysis,
        existingConfig: node.config,
        availableCredentials: credentials
      },
      outputSchema: this.getNodeDefaultSchema(node.type),
      cortexDomains: this.getRelevantDomains(node.type)
    });

    return this.convertToSmartDefaults(node, response.decision);
  }
}
```

---

## Implementation Timeline

### Sprint 1: Infrastructure
- [ ] Create `ReasoningService` class
- [ ] Enhance `CortexBrain` with reasoning methods
- [ ] Add outcome storage capability
- [ ] Unit tests for reasoning infrastructure

### Sprint 2: High Priority Methods
- [ ] Refactor `inferDataType`
- [ ] Refactor `inferCredential`
- [ ] Refactor `inferLlmCredentialIntelligently`
- [ ] Integration tests

### Sprint 3: Medium Priority Methods
- [ ] Refactor `inferChartType`
- [ ] Refactor `inferMapperMode`
- [ ] Refactor `inferSystemPrompt`

### Sprint 4: Learning Loop
- [ ] Implement outcome capture
- [ ] Implement pattern evolution
- [ ] Add confidence adjustment
- [ ] Migrate existing patterns

### Sprint 5: Cleanup & Testing
- [ ] Remove deprecated hardcoded logic
- [ ] Rename class to `SmartReasoningEngine`
- [ ] Full integration testing
- [ ] Performance optimization

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Hardcoded conditionals | ~500 | <50 |
| Pattern growth | Static | +10/week from learning |
| Avg pattern confidence | 0.8 | 0.9+ (improves over time) |
| User override rate | Unknown | <10% |
| Novel goal success | Limited | 80%+ |

---

## Files to Modify

| File | Action |
|------|--------|
| `SmartDefaultEngine.ts` | Major refactor → `SmartReasoningEngine.ts` |
| `CortexBrain.ts` | Add reasoning context methods |
| `ReasoningService.ts` | **NEW** - Core reasoning infrastructure |
| `StageOrchestrator.ts` | Update to use new engine |
| `seed-validation-patterns.cjs` | Convert to reasoning examples |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM latency | Cache common decisions, batch reasoning calls |
| LLM cost | Use smaller models for simple decisions |
| Regression | Keep old logic as fallback during transition |
| Pattern quality | Human review of auto-generated patterns |

---

## Notes

- Keep temporary hardcoded logic as fallback during transition
- Monitor LLM costs closely during rollout
- Start with high-impact methods first
- Ensure patterns have clear audit trail
