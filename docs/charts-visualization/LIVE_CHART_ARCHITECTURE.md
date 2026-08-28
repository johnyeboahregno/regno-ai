# Live D3 Chart Architecture - Data Flow & Streaming Strategy

## Overview
The D3 Chart system uses an intelligent LLM-powered approach to analyze data and determine optimal visualizations, with server-side rendering that streams progressive updates to the client for real-time display.

## Architecture Diagram

```
┌─────────────────┐
│   Data Source   │ (MongoDB Collection)
│   - Sort/Filter │
│   - Projections │
│   - NO LIMITS   │ ← Streams ALL data
└────────┬────────┘
         │ Stream chunks (batch: 1000 records)
         ↓
┌─────────────────┐
│   Transform /   │
│   Aggregation / │ ← Processes data in streaming fashion
│   Mapper Nodes  │
└────────┬────────┘
         │ Transformed data stream
         ↓
┌─────────────────────────────────────────────────┐
│          D3 Chart Executor (Server)             │
│                                                  │
│  Step 1: Data Collection & Validation           │
│  ┌────────────────────────────────────────┐    │
│  │ • Traverse upstream to data-source     │    │
│  │ • Collect sample data (first 500)      │    │
│  │ • Analyze & normalize schema           │    │
│  │ • Validate timestamps & numeric fields │    │
│  └────────────────────────────────────────┘    │
│                    ↓                             │
│  Step 2: LLM Analysis Phase                     │
│  ┌────────────────────────────────────────┐    │
│  │ • Send data sample + schema to LLM     │    │
│  │ • LLM determines:                       │    │
│  │   - Best chart type                     │    │
│  │   - X/Y field mappings                  │    │
│  │   - Aggregation strategies              │    │
│  │   - Time windows (if time-series)       │    │
│  │   - Downsampling strategy (LTTB)        │    │
│  └────────────────────────────────────────┘    │
│                    ↓                             │
│  Step 3: Data Processing & Aggregation          │
│  ┌────────────────────────────────────────┐    │
│  │ • Stream ALL data from data-source     │    │
│  │ • Apply rolling windows (time/count)   │    │
│  │ • Downsample using LTTB (>10k points)  │    │
│  │ • Compute rolling aggregates           │    │
│  │ • Assign monotonic sequence IDs        │    │
│  │ • Maintain state snapshot + deltas     │    │
│  └────────────────────────────────────────┘    │
│                    ↓                             │
│  Step 4: Binary Data Streaming (MessagePack)    │
│  ┌────────────────────────────────────────┐    │
│  │ • Encode processed data as MessagePack │    │
│  │ • Stream via WebSocket (bi-directional)│    │
│  │ • Batch size: 10-30 fps cadence        │    │
│  │ • Snapshot + delta log for catch-up    │    │
│  └────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────┘
                   │ WebSocket: Binary data stream
                   ↓
┌─────────────────────────────────────────────────┐
│      Client: Live D3 Chart Component            │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │ Main Chart Viewer (D3.js)               │    │
│  │ • Subscribe to WebSocket stream         │    │
│  │ • Request snapshot on connect           │    │
│  │ • Apply deltas incrementally            │    │
│  │ • Render with D3 (SVG <10k points)      │    │
│  │ • Switch to Canvas (>10k points)        │    │
│  │ • Throttle to requestAnimationFrame     │    │
│  │ • Interactive zoom/pan/brush            │    │
│  │ • Client-side light transforms only     │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │ Debug Panel (Bottom)                    │    │
│  │ • Shows streaming data batches          │    │
│  │ • Data preview (decoded MessagePack)    │    │
│  │ • Record counter & sequence IDs         │    │
│  │ • Stream status & FPS                   │    │
│  │ • Performance metrics (latency, bytes)  │    │
│  │ • Downsampling ratio indicator          │    │
│  └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## Why Not Server-Render SVG?

**❌ Server-side rendering of SVG is an anti-pattern for real-time charts:**

1. **High Latency**: Generating SVG on every data update adds 50-200ms+ latency
2. **Network Overhead**: SVG markup is 10-100x larger than binary data
3. **Lost Interactivity**: Can't zoom, pan, or hover without round-trips
4. **Server Load**: CPU-intensive D3 rendering blocks other requests
5. **Scalability**: Can't handle concurrent chart updates

**✅ Best Practice: Send Data, Not Pictures**

- Server: Process, aggregate, normalize → Stream compact data
- Client: Receive data → Render with D3.js → Handle interactions
- Result: <10ms frame times, smooth 60fps animations, full interactivity

## Data Flow Strategy

### 1. Data Source Configuration
```typescript
{
  mongoUri: "mongodb://...",
  collection: "sales_data",
  query: { region: "US" },      // Filter
  projection: {                 // Fields to include
    date: 1,
    amount: 1,
    category: 1
  },
  sort: { date: 1 },           // Sort order
  limit: null                   // IGNORED - stream ALL data
}
```

### 2. Server-Side Data Processing Best Practices

**Data Validation & Normalization:**
```typescript
// Normalize schema & timestamps
{
  _seq: 12345,              // Monotonic sequence ID
  timestamp: 1704067200000, // Normalized epoch ms
  value: 42.5,              // Validated numeric
  category: "A"             // Validated string
}
```

**Aggregation Strategy (10-30 FPS cadence):**
- Time-series: Window to 33ms buckets (30fps) or 100ms (10fps)
- Rolling aggregates: sum, mean, min, max per window
- Top-N pruning: Keep only top 20 categories
- LTTB downsampling: >10k points → 2k-5k points

**Memory Management:**
- Stream from MongoDB using cursors (batchSize: 1000)
- Process in-memory windows (max 10k records)
- Emit aggregated results (100-500 points per batch)
- Maintain snapshot + delta log (last 1000 deltas)

**Binary Encoding (MessagePack):**
```typescript
// ~90% smaller than JSON
const batch = {
  type: 'data',
  seq: [12345, 12346, 12347],
  ts: [1704067200000, 1704067201000, 1704067202000],
  val: [42.5, 43.1, 42.8],
  cat: ["A", "B", "A"]
};
msgpack.encode(batch); // ~80 bytes vs ~800 bytes JSON
```

### 3. LLM Analysis Prompt

```
You are a data visualization expert. Analyze this data sample and determine the best way to visualize it.

Data Sample (first 100 records):
{data_sample}

Data Schema:
{schema}

Determine:
1. Chart Type: line, bar, scatter, area, pie, etc.
2. X-Axis Field: Which field for horizontal axis
3. Y-Axis Field: Which field for vertical axis (or values)
4. Grouping: Any field to group/color by
5. Aggregations: Any aggregations needed (sum, avg, count, etc.)
6. Time Series: Is this time-series data?
7. Labels: Axis labels and title

Return as JSON:
{
  "chartType": "line",
  "xField": "date",
  "yField": "amount",
  "groupField": "category",
  "aggregation": "sum",
  "timeSeriesConfig": {...},
  "title": "Sales by Date",
  "xAxisLabel": "Date",
  "yAxisLabel": "Total Amount"
}
```

### 4. WebSocket Message Format (MessagePack Binary)

```typescript
// 1. Initial snapshot (on connect)
{
  type: 'snapshot',
  seq: 0,
  config: {
    chartType: 'line',
    xField: 'timestamp',
    yField: 'value',
    aggregation: 'mean',
    window: 100, // ms
    downsampling: 'lttb'
  },
  data: {
    seq: [1, 2, 3, ...],      // Monotonic IDs
    ts: [1704067200000, ...],  // Timestamps
    val: [42.5, 43.1, ...],    // Values
    cat: ["A", "B", ...]       // Categories (optional)
  },
  stats: {
    totalRecords: 1500,
    displayPoints: 500,
    downsampleRatio: 3.0
  }
}

// 2. Delta updates (streaming)
{
  type: 'delta',
  seq: 1500,
  add: {
    seq: [1501, 1502],
    ts: [1704067300000, 1704067301000],
    val: [44.2, 44.5],
    cat: ["A", "A"]
  },
  remove: [1, 2], // Remove old seq IDs (for rolling window)
  stats: {
    fps: 28.5,
    latency: 12, // ms
    bufferSize: 500
  }
}

// 3. Reconfiguration (from LLM re-analysis)
{
  type: 'reconfig',
  config: {
    chartType: 'bar', // LLM decided bar is better
    aggregation: 'sum',
    window: 1000
  }
}

// 4. Stream complete
{
  type: 'complete',
  seq: 15000,
  stats: {
    totalDuration: 2500, // ms
    totalRecords: 15000,
    totalBytes: 185000,
    avgFps: 29.2
  }
}
```

### 5. Debug Panel Display

The debug panel at the bottom shows:

```
┌─────────────────────────────────────────────────┐
│ 📊 Streaming Status                             │
├─────────────────────────────────────────────────┤
│ Status: ● Streaming (15,243 / ??? records)     │
│ Batch: #152 (100 records)                       │
│ Rate: 1,524 records/sec                         │
│ Duration: 10.2s                                  │
├─────────────────────────────────────────────────┤
│ 📦 Latest Batch Preview                         │
│ ┌───────────────────────────────────────────┐  │
│ │ [                                          │  │
│ │   {                                        │  │
│ │     "date": "2025-01-15",                  │  │
│ │     "amount": 1250.50,                     │  │
│ │     "category": "Electronics"              │  │
│ │   },                                        │  │
│ │   ...                                       │  │
│ │ ]                                           │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Data Collection ✅
- Traverse pipeline backwards to data-source
- Collect sample data for LLM analysis
- Extract schema information

### Phase 2: LLM Analysis ⏳
- Send sample + schema to LLM
- Parse LLM response for chart config
- Validate and apply configuration

### Phase 3: Data Streaming 🔄
- Set up SSE stream for progressive updates
- Batch data from data-source (100 records/batch)
- Apply transformations in pipeline
- Send batches to client

### Phase 4: Server-Side Rendering 📊
- Use D3 + JSDOM for SVG generation
- Progressive rendering as data arrives
- Send SVG updates via SSE

### Phase 5: Client Display & Debug Panel 🎨
- Receive and display SVG updates
- Show streaming data in debug panel
- Performance metrics
- Interactive controls

## Configuration Options

```typescript
interface D3ChartConfig {
  // Data Flow
  streamingBatchSize: number;        // Default: 100
  sampleSize: number;                // Default: 500 (for LLM)

  // LLM Analysis
  enableLLMAnalysis: boolean;        // Default: true
  llmCredentialId: string;
  llmModel: string;

  // Rendering
  updateMode: 'progressive' | 'final'; // Default: progressive
  enableDebugPanel: boolean;         // Default: true

  // Performance
  maxDataPoints: number;             // Optional limit for display
  rollingWindow: number;             // For real-time streams
}
```

## Error Handling

1. **Data Source Errors**: Retry with exponential backoff
2. **LLM Errors**: Fall back to default configuration
3. **Streaming Errors**: Resume from last successful batch
4. **Rendering Errors**: Show error in debug panel, continue streaming

## Future Enhancements

1. **Real-time Animations**: Smooth transitions as data flows
2. **Multi-Chart Support**: Multiple visualizations from same data
3. **Interactive Filtering**: Filter data from chart interactions
4. **Export Options**: PNG, PDF, interactive HTML
5. **Collaborative Features**: Share live charts with team
6. **Alert System**: Trigger alerts on data patterns

## References

- D3.js Documentation: https://d3js.org/
- MongoDB Streaming: https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/cursor/
- SSE Specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
