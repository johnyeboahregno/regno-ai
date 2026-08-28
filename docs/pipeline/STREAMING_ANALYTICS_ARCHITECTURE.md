# Regno.ai Streaming Analytics Architecture

## Overview

This document describes the architecture for large-scale streaming analytics in Regno.ai. The system handles time-series data from sources like F1 telemetry, factory sensors, and IoT devices - processing thousands to millions of records with intelligent filtering, anomaly detection, pattern recognition, and predictive capabilities.

**Status**: Design Complete | Implementation In Progress

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [System Architecture](#system-architecture)
3. [Regno.ai Component Integration](#regnoai-component-integration)
4. [New Node Types](#new-node-types)
5. [CORTEX Pattern Domains](#cortex-pattern-domains)
6. [Skills Templates](#skills-templates)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Test Pipeline](#test-pipeline)

---

## Design Principles

### 1. FLUX-First Design with Integrated CORTEX
**Critical**: The entire streaming analytics workflow must be accomplishable directly from FLUX (the pipeline canvas), with CORTEX patterns deeply integrated into every node:

- **Node Configuration**: When opening a node's config panel, CORTEX patterns automatically suggest optimal settings based on upstream data characteristics and user context
- **Smart Defaults**: Fields pre-populate with pattern-recommended values, showing confidence scores
- **Learning Loop**: Execution outcomes feed back to CORTEX - successful configs boost pattern confidence, failures trigger pattern evolution
- **Context-Aware**: Patterns consider the full pipeline context (what nodes are connected, data schema, user history)

Stage/Maestro are optional layers for AI-assisted pipeline generation from natural language.

### 2. CORTEX-Integrated Node Architecture
Every FLUX node that benefits from intelligent configuration should:
- Query CORTEX patterns on config panel open
- Display pattern recommendations with confidence indicators
- Allow users to accept, modify, or override recommendations
- Report execution metrics back to CORTEX for learning

### 3. Minimal New Code
- Only 2 new node types required: WindowNode, AnomalyDetectorNode
- Everything else is enhancement of existing systems
- Patterns drive behavior, not hard-coded logic

### 4. Confidence-Based Routing
```
Pattern Confidence > 0.85  → Use pattern directly (fast path)
Pattern Confidence 0.7-0.84 → Use pattern to guide LLM
Pattern Confidence 0.5-0.69 → LLM with pattern hints
Pattern Confidence < 0.5   → Pure LLM reasoning
```

### 5. Progressive Learning
- Every execution outcome feeds back to pattern confidence
- Successful configs increase pattern scores
- Failed configs decrease scores and trigger evolution
- System gets smarter with each use

---

## CORTEX Integration in FLUX Nodes

### Node Configuration Flow with CORTEX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    User Opens Node Config Panel                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Gather Context                                                           │
│     • Upstream node outputs (schema, data sample)                           │
│     • Pipeline topology (what's connected)                                  │
│     • User history (past configurations for similar scenarios)              │
│     • Current config values (if editing existing)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Query CORTEX Patterns                                                    │
│     cortexBrain.findPatterns({                                              │
│       domain: 'streaming-window',                                           │
│       context: { dataRate, fieldTypes, analysisGoal }                       │
│     })                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Apply Pattern Recommendations                                            │
│     • High confidence (>0.85): Auto-fill field, show ✓                      │
│     • Medium confidence (0.7-0.85): Suggest value, show recommendation      │
│     • Low confidence (<0.7): Show as option, don't auto-fill                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. User Configures (with CORTEX guidance)                                   │
│     • See recommended values with confidence badges                          │
│     • Accept recommendations or override                                     │
│     • "Why?" tooltip explains pattern reasoning                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. Execute Pipeline                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. Report Outcome to CORTEX                                                 │
│     cortexBrain.recordOutcome({                                             │
│       patternId: 'window_sizing_001',                                       │
│       configUsed: { windowSize: '5m', ... },                                │
│       success: true,                                                         │
│       metrics: { recordsProcessed, errors, latency }                        │
│     })                                                                       │
│     → Pattern confidence updated                                            │
│     → Similar future configs benefit                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### CORTEX-Aware Config Panel UI

Each configurable field can show CORTEX recommendations:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Window Configuration                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Window Type:  [Tumbling     ▼]  ✓ Recommended (92% confidence)      │
│               ℹ️ "Tumbling windows work best for periodic sensor     │
│                  data at your detected ~1000 records/sec rate"      │
│                                                                      │
│ Window Size:  [5m           ▼]  ✓ Recommended (87% confidence)      │
│               ℹ️ "5-minute windows balance granularity with          │
│                  processing efficiency for temperature analysis"    │
│               Alternatives: [1m] [15m] [1h]                         │
│                                                                      │
│ Timestamp Field: [timestamp ▼]  ✓ Auto-detected from schema         │
│                                                                      │
│ Aggregations:                                                        │
│   [✓] avg(temperature) → avgTemp    ✓ Pattern suggests              │
│   [✓] min(temperature) → minTemp    ✓ Pattern suggests              │
│   [✓] max(temperature) → maxTemp    ✓ Pattern suggests              │
│   [✓] stddev(temperature) → std     ✓ Good for anomaly detection    │
│   [ ] count(*) → recordCount                                         │
│   [ ] rate(temperature)                                              │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 💡 CORTEX Insight                                                │ │
│ │ Based on 47 similar pipelines, these settings have 94% success  │ │
│ │ rate for temperature monitoring scenarios.                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                              [Apply Recommendations] [Configure]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Node Implementation Pattern

Each CORTEX-integrated node implements this interface:

```typescript
interface CortexAwareNode {
  // Called when config panel opens
  async getCortexRecommendations(context: NodeContext): Promise<CortexRecommendation[]>;

  // Called after successful execution
  async reportOutcome(config: NodeConfig, metrics: ExecutionMetrics): Promise<void>;

  // Pattern domains this node queries
  readonly cortexDomains: string[];
}

// Example: WindowNode implementation
class WindowNodeImpl implements CortexAwareNode {
  readonly cortexDomains = ['streaming-window', 'streaming-aggregation'];

  async getCortexRecommendations(context: NodeContext): Promise<CortexRecommendation[]> {
    const upstreamSchema = context.getUpstreamSchema();
    const dataRate = context.estimatedDataRate;

    // Query window sizing patterns
    const windowPatterns = await cortexBrain.findPatterns({
      domain: 'streaming-window',
      context: {
        dataRate,
        hasTimestamp: this.detectTimestampField(upstreamSchema),
        fieldTypes: this.categorizeFields(upstreamSchema)
      }
    });

    // Query aggregation patterns
    const aggPatterns = await cortexBrain.findPatterns({
      domain: 'streaming-aggregation',
      context: {
        numericFields: upstreamSchema.filter(f => f.type === 'number'),
        analysisGoal: context.pipelineIntent
      }
    });

    return this.mergeRecommendations(windowPatterns, aggPatterns);
  }

  async reportOutcome(config: NodeConfig, metrics: ExecutionMetrics): Promise<void> {
    await cortexBrain.recordOutcome({
      nodeType: 'window',
      domain: 'streaming-window',
      configUsed: config,
      success: metrics.errors === 0,
      metrics: {
        recordsProcessed: metrics.recordsIn,
        windowsEmitted: metrics.recordsOut,
        avgLatency: metrics.avgProcessingTime,
        memoryUsage: metrics.peakMemory
      }
    });
  }
}
```

### Learning Loop Integration

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CORTEX Learning Loop                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│   │   Pattern   │     │   Node      │     │  Execution  │                   │
│   │   Storage   │◄────│   Config    │────►│   Engine    │                   │
│   │  (MongoDB)  │     │   Panel     │     │             │                   │
│   └──────┬──────┘     └─────────────┘     └──────┬──────┘                   │
│          │                                        │                          │
│          │  Query patterns                        │  Report outcome          │
│          │  with context                          │  with metrics            │
│          ▼                                        ▼                          │
│   ┌──────────────────────────────────────────────────────────────┐          │
│   │                      CORTEX Brain                             │          │
│   │  • Pattern matching with confidence scoring                   │          │
│   │  • Context-aware recommendations                              │          │
│   │  • Outcome-based confidence adjustment                        │          │
│   │  • Pattern evolution (new patterns from successful configs)  │          │
│   └──────────────────────────────────────────────────────────────┘          │
│                              │                                               │
│                              ▼                                               │
│   ┌──────────────────────────────────────────────────────────────┐          │
│   │                   Pattern Evolution                           │          │
│   │  Success (no errors, good metrics):                           │          │
│   │    → Increase pattern confidence by 0.02                      │          │
│   │    → If config differs from pattern, create variant           │          │
│   │                                                                │          │
│   │  Failure (errors, poor metrics):                              │          │
│   │    → Decrease pattern confidence by 0.05                      │          │
│   │    → Log failure context for analysis                         │          │
│   │    → If repeated failures, deprecate pattern                  │          │
│   └──────────────────────────────────────────────────────────────┘          │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## FLUX Canvas Workflow

Users can build complete streaming analytics pipelines directly on the FLUX canvas:

### Step-by-Step FLUX Pipeline Creation

1. **Add Data Source Node**
   - Drag MongoDataSource from node palette
   - Configure: database, collection, query
   - Enable `cursorPagination: true` for streaming
   - Set `timestampField` for time-series ordering

2. **Add Window Node** (NEW)
   - Drag WindowNode from palette
   - Select window type: tumbling/sliding/session
   - Configure window size (e.g., "5m", "1h")
   - Set aggregations: avg, min, max, count, etc.

3. **Add Anomaly Detector** (NEW)
   - Drag AnomalyDetectorNode
   - Select detection methods: zscore, iqr, isolation-forest
   - Configure sensitivity and baseline learning
   - Enable anomaly persistence if needed

4. **Add Expert Node for Analysis**
   - Drag ExpertNode
   - Configure streaming-aware prompt
   - Enable hierarchical memory for context
   - Set output format

5. **Add Visualization**
   - Drag D3ChartNode
   - Configure real-time mode
   - Enable LTTB downsampling for large datasets
   - Set anomaly highlighting

6. **Add Sink for Persistence**
   - Drag MongoDataSink
   - Configure target collection
   - Enable enrichment with timestamps

7. **Connect Nodes**
   - Draw connections between nodes
   - Main flow: Source → Window → Buffer → Expert → Sink
   - Branch: Window → AnomalyDetector → Chart

8. **Execute**
   - Click Execute button
   - Monitor real-time data flow on canvas
   - View streaming metrics in sidebar

### FLUX Real-Time Monitoring

During execution, the canvas shows:
- Live record counts on each connection
- Window progress indicators
- Anomaly alerts with visual highlighting
- Throughput metrics per node

---

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Regno.ai Streaming Analytics                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Data Sources │    │   STAGE      │    │   CORTEX     │                  │
│  │              │    │              │    │              │                  │
│  │ • MongoDB    │    │ • Streaming  │    │ • Window     │                  │
│  │ • Postgres   │    │   Detection  │    │   Patterns   │                  │
│  │ • Kafka      │    │ • Smart      │    │ • Anomaly    │                  │
│  │ • Redis      │    │   Defaults   │    │   Patterns   │                  │
│  │ • WebSocket  │    │ • Volume     │    │ • Aggregation│                  │
│  │ • HTTP/SSE   │    │   Handling   │    │   Patterns   │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Pipeline Generation                           │       │
│  │  User Request → SmartDefaultEngine → CORTEX Lookup → Pipeline   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Streaming Pipeline                            │       │
│  │                                                                  │       │
│  │   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐            │       │
│  │   │ Window │ → │ Buffer │ → │ Mapper │ → │ Expert │            │       │
│  │   │  Node  │   │  Node  │   │  Node  │   │  Node  │            │       │
│  │   └────────┘   └────────┘   └────────┘   └────────┘            │       │
│  │        │            │            │            │                  │       │
│  │        ▼            ▼            ▼            ▼                  │       │
│  │   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐            │       │
│  │   │Anomaly │   │ Check- │   │ D3     │   │ Data   │            │       │
│  │   │Detector│   │ point  │   │ Chart  │   │ Sink   │            │       │
│  │   └────────┘   └────────┘   └────────┘   └────────┘            │       │
│  │                                                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Learning Loop                                 │       │
│  │  Execution Outcome → Pattern Confidence Update → Better Future  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Streaming Pipeline Topology

```
                    ┌─────────────────────┐
                    │   Data Source       │
                    │   (Mongo/Kafka/WS)  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Window Node       │
                    │   (NEW)             │
                    │   • Tumbling        │
                    │   • Sliding         │
                    │   • Session         │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ Anomaly         │ │ Buffer Node     │ │ Sampler Node    │
    │ Detector (NEW)  │ │ (Existing)      │ │ (Future)        │
    │ • Z-Score       │ │ • Batch collect │ │ • Reservoir     │
    │ • IQR           │ │ • Downstream    │ │ • Stratified    │
    │ • Isolation     │ │   coordination  │ │ • Priority      │
    └────────┬────────┘ └────────┬────────┘ └─────────────────┘
             │                   │
             ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐
    │ Pattern Store   │ │ Expert Node     │
    │ (MongoDB)       │ │ (Enhanced)      │
    │ • Anomalies     │ │ • Streaming     │
    │ • Motifs        │ │   Memory        │
    │ • Correlations  │ │ • Hierarchical  │
    └─────────────────┘ │   Context       │
                        └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
          ┌───────────────┐ ┌────────┐ ┌─────────────┐
          │ D3 Chart      │ │ Sink   │ │ Checkpoint  │
          │ (Visualization│ │(MongoDB│ │ (Recovery)  │
          │  + Insights)  │ │ /Redis)│ │             │
          └───────────────┘ └────────┘ └─────────────┘
```

---

## Regno.ai Component Integration

### CORTEX Brain Integration

CORTEX provides learned patterns for streaming configuration. The system queries patterns before generating pipelines, using confidence scores to determine how much to trust pattern guidance.

**Pattern Query Flow**:
```typescript
// In SmartDefaultEngine
const patterns = await cortexBrain.findPatterns({
  domain: 'streaming-window',
  context: {
    dataRate: estimatedRecordsPerSecond,
    analysisGoal: userRequest.intent,
    dataCharacteristics: schemaAnalysis
  }
});

if (patterns.length > 0 && patterns[0].confidence > 0.85) {
  // Use pattern directly
  return patterns[0].config;
} else if (patterns.length > 0 && patterns[0].confidence > 0.7) {
  // Use pattern to guide LLM
  return await guidedLLMConfiguration(patterns[0], context);
} else {
  // Pure LLM reasoning
  return await llmConfiguration(context);
}
```

### Stage Enhancement

Stage's SmartDefaultEngine is enhanced to detect streaming scenarios and apply appropriate patterns:

**Streaming Detection**:
```typescript
// Enhanced SmartDefaultEngine
private async detectStreamingScenario(context: StageContext): Promise<StreamingProfile | null> {
  const indicators = {
    hasTimeField: this.detectTimestampField(context.schema),
    hasHighVolume: context.estimatedRecords > 10000,
    hasSequentialData: this.detectSequentialPattern(context.sampleData),
    hasTelemetryKeywords: this.matchTelemetryTerms(context.userRequest),
    hasReplayIntent: /replay|historical|backfill/i.test(context.userRequest)
  };

  const score = Object.values(indicators).filter(Boolean).length;
  if (score >= 3) {
    return await this.buildStreamingProfile(context, indicators);
  }
  return null;
}
```

### Maestro Orchestration

Maestro handles complex multi-source streaming goals through its 7-phase model:

1. **Goal Understanding**: Detect streaming requirements in user goal
2. **Capability Discovery**: Identify available streaming node types
3. **Planning Phase**: Design streaming topology with patterns
4. **Pipeline Construction**: Build with CORTEX-guided defaults
5. **Gap Analysis**: Identify missing data sources or credentials
6. **Execution Validation**: Test with sample data windows
7. **Analysis Improvement**: Refine based on execution metrics

### Skills System

Skills provide repeatable streaming templates:

```typescript
const streamingSkill: Skill = {
  id: 'streaming-timeseries-analysis',
  name: 'Time Series Streaming Analysis',
  category: 'analytics',
  tags: ['streaming', 'time-series', 'realtime'],

  // Template pipeline structure
  template: {
    nodes: [
      { type: 'data-source', config: { /* pattern-driven */ } },
      { type: 'window', config: { windowType: 'tumbling', windowSize: '5m' } },
      { type: 'anomaly-detector', config: { methods: ['zscore', 'iqr'] } },
      { type: 'expert', config: { streamingMemory: true } }
    ],
    connections: [/* auto-generated */]
  },

  // Test queries for validation
  testQueries: [
    'Analyze temperature sensor data for anomalies',
    'Find patterns in the last 24 hours of readings'
  ],

  // Quality metrics
  qualityMetrics: {
    minConfidence: 0.8,
    requiredPatterns: ['streaming-window', 'streaming-anomaly']
  }
};
```

---

## New Node Types

### WindowNode

**Purpose**: Aggregates streaming data into time-based or count-based windows for downstream processing.

```typescript
interface WindowNodeConfig {
  // Window type
  windowType: 'tumbling' | 'sliding' | 'session' | 'count';

  // Window parameters
  windowSize: string;      // "5m", "1h", "1d" for time-based
  slideInterval?: string;  // For sliding windows
  sessionGap?: string;     // For session windows
  countSize?: number;      // For count-based windows

  // Time handling
  timestampField: string;
  timezone?: string;
  allowedLateness?: string;  // "30s" - how long to wait for late data

  // Grouping
  groupBy?: string[];        // Fields to partition by

  // Aggregations
  aggregations: WindowAggregation[];

  // Output
  emitStrategy: 'onComplete' | 'onUpdate' | 'periodic';
  emitInterval?: string;     // For periodic emission
}

interface WindowAggregation {
  field: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last' |
             'stddev' | 'percentile' | 'rate' | 'derivative';
  outputField?: string;
  percentileValue?: number;  // For percentile operation
}
```

**CORTEX Pattern**: `streaming-window/tumbling_window_sizing`
- Learns optimal window sizes based on data rate and analysis goals
- Adjusts based on successful execution outcomes

### AnomalyDetectorNode

**Purpose**: Detects anomalies in streaming data using multiple methods with adaptive baselines.

```typescript
interface AnomalyDetectorConfig {
  // Detection methods (can combine multiple)
  methods: AnomalyMethod[];

  // Target fields to monitor
  targetFields: string[];

  // Sensitivity
  sensitivity: 'low' | 'medium' | 'high';

  // Baseline learning
  warmupPeriod: number;       // Windows to learn baseline
  adaptiveBaseline: boolean;  // Update baseline over time
  baselineDecay?: number;     // How fast to forget old data

  // Anomaly handling
  storeAnomalies: boolean;    // Persist to MongoDB
  anomalyCollection?: string; // Collection name
  alertThreshold?: number;    // Score threshold for alerts

  // Rate limiting
  maxAnomaliesPerWindow?: number;  // Prevent alert storms
  cooldownPeriod?: string;         // Time between alerts for same pattern
}

interface AnomalyMethod {
  type: 'zscore' | 'iqr' | 'mad' | 'isolation-forest' |
        'rate-of-change' | 'seasonal' | 'contextual';
  threshold?: number;         // Method-specific threshold
  seasonalPeriod?: string;    // For seasonal detection
  contextFields?: string[];   // For contextual anomalies
}
```

**CORTEX Pattern**: `streaming-anomaly/anomaly_method_selection`
- Recommends methods based on data distribution
- Learns sensitivity settings from user feedback

---

## CORTEX Pattern Domains

### streaming-window
Patterns for window configuration:

| Pattern | Confidence | Purpose |
|---------|------------|---------|
| `tumbling_window_sizing` | 0.85 | Optimal window size based on data rate |
| `sliding_window_overlap` | 0.82 | Slide interval for overlapping windows |
| `session_gap_detection` | 0.78 | Inactivity gap for session windows |
| `late_data_handling` | 0.80 | Allowed lateness configuration |

### streaming-anomaly
Patterns for anomaly detection:

| Pattern | Confidence | Purpose |
|---------|------------|---------|
| `anomaly_method_selection` | 0.88 | Choose detection method by data type |
| `sensitivity_tuning` | 0.75 | Sensitivity based on domain |
| `baseline_configuration` | 0.82 | Warmup and decay settings |
| `multi_method_ensemble` | 0.72 | Combining multiple methods |

### streaming-aggregation
Patterns for aggregation operations:

| Pattern | Confidence | Purpose |
|---------|------------|---------|
| `field_aggregation_selection` | 0.89 | Best aggregation by field type |
| `composite_metrics` | 0.80 | Derived metrics from raw data |
| `downsampling_strategy` | 0.85 | LTTB vs simple sampling |

### streaming-analysis
Patterns for AI analysis:

| Pattern | Confidence | Purpose |
|---------|------------|---------|
| `streaming_expert_prompts` | 0.87 | Prompts for time-series analysis |
| `context_window_sizing` | 0.83 | How much history to include |
| `hierarchical_summarization` | 0.78 | Multi-level context compression |

### streaming-pipeline
Patterns for pipeline topology:

| Pattern | Confidence | Purpose |
|---------|------------|---------|
| `streaming_analytics_topology` | 0.88 | Node arrangement patterns |
| `checkpoint_placement` | 0.80 | Where to persist state |
| `parallelism_configuration` | 0.75 | Parallel processing setup |

---

## Skills Templates

### Time Series Streaming Analysis
- **ID**: `streaming-timeseries-analysis`
- **Category**: analytics
- **Use Case**: Generic time-series data analysis with anomaly detection

### F1 Telemetry Analysis
- **ID**: `f1-telemetry-analysis`
- **Category**: motorsport
- **Use Case**: Lap times, tire wear, fuel load, position tracking

### Factory Sensor Monitoring
- **ID**: `factory-sensor-monitoring`
- **Category**: industrial
- **Use Case**: Equipment health, production metrics, quality control

### IoT Fleet Analytics
- **ID**: `iot-fleet-analytics`
- **Category**: logistics
- **Use Case**: Vehicle tracking, fuel consumption, driver behavior

### Financial Market Streaming
- **ID**: `financial-market-streaming`
- **Category**: finance
- **Use Case**: Price movements, volume analysis, pattern detection

---

## Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Design architecture document
- [x] Define node interfaces
- [x] Define CORTEX pattern domains
- [x] Create test pipeline structure
- [ ] Implement WindowNode basic functionality
- [ ] Implement AnomalyDetectorNode basic functionality

### Phase 2: CORTEX Integration
- [ ] Create streaming pattern seed script
- [ ] Integrate patterns with SmartDefaultEngine
- [ ] Add streaming detection to Stage
- [ ] Implement confidence-based routing

### Phase 3: Enhanced Features
- [ ] Add hierarchical memory to Expert node
- [ ] Implement checkpoint/recovery system
- [ ] Add streaming-aware visualization
- [ ] Create Skills templates

### Phase 4: Advanced Capabilities
- [ ] Pattern mining (motif discovery)
- [ ] Predictive capabilities
- [ ] Multi-source correlation
- [ ] Auto-scaling based on data rate

### Phase 5: Learning Loop
- [ ] Execution outcome tracking
- [ ] Pattern confidence updates
- [ ] Automatic pattern evolution
- [ ] Cross-user pattern sharing

---

## Test Pipeline

A test pipeline is maintained in MongoDB to track implementation progress. The pipeline includes placeholder nodes that are enabled as features are implemented.

**Pipeline ID**: `streaming-analytics-test`
**Collection**: `pipelines`

### Current Status

| Node | Type | Status | Notes |
|------|------|--------|-------|
| Data Source | mongo-data-source | Active | Existing node type |
| Window | window | Pending | Awaiting WindowNode impl |
| Buffer | buffer | Active | Existing node type |
| Anomaly | anomaly-detector | Pending | Awaiting AnomalyDetectorNode impl |
| Expert | expert | Active | Existing, needs streaming memory |
| Chart | chart-d3 | Active | Existing node type |
| Sink | mongo-data-sink | Active | Existing node type |

### Test Data

Use the following MongoDB collection for testing:
- **Database**: regno_streaming_test
- **Collection**: sensor_readings
- **Schema**:
```javascript
{
  timestamp: ISODate,
  sensorId: string,
  temperature: number,
  humidity: number,
  pressure: number,
  status: string
}
```

---

## Related Documentation

- [Pipeline Canvas Architecture](./02-canvas-and-nodes.md)
- [CORTEX Pattern System](../cortex/CORTEX_PATTERN_CATALOG.md)
- [Stage V2 Architecture](../stage/STAGE_V2_ARCHITECTURE.md)
- [Maestro Orchestration](../maestro/MAESTRO_NODE_ARCHITECTURE.md)

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-25 | Initial architecture document created |

