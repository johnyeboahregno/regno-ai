# Pattern-Based Expert Node Architecture

## Executive Summary

This document describes the architectural redesign of the Expert node from hardcoded workflow steps to a fully pattern-driven, self-learning system integrated with CORTEX.

**Current State**: 8-step workflow is hardcoded in `expertWorkflow.ts` with static logic
**Target State**: All workflow behavior driven by CORTEX patterns that evolve through user feedback

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORTEX PATTERN STORE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ expert.workflow │  │ expert.workflow │  │ expert.workflow │             │
│  │ .step.parse     │  │ .step.ambiguity │  │ .step.classify  │  ...        │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                ▼                                            │
│                    ┌───────────────────────┐                                │
│                    │  Pattern Orchestrator  │                               │
│                    │  (ExpertPatternRunner) │                               │
│                    └───────────┬───────────┘                                │
│                                │                                            │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPERT EXECUTOR                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Load workflow patterns from CORTEX                                       │
│  2. Execute each pattern-defined step                                        │
│  3. Apply pattern-defined prompts, thresholds, rules                        │
│  4. Collect feedback and update patterns                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK LOOP                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  User Rating → Pattern Confidence Update → Pattern Evolution                │
│  Error Detection → Pattern Failure Recording → Alternative Generation       │
│  User Corrections → Pattern Versioning → Improved Future Behavior           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pattern Domains for Expert Node

### 2.1 Domain Hierarchy

```
expert.workflow
├── expert.workflow.step.parse           # Step 1: Question parsing
├── expert.workflow.step.ambiguity       # Step 2: Ambiguity detection
├── expert.workflow.step.classify        # Step 3: Task classification
├── expert.workflow.step.tools           # Step 4: Tool planning
├── expert.workflow.step.gather          # Step 5: Data gathering
├── expert.workflow.step.reason          # Step 6: Reasoning synthesis
├── expert.workflow.step.safety          # Step 7: Safety checks
├── expert.workflow.step.verify          # Step 8: Fact verification
├── expert.workflow.step.followup        # Post: Follow-up generation
└── expert.workflow.step.memory          # Post: Memory storage

expert.prompts
├── expert.prompts.system                # System prompt templates
├── expert.prompts.reasoning             # Reasoning prompt templates
├── expert.prompts.classification        # Classification prompts
├── expert.prompts.ambiguity             # Ambiguity detection prompts
├── expert.prompts.followup              # Follow-up generation prompts
└── expert.prompts.safety                # Safety check prompts

expert.rules
├── expert.rules.safety.harmful          # Harmful content rules
├── expert.rules.safety.pii              # PII detection rules
├── expert.rules.safety.copyright        # Copyright protection rules
├── expert.rules.verify.facts            # Fact verification rules
├── expert.rules.verify.math             # Math validation rules
├── expert.rules.verify.dates            # Date validation rules
└── expert.rules.verify.names            # Name validation rules

expert.thresholds
├── expert.thresholds.ambiguity          # Ambiguity detection threshold
├── expert.thresholds.confidence         # Minimum confidence for responses
├── expert.thresholds.clarification      # Max clarification rounds
└── expert.thresholds.safety             # Safety score threshold
```

### 2.2 Pattern Schema Extension

```typescript
interface ExpertWorkflowPattern extends CortexPattern {
  domain: 'expert.workflow' | 'expert.prompts' | 'expert.rules' | 'expert.thresholds';

  trigger: {
    stepId: string;                    // e.g., 'parse', 'ambiguity', 'classify'
    stepOrder: number;                 // Execution order (1-8)
    conditions?: string[];             // When this pattern applies
    questionTypes?: string[];          // factual, how-to, creative, analytical
    toolsRequired?: string[];          // search, calculator, database
    keywords?: string[];
  };

  action: {
    type: 'execute_step' | 'apply_prompt' | 'apply_rule' | 'set_threshold';

    // For execute_step
    stepLogic?: {
      inputMapping: Record<string, string>;    // Map inputs to variables
      outputMapping: Record<string, string>;   // Map outputs
      skipConditions?: string[];               // When to skip this step
      fallbackBehavior?: string;               // What to do on failure
    };

    // For apply_prompt
    promptTemplate?: string;                   // The actual prompt text
    variables?: string[];                      // Required variables {{var}}

    // For apply_rule
    ruleLogic?: {
      patterns: string[];                      // Regex patterns to match
      severity: 'block' | 'warn' | 'flag';
      message: string;
    };

    // For set_threshold
    thresholdValue?: number;
    thresholdRange?: { min: number; max: number };
  };

  // Learning metadata
  learningMetrics?: {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    averageRating: number;
    userCorrections: number;
    lastUsed: Date;
  };

  // Version control
  version?: number;
  previousVersionId?: string;
  evolutionReason?: string;
}
```

---

## 3. Seed Patterns for Each Step

### 3.1 Step 1: Parse Question (Always Enabled)

```typescript
{
  domain: 'expert.workflow.step.parse',
  name: 'default_question_parser',
  trigger: {
    stepId: 'parse',
    stepOrder: 1,
    conditions: ['Always execute first']
  },
  action: {
    type: 'execute_step',
    stepLogic: {
      inputMapping: {
        'rawQuestion': '{{input.question}}',
        'context': '{{input.context}}',
        'conversationHistory': '{{input.history}}'
      },
      outputMapping: {
        'parsedQuestion': 'question',
        'extractedIntent': 'intent',
        'keyTerms': 'keywords',
        'isFollowUp': 'followUp'
      }
    }
  },
  confidence: 1.0,
  foundation: true,
  metadata: { source: 'seed', category: 'workflow_step' }
}
```

### 3.2 Step 2: Ambiguity Detection

```typescript
{
  domain: 'expert.workflow.step.ambiguity',
  name: 'default_ambiguity_detector',
  trigger: {
    stepId: 'ambiguity',
    stepOrder: 2,
    conditions: ['workflow.enableAmbiguityCheck === true']
  },
  action: {
    type: 'execute_step',
    stepLogic: {
      inputMapping: {
        'question': '{{parsed.question}}',
        'threshold': '{{config.ambiguityThreshold}}'
      },
      outputMapping: {
        'isAmbiguous': 'ambiguous',
        'clarificationNeeded': 'needsClarification',
        'suggestedQuestions': 'clarifyingQuestions'
      },
      skipConditions: ['isFollowUp === true'],
      fallbackBehavior: 'proceed_with_warning'
    }
  },
  confidence: 0.85,
  metadata: { source: 'seed', category: 'workflow_step' }
}

// Associated prompt pattern
{
  domain: 'expert.prompts.ambiguity',
  name: 'ambiguity_detection_prompt',
  trigger: {
    stepId: 'ambiguity',
    keywords: ['clarify', 'unclear', 'ambiguous']
  },
  action: {
    type: 'apply_prompt',
    promptTemplate: `Analyze this question for ambiguity:
"{{question}}"

Consider:
1. Are there multiple possible interpretations?
2. Is key information missing?
3. Are pronouns unclear (what does "it" refer to)?

Return JSON:
{
  "isAmbiguous": boolean,
  "confidence": 0.0-1.0,
  "ambiguityReasons": string[],
  "suggestedClarifications": string[]
}`,
    variables: ['question']
  },
  confidence: 0.9,
  metadata: { source: 'seed', category: 'prompt_template' }
}
```

### 3.3 Step 3: Task Classification

```typescript
{
  domain: 'expert.workflow.step.classify',
  name: 'default_task_classifier',
  trigger: {
    stepId: 'classify',
    stepOrder: 3,
    conditions: ['workflow.enableTaskClassification === true']
  },
  action: {
    type: 'execute_step',
    stepLogic: {
      inputMapping: {
        'question': '{{parsed.question}}',
        'intent': '{{parsed.intent}}',
        'taskTypes': '{{config.taskTypes}}'
      },
      outputMapping: {
        'taskType': 'classification',
        'confidence': 'classificationConfidence',
        'suggestedApproach': 'approach'
      }
    }
  },
  confidence: 0.85,
  metadata: { source: 'seed', category: 'workflow_step' }
}

// Classification rules pattern
{
  domain: 'expert.rules.classify',
  name: 'task_type_factual',
  trigger: {
    stepId: 'classify',
    keywords: ['what is', 'who is', 'when did', 'where is', 'how many', 'define']
  },
  action: {
    type: 'apply_rule',
    ruleLogic: {
      patterns: [
        '^what (is|are|was|were)',
        '^who (is|are|was|were)',
        '^when (did|was|is)',
        '^where (is|are|was)',
        '^how (many|much)',
        '^define\\b'
      ],
      classification: 'factual',
      confidence: 0.9
    }
  },
  confidence: 0.95,
  metadata: { source: 'seed', category: 'classification_rule' }
}
```

### 3.4 Step 4: Tool Planning

```typescript
{
  domain: 'expert.workflow.step.tools',
  name: 'default_tool_planner',
  trigger: {
    stepId: 'tools',
    stepOrder: 4,
    conditions: ['workflow.enableToolPlanning === true', 'connectedTools.length > 0']
  },
  action: {
    type: 'execute_step',
    stepLogic: {
      inputMapping: {
        'question': '{{parsed.question}}',
        'taskType': '{{classification.taskType}}',
        'availableTools': '{{connectedTools}}'
      },
      outputMapping: {
        'selectedTools': 'toolsToUse',
        'toolOrder': 'executionOrder',
        'toolInstructions': 'instructions'
      },
      skipConditions: ['connectedTools.length === 0']
    }
  },
  confidence: 0.85,
  metadata: { source: 'seed', category: 'workflow_step' }
}

// Tool selection patterns (one per tool type)
{
  domain: 'expert.rules.tools',
  name: 'tool_selection_web_search',
  trigger: {
    stepId: 'tools',
    keywords: ['search', 'find', 'look up', 'google', 'current', 'latest', 'recent', 'news']
  },
  action: {
    type: 'apply_rule',
    ruleLogic: {
      toolType: 'websearch',
      patterns: [
        'search (for|the)',
        'find (information|data|details)',
        'look up',
        '(current|latest|recent) (news|information|data)',
        '(what|who) is .+ (today|now|currently)'
      ],
      priority: 1
    }
  },
  confidence: 0.9,
  metadata: { source: 'seed', category: 'tool_rule' }
}
```

### 3.5 Step 6: Reasoning Synthesis

```typescript
{
  domain: 'expert.workflow.step.reason',
  name: 'default_reasoning_synthesizer',
  trigger: {
    stepId: 'reason',
    stepOrder: 6,
    conditions: ['workflow.enableReasoningSynthesis === true']
  },
  action: {
    type: 'execute_step',
    stepLogic: {
      inputMapping: {
        'question': '{{parsed.question}}',
        'context': '{{input.context}}',
        'toolResults': '{{gather.results}}',
        'conversationHistory': '{{input.history}}',
        'taskType': '{{classification.taskType}}'
      },
      outputMapping: {
        'answer': 'synthesizedAnswer',
        'reasoning': 'reasoningChain',
        'sources': 'citedSources'
      }
    }
  },
  confidence: 0.9,
  metadata: { source: 'seed', category: 'workflow_step' }
}

// The default reasoning prompt as a pattern
{
  domain: 'expert.prompts.reasoning',
  name: 'default_reasoning_template',
  trigger: {
    stepId: 'reason',
    conditions: ['Always apply when reasoning step executes']
  },
  action: {
    type: 'apply_prompt',
    promptTemplate: `You are answering the following question:
"{{question}}"

{{#if conversationContext}}
Previous Conversation:
{{conversationContext}}
{{/if}}

Task Type: {{taskClass}}
Context: {{context}}
{{#if toolResults}}
Tool Results:
{{toolResults}}
{{/if}}

Please provide a comprehensive, well-reasoned answer that:

1. **Check for Follow-up Context:**
   - If this is a follow-up, use data from previous answers
   - DO NOT treat continuations as new standalone questions

2. **Check Tool Results:**
   - If tools succeeded, extract and use their information
   - Tool results take precedence for new data

3. **For web search results:**
   - Read the SNIPPET and fullContent fields
   - Extract specific facts, dates, numbers
   - Synthesize into a direct answer
   - DO NOT just list titles and URLs
   - Use inline citations [1], [2], [3]

4. **Structure your response:**
   - Start with a direct answer
   - Provide supporting details
   - Include sources where applicable`,
    variables: ['question', 'conversationContext', 'taskClass', 'context', 'toolResults']
  },
  confidence: 0.95,
  foundation: true,
  metadata: {
    source: 'seed',
    category: 'prompt_template',
    description: 'Default reasoning template - the original codebase default'
  }
}
```

### 3.6 Step 7: Safety Checks

```typescript
{
  domain: 'expert.workflow.step.safety',
  name: 'default_safety_checker',
  trigger: {
    stepId: 'safety',
    stepOrder: 7,
    conditions: ['workflow.enableSafetyChecks === true']
  },
  action: {
    type: 'execute_step',
    stepLogic: {
      inputMapping: {
        'answer': '{{reason.answer}}',
        'filters': '{{config.safetyFilters}}'
      },
      outputMapping: {
        'passed': 'safetyPassed',
        'concerns': 'safetyConcerns',
        'filteredAnswer': 'cleanedAnswer'
      }
    }
  },
  confidence: 0.95,
  foundation: true,
  metadata: { source: 'seed', category: 'workflow_step' }
}

// Individual safety rules as patterns
{
  domain: 'expert.rules.safety.harmful',
  name: 'harmful_content_filter',
  trigger: {
    stepId: 'safety',
    conditions: ['safetyFilters.harmfulContent === true']
  },
  action: {
    type: 'apply_rule',
    ruleLogic: {
      patterns: [
        'how to (make|build|create) (a )?(bomb|weapon|explosive)',
        'how to (harm|kill|hurt|injure)',
        '(synthesis|create|make) (drugs|narcotics|illegal substances)'
      ],
      severity: 'block',
      message: 'Content blocked: potentially harmful instructions detected'
    }
  },
  confidence: 0.99,
  foundation: true,
  sticky: true,
  metadata: { source: 'seed', category: 'safety_rule', priority: 'critical' }
}
```

---

## 4. Pattern-Based Executor Flow

### 4.1 ExpertPatternExecutor Class

```typescript
// src/lib/server/execution/ExpertPatternExecutor.ts

import { cortexBrain } from '$lib/server/cortex/CortexBrain';
import { patternEvolutionService } from '$lib/server/cortex/PatternEvolutionService';

interface StepResult {
  stepId: string;
  success: boolean;
  output: any;
  patternUsed: string;
  duration: number;
  skipped?: boolean;
  skipReason?: string;
}

class ExpertPatternExecutor {
  private patterns: Map<string, CortexPattern[]> = new Map();
  private stepResults: StepResult[] = [];

  async loadPatterns(userId: string): Promise<void> {
    // Load all expert workflow patterns
    const domains = [
      'expert.workflow.step',
      'expert.prompts',
      'expert.rules',
      'expert.thresholds'
    ];

    for (const domain of domains) {
      const patterns = await cortexBrain.intelligentSearch(
        `domain:${domain}`,
        domain,
        { minimumConfidence: 0.5, limit: 50, userId }
      );
      this.patterns.set(domain, patterns);
    }
  }

  async executeWorkflow(
    question: string,
    context: any,
    config: any,
    connectedTools: any[]
  ): Promise<ExpertResult> {

    // Get step patterns ordered by stepOrder
    const stepPatterns = this.getOrderedStepPatterns();

    const workflowContext = {
      input: { question, context, history: config.conversationHistory },
      config,
      connectedTools,
      parsed: {},
      classification: {},
      tools: {},
      gather: {},
      reason: {},
      safety: {},
      verify: {}
    };

    for (const stepPattern of stepPatterns) {
      const stepId = stepPattern.trigger.stepId;

      // Check if step is enabled in config
      if (!this.isStepEnabled(stepId, config)) {
        this.stepResults.push({
          stepId,
          success: true,
          output: null,
          patternUsed: stepPattern.id,
          duration: 0,
          skipped: true,
          skipReason: 'Disabled in config'
        });
        continue;
      }

      // Check skip conditions
      if (this.shouldSkipStep(stepPattern, workflowContext)) {
        this.stepResults.push({
          stepId,
          success: true,
          output: null,
          patternUsed: stepPattern.id,
          duration: 0,
          skipped: true,
          skipReason: 'Skip condition met'
        });
        continue;
      }

      // Execute the step
      const startTime = Date.now();
      try {
        const result = await this.executeStep(stepPattern, workflowContext);
        workflowContext[stepId] = result;

        this.stepResults.push({
          stepId,
          success: true,
          output: result,
          patternUsed: stepPattern.id,
          duration: Date.now() - startTime
        });

        // Record success for pattern learning
        await patternEvolutionService.recordSuccess(stepPattern.id);

      } catch (error) {
        // Record failure for pattern learning
        await patternEvolutionService.recordFailure(stepPattern.id, error.message);

        // Apply fallback behavior
        const fallback = stepPattern.action.stepLogic?.fallbackBehavior;
        if (fallback === 'proceed_with_warning') {
          continue;
        } else {
          throw error;
        }
      }
    }

    return this.buildFinalResult(workflowContext);
  }

  private async executeStep(
    pattern: CortexPattern,
    context: any
  ): Promise<any> {
    const stepId = pattern.trigger.stepId;

    // Get associated prompt pattern
    const promptPattern = this.getPromptPattern(stepId);

    // Get associated rule patterns
    const rulePatterns = this.getRulePatterns(stepId);

    // Build input from mapping
    const input = this.mapInputs(pattern.action.stepLogic.inputMapping, context);

    // Execute based on step type
    switch (stepId) {
      case 'parse':
        return this.executeParse(input);
      case 'ambiguity':
        return this.executeAmbiguity(input, promptPattern);
      case 'classify':
        return this.executeClassify(input, rulePatterns);
      case 'tools':
        return this.executeToolPlanning(input, rulePatterns);
      case 'gather':
        return this.executeGather(input, context.connectedTools);
      case 'reason':
        return this.executeReasoning(input, promptPattern);
      case 'safety':
        return this.executeSafety(input, rulePatterns);
      case 'verify':
        return this.executeVerify(input, rulePatterns);
      default:
        throw new Error(`Unknown step: ${stepId}`);
    }
  }

  // ... implementation of each step using patterns ...
}
```

### 4.2 Pattern Resolution Flow

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Step Start  │────▶│ Load Patterns │────▶│ Check Config │
└──────────────┘     │ for Step ID   │     │   Enabled?   │
                     └───────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     │                            │                            │
                     ▼                            ▼                            ▼
              ┌────────────┐              ┌────────────┐              ┌────────────┐
              │   Skip     │              │ Get Prompt │              │ Get Rule   │
              │ (Disabled) │              │  Pattern   │              │  Patterns  │
              └────────────┘              └──────┬─────┘              └──────┬─────┘
                                                 │                           │
                                                 ▼                           ▼
                                          ┌────────────┐              ┌────────────┐
                                          │  Apply to  │              │  Apply to  │
                                          │   Input    │              │   Input    │
                                          └──────┬─────┘              └──────┬─────┘
                                                 │                           │
                                                 └───────────┬───────────────┘
                                                             ▼
                                                      ┌────────────┐
                                                      │  Execute   │
                                                      │    Step    │
                                                      └──────┬─────┘
                                                             │
                                                             ▼
                                                      ┌────────────┐
                                                      │  Record    │
                                                      │  Outcome   │
                                                      └────────────┘
```

---

## 5. Learning and Evolution System

### 5.1 Feedback Collection Points

| Event | Data Collected | Pattern Update |
|-------|----------------|----------------|
| User rates answer (1-5) | Rating, stepResults | Adjust confidence for all used patterns |
| User edits answer | Original, edited | Create correction pattern, version original |
| User asks clarification | Original question, clarification | Update ambiguity detection patterns |
| Step fails | Error, input, pattern | Record failure, trigger alternative generation |
| Step skipped | Reason, context | Adjust skip conditions |

### 5.2 Pattern Evolution Rules

```typescript
interface PatternEvolutionRule {
  trigger: 'low_rating' | 'high_failure' | 'user_correction' | 'high_success';
  threshold: number;
  action: 'decrease_confidence' | 'increase_confidence' | 'create_alternative' | 'version_upgrade';
}

const evolutionRules: PatternEvolutionRule[] = [
  {
    trigger: 'low_rating',
    threshold: 2.5,  // Average rating below 2.5
    action: 'decrease_confidence'
  },
  {
    trigger: 'high_failure',
    threshold: 0.3,  // 30% failure rate
    action: 'create_alternative'
  },
  {
    trigger: 'user_correction',
    threshold: 1,    // Any user correction
    action: 'version_upgrade'
  },
  {
    trigger: 'high_success',
    threshold: 0.9,  // 90% success rate
    action: 'increase_confidence'
  }
];
```

### 5.3 Automatic Pattern Generation

When a step consistently fails or gets low ratings:

1. **Analyze failure patterns** - What inputs cause failures?
2. **Query similar successful patterns** - What works in similar contexts?
3. **Generate alternative pattern** - LLM creates new pattern based on analysis
4. **A/B test** - Run both patterns, compare outcomes
5. **Promote winner** - Higher performing pattern gets higher confidence

---

## 6. UI Integration

### 6.1 Pattern Visibility in Workflow Tab

The Workflow tab will show patterns being used:

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Reason                                    [Edit]  │
├─────────────────────────────────────────────────────────────┤
│  Pattern: default_reasoning_template                        │
│  Confidence: 0.95                                           │
│  Version: 3 (updated 2 days ago)                           │
│  Success Rate: 87%                                          │
│                                                             │
│  [View Prompt] [View Alternatives] [Reset to Default]       │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Pattern Editor

Users can click "Edit" to modify patterns:

- View current prompt template
- See available variables
- Compare with default
- Save as new version
- Reset to default

---

## 7. Implementation Plan

### Phase 1: Pattern Infrastructure (Week 1-2)
- [ ] Create `ExpertWorkflowPattern` type extension
- [ ] Create seed script for all 8 step patterns
- [ ] Create seed script for prompt patterns
- [ ] Create seed script for rule patterns
- [ ] Add pattern domains to CORTEX

### Phase 2: Pattern Executor (Week 3-4)
- [ ] Create `ExpertPatternExecutor` class
- [ ] Implement pattern loading and caching
- [ ] Implement step execution with pattern lookup
- [ ] Integrate with existing Expert node executor

### Phase 3: Learning Integration (Week 5-6)
- [ ] Add feedback collection to Expert node
- [ ] Integrate with `PatternEvolutionService`
- [ ] Implement pattern versioning
- [ ] Add automatic alternative generation

### Phase 4: UI Integration (Week 7-8)
- [ ] Update Workflow tab to show patterns
- [ ] Add pattern editor modal
- [ ] Add pattern comparison view
- [ ] Add pattern reset functionality

---

## 8. Migration Strategy

### 8.1 Backward Compatibility

During migration, the system will:
1. Check if patterns exist in CORTEX
2. If not, use hardcoded defaults (current behavior)
3. Gradually seed patterns for users
4. Eventually deprecate hardcoded logic

### 8.2 Pattern Seeding for Existing Users

```typescript
async function migrateUserToPatterns(userId: string): Promise<void> {
  // Check if user already has expert patterns
  const existing = await cortexBrain.intelligentSearch(
    'domain:expert.workflow',
    'expert.workflow',
    { userId, limit: 1 }
  );

  if (existing.length === 0) {
    // Seed default patterns for this user
    await seedExpertPatterns(userId);
  }
}
```

---

## 9. Benefits Summary

| Aspect | Before (Hardcoded) | After (Pattern-Based) |
|--------|-------------------|----------------------|
| Customization | Code changes required | Edit pattern in UI |
| Learning | None | Automatic from feedback |
| Transparency | Hidden in code | Visible patterns |
| Evolution | Manual updates | Automatic improvement |
| Per-User | Same for all | Personalized patterns |
| Debugging | Read code | Inspect pattern used |
| A/B Testing | Not possible | Natural pattern competition |

---

## 10. Files to Create/Modify

### New Files
- `src/lib/server/execution/ExpertPatternExecutor.ts`
- `scripts/seed-expert-workflow-patterns.cjs`
- `scripts/seed-expert-prompt-patterns.cjs`
- `scripts/seed-expert-rule-patterns.cjs`

### Modified Files
- `src/lib/server/execution/expertWorkflow.ts` - Integrate pattern executor
- `src/lib/server/cortex/CortexPatternTypes.ts` - Add Expert pattern types
- `src/lib/components/modal-sections/ExpertGeneralSection.svelte` - Show patterns in UI
