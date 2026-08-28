# Aggregation Strategy System Guide

## Overview

The Aggregation Strategy System provides a **flexible, scalable approach** to processing data for Insight nodes. Users can easily choose how data is aggregated based on their dataset size, with strategies ranging from raw data (< 1K records) to time-bucketed aggregation (millions of records).

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Data Source Node (UI)                   │
│                                                       │
│  [Aggregation Strategy Dropdown]                     │
│   • Auto-Detect (Recommended) ← Smart!               │
│   • Raw Data (< 1K records)                          │
│   • 1-Minute Buckets (1K-10K records)                │
│   • 5-Minute Buckets (10K-100K records)              │
│   • 15-Minute Buckets (100K-1M records)              │
│   • 1-Hour Buckets (1M+ records)                     │
│                                                       │
│  [Max Records: 1000]                                 │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│           DataSourceExecutor (Server)                │
│                                                       │
│  1. Read config.aggregationStrategy                  │
│  2. If "auto" → Count records, detect optimal        │
│  3. Build MongoDB aggregation pipeline               │
│  4. Execute pipeline                                 │
│  5. Return standardized format                       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼ Standardized Output
              {category, value, timestamp,
               metadata?: {min, max, count}}
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              Insight Node (AI Analysis)              │
│                                                       │
│  • Handles both raw and bucketed data               │
│  • Computes statistics (mean, P95, trends)          │
│  • Detects anomalies (z-score, outliers)            │
│  • Generates AI insights via LLM                    │
└──────────────────────────────────────────────────────┘
```

---

## Strategy Options

### 1. 🤖 **Auto-Detect (Recommended)**

**How it works:**
- Counts unprocessed records in collection
- Automatically selects optimal strategy:
  - < 1,000 records → Raw Data
  - 1K-10K → 1-Minute Buckets
  - 10K-100K → 5-Minute Buckets
  - 100K-1M → 15-Minute Buckets
  - 1M+ → 1-Hour Buckets

**Best for:** Users who want "set it and forget it" behavior

---

### 2. 📄 **Raw Data**

**What it does:**
- Returns individual records with full detail
- No aggregation, no bucketing

**Output:**
```json
{ "category": "temp_01", "value": 98.7, "timestamp": "2025-01-15T10:00:00Z" }
{ "category": "temp_01", "value": 98.9, "timestamp": "2025-01-15T10:00:12Z" }
```

**Best for:** < 1,000 records, when you need every single data point

**Coverage:** 100% (if < max records), otherwise first N records only

---

### 3. ⏱️ **Time-Bucketed Strategies**

#### **1-Minute Buckets**
- **Bucket Size:** 60 seconds
- **Coverage:** 1,000 buckets ≈ 16.7 hours
- **Best for:** 1K-10K records
- **Use case:** High-frequency monitoring

#### **5-Minute Buckets**
- **Bucket Size:** 5 minutes (300 seconds)
- **Coverage:** 1,000 buckets ≈ 3.5 days
- **Best for:** 10K-100K records
- **Use case:** General IoT/metrics, medium-term analysis

#### **15-Minute Buckets**
- **Bucket Size:** 15 minutes (900 seconds)
- **Coverage:** 1,000 buckets ≈ 10.4 days
- **Best for:** 100K-1M records
- **Use case:** Long-term trend analysis

#### **1-Hour Buckets**
- **Bucket Size:** 60 minutes (3600 seconds)
- **Coverage:** 1,000 buckets ≈ 41.7 days
- **Best for:** 1M+ records
- **Use case:** Historical analysis, very large datasets

**Bucketed Output:**
```json
{
  "category": "temp_01",
  "value": 98.5,           // Mean of all samples in bucket
  "timestamp": "2025-01-15T10:00:00Z",
  "metadata": {
    "min": 95.2,           // Lowest value in bucket
    "max": 102.1,          // Highest value in bucket
    "count": 40,           // Number of samples in bucket
    "bucketed": true,
    "bucketSizeMs": 300000 // 5 minutes
  }
}
```

---

## How to Use

### Method 1: UI Configuration (Recommended)

1. Open your pipeline in the canvas
2. Click on a Data Source node
3. Scroll to **"📊 Aggregation Strategy"** section
4. Select your desired strategy from dropdown
5. Set max records (default: 1000)
6. Save the node
7. Execute the pipeline!

The aggregation pipeline is **generated automatically at runtime** based on your selection.

---

### Method 2: Script Configuration

#### Initial Setup (Auto-Detect):
```bash
node scripts/setup-p-d3-strategy.js
```

This sets:
- `aggregationStrategy: 'auto'`
- `aggregationMaxRecords: 1000`

#### Check Current Configuration:
```bash
node scripts/check-p-d3-nodes.js
```

---

## Implementation Details

### File Structure

```
src/lib/server/utils/
├── aggregationStrategyBuilder.ts   # Core strategy logic
└── mongoConnectionHelper.ts         # Connection utilities

src/lib/components/modal-sections/
└── DataSourceConfigSection.svelte  # UI configuration

scripts/
├── setup-p-d3-strategy.js          # Initial setup
├── check-p-d3-nodes.js             # Verify configuration
├── check-unprocessed-records.js    # Count records
└── (legacy scripts for reference)
```

---

### Strategy Builder API

**TypeScript Interface:**
```typescript
import {
  buildAggregationPipeline,
  detectOptimalStrategy,
  getDefaultFilterConditions
} from '$lib/server/utils/aggregationStrategyBuilder';

// Auto-detect optimal strategy
const recordCount = await collection.countDocuments(filter);
const strategy = detectOptimalStrategy(recordCount);

// Build pipeline
const { pipeline, metadata } = buildAggregationPipeline({
  strategy: 'auto',  // or 'raw', 'bucket-5min', etc.
  maxRecords: 1000,
  filterConditions: getDefaultFilterConditions()
});

// Execute
const results = await collection.aggregate(pipeline).toArray();
```

---

## Performance Comparison

| Records | Strategy | Pipeline Output | Coverage | LLM Cost | Query Time |
|---------|----------|-----------------|----------|----------|------------|
| 500 | Raw | 500 records | 100% | Low | Fast |
| 5,000 | Raw | 1,000 records | 20% ❌ | Low | Fast |
| 5,000 | 1-Min | 1,000 buckets | 100% ✅ | Low | Fast |
| 200,000 | Raw | 1,000 records | 0.5% ❌ | Low | Fast |
| 200,000 | 5-Min | 1,000 buckets | 100% ✅ | Low | Medium |
| 1,000,000 | 15-Min | 1,000 buckets | 100% ✅ | Low | Medium |

**Key Insight:** Time-bucketed strategies provide **full coverage** while maintaining **constant LLM cost** and **fast performance**.

---

## What the Insight Node Receives

### Standardized Format

Both raw and bucketed data use the same core format:

```typescript
interface InsightDataPoint {
  category: string;      // Group identifier (e.g., "param_temp_01")
  value: number;         // Metric value (raw value or bucket mean)
  timestamp: Date;       // Time of measurement (or bucket start)
  metadata?: {           // Optional (only for bucketed data)
    min: number;         // Min value in bucket
    max: number;         // Max value in bucket
    count: number;       // Samples in bucket
    bucketed: boolean;   // True for bucketed data
    bucketSizeMs: number;// Bucket size in milliseconds
  };
}
```

### Insight Node Capabilities

The Insight node can work with **both formats** because:

1. **Raw Data:** Full temporal detail, perfect for detecting precise anomalies
2. **Bucketed Data:**
   - Still has timestamps for temporal analysis
   - `metadata.min/max` reveals volatility within buckets
   - `metadata.count` indicates sampling density

**AI Analysis Works On:**
- Trends over time (value changes across timestamps)
- Anomalies (outlier values via z-score)
- Patterns (periodic behavior, correlations)
- Volatility (range between min/max in buckets)

---

## Migration from Legacy Approach

### Old Way (Manual Pipeline):
```javascript
// Had to manually set pipeline field
config.pipeline = [
  { $match: {...} },
  { $project: {...} },
  { $limit: 1000 }
];
```

### New Way (Strategy-Based):
```javascript
// Just set strategy, pipeline auto-generated
config.aggregationStrategy = 'auto';
config.aggregationMaxRecords = 1000;
```

**Benefits:**
- ✅ User-friendly (no JSON editing)
- ✅ Scales automatically
- ✅ Consistent format
- ✅ Easy to change

---

## Advanced: Custom Pipelines

If you need custom logic beyond the standard strategies:

1. Open Data Source node settings
2. Scroll to **"Advanced: Custom Aggregation Pipeline"**
3. Enter your custom MongoDB aggregation pipeline JSON
4. Custom pipeline **overrides** the strategy selection

**Note:** Ensure your custom pipeline outputs the standardized format:
```json
{ "category": "...", "value": 123, "timestamp": "..." }
```

---

## Troubleshooting

### Issue: "No data returned"
**Check:**
1. Verify records exist: `node scripts/count-unprocessed-records.js`
2. Check filter conditions in config
3. Ensure MongoDB credential is set on data source node

### Issue: "Strategy not applying"
**Solution:**
1. Reload pipeline in UI
2. Re-open node settings
3. Verify `aggregationStrategy` field is set (not `null`)
4. Check server logs during execution

### Issue: "Too much/too little data"
**Adjust:**
- Increase `aggregationMaxRecords` (default: 1000, max: 10000)
- Or choose a different bucket size (smaller = more detail)

---

## Best Practices

1. **Start with Auto-Detect** - It adapts as your data grows
2. **Monitor Performance** - If queries are slow, use larger buckets
3. **Test Strategies** - Try different options to see what works best
4. **Use Raw for Small Datasets** - When you have < 1K records, raw is better
5. **Don't Over-Bucket** - If 5-min buckets work, don't jump to 1-hour unnecessarily

---

## Future Enhancements

Potential additions:
- **Dynamic bucket sizing** based on time range (not just record count)
- **Percentile aggregation** (P5, P50, P95) when MongoDB 7.0+ available
- **Custom time windows** (e.g., "last 7 days" regardless of record count)
- **Multi-field aggregation** (analyze multiple metrics simultaneously)

---

## Quick Reference

| Use Case | Recommended Strategy | Why |
|----------|---------------------|-----|
| Development/Testing | Raw | Small datasets, need full detail |
| IoT Sensors (24/7) | Auto-Detect | Data volume varies over time |
| Logs (High Volume) | 5-Min or 15-Min Buckets | Millions of records |
| Historical Analysis | 1-Hour Buckets | Long time periods |
| Real-time Monitoring | 1-Min Buckets | Recent data, high frequency |

---

## Support

**Scripts:**
- `scripts/setup-p-d3-strategy.js` - Configure strategy
- `scripts/count-unprocessed-records.js` - Check record count
- `scripts/check-p-d3-nodes.js` - Verify configuration

**Documentation:**
- `INSIGHT_NODE_SETUP_GUIDE.md` - Full Insight node guide
- `aggregationStrategyBuilder.ts` - Implementation details

**Need Help?**
Check the inline help text in the UI or consult the strategy builder source code for advanced customization.
