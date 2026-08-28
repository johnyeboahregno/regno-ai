# Dynamic Chart Visualization System

## Overview

The chart visualization system uses **dynamic LLM-driven configuration** based on user-provided visualization instructions. Instead of hardcoding chart behavior, the system passes user instructions to the LLM, which analyzes the data and returns an optimal chart configuration.

## How It Works

### 1. User Provides Visualization Instructions

In the Chart node settings, users can add custom visualization instructions, for example:

```
sample data:
{
  "_id": "Hruqt5Zmq4WzlsiuX2WiHYGOwgD",
  "configDocId": "I7yb8SzigdyDEUdS32aC2ZzAVXG3",
  "paramDefDocId": "Nku95EkznbsaHX1hpiZK9f3SKDP",
  "startTime": 1760371839914,
  "endTime": 1760371899915,
  "min": 0,
  "max": 0
}

use composite key "configDocId|paramDefDocId". (create a unique label, set a color)
datapoints are min , max

make sure timestamps are human readable
```

### 2. Instructions Are Passed to LLM

**File**: `src/lib/server/execution/executors/D3ChartExecutor.ts`

```typescript
// Get visualization instructions from node config
const visualizationInstructions = node.config.d3VisualizationInstructions ||
                                  node.config.visualizationInstructions;

chartConfig = await analyzeDataWithLLM(
  dataSample,
  schema,
  node.config.d3AutoLlmCredentialId,
  node.config.d3AutoModel,
  visualizationInstructions  // ← User instructions passed here
);
```

### 3. LLM Analyzes Data with Instructions

**File**: `src/lib/server/services/chartLlmAnalyzer.ts`

The LLM receives:
- Data sample
- Data schema
- **User visualization instructions** (prioritized over defaults)

Prompt format:
```
Analyze this data sample and determine the best way to visualize it.

Data Sample: [...]
Data Schema: [...]

**USER VISUALIZATION INSTRUCTIONS:**
[User's custom instructions go here]

IMPORTANT: Follow these user instructions carefully when determining
the chart configuration. The instructions override any default guidelines.
```

### 4. LLM Returns Configuration

The LLM returns a JSON configuration like:

```json
{
  "chartType": "line",
  "xField": "startTime",
  "yField": "max",
  "groupField": "configDocId|paramDefDocId",
  "isTimeSeries": true,
  "timestampField": "startTime",
  "title": "Max Values Over Time by Config",
  "xAxisLabel": "Time",
  "yAxisLabel": "Maximum Value",
  "reasoning": "Using composite key configDocId|paramDefDocId for grouping.
               Timestamps will be rendered as human-readable dates."
}
```

### 5. Chart Renderer Uses Configuration Dynamically

**File**: `src/lib/components/node-displays/LiveD3Chart.svelte`

The chart renderer has **dynamic helper functions** that adapt to the LLM's recommendations:

#### Timestamp Detection (Dynamic)
```typescript
function isTimeField(fieldName: string): boolean {
  if (chartData.length === 0) return false;
  const firstValue = chartData[0]?.[fieldName];
  return firstValue instanceof Date ||
    (typeof firstValue === 'number' && firstValue > 1000000000000);
}
```

- If LLM says `isTimeSeries: true` and `timestampField: "startTime"`, the renderer checks if "startTime" contains timestamps
- Automatically converts Unix timestamps (longs) to JavaScript Date objects
- Uses `d3.scaleTime()` instead of `d3.scaleLinear()` for time-based axes
- Formats axes with `d3.timeFormat('%H:%M:%S')` for human-readable dates

#### Composite Key Grouping (Dynamic)
```typescript
function getGroupValue(d: any, groupField: string): string {
  if (!groupField) return '';

  // Check if groupField contains pipe separator (composite key)
  if (groupField.includes('|')) {
    const fields = groupField.split('|');
    return fields.map(f => d[f.trim()] || '').join('|');
  }

  return String(d[groupField] || '');
}
```

- If LLM says `groupField: "configDocId|paramDefDocId"`, the renderer splits on `|`
- Creates unique groups by combining both ID fields
- Each unique combination gets its own color/series

## Example Flow

### Input
User creates a Chart node with these instructions:
```
use composite key "configDocId|paramDefDocId"
datapoints are min, max
make sure timestamps are human readable
```

### Step 1: Data Analysis
```
📊 [D3ChartExecutor] Processing chart data for node: chart-123
📊 [D3ChartExecutor] Input data points: 1000
🔍 [D3ChartExecutor] Data schema analyzed
🔍 [D3ChartExecutor] Fields: _id, configDocId, paramDefDocId, startTime, endTime, min, max
```

### Step 2: LLM Analysis
```
🤖 [Chart LLM] Analyzing data with LLM...
🤖 [Chart LLM] User instructions provided: use composite key "configDocId|paramDefDocId"...
✅ [Chart LLM] Analysis complete
✅ [Chart LLM] Chart type: line
✅ [Chart LLM] X field: startTime
✅ [Chart LLM] Y field: max
✅ [Chart LLM] Group field: configDocId|paramDefDocId
```

### Step 3: Rendering
```
📊 [LiveD3Chart] Chart type: line
📊 [LiveD3Chart] Detected time field: startTime (value: 1760371839914)
📊 [LiveD3Chart] Using d3.scaleTime() for X-axis
📊 [LiveD3Chart] Composite grouping: configDocId|paramDefDocId
📊 [LiveD3Chart] Creating 15 unique series with colors
📊 [LiveD3Chart] X-axis format: 14:23:59 (human-readable)
```

### Result
- X-axis shows: "14:23:59", "14:24:29", "14:24:59" (not 1760371839914)
- Multiple lines, one per unique "configDocId|paramDefDocId" combination
- Each line shows the "max" value over time
- Legend shows: "I7yb8Szigdy|Nku95Ekznbs", "K8zc9Tzjhfz|Olv06Flaoct", etc.

## Configuration Storage

The LLM analysis result is stored in the node config for reuse:

```typescript
this.updateNodeConfig(node, context, {
  d3AutoAnalyzedConfig: chartConfig,  // Stored for next run
  d3ChartType: chartConfig.chartType,
  d3XField: chartConfig.xField,
  d3YField: chartConfig.yField,
  d3Title: chartConfig.title
});
```

To re-analyze with new instructions:
1. Clear the `d3AutoAnalyzedConfig` from node config, OR
2. Update the visualization instructions and re-run

## No Hardcoded Logic

**Key Point**: The system does NOT hardcode specific field names or behaviors. Instead:

✅ LLM reads user instructions
✅ LLM analyzes actual data
✅ LLM returns optimal configuration
✅ Renderer adapts dynamically to configuration

❌ No hardcoded "if field === 'startTime'" checks
❌ No hardcoded "use configDocId" logic
❌ No hardcoded timestamp thresholds (except for detection heuristic)

## Benefits

1. **Flexible**: Works with any data schema
2. **User-Controlled**: User instructions override defaults
3. **Intelligent**: LLM understands context and relationships
4. **Maintainable**: No need to update code for new use cases
5. **Documented**: LLM provides reasoning for its choices

## Files Modified

1. `src/lib/server/services/chartLlmAnalyzer.ts`
   - Added `visualizationInstructions` parameter
   - Prioritizes user instructions in prompt

2. `src/lib/server/execution/executors/D3ChartExecutor.ts`
   - Extracts visualization instructions from node config
   - Passes instructions to LLM

3. `src/lib/components/node-displays/LiveD3Chart.svelte`
   - Dynamic timestamp detection
   - Dynamic time scale creation
   - Composite key grouping support
   - Human-readable date formatting

## Testing

To test with your data:

1. Create a Chart node
2. Add visualization instructions:
   ```
   use composite key "configDocId|paramDefDocId"
   datapoints are min, max
   make sure timestamps are human readable
   ```
3. Connect to data source with sample data
4. Execute pipeline
5. Check console logs to see LLM analysis
6. Verify chart shows:
   - Human-readable timestamps on X-axis (HH:MM:SS)
   - Multiple series grouped by composite key
   - Max values plotted

The system is fully dynamic and will adapt to any visualization instructions you provide!

## Related Documentation

- `CHART_IMPLEMENTATION_COMPLETE.md` - Complete implementation status and testing guide
- `COMPOSITE_KEY_GROUPING_FIX.md` - Detailed explanation of composite key grouping fix
- `REALTIME_CHART_ARCHITECTURE.md` - WebSocket streaming architecture (if exists)

## Recent Fixes

### Composite Key Grouping (Latest)
**Issue**: LLM was using single field (`paramDefDocId`) instead of composite key (`configDocId|paramDefDocId`)

**Fix**: Enhanced LLM prompt with explicit composite key documentation and implemented automatic re-analysis when visualization instructions change.

See `COMPOSITE_KEY_GROUPING_FIX.md` for complete details.
