# Svelte 5 `{@const}` Syntax Fix

## Error
```
src/lib/components/node-displays/D3ChartDisplay.svelte:3857:7
`{@const}` must be the immediate child of `{#snippet}`, `{#if}`, `{:else if}`, `{:else}`, `{#each}`, `{:then}`, `{:catch}`, `<svelte:fragment>`, `<svelte:boundary` or `<Component>`
```

## Problem
In Svelte 5, the `{@const}` directive must be a **direct child** of certain block elements. It cannot be nested inside regular HTML elements like `<div>`.

### Invalid Placement (Lines 3857, 3880):
```svelte
{#if someCondition}
    <div class="container">
        {@const config = ...}  ❌ WRONG - nested inside <div>
        <h1>{config.title}</h1>
    </div>
{/if}
```

## Solution
Move `{@const}` declarations to be **immediate children** of `{#if}` blocks.

### Fix 1: Chart Header (Line 3851)
**Before:**
```svelte
{#if (activeChartState?.config || activeChartState)?.chartType}
    <div class="flex items-center justify-between...">
        <div class="flex items-center gap-3">
            <TrendingUp class="text-purple-600" size={24} />
            <div class="flex items-center gap-2">
                <div>
                    <div class="flex items-center gap-2">
                        {@const config = activeChartState?.config || activeChartState}  ❌
                        <h3>{config?.chartType?.charAt(0).toUpperCase()...}</h3>
```

**After:**
```svelte
{#if (activeChartState?.config || activeChartState)?.chartType}
    {@const config = activeChartState?.config || activeChartState}  ✅
    <div class="flex items-center justify-between...">
        <div class="flex items-center gap-3">
            <TrendingUp class="text-purple-600" size={24} />
            <div class="flex items-center gap-2">
                <div>
                    <div class="flex items-center gap-2">
                        <h3>{config?.chartType?.charAt(0).toUpperCase()...}</h3>
```

### Fix 2: Zoom/Pan Controls (Line 3878)
**Before:**
```svelte
{#if chartContainer}
    <div class="flex gap-2">
        <!-- Zoom/Pan Controls -->
        {@const config = activeChartState?.config || activeChartState}  ❌
        {#if config?.interactivity?.zoomEnabled || config?.interactivity?.panEnabled}
```

**After:**
```svelte
{#if chartContainer}
    {@const config = activeChartState?.config || activeChartState}  ✅
    <div class="flex gap-2">
        <!-- Zoom/Pan Controls -->
        {#if config?.interactivity?.zoomEnabled || config?.interactivity?.panEnabled}
```

## Key Rules for `{@const}` Placement

The `{@const}` directive must be an **immediate child** of:
- `{#if}` / `{:else if}` / `{:else}` blocks
- `{#each}` blocks
- `{#snippet}` blocks
- `{:then}` / `{:catch}` blocks (promises)
- `<svelte:fragment>` elements
- `<svelte:boundary>` elements
- Component instances

❌ **WRONG - inside HTML element:**
```svelte
{#if condition}
    <div>
        {@const x = something}
    </div>
{/if}
```

✅ **CORRECT - immediate child of block:**
```svelte
{#if condition}
    {@const x = something}
    <div>
        {x}
    </div>
{/if}
```

## Files Modified
- `/disks/disk1/chat/src/lib/components/node-displays/D3ChartDisplay.svelte`
  - Line 3851: Moved `{@const}` to be immediate child of `{#if}` block
  - Line 3878: Moved `{@const}` to be immediate child of `{#if}` block

## Verification
```bash
grep -n "{@const" src/lib/components/node-displays/D3ChartDisplay.svelte
```

Output shows both declarations are now correctly placed:
```
3851:		{@const config = activeChartState?.config || activeChartState}
3878:				{@const config = activeChartState?.config || activeChartState}
```

Both are immediate children of `{#if}` blocks (lines 3850 and 3877 respectively).

---

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-29
