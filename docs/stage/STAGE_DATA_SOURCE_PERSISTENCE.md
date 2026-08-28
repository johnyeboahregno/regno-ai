# STAGE Data Source Configuration Persistence

## Overview
Implemented persistent display of data source configurations in STAGE after the user confirms and executes. Previously, the entire configuration panel would disappear after clicking "Confirm & Execute", leaving no history of what was configured.

## User Request
> "data extraction step - once i have chosen collection and press execute - the data source panel disppears and no history of it's use - understand we dont need it front and center but keep it around - maybe uneditable - click to edit or callapsible ?"

## Implementation

### 1. State Management
Added two new state variables to track confirmed configurations:

```typescript
let configuredDataSources = $state<Record<number, any>>({}); // Track confirmed configurations
let expandedDataSourceConfig = $state<Record<number, boolean>>({}); // Track collapsed/expanded state
```

### 2. Save Configuration on Confirmation
Modified `handleDataSourceConfig()` function to save the configuration when user clicks "Confirm & Execute":

```typescript
if (result.success) {
  toastManager.success(`Data source configured: ${config.sourceType} → ${config.collectionName}`);

  // Save confirmed configuration for display history
  configuredDataSources[phaseNum] = {
    ...config,
    confirmedAt: Date.now()
  };
  expandedDataSourceConfig[phaseNum] = false; // Collapse after confirmation

  // Re-execute the phase with validated configuration
  await executePhase(phaseNum);
}
```

### 2.5. Edit Data Source Configuration
Added new `editDataSourceConfig()` function to handle the "Edit & Re-run" button:

```typescript
async function editDataSourceConfig(phaseNum: number) {
  if (!selectedProjectId) return;

  try {
    // Remove the saved configuration to show the panel again
    delete configuredDataSources[phaseNum];

    // Reset the phase to pending state to show data source panel
    phaseStates[phaseNum] = {
      ...phaseStates[phaseNum],
      status: 'pending'
    };

    toastManager.info('Data source configuration cleared. Please reconfigure.');

    // Re-execute to trigger data source configuration panel
    await executePhase(phaseNum);
  } catch (err: any) {
    console.error('Failed to clear data source config:', err);
    toastManager.error('Failed to clear configuration');
  }
}
```

### 3. Readonly Configuration Display
Added new UI section (lines 1822-1911 in `/routes/stage/+page.svelte`) that shows:

- **Collapsible Header**: Shows source type and collection/table name with "✓ Confirmed" badge
- **Expandable Details**: Grid layout showing all configuration parameters:
  - Source Type (MONGODB, POSTGRES, etc.)
  - Collection/Table name
  - Database name (if applicable)
  - Limit
  - Aggregation status
  - Run mode
  - Aggregation pipeline (with syntax highlighting)
- **Timestamp**: Shows when configuration was confirmed
- **Edit Button**: "Edit & Re-run" button that calls `clearCredentialAndRerun()` to reconfigure

### 4. Visual Design
- Color-coded information display (blue for headers, green for collection names, purple for database, etc.)
- Starts collapsed to save screen space
- Clean visual hierarchy with proper spacing and borders
- Consistent with existing STAGE UI design patterns

## Visual Layout

The readonly configuration display appears after data source confirmation:

```
┌─────────────────────────────────────────────────────────────────┐
│  🗄️  Data Source Configuration               ✓ Confirmed  ▼    │  ← Collapsed (default)
│      MONGODB → paramsamplesDoc                                   │
└─────────────────────────────────────────────────────────────────┘

When expanded (click header):

┌─────────────────────────────────────────────────────────────────┐
│  🗄️  Data Source Configuration               ✓ Confirmed  ▼    │  ← Header (clickable)
├─────────────────────────────────────────────────────────────────┤
│  Source Type: MONGODB          Collection: paramsamplesDoc      │
│  Database: regno_db            Limit: 100                       │
│  Aggregation: Enabled          Run Mode: development            │
│                                                                  │
│  Aggregation Pipeline:                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [{ $match: { status: "active" } }]                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Confirmed 4:32:15 PM                     ✏️ Edit & Re-run     │
└─────────────────────────────────────────────────────────────────┘
```

**Color Scheme:**
- Header background: `bg-blue-900/10` with `border-blue-700/30`
- Source type: `text-blue-300`
- Collection/Table: `text-green-300`
- Database: `text-purple-300`
- Limit: `text-cyan-300`
- Aggregation status: `text-yellow-300`
- Confirmed badge: `text-green-400`
- Edit button: `bg-blue-600 hover:bg-blue-700`

## Testing Checklist

### Manual Testing Steps:
1. ✅ **Build Success**: Build completes without errors
2. ⏳ **Configuration Saving**: After clicking "Confirm & Execute", verify configuration is saved to `configuredDataSources`
3. ⏳ **Display Appears**: Readonly summary appears after phase execution completes
4. ⏳ **Collapse/Expand**: Click header to toggle between collapsed and expanded states
5. ⏳ **Data Accuracy**: All configuration details display correctly in readonly view
6. ⏳ **Edit Button**: "Edit & Re-run" button properly triggers reconfiguration
7. ⏳ **Timestamp**: Confirmation timestamp displays correctly
8. ⏳ **Multiple Phases**: Each phase maintains its own configuration history
9. ⏳ **Aggregation Pipeline**: If configured, aggregation pipeline displays in code block
10. ⏳ **Visual Polish**: Colors, spacing, and layout match design

## Files Modified

### `/disks/disk1/chat/src/routes/stage/+page.svelte`
- **Lines 153-154**: Added state variables (`configuredDataSources`, `expandedDataSourceConfig`)
- **Lines 738-759**: Added new `editDataSourceConfig()` function
- **Lines 942-947**: Modified `handleDataSourceConfig()` to save configuration
- **Lines 1822-1937**: Added readonly configuration display UI
- **Line 1928**: Connected "Edit & Re-run" button to `editDataSourceConfig()`

## Features

### User Benefits:
1. **Visibility**: Can see what was configured even after execution starts
2. **History**: Maintains record of data source settings per phase
3. **Space Efficient**: Collapsed by default to avoid cluttering the UI
4. **Editable**: Can easily reconfigure by clicking "Edit & Re-run"
5. **Informative**: Shows all relevant configuration details at a glance

### Technical Benefits:
1. **No Breaking Changes**: Existing functionality remains unchanged
2. **Per-Phase Tracking**: Each phase maintains its own configuration state
3. **Reactive**: Uses Svelte 5 runes for proper reactivity
4. **Extensible**: Easy to add more configuration details in the future

## Related Work

This feature complements the recent LLM credential handling improvements:
- Runtime error detection for "No endpoints found"
- Tier conflict modal with AI-powered recommendations
- Validation of LLM credentials before execution

## Next Steps

1. **User Testing**: Have users test the feature with various data source types (MongoDB, Postgres)
2. **Edge Cases**: Test with complex aggregation pipelines, multiple reconfigurations
3. **Mobile Responsive**: Verify layout works well on smaller screens (if applicable)
4. **Performance**: Monitor impact on page performance with many phases

## Status

✅ **Implementation Complete**
✅ **Build Successful**
⏳ **User Testing Pending**

---

**Date**: November 19, 2025
**Feature**: Data Source Configuration Persistence
**Context**: STAGE (AI-Powered Staging System)
