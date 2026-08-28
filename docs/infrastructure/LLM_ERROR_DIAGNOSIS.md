# LLM Activity Error Diagnosis

## Problem
Server Console (F3) shows:
- Graph Calls (year): 857
- Success: 0
- Errors: 835

This indicates a ~97% failure rate which seems incorrect.

## Investigation

### Collections Checked
1. **`nodeHistory`**: 0 LLM calls (wrong collection)
2. **`_history`**: 847 documents with LLM data
3. **`pipeline_history`**: 833 documents with audit trails

### Error Counting Logic
From `nodeHistoryService.ts` lines 659-704:

A call is counted as **ERROR** if ANY of these are true:
- `success` field is explicitly `false`
- `metadata.success` is explicitly `false`
- `error` field exists AND is not null/empty
- `metadata.error` field exists AND is not null/empty

Otherwise counted as **SUCCESS**.

### Findings from `_history` Collection
```
Total documents: 847
success=true: 808
success=false: 39
```

**This means:**
- 808 calls have `success=true`
- 39 calls have `success=false`
- But all 847 have an `error` field (even if null)

## Root Cause Hypothesis

**The `_history` collection is storing an `error` field on EVERY document, even successful ones.**

When the aggregation runs, it checks:
```javascript
{ $and: [{ $ne: ['$error', null] }, { $ne: ['$error', ''] }] }
```

But if the field **exists** (even as `null`), MongoDB might be treating this differently than expected.

## Solution Options

### Option 1: Fix Data Layer (Recommended)
Don't store `error` field at all for successful calls. Only add it when there's an actual error.

**Where to fix:** Search for where `_history` documents are created and ensure:
```javascript
// Good:
if (error) {
  doc.error = error;
}

// Bad:
doc.error = error || null;  // This creates the field even when no error
```

### Option 2: Fix Query Logic
Update the aggregation to be more explicit:
```javascript
effectiveSuccess: {
  $cond: [
    { $or: [
      { $eq: ['$success', false] },
      { $eq: ['$metadata.success', false] },
      { $and: [
        { $ne: ['$error', null] },
        { $ne: ['$error', ''] },
        { $ne: ['$error', undefined] }  // Add this
      ]}
    ]},
    false,
    true
  ]
}
```

### Option 3: Clean Existing Data
Run migration to remove null/empty error fields:
```javascript
db._history.updateMany(
  { error: null },
  { $unset: { error: "" } }
)
```

## Next Steps

1. Find where `_history` documents are created
2. Fix to not set `error` field when there's no error
3. Run cleanup migration on existing data
4. Verify error counts drop to realistic levels

## Expected Outcome
- Success: ~808 (94%)
- Errors: ~39 (4.5%)

This matches the actual `success` field values in the database.
