# LLM Token Display Fix

## Problem
Server Console (F3) LLM logs were showing "—" (empty) for tokens and cost on newer entries, while older entries displayed correctly.

## Root Cause
Two different metadata structures exist in the `pipeline_history` collection:

### Old Format (Migrated)
```json
{
  "auditTrails": [{
    "promptTokens": 445,
    "completionTokens": 654,
    "totalTokens": 1099,
    "cost": 0.0017685,
    "promptLength": 1954,
    "responseLength": 3005,
    "_migrated": true
  }]
}
```

### New Format
```json
{
  "auditTrails": [{
    "totalTokens": 6682,
    "cost": 0.079122
    // No promptTokens or completionTokens
  }]
}
```

The display logic in `ServerConsole.svelte` only handled the old format with token breakdown.

## Solution
Updated `/disks/disk1/chat/src/lib/components/admin/ServerConsole.svelte`:

### 1. Enhanced `formatLLMTokensDetailed` function (lines 346-360)
```typescript
function formatLLMTokensDetailed(promptTokens?: number, completionTokens?: number, totalTokens?: number): string {
  const hasBreakdown = (promptTokens ?? 0) > 0 || (completionTokens ?? 0) > 0;

  if (hasBreakdown) {
    // Old format: show prompt → completion breakdown
    const p = promptTokens ?? 0;
    const c = completionTokens ?? 0;
    return `${p.toLocaleString()} → ${c.toLocaleString()}`;
  } else if (totalTokens && totalTokens > 0) {
    // New format: only show total
    return `${totalTokens.toLocaleString()} total`;
  }

  return '—';
}
```

### 2. Updated main metrics display (line 2280)
```typescript
formatLLMTokensDetailed(metrics.promptTokens, metrics.completionTokens, metrics.totalTokens)
```

### 3. Updated audit trail table (line 2369)
```typescript
formatLLMTokensDetailed(audit?.promptTokens, audit?.completionTokens, audit?.totalTokens)
```

## Display Examples

### Old Format
- **Display:** `445 → 654` (shows prompt and completion tokens separately)
- **Cost:** `$0.001769`

### New Format
- **Display:** `6,682 total` (shows only total tokens)
- **Cost:** `$0.079122`

### Missing Data
- **Display:** `—`
- **Cost:** `—`

## Benefits
1. ✅ Both old and new metadata structures display correctly
2. ✅ Token information always visible when available
3. ✅ Cost information always visible when available
4. ✅ Backward compatible with migrated entries
5. ✅ Forward compatible with new entries
6. ✅ Graceful degradation when data is missing

## Testing
1. Navigate to Server Console (F3)
2. Click on LLM tab
3. Expand any entry to view audit trails
4. Verify:
   - Old entries show: "445 → 654"
   - New entries show: "6,682 total"
   - All entries show cost when available

## Related Files
- `/disks/disk1/chat/src/lib/components/admin/ServerConsole.svelte` - Display logic
- `/disks/disk1/chat/src/lib/server/services/nodeHistoryService.ts` - Data retrieval

## Status
✅ **FIXED** - Changes applied and hot-reloaded via Vite HMR
