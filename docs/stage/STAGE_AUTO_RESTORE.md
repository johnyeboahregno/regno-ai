# STAGE Auto-Restore Functionality

## Overview
Implemented MongoDB-persisted auto-restore functionality for the STAGE page. When users refresh the page or return to STAGE, their last selected project and phase expansion states are automatically restored.

## Problem Solved
**Before:** After page refresh, users would:
- See the project list but no project selected
- Have to manually re-select their project
- Have to manually expand phases to see execution results (collection name, record count, data viewer)
- Lose track of which phases they were working on

**After:** On page refresh:
- Last selected project is automatically loaded
- Phase execution states (collection name, record count, data viewer) are immediately visible
- Previously expanded phases are automatically re-expanded
- User continues exactly where they left off

## Implementation

### 1. New API Endpoint: `/api/stage/preferences`

**File:** `/disks/disk1/chat/src/routes/api/stage/preferences/+server.ts`

**Storage Location:** User document in MongoDB `users` collection:
```typescript
{
  _id: userId,
  profile: {
    stagePreferences: {
      lastSelectedProjectId: "stage_project_abc123",
      expandedPhases: {
        "0": true,  // Phase 0 is expanded
        "1": true,  // Phase 1 is expanded
        "2": false  // Phase 2 is collapsed
      },
      updatedAt: 1700000000000
    }
  }
}
```

**Endpoints:**
- **GET** `/api/stage/preferences` - Load user's STAGE preferences
- **POST** `/api/stage/preferences` - Save user's STAGE preferences

### 2. Frontend Functions

**File:** `/disks/disk1/chat/src/routes/stage/+page.svelte`

#### `loadStagePreferences()`
- Fetches user's STAGE preferences from MongoDB
- Returns preferences object or null if not found

#### `saveStagePreferences(projectId)`
- Saves current project selection and expanded phases to MongoDB
- Collects which phases are currently expanded
- Persists to user's profile document

#### Modified `onMount()`
- Loads projects and credentials (existing behavior)
- **NEW:** Loads STAGE preferences from MongoDB
- **NEW:** Auto-selects last selected project (if it still exists)
- **NEW:** Auto-restores expanded phases

#### Modified `selectProject(projectId)`
- Selects project and loads state (existing behavior)
- **NEW:** Saves preference to MongoDB for auto-restore

#### Modified `togglePhase(phaseNum)`
- Toggles phase expansion (existing behavior)
- **NEW:** Saves preference to MongoDB

## User Experience

### Initial Project Selection
1. User selects a project
2. **Preference saved to MongoDB** with project ID
3. User expands Phase 0 to see data extraction results
4. **Preference updated** with `expandedPhases: { "0": true }`

### After Page Refresh
1. Page loads
2. **Preferences loaded from MongoDB**
3. **Project automatically selected**
4. **Phase states loaded from backend** (collection name, record count, etc.)
5. **Phase 0 automatically expanded** (as it was before refresh)
6. User sees their data extraction results immediately

### Toggling Phase Expansion
1. User clicks phase header to expand/collapse
2. **Preference immediately saved to MongoDB**
3. On next refresh, expansion state is restored

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Actions                                                │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├─> Select Project ──────────> saveStagePreferences()
                │                                      │
                ├─> Expand Phase ────────────> saveStagePreferences()
                │                                      │
                ├─> Collapse Phase ──────────> saveStagePreferences()
                │                                      │
                └─> Refresh Page ───────────> loadStagePreferences()
                                                       │
                                                       v
                                    ┌──────────────────────────────┐
                                    │  MongoDB users collection     │
                                    │  profile.stagePreferences     │
                                    └──────────────────────────────┘
```

## Technical Details

### Preference Persistence
- Stored in MongoDB `users` collection
- Nested under `profile.stagePreferences`
- Updated on every project selection and phase toggle
- Includes timestamp for tracking

### Validation
- Checks if last selected project still exists before auto-selecting
- Falls back to empty state if project was deleted
- Gracefully handles missing preferences (returns null)

### Performance
- Preferences loaded once on page mount
- Saves are non-blocking (async)
- Minimal overhead (~200 bytes per user)

### Error Handling
- Logs errors to console but doesn't block UI
- Falls back to manual selection if auto-restore fails
- Handles authentication errors (401)

## Files Modified

1. **`/disks/disk1/chat/src/routes/api/stage/preferences/+server.ts`** (NEW)
   - GET and POST endpoints for STAGE preferences

2. **`/disks/disk1/chat/src/routes/stage/+page.svelte`**
   - Lines 1208-1219: Added `loadStagePreferences()` function
   - Lines 1224-1245: Added `saveStagePreferences()` function
   - Lines 1247-1274: Modified `onMount()` to load and auto-restore
   - Lines 489-490: Modified `selectProject()` to save preferences
   - Lines 773-776: Modified `togglePhase()` to save preferences

## Testing Checklist

### Manual Testing:
1. ✅ **Build Success** - Compiles without errors
2. ⏳ **First Selection** - Select a project, verify preference saved
3. ⏳ **Page Refresh** - Refresh page, verify project auto-selected
4. ⏳ **Phase Expansion** - Expand phases, refresh, verify they stay expanded
5. ⏳ **Phase Collapse** - Collapse phases, refresh, verify they stay collapsed
6. ⏳ **Multiple Projects** - Switch between projects, verify last one is restored
7. ⏳ **Deleted Project** - Delete last selected project, verify graceful fallback
8. ⏳ **Multi-User** - Test with multiple users, verify preferences are isolated
9. ⏳ **No Auth** - Test without authentication, verify no errors

## Benefits

### User Experience:
- Seamless continuation after page refresh
- No need to remember which project you were working on
- Execution results remain visible without extra clicks
- Faster workflow, less friction

### Technical:
- MongoDB persistence (more reliable than localStorage)
- Cross-device/browser support (preferences follow the user)
- Minimal performance impact
- Easy to extend with additional preferences

## Future Enhancements

Potential additions:
- Remember scroll position within phases
- Save/restore data source configuration panel state
- Remember which record is displayed in RecordBrowser
- Add user preference to disable auto-restore
- Export/import STAGE workspace

## Related Features

This feature complements:
- Data source configuration persistence (STAGE_DATA_SOURCE_PERSISTENCE.md)
- Phase execution state persistence (`staged_project_states` collection)
- LLM credential handling and tier conflict resolution

---

**Date:** November 19, 2025
**Feature:** Auto-Restore Last Selected Project and Phase States
**Storage:** MongoDB `users.profile.stagePreferences`
**Status:** ✅ **Implementation Complete** | ⏳ **User Testing Pending**
