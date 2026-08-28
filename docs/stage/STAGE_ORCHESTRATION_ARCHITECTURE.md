# STAGE Orchestration Architecture

## Overview

STAGE is the intelligent project execution platform that orchestrates Regno AI's components to handle complex multi-step tasks. When a user types a project description, STAGE automatically:

1. **Retrieves context** from past similar projects (CORTEX)
2. **Analyzes intent** and determines complexity (LLM)
3. **Decomposes into phases** and orchestrates execution (MAESTRO)
4. **Executes workflows** through pipelines (FLUX)
5. **Monitors performance** and tracks costs (SENTINEL)
6. **Learns and improves** from outcomes (CORTEX feedback loop)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                          ┌─────────┐                             │
│                          │  STAGE  │                             │
│                          └────┬────┘                             │
│                               │                                  │
│      Split Mode: Execution │ Dev Panel (when enabled)           │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ↓                       ↓
        ┌───────────────────┐   ┌──────────────────┐
        │  CORTEX (Memory)  │   │  LLM (Analysis)  │
        │  - Retrieval      │   │  - Intent        │
        │  - Storage        │   │  - Complexity    │
        │  - Learning       │   │  - Decomposition │
        └────────┬──────────┘   └────────┬─────────┘
                 │                       │
                 └───────────┬───────────┘
                             ↓
                  ┌──────────────────┐
                  │     MAESTRO      │
                  │  - Orchestration │
                  │  - Phase Control │
                  │  - Coordination  │
                  └────────┬─────────┘
                           │
                ┌──────────┴──────────┐
                ↓                     ↓
    ┌───────────────────┐  ┌─────────────────┐
    │      FLUX         │  │    SENTINEL     │
    │  - Pipelines      │  │  - Monitoring   │
    │  - Execution      │  │  - Metrics      │
    │  - Data Flow      │  │  - Costs        │
    └───────────────────┘  └─────────────────┘

        All telemetry feeds back to CORTEX for learning
```

## Component Responsibilities

### STAGE (User Interface)
- **Input**: Natural language project descriptions
- **Modes**:
  - **Production Mode**: Clean execution view
  - **Dev Mode**: Split screen with detailed telemetry
- **Features**:
  - Real-time execution streaming
  - Phase-by-phase progress
  - Interactive results
  - Dev panel with explanations

### CORTEX (Memory & Context)
- **Retrieval**: Find similar past projects
- **Storage**: Save successful patterns
- **Learning**: Build knowledge graphs
- **Embeddings**: Semantic search
- **Graph**: Entity relationships

### LLM (Analysis)
- **Intent Detection**: Understand user goals
- **Complexity Analysis**: Determine orchestration needs
- **Decomposition**: Break into phases
- **Synthesis**: Generate final outputs

### MAESTRO (Orchestration)
- **Phase Planning**: Create execution plan
- **Coordination**: Manage component interactions
- **Adaptive Execution**: Adjust based on results
- **Error Recovery**: Handle failures gracefully

### FLUX (Pipeline Execution)
- **Data Sources**: Connect to databases, APIs
- **Transformations**: Clean and process data
- **Analysis**: Run algorithms, LLMs
- **Visualizations**: Generate charts
- **Outputs**: Produce results

### SENTINEL (Monitoring)
- **Metrics**: Track performance
- **Costs**: Monitor LLM usage
- **Logs**: Detailed execution traces
- **Alerts**: Budget thresholds
- **Analytics**: Usage patterns

## Execution Flow: Customer Segmentation Example

```
Step 1: User Input
├─ User: "Analyze MongoDB customer data and create segmentation report"
└─ STAGE receives input

Step 2: Context Retrieval (CORTEX)
├─ Search memories: "MongoDB", "segmentation", "customer analysis"
├─ Found 3 similar past projects
└─ Context: MongoDB aggregation patterns, K-means clustering

Step 3: Intent Analysis (LLM)
├─ Determine: Multi-step complex task
├─ Requires: Data retrieval, analysis, visualization, reporting
└─ Decision: Trigger MAESTRO orchestration

Step 4: Phase Planning (MAESTRO)
├─ Phase 1: Connect to MongoDB, fetch customer data
├─ Phase 2: Clean and preprocess data
├─ Phase 3: Perform segmentation (K-means, RFM)
├─ Phase 4: Generate insights per segment
├─ Phase 5: Create visualization charts
└─ Phase 6: Synthesize final report

Step 5: Execution (FLUX)
├─ Phase 1: DataSource node → MongoDB query → 10K records
├─ Phase 2: Transform nodes → Clean nulls, normalize
├─ Phase 3: LLM Processor → K-means clustering → 5 segments
├─ Phase 4: LLM Analysis → Segment characteristics
├─ Phase 5: Chart nodes → Bar, pie, scatter plots
└─ Phase 6: LLM Synthesis → Final HTML report

Step 6: Monitoring (SENTINEL)
├─ Total time: 47 seconds
├─ Total cost: $0.42
├─ LLM calls: 8 (4 GPT-4, 4 GPT-3.5)
├─ Data processed: 10,000 records
└─ Success: ✓

Step 7: Memory Storage (CORTEX)
├─ Store orchestration as episodic memory
├─ Extract entities: MongoDB, segmentation, K-means
├─ Build graph: segmentation REQUIRES data cleaning
├─ Generate embeddings for future retrieval
└─ Tag as successful pattern

Step 8: Results (STAGE)
└─ Stream final report to user via SSE
```

## Dev Mode: Detailed Telemetry

When Dev Mode is enabled, STAGE displays a split-screen interface:

### Left Panel: Execution View
- Real-time phase progress
- Visual pipeline representation
- Results preview
- Interactive charts

### Right Panel: Dev Panel
Shows for each phase:

```
┌─────────────────────────────────────────┐
│ Phase 1: MongoDB Data Retrieval         │
├─────────────────────────────────────────┤
│ What: Connected to MongoDB customers DB │
│ Why: Need source data for segmentation  │
│                                          │
│ Component: FLUX DataSource               │
│ Node ID: ds_customers_001                │
│                                          │
│ Results:                                 │
│ ├─ Records: 10,000                       │
│ ├─ Time: 2.3s                            │
│ └─ Status: Success ✓                     │
│                                          │
│ Query Used:                              │
│ db.customers.aggregate([                 │
│   { $match: { active: true } },          │
│   { $project: { ... } }                  │
│ ])                                       │
│                                          │
│ Recommendations:                         │
│ • Add index on 'active' field            │
│ • Consider pagination for >100K records  │
└─────────────────────────────────────────┘
```

## Self-Improvement Loop

STAGE uses its own components to improve itself:

```
┌─────────────────────────────────────────┐
│ 1. Execution Monitoring (SENTINEL)      │
│    - Track success/failure rates         │
│    - Measure performance metrics         │
│    - Identify bottlenecks                │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Pattern Analysis (CORTEX + LLM)      │
│    - Identify successful patterns        │
│    - Find common failure modes           │
│    - Extract optimization opportunities  │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Improvement Suggestions (MAESTRO)    │
│    - Generate optimization proposals     │
│    - A/B test different approaches       │
│    - Validate improvements               │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. Feedback Integration (CORTEX)        │
│    - Store validated improvements        │
│    - Update orchestration templates     │
│    - Refine phase decomposition logic   │
└─────────────────────────────────────────┘
```

### Example Self-Improvement Cycle

**Week 1**: User runs 10 MongoDB segmentation projects
- SENTINEL observes: Average time = 45s, Average cost = $0.40
- CORTEX stores: All used similar phases

**Week 2**: LLM analyzes patterns
- Discovery: Data cleaning always needed before segmentation
- Discovery: K-means works better with normalized data
- Suggestion: Pre-optimize data pipeline

**Week 3**: MAESTRO implements improvement
- Template updated: Add automatic normalization step
- A/B test: 50% of projects use new template

**Week 4**: Validation
- New average time: 38s (15% faster)
- New average cost: $0.35 (12% cheaper)
- Success rate: Same (no regressions)
- Decision: Roll out to 100% of projects

**Result**: CORTEX stores optimized template as preferred pattern

## Dev Mode Settings

```typescript
interface DevModeConfig {
  enabled: boolean;
  panelPosition: 'right' | 'bottom' | 'floating';
  panelWidth: number; // percentage
  showComponents: {
    explanations: boolean;      // What & Why
    componentDetails: boolean;  // Node IDs, configs
    results: boolean;           // Outputs from each phase
    errors: boolean;            // Error traces
    recommendations: boolean;   // AI suggestions
    performance: boolean;       // Timing, costs
    rawLogs: boolean;          // Full debug logs
  };
  autoScroll: boolean;
  highlightErrors: boolean;
  collapsible: boolean;
}
```

## API Endpoints

### Execute Project
```typescript
POST /api/stage/execute
Body: {
  projectDescription: string;
  devMode?: boolean;
  userId: string;
}
Response: {
  executionId: string;
  phases: Phase[];
  sseEndpoint: string; // For real-time updates
}
```

### Get Execution Telemetry
```typescript
GET /api/stage/execution/:executionId/telemetry
Response: {
  phases: Array<{
    phaseId: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    explanation: {
      what: string;
      why: string;
    };
    component: string;
    results: any;
    errors: Error[];
    recommendations: string[];
    performance: {
      startTime: number;
      endTime: number;
      duration: number;
      cost: number;
    };
  }>;
}
```

### Get Improvement Suggestions
```typescript
POST /api/stage/analyze-improvements
Body: {
  projectType: string;
  timeWindow: '7d' | '30d' | '90d';
}
Response: {
  suggestions: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
    estimatedImprovement: {
      time: string;
      cost: string;
    };
  }>;
}
```

## Database Schema

### Executions Collection
```typescript
{
  _id: ObjectId,
  executionId: string,
  userId: string,
  projectDescription: string,
  status: 'running' | 'completed' | 'failed',
  phases: Phase[],
  results: any,
  telemetry: {
    totalTime: number,
    totalCost: number,
    llmCalls: number,
    dataProcessed: number
  },
  createdAt: Date,
  completedAt: Date
}
```

### Patterns Collection (CORTEX)
```typescript
{
  _id: ObjectId,
  patternId: string,
  name: string,
  description: string,
  projectType: string,
  phases: PhaseTemplate[],
  successRate: number,
  avgPerformance: {
    time: number,
    cost: number
  },
  usageCount: number,
  embedding: number[], // For semantic search
  lastUsed: Date,
  validated: boolean
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create STAGE route and interface
- [ ] Implement split-mode layout
- [ ] Build DevPanel component
- [ ] Add dev mode toggle in settings
- [ ] Create API endpoints for execution

### Phase 2: Orchestration Integration (Week 3-4)
- [ ] Connect STAGE → CORTEX retrieval
- [ ] Integrate LLM intent analysis
- [ ] Wire up MAESTRO orchestration
- [ ] Stream FLUX execution to UI
- [ ] Display SENTINEL metrics

### Phase 3: Dev Mode Telemetry (Week 5-6)
- [ ] Implement detailed logging
- [ ] Build explanation generation
- [ ] Create recommendation engine
- [ ] Add error diagnostics
- [ ] Performance profiling

### Phase 4: Self-Improvement Loop (Week 7-8)
- [ ] Pattern detection in CORTEX
- [ ] Automated A/B testing
- [ ] Improvement validation
- [ ] Template optimization
- [ ] Feedback integration

## Success Metrics

### User Experience
- Time to complete complex projects: Target < 60s
- Success rate: Target > 95%
- User satisfaction: Target > 4.5/5

### System Performance
- Average orchestration time: Target < 5s
- Average execution cost: Track and optimize
- Error recovery rate: Target > 90%

### Self-Improvement
- New patterns learned per week: Target > 3
- Validated improvements per month: Target > 5
- Performance improvement rate: Target +10% per quarter

## Next Steps

1. **Review this architecture** with the team
2. **Implement core STAGE interface** with split mode
3. **Build DevPanel component** with telemetry
4. **Create orchestration API** endpoints
5. **Integrate all components** into flow
6. **Test with real projects** and iterate
7. **Enable self-improvement loop** and monitor

---

**Status**: Architecture documented ✓
**Next**: Implement STAGE interface
**Owner**: Development Team
**Updated**: 2025-11-19
