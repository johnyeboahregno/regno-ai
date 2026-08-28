# Lookup Tool Cover Template Feature

## Overview

The Lookup tool has been extended to allow customization of the Data Records panel's collapsed "cover" view. This enables users to display custom metrics and summary information derived from lookup enrichment results.

## Feature Components

### 1. **LookupConfigSection UI** (`src/lib/components/modal-sections/LookupConfigSection.svelte`)

Added a new "Cover Template (Panel Summary View)" section with:

- **Annotated Preview**: Visual representation showing the 4 customizable placeholders
  - ① Main Value (large display)
  - ② Secondary Value
  - ③ Total Value
  - ④ Percentage

- **Template Inputs**: Four text fields for mapping data to placeholders
  - Uses `{fieldName}` syntax for dynamic values
  - Supports both field references and static text
  - Auto-calculates aggregates from enriched data

### 2. **Data Structure**

```typescript
coverTemplate: {
  mainValue: string,      // e.g., "{matched}" or "{activeUsers}"
  secondaryValue: string, // e.g., "{processed}"
  totalValue: string,     // e.g., "{total}"
  percentage: string      // e.g., "{matchRate}" or "{completionRate}"
}
```

### 3. **LookupExecutor Enhancement** (`src/lib/server/execution/executors/LookupExecutor.ts`)

Added logic to:
- Evaluate cover template placeholders
- Calculate aggregate metrics:
  - `count`: Total results
  - `total`: Total input records
  - `matched`: Records with successful lookups
  - `unmatched`: Records without matches
  - `matchRate`: Auto-calculated percentage (matched/total * 100)
- Return `coverMetrics` in execution result

**Template Evaluation**:
```typescript
const aggregates = {
  count: results.length,
  total: inputData.length,
  matched: results.filter(r => r.metadata?.[metadataKey]?.lookupResult).length,
  unmatched: results.filter(r => !r.metadata?.[metadataKey]?.lookupResult).length,
  matchRate: Math.round((matched / total) * 100)
};
```

### 4. **ChartStreamControlPanel Integration** (`src/lib/components/ChartStreamControlPanel.svelte`)

**State Management**:
```typescript
let dataRecordsCoverMetrics = $state<any>(null);
```

**SSE Message Processing**:
```typescript
// Extract cover metrics from lookup tool results
const toolResults = data.data?.toolResults || {};
for (const [toolId, result] of Object.entries(toolResults)) {
  if (result?.coverMetrics) {
    dataRecordsCoverMetrics = result.coverMetrics;
    break; // Use first lookup tool's metrics
  }
}
```

**Panel Display**:
```svelte
<div class="metric-value text-lg font-bold text-green-300">
  {dataRecordsCoverMetrics?.mainValue || downsampledRecords.toLocaleString()}
</div>
<div class="text-xs text-gray-500">
  {#if dataRecordsCoverMetrics}
    {dataRecordsCoverMetrics.secondaryValue || ''} /
    {dataRecordsCoverMetrics.totalValue || ''}
    ({dataRecordsCoverMetrics.percentage || ''}%)
  {:else}
    <!-- Default display -->
  {/if}
</div>
```

### 5. **Lookup Tool Added to Data Records Panel**

Added "Lookup" button to Data Records Tools section:
- Icon: Search (amber theme)
- Default config includes empty coverTemplate structure
- Description: "Enrich data with lookups & customize panel cover"

## Usage Example

### Scenario: User Activity Tracking

**Setup**:
1. Add a Data Source tool to load user profiles
2. Add a Lookup tool with:
   - Reference Tool: User profiles data source
   - Key Mapping: `userId` → `_id`
   - Cover Template:
     - Main Value: `{matched}`
     - Secondary Value: `{matched}`
     - Total Value: `{total}`
     - Percentage: `{matchRate}`

**Result**:
The Data Records panel will display:
```
🗄️ Data Records
150                    ← Main Value (matched users)
150 / 200 (75%)        ← Secondary / Total (Percentage)
```

### Advanced Example: Custom Metrics

**Cover Template**:
```javascript
mainValue: "{activeUsers}"      // Custom field from lookup
secondaryValue: "{processed}"   // Another custom field
totalValue: "{totalRecords}"    // Another custom field
percentage: "{completionRate}"  // Custom calculated percentage
```

The lookup executor will evaluate these templates by:
1. Aggregating data from enriched results
2. Extracting fields from `lookupResult` objects
3. Replacing placeholders with actual values

## Built-in Aggregates

The following aggregates are automatically available:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{count}` | Total number of results | 200 |
| `{total}` | Total input records | 200 |
| `{matched}` | Records with successful lookups | 150 |
| `{unmatched}` | Records without lookups | 50 |
| `{matchRate}` | Auto-calculated match percentage | 75 |

## Benefits

1. **Panel-Agnostic Design**: Cover templates work for any panel that uses lookup tools
2. **Real-Time Updates**: Metrics update automatically as data streams
3. **Flexible Mapping**: Use any field from lookup results or built-in aggregates
4. **Visual Feedback**: Annotated preview helps users understand the mapping
5. **Backward Compatible**: Existing configurations continue to work with default display

## Files Modified

1. `src/lib/components/modal-sections/LookupConfigSection.svelte`
   - Added Cover Template UI section
   - Initialized coverTemplate in config

2. `src/lib/server/execution/executors/LookupExecutor.ts`
   - Added aggregate calculation logic
   - Added template evaluation function
   - Return coverMetrics in result

3. `src/lib/components/ChartStreamControlPanel.svelte`
   - Added dataRecordsCoverMetrics state
   - Extract metrics from SSE toolResults
   - Display metrics in Data Records panel cover
   - Added Lookup tool button to Data Records panel

## Future Enhancements

- Support for multiple lookup tools with priority selection
- Custom aggregate functions (sum, avg, min, max)
- Conditional formatting based on threshold values
- Template validation and preview with sample data
