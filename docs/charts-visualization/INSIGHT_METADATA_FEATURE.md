# AI Insights Processing Metadata Feature

## Overview

The AI Insights node now includes comprehensive processing metadata that shows exactly how the report was produced. This feature provides transparency into field matching, data processing strategies, and any issues encountered during analysis.

## What's New

### 1. Processing Metadata Section

A new collapsible "Processing Metadata" section appears at the bottom of AI Insights reports, showing:

- **Data Processing Statistics**
  - Total input records
  - Records successfully processed
  - Records skipped (missing required fields)
  - Categories found
  - Processing strategy used (raw, time-bucketed, etc.)

- **Field Mapping Details**
  - Shows configured field paths with OR fallback syntax
  - Displays which field was actually matched from the OR list
  - Highlights when fallback fields were used (cyan badge)
  - Supports nested paths like `_id.bucket`

- **Field Transformations**
  - Shows if transformations are enabled
  - Displays Y field transform type (direct, midpoint, expression)
  - Displays timestamp transform type (direct, map, expression)

- **Warnings**
  - Lists any field matching failures
  - Shows attempted field names
  - Provides clear error messages

### 2. Enhanced Download Reports

Downloaded markdown reports now include the complete processing metadata section, making it easy to share and document how insights were generated.

## How It Works

### Backend Implementation

The `InsightExecutor` now tracks metadata throughout the analysis pipeline:

```typescript
// Metadata tracking structure
{
  fieldMatches: {
    groupField: { attempted: [...], matched: 'actualField' },
    yField: { attempted: [...], matched: 'actualField' },
    timestampField: { attempted: [...], matched: 'actualField' }
  },
  recordsProcessed: 100,
  recordsSkipped: 5,
  categoriesFound: 10,
  warnings: [...]
}
```

### OR Fallback Tracking

When OR fallback is used (e.g., `value | avg | mean`), the system:

1. Tries each field in order
2. Records which field was successfully matched
3. Tracks attempted fields that failed
4. Displays this information in the metadata section

Example:
- **Configured**: `categoryName | category | group`
- **Matched**: `category` ✓ *OR fallback used*

This tells you that the first field (`categoryName`) wasn't found, but the second field (`category`) was successfully used.

## Use Cases

### 1. Debugging Data Issues

If AI Insights finds 0 categories or produces unexpected results, check the metadata:

- **Records Skipped** > 0: Some records are missing required fields
- **Warnings Section**: Shows which fields couldn't be found
- **Field Mappings**: Confirms which fields were actually used

### 2. Validating OR Fallback Configuration

When using OR fallback to support multiple data structures (custom pipeline vs. time-bucketed):

- Metadata shows which field was matched
- Confirms fallback is working correctly
- Helps identify if you need to adjust field order

### 3. Performance Analysis

- Shows how many records were processed vs. skipped
- Displays processing strategy used (important for large datasets)
- Helps optimize field mappings to reduce skipped records

### 4. Documentation

- Export reports with complete metadata
- Share with team to show data lineage
- Document processing decisions

## Visual Indicators

### UI Elements

1. **Purple Section**: Processing Metadata collapsible panel
2. **Cyan Badges**: "OR fallback used" indicators
3. **Orange Warnings**: Field matching issues
4. **Color-Coded Stats**:
   - Cyan: Input records
   - Green: Successfully processed
   - Orange: Skipped (if > 0)
   - Purple: Categories found

### Example Output

```
Processing Metadata

Data Processing
├─ Input Records: 63,567
├─ Records Processed: 63,500
├─ Records Skipped: 67
├─ Categories Found: 45
└─ Strategy: 5-minute buckets

Field Mappings
├─ Group Field (Category)
│  ├─ Configured: categoryName | category
│  └─ Matched: category ✓ OR fallback used
├─ Y Field (Value)
│  ├─ Configured: value | avg
│  └─ Matched: avg ✓ OR fallback used
└─ Timestamp Field
   ├─ Configured: timestamp | _id.bucket
   └─ Matched: _id.bucket ✓ OR fallback used
```

## Technical Details

### Files Modified

1. **`src/lib/server/execution/executors/InsightExecutor.ts`**
   - Added metadata parameter to getter methods
   - Enhanced `getCategoryValue()`, `getNumericValue()`, `getTimestampValue()`
   - Updated `aggregateData()` to track processing stats
   - Modified `analyzeSnapshot()` to build metadata object

2. **`src/lib/components/node-displays/InsightDisplay.svelte`**
   - Added `ProcessingMetadata` interface
   - Added collapsible metadata section
   - Updated `downloadReport()` to include metadata

### Response Structure

```typescript
{
  insights: "...",
  categoriesAnalyzed: 45,
  totalRecords: 63567,
  bucketInfo: {...},
  executionTimeMs: 2345,
  executionTimeSec: "2.35",
  groupField: "categoryName | category",
  yField: "value | avg",
  timestamp: "2025-11-07T...",
  categories: [...],
  metadata: {
    totalInputRecords: 63567,
    recordsProcessed: 63500,
    recordsSkipped: 67,
    categoriesFound: 45,
    dataProcessingStrategy: "5-minute buckets",
    fieldMappings: {
      groupField: {
        configured: "categoryName | category",
        matched: "category"
      },
      yField: {
        configured: "value | avg",
        matched: "avg"
      },
      timestampField: {
        configured: "timestamp | _id.bucket",
        matched: "_id.bucket"
      }
    },
    fieldTransformations: {
      enabled: true,
      yFieldTransform: "midpoint",
      timestampTransform: "direct"
    },
    warnings: [
      {
        type: "missing_field",
        field: "groupField",
        attempted: ["categoryName", "category"],
        message: "Could not find any of: categoryName, category"
      }
    ]
  }
}
```

## Testing

### Test Scenario 1: Custom Pipeline Data

**Configuration**:
- Group Field: `categoryName`
- Y Field: `value`
- Timestamp Field: `timestamp`

**Expected Metadata**:
- All fields should match first option (no OR fallback used)
- Records Processed = Total Input Records
- No warnings

### Test Scenario 2: Time-Bucketed Data with OR Fallback

**Configuration**:
- Group Field: `categoryName | category`
- Y Field: `value | avg`
- Timestamp Field: `timestamp | _id.bucket`

**Expected Metadata**:
- Fields should match second option (OR fallback used badges appear)
- Cyan badges next to each field mapping
- Records Processed = Total Input Records
- No warnings

### Test Scenario 3: Missing Fields

**Configuration**:
- Group Field: `nonExistentField | anotherMissingField`

**Expected Metadata**:
- Records Skipped > 0
- Warning appears showing attempted fields
- Orange warning section visible

## Benefits

1. **Transparency**: Users can see exactly how their data was processed
2. **Debugging**: Quick identification of field mapping issues
3. **Validation**: Confirms OR fallback is working as expected
4. **Documentation**: Complete record of processing decisions
5. **Optimization**: Identify opportunities to reduce skipped records

## Future Enhancements

- Add field type validation warnings (string vs. number mismatch)
- Track transformation errors in more detail
- Add performance metrics per phase
- Include sample values for matched fields
- Add suggestions for fixing field mapping issues

---

**Status**: ✅ Implemented and tested
**Build Status**: ✅ Build successful
**Ready for Testing**: Yes - test with P-D3 pipeline execution
