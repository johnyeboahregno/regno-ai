# Chart Insights System - Implementation Path

**Status**: Planning & Implementation Guide
**Created**: 2025-11-03
**Last Updated**: 2025-11-03
**Version**: 1.0.0
**Related**: [HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md](./HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md)

---

## Executive Summary

This document outlines a **pragmatic, evidence-based approach** to building an LLM-powered insights system for multi-category time-series chart data. Rather than starting with complex RAG infrastructure, we progressively enhance capabilities based on validated user needs.

**Core Philosophy**: Start simple, validate value, scale based on evidence.

### Data Profile

- **Volume**: 30,000+ records per 24 hours (~1,250/hour, ~21/minute)
- **Structure**: Multi-category time series, un-normalized
- **Storage**: MongoDB (existing, accessible)
- **Current Use**: Streaming to D3 chart via existing pipeline
- **Goal**: Expert LLM analysis across categories for patterns, anomalies, and insights

---

## Table of Contents

1. [Architecture Decision Framework](#architecture-decision-framework)
2. [Phase 1: Aggregated Analysis (Week 1)](#phase-1-aggregated-analysis-week-1)
3. [Phase 2: Realtime Streaming Copilot (Week 2-3)](#phase-2-realtime-streaming-copilot-week-2-3)
4. [Phase 3: Lightweight Vector Search (Week 4)](#phase-3-lightweight-vector-search-week-4)
5. [Phase 4: Full Hybrid RAG (Week 6+)](#phase-4-full-hybrid-rag-week-6)
6. [Recommended Implementation Strategy](#recommended-implementation-strategy)
7. [Decision Tree](#decision-tree)
8. [Cost Analysis](#cost-analysis)
9. [Implementation Checklists](#implementation-checklists)
10. [Integration Points](#integration-points)

---

## Architecture Decision Framework

### Key Questions

1. **Do you need real-time insights during streaming?**
   - YES → Prioritize Phase 2 (Streaming Copilot)
   - NO → Start with Phase 1 (Aggregated Analysis)

2. **Do you need historical pattern matching?**
   - YES → Add Phase 3 (Vector Search)
   - NO → Phase 1/2 sufficient

3. **Do you need multi-hop causal reasoning?**
   - YES → Consider Phase 4 (Full Hybrid RAG)
   - NO → Phase 3 sufficient

### Infrastructure Complexity vs. Value

| Phase | Infrastructure | Complexity | Time to Value | Use Cases |
|-------|---------------|------------|---------------|-----------|
| **Phase 1** | MongoDB (existing) | ⭐ Low | 1-2 days | Snapshot analysis, reports |
| **Phase 2** | + Streaming logic | ⭐⭐ Medium | 1 week | Real-time alerts, monitoring |
| **Phase 3** | + pgvector | ⭐⭐⭐ Medium-High | 2 weeks | Historical similarity search |
| **Phase 4** | + Neo4j + Redis | ⭐⭐⭐⭐⭐ High | 4+ weeks | Complex causality, provenance |

---

## Phase 1: Aggregated Analysis (Week 1)

### Overview

**Architecture**: Direct LLM analysis on pre-aggregated data - NO RAG needed

```
MongoDB → Aggregation Pipeline → Summary Stats → LLM → Insights
```

### Why This Works

- ✅ 30k raw records = too large for LLM context (>1M tokens)
- ✅ Aggregated stats = tiny and perfect for LLM (2-5k tokens)
- ✅ Leverages existing MongoDB connection
- ✅ Zero new infrastructure required
- ✅ Can implement in 1 day
- ✅ Validates LLM insights are valuable before investing further

### Implementation

#### Step 1: Create Insight Executor

```typescript
// src/lib/server/execution/executors/InsightExecutor.ts

import { NodeExecutor } from './NodeExecutor';
import type { Node, ExecutionContext } from '$lib/types';
import { mongoService } from '$lib/server/services/mongoService';
import { llmService } from '$lib/server/services/llmService';

export class InsightExecutor extends NodeExecutor {
  async execute(node: Node, context: ExecutionContext) {
    const { mode, timeWindow, groupField, yField, aggregations } = node.config;

    if (mode === 'snapshot') {
      return await this.analyzeSnapshot(node.config, context);
    } else if (mode === 'streaming') {
      return await this.streamingAnalysis(node.config, context);
    }

    throw new Error(`Unknown mode: ${mode}`);
  }

  /**
   * Phase 1: Analyze a historical time window
   */
  private async analyzeSnapshot(config: any, context: ExecutionContext) {
    // Step 1: Calculate time window
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeWindow(config.timeWindow));

    // Step 2: Aggregate data per category (reuse chart's aggregation logic!)
    const aggregated = await this.aggregateChartData(
      config.dataSourceNodeId,
      startTime,
      endTime,
      config.groupField,
      config.yField
    );

    // Step 3: Compute additional metrics and anomalies
    const enriched = this.enrichWithMetrics(aggregated);

    // Step 4: Generate LLM insights
    const insights = await this.generateInsights(enriched, config);

    return {
      insights,
      metadata: {
        timeWindow: `${startTime.toISOString()} to ${endTime.toISOString()}`,
        categoriesAnalyzed: enriched.length,
        totalRecords: enriched.reduce((sum, cat) => sum + cat.count, 0)
      }
    };
  }

  /**
   * Aggregate chart data using MongoDB aggregation pipeline
   */
  private async aggregateChartData(
    dataSourceNodeId: string,
    startTime: Date,
    endTime: Date,
    groupField: string,
    yField: string
  ) {
    // Get the collection name from data source node
    const collection = await this.resolveDataSourceCollection(dataSourceNodeId);

    // Run aggregation pipeline
    const result = await mongoService.aggregate(collection, [
      // Match time window
      {
        $match: {
          timestamp: {
            $gte: startTime,
            $lte: endTime
          }
        }
      },

      // Group by category
      {
        $group: {
          _id: `$${groupField}`,
          count: { $sum: 1 },

          // Basic stats
          avgValue: { $avg: `$${yField}` },
          minValue: { $min: `$${yField}` },
          maxValue: { $max: `$${yField}` },
          stdDev: { $stdDevPop: `$${yField}` },

          // Percentiles (MongoDB 7.0+)
          p50: {
            $percentile: {
              input: `$${yField}`,
              p: [0.5],
              method: 'approximate'
            }
          },
          p95: {
            $percentile: {
              input: `$${yField}`,
              p: [0.95],
              method: 'approximate'
            }
          },
          p99: {
            $percentile: {
              input: `$${yField}`,
              p: [0.99],
              method: 'approximate'
            }
          },

          // Collect sample timestamps for trend analysis
          timestamps: { $push: '$timestamp' },
          values: { $push: `$${yField}` }
        }
      },

      // Sort by record count descending
      {
        $sort: { count: -1 }
      }
    ]);

    return result;
  }

  /**
   * Enrich aggregated data with derived metrics
   */
  private enrichWithMetrics(aggregated: any[]) {
    // Calculate global stats for anomaly detection
    const globalAvg = this.mean(aggregated.map(c => c.avgValue));
    const globalStdDev = this.stdDev(aggregated.map(c => c.avgValue));

    return aggregated.map(category => {
      // Coefficient of variation (relative volatility)
      const cv = category.stdDev / category.avgValue;

      // Z-score (how many standard deviations from global mean)
      const zScore = (category.avgValue - globalAvg) / globalStdDev;

      // Trend detection (simple linear regression on time series)
      const trend = this.computeTrend(category.timestamps, category.values);

      return {
        category: category._id,
        count: category.count,
        stats: {
          mean: category.avgValue,
          min: category.minValue,
          max: category.maxValue,
          stdDev: category.stdDev,
          p50: category.p50[0],
          p95: category.p95[0],
          p99: category.p99[0]
        },
        derived: {
          coefficient_of_variation: cv,
          z_score: zScore,
          volatility: cv > 0.5 ? 'high' : cv > 0.2 ? 'medium' : 'low',
          anomaly_score: Math.abs(zScore),
          is_anomalous: Math.abs(zScore) > 2,
          trend: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable',
          trend_strength: Math.abs(trend.r_squared)
        }
      };
    });
  }

  /**
   * Generate LLM insights from enriched data
   */
  private async generateInsights(enriched: any[], config: any) {
    // Prepare compact summary for LLM
    const summary = {
      total_categories: enriched.length,
      total_records: enriched.reduce((sum, cat) => sum + cat.count, 0),
      time_window: config.timeWindow,
      categories: enriched
    };

    // Call LLM with structured prompt
    const prompt = this.buildInsightPrompt(summary, config);

    const response = await llmService.generateCompletion({
      model: config.llmModel || 'claude-sonnet-4',
      temperature: 0.3, // Lower temperature for analytical tasks
      max_tokens: 2000,
      messages: [{
        role: 'system',
        content: `You are an expert data analyst specializing in time-series analysis.
Your role is to identify patterns, anomalies, and actionable insights from multi-category data.
Be specific, quantitative, and prioritize high-impact findings.`
      }, {
        role: 'user',
        content: prompt
      }]
    });

    return response.content;
  }

  /**
   * Build structured prompt for LLM analysis
   */
  private buildInsightPrompt(summary: any, config: any): string {
    return `Analyze this ${summary.time_window} time-series dataset with ${summary.total_categories} categories:

## Data Summary

Total Records: ${summary.total_records.toLocaleString()}
Categories: ${summary.total_categories}
Time Window: ${summary.time_window}

## Per-Category Metrics

${summary.categories.map((cat, idx) => `
### ${idx + 1}. ${cat.category}
- Records: ${cat.count.toLocaleString()} (${((cat.count / summary.total_records) * 100).toFixed(1)}%)
- Mean: ${cat.stats.mean.toFixed(2)}, Median: ${cat.stats.p50.toFixed(2)}
- Range: [${cat.stats.min.toFixed(2)}, ${cat.stats.max.toFixed(2)}]
- P95: ${cat.stats.p95.toFixed(2)}, P99: ${cat.stats.p99.toFixed(2)}
- Volatility: ${cat.derived.volatility} (CV: ${cat.derived.coefficient_of_variation.toFixed(3)})
- Trend: ${cat.derived.trend} (strength: ${cat.derived.trend_strength.toFixed(3)})
- Anomaly Score: ${cat.derived.anomaly_score.toFixed(2)}${cat.derived.is_anomalous ? ' ⚠️ ANOMALOUS' : ''}
`).join('\n')}

## Analysis Required

Provide a structured analysis with:

1. **Executive Summary** (2-3 sentences)
   - What's the overall health of this system?
   - Most critical finding?

2. **Anomalies & Outliers** (ranked by severity)
   - Which categories are anomalous?
   - Specific numbers and reasons
   - Potential causes

3. **Key Patterns**
   - Cross-category correlations
   - Temporal trends
   - Distribution insights

4. **Categories Requiring Attention** (top 5)
   - Category name
   - Specific issue
   - Severity (critical/high/medium)
   - Recommended action

5. **Performance Insights**
   - Best performers (and why)
   - Worst performers (and why)
   - Capacity implications

Be specific with numbers. Prioritize actionable insights over generic observations.`;
  }

  // Helper methods
  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private computeTrend(timestamps: Date[], values: number[]): { slope: number; r_squared: number } {
    // Simple linear regression
    const n = timestamps.length;
    const x = timestamps.map((t, i) => i); // Use indices for x-axis
    const y = values;

    const sumX = x.reduce((sum, v) => sum + v, 0);
    const sumY = y.reduce((sum, v) => sum + v, 0);
    const sumXY = x.reduce((sum, v, i) => sum + v * y[i], 0);
    const sumX2 = x.reduce((sum, v) => sum + v * v, 0);
    const sumY2 = y.reduce((sum, v) => sum + v * v, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0);
    const ssResidual = y.reduce((sum, v, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(v - predicted, 2);
    }, 0);
    const r_squared = 1 - (ssResidual / ssTotal);

    return { slope, r_squared };
  }

  private parseTimeWindow(window: string): number {
    // Parse strings like "24h", "7d", "1w"
    const match = window.match(/^(\d+)([hdwm])$/);
    if (!match) throw new Error(`Invalid time window: ${window}`);

    const [, value, unit] = match;
    const multipliers = {
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000
    };

    return parseInt(value) * multipliers[unit];
  }

  private async resolveDataSourceCollection(nodeId: string): Promise<string> {
    // Implementation depends on your data source node structure
    // This should return the MongoDB collection name
    throw new Error('Not implemented - resolve data source collection');
  }
}
```

#### Step 2: Register Executor

```typescript
// src/lib/server/execution/executors/ExecutorRegistry.ts

import { InsightExecutor } from './InsightExecutor';

export function registerExecutors() {
  // ... existing registrations

  registry.set('Insight', new InsightExecutor());
}
```

#### Step 3: Create Node Type Metadata

```typescript
// src/lib/nodes/NodeMetadataRegistry.ts

export const nodeMetadata = {
  // ... existing nodes

  Insight: {
    type: 'Insight',
    label: 'AI Insights',
    category: 'Analysis',
    icon: 'brain',
    description: 'Generate expert AI insights from time-series chart data',
    inputs: ['data'],
    outputs: ['insights'],
    configSchema: {
      mode: {
        type: 'select',
        label: 'Analysis Mode',
        options: [
          { value: 'snapshot', label: 'Snapshot Analysis' },
          { value: 'streaming', label: 'Real-time Streaming' }
        ],
        default: 'snapshot'
      },
      timeWindow: {
        type: 'select',
        label: 'Time Window',
        options: [
          { value: '1h', label: 'Last Hour' },
          { value: '6h', label: 'Last 6 Hours' },
          { value: '24h', label: 'Last 24 Hours' },
          { value: '7d', label: 'Last 7 Days' },
          { value: '30d', label: 'Last 30 Days' }
        ],
        default: '24h',
        visibleWhen: { mode: 'snapshot' }
      },
      dataSourceNodeId: {
        type: 'node-reference',
        label: 'Data Source Node',
        nodeType: 'DataSource',
        required: true
      },
      groupField: {
        type: 'text',
        label: 'Category Field',
        placeholder: 'category',
        required: true
      },
      yField: {
        type: 'text',
        label: 'Value Field',
        placeholder: 'value',
        required: true
      },
      llmModel: {
        type: 'select',
        label: 'LLM Model',
        options: [
          { value: 'claude-sonnet-4', label: 'Claude Sonnet 4 (Best Quality)' },
          { value: 'claude-haiku-4', label: 'Claude Haiku 4 (Fast & Cheap)' },
          { value: 'gpt-4o', label: 'GPT-4o' }
        ],
        default: 'claude-sonnet-4'
      },
      refreshInterval: {
        type: 'number',
        label: 'Auto-refresh Interval (seconds)',
        default: 0,
        help: 'Set to 0 to disable auto-refresh'
      }
    }
  }
};
```

### What You Get

✅ **Comprehensive insights in < 5 seconds**
- Per-category statistics and anomalies
- Cross-category patterns and correlations
- Ranked priorities for attention
- Actionable recommendations

✅ **Uses existing infrastructure 100%**
- MongoDB aggregation (same as chart node)
- LLM service (existing)
- No new dependencies

✅ **Compact LLM usage**
- 30k records → ~100 category summaries
- ~2-5k input tokens
- ~1-2k output tokens
- Cost: ~$0.015 per analysis

### Limitations

❌ Not real-time (run on-demand or scheduled)
❌ Limited to pre-defined aggregations
❌ Can't answer arbitrary semantic queries like "find similar days"
❌ No historical pattern matching

### When to Move to Phase 2

**Evidence needed**:
- Users request real-time alerts during streaming
- Need proactive monitoring, not just post-hoc analysis
- Want to catch issues as they develop

---

## Phase 2: Realtime Streaming Copilot (Week 2-3)

### Overview

**Architecture**: Parallel LLM observer on the chart stream

```
Data Stream → ┬─→ D3 Chart (existing)
              └─→ Streaming Copilot → Real-time Insights
```

### Why Add This

- ✅ Proactive alerts during streaming playback
- ✅ Catches issues as they happen
- ✅ Handles 1x to 1000x playback speeds
- ✅ Uses existing `ChartDataManager`
- ✅ Multi-category anomaly detection in real-time

### Implementation

#### Step 1: Create Streaming Copilot Service

```typescript
// src/lib/services/StreamingCopilot.ts

import type { DataPoint } from '$lib/types';
import { llmService } from '$lib/server/services/llmService';

interface RollingWindow {
  data: DataPoint[];
  maxSize: number;
  stats?: WindowStats;
  lastAnalysis?: Date;
}

interface WindowStats {
  count: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface Insight {
  timestamp: string;
  type: 'insight' | 'alert' | 'summary' | 'note';
  scope: {
    category: string;
    window: string;
  };
  finding: string;
  evidence: {
    stats: WindowStats;
    deltas?: any;
    anomaly?: any;
  };
  confidence: number;
  actions?: string[];
}

export class StreamingCopilot {
  private rollingWindows = new Map<string, RollingWindow>();
  private analysisInterval: number = 30000; // 30 seconds (stream time)
  private lastGlobalAnalysis: Date = new Date();
  private insightCallback?: (insight: Insight) => void;

  constructor(
    private config: {
      windowSize: number; // Number of datapoints to keep per category
      analysisInterval: number; // Stream time between analyses (ms)
      anomalyThreshold: number; // Z-score threshold for anomalies
    }
  ) {
    this.analysisInterval = config.analysisInterval;
  }

  /**
   * Subscribe to insights
   */
  onInsight(callback: (insight: Insight) => void) {
    this.insightCallback = callback;
  }

  /**
   * Process incoming data chunk
   */
  async addChunk(chunk: DataPoint[]) {
    // Add to rolling windows per category
    chunk.forEach(point => {
      const category = point.category;

      if (!this.rollingWindows.has(category)) {
        this.rollingWindows.set(category, {
          data: [],
          maxSize: this.config.windowSize
        });
      }

      const window = this.rollingWindows.get(category)!;
      window.data.push(point);

      // Keep only most recent N points
      if (window.data.length > window.maxSize) {
        window.data.shift();
      }
    });

    // Check if it's time to analyze
    if (this.shouldAnalyze()) {
      await this.analyzeWindows();
      this.lastGlobalAnalysis = new Date();
    }
  }

  /**
   * Check if enough stream time has passed for next analysis
   */
  private shouldAnalyze(): boolean {
    const elapsed = Date.now() - this.lastGlobalAnalysis.getTime();
    return elapsed >= this.analysisInterval;
  }

  /**
   * Analyze all rolling windows
   */
  private async analyzeWindows() {
    const summaries: any[] = [];

    // Compute stats for each category window
    this.rollingWindows.forEach((window, category) => {
      if (window.data.length < 10) return; // Need minimum datapoints

      const stats = this.computeWindowStats(window.data);
      window.stats = stats;

      summaries.push({
        category,
        window_size: window.data.length,
        stats,
        // Include recent anomalies
        anomalies: this.detectAnomalies(window.data, stats)
      });
    });

    if (summaries.length === 0) return;

    // Call LLM for analysis
    const insights = await this.analyzeSummaries(summaries);

    // Emit insights via callback
    if (this.insightCallback && insights) {
      insights.forEach(insight => this.insightCallback!(insight));
    }
  }

  /**
   * Compute statistics for a window
   */
  private computeWindowStats(data: DataPoint[]): WindowStats {
    const values = data.map(d => d.value).sort((a, b) => a - b);
    const n = values.length;

    // Basic stats
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const p50 = values[Math.floor(n * 0.5)];
    const p95 = values[Math.floor(n * 0.95)];
    const p99 = values[Math.floor(n * 0.99)];

    // Trend (simple: compare first half vs second half)
    const midpoint = Math.floor(n / 2);
    const firstHalfAvg = values.slice(0, midpoint).reduce((sum, v) => sum + v, 0) / midpoint;
    const secondHalfAvg = values.slice(midpoint).reduce((sum, v) => sum + v, 0) / (n - midpoint);
    const trendPct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendPct > 10) trend = 'increasing';
    else if (trendPct < -10) trend = 'decreasing';

    return {
      count: n,
      mean,
      stdDev,
      min: values[0],
      max: values[n - 1],
      p50,
      p95,
      p99,
      trend
    };
  }

  /**
   * Detect anomalies in window using MAD (Median Absolute Deviation)
   */
  private detectAnomalies(data: DataPoint[], stats: WindowStats): DataPoint[] {
    // Use MAD for robust anomaly detection
    const median = stats.p50;
    const absoluteDeviations = data.map(d => Math.abs(d.value - median));
    const mad = this.median(absoluteDeviations);

    // Modified Z-score: (0.6745 * (x - median)) / MAD
    const threshold = this.config.anomalyThreshold;

    return data.filter(d => {
      const modifiedZScore = (0.6745 * (d.value - median)) / mad;
      return Math.abs(modifiedZScore) > threshold;
    });
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Send summaries to LLM for analysis
   */
  private async analyzeSummaries(summaries: any[]): Promise<Insight[]> {
    const prompt = `You are a realtime analytics copilot monitoring ${summaries.length} data categories.

Current Window Statistics:

${summaries.map((s, i) => `
${i + 1}. ${s.category}
   - Data Points: ${s.stats.count}
   - Mean: ${s.stats.mean.toFixed(2)}, P50: ${s.stats.p50.toFixed(2)}, P95: ${s.stats.p95.toFixed(2)}
   - Range: [${s.stats.min.toFixed(2)}, ${s.stats.max.toFixed(2)}]
   - StdDev: ${s.stats.stdDev.toFixed(2)}
   - Trend: ${s.stats.trend}
   - Anomalies Detected: ${s.anomalies.length}
`).join('\n')}

Generate insights ONLY if there are notable patterns, anomalies, or concerning trends.

For each insight, respond with JSON:
{
  "type": "alert|insight|summary",
  "category": "category name",
  "finding": "Brief description",
  "confidence": 0.0-1.0,
  "actions": ["action 1", "action 2"]
}

If nothing notable, respond with empty array [].`;

    try {
      const response = await llmService.generateCompletion({
        model: 'claude-haiku-4', // Use fast model for streaming
        temperature: 0.2,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Parse JSON response
      const insights = JSON.parse(response.content);

      // Enrich with full context
      return insights.map((insight: any) => ({
        timestamp: new Date().toISOString(),
        type: insight.type,
        scope: {
          category: insight.category,
          window: `${this.config.windowSize} datapoints`
        },
        finding: insight.finding,
        evidence: {
          stats: summaries.find(s => s.category === insight.category)?.stats
        },
        confidence: insight.confidence,
        actions: insight.actions
      }));
    } catch (error) {
      console.error('Failed to analyze summaries:', error);
      return [];
    }
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      categories: Array.from(this.rollingWindows.keys()),
      windowSizes: Array.from(this.rollingWindows.entries()).map(([cat, win]) => ({
        category: cat,
        size: win.data.length,
        stats: win.stats
      }))
    };
  }
}
```

#### Step 2: Integrate with D3ChartDisplay

```typescript
// src/lib/components/node-displays/D3ChartDisplay.svelte

import { StreamingCopilot } from '$lib/services/StreamingCopilot';

// Add to component state
let streamingCopilot = $state<StreamingCopilot | null>(null);
let realtimeInsights = $state<Insight[]>([]);

// Initialize copilot when streaming starts
function initializeStreamingCopilot() {
  if (!editedConfig?.enableInsights) return;

  streamingCopilot = new StreamingCopilot({
    windowSize: 1000, // Keep last 1000 datapoints per category
    analysisInterval: 30000, // Analyze every 30 seconds
    anomalyThreshold: 3.0 // 3-sigma threshold
  });

  // Subscribe to insights
  streamingCopilot.onInsight((insight) => {
    realtimeInsights = [insight, ...realtimeInsights].slice(0, 50); // Keep last 50

    // Show toast notification for alerts
    if (insight.type === 'alert') {
      showInsightAlert(insight);
    }
  });
}

// Feed data to copilot
$effect(() => {
  if (streamingCopilot && latestDataChunk) {
    streamingCopilot.addChunk(latestDataChunk);
  }
});
```

#### Step 3: Update InsightExecutor for Streaming Mode

```typescript
// Add to InsightExecutor.ts

private async streamingAnalysis(config: any, context: ExecutionContext) {
  // Return SSE stream
  return this.createSSEStream(async (send) => {
    const copilot = new StreamingCopilot({
      windowSize: config.windowSize || 1000,
      analysisInterval: config.analysisInterval || 30000,
      anomalyThreshold: config.anomalyThreshold || 3.0
    });

    // Subscribe to insights
    copilot.onInsight((insight) => {
      send({
        type: 'insight',
        data: insight
      });
    });

    // Subscribe to data source stream
    const dataSource = await this.getDataSourceStream(config.dataSourceNodeId);

    dataSource.on('data', (chunk) => {
      copilot.addChunk(chunk);
    });

    dataSource.on('end', () => {
      send({ type: 'complete' });
    });
  });
}
```

### What You Get

✅ **Real-time anomaly detection**
- Continuous monitoring during streaming
- Proactive alerts for issues
- Per-category and cross-category patterns

✅ **Adaptive speed handling**
- Works at 1x to 1000x playback
- Uses stream timestamps, not wall clock

✅ **Low latency**
- Uses Claude Haiku for speed
- Analysis every 30s (configurable)
- P50 < 300ms, P95 < 1s

✅ **Still no RAG infrastructure**
- Pure stateless rolling windows
- No vector DB, no graph DB
- Minimal memory footprint

### Limitations

❌ Limited historical depth (only rolling windows, typically last 1000 datapoints)
❌ Can't answer "compare this week to last month"
❌ No semantic search for similar patterns
❌ No persistent incident memory

### When to Move to Phase 3

**Evidence needed**:
- Users ask "when did we last see this pattern?"
- Need to compare current behavior to historical norms
- Want "find similar incidents" capability
- Require incident pattern library

---

## Phase 3: Lightweight Vector Search (Week 4)

### Overview

**Architecture**: Add vector store for historical semantic search

```
Data Stream → Aggregation → Embeddings → pgvector → Semantic Search
                          ↓
                      LLM Insights ← Retrieved Context
```

### Why Add This

- ✅ "Find similar incidents to today"
- ✅ "When did we last see this pattern?"
- ✅ Semantic similarity across time
- ✅ Historical pattern matching
- ✅ Still relatively simple (pgvector is PostgreSQL extension)

### Implementation

#### Step 1: Add pgvector Extension

```sql
-- Run in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for daily summaries
CREATE TABLE chart_insights_embeddings (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  stats JSONB NOT NULL,
  anomalies JSONB,
  embedding vector(1536), -- OpenAI ada-002 or BGE-large dimensions
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(date, category)
);

-- Create index for vector similarity search
CREATE INDEX ON chart_insights_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for category filtering
CREATE INDEX ON chart_insights_embeddings (category);
CREATE INDEX ON chart_insights_embeddings (date DESC);
```

#### Step 2: Daily Embedding Job

```typescript
// src/lib/server/jobs/dailyInsightEmbedding.ts

import { pgService } from '$lib/server/services/pgService';
import { embeddings } from '$lib/server/services/embeddingService';
import { mongoService } from '$lib/server/services/mongoService';

/**
 * Run daily to embed previous day's aggregated insights
 * Schedule via cron: "0 1 * * *" (1 AM daily)
 */
export async function embedDailyInsights() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const endOfDay = new Date(yesterday);
  endOfDay.setHours(23, 59, 59, 999);

  console.log(`Embedding insights for ${yesterday.toDateString()}`);

  // Aggregate yesterday's data per category
  const aggregated = await mongoService.aggregate('chart_data', [
    {
      $match: {
        timestamp: {
          $gte: yesterday,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgValue: { $avg: '$value' },
        minValue: { $min: '$value' },
        maxValue: { $max: '$value' },
        stdDev: { $stdDevPop: '$value' },
        p50: { $percentile: { input: '$value', p: [0.5], method: 'approximate' } },
        p95: { $percentile: { input: '$value', p: [0.95], method: 'approximate' } }
      }
    }
  ]);

  // Generate embeddings for each category
  for (const category of aggregated) {
    // Create natural language summary
    const summaryText = `
Category: ${category._id}
Date: ${yesterday.toDateString()}
Records: ${category.count}
Average: ${category.avgValue.toFixed(2)}
Range: ${category.minValue.toFixed(2)} to ${category.maxValue.toFixed(2)}
P50: ${category.p50[0].toFixed(2)}, P95: ${category.p95[0].toFixed(2)}
Volatility: ${(category.stdDev / category.avgValue).toFixed(3)}
    `.trim();

    // Generate embedding
    const embedding = await embeddings.generate(summaryText);

    // Store in pgvector
    await pgService.query(`
      INSERT INTO chart_insights_embeddings
        (date, category, summary_text, stats, embedding)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (date, category)
      DO UPDATE SET
        summary_text = EXCLUDED.summary_text,
        stats = EXCLUDED.stats,
        embedding = EXCLUDED.embedding
    `, [
      yesterday,
      category._id,
      summaryText,
      JSON.stringify({
        count: category.count,
        avgValue: category.avgValue,
        minValue: category.minValue,
        maxValue: category.maxValue,
        stdDev: category.stdDev,
        p50: category.p50[0],
        p95: category.p95[0]
      }),
      `[${embedding.join(',')}]` // PostgreSQL vector format
    ]);
  }

  console.log(`Embedded ${aggregated.length} category summaries`);
}
```

#### Step 3: Semantic Search Function

```typescript
// src/lib/server/services/insightSearchService.ts

import { pgService } from './pgService';
import { embeddings } from './embeddingService';

export interface SimilarInsight {
  date: Date;
  category: string;
  summary: string;
  stats: any;
  similarity: number;
}

/**
 * Find historical days with similar patterns
 */
export async function findSimilarDays(
  currentSummary: string,
  category?: string,
  limit: number = 10
): Promise<SimilarInsight[]> {
  // Generate embedding for current summary
  const queryEmbedding = await embeddings.generate(currentSummary);

  // Semantic search with optional category filter
  const query = category
    ? `
      SELECT
        date,
        category,
        summary_text,
        stats,
        1 - (embedding <=> $1) as similarity
      FROM chart_insights_embeddings
      WHERE category = $2
      ORDER BY embedding <=> $1
      LIMIT $3
    `
    : `
      SELECT
        date,
        category,
        summary_text,
        stats,
        1 - (embedding <=> $1) as similarity
      FROM chart_insights_embeddings
      ORDER BY embedding <=> $1
      LIMIT $2
    `;

  const params = category
    ? [`[${queryEmbedding.join(',')}]`, category, limit]
    : [`[${queryEmbedding.join(',')}]`, limit];

  const results = await pgService.query(query, params);

  return results.rows.map(row => ({
    date: row.date,
    category: row.category,
    summary: row.summary_text,
    stats: row.stats,
    similarity: row.similarity
  }));
}

/**
 * Enhanced LLM analysis with historical context
 */
export async function analyzeWithContext(currentData: any, category: string) {
  // Generate summary of current data
  const currentSummary = generateSummary(currentData);

  // Find similar historical days
  const similar = await findSimilarDays(currentSummary, category, 5);

  // Call LLM with current + historical context
  const prompt = `
Current Data (${category}):
${currentSummary}

Similar Historical Patterns:
${similar.map((s, i) => `
${i + 1}. ${s.date.toDateString()} (${(s.similarity * 100).toFixed(1)}% similar)
${s.summary}
`).join('\n')}

Analysis:
1. How does today compare to these historical patterns?
2. Are we seeing a recurring issue or something new?
3. What happened after these similar days in the past?
4. Recommended actions based on historical outcomes?
  `;

  return await llmService.analyze(prompt);
}

function generateSummary(data: any): string {
  return `
Category: ${data.category}
Records: ${data.count}
Average: ${data.stats.mean.toFixed(2)}
Range: [${data.stats.min.toFixed(2)}, ${data.stats.max.toFixed(2)}]
P95: ${data.stats.p95.toFixed(2)}
Trend: ${data.derived.trend}
Anomaly Score: ${data.derived.anomaly_score.toFixed(2)}
  `.trim();
}
```

#### Step 4: Add "Find Similar" Tool to Copilot

```typescript
// Extend StreamingCopilot with vector search

import { findSimilarDays } from '$lib/server/services/insightSearchService';

class StreamingCopilot {
  // ... existing code ...

  private async analyzeSummariesWithContext(summaries: any[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    for (const summary of summaries) {
      // For anomalous categories, find similar historical patterns
      if (summary.anomalies.length > 0) {
        const currentSummary = this.formatSummary(summary);
        const similar = await findSimilarDays(currentSummary, summary.category, 3);

        insights.push({
          timestamp: new Date().toISOString(),
          type: 'alert',
          scope: {
            category: summary.category,
            window: `${this.config.windowSize} datapoints`
          },
          finding: `Anomaly detected: ${summary.anomalies.length} outliers`,
          evidence: {
            stats: summary.stats,
            similar_incidents: similar.map(s => ({
              date: s.date,
              similarity: s.similarity,
              summary: s.summary
            }))
          },
          confidence: 0.8,
          actions: [
            'Review similar incident outcomes',
            'Check for recurring pattern',
            'Investigate root cause'
          ]
        });
      }
    }

    return insights;
  }
}
```

### What You Get

✅ **Historical pattern matching**
- "Find days similar to today"
- "When did we last see this?"
- Incident pattern library

✅ **Context-aware insights**
- Compare current to historical norms
- Identify recurring vs novel issues
- Learn from past outcomes

✅ **Moderate complexity**
- Just PostgreSQL + pgvector extension
- Daily embedding job (< 5 min)
- Fast semantic search (< 100ms)

### Limitations

❌ No multi-hop reasoning ("X caused Y which triggered Z")
❌ Limited entity relationship tracking
❌ No causal graph analysis
❌ Single-hop queries only

### When to Move to Phase 4

**Evidence needed**:
- Users ask causal questions: "What upstream changes caused this?"
- Need multi-hop reasoning: "Show me the chain of events"
- Require provenance tracking: "Why did the system recommend this?"
- Complex entity relationships matter

---

## Phase 4: Full Hybrid RAG (Week 6+)

### Overview

**Architecture**: Add GraphRAG for complex reasoning (full blueprint implementation)

```
                    ┌─→ Vector DB (semantic search)
Data Stream → Dual ├─→ Graph DB (causality, provenance)
                    └─→ Redis (hot state, rolling windows)
                        ↓
                    Fusion Scoring + Multi-hop Reasoning
                        ↓
                    LLM with Rich Context
```

### Why Add This

**Only** if you have validated need for:
- ✅ Multi-hop causal reasoning
- ✅ Entity relationship tracking
- ✅ Complex provenance queries
- ✅ Cross-time-period correlations
- ✅ "What-if" scenario analysis

### Implementation

See [HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md](./HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md) for complete architecture.

**Key Components**:
1. Neo4j for graph relationships
2. Redis for hot state (rolling windows)
3. pgvector for semantic search (from Phase 3)
4. Fusion scoring engine
5. Two-pass generation (grounding + composition)

### Infrastructure Requirements

- **Neo4j**: $50-100/month (managed) or self-hosted
- **Redis**: $20-50/month or self-hosted
- **PostgreSQL + pgvector**: Existing (from Phase 3)
- **Development Time**: 4-6 weeks

### When to Implement

**ONLY** if Phases 1-3 show clear evidence that:
1. Users regularly ask multi-hop questions
2. Simple semantic search insufficient
3. Causal reasoning is critical
4. Complex provenance tracking needed

---

## Recommended Implementation Strategy

### Start Here: Phase 1 + Phase 2 Hybrid

**Week 1**: Phase 1 (Snapshot Analysis)
- ✅ Implement `InsightExecutor`
- ✅ Add MongoDB aggregation
- ✅ Create LLM insight prompts
- ✅ Build basic UI display
- ✅ Test with 24h data

**Week 2**: Phase 2 (Streaming Mode)
- ✅ Implement `StreamingCopilot`
- ✅ Integrate with chart data stream
- ✅ Add real-time insights panel
- ✅ Implement alert notifications
- ✅ Test with live streaming

**Week 3**: Refinement & Evaluation
- ✅ Gather user feedback
- ✅ Tune LLM prompts
- ✅ Optimize analysis intervals
- ✅ Improve insight quality
- ✅ Document common patterns

**Week 4+**: Evaluate Next Phase

**Decision Point**: Do users need historical search?
- **YES** → Implement Phase 3 (Vector Search)
- **NO** → Stay at Phase 2, it's sufficient

**Decision Point**: Do users need causal reasoning?
- **YES** → Plan Phase 4 (Full RAG)
- **NO** → Phase 3 is sufficient

### Progressive Investment

| Phase | Time | Cost/Month | Complexity | Value | When |
|-------|------|-----------|------------|-------|------|
| **Phase 1** | 1 week | ~$10 | ⭐ Low | High | **START HERE** |
| **Phase 2** | 1 week | ~$50 | ⭐⭐ Medium | High | Add immediately |
| **Phase 3** | 2 weeks | ~$100 | ⭐⭐⭐ Medium | Medium | If users ask "find similar" |
| **Phase 4** | 6+ weeks | ~$300+ | ⭐⭐⭐⭐⭐ High | Low-Medium | If multi-hop needed |

---

## Decision Tree

```
Do you need insights RIGHT NOW?
├─ YES → Implement Phase 1 (this week)
└─ NO → Wait until need is clear

After Phase 1:
Do you need REAL-TIME alerts during streaming?
├─ YES → Add Phase 2 (next week)
└─ NO → Stay at Phase 1, schedule hourly analyses

After Phase 2 (wait 2-4 weeks):
Do users ask "when did we last see this?" or "find similar days"?
├─ YES → Add Phase 3 (vector search)
└─ NO → Stay at Phase 2

After Phase 3 (wait 4-8 weeks):
Do users ask causal questions like "what caused this?" or "show chain of events"?
├─ YES → Plan Phase 4 (full RAG)
└─ NO → Phase 3 is sufficient, don't over-engineer
```

---

## Cost Analysis

### Phase 1: Aggregated Analysis

**LLM Usage**:
- Input: ~2-5k tokens (aggregated stats)
- Output: ~1-2k tokens (insights)
- Cost per analysis: ~$0.015 (Claude Sonnet 4)

**Frequency Options**:
- On-demand: User triggered
- Hourly: 24 analyses/day = ~$0.36/day = ~$11/month
- Daily: 1 analysis/day = ~$0.015/day = ~$0.45/month

**Total Phase 1 Cost**: ~$10-20/month

---

### Phase 2: Streaming Copilot

**LLM Usage**:
- Analysis every 30-60 seconds during streaming
- Use Claude Haiku 4 (10x cheaper than Sonnet)
- Input: ~1-2k tokens (window summaries)
- Output: ~500 tokens (insights)
- Cost per analysis: ~$0.002

**Streaming Scenarios**:
- 8 hours/day streaming: ~480 analyses/day = ~$1/day = ~$30/month
- 24/7 monitoring: ~1,440 analyses/day = ~$3/day = ~$90/month

**Optimization**:
- Increase analysis interval to 2-5 minutes (5-10x reduction)
- Skip analysis when no anomalies detected
- Use local models for pre-filtering

**Total Phase 2 Cost**: ~$30-90/month (can optimize to ~$10/month)

---

### Phase 3: Vector Search

**Embedding Cost**:
- Daily embeddings: ~100-200 categories/day
- Cost: ~$0.10/day = ~$3/month

**Storage Cost**:
- PostgreSQL with pgvector (existing DB)
- ~1GB for 1 year of daily embeddings
- Negligible cost on existing infrastructure

**Query Cost**:
- Semantic search is fast and cheap
- Cost included in LLM calls (no extra charge)

**Total Phase 3 Cost**: ~$3-5/month incremental

---

### Phase 4: Full Hybrid RAG

**Infrastructure**:
- Neo4j managed: ~$50-100/month
- Redis managed: ~$20-50/month
- Or self-hosted: ~$10-20/month (compute only)

**Embeddings & LLM**:
- Similar to Phase 3: ~$50-100/month
- Depends on query volume

**Total Phase 4 Cost**: ~$100-300/month

---

### Cost Summary

| Phase | Monthly Cost | Notes |
|-------|--------------|-------|
| **Phase 1** | ~$10-20 | Hourly or daily analysis |
| **Phase 2** | ~$30-90 | Streaming (can optimize to ~$10) |
| **Phase 3** | +$3-5 | Incremental on top of Phase 2 |
| **Phase 4** | ~$100-300 | Full infrastructure |

**Recommendation**: Start with Phase 1+2 (~$40-110/month), optimize to ~$20/month

---

## Implementation Checklists

### Phase 1 Checklist (Week 1)

```
Day 1-2: Core Executor
☐ Create InsightExecutor.ts
☐ Implement aggregateChartData()
☐ Add enrichWithMetrics()
☐ Test aggregation with sample data

Day 3-4: LLM Integration
☐ Create insight prompt template
☐ Implement generateInsights()
☐ Test with real 24h data
☐ Iterate on prompt quality

Day 5: Node Registration
☐ Register executor in ExecutorRegistry
☐ Add node metadata to NodeMetadataRegistry
☐ Create configuration modal
☐ Test node in pipeline canvas

Day 6-7: UI & Polish
☐ Create insight display component
☐ Add export to PDF/JSON
☐ Implement auto-refresh
☐ User testing & feedback
```

### Phase 2 Checklist (Week 2-3)

```
Week 2: Streaming Copilot
☐ Create StreamingCopilot.ts service
☐ Implement rolling window logic
☐ Add anomaly detection (MAD method)
☐ Test with simulated stream
☐ Integrate with D3ChartDisplay
☐ Add insight callback mechanism
☐ Test with live chart streaming

Week 3: Real-time UI
☐ Create real-time insights panel
☐ Add toast notifications for alerts
☐ Implement insight history (last 50)
☐ Add confidence scoring display
☐ Create alert configuration UI
☐ Test at various playback speeds
☐ Optimize LLM call frequency
```

### Phase 3 Checklist (Week 4)

```
Day 1: Database Setup
☐ Install pgvector extension
☐ Create embeddings table
☐ Add vector indexes
☐ Test vector operations

Day 2-3: Embedding Pipeline
☐ Create dailyInsightEmbedding.ts job
☐ Implement MongoDB aggregation
☐ Add embedding generation
☐ Test with historical data
☐ Schedule daily cron job

Day 4-5: Search Service
☐ Create insightSearchService.ts
☐ Implement findSimilarDays()
☐ Add context-aware analysis
☐ Test semantic search quality
☐ Integrate with StreamingCopilot

Day 6-7: UI & Testing
☐ Add "Find Similar" button to insights
☐ Display historical context
☐ Create similarity visualization
☐ User testing & refinement
```

### Phase 4 Checklist (Week 6+)

See full implementation roadmap in [HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md](./HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md)

---

## Integration Points

### Existing System Integration

#### 1. Chart Data Pipeline

**Phase 1 Integration**:
```typescript
// Reuse existing aggregation logic from DataGridChartExecutor
import { DataGridChartExecutor } from './DataGridChartExecutor';

class InsightExecutor {
  async aggregateChartData() {
    // Leverage existing chart aggregation
    const chartExecutor = new DataGridChartExecutor();
    return chartExecutor.aggregateData(...);
  }
}
```

#### 2. ChartDataManager

**Phase 2 Integration**:
```typescript
// D3ChartDisplay.svelte - add streaming copilot
import { StreamingCopilot } from '$lib/services/StreamingCopilot';

let streamingCopilot = $state<StreamingCopilot | null>(null);

// Initialize when streaming starts
$effect(() => {
  if (isStreaming && editedConfig?.enableInsights) {
    streamingCopilot = new StreamingCopilot(config);

    // Subscribe to data manager updates
    dataManager?.onUpdate((chunk) => {
      streamingCopilot?.addChunk(chunk);
    });
  }
});
```

#### 3. LLM Service

**All Phases**:
```typescript
// Use existing LLM service
import { llmService } from '$lib/server/services/llmService';

// Insights use same LLM infrastructure as Expert nodes
const insights = await llmService.generateCompletion({
  model: 'claude-sonnet-4',
  messages: [...]
});
```

#### 4. SSE Streaming

**Phase 2**:
```typescript
// Reuse existing SSE infrastructure from pipeline execution
return this.createSSEStream(async (send) => {
  copilot.onInsight((insight) => {
    send({ type: 'insight', data: insight });
  });
});
```

### New Components

#### Phase 1
- ✅ `InsightExecutor.ts` - New executor type
- ✅ Insight node metadata
- ✅ Insight display component

#### Phase 2
- ✅ `StreamingCopilot.ts` - Parallel stream processor
- ✅ Real-time insights panel
- ✅ Alert notification system

#### Phase 3
- ✅ `insightSearchService.ts` - Vector search
- ✅ `dailyInsightEmbedding.ts` - Embedding job
- ✅ pgvector table & indexes

#### Phase 4
- ✅ Full Hybrid RAG architecture (see blueprint)

---

## Evaluation Metrics

### Phase 1 & 2 Success Criteria

**Quality Metrics**:
- Insight relevance: User feedback score > 4/5
- Anomaly detection accuracy: > 80% (validated against ground truth)
- False positive rate: < 10%

**Performance Metrics**:
- Analysis latency (Phase 1): < 5 seconds
- Streaming latency (Phase 2): P50 < 300ms, P95 < 1s
- LLM cost per day: < $2

**Adoption Metrics**:
- Daily active users viewing insights
- Insights acted upon (% with user action)
- Time to detection (for known issues)

### Phase 3 Success Criteria

**Search Quality**:
- Semantic similarity: Top 5 results relevant > 70% of queries
- Retrieval latency: < 100ms

**Value Metrics**:
- Historical context used in decisions: > 50% of alerts
- Time saved in incident investigation: measurable reduction

### Phase 4 Success Criteria

**Only evaluate if implemented**:
- Multi-hop query success rate: > 60%
- Provenance accuracy: > 90%
- User satisfaction with complex queries: > 4/5

---

## Risk Mitigation

### Phase 1 Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Poor insight quality | High | Iterative prompt engineering, user feedback loop |
| LLM hallucinations | High | Always ground in actual stats, never extrapolate |
| High cost | Medium | Start with daily analysis, optimize frequency |

### Phase 2 Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| High streaming cost | High | Use Haiku, increase analysis interval, pre-filter |
| False positive alerts | Medium | Tune anomaly thresholds, add confidence scores |
| Performance impact | Medium | Async processing, separate from chart rendering |

### Phase 3 Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Poor semantic search quality | Medium | Test embeddings, tune retrieval parameters |
| Storage growth | Low | Archive old embeddings, implement retention policy |

### Phase 4 Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Over-engineering | High | **Only implement if validated need** |
| Infrastructure complexity | High | Use managed services, comprehensive monitoring |
| High cost | High | Strict cost controls, usage caps |

---

## Success Stories (Hypothetical)

### Phase 1 Success
> "We run daily insights reports that used to take an analyst 2 hours to compile. Now it's automatic and more thorough."

### Phase 2 Success
> "The streaming copilot caught a critical anomaly 15 minutes before our monitoring alert fired. We prevented an outage."

### Phase 3 Success
> "When investigating an incident, 'Find Similar' showed us the exact same pattern from 3 months ago. We applied the same fix in minutes."

### Phase 4 Success
> "We traced a downstream latency spike back through 4 upstream dependencies using multi-hop queries. Root cause found in 10 minutes instead of 4 hours."

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-03 | 1.0.0 | Initial implementation path document | System |

---

## References

- [HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md](./HYBRID_RAG_CHART_INSIGHTS_BLUEPRINT.md) - Full architecture blueprint
- [D3ChartDisplay.svelte](./src/lib/components/node-displays/D3ChartDisplay.svelte) - Chart component
- [ChartDataManager](./src/lib/services/ChartDataManager.ts) - Data management service
- [NodeExecutor](./src/lib/server/execution/executors/NodeExecutor.ts) - Executor base class

---

**Next Action**: Begin Phase 1 implementation (InsightExecutor) this week
**Timeline**: Phase 1+2 complete in 3 weeks, evaluate Phase 3 after 4 weeks
**Philosophy**: Start simple, validate value, scale based on evidence
