# Composite Key Grouping Fix

## Issue
The LLM was using a single field (`paramDefDocId`) for grouping instead of the composite key (`configDocId|paramDefDocId`) specified in user visualization instructions.

## Root Cause
The LLM prompt did not explicitly document the composite key format, so it defaulted to using a single field for grouping.

## Solution Implemented

### 1. Enhanced LLM Prompt (chartLlmAnalyzer.ts)

Added explicit composite key documentation to the prompt:

```typescript
IMPORTANT NOTES:
- For groupField, you can specify composite keys using pipe separator: "configDocId|paramDefDocId"
- This creates unique groups by combining multiple fields
- Each unique combination will get its own color/series on the chart
- Example: if user says "use composite key configDocId|paramDefDocId",
  set groupField to exactly "configDocId|paramDefDocId"
```

Also updated the JSON structure example:

```json
{
  "groupField": "optional field for grouping/coloring - can be single field OR
                 composite key using pipe separator like 'field1|field2'",
  ...
}
```

### 2. Automatic Re-Analysis on Instruction Changes (D3ChartExecutor.ts)

Implemented detection for when visualization instructions change:

```typescript
// Get visualization instructions from node config
const visualizationInstructions = node.config.d3VisualizationInstructions ||
                                  node.config.visualizationInstructions;

// Check if we need to re-analyze (no cached config OR instructions changed)
const instructionsChanged = visualizationInstructions !== node.config.d3LastAnalyzedInstructions;
const needsAnalysis = !node.config.d3AutoAnalyzedConfig || instructionsChanged;

if (node.config.d3Mode === 'auto' && needsAnalysis) {
  if (instructionsChanged) {
    console.log('🔄 [D3ChartExecutor] Visualization instructions changed, re-analyzing...');
  }

  chartConfig = await analyzeDataWithLLM(
    dataSample,
    schema,
    node.config.d3AutoLlmCredentialId,
    node.config.d3AutoModel,
    visualizationInstructions
  );

  // Store analyzed config AND instructions for future comparison
  this.updateNodeConfig(node, context, {
    d3AutoAnalyzedConfig: chartConfig,
    d3LastAnalyzedInstructions: visualizationInstructions
  });
}
```

### 3. Enhanced Logging

Added detailed logging to track what the LLM recommends:

```typescript
console.log('🤖 [D3ChartExecutor] LLM analysis complete');
console.log('🤖 [D3ChartExecutor] Recommended chart type:', chartConfig.chartType);
console.log('🤖 [D3ChartExecutor] X field:', chartConfig.xField);
console.log('🤖 [D3ChartExecutor] Y field:', chartConfig.yField);
console.log('🤖 [D3ChartExecutor] Group field:', chartConfig.groupField);  // ← NEW
console.log('🤖 [D3ChartExecutor] Reasoning:', chartConfig.reasoning);
```

## Testing Instructions

### Step 1: Clear Cached Analysis (Optional)
If you want to force re-analysis immediately, you can either:
- Clear the `d3AutoAnalyzedConfig` from the node config in the database, OR
- Modify the visualization instructions slightly and save

### Step 2: Re-Run Pipeline
Execute your pipeline with the Chart node. You should see these logs:

**If instructions changed:**
```
🔄 [D3ChartExecutor] Visualization instructions changed, re-analyzing...
🤖 [D3ChartExecutor] LLM analysis complete
🤖 [D3ChartExecutor] Recommended chart type: line
🤖 [D3ChartExecutor] X field: startTime
🤖 [D3ChartExecutor] Y field: max
🤖 [D3ChartExecutor] Group field: configDocId|paramDefDocId  ← Should show composite key!
🤖 [D3ChartExecutor] Reasoning: Using composite key configDocId|paramDefDocId for unique grouping...
```

**If using cached config:**
```
♻️  [D3ChartExecutor] Using cached LLM analysis
```

### Step 3: Check Chart Rendering
On the client side, you should see:

```
📊 [LiveD3Chart] Chart type: line
📊 [LiveD3Chart] Group field: configDocId|paramDefDocId  ← Composite key detected!
📊 [LiveD3Chart] Rendering X grouped series
```

Where X is the number of unique combinations of configDocId + paramDefDocId.

## Expected Behavior

### Before Fix
- Chart showed one series per `paramDefDocId`
- If you had 5 unique paramDefDocId values, you saw 5 lines
- Different configDocId values with the same paramDefDocId were mixed together

### After Fix
- Chart shows one series per unique combination of `configDocId|paramDefDocId`
- If you have 3 configDocIds and 5 paramDefDocIds, you could see up to 15 unique series
- Each line represents data for a specific configDocId + paramDefDocId pair
- Legend shows: "I7yb8Szigdy|Nku95Ekznbs", "K8zc9Tzjhfz|Olv06Flaoct", etc.

## Visual Example

**Before (wrong grouping):**
```
Legend:
━━━ Blue:   Nku95Ekznbs (paramDefDocId only - mixing multiple configs!)
━━━ Orange: Olv06Flaoct (paramDefDocId only - mixing multiple configs!)
━━━ Green:  Pxy17Gmapdu (paramDefDocId only - mixing multiple configs!)
```

**After (correct composite grouping):**
```
Legend:
━━━ Blue:   I7yb8Szigdy|Nku95Ekznbs (unique config + param combo)
━━━ Orange: I7yb8Szigdy|Olv06Flaoct (unique config + param combo)
━━━ Green:  K8zc9Tzjhfz|Nku95Ekznbs (unique config + param combo)
━━━ Red:    K8zc9Tzjhfz|Olv06Flaoct (unique config + param combo)
━━━ Purple: L9ad0Uakhgf|Pxy17Gmapdu (unique config + param combo)
```

## Troubleshooting

### If LLM still uses single field
1. Check the actual LLM response in logs - look for the exact JSON returned
2. Verify your visualization instructions explicitly mention "composite key"
3. Try being more explicit in your instructions:
   ```
   IMPORTANT: Use groupField = "configDocId|paramDefDocId" exactly as written.
   Do NOT use just "paramDefDocId".
   ```

### If chart shows no grouping (all blue)
1. Check browser console for `📊 [LiveD3Chart] Group field: ...`
2. Verify `groupField` is present in chartConfig
3. Check that data actually has both fields populated

### If composite key parsing fails
1. Check browser console for errors in `getGroupValue()`
2. Verify field names match exactly (case-sensitive)
3. Ensure data records have both fields defined

## Files Modified

1. **src/lib/server/services/chartLlmAnalyzer.ts** (lines 232-296)
   - Enhanced `buildAnalysisPrompt()` with composite key documentation

2. **src/lib/server/execution/executors/D3ChartExecutor.ts** (lines 77-112)
   - Added instruction change detection
   - Store last analyzed instructions
   - Trigger re-analysis when instructions change
   - Enhanced logging with groupField

3. **src/lib/components/node-displays/LiveD3Chart.svelte** (already implemented)
   - Dynamic composite key grouping support
   - Multi-series rendering with colors

## Next Steps

1. **Run your pipeline** and check logs for the groupField value
2. **Verify chart rendering** shows multiple series with different colors
3. **Check legend** shows composite keys like "I7yb8Szigdy|Nku95Ekznbs"
4. **Report back** if LLM still uses single field - we can further enhance the prompt

The system is now fully configured to support composite key grouping as specified in your visualization instructions!
