# Insight Node Setup Guide for P-D3 Pipeline

## Overview

The Insight node performs AI-powered time-series analysis on multi-category data. It aggregates statistics (mean, P95, trends, anomalies) and uses an LLM to generate actionable insights.

## Current Status ✅❌

### ✅ Completed
1. **Aggregation Pipeline Configured** - Data source node transforms ParamSamplesDoc data
2. **Insight Node Created** - Field mappings configured (category, value, timestamp)
3. **MongoDB Connection Optimized** - Production-ready timeouts and retry logic

### ❌ Pending
1. **LLM Credential** - Need to create an LLM credential in the UI
2. **Node Connection** - Verify data source → Insight node connection

---

## Data Flow Architecture

```
┌─────────────────────┐
│ ParamSamplesDoc     │
│ (MongoDB)           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Data Source Node                        │
│ (node_1762245156401_zsz22ond6)         │
│                                         │
│ Aggregation Pipeline:                  │
│ 1. $match - Filter valid data          │
│ 2. $project - Transform fields         │
│ 3. $limit - Cap at 1000 records        │
└──────────┬──────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │  category   │  ← paramDefDocId
    │  value      │  ← max
    │  timestamp  │  ← startTime
    └─────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Insight Node                            │
│ (node_1762198867771_m14w33yi5)         │
│                                         │
│ Configuration:                          │
│ - Mode: snapshot (24h window)          │
│ - Group by: category                   │
│ - Analyze: value (numeric metric)      │
│ - Time axis: timestamp                 │
│                                         │
│ AI Analysis:                            │
│ - Computes mean, P95, trends           │
│ - Detects anomalies (z-score)          │
│ - Generates executive summary          │
│ - Provides recommendations             │
└─────────────────────────────────────────┘
           │
           ▼
    AI Insights Report
```

---

## Aggregation Pipeline Details

### Source Collection: `ParamSamplesDoc`

**Original Document Structure:**
```json
{
  "_id": ObjectId("..."),
  "startTime": ISODate("2025-01-15T10:00:00Z"),
  "endTime": ISODate("2025-01-15T10:01:00Z"),
  "min": 42.5,
  "max": 98.7,
  "configDocId": "config_abc123",
  "paramDefDocId": "param_temperature_sensor_01",
  "ai": {
    "processed": false
  }
}
```

### Aggregation Pipeline (3 Stages)

#### Stage 1: `$match` - Filter Valid Data
```json
{
  "$match": {
    "$and": [
      { "min": { "$ne": 0 } },           // Exclude zero minimums
      { "max": { "$ne": 0 } },           // Exclude zero maximums
      { "ai.processed": { "$ne": true } } // Only unprocessed data
    ]
  }
}
```

**Purpose**: Exclude invalid/already-processed data to ensure clean analysis.

#### Stage 2: `$project` - Transform to Insight Format
```json
{
  "$project": {
    "_id": 0,                         // Remove MongoDB ID
    "category": "$paramDefDocId",     // Rename for grouping
    "value": "$max",                  // Use max value for analysis
    "timestamp": "$startTime"         // Use start time for temporal axis
  }
}
```

**Output Format** (matches Insight node expectations):
```json
{
  "category": "param_temperature_sensor_01",
  "value": 98.7,
  "timestamp": ISODate("2025-01-15T10:00:00Z")
}
```

#### Stage 3: `$limit` - Cap Results
```json
{
  "$limit": 1000
}
```

**Purpose**: Prevent overwhelming the LLM with too much data. 1000 records provides sufficient statistical significance.

---

## Setup Commands

### 1. Check Current Pipeline State
```bash
node scripts/check-p-d3-pipeline.js
```

**Expected Output:**
```
✅ Found pipeline "P-D3"

  Node: ParamSamplesDoc (data-source)
    ID: node_1762245156401_zsz22ond6
    Has Pipeline: true  ✅

  Node: AI Insights (insight)
    ID: node_1762198867771_m14w33yi5
    LLM Credential: not set  ❌
    Model: not set  ❌
```

### 2. Check LLM Credentials
```bash
node scripts/check-llm-credentials.js
```

**If none exist**, create one in the UI:
1. Navigate to **Credentials** tab
2. Click **Add Credential**
3. Select provider: **Anthropic** or **OpenAI**
4. Enter API key
5. Set default model: `claude-sonnet-4-20250514`
6. Save

### 3. Configure Insight Node with LLM
```bash
node scripts/configure-insight-llm.js
```

**Expected Output:**
```
✅ Found LLM credential: My Anthropic Key (anthropic)
✅ Found Insight node: AI Insights
✅ Insight node configured successfully!

📊 Configuration:
   LLM Credential: My Anthropic Key
   Model: claude-sonnet-4-20250514
   Mode: snapshot
   Group Field: category
   Y Field: value
   Timestamp Field: timestamp
```

### 4. Verify Configuration
```bash
node scripts/check-p-d3-pipeline.js
```

**Should now show:**
```
  Node: AI Insights (insight)
    LLM Credential: llm_xxx  ✅
    Model: claude-sonnet-4-20250514  ✅
```

---

## Insight Node Configuration Reference

### Field Mappings
These **must match** the aggregation pipeline output:

| Insight Config | Pipeline Output | Purpose |
|---------------|----------------|---------|
| `groupField: "category"` | `category: "$paramDefDocId"` | Groups metrics by parameter |
| `yField: "value"` | `value: "$max"` | Numeric value to analyze |
| `timestampField: "timestamp"` | `timestamp: "$startTime"` | Time series axis |

### Analysis Settings

**Mode**: `snapshot`
- Analyzes a historical time window (e.g., last 24 hours)
- Alternative: `streaming` (coming in Phase 2)

**Time Window**: `24h`
- Options: 1h, 6h, 24h, 7d, 30d
- Configurable in node settings

**Analysis Type**: `full`
- `full`: Complete analysis with all metrics
- `anomalies-only`: Focus on outliers
- `summary`: Executive-level overview

**System Prompt** (customizable):
```text
You are an expert data analyst specializing in time-series analysis.
Your role is to identify patterns, anomalies, and actionable insights
from multi-category data. Be specific, quantitative, and prioritize
high-impact findings.
```

---

## AI Analysis Output

The Insight node generates a structured report including:

### 1. Executive Summary
High-level overview of data health and key findings.

### 2. Statistical Analysis (Per Category)
- **Mean**: Average value over time window
- **P95**: 95th percentile (high-water mark)
- **Trend**: Increasing/decreasing/stable
- **Volatility**: Standard deviation

### 3. Anomaly Detection
Categories ranked by z-score deviation:
```
High Priority:
• param_temperature_sensor_01: Mean 98.7 (2.3σ above normal)
• param_pressure_gauge_05: Spike detected at 14:30 (+45%)

Medium Priority:
• param_flow_meter_03: Unusual drop in last 2 hours (-20%)
```

### 4. Actionable Recommendations
Specific next steps based on findings:
- Investigate high-deviation categories
- Review configuration for stable but suboptimal metrics
- Optimize parameters showing consistent improvement

---

## Testing the Pipeline

### Step 1: Execute in UI
1. Open the **P-D3** pipeline in the canvas
2. Click on the **Insight node** (AI Insights)
3. Click **Execute** button
4. Wait for analysis (typically 10-30 seconds)

### Step 2: Review Output
The output panel will show:
- AI-generated insights
- Statistical summaries
- Anomaly rankings
- Recommendations

### Step 3: Interpret Results
Look for:
- **Categories requiring attention** (high z-scores)
- **Trend reversals** (previously stable now volatile)
- **Performance improvements** (downward trends in error metrics)

---

## Troubleshooting

### Issue: "LLM credential not configured"
**Solution**: Create an LLM credential in the Credentials tab, then run:
```bash
node scripts/configure-insight-llm.js
```

### Issue: "No data returned from data source"
**Checks**:
1. Verify MongoDB credential is set on data source node
2. Confirm `ParamSamplesDoc` collection exists
3. Check aggregation pipeline filters aren't too restrictive
4. Test with: `db.ParamSamplesDoc.find({ min: { $ne: 0 } }).limit(10)`

### Issue: "Field 'category' not found"
**Cause**: Aggregation pipeline output doesn't match Insight node config.

**Solution**: Verify field mappings:
```javascript
// Aggregation $project stage must output:
{
  "category": "$paramDefDocId",  // ← Must match groupField
  "value": "$max",               // ← Must match yField
  "timestamp": "$startTime"      // ← Must match timestampField
}
```

### Issue: "Insight generation failed"
**Common causes**:
1. LLM API quota exceeded
2. Invalid model name
3. Malformed data in aggregation output

**Debug**:
```bash
# Check data source output first
# Execute just the data source node and verify format
```

---

## Advanced Configuration

### Custom Time Windows
Modify the aggregation pipeline to filter by time:

```json
{
  "$match": {
    "$and": [
      { "startTime": { "$gte": ISODate("2025-01-14T00:00:00Z") } },
      { "startTime": { "$lt": ISODate("2025-01-15T00:00:00Z") } },
      { "min": { "$ne": 0 } },
      { "max": { "$ne": 0 } }
    ]
  }
}
```

### Statistical Enrichment
Add computed fields in `$project`:

```json
{
  "$project": {
    "category": "$paramDefDocId",
    "value": "$max",
    "timestamp": "$startTime",
    "range": { "$subtract": ["$max", "$min"] },
    "midpoint": { "$avg": ["$max", "$min"] }
  }
}
```

### Multiple Data Sources
Create separate data source nodes for different collections, each with tailored aggregations feeding the same Insight node.

---

## Next Steps

1. ✅ **Aggregation pipeline configured** - Already done!
2. ❌ **Create LLM credential** - Via UI (Credentials tab)
3. ❌ **Run configuration script** - `node scripts/configure-insight-llm.js`
4. ⏳ **Test execution** - Run pipeline and review insights
5. ⏳ **Iterate on prompt** - Customize system prompt for domain-specific analysis

---

## Quick Reference

| Component | Status | Command |
|-----------|--------|---------|
| Aggregation Pipeline | ✅ Configured | `node scripts/check-p-d3-pipeline.js` |
| LLM Credential | ❌ Not set | Create in UI → Credentials tab |
| Insight Node Config | ⏳ Needs LLM | `node scripts/configure-insight-llm.js` |
| MongoDB Connection | ✅ Optimized | Auto-retry with 30s timeout |

---

## Related Files

- **Scripts**:
  - `scripts/check-p-d3-pipeline.js` - Inspect pipeline state
  - `scripts/configure-p-d3-datasource.js` - Set up aggregation
  - `scripts/configure-insight-llm.js` - Configure LLM credential
  - `scripts/check-llm-credentials.js` - List available credentials

- **Executors**:
  - `src/lib/server/execution/executors/InsightExecutor.ts` - Core logic
  - `src/lib/server/execution/executors/DataSourceExecutor.ts` - Pipeline execution

- **Components**:
  - `src/lib/components/modal-sections/InsightGeneralSection.svelte` - UI config
  - `src/lib/components/modals/InsightModalConfig.ts` - Default settings
