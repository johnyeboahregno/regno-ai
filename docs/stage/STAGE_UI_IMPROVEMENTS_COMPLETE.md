# /stage UI Improvements - Complete

**Date**: November 21, 2025
**Session Summary**: Enhanced orchestration display, project filtering, and sidebar UX

---

## 🎯 Completed Improvements

### 1. ✅ Orchestration Collapse Functionality

**Problem**: Orchestration phases always shown, cluttering the UI even after successful completion.

**Solution**:
- Added collapsible orchestration section with clickable header
- Auto-collapses when all 7 MAESTRO phases succeed
- Stays expanded if any phase fails (to highlight errors)
- Visual indicators: ▶/▼ arrow, colored border (red=failed, green=success)
- Click header to toggle collapse/expand

**Files Modified**:
- `/src/routes/stage/+page.svelte` (lines 166-177, 2221-2264, 2267, 2587)

**Key Code**:
```typescript
// State
let orchestrationCollapsed = $state(false);

// Derived states
let orchestrationHasFailures = $derived(
  generationProgress.phases.some(p => p.status === 'failed' || p.status === 'error')
);

let orchestrationSucceeded = $derived(
  generationProgress.phases.length === 7 &&
  generationProgress.phases.every(p => p.status === 'completed' || p.status === 'success')
);

// Auto-collapse on load if all succeeded
if (allSucceeded) {
  orchestrationCollapsed = true;
} else {
  orchestrationCollapsed = false;
}

// Clickable header
<button onclick={() => orchestrationCollapsed = !orchestrationCollapsed}>
  {orchestrationCollapsed ? '▶' : '▼'}
  {#if orchestrationHasFailures}
    ❌ MAESTRO Failed
  {:else}
    ✅ MAESTRO Complete
  {/if}
</button>

// Wrap panels in conditional
{#if !orchestrationCollapsed}
  <!-- Phase panels here -->
{/if}
```

---

### 2. ✅ Formatted Original Request Display

**Problem**: User's original request text displayed with raw markdown syntax:
```
**Project Type:** Data Analysis & Insights
**Available Resources:** ...
```

**Solution**:
- Imported `marked` library for markdown parsing
- Convert `originalGoal` to HTML with `marked()`
- Display with `{@html}` and Tailwind prose classes
- Applied to both:
  - Regeneration failure prompt (line 2622)
  - Runtime project display (line 2755)

**Files Modified**:
- `/src/routes/stage/+page.svelte` (line 20, 2595, 2622, 2755)

**Key Code**:
```typescript
import { marked } from 'marked';

{@const originalGoal = selectedProject?.goal || selectedProject?.description}
{@const originalGoalHtml = originalGoal ? marked(originalGoal) : ''}

<!-- Display with formatting -->
<div class="text-gray-200 text-sm prose prose-invert prose-sm max-w-none">
  {@html originalGoalHtml}
</div>
```

**Result**:
- Bold text renders as bold
- Lists render properly
- Clean professional display

---

### 3. ✅ Filtered Recovery Script for /stage Projects Only

**Problem**: Recovery script `recover-all-orchestrations.cjs` recovered ALL MAESTRO executions, including:
- 13 regular pipeline executions (`maestro-exec-*`) for "MongoDB ParamSamplesDoc Analysis"
- 3 phase executions from staged projects (`stage_generated_*_phase0_*`)
- These were NOT /stage generations and shouldn't appear as staged projects

**Root Cause**: All MAESTRO executions were treated equally. Only executions with `project-gen-` prefix are actual /stage generations.

**Solution**:

#### Created Cleanup Script:
**File**: `/cleanup-non-stage-projects.cjs`
```javascript
// Only keep projects where maestroExecutionId starts with 'project-gen-'
if (execId && execId.startsWith('project-gen-')) {
  kept++;
} else {
  // Delete project, pipeline, events, state
  removed++;
}
```

**Result**: Removed 16 non-stage orchestrations, kept 77 valid /stage projects

#### Updated Recovery Script:
**File**: `/recover-all-orchestrations.cjs` (lines 12-23)
```javascript
// Find all completed MAESTRO events that are /stage generations
// Only recover executionIds starting with 'project-gen-'
const completedEvents = await db.collection('maestro_events')
  .find({
    type: 'maestro_completed',
    executionId: /^project-gen-/  // ← FILTER HERE
  })
  .sort({ timestamp: -1 })
  .toArray();
```

**Identification Pattern**:
- `/stage` generations: `project-gen-1763723657629`
- Regular pipeline MAESTRO: `maestro-exec-1762713135225`
- Phase executions: `stage_generated_1763587024292_phase0_1763587143160`

---

### 4. ✅ Sidebar Project Counter + Date Chips

**Problem**: Projects in sidebar had no visual ordering or quick date reference.

**Solution**:
- Added index counter chip: `#1`, `#2`, `#3`, etc.
- Added formatted date chip: `Nov 21, 2025`
- Placed at top-left corner of each project card
- Removed duplicate date at bottom (now only shows status badge)

**Files Modified**:
- `/src/routes/stage/+page.svelte` (lines 2102, 2112-2120, 2176)

**Key Code**:
```svelte
{#each stagedProjects as project, index}
  <div>
    <!-- Counter + Date Chip (Top Left Corner) -->
    <div class="flex items-center gap-2 mb-2">
      <span class="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded text-xs font-mono">
        #{index + 1}
      </span>
      <span class="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded text-xs">
        {new Date(project.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })}
      </span>
    </div>

    <!-- Project name, etc -->
  </div>
{/each}
```

**Visual Result**:
```
┌─────────────────────────────────────┐
│ #1  Nov 21, 2025                    │
│                                     │
│ Customer Segmentation Analysis      │
│ 🧠 MAESTRO  ⚡ FLUX                  │
│                           draft     │
└─────────────────────────────────────┘
```

---

## 📊 Database Cleanup Results

**Before Cleanup**:
- Total staged projects: 93
- All recovered from MAESTRO events (including non-stage)

**After Cleanup**:
- Valid /stage projects: 77
- Removed non-stage: 16
  - 13 × "MongoDB ParamSamplesDoc Analysis" (regular pipeline executions)
  - 3 × "FLUX Data Retrieval" phase executions

**Removed Projects Were**:
- Regular pipeline MAESTRO executions (`maestro-exec-*`)
- Phase-level MAESTRO executions (`stage_generated_*_phase0_*`)
- NOT initiated from /stage interface

---

## 🎨 UX Improvements Summary

| Improvement | Before | After |
|-------------|--------|-------|
| **Orchestration Display** | Always visible (7 large panels) | Auto-collapses if successful |
| **Failed Orchestrations** | Mixed with successful | Stays expanded, red border, highlighted |
| **Original Request** | Raw markdown syntax | Formatted with bold, lists, proper layout |
| **Project List** | No ordering indicator | Counter chips (#1, #2, #3) |
| **Date Display** | Bottom only, full format | Top chip, compact format (Nov 21, 2025) |
| **Project Count** | 93 (mixed types) | 77 (only /stage generations) |

---

## 🔧 Technical Details

### Orchestration Auto-Collapse Logic

```typescript
// Check if all 7 phases completed successfully
const allSucceeded = selectedProject.orchestrationPhases.every(
  (p: any) => p.status === 'success'
);

// Auto-collapse if successful
if (allSucceeded) {
  orchestrationCollapsed = true;
  console.log('[STAGE] ✅ Auto-collapsed orchestration (all phases succeeded)');
} else {
  orchestrationCollapsed = false;
  console.log('[STAGE] ⚠️ Keeping orchestration expanded (has failures)');
}
```

### Markdown Formatting Setup

```typescript
// Import marked library (already in package.json)
import { marked } from 'marked';

// Parse markdown to HTML
{@const originalGoalHtml = originalGoal ? marked(originalGoal) : ''}

// Render with Tailwind typography
<div class="prose prose-invert prose-sm max-w-none">
  {@html originalGoalHtml}
</div>
```

### Project Type Identification

```javascript
// /stage generation
executionId: 'project-gen-1763723657629'
→ Created by /stage interface via ProjectGenerator.ts

// Regular pipeline MAESTRO
executionId: 'maestro-exec-1762713135225'
→ Orchestration of existing pipeline from /pipelines

// Phase execution
executionId: 'stage_generated_1763587024292_phase0_1763587143160'
→ Sub-execution of a staged project phase
```

---

## 📝 Scripts Created/Updated

### New Scripts:
1. **`cleanup-non-stage-projects.cjs`**
   - Removes staged projects with non-`project-gen-` executionIds
   - Cascade deletes pipelines, events, states
   - Result: Cleaned 16 non-stage projects

### Updated Scripts:
1. **`recover-all-orchestrations.cjs`**
   - Added filter: `executionId: /^project-gen-/`
   - Now only recovers actual /stage generations
   - Prevents future pollution

---

## ✅ Build Status

**Build Result**: ✓ Successful
**Build Time**: 1m 7s
**Errors**: 0
**Warnings**: Pre-existing (unused imports, CSS syntax)

---

## 🎯 Next Steps (Not Implemented Yet)

From user's earlier request, still pending:

1. **Re-run Failed Phase Button**
   - Add button next to failed orchestration phases
   - Allow user to retry just that phase
   - Requires new API endpoint: `/api/stage/projects/[id]/retry-phase`

2. **Translucent Runtime Phases Display**
   - When orchestration complete but runtime phases not ready
   - Show phases at 10% opacity or shrunk
   - CSS: `opacity: 0.1` or `transform: scale(0.1)`
   - Visual indicator: "Not Ready Yet"

3. **Phase Re-run Logic**
   - Detect which phase failed
   - Preserve previous phase outputs
   - Re-execute from failed phase forward
   - Update orchestration history

---

## 📚 Related Documentation

- **MAESTRO Architecture**: `docs/MAESTRO_NODE_ARCHITECTURE.md`
- **Stage Architecture**: `docs/STAGE_MAESTRO_ARCHITECTURE.md`
- **Orchestration Phases**: `docs/ORCHESTRATION_FEATURES_COMPLETE.md`
- **Project Generation**: `src/lib/server/stage/ProjectGenerator.ts`

---

## 🔍 Key Files Modified

1. `/src/routes/stage/+page.svelte`
   - Added orchestration collapse (lines 166-177, 2221-2267, 2587)
   - Added markdown formatting (lines 20, 2595, 2622, 2755)
   - Added sidebar counter + date chips (lines 2102, 2112-2120, 2176)

2. `/recover-all-orchestrations.cjs`
   - Added executionId filter (lines 12-23)

3. `/cleanup-non-stage-projects.cjs`
   - New script for database cleanup

---

## 💡 Lessons Learned

1. **MAESTRO Execution Types**: Not all MAESTRO executions are /stage generations. Need to filter by `executionId` prefix.

2. **Auto-Collapse UX**: Successful multi-phase processes should auto-collapse to reduce cognitive load. Failed processes should stay expanded for debugging.

3. **Markdown in Data**: User input often contains markdown. Should parse and display formatted, not raw.

4. **Visual Ordering**: Numbered counters provide quick visual reference in lists, especially for chronological data.

5. **Database Recovery**: When recovering from events, validate the context (was this a /stage generation? a pipeline run? a phase execution?).

---

**Session Complete** ✅
