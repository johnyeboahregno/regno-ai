# Empty Snapshot Streaming Fix

## Problem
When a D3 chart started streaming with an **empty snapshot**, the chart structure (SVG, scales, D3 refs) was never initialized, causing:
- Hundreds of "Missing svg or chartGroup refs" warnings
- Streaming data could not be rendered
- Chart remained blank despite receiving data

## Root Cause
The chart initialization code only ran when `snapshot.data.length > 0`. When streaming started with an empty snapshot:
1. No SVG or chart structure was created
2. Streaming data arrived via `onData` callback
3. `requestChartUpdate()` tried to render but refs were `null`
4. All updates failed silently

## Solution

### 1. Extracted Chart Initialization Function
Created `initializeChartStructure(data, chartConfig, edConfig)` function that:
- Creates SVG element with proper dimensions
- **Creates minimal structure manually** (NO `renderChart()` call to avoid infinite loops)
- Builds chart group, axis groups using D3 DOM manipulation
- Creates scales from data extent
- Renders basic axes (X and Y)
- Creates line generator for streaming
- Captures D3 refs (svg, chartGroup, scales, lineGenerator, etc.)
- Returns `true` on success

**Key Innovation**: Does NOT call `renderChart()` which was causing infinite effect loops. Instead, manually creates minimal SVG structure using pure D3.

**Location**: `src/lib/components/node-displays/D3ChartDisplay.svelte:716-884`

### 2. Initialize from First Streaming Chunk
Added check in `onData` callback (line 425-439):
```typescript
// Initialize chart structure if refs are not set (happens when snapshot is empty)
if (chunk.length > 0 && !chartStructureInitialized && (!streamingD3Refs.svg || !streamingD3Refs.chartGroup)) {
    console.log('🔧 [Stream] Chart structure not initialized - initializing from first chunk');
    const chartConfig = activeChartState?.config;
    if (chartConfig) {
        untrack(() => {
            const success = initializeChartStructure(chunk, chartConfig, editedConfig);
            if (success) {
                chartStructureInitialized = true;
                console.log('✅ [Stream] Chart structure initialized successfully');
            }
        });
    }
}
```

### 3. Prevent Infinite Effect Loop
- Wrapped initialization in `untrack()` to prevent Svelte reactivity loops
- Added `chartStructureInitialized` flag to ensure initialization happens only once
- Flag is set to `true` after successful initialization
- Flag is reset to `false` in `resetStream()` for cleanup

### 4. Updated Time-Series Detection
Simplified time-series detection code (line 1582-1593) to use the new function:
```typescript
if (isTimestamp || isDate) {
    console.log('📊 DEBUG: Detected time series - initializing D3 refs from snapshot');
    untrack(() => {
        const success = initializeChartStructure(snapshot.data, config, editedConfig);
        if (success) {
            chartStructureInitialized = true;
        }
    });
    return;
}
```

## Files Modified
- `src/lib/components/node-displays/D3ChartDisplay.svelte`
  - Added `chartStructureInitialized` flag (line 177)
  - Created `initializeChartStructure()` function (lines 704-865)
  - Initialize from streaming chunk (lines 425-439)
  - Updated time-series detection (lines 1582-1593)
  - Reset flag in `resetStream()` (line 1490)

## Benefits
1. ✅ Charts work with empty snapshots
2. ✅ Streaming data renders correctly from first chunk
3. ✅ No infinite effect loops
4. ✅ Reduced code duplication (160+ lines eliminated)
5. ✅ Single source of truth for chart initialization

## Testing
Test scenarios:
1. **Empty snapshot + streaming**: Chart should initialize from first chunk and render streaming data
2. **Snapshot with time-series data**: Chart should initialize from snapshot before streaming starts
3. **Reset stream**: Flag should reset, allowing re-initialization on next stream
4. **No infinite loops**: No repeated effects or initialization attempts

## Related Issues
- Previously fixed: Infinite loops when initializing from snapshot (wrapped in `untrack()`)
- Previously fixed: Missing refs when snapshot empty (now handled by streaming init)
- Previously fixed: Locale normalization (`en_US` → `en-US`)
- Previously fixed: Scale extraction errors (recreate instead of extract)

## Critical Fix: Avoiding `renderChart()`

### The Problem
Initially, `initializeChartStructure()` called `renderChart(svg, data, config)` to create the chart structure. This caused **infinite effect loops** because:
1. `renderChart()` is a complex function that accesses/modifies reactive Svelte state
2. Even though wrapped in `untrack()`, state modifications still triggered other effects
3. Effects triggered re-initialization, causing a loop

### The Solution
Instead of calling `renderChart()`, we **manually create minimal SVG structure** using pure D3:
```typescript
// Create main chart group
const g = svgSel.append('g')
    .attr('transform', `translate(${marginLeft},${marginTop})`);

// Create axis groups
const xAxisGroup = g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`);

const yAxisGroup = g.append('g')
    .attr('class', 'y-axis');

// Create scales from data
const xScale = d3.scaleTime()...
const yScale = d3.scaleLinear()...

// Render basic axes
xAxisGroup.call(d3.axisBottom(xScale));
yAxisGroup.call(d3.axisLeft(yScale));
```

This approach:
- ✅ Creates the necessary SVG structure for streaming
- ✅ Avoids triggering Svelte reactivity
- ✅ Provides visible axes for user feedback
- ✅ Captures all necessary D3 refs
- ✅ No infinite loops!
