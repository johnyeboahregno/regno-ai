# Phase Output Formatter Refactoring

## Overview
Eliminated code duplication by creating a shared formatter component for parsing and formatting Maestro phase outputs. The same parsing logic is now used by both client-side display and server-side document generation.

## Problem
Previously, identical parsing logic was duplicated in two places:
1. **Client-side:** `src/lib/components/MaestroConsole.svelte` (lines 629-756)
2. **Server-side:** `src/routes/api/maestro/download-phase/+server.ts` (lines 335-444)

This duplication made maintenance difficult and increased the risk of inconsistencies between on-screen display and downloaded documents.

## Solution
Created a shared utility module with all parsing and formatting logic:

**New File:** `src/lib/utils/phaseOutputParser.ts`

### Exports

**Type:**
```typescript
export interface ParsedPhaseOutput {
  summary?: string;
  findings?: string[];
  recommendations?: string[];
  nested?: any;
  raw?: any;
}
```

**Core Functions:**
1. `stripMarkdownFences(text: string): string`
   - Removes markdown code fences (```json, etc.)

2. `deepParseMarkdownJson(value: any): any`
   - Recursively parses markdown-wrapped JSON at any nesting level

3. `parsePhaseOutputs(outputs: any): ParsedPhaseOutput`
   - Main entry point for parsing phase outputs
   - Performs two-level parsing with field unwrapping

**Helper Functions:**
4. `hasTopLevelFields(parsed: ParsedPhaseOutput): boolean`
   - Checks if output has standard fields (summary/findings/recommendations)

5. `formatValue(value: any): string`
   - Formats various data types for display

6. `getNestedContent(parsed: ParsedPhaseOutput): any | null`
   - Extracts nested content excluding top-level fields

7. `formatOutputAsMarkdown(obj: any, depth: number): string`
   - Formats nested objects as markdown

## Files Modified

### 1. New File: `src/lib/utils/phaseOutputParser.ts`
**Lines:** 1-218
**Purpose:** Shared utility with all parsing logic

**Key Features:**
- Works in both client and server environments
- Comprehensive JSDoc documentation
- Handles edge cases (truncated JSON, nested markdown, etc.)
- Type-safe with TypeScript interfaces

### 2. Updated: `src/lib/components/MaestroConsole.svelte`

**Import Statement (lines 11-17):**
```typescript
import {
  parsePhaseOutputs,
  hasTopLevelFields as checkHasTopLevelFields,
  getNestedContent,
  formatOutputAsMarkdown,
  formatValue
} from '$lib/utils/phaseOutputParser';
```

**Changes:**
- **Removed:** 127 lines of duplicate parsing code (lines 629-756)
- **Added:** Simple wrapper functions with console logging for debugging
- **Updated:** All usages to call shared utility

**Wrapper Functions (lines 636-663):**
```typescript
// Wrapper function that uses shared parser with console logging for debugging
function parseOutputsWithLogging(outputs: any): any {
  console.log('[Parse] 🔍 Starting parse, input type:', typeof outputs);
  const result = parsePhaseOutputs(outputs);
  console.log('[Parse] 🏁 Final result:', {
    hasSummary: !!result.summary,
    hasFindings: !!result.findings,
    hasRecommendations: !!result.recommendations,
    hasNested: !!result.nested
  });
  return result;
}

function hasTopLevelFields(outputs: any): { summary?: any; findings?: any[]; recommendations?: any[] } {
  if (!outputs || typeof outputs !== 'object') return {};
  const parsed = parseOutputsWithLogging(outputs);
  console.log('[hasTopLevelFields] Parsed result:', {
    summary_type: typeof parsed.summary,
    summary_isString: typeof parsed.summary === 'string',
    summary_preview: typeof parsed.summary === 'string' ? parsed.summary.substring(0, 100) : 'not a string'
  });
  return {
    summary: parsed.summary,
    findings: parsed.findings,
    recommendations: parsed.recommendations
  };
}

function getNestedContentLocal(outputs: any): any {
  if (!outputs || typeof outputs !== 'object') return null;
  const parsed = parsePhaseOutputs(outputs);
  return getNestedContent(parsed);
}
```

**Updated Usages:**
- `getNestedContent()` → `getNestedContentLocal()` (3 occurrences in templates)
- Internal calls now use imported shared functions

### 3. Updated: `src/routes/api/maestro/download-phase/+server.ts`

**Import Statement (lines 5-10):**
```typescript
import {
  parsePhaseOutputs,
  formatValue,
  formatOutputAsMarkdown,
  type ParsedPhaseOutput
} from '$lib/utils/phaseOutputParser';
```

**Changes:**
- **Removed:** 108 lines of duplicate parsing code (lines 335-444)
- **Replaced:** `parseOutputs()` calls with `parsePhaseOutputs()` (2 occurrences)

**Simplified Code (line 341):**
```typescript
// All parsing functions now imported from $lib/utils/phaseOutputParser
```

## Benefits

### 1. Single Source of Truth
- Parsing logic exists in ONE place
- Changes automatically apply to both client and server
- Eliminates risk of inconsistencies

### 2. Easier Maintenance
- Bug fixes only need to be made once
- Enhancements benefit all consumers
- Reduced code review burden

### 3. Better Testing
- Can test parsing logic independently
- Write unit tests for the shared module
- Easier to mock for component tests

### 4. Improved Code Quality
- Better documentation (comprehensive JSDoc)
- Type-safe interfaces
- Consistent error handling

### 5. Reduced Bundle Size
- Client-side code reduced by ~127 lines
- Server-side code reduced by ~108 lines
- Total reduction: ~235 lines of duplicate code

## Code Reduction Summary

**Before:**
- `MaestroConsole.svelte`: 2,400+ lines (including parsing)
- `download-phase/+server.ts`: 450+ lines (including parsing)
- **Total duplicate code:** ~235 lines

**After:**
- `phaseOutputParser.ts`: 218 lines (shared)
- `MaestroConsole.svelte`: Reduced by 127 lines
- `download-phase/+server.ts`: Reduced by 108 lines
- **Net reduction:** ~17 lines (235 - 218)

**More importantly:** Eliminated duplication risk and improved maintainability.

## Usage Example

### Client-Side (MaestroConsole.svelte)
```typescript
import { parsePhaseOutputs, getNestedContent } from '$lib/utils/phaseOutputParser';

// Parse phase outputs
const parsed = parsePhaseOutputs(phase.outputs);

// Use parsed fields
if (parsed.summary) {
  console.log('Summary:', parsed.summary);
}

if (parsed.findings) {
  parsed.findings.forEach(finding => console.log('Finding:', finding));
}

// Get nested content
const nested = getNestedContent(parsed);
if (nested) {
  console.log('Additional data:', nested);
}
```

### Server-Side (download-phase API)
```typescript
import { parsePhaseOutputs, formatValue } from '$lib/utils/phaseOutputParser';

// Parse phase outputs
const outputs = parsePhaseOutputs(phase.outputs);

// Generate Word document
if (outputs.summary) {
  children.push(new Paragraph({ text: outputs.summary }));
}

if (outputs.findings) {
  outputs.findings.forEach(finding => {
    children.push(new Paragraph({ text: finding, bullet: { level: 0 } }));
  });
}
```

## Testing

To verify the refactoring works correctly:

1. **Client-side display:**
   - Run an orchestration
   - View phase outputs in console
   - Verify formatting matches previous behavior
   - Check browser console for parsing logs

2. **Server-side documents:**
   - Download phases as JSON, Word, and PDF
   - Verify content matches on-screen display
   - Check that markdown unwrapping works correctly

3. **Edge cases:**
   - Test with truncated JSON responses
   - Test with multi-level markdown nesting
   - Test with missing fields
   - Test with invalid JSON

## Future Enhancements

The shared utility makes it easy to add new features:

1. **Additional Export Formats:**
   - Excel spreadsheets
   - HTML pages
   - Plain text with custom formatting

2. **Enhanced Parsing:**
   - Support for custom field types
   - Validation rules
   - Schema enforcement

3. **Performance Optimization:**
   - Memoization for repeated parsing
   - Lazy parsing for large outputs
   - Streaming support

4. **Better Error Handling:**
   - Detailed error messages
   - Recovery strategies
   - Fallback formats

## Migration Notes

**Breaking Changes:** None
- All existing functionality preserved
- API remains the same
- Backward compatible

**Internal Changes:**
- Function names remain consistent
- Return types unchanged
- Console logging maintained for debugging

## Conclusion

This refactoring successfully eliminates code duplication while improving maintainability and consistency. The shared formatter component provides a solid foundation for future enhancements to phase output parsing and formatting.
