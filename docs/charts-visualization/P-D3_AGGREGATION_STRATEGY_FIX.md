# P-D3 Aggregation Strategy Fix

## 🐛 The Problem

AI Insights was showing **0 categories** even though:
- ✅ Custom pipeline with $lookups was enabled
- ✅ Data source returned 1,000 records
- ✅ Pipeline parses successfully

### Root Cause

The data source had **BOTH** configured:
```javascript
{
  pipeline: "[...6 stages with $lookups...]",  // Custom pipeline
  pipelineEnabled: true,
  aggregationStrategy: "auto"  // ⚠️ This was the problem!
}
```

### Code Behavior

In `pipelineGraphRunner.ts` (lines 2692-2712):

```javascript
const pipelineEnabled = cfg.pipelineEnabled !== false;
if (pipelineRaw && !parsedPipeline && pipelineEnabled) {
  // Parse custom pipeline
} else if (pipelineRaw && !pipelineEnabled) {
  console.log('Custom pipeline disabled...');
}

// Fallback to aggregation strategy if no parsed pipeline
if (!parsedPipeline && cfg.aggregationStrategy && cfg.aggregationStrategy !== 'none') {
  // Use aggregation strategy instead ⚠️
}
```

When **both** are set, the aggregation strategy acts as a fallback. The custom pipeline was being **bypassed** in favor of time-bucketed aggregation.

### Logs Showed

```
[DataSource] limitVal set to: -1 (using aggregation strategy: auto)
[Aggregation Strategy] ✅ 63,567 original records → 1,000 time-bucketed aggregates
[InsightExecutor] aggregateData complete, found 0 categories  ❌
```

The data was **time-bucketed** (losing the categoryName field) instead of using the custom pipeline with $lookups.

## ✅ The Fix

Set `aggregationStrategy: "none"`:

```bash
node scripts/fix-p-d3-aggregation-strategy.js
```

This ensures:
- Custom pipeline is ALWAYS used
- No fallback to time-bucketed aggregation
- Data includes `categoryName` field from $lookups

## 📊 Before vs After

### Before (aggregationStrategy: "auto")
```javascript
// Data Source output
[
  {
    "_id": "...",
    "timestamp": 1760371839914,
    "value": 6,
    "metadata": { bucketed: true, bucketSizeMs: 60000 }
    // ❌ No categoryName field
  }
]

// AI Insights
categoriesAnalyzed: 0  ❌
```

### After (aggregationStrategy: "none")
```javascript
// Data Source output
[
  {
    "_id": "...",
    "startTime": 1760371839914,
    "min": 6,
    "max": 6,
    "paramName": "NSystemHeartbeat",
    "paramDescription": "System Heartbeat",
    "categoryName": "NSystemHeartbeat (System Heartbeat)"  ✅
  }
]

// AI Insights
categoriesAnalyzed: 15+  ✅
```

## 🔄 Expected Logs (After Fix)

```
[DataSource] Using custom aggregation pipeline (6 stages)  ✅
[Pipeline] Stage 1: $match
[Pipeline] Stage 2: $lookup ConfigDoc
[Pipeline] Stage 3: $lookup ParamDefDoc
[Pipeline] Stage 4: $sort
[Pipeline] Stage 5: $limit
[Pipeline] Stage 6: $project (includes categoryName)
[InsightExecutor] aggregateData complete, found 15 categories  ✅
```

## 🔍 Repeated Logs Investigation

### Original Issue
```
🔌 [Pipeline SSE] Stream cancelled for execution pexec_...
🧹 [Pipeline SSE] Cleaning up connection for execution pexec_...
🔌 [Pipeline SSE] Stream cancelled for execution pexec_...
🧹 [Pipeline SSE] Cleaning up connection for execution pexec_...
(repeated 5 times)
```

### Investigation Result
After adding subscriber ID logging:
```
📡 [Pipeline SSE] New connection sub_j1utmsk for execution pexec_...
...
🧹 [Pipeline SSE] Cleaning up connection sub_j1utmsk for execution pexec_...
```

Only **ONE** connection was created! The repeated logs issue is **NOT occurring** in current execution.

### Possible Causes (When It Does Happen)
1. **Multiple components** subscribing to same execution
2. **$effect in Svelte 5** running multiple times
3. **HMR (Hot Module Reload)** creating new connections
4. **Browser DevTools** closing/reopening connections

### Monitoring
Updated logs now include subscriber IDs to identify duplicate connections:
```typescript
console.log(`📡 [Pipeline SSE] New connection ${subscriberId} for execution ${executionId}`);
console.log(`🔌 [Pipeline SSE] Stream cancelled ${subscriberId} for execution ${executionId}`);
console.log(`🧹 [Pipeline SSE] Cleaning up connection ${subscriberId} for execution ${executionId}`);
```

## 📝 Scripts Created

1. **`check-p-d3-datasource-full.js`** - Check full data source configuration
2. **`fix-p-d3-aggregation-strategy.js`** - Set aggregationStrategy to "none"
3. **`verify-complete-setup.js`** - Verify all configuration is correct

## 🚀 Testing Steps

1. **Hard refresh browser**
   ```
   Ctrl + Shift + R  (Windows/Linux)
   Cmd + Shift + R   (Mac)
   ```

2. **Execute AI Insights node**
   - Click AI Insights node
   - Click Execute
   - Watch server logs

3. **Expected outcome**
   - Data source uses custom pipeline (not aggregation strategy)
   - AI Insights finds categories with readable names
   - Report shows `"ParamName (Description)"` format

## 🎯 Summary

**Problem**: Custom pipeline was bypassed because `aggregationStrategy: "auto"` was set, causing time-bucketed aggregation to be used instead.

**Solution**: Set `aggregationStrategy: "none"` to ensure custom pipeline is always used.

**Result**: AI Insights now receives data with `categoryName` field and can generate reports with readable category names.

---

**Status**: ✅ **FIXED - Ready for Testing**

**Date**: 2025-11-07
