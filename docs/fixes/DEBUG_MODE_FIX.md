# Debug Mode Fix - Pipeline Execution

## Issue

When running a pipeline normally (clicking ▶️ on a trigger node or any node), the entire pipeline would go into debug mode with debug panels opening automatically. This was distracting and unnecessary for normal pipeline execution.

## Root Cause

In `src/lib/components/DataManagementCanvas.svelte:7466-7468`, the `runNode()` function was calling:

```javascript
if (currentExecutionId) {
  await showDebugForExecution(currentExecutionId, nodeId);
}
```

The `showDebugForExecution()` function has a parameter `showPanels: boolean = true` that controls whether debug panels should be shown. Since no value was passed, it defaulted to `true`, causing debug panels to open automatically.

## Solution

Changed the call to explicitly pass `false` for the `showPanels` parameter:

```javascript
if (currentExecutionId) {
  await showDebugForExecution(currentExecutionId, nodeId, undefined, false);
}
```

## Behavior After Fix

### ✅ Running a Pipeline Normally (▶️ Button)
- Pipeline executes without opening debug panels
- User can still manually open debug console if needed
- Clean execution flow without interruption

### ✅ Testing a Node (Test Button)
- Debug panels still open automatically (line 8191)
- Shows input/output data samples
- Event timeline visible
- This is expected behavior for testing

## Files Modified

- `src/lib/components/DataManagementCanvas.svelte:7469`

## Testing

**Before:**
1. Open pipeline
2. Click ▶️ on any node
3. Debug panels open automatically ❌

**After:**
1. Open pipeline
2. Click ▶️ on any node
3. Pipeline runs cleanly, no debug panels ✅
4. Click "Test" button on a node
5. Debug panels open (expected behavior) ✅

## User Experience

**Normal Execution:**
- Clean, distraction-free pipeline runs
- No automatic panel opening
- User maintains control over their workspace

**Testing:**
- Debug panels open as expected
- Input/output samples visible
- Event timeline for debugging

## Summary

✅ **Fixed:** Debug mode no longer activates automatically when running pipelines normally
✅ **Preserved:** Debug mode still activates when explicitly testing nodes
✅ **Improved:** Better user experience with less visual clutter during normal operations
