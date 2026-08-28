# AI-Powered Staging System

## Overview

The Regno.ai Staging System is a **meta-orchestration platform** that uses AI to dynamically generate and execute multi-phase projects in real-time. Instead of pre-building executors for specific scenarios, the system can understand natural language goals and create execution plans on the fly.

## How It Works

### User Flow

1. **User describes their goal** in natural language:
   ```
   "Analyze our MongoDB customer data and create a segmentation report with RFM analysis"
   ```

2. **AI generates a staged project plan** including:
   - Project name and description
   - 5-12 executable phases
   - Component assignments (MAESTRO, CORTEX, FLUX, etc.)
   - Estimated duration
   - Prerequisites check

3. **User reviews and confirms** the generated plan

4. **System executes each phase** using real Regno.ai components

5. **User monitors progress** with real-time LLM activity, metrics, and results

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User Input (Natural Language Goal)                     │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  ProjectGenerator (AI-Powered)                          │
│  - Analyzes goal using LLM                              │
│  - Determines required components                       │
│  - Breaks down into phases                              │
│  - Generates PhaseDefinition[]                          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  DynamicProjectExecutor                                 │
│  - Implements StagedProjectExecutor interface           │
│  - Routes phases to appropriate components              │
│  - Executes MAESTRO, CORTEX, FLUX, MongoDB, LLM        │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Real Regno.ai Components Execute                       │
│  - MaestroExecutor: AI planning & orchestration         │
│  - CORTEX: Vector memory storage/retrieval             │
│  - FLUX: Data pipelines (DataSource, Mapper, Insight)  │
│  - MongoDB: Database operations                         │
│  - LLM: Direct AI analysis                              │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. ProjectGenerator (`/src/lib/server/stage/ProjectGenerator.ts`)

**Purpose**: Uses AI to analyze natural language goals and generate executable project plans.

**Key Methods**:
- `generateProject(request, llmCredentialId, userId)`: Main generation method
- `validateProject(project)`: Checks prerequisites

**AI Prompt Strategy**:
- System prompt explains all Regno.ai components (MAESTRO, CORTEX, FLUX, SENTINEL, NEXUS)
- Provides common phase patterns
- Requires JSON response format with phases, components, and prerequisites

**Example Generated Project**:
```json
{
  "name": "Customer Segmentation Analysis",
  "description": "RFM-based segmentation with AI insights",
  "phases": [
    {
      "num": 0,
      "name": "Data Seeding",
      "component": "MongoDB",
      "icon": "💾",
      "description": "Create sample customer data"
    },
    {
      "num": 1,
      "name": "Context Retrieval",
      "component": "CORTEX",
      "icon": "🧠",
      "description": "Search for relevant past patterns"
    }
    // ... more phases
  ],
  "estimatedDuration": "5-10 minutes",
  "requiredComponents": ["MAESTRO", "CORTEX", "FLUX"],
  "prerequisites": ["MongoDB credentials", "LLM credentials"]
}
```

### 2. DynamicProjectExecutor (`/src/lib/server/stage/executors/DynamicProjectExecutor.ts`)

**Purpose**: Executes AI-generated project plans by routing each phase to the appropriate Regno.ai component.

**Key Methods**:
- `executePhase(phaseNum, context)`: Main execution entry point
- `routePhaseExecution(phase, context)`: Routes to appropriate component
- `executeMaestroPhase()`: MAESTRO orchestration
- `executeCortexPhase()`: Vector memory operations
- `executeFluxPhase()`: Data pipeline execution
- `executeMongoPhase()`: Database operations
- `executeLLMPhase()`: Direct LLM analysis

**Component Routing Logic**:
```typescript
const component = phase.component.toUpperCase();

if (component.includes('MAESTRO')) → executeMaestroPhase()
if (component.includes('CORTEX')) → executeCortexPhase()
if (component.includes('FLUX')) → executeFluxPhase()
if (component.includes('MONGODB')) → executeMongoPhase()
if (component.includes('LLM')) → executeLLMPhase()
```

### 3. StagedProjectExecutor Interface (`/src/lib/server/stage/StagedProjectExecutor.ts`)

**Purpose**: Standard interface that all project executors (static and dynamic) must implement.

**Interface Definition**:
```typescript
interface StagedProjectExecutor {
  scenario: string;          // Unique ID
  name: string;             // Display name
  description: string;      // What it does
  getPhases(): PhaseDefinition[];
  executePhase(phaseNum, context): Promise<PhaseResult>;
  validate?(): Promise<{ valid: boolean; errors: string[] }>;
}
```

**Registry Pattern**:
```typescript
class StagedProjectRegistry {
  static register(executor: StagedProjectExecutor): void;
  static getExecutor(scenario: string): StagedProjectExecutor;
  static getAllExecutors(): StagedProjectExecutor[];
}
```

### 4. API Endpoints

#### POST `/api/stage/generate-project`
**Input**:
```json
{
  "goal": "Analyze customer data and create segmentation report",
  "context": {
    "availableDataSources": ["MongoDB"],
    "availableCredentials": ["OpenAI"]
  }
}
```

**Output**:
```json
{
  "success": true,
  "project": {
    "id": "generated_1700000000000",
    "scenario": "generated_1700000000000",
    "name": "Customer Segmentation Analysis",
    "phases": [...],
    "validation": { "valid": true, "errors": [] }
  }
}
```

#### POST `/api/stage/execute-phase/[phaseNum]`
**Input**:
```json
{
  "projectId": "generated_1700000000000"
}
```

**Output**:
```json
{
  "success": true,
  "details": { "message": "Phase completed" },
  "cost": 0.003,
  "llmCalls": 2,
  "llmActivity": [...],
  "dbOperations": [...],
  "vectorOperations": [...],
  "maestroData": {...}
}
```

### 5. UI (`/src/routes/stage/+page.svelte`)

**Two Creation Modes**:

1. **Quick Create**: Predefined scenarios (e.g., Customer Segmentation)
2. **AI Create** 🤖: Natural language goal → AI-generated project

**Features**:
- Mode toggle between Quick and AI creation
- Textarea for natural language input
- Real-time project generation with LLM
- Preview of generated phases before execution
- Validation warnings display
- Phase-by-phase execution with progress tracking
- Inline LLM activity display per phase
- Cumulative metrics across all phases
- Expandable LLM activity viewer (using shared component)

## Example User Scenarios

### Scenario 1: Customer Segmentation
**User Input**:
```
"Analyze our MongoDB customer data and create an RFM segmentation report with actionable insights"
```

**AI-Generated Plan** (example):
1. 💾 Data Seeding (MongoDB) - Create sample customer data
2. 🧠 Context Retrieval (CORTEX) - Search for past segmentation patterns
3. 🎼 Planning (MAESTRO) - AI breaks down segmentation goal
4. 📊 Data Retrieval (FLUX + MongoDB) - Fetch customer data
5. ⚙️ Transformation (FLUX) - Calculate RFM scores
6. 🎯 Analysis (LLM + CORTEX) - Perform segmentation
7. 💡 Insights (LLM) - Generate segment-specific insights
8. 📈 Visualization (FLUX) - Create D3 charts
9. 📝 Report (LLM + CORTEX) - Generate summary, store memory

### Scenario 2: Fraud Detection
**User Input**:
```
"Build a fraud detection system that analyzes transaction patterns and flags suspicious activity"
```

**AI-Generated Plan** (example):
1. 💾 Transaction Data Seeding (MongoDB)
2. 🧠 Pattern Library Retrieval (CORTEX)
3. 🎼 System Design (MAESTRO)
4. 📊 Transaction Ingestion (FLUX)
5. 🔍 Anomaly Detection (NEXUS + LLM)
6. 🛡️ Risk Scoring (SENTINEL)
7. 🚨 Alert Generation (LLM)
8. 📊 Dashboard Creation (FLUX)
9. 📝 Reporting & Memory (CORTEX)

### Scenario 3: Sentiment Analysis
**User Input**:
```
"Analyze customer feedback from our support tickets and identify key themes and sentiment trends"
```

**AI-Generated Plan** (example):
1. 💾 Ticket Data Loading (MongoDB)
2. 🧠 Past Analysis Retrieval (CORTEX)
3. 🎼 Analysis Planning (MAESTRO)
4. 📊 Data Extraction (FLUX)
5. 🔬 Sentiment Classification (LLM)
6. 🎯 Theme Extraction (LLM + CORTEX)
7. 📈 Trend Visualization (FLUX)
8. 💡 Actionable Insights (LLM)
9. 📝 Executive Summary (LLM + CORTEX)

## Development Workflow

### Adding New Component Support

To add support for a new Regno.ai component (e.g., SENTINEL, NEXUS):

1. **Update ProjectGenerator prompt** (`ProjectGenerator.ts`):
   ```typescript
   Regno.ai Components Available:
   ...
   - SENTINEL: Security and compliance monitoring
   - NEXUS: Predictive analytics and forecasting
   ```

2. **Add routing logic** (`DynamicProjectExecutor.ts`):
   ```typescript
   if (component.includes('SENTINEL')) {
     return await this.executeSentinelPhase(phase, context);
   }
   ```

3. **Implement execution method**:
   ```typescript
   private async executeSentinelPhase(
     phase: PhaseDefinition,
     context: ExecutionContext
   ): Promise<PhaseResult> {
     // Implementation
   }
   ```

### Creating Predefined Executors

For common scenarios, you can still create static executors:

1. **Create executor class** (`/src/lib/server/stage/executors/RiskAnalysisExecutor.ts`):
   ```typescript
   export class RiskAnalysisExecutor implements StagedProjectExecutor {
     readonly scenario = 'risk_analysis';
     readonly name = 'Risk Analysis Project';

     getPhases() { /* ... */ }
     executePhase(phaseNum, context) { /* ... */ }
   }
   ```

2. **Register at startup** (`initializeStageExecutors.ts`):
   ```typescript
   StagedProjectRegistry.register(new RiskAnalysisExecutor());
   ```

## LLM Activity Tracking

All LLM calls during phase execution are automatically tracked and displayed:

**Per-Phase Display**:
- Shown inline in each phase's expanded details
- Uses shared `LLMActivityDisplay` component
- Shows tokens, costs, duration, success/error

**Cumulative Display**:
- Aggregates all LLM activity across all phases
- Expandable section below metrics
- Full audit trail with questions, answers, reasoning

**Data Source**: `permanentHistory.getLLMHistory({ executionId })`

## Best Practices

### For Users

1. **Be specific in your goals**: Include data sources, desired outputs, and constraints
2. **Review generated plans**: Check phase count and component assignments before executing
3. **Address validation warnings**: Ensure credentials and prerequisites are available
4. **Monitor LLM activity**: Review AI reasoning during execution for insights

### For Developers

1. **Keep phase execution focused**: Each phase should have a single, clear responsibility
2. **Use meaningful error messages**: Help users understand what went wrong
3. **Track all LLM calls**: Always save to permanentHistory for transparency
4. **Validate prerequisites**: Check credentials, data availability before execution
5. **Return structured results**: Use consistent PhaseResult format

## Future Enhancements

### Near-Term
- [ ] Interactive phase refinement (user can adjust AI-generated plan)
- [ ] Phase dependencies and conditional execution
- [ ] Parallel phase execution where possible
- [ ] Real-time streaming updates during phase execution
- [ ] Phase result caching and reuse

### Mid-Term
- [ ] CORTEX vector memory integration (learn from past projects)
- [ ] SENTINEL security scanning for generated plans
- [ ] NEXUS predictive duration/cost estimation
- [ ] Template library (save and reuse successful plans)
- [ ] A/B testing of different phase strategies

### Long-Term
- [ ] Multi-agent collaboration (multiple AIs working together)
- [ ] Self-healing executors (retry with strategy adjustment)
- [ ] Automated optimization (AI learns better phase sequences)
- [ ] Natural language mid-execution adjustments
- [ ] Full visual pipeline builder (no-code experience)

## Technical Details

### Execution Context
```typescript
interface ExecutionContext {
  projectId: string;
  phaseNum: number;
  userId: string;
  executionId: string;  // For LLM activity tracking
}
```

### Phase Result Format
```typescript
interface PhaseResult {
  details: any;                    // Phase-specific results
  cost: number;                    // Total LLM cost
  llmCalls: number;                // Number of LLM calls
  llmActivity: any[];              // LLM call details
  vectorOperations?: any[];        // CORTEX operations
  dbOperations?: any[];            // MongoDB operations
  graphOperations?: any[];         // Graph DB operations
  maestroData?: any;               // MAESTRO-specific data
  pipelineData?: any;              // FLUX pipeline data
  error?: string;                  // Error message if failed
}
```

### LLM Activity Format
```typescript
{
  _id: string;
  timestamp: Date;
  nodeType: string;               // "MAESTRO", "Insight", etc.
  taskType: string;               // "Orchestration", "Analysis", etc.
  model: string;                  // "gpt-4-turbo", "claude-3", etc.
  provider: string;               // "openai", "anthropic", etc.
  question: string;               // User/system prompt
  answer: string;                 // LLM response
  success: boolean;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;                   // In USD
  duration: number;               // In milliseconds
  auditTrails?: string[];         // Step-by-step reasoning
  logs?: string[];                // Internal reasoning logs
  metadata?: any;
}
```

## Conclusion

The AI-Powered Staging System represents a paradigm shift from **pre-programmed workflows** to **AI-generated execution plans**. It enables users to accomplish complex, multi-phase tasks by simply describing their goals in natural language.

This meta-orchestration approach allows Regno.ai to:
- Adapt to unforeseen use cases
- Learn from each execution
- Continuously improve phase strategies
- Democratize access to complex AI workflows

The system embodies the Regno.ai vision: **"Present a problem, work through it with phased approach using the platform, iterate to completion."**
