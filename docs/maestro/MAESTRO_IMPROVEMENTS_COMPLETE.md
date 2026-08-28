# Maestro Orchestration Improvements - Complete

## Summary
Implemented three major improvements to the Maestro adaptive orchestration system:

1. **Running Progress Bar/Timer** - Visual feedback during execution
2. **Improved Token Handling** - Smart retry logic with user preferences
3. **Fixed Document Formatting** - Word/PDF exports now match on-screen display

---

## 1. Running Progress Bar/Timer

**Location:** `src/lib/components/MaestroOrchestrateTab.svelte`

### Implementation

**State Variables (lines 561-564):**
```typescript
// Progress timer state
let executionStartTime = $state<number | null>(null);
let elapsedSeconds = $state(0);
let timerInterval: NodeJS.Timeout | null = null;
```

**Helper Functions (lines 566-592):**
```typescript
// Start execution timer
function startExecutionTimer() {
  executionStartTime = Date.now();
  elapsedSeconds = 0;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (executionStartTime) {
      elapsedSeconds = Math.floor((Date.now() - executionStartTime) / 1000);
    }
  }, 1000);
}

// Stop execution timer
function stopExecutionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  executionStartTime = null;
}

// Format elapsed time as MM:SS
function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**UI Display (lines 1161-1170):**
```svelte
<!-- Progress Bar with Timer -->
<div class="space-y-2 pt-2">
  <div class="flex items-center justify-between text-xs text-gray-400">
    <span>Executing with AI...</span>
    <span class="font-mono text-cyan-400">{formatElapsedTime(elapsedSeconds)}</span>
  </div>
  <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
    <div class="bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 h-2 rounded-full animate-pulse" style="width: 100%"></div>
  </div>
</div>
```

### Features
- **Real-time timer** updates every second
- **Visual progress bar** with animated gradient
- **MM:SS format** for easy readability
- **Automatic start/stop** on execution begin/end
- **Position:** Below execution summary, above collapsible details

---

## 2. Improved Token Handling Logic

**Location:** `src/lib/components/MaestroOrchestrateTab.svelte`

### Token Handling Strategy (lines 854-875)

```typescript
// TRUNCATION HANDLING STRATEGY:
// 1. Always start with tokens from maestroAdvancedSettings (user's configured value)
// 2. If truncated, offer to increase (4x current, max 16K)
// 3. Increase applies ONLY to this retry, then reverts to settings
// 4. If retry also truncates, offer to increase again (or auto-increase if "don't ask again")
// 5. User preference "don't ask again" persists only for this session

// If auto-retry is enabled (user selected "don't ask again"), retry immediately without asking
if (autoRetryTruncation) {
  console.log('[Adaptive] 🔄 Auto-retrying with higher token limit (don\'t ask again mode)...');
  const currentMaxTokens = maestroAdvancedSettings.maxTokens || 2000;
  suggestedMaxTokens = Math.min(currentMaxTokens * 4, 16000);
  await retryWithHigherTokens(path, true);
} else {
  // Show dialog asking user for this specific truncation
  truncatedStepData = { path, audit };
  const currentMaxTokens = maestroAdvancedSettings.maxTokens || 2000;
  suggestedMaxTokens = Math.min(currentMaxTokens * 4, 16000);
  estimatedRetryCost = estimateCostIncrease(currentMaxTokens, suggestedMaxTokens);
  showTruncationDialog = true;
}
```

### Retry Logic (lines 941-970)

```typescript
// Retry with higher token limit
// IMPORTANT: Token increase is TEMPORARY - only for this specific retry
// After retry completes (success or failure), maxTokens reverts to user's configured setting
async function retryWithHigherTokens(path: any, skipDialog: boolean = false) {
  if (!skipDialog) {
    showTruncationDialog = false;
  }

  console.log('[Adaptive] 🔄 Retrying with maxTokens:', suggestedMaxTokens);

  // Save original setting to restore later
  const originalMaxTokens = maestroAdvancedSettings.maxTokens;

  // Temporarily increase maxTokens for ONLY this retry
  maestroAdvancedSettings.maxTokens = suggestedMaxTokens;

  // Remove the truncated step from history
  adaptiveSteps = adaptiveSteps.slice(0, -1);

  try {
    // Re-execute with higher token limit
    // If this also gets truncated, the truncation detection will trigger again
    await executeSelectedPath(path);
  } finally {
    // ALWAYS restore original maxTokens after retry (success or failure)
    // This ensures next steps start with user's configured setting
    maestroAdvancedSettings.maxTokens = originalMaxTokens;
    console.log('[Adaptive] ↩️ Restored maxTokens to:', originalMaxTokens);
  }
}
```

### Behavior

**Normal Execution:**
1. Uses `maestroAdvancedSettings.maxTokens` (e.g., 2000 tokens)
2. If truncated → show dialog or auto-retry

**First Retry:**
1. Temporarily increase to `currentTokens * 4` (e.g., 8000 tokens, max 16K)
2. Re-execute with higher limit
3. **After completion:** Revert to original setting (2000)

**Second Retry (if first retry also truncated):**
1. Calculate new increase: `8000 * 4 = 16000` (capped at 16K)
2. If "don't ask again" selected: auto-retry without dialog
3. Otherwise: show dialog again
4. **After completion:** Revert to original setting (2000)

**Session Persistence:**
- "Don't ask again" preference stored in `sessionStorage`
- Clears when browser tab is closed
- Does NOT persist across sessions

---

## 3. Fixed Word/PDF Document Formatting

**Location:** `src/routes/api/maestro/download-phase/+server.ts`

### Problem
Word and PDF exports were showing raw markdown-wrapped JSON instead of parsed content:
```
Summary: ```json
{
  "summary": "The actual summary",
  "findings": ["Finding 1", "Finding 2"]
}
```

### Solution
Implemented the same multi-level parsing logic used in the client-side display.

### New Parsing Functions (lines 335-444)

**1. Strip Markdown Fences:**
```typescript
function stripMarkdownFences(text: string): string {
  if (typeof text !== 'string') return text;
  return text.replace(/^```(?:json|markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim();
}
```

**2. Deep Recursive Parser:**
```typescript
function deepParseMarkdownJson(value: any): any {
  // Base case: null or undefined
  if (value === null || value === undefined) return value;

  // If it's a string, check if it's markdown-wrapped JSON
  if (typeof value === 'string') {
    if (value.trim().startsWith('```')) {
      const stripped = stripMarkdownFences(value);
      try {
        const parsed = JSON.parse(stripped);
        // Recursively parse in case there's nested markdown
        return deepParseMarkdownJson(parsed);
      } catch {
        return value;
      }
    }
    return value;
  }

  // If it's an array, recursively parse each element
  if (Array.isArray(value)) {
    return value.map(item => deepParseMarkdownJson(item));
  }

  // If it's an object, recursively parse each property
  if (typeof value === 'object') {
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepParseMarkdownJson(val);
    }
    return result;
  }

  return value;
}
```

**3. Multi-Level Parser with Field Unwrapping:**
```typescript
function parseOutputs(outputs: any): {
  summary?: string;
  findings?: string[];
  recommendations?: string[];
  nested?: any;
} {
  // Level 1: Deep parse the entire structure
  let result = deepParseMarkdownJson(outputs);

  // Level 2: Explicitly check each field for markdown-wrapped JSON
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    for (const [key, val] of Object.entries(result)) {
      if (typeof val === 'string' && val.trim().startsWith('```')) {
        const stripped = stripMarkdownFences(val);
        try {
          const parsed = JSON.parse(stripped);
          result[key] = deepParseMarkdownJson(parsed);

          // Special unwrapping for summary field
          if (key === 'summary' && result[key].summary) {
            const nestedSummary = result[key].summary;
            const nestedFindings = result[key].findings;
            const nestedOutputs = result[key].outputs;
            const nestedRecommendations = result[key].recommendations;

            result.summary = nestedSummary;
            if (nestedFindings && !result.findings) result.findings = nestedFindings;
            if (nestedOutputs && !result.outputs) result.outputs = nestedOutputs;
            if (nestedRecommendations && !result.recommendations) result.recommendations = nestedRecommendations;
          }
        } catch (error) {
          result[key] = `⚠️ Incomplete/Truncated Content:\n\n${stripped}`;
        }
      }
    }
  }

  // Extract top-level fields
  const { summary, findings, recommendations, ...rest } = result;

  return {
    summary: typeof summary === 'string' ? summary : undefined,
    findings: Array.isArray(findings) ? findings : undefined,
    recommendations: Array.isArray(recommendations) ? recommendations : undefined,
    nested: Object.keys(rest).length > 0 ? rest : undefined
  };
}
```

### Result
**Before:**
```
Summary: ```json { "summary": "The actual summary", ... }
```

**After:**
```
Summary
The actual summary

Findings
• Finding 1
• Finding 2
```

Word and PDF exports now show clean, formatted content matching the on-screen display.

---

## Testing

### 1. Progress Bar/Timer
1. Navigate to Maestro Orchestrate tab
2. Start an adaptive orchestration
3. Verify timer starts at 0:00 and increments every second
4. Verify progress bar animates
5. Verify timer stops when execution completes

### 2. Token Handling
1. Configure maxTokens to 1000 in advanced settings
2. Run an orchestration that produces long output
3. When truncation occurs:
   - Verify dialog shows suggested increase (4000 tokens)
   - Try "Yes, retry this once" → verify retry uses 4000, then reverts to 1000
   - Try "Yes, don't ask again" → verify next truncation auto-retries without dialog
   - Verify sessionStorage persists preference

### 3. Document Formatting
1. Run an orchestration with markdown-wrapped JSON outputs
2. Download phase as Word (.docx)
3. Open in Microsoft Word → verify clean formatting
4. Download as PDF
5. Open PDF → verify clean formatting
6. Compare with on-screen display → verify they match

---

## Files Modified

1. `src/lib/components/MaestroOrchestrateTab.svelte`
   - Added progress timer state and functions
   - Enhanced token handling logic with detailed comments
   - Integrated timer into execution flow

2. `src/routes/api/maestro/download-phase/+server.ts`
   - Added `stripMarkdownFences()` function
   - Added `deepParseMarkdownJson()` recursive parser
   - Enhanced `parseOutputs()` with multi-level parsing
   - Added special unwrapping logic for nested structures

---

## Benefits

### 1. Progress Bar/Timer
- **Better UX:** Users see real-time feedback during execution
- **Time awareness:** Users know how long a step is taking
- **Professional appearance:** Matches modern application standards

### 2. Token Handling
- **Predictable behavior:** Always starts with user's setting
- **Smart retry:** Temporary increases only for failed attempts
- **User control:** Choice between one-time and persistent auto-retry
- **Cost awareness:** Shows estimated cost increase before retry

### 3. Document Formatting
- **Consistency:** Exports match on-screen display
- **Professional output:** Clean, formatted documents
- **No manual cleanup:** Users get ready-to-share documents
- **Handles edge cases:** Gracefully handles truncated/invalid JSON
