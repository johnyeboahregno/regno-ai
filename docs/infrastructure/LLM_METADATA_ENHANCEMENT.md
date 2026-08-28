# LLM Metadata Enhancement - Always Include Token Breakdown

## Problem
LLM logs in F3 console had inconsistent metadata:
- **Old format (migrated)**: Included `promptTokens`, `completionTokens`, and `totalTokens`
- **New format**: Only included `totalTokens`

This required the display logic to handle both formats and resulted in less detailed information for newer logs.

## Root Cause Analysis

### Token Extraction (Already Working)
The `callLLM` function in `/disks/disk1/chat/src/lib/server/services/llmService.ts` was **already extracting** the detailed token breakdown from all providers:

1. **OpenAI/OpenRouter/Perplexity** (lines 99-106):
   ```typescript
   tokens: {
     prompt: j?.usage?.prompt_tokens,
     completion: j?.usage?.completion_tokens,
     total: j?.usage?.total_tokens
   }
   ```

2. **Anthropic** (lines 172-177):
   ```typescript
   tokens: {
     prompt: j?.usage?.input_tokens,
     completion: j?.usage?.output_tokens,
     total: (j?.usage?.input_tokens || 0) + (j?.usage?.output_tokens || 0)
   }
   ```

3. **Gemini** (lines 241-246):
   ```typescript
   tokens: {
     prompt: j?.usageMetadata?.promptTokenCount,
     completion: j?.usageMetadata?.candidatesTokenCount,
     total: j?.usageMetadata?.totalTokenCount
   }
   ```

### Logging Issue (The Bug)
The `logLLMCall` function was extracting the detailed breakdown but **not saving it**:

**Before (lines 378-390):**
```typescript
auditTrails: [{
  _ref: permanentHistoryId,
  timestamp: new Date().toISOString(),
  model,
  provider,
  totalTokens,        // ❌ Only total, no breakdown
  duration,
  cost,
  success: response.ok,
  purpose: loggingContext.purpose || 'llm_call'
}],
```

**After (lines 378-390):**
```typescript
auditTrails: [{
  _ref: permanentHistoryId,
  timestamp: new Date().toISOString(),
  model,
  provider,
  promptTokens,        // ✅ Include prompt token breakdown
  completionTokens,    // ✅ Include completion token breakdown
  totalTokens,
  duration,
  cost,
  success: response.ok,
  purpose: loggingContext.purpose || 'llm_call'
}],
```

## Solution
Updated `/disks/disk1/chat/src/lib/server/services/llmService.ts` line 383-384:
- Added `promptTokens` to the audit trail
- Added `completionTokens` to the audit trail

These values were already being extracted in lines 312-314 of the same function:
```typescript
const promptTokens = usage.prompt_tokens || usage.input_tokens || 0;
const completionTokens = usage.completion_tokens || usage.output_tokens || 0;
const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
```

## Benefits

### For New LLM Calls
All future LLM calls will now include:
```json
{
  "auditTrails": [{
    "promptTokens": 445,
    "completionTokens": 654,
    "totalTokens": 1099,
    "cost": 0.0017685
  }]
}
```

### Display Improvements
The F3 console will display detailed token breakdown:
- **Before:** "6,682 total" (only aggregate)
- **After:** "445 → 654" (prompt and completion breakdown)

### Analysis Capabilities
Enables better insights:
- Prompt efficiency analysis (how verbose are prompts?)
- Completion efficiency analysis (how much does the model generate?)
- Cost optimization (identify heavy prompt vs completion usage)
- Token ratio tracking (prompt:completion ratios)

## Backward Compatibility
✅ **Fully backward compatible**
- Old entries without breakdown still work (display shows "X total")
- New entries with breakdown show detailed view ("X → Y")
- Display logic in `ServerConsole.svelte` handles both formats gracefully

## Testing

### Test New LLM Calls
1. Make any LLM call (Expert node, Maestro, etc.)
2. Go to F3 → LLM tab
3. Find the new entry
4. Expand to view audit trails
5. Verify you see: "445 → 654" format (not "1,099 total")

### Verify All Providers
Test with all three providers to ensure consistent behavior:
- ✅ OpenAI/OpenRouter/Perplexity
- ✅ Anthropic
- ✅ Gemini

## Related Files
- `/disks/disk1/chat/src/lib/server/services/llmService.ts` (lines 383-384) - Token logging
- `/disks/disk1/chat/src/lib/components/admin/ServerConsole.svelte` (lines 346-360) - Display formatting

## Status
✅ **IMPLEMENTED** - Changes applied and server auto-reloaded at 19:22:36
- All new LLM calls will include detailed token breakdown
- Display logic already supports both formats
- No migration needed for existing data
