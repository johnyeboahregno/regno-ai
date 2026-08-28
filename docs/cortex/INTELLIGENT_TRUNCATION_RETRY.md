# Intelligent Truncation Retry Strategy

## Problem
The previous truncation handling had a critical bug that caused infinite retry loops:

### Old Behavior (BROKEN):
1. Detect truncation at 2000 tokens
2. Auto-retry with 8000 tokens (4x)
3. Still truncated → auto-retry with 16000 tokens (4x again, hits max)
4. Still truncated → try 16000 * 4 = 64000, but caps at 16000
5. **INFINITE LOOP**: Keeps retrying at 16000 forever! 💸💸💸

### The Bug:
- "Don't ask again" mode bypassed user confirmation
- No retry limit enforcement
- No detection when already at max tokens
- Multiplier (4x) caused overshooting
- System kept retrying even when it couldn't increase tokens further

## Solution: Intelligent Retry Strategy

### Key Principles:
1. ✅ **Always ask user** - No auto-retry mode
2. ✅ **Max 3 attempts** - Hard limit to prevent waste
3. ✅ **Progressive scaling** - 2x (not 4x) to avoid overshooting
4. ✅ **Stop at 16K** - Respect API maximum
5. ✅ **Clear messaging** - User knows exactly what's happening

### Implementation

#### State Variables (lines 131-135):
```typescript
// Intelligent retry tracking (per execution)
let retryCount = $state(0);
let retryHistory = $state<number[]>([]); // Track token limits tried
const MAX_RETRIES = 3;
const MAX_TOKENS = 16000;
```

#### Truncation Detection (lines 846-895):
```typescript
if (detectTruncation(audit)) {
  const currentMaxTokens = maestroAdvancedSettings.maxTokens || 2000;
  retryCount++;
  retryHistory = [...retryHistory, currentMaxTokens];

  // Check 1: Max retries exceeded?
  if (retryCount > MAX_RETRIES) {
    adaptiveError = `Response truncation persists after ${MAX_RETRIES} attempts...`;
    return; // STOP
  }

  // Check 2: Already at max tokens?
  if (currentMaxTokens >= MAX_TOKENS) {
    adaptiveError = `Response truncated even at maximum token limit (${MAX_TOKENS})...`;
    return; // STOP
  }

  // Calculate next tier: 2x current (not 4x!)
  const nextTokens = Math.min(currentMaxTokens * 2, MAX_TOKENS);

  // Check 3: Already tried this tier?
  if (retryHistory.includes(nextTokens)) {
    adaptiveError = `Already tried ${nextTokens} tokens...`;
    return; // STOP
  }

  // Show dialog - ALWAYS ask user
  showTruncationDialog = true;
} else {
  // Success! Reset for next execution
  retryCount = 0;
  retryHistory = [];
}
```

### Progressive Token Scaling

**Example Progression:**
```
Initial:  2000 tokens → Truncated
Retry 1:  4000 tokens (2x) → Truncated
Retry 2:  8000 tokens (2x) → Truncated
Retry 3: 16000 tokens (2x, max) → Truncated
STOP: Max retries reached
```

**Comparison with Old (Broken) System:**
```
Old:   2000 → 8000 (4x) → 16000 (4x) → 16000 (4x) → 16000 (infinite loop!)
New:   2000 → 4000 (2x) → 8000 (2x) → 16000 (2x) → STOP (max retries)
```

### Safety Checks

The system has **3 independent safety mechanisms**:

1. **Retry Counter**: Never exceeds MAX_RETRIES (3)
2. **Token Ceiling**: Never attempts > MAX_TOKENS (16000)
3. **History Tracking**: Never retries same token count twice

Any of these will stop the retry loop, preventing infinite execution.

### User Dialog

#### Updated UI (lines 2289-2367):

**Shows:**
- Retry progress: "Retry attempt: 1 of 3"
- Current vs suggested tokens
- Scale factor: "2x (progressive)"
- Estimated cost increase
- Warning on final attempt

**Removed:**
- ❌ "Don't ask again this session" button
- ❌ Auto-retry functionality
- ❌ Session storage preference

**Actions:**
- ✅ "Yes, retry with {suggestedMaxTokens} tokens"
- ✅ "No, stop here"

### Error Messages

**Max Retries Exceeded:**
```
Response truncation persists after 3 attempts.
Consider breaking this task into smaller steps or using a different approach.
```

**Already at Max Tokens:**
```
Response truncated even at maximum token limit (16000).
This task is too complex for a single response.
Please break it into smaller, more focused steps.
```

**Token Tier Already Tried:**
```
Already tried 8000 tokens.
Task is too complex for a single response.
Please break it into smaller steps.
```

## Benefits

### 1. Prevents Infinite Loops
- Hard limit of 3 retries
- Stops when token ceiling reached
- Detects repeated attempts

### 2. Cost Control
- User must approve each retry
- Progressive scaling (2x) reduces waste
- Clear cost estimation shown

### 3. Better UX
- Shows retry progress (1 of 3, 2 of 3, etc.)
- Warns on final attempt
- Provides actionable guidance when limits reached

### 4. Intelligent Scaling
- Starts conservative (2x not 4x)
- Adapts based on need
- Doesn't overshoot unnecessarily

### 5. Transparency
- User knows exactly what's happening
- Can make informed decisions
- No hidden auto-retry behavior

## Testing Scenarios

### Scenario 1: Single Retry Success
```
1. Start with 2000 tokens → Truncated
2. User approves retry with 4000 tokens
3. Success! ✅
4. Retry counter resets for next execution
```

### Scenario 2: Multiple Retries
```
1. Start with 2000 tokens → Truncated
2. Retry with 4000 tokens → Still truncated
3. Retry with 8000 tokens → Still truncated
4. Retry with 16000 tokens → Still truncated
5. STOP: "Max retries exceeded" error shown
6. User sees clear guidance to break task into smaller steps
```

### Scenario 3: Already at Max
```
1. User has set maxTokens to 16000 in settings
2. First attempt → Truncated
3. System detects: currentMaxTokens >= MAX_TOKENS
4. STOP immediately: "Already at maximum token limit"
5. No retry attempted (would be pointless)
```

### Scenario 4: User Declines
```
1. Start with 2000 tokens → Truncated
2. Dialog shows: "Retry with 4000 tokens?"
3. User clicks "No, stop here"
4. Execution stops with message:
   "Response truncated. You can try again with a more focused query..."
```

## Code Changes Summary

### Files Modified:
- `src/lib/components/MaestroOrchestrateTab.svelte`

### Lines Changed:

**Removed:**
- ❌ Lines 131-140: Auto-retry preference and session storage
- ❌ Lines 862-866: Auto-retry logic
- ❌ Lines 976-982: "Don't ask again" handler
- ❌ Lines 2336-2342: "Don't ask again" button

**Added:**
- ✅ Lines 131-135: Intelligent retry state variables
- ✅ Lines 849-895: Smart truncation detection with safety checks
- ✅ Lines 2305-2309: Retry progress indicator
- ✅ Lines 2321-2324: Scale factor display
- ✅ Lines 2336-2340: Final attempt warning

**Modified:**
- ✅ Lines 964-988: Simplified retry function (no skip dialog param)
- ✅ Lines 991-999: Simplified dialog handler (yes/no only)

### Net Changes:
- **Removed**: ~40 lines of auto-retry logic
- **Added**: ~50 lines of intelligent retry logic
- **Net**: +10 lines for much smarter behavior

## Migration Notes

### Breaking Changes:
- ❌ "Don't ask again" preference removed from sessionStorage
- ❌ Auto-retry behavior no longer available

### User Impact:
- **Positive**: No more accidental infinite loops
- **Positive**: Better cost control
- **Positive**: Clearer feedback
- **Minor**: Must click "Yes" for each retry (but this is actually good!)

### Settings:
- No changes to Advanced Settings
- `maxTokens` still used as starting point
- System respects user's configured limit

## Future Enhancements

### Potential Improvements:
1. **Adaptive Scaling**: Start with 2x, use 1.5x for subsequent retries
2. **Cost Tracking**: Show cumulative cost across all retries
3. **Task Complexity Analysis**: Predict if task needs higher tokens upfront
4. **Chunk Strategy Suggestion**: Offer to break response into parts
5. **Token Optimization**: Analyze prompt to reduce token usage

### Advanced Features:
1. **Smart Estimation**: Use response length history to predict needs
2. **Progressive Streaming**: Request partial responses, combine later
3. **Fallback Models**: Suggest cheaper models for simple retries
4. **Batch Processing**: Queue multiple truncated responses for batch retry

## Conclusion

The intelligent truncation retry strategy completely eliminates the infinite loop bug while providing a better user experience. The system now:

- ✅ **Prevents waste**: Max 3 retries, stops at 16K
- ✅ **Respects user**: Always asks permission
- ✅ **Scales smartly**: Progressive 2x scaling
- ✅ **Provides guidance**: Clear errors when limits reached
- ✅ **Tracks progress**: Shows retry count and history

**Result**: Reliable, cost-effective, and user-friendly truncation handling! 🎉
