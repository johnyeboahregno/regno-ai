# Multi-Phase AI-Driven Execution Architecture

## Philosophy
**Nothing is hard-coded. Everything is discovered, learned, and improved over time.**

The system uses a multi-phase approach where each phase can be AI-driven, fully auditable, and individually configurable. This allows users to see exactly what's happening at each step and optimize for better results.

---

## Execution Phases

### Phase 1: Schema Discovery (AI-Driven)
**Purpose**: Understand the database schema and identify opportunities for enrichment

**Inputs**:
- Database connection credentials
- Source collection name
- Optional: User hints about data structure

**AI Tasks**:
1. List all collections in the database
2. Sample documents from source collection
3. Identify field types and patterns (IDs, timestamps, categories)
4. Discover related collections (pattern matching on field names)
5. Sample potential reference collections
6. Identify name/description fields in reference collections

**Outputs**:
- Schema metadata (fields, types, patterns)
- Enrichment opportunities (ID fields → reference collections)
- Suggested lookup configurations

**Configuration Options**:
```javascript
{
  phase1: {
    enabled: true,
    llmCredentialId: "anthropic-main",
    sampleSize: 10,
    discoverRelationships: true,
    maxCollectionsToScan: 50,
    aiInstructions: "Focus on finding parameter definitions and sensor metadata"
  }
}
```

**Audit Log**:
```javascript
{
  phase: "schema-discovery",
  timestamp: "2025-01-05T10:00:00Z",
  duration: 2340,
  llmCredential: "anthropic-main",
  llmCalls: 2,
  llmTokens: { input: 1200, output: 450 },
  inputs: {
    database: "mydb",
    collection: "ParamSamplesDoc",
    sampleSize: 10
  },
  outputs: {
    fieldsDiscovered: ["paramDefDocId", "max", "startTime"],
    relatedCollections: ["ParamDefDoc"],
    enrichmentSuggestions: [{
      fromCollection: "ParamDefDoc",
      localField: "paramDefDocId",
      foreignField: "_id",
      nameField: "name",
      confidence: 0.95
    }]
  },
  reasoning: "Found 'paramDefDocId' field which matches pattern '*DocId'. Discovered 'ParamDefDoc' collection containing 'name' and 'description' fields. High confidence for enrichment."
}
```

---

### Phase 2: Enrichment Planning (AI-Driven)
**Purpose**: Determine optimal enrichment strategy based on schema discovery

**Inputs**:
- Schema discovery results
- User requirements (e.g., "show human-readable names")
- Performance constraints

**AI Tasks**:
1. Evaluate enrichment opportunities
2. Estimate performance impact of each enrichment
3. Prioritize enrichments based on user needs
4. Generate optimal lookup configurations
5. Plan aggregation strategy (raw vs bucketed)

**Outputs**:
- Enrichment configuration
- Aggregation strategy
- Performance estimates

**Configuration Options**:
```javascript
{
  phase2: {
    enabled: true,
    llmCredentialId: "anthropic-main",
    prioritizePerformance: false,  // vs prioritizeReadability
    maxEnrichments: 3,
    aiInstructions: "Prioritize showing meaningful parameter names over performance"
  }
}
```

**Audit Log**:
```javascript
{
  phase: "enrichment-planning",
  timestamp: "2025-01-05T10:00:03Z",
  duration: 1800,
  llmCredential: "anthropic-main",
  llmCalls: 1,
  llmTokens: { input: 800, output: 320 },
  inputs: {
    schemaDiscovery: { /* phase 1 output */ },
    recordCount: 63567,
    userRequirement: "show insights with readable names"
  },
  outputs: {
    enrichmentConfig: {
      enabled: true,
      fromCollection: "ParamDefDoc",
      localField: "paramDefDocId",
      foreignField: "_id",
      nameField: "name"
    },
    aggregationStrategy: "bucket-5min",
    estimatedPerformanceImpact: "15% slower, 40% more readable"
  },
  reasoning: "With 63K records, time-bucketing to 5-min intervals is optimal. Adding ParamDefDoc lookup will cost ~15% performance but significantly improve readability as requested."
}
```

---

### Phase 3: Query Optimization (AI-Optional)
**Purpose**: Build optimal MongoDB aggregation pipeline

**Inputs**:
- Enrichment configuration
- Aggregation strategy
- Filter conditions
- Performance goals

**AI Tasks (if enabled)**:
1. Analyze query patterns
2. Optimize filter order
3. Add appropriate indexes suggestions
4. Minimize pipeline stages

**Outputs**:
- Optimized aggregation pipeline
- Index suggestions
- Estimated query time

**Configuration Options**:
```javascript
{
  phase3: {
    aiOptimization: false,  // Can be rule-based or AI-driven
    llmCredentialId: "anthropic-main",
    explainQuery: true,
    aiInstructions: "Optimize for time-series analysis"
  }
}
```

**Audit Log**:
```javascript
{
  phase: "query-optimization",
  timestamp: "2025-01-05T10:00:05Z",
  duration: 450,
  aiOptimized: false,  // Rule-based in this case
  inputs: {
    strategy: "bucket-5min",
    enrichment: { /* config */ },
    filterConditions: { min: { $ne: 0 } }
  },
  outputs: {
    pipelineStages: 6,
    estimatedDocumentsProcessed: 63567,
    estimatedOutputDocuments: 14566,
    indexSuggestions: ["startTime_1", "paramDefDocId_1"]
  },
  reasoning: "Using 5-minute bucketing reduces output from 63K to 14.5K documents. Enrichment adds 2 stages but improves usability."
}
```

---

### Phase 4: Data Collection (System-Driven)
**Purpose**: Execute the optimized query and collect data

**Inputs**:
- Optimized aggregation pipeline
- Database connection
- Execution context

**Tasks**:
1. Execute MongoDB aggregation
2. Stream/batch results
3. Monitor performance
4. Handle errors

**Outputs**:
- Collected data records
- Execution metrics
- Any errors/warnings

**Configuration Options**:
```javascript
{
  phase4: {
    streamingEnabled: true,
    batchSize: 1000,
    timeout: 30000,
    progressUpdates: true
  }
}
```

**Audit Log**:
```javascript
{
  phase: "data-collection",
  timestamp: "2025-01-05T10:00:06Z",
  duration: 860,
  inputs: {
    pipelineStages: 6,
    collection: "ParamSamplesDoc"
  },
  outputs: {
    recordsRetrieved: 14566,
    enrichedRecords: 14566,
    enrichmentSuccessRate: 1.0,
    categories: 142,
    timeRange: { start: "2025-01-01", end: "2025-01-05" }
  },
  performance: {
    queryTime: 860,
    documentsScanned: 63567,
    lookupTime: 120,
    throughput: "74 records/ms"
  }
}
```

---

### Phase 5: Data Preparation (AI-Optional)
**Purpose**: Transform and enrich data for analysis

**Inputs**:
- Collected data
- Analysis requirements

**AI Tasks (if enabled)**:
1. Detect data quality issues
2. Suggest data transformations
3. Identify outliers
4. Calculate derived metrics

**Outputs**:
- Prepared dataset
- Data quality report
- Transformation log

**Configuration Options**:
```javascript
{
  phase5: {
    enabled: true,
    llmCredentialId: "anthropic-main",
    detectAnomalies: true,
    calculateDerivedMetrics: true,
    aiInstructions: "Focus on identifying unusual patterns in sensor data"
  }
}
```

**Audit Log**:
```javascript
{
  phase: "data-preparation",
  timestamp: "2025-01-05T10:00:07Z",
  duration: 1200,
  llmCredential: "anthropic-main",
  llmCalls: 1,
  llmTokens: { input: 2000, output: 500 },
  inputs: {
    records: 14566,
    categories: 142
  },
  outputs: {
    enrichedCategories: 142,
    derivedMetrics: ["mean", "p95", "trend", "isAnomalous"],
    anomaliesDetected: 8,
    dataQualityScore: 0.96
  },
  reasoning: "Calculated statistical metrics for each category. Identified 8 categories with anomalous patterns (p95 > 3σ from mean)."
}
```

---

### Phase 6: Insight Generation (AI-Driven)
**Purpose**: Generate actionable insights from prepared data

**Inputs**:
- Prepared dataset
- Analysis context
- User goals

**AI Tasks**:
1. Analyze patterns and trends
2. Identify key findings
3. Generate natural language insights
4. Provide recommendations

**Outputs**:
- Insights report
- Key findings
- Recommendations

**Configuration Options**:
```javascript
{
  phase6: {
    enabled: true,
    llmCredentialId: "anthropic-main",
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    maxTokens: 2000,
    focusAreas: ["anomalies", "trends", "recommendations"],
    aiInstructions: "Focus on actionable insights for operations team"
  }
}
```

**Audit Log**:
```javascript
{
  phase: "insight-generation",
  timestamp: "2025-01-05T10:00:09Z",
  duration: 5400,
  llmCredential: "anthropic-main",
  llmModel: "claude-sonnet-4-20250514",
  llmCalls: 1,
  llmTokens: { input: 3200, output: 1800 },
  inputs: {
    categories: 142,
    totalRecords: 14566,
    timespan: "5 days",
    anomalies: 8
  },
  outputs: {
    insightLength: 6422,
    keyFindings: 12,
    categoriesHighlighted: 8,
    recommendationsProvided: 5
  },
  reasoning: "Analyzed 142 categories across 5 days. Identified critical anomalies in cooling system parameters. Generated actionable recommendations for maintenance team."
}
```

---

## Configuration Interface

### DataSource Node Configuration
```javascript
{
  sourceType: "mongodb",
  database: "mydb",
  collection: "ParamSamplesDoc",

  // Multi-phase configuration
  phases: {
    schemaDiscovery: {
      enabled: true,
      llmCredentialId: "anthropic-main",
      sampleSize: 10,
      cacheResults: true,
      cacheDuration: 3600
    },
    enrichmentPlanning: {
      enabled: true,
      llmCredentialId: "anthropic-main",
      prioritizeReadability: true
    },
    queryOptimization: {
      aiOptimization: false  // Use rule-based for now
    },
    dataCollection: {
      streamingEnabled: true,
      progressUpdates: true
    }
  }
}
```

### Insight Node Configuration
```javascript
{
  groupField: "category",
  yField: "value",

  // Multi-phase configuration
  phases: {
    dataPreparation: {
      enabled: true,
      llmCredentialId: "anthropic-main",
      detectAnomalies: true
    },
    insightGeneration: {
      enabled: true,
      llmCredentialId: "anthropic-main",
      model: "claude-sonnet-4-20250514",
      temperature: 0.3,
      systemPrompt: "You are an expert data analyst..."
    }
  }
}
```

---

## Audit Trail Visualization

### Execution Summary
```
Pipeline: DataSource → Insight Analysis
Total Duration: 11.1s
Total LLM Calls: 5
Total LLM Tokens: 9,970 (input: 7,200 | output: 2,770)
Total Cost: $0.12

Phase Breakdown:
├─ 1. Schema Discovery       [2.3s] [AI: ✓] [2 LLM calls] [1,650 tokens]
├─ 2. Enrichment Planning    [1.8s] [AI: ✓] [1 LLM call]  [1,120 tokens]
├─ 3. Query Optimization     [0.5s] [AI: ✗] [Rule-based]
├─ 4. Data Collection        [0.9s] [System]
├─ 5. Data Preparation       [1.2s] [AI: ✓] [1 LLM call]  [2,500 tokens]
└─ 6. Insight Generation     [5.4s] [AI: ✓] [1 LLM call]  [5,000 tokens]
```

### Phase Detail View
```
Phase 2: Enrichment Planning
─────────────────────────────────────────────
Status: ✓ Completed
Duration: 1.8s
LLM: anthropic-main (claude-sonnet-4)
Tokens: 800 input, 320 output

Inputs:
  • Schema Discovery Results
  • Record Count: 63,567
  • User Requirement: "show insights with readable names"

Processing:
  → Analyzed enrichment opportunities
  → Evaluated performance trade-offs
  → Selected optimal strategy

Outputs:
  • Enrichment: ParamDefDoc lookup
  • Strategy: bucket-5min
  • Performance Impact: +15% time, +40% readability

AI Reasoning:
  "With 63K records, time-bucketing to 5-min intervals reduces
   data to 14.5K aggregates. Adding ParamDefDoc lookup costs
   ~15% performance but significantly improves readability as
   requested. Recommended configuration optimizes for user goal."
```

---

## Benefits

### 1. **Full Transparency**
- See exactly what each phase is doing
- Understand AI reasoning at each step
- Track LLM usage and costs

### 2. **Iterative Improvement**
- Adjust phase configurations
- Compare results across runs
- Learn what works best

### 3. **Cost Control**
- See LLM token usage per phase
- Disable AI for phases that don't need it
- Optimize for cost vs. quality

### 4. **Debugging**
- Identify which phase caused issues
- Replay individual phases
- Test configurations in isolation

### 5. **Flexibility**
- Enable/disable AI per phase
- Mix rule-based and AI-driven approaches
- Customize for different use cases

### 6. **Learning System**
- Cache successful configurations
- Build knowledge base of patterns
- Improve over time automatically

---

## Implementation Notes

1. **Phase Results Caching**: Cache schema discovery results to avoid repeated analysis
2. **Progressive Enhancement**: Start with basic phases, enable AI phases as needed
3. **Cost Estimation**: Show estimated cost before running AI phases
4. **Rollback Capability**: Keep previous phase configurations for comparison
5. **A/B Testing**: Run multiple phase configurations in parallel
6. **Performance Profiling**: Detailed timing for each sub-step
7. **LLM Provider Abstraction**: Support multiple LLM providers per phase
