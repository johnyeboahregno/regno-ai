# AI Pipeline Assistant Guide

## Overview

The **AI Pipeline Assistant** is an intelligent feature that analyzes your MongoDB data structure and automatically generates optimized aggregation pipelines tailored to your specific goals.

**Key Benefits:**
- 🤖 **Smart Analysis**: AI examines your actual data schema
- ⚡ **Instant Generation**: Multiple pipeline strategies in seconds
- 🎯 **Goal-Oriented**: Tailored to your use case (Insights, Charts, etc.)
- 📊 **Optimized Performance**: Considers data volume and best practices
- 🔧 **One-Click Apply**: No need to write MongoDB syntax manually

---

## How It Works

```
1. User describes goal
   ↓
2. AI fetches sample documents from MongoDB
   ↓
3. AI analyzes data structure & constraints
   ↓
4. AI generates 2-3 pipeline strategies
   ↓
5. User reviews pros/cons/examples
   ↓
6. User clicks "Apply" → Pipeline configured automatically
```

---

## When to Use

### ✅ **Perfect For:**

1. **Complex Data Structures**
   - Nested documents, arrays, embedded objects
   - Don't know which fields to use
   - Need help mapping fields correctly

2. **Optimization Needs**
   - Large datasets (100K+ records)
   - Want performance recommendations
   - Unsure about time-bucketing strategies

3. **Learning MongoDB**
   - Don't know aggregation syntax
   - Want to see best practices
   - Learn by example

4. **Custom Requirements**
   - Unique data format
   - Special filtering logic
   - Non-standard transformations

### ❌ **Not Needed For:**

1. **Standard patterns** already covered by strategy templates
2. **Very simple** filter/projection operations
3. When you're a **MongoDB expert** who prefers manual control

---

## User Interface

### Location

The AI Pipeline Assistant appears in the **Data Source Node settings** under:

```
📊 Aggregation Strategy (for Insights/Analytics)
   ↓
🤖 AI Pipeline Assistant (Beta)  ← Click to expand
   ↓
Advanced: Custom Aggregation Pipeline
```

### UI Components

#### 1. **LLM Configuration Section**
- **Credential Selection**: Choose which LLM credential to use
- **Model Selection**: Select the model for pipeline generation
- **System Prompt Editor**: Customize how AI analyzes your data
- **PromptBuilder Integration**: 🆕 AI-assisted prompt generation
  - Click "Build Prompt" to use AI to generate system prompts
  - Choose expert type (e.g., "MongoDB Expert", "Data Analyst")
  - Describe your use case, AI generates optimized prompt
  - Save prompts to library for reuse
- **Prompt Library**: Browse and select from saved prompts

**Features:**
- Terminal-style editor for authentic developer experience
- Context-aware prompt suggestions
- One-click prompt saving and loading
- Fully transparent - see exactly what instructions the AI receives

#### 2. **Goal Input**
- Describe what you want to achieve
- Pre-filled templates for common goals
- Free-form text for custom needs

**Template Goals:**
- "Prepare data for time-series analysis in Insight node"
- "Aggregate by time buckets for high-volume data"
- "Transform data for chart visualization"
- "Group and summarize by category"
- "Compute statistics per time window"
- "Filter and project relevant fields only"

#### 3. **Generate Button**
- Fetches sample data from your collection
- Calls AI to analyze and generate pipelines
- Shows loading state during generation

#### 4. **Data Analysis Panel**
- **Structure**: AI's understanding of your data schema
- **Challenges**: Potential issues identified
- **Recommendations**: Best practices for your data

#### 5. **Strategy Suggestions** (2-3 per generation)
Each suggestion includes:
- **Name**: Short description (e.g., "Time-Bucketed Aggregation")
- **Description**: What it does
- **Estimated Output**: How much data you'll get
- **Pros**: Benefits of this approach
- **Cons**: Limitations to be aware of
- **Best For**: Ideal use cases
- **Pipeline Preview**: Actual MongoDB stages
- **Apply Button**: One-click to use this pipeline

---

## Example Usage

### Scenario: ParamSamplesDoc Time-Series Data

**1. User Goal:**
```
"Prepare data for time-series analysis in Insight node.
I have 200,000 unprocessed records with timestamps in nanoseconds."
```

**2. AI Sample Analysis:**
```
📊 Data Analysis
Structure: Time-series sensor data with nested metadata, nanosecond timestamps
Challenges:
  • High data volume (200K records) requires bucketing
  • Timestamp format needs conversion
  • Multiple sensor types need grouping
Recommendations:
  • Use 5-minute time buckets for optimal coverage
  • Convert timestamps to milliseconds
  • Group by paramDefDocId for category identification
```

**3. AI Suggestions:**

#### **Suggestion 1: Raw Data (Simple)**
```
Description: Return individual records with field transformations
Estimated Output: ~1,000 records (0.5% sample)

Pros:
• Full detail preserved
• Simple to understand
• Works immediately

Cons:
• Only covers 0.5% of data
• Biased sample (oldest records first)

Best For: Small datasets < 1,000 records

Pipeline:
[
  { "$match": { "ai.processed": { "$ne": true } } },
  { "$project": {
      "_id": 0,
      "category": "$paramDefDocId",
      "value": "$max",
      "timestamp": "$startTime"
    }
  },
  { "$limit": 1000 }
]
```

#### **Suggestion 2: Time-Bucketed (Recommended)**
```
Description: Aggregate into 5-minute time windows with statistics
Estimated Output: ~1,000 buckets covering 3.5 days

Pros:
• Full data coverage (100% of records)
• Preserves temporal patterns
• Includes min/max/mean per bucket
• Optimized for large datasets

Cons:
• Slight loss of granularity (5-min intervals vs per-second)

Best For: 10K-100K records, time-series analysis

Pipeline:
[
  { "$match": { "ai.processed": { "$ne": true } } },
  { "$group": {
      "_id": {
        "category": "$paramDefDocId",
        "timeBucket": {
          "$subtract": [
            { "$toLong": "$startTime" },
            { "$mod": [{ "$toLong": "$startTime" }, 300000000000] }
          ]
        }
      },
      "mean": { "$avg": "$max" },
      "min": { "$min": "$max" },
      "max": { "$max": "$max" },
      "count": { "$sum": 1 },
      "timestamp": { "$first": "$startTime" }
    }
  },
  { "$project": {
      "_id": 0,
      "category": "$_id.category",
      "value": "$mean",
      "timestamp": "$timestamp",
      "metadata": {
        "min": "$min",
        "max": "$max",
        "count": "$count",
        "bucketed": true
      }
    }
  },
  { "$sort": { "timestamp": 1 } },
  { "$limit": 1000 }
]
```

#### **Suggestion 3: Hourly Aggregates (Long-Term)**
```
Description: Aggregate into 1-hour windows for historical analysis
Estimated Output: ~1,000 buckets covering 41 days

Pros:
• Maximum temporal coverage
• Very performant on large datasets
• Ideal for long-term trends

Cons:
• Less granular (1-hour intervals)
• May miss short-term anomalies

Best For: 1M+ records, historical analysis

Pipeline: (similar to above but with 1-hour bucket size)
```

**4. User Action:**
- Reviews suggestions
- Clicks "Apply This Pipeline" on Suggestion 2
- Pipeline is automatically configured
- Saves node and executes

---

## Technical Implementation

### Architecture

```
┌──────────────────────────────────────┐
│  Data Source Node UI                 │
│  (AIPipelineAssistant.svelte)       │
└────────────┬─────────────────────────┘
             │
             ▼ POST /api/datasource/generate-pipeline
┌──────────────────────────────────────┐
│  API Endpoint                        │
│  1. Fetch MongoDB credentials        │
│  2. Connect & sample docs (5)        │
│  3. Get collection stats             │
│  4. Build AI prompt                  │
│  5. Call LLM service                 │
│  6. Parse & validate response        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  LLM Service                         │
│  (Claude Sonnet 4, temperature=0.3)  │
│  Expert system prompt +              │
│  Context-aware user prompt           │
└────────────┬─────────────────────────┘
             │
             ▼ JSON Response
┌──────────────────────────────────────┐
│  {                                   │
│    suggestions: [...],               │
│    analysis: {...}                   │
│  }                                   │
└──────────────────────────────────────┘
```

### API Endpoint

**POST** `/api/datasource/generate-pipeline`

**Request:**
```typescript
{
  credentialId: string;      // MongoDB credential ID
  collection: string;        // Collection name
  goal: string;              // User's goal description
  targetNode?: string;       // Target node type (default: 'insight')
  sampleSize?: number;       // Number of sample docs (default: 5)
}
```

**Response:**
```typescript
{
  success: boolean;
  suggestions: [
    {
      name: string;
      description: string;
      pipeline: any[];       // MongoDB aggregation pipeline
      pros: string[];
      cons: string[];
      bestFor: string;
      estimatedOutput: string;
    }
  ];
  analysis: {
    dataStructure: string;
    challenges: string[];
    recommendations: string[];
  };
  sampleDocCount: number;
  collectionStats?: {
    count: number;
    avgObjSize: number;
    storageSize: number;
  };
}
```

### LLM Configuration

**Model**: User-selectable (defaults to credential's default model)
**Temperature**: 0.3 (lower for consistent code generation)
**Max Tokens**: 4000
**System Prompt**: Customizable via PromptBuilder or manual editing
**Output Format**: Structured JSON (validated)

#### Using PromptBuilder for Custom System Prompts

The AI Pipeline Assistant now integrates the **PromptBuilder** feature, allowing you to generate custom system prompts using AI:

**How to Use:**
1. Expand "🤖 LLM Configuration" section
2. Click "Build Prompt" button
3. Select expert type (e.g., "MongoDB Aggregation Expert", "Data Pipeline Architect")
4. Describe your specific needs (e.g., "Generate prompts for IoT sensor data with focus on real-time processing")
5. AI generates an optimized system prompt
6. Click "Use This Prompt" to apply it
7. Optionally save to library for reuse

**Benefits:**
- **Domain-Specific**: Generate prompts tailored to your data type (IoT, logs, financial, etc.)
- **Consistent**: Save and reuse successful prompts across multiple data sources
- **Transparent**: See exactly what instructions are being sent to the AI
- **Iterative**: Refine prompts based on results

**Example Use Cases:**
- "Generate pipeline prompt for high-frequency financial trading data"
- "Create prompt optimized for log aggregation with error detection"
- "Build prompt for e-commerce analytics with customer segmentation"

---

## Best Practices

### For Users

1. **Be Specific in Goals**
   - ❌ "Make it work"
   - ✅ "Prepare time-series data for anomaly detection in Insight node with 200K records"

2. **Review All Suggestions**
   - Don't always pick the first one
   - Read pros/cons carefully
   - Consider your data volume

3. **Test First**
   - Apply pipeline and execute once
   - Verify output format
   - Check performance

4. **Iterate if Needed**
   - Regenerate with refined goal
   - Try different templates
   - Provide more context

### For Developers

1. **Prompt Engineering**
   - Keep system prompt updated with best practices
   - Include examples of good vs bad pipelines
   - Specify output format strictly

2. **Error Handling**
   - Validate LLM JSON response
   - Handle MongoDB connection failures gracefully
   - Provide helpful error messages

3. **Performance**
   - Use lightweight MongoDB options for sampling
   - Limit sample size (5 docs usually sufficient)
   - Cache LLM credentials

4. **Security**
   - Don't expose sensitive data in samples
   - Sanitize/truncate long strings
   - Validate user inputs

---

## Troubleshooting

### Issue: "No LLM credential available"
**Solution**: Configure an LLM credential first:
1. Go to Credentials tab
2. Add Anthropic or OpenAI credential
3. Try generating again

### Issue: "Collection is empty"
**Solution**:
- Ensure collection has documents
- Check MongoDB credential permissions
- Verify collection name is correct

### Issue: "AI could not generate suggestions"
**Possible Causes:**
1. LLM API quota exceeded
2. Response parsing failed
3. Data structure too complex

**Solutions:**
- Check LLM credential status
- Try a simpler goal description
- Check server logs for details

### Issue: "Generated pipeline doesn't work"
**Debugging:**
1. Check the "Custom Aggregation Pipeline" section to see what was applied
2. Test pipeline in MongoDB Compass
3. Regenerate with more specific goal
4. Fall back to manual strategy selection

---

## Future Enhancements

Potential improvements:
- **Interactive Refinement**: Chat-like interface to refine suggestions
- **Pipeline Testing**: Preview output before applying
- **Historical Learning**: Remember user preferences
- **Multi-Collection Analysis**: Analyze joins and relationships
- **Performance Profiling**: Estimate execution time
- **Version Control**: Save/compare different pipeline versions

---

## Comparison with Other Approaches

| Approach | Complexity | Flexibility | Time to Setup | Best For |
|----------|-----------|-------------|---------------|----------|
| **Strategy Templates** | Low | Medium | Instant | Standard patterns |
| **AI Assistant** | Medium | High | ~10 seconds | Custom/complex needs |
| **Manual Pipeline** | High | Very High | Minutes-Hours | Experts only |

---

## Quick Start

1. Open Data Source node (MongoDB)
2. Set credential and collection
3. Expand "🤖 AI Pipeline Assistant"
4. Describe your goal
5. Click "Generate AI-Optimized Pipelines"
6. Review suggestions
7. Click "Apply This Pipeline" on preferred option
8. Save and execute!

---

## Related Documentation

- `AGGREGATION_STRATEGY_GUIDE.md` - Strategy selection system
- `INSIGHT_NODE_SETUP_GUIDE.md` - Insight node configuration
- `aggregationStrategyBuilder.ts` - Pipeline generation logic
- `AIPipelineAssistant.svelte` - UI component

---

## Support

**Need Help?**
- Check inline help in the UI
- Review generated suggestions carefully
- Try different goal descriptions
- Fall back to manual configuration if needed

**Found a Bug?**
- Check server logs for LLM errors
- Verify MongoDB connection
- Report with: goal description, sample doc structure, error message
