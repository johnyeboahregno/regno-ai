# Skills Architecture

## Overview

Skills are **repeatable, trainable pipeline generation templates** built on top of CORTEX scenarios. While scenarios provide the foundational patterns, skills capture **learned excellence** from successful executions.

## The Problem

We have 20 scenarios with 1080+ CORTEX patterns, but:
- Scenario execution is non-deterministic (LLM reasoning varies)
- Optimal configurations are discovered but not preserved
- Success isn't measured or reinforced
- User corrections don't persist across sessions

## The Solution: Skills

A Skill = Scenario + Learned Parameters + Success Criteria + Execution History

```
┌─────────────────────────────────────────────────────────────┐
│                         SKILL                                │
├─────────────────────────────────────────────────────────────┤
│  Scenario Base:                                              │
│  └─ scenarioId: "customer_360"                              │
│  └─ patterns: [...referenced CORTEX patterns]               │
│                                                              │
│  Learned Parameters:                                         │
│  └─ optimalConfigs: { nodeType -> config overrides }        │
│  └─ promptTemplates: { phase -> validated prompts }         │
│  └─ dataStrategies: { dataSize -> strategy }                │
│                                                              │
│  Success Criteria:                                           │
│  └─ expectedOutcomes: ["segmentation", "LTV calculation"]   │
│  └─ qualityThresholds: { accuracy: 0.85, relevance: 0.9 }   │
│  └─ executionBenchmarks: { avgDuration, tokenUsage }        │
│                                                              │
│  Training Data:                                              │
│  └─ executions: [{ projectId, outcome, feedback, score }]   │
│  └─ refinements: [{ field, before, after, improvement }]    │
│  └─ feedback: [{ rating, comments, timestamp }]             │
└─────────────────────────────────────────────────────────────┘
```

## MongoDB Schema

### Collection: `skills`

```javascript
{
  _id: ObjectId,
  id: "skill_customer_360_v1",
  name: "Customer 360 Analysis",
  description: "Create unified customer view with identity resolution",

  // Scenario Reference
  scenario: {
    id: "customer_360",
    projectType: "customer_360",
    version: 1
  },

  // Learned Optimal Configurations
  learnedConfigs: {
    "data-source": {
      recordLimit: 5000,
      samplingMode: "stratified",
      samplingRate: 0.1
    },
    "data-analyst": {
      analysisTypes: ["segmentation", "scoring", "correlation"],
      temperature: 0.3
    },
    "mapper": {
      mode: "ai-assisted",
      preserveOriginal: true
    }
  },

  // Validated Prompt Templates
  promptTemplates: {
    goalAnalysis: "Analyze customer data to create a 360-degree view...",
    systemPrompt: "You are a customer analytics expert...",
    synthesisPrompt: "Combine the following customer insights..."
  },

  // Data Strategy Preferences
  dataStrategies: {
    tiny: { strategy: "direct", confidence: 0.95 },
    small: { strategy: "hybrid", confidence: 0.9 },
    medium: { strategy: "aggregation", confidence: 0.85 },
    large: { strategy: "sampling", confidence: 0.8 },
    massive: { strategy: "tiered", confidence: 0.75 }
  },

  // Success Criteria
  successCriteria: {
    expectedNodes: ["data-source", "mapper", "data-analyst", "chart"],
    expectedOutputs: ["customer_segments", "ltv_scores", "health_scores"],
    qualityMetrics: {
      executionSuccess: 0.95,
      userSatisfaction: 4.0,
      pipelineCompleteness: 0.9
    }
  },

  // Training Statistics
  training: {
    totalExecutions: 47,
    successfulExecutions: 42,
    avgUserRating: 4.3,
    lastTrained: ISODate,
    trainingStatus: "stable" // "needs_training", "in_training", "stable"
  },

  // Execution History (last 100)
  executionHistory: [
    {
      projectId: "xxx",
      timestamp: ISODate,
      success: true,
      userRating: 5,
      feedback: "Excellent segmentation results",
      durationMs: 12500,
      tokensUsed: 4500,
      nodesGenerated: 5,
      refinementsApplied: 2
    }
  ],

  // Learned Refinements
  refinements: [
    {
      id: "ref_001",
      source: "user_feedback",
      field: "data-analyst.analysisTypes",
      before: ["distribution"],
      after: ["distribution", "segmentation", "scoring"],
      appliedCount: 15,
      successRate: 0.93
    }
  ],

  // Metadata
  metadata: {
    version: 3,
    createdAt: ISODate,
    updatedAt: ISODate,
    createdBy: "system",
    tags: ["customer", "analytics", "segmentation"],
    difficulty: "intermediate",
    estimatedDuration: "2-5 minutes"
  },

  // Status
  status: "active", // "draft", "active", "deprecated"
  visibility: "public" // "private", "team", "public"
}
```

## Skills Service API

### SkillsService Methods

```typescript
// CRUD Operations
getSkills(filter?: SkillFilter): Promise<Skill[]>
getSkillById(skillId: string): Promise<Skill>
getSkillByScenario(scenarioId: string): Promise<Skill | null>
createSkill(skill: CreateSkillInput): Promise<Skill>
updateSkill(skillId: string, updates: Partial<Skill>): Promise<Skill>

// Training Operations
recordExecution(skillId: string, execution: SkillExecution): Promise<void>
recordFeedback(skillId: string, feedback: SkillFeedback): Promise<void>
applyRefinement(skillId: string, refinement: SkillRefinement): Promise<void>
recalculateMetrics(skillId: string): Promise<TrainingMetrics>

// Query Operations
findBestSkillForGoal(goal: string): Promise<Skill | null>
getSkillRecommendations(context: UserContext): Promise<Skill[]>
getSkillsByTag(tags: string[]): Promise<Skill[]>

// Integration
getLearnedConfigs(skillId: string, nodeType: string): Promise<NodeConfig>
getPromptTemplate(skillId: string, phase: string): Promise<string>
getDataStrategy(skillId: string, dataSize: string): Promise<DataStrategy>
```

## Integration with Stage V2

### StageOrchestrator Changes

```typescript
// In StageOrchestrator.generate()
async generate(request: GenerationRequest) {
  // 1. Detect skill from goal
  const skill = await skillsService.findBestSkillForGoal(request.goal);

  // 2. If skill found, use learned configs
  if (skill) {
    this.emit('skill_matched', { skillId: skill.id, confidence: 0.85 });

    // Apply learned configs to SmartDefaultEngine
    smartDefaultEngine.setSkillConfigs(skill.learnedConfigs);

    // Use validated prompt templates
    llmReasoningEngine.setPromptTemplates(skill.promptTemplates);

    // Apply data strategy preferences
    dataStrategyEngine.setPreferences(skill.dataStrategies);
  }

  // 3. Continue with normal generation...
  // 4. After execution, record to skill
  await skillsService.recordExecution(skill.id, executionResult);
}
```

### SmartDefaultEngine Changes

```typescript
class SmartDefaultEngine {
  private skillConfigs: Map<string, NodeConfig> = new Map();

  setSkillConfigs(configs: Record<string, NodeConfig>) {
    this.skillConfigs = new Map(Object.entries(configs));
  }

  async generateDefaults(node: Node, context: GenerationContext) {
    // Check skill configs first
    const skillConfig = this.skillConfigs.get(node.type);
    if (skillConfig) {
      // Merge skill config with base config
      return { ...baseConfig, ...skillConfig, source: 'skill' };
    }

    // Fall back to CORTEX patterns
    return this.inferFromPatterns(node, context);
  }
}
```

## Training Mode UI

### Project List Enhancements

When in Training Mode, the project list shows:

```
┌─────────────────────────────────────────────────────────────┐
│ 🧪 TRAINING MODE                              [Exit Training]│
├─────────────────────────────────────────────────────────────┤
│ Filter: [All Skills ▼] [Search...               ]          │
│                                                              │
│ ┌─ Customer 360 Analysis ─────────────────────────────────┐ │
│ │ ⭐ 4.3/5 │ 47 runs │ 89% success │ stable              │ │
│ │ Create unified customer view with identity resolution    │ │
│ │ Tags: #customer #analytics #segmentation                 │ │
│ │ [▶ Run Skill] [📊 View History] [⚙️ Configure]          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ Sales Performance Dashboard ───────────────────────────┐ │
│ │ ⭐ 4.1/5 │ 32 runs │ 94% success │ stable              │ │
│ │ Sales KPIs, trends, forecasting, and dashboard          │ │
│ │ Tags: #sales #dashboard #kpi                             │ │
│ │ [▶ Run Skill] [📊 View History] [⚙️ Configure]          │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Feedback Form (Sidebar)

```
┌─ Training Feedback ────────────────────┐
│                                        │
│ Skill: Customer 360 Analysis           │
│ Project: proj_abc123                   │
│                                        │
│ Overall Rating:                        │
│ ⭐⭐⭐⭐☆ (4/5)                         │
│                                        │
│ Pipeline Quality:                      │
│ ○ Excellent - No changes needed        │
│ ● Good - Minor improvements            │
│ ○ Fair - Significant issues            │
│ ○ Poor - Major problems                │
│                                        │
│ What worked well?                      │
│ ┌──────────────────────────────────┐  │
│ │ The segmentation was accurate    │  │
│ │ and the LTV calculations were    │  │
│ │ spot on.                         │  │
│ └──────────────────────────────────┘  │
│                                        │
│ What needs improvement?                │
│ ┌──────────────────────────────────┐  │
│ │ The chart type selection could   │  │
│ │ be better - pie chart isn't      │  │
│ │ ideal for this data.             │  │
│ └──────────────────────────────────┘  │
│                                        │
│ Specific Issues: (check all that apply)│
│ ☐ Wrong node types generated           │
│ ☐ Missing required nodes               │
│ ☑ Suboptimal configuration             │
│ ☐ Slow execution                       │
│ ☐ Incorrect data handling              │
│                                        │
│ [Submit Feedback]                      │
│                                        │
│ ℹ️ Feedback creates improvement task   │
└────────────────────────────────────────┘
```

## Task Generation from Feedback

When feedback is submitted with rating < 4 or issues selected:

```javascript
// Auto-generated task file
{
  filename: "004-skill-improvement-customer-360.md",
  content: `
# Task: Improve Customer 360 Skill

## Context
- Skill: Customer 360 Analysis (skill_customer_360_v1)
- Project: proj_abc123
- User Rating: 4/5
- Feedback Type: Suboptimal configuration

## User Feedback
**What worked well:**
The segmentation was accurate and the LTV calculations were spot on.

**What needs improvement:**
The chart type selection could be better - pie chart isn't ideal for this data.

## MongoDB References
- Project: db.stageProjects.findOne({ _id: "proj_abc123" })
- Skill: db.skills.findOne({ id: "skill_customer_360_v1" })
- Execution: db.stageProjectExecutions.find({ projectId: "proj_abc123" })

## Suggested Actions
1. Review chart type selection logic in SmartDefaultEngine
2. Add CORTEX pattern for data-analyst → chart type mapping
3. Update skill learnedConfigs with better chart defaults

## Priority
Medium (user rated 4/5, single issue category)
  `
}
```

## File Structure

```
src/lib/server/services/
├── skillsService.ts           # Main Skills service

src/lib/server/stage/v2/
├── SkillMatcher.ts            # Match goals to skills
├── SkillTrainer.ts            # Learning from feedback

src/lib/components/stage/
├── SkillsBrowser.svelte       # Skills list for training mode
├── SkillCard.svelte           # Individual skill display
├── TrainingFeedback.svelte    # Feedback form component
├── TrainingModeToggle.svelte  # Toggle training mode

src/routes/api/skills/
├── +server.ts                 # CRUD endpoints
├── [id]/+server.ts            # Single skill operations
├── [id]/feedback/+server.ts   # Submit feedback
├── [id]/execute/+server.ts    # Run skill
```

## Migration Plan

1. **Phase 1**: Create Skills collection and service
2. **Phase 2**: Seed initial skills from existing scenarios
3. **Phase 3**: Integrate with StageOrchestrator
4. **Phase 4**: Add Training Mode UI
5. **Phase 5**: Implement feedback → task generation

---

*Architecture designed: December 12, 2025*
