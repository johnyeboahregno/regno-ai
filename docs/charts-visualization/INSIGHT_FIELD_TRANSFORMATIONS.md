# AI Insights Field Transformations

## Overview

The AI Insights node now supports **visual field transformations**, allowing you to adapt data that doesn't match the expected field names or calculate derived values directly in the node configuration.

## Why This Feature?

Previously, if your data had:
- `min` and `max` fields instead of a `value` field
- `startTime` instead of `timestamp`
- Different field names than what AI Insights expected

You had two options:
1. Modify the data source (e.g., custom aggregation pipeline)
2. Manually change field names in your data

Now you can **visually configure field mappings** directly in the AI Insights node settings!

## Configuration

### 1. Enable Field Transformations

In the AI Insights node settings:
1. Scroll to the **"Field Transformations"** section
2. Check the **"Enable"** checkbox
3. The transformation configuration panel will appear

### 2. Y Field (Value) Transformations

The Y Field represents the numeric value to analyze. Choose one of three transformation types:

#### Option A: Direct (default)
- Uses the field name as-is
- Example: If yField = "value", looks for `record.value`

#### Option B: Midpoint
- Calculates the midpoint of two fields
- **Use case**: Data has `min` and `max` instead of `value`
- **Configuration**:
  - Min Field: `min` (field name with minimum value)
  - Max Field: `max` (field name with maximum value)
- **Formula**: `value = (min + max) / 2`
- **Example**:
  ```javascript
  // Input record:
  { min: 0, max: 50, ... }

  // After transformation:
  { min: 0, max: 50, value: 25, ... }
  ```

#### Option C: Custom Expression
- Provides full JavaScript expression support
- **Configuration**: Enter JavaScript expression with `record` variable
- **Examples**:
  ```javascript
  // Calculate average of multiple fields
  (record.value1 + record.value2 + record.value3) / 3

  // Apply a multiplier
  record.baseValue * 2

  // Conditional logic
  record.status === 'active' ? record.value : 0
  ```

### 3. Timestamp Field Transformations

The Timestamp Field is used for temporal analysis. Choose one of three transformation types:

#### Option A: Direct (default)
- Uses the field name as-is
- Example: If timestampField = "timestamp", looks for `record.timestamp`

#### Option B: Map to Another Field
- Maps to a different source field
- **Use case**: Data has `startTime` but AI Insights expects `timestamp`
- **Configuration**:
  - Source Field: `startTime` (actual field name in data)
- **Example**:
  ```javascript
  // Input record:
  { startTime: 1760371839914, ... }

  // After transformation:
  { startTime: 1760371839914, timestamp: 1760371839914, ... }
  ```

#### Option C: Custom Expression
- Provides full JavaScript expression support
- **Configuration**: Enter JavaScript expression with `record` variable
- **Examples**:
  ```javascript
  // Fallback logic
  record.startTime || record.createdAt

  // Convert string to timestamp
  new Date(record.dateString).getTime()

  // Use end time if start time is missing
  record.startTime || record.endTime
  ```

## Complete Example: P-D3 Pipeline

### Problem
Data source returns:
```javascript
{
  "min": 0,
  "max": 50,
  "startTime": 1760371839914,
  "categoryName": "Config1 - ParamA (Description)"
}
```

But AI Insights expects:
- `value` (numeric)
- `timestamp` (temporal)
- `categoryName` (grouping) ✅ Already correct

### Solution

1. Open AI Insights node settings
2. Configure basic fields:
   - Group Field: `categoryName`
   - Y Field: `value`
   - Timestamp Field: `timestamp`
3. Enable Field Transformations
4. Configure Y Field:
   - Transform Type: **Midpoint**
   - Min Field: `min`
   - Max Field: `max`
5. Configure Timestamp Field:
   - Transform Type: **Map to Another Field**
   - Source Field: `startTime`
6. Save configuration

### Result

Transformations are applied at runtime:
```javascript
// Original record:
{ min: 0, max: 50, startTime: 1760371839914, categoryName: "Config1 - ParamA" }

// After transformations:
{
  min: 0,
  max: 50,
  value: 25,                    // ← Calculated: (0 + 50) / 2
  startTime: 1760371839914,
  timestamp: 1760371839914,     // ← Mapped from startTime
  categoryName: "Config1 - ParamA"
}

// AI Insights now receives all required fields! ✅
```

## Benefits

✅ **No data pipeline changes needed** - Transform data at analysis time
✅ **Visual configuration** - No code or scripts required
✅ **Reusable** - Save transformations with the node configuration
✅ **Flexible** - Supports simple mapping and complex expressions
✅ **Safe** - Original data unchanged, transformations applied to copies
✅ **Fast** - Transformations run in-memory during execution

## Technical Details

### Implementation

- Transformations applied in `InsightExecutor.applyFieldTransformations()`
- Runs before data aggregation (line 242 of InsightExecutor.ts)
- Creates transformed copies of records (original data unchanged)
- Supports nested field paths (e.g., `metadata.values.current`)
- Errors in expressions emit warnings but don't fail execution

### Configuration Fields

All transformation settings stored in node config:
```typescript
{
  enableFieldTransforms: boolean;        // Master toggle

  // Y Field transformations
  yFieldTransform: 'direct' | 'midpoint' | 'expression';
  yFieldMinSource: string;               // For midpoint
  yFieldMaxSource: string;               // For midpoint
  yFieldExpression: string;              // For expression

  // Timestamp transformations
  timestampTransform: 'direct' | 'map' | 'expression';
  timestampSourceField: string;          // For map
  timestampExpression: string;           // For expression
}
```

### Error Handling

- Invalid expressions emit `node_warning` events
- Failed transformations skip that record (doesn't fail entire execution)
- Detailed error messages in execution logs
- Original data preserved if transformation fails

## Migration Guide

### Existing P-D3 Pipeline

If you already modified the data source custom pipeline to calculate `value` and `timestamp`:

**Option 1: Keep data pipeline approach**
- Leave custom pipeline as-is
- No changes needed in AI Insights
- Data source does the transformation

**Option 2: Switch to node-level transformations**
1. Remove calculated fields from custom pipeline
2. Enable field transformations in AI Insights
3. Configure midpoint and mapping as shown above
4. Benefit: Cleaner data pipeline, transformation logic in analysis node

## Troubleshooting

### "Found 0 categories"

**Cause**: Field names don't match after transformation

**Fix**:
1. Check data sample in Data Source output
2. Note exact field names (case-sensitive!)
3. Update transformation source fields to match
4. Hard refresh browser (Ctrl+Shift+R)

### Expression Errors

**Cause**: Invalid JavaScript in custom expression

**Fix**:
1. Check execution logs for warning messages
2. Verify expression syntax (use `record.fieldName`)
3. Test expression with sample data
4. Use fallback logic: `record.field1 || record.field2 || 0`

### Transformations Not Applied

**Cause**: `enableFieldTransforms` is unchecked

**Fix**:
1. Open AI Insights node settings
2. Scroll to Field Transformations section
3. Check the "Enable" checkbox
4. Save configuration

## Future Enhancements

Potential additions:
- Group field transformations
- Multiple Y field aggregations
- Transformation templates/presets
- Field validation warnings
- Transformation preview with sample data

---

**Status**: ✅ Implemented and tested (Build #9, 2025-11-07)

**Files Modified**:
- `src/lib/components/modal-sections/InsightGeneralSection.svelte` (UI)
- `src/lib/components/modals/InsightModalConfig.ts` (Config)
- `src/lib/server/execution/executors/InsightExecutor.ts` (Logic)
