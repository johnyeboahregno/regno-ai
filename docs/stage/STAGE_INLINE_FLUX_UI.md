# STAGE + FLUX Inline Integration - Visual Guide

## What Changed

**Before (Modal):**
```
┌─────────────────────────────────────────┐
│ STAGE Phase Container                   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Phase 2: Data Extraction        │   │
│ │ Status: Needs Credential        │   │
│ │                                 │   │
│ │ [Configure Data Source]         │ ◄─── Click opens modal
│ └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

         ↓ Modal Opens ↓

┌───────────────────────────────────────────┐
│ 🗖  FLUX Data Source Modal (Overlay)     │
│ ┌───────────────────────────────────┐   │
│ │  Select Credential: [dropdown]    │   │
│ │  Collection: [text input]         │   │
│ │  Aggregation Pipeline: [editor]   │   │
│ │  [Test Connection] [AI Assistant] │   │
│ └───────────────────────────────────┘   │
│         [Cancel] [Confirm]               │
└───────────────────────────────────────────┘
```

**After (Inline):**
```
┌─────────────────────────────────────────────────────────┐
│ STAGE Phase Container                                   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Phase 2: Data Extraction                        │   │
│ │ Status: Needs Credential                        │   │
│ │                                                 │   │
│ │ ┌─────────────────────────────────────────┐   │   │
│ │ │ 🗃️  Configure Data Source (FLUX)        │   │   │
│ │ │                                         │   │   │
│ │ │  Select Credential: [dropdown]          │   │   │
│ │ │  Collection: [text input]               │   │   │
│ │ │  Aggregation Pipeline: [JSON editor]    │   │   │
│ │ │  [Test Connection] [AI Assistant]       │   │   │
│ │ │                                         │   │   │
│ │ │      [Cancel] [Confirm & Execute]       │   │   │
│ │ └─────────────────────────────────────────┘   │   │
│ │                                                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Benefits of Inline Rendering

### User Experience
- ✅ **No Context Switch:** User stays on same page
- ✅ **Better Flow:** Configuration feels part of phase execution
- ✅ **Visual Integration:** Matches STAGE design language
- ✅ **Less Disruptive:** No modal overlay blocking content
- ✅ **Scrollable:** Can see other phases while configuring

### Technical
- ✅ **Simpler State Management:** No modal show/hide state
- ✅ **Direct Component Reuse:** No wrapper component needed
- ✅ **Better Performance:** No modal rendering overhead
- ✅ **Easier Debugging:** Component tree is simpler

## Implementation Details

### HTML Structure

```html
<!-- Phase Container -->
<div class="phase-container">
  <!-- Phase Header -->
  <div class="phase-header">
    Phase 2: Data Extraction
  </div>

  <!-- Error Display (if any) -->
  {#if error}
    <div class="error-display">...</div>
  {/if}

  <!-- FLUX Data Source Config (Inline) -->
  {#if needsUserConfirmation}
    <div class="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <!-- Header -->
      <div class="mb-4">
        <h4>Configure Data Source (FLUX)</h4>
        <p>Full data-source configuration...</p>
      </div>

      <!-- FLUX Component (Direct) -->
      <DataSourceConfigSection
        editedConfig={...}
        supportedTypes={...}
        isTestingConnection={...}
        connectionPings={...}
        ...
      />

      <!-- Actions -->
      <div class="mt-4 flex gap-2">
        <button>Cancel</button>
        <button>Confirm & Execute</button>
      </div>
    </div>
  {/if}

  <!-- Phase Details (after execution) -->
  {#if expanded}
    <div class="phase-details">...</div>
  {/if}
</div>
```

### CSS Styling

```css
/* Container for FLUX UI */
.flux-config-container {
  margin-top: 1rem;
  background-color: rgba(31, 41, 55, 0.5); /* gray-800/50 */
  border: 1px solid rgb(55, 65, 81); /* gray-700 */
  border-radius: 0.5rem;
  padding: 1.5rem;
}

/* Visual separation from phase content */
.flux-config-container::before {
  content: "";
  display: block;
  /* Provides visual hierarchy */
}
```

## User Interaction Flow

```
1. Phase needs credential
   ↓
2. FLUX UI expands inline
   ↓
3. User configures:
   - Select credential
   - Choose collection
   - Edit aggregation pipeline (optional)
   - Test connection (optional)
   - Use AI Pipeline Assistant (optional)
   ↓
4. User clicks "Confirm & Execute"
   ↓
5. Configuration saved to backend
   ↓
6. Phase re-executes with configuration
   ↓
7. FLUX UI collapses (hidden)
   ↓
8. Results display in RecordBrowser
```

## Code Comparison

### Modal Approach (Old)
```svelte
<!-- Separate modal component -->
<DataSourceConfigModal
  show={true}
  phaseNum={phase.num}
  phaseName={phase.name}
  onConfirm={(config) => handleDataSourceConfig(phase.num, config)}
  onCancel={() => {...}}
/>
```

**Issues:**
- Requires wrapper component (DataSourceConfigModal.svelte)
- Modal state management (show/hide)
- Overlay covers entire page
- Feels separate from workflow

### Inline Approach (New)
```svelte
<!-- Direct component usage -->
<div class="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
  <DataSourceConfigSection
    editedConfig={dataSourceConfig[phase.num]}
    supportedTypes={supportedTypes}
    isTestingConnection={isTestingConnection[phase.num]}
    connectionPings={connectionPings[phase.num]}
    credentialStatus={credentialStatus[phase.num]}
    sampleData={sampleData[phase.num]}
    onTestMongoConnection={() => handleTestMongoConnection(phase.num)}
    onTestPostgresConnection={() => handleTestPostgresConnection(phase.num)}
    onCredentialEdit={handleCredentialEdit}
    onCredentialDelete={handleCredentialDelete}
    onCollectionChange={(value) => handleCollectionChange(phase.num, value)}
    onTableChange={(value) => handleTableChange(phase.num, value)}
    getStatusIndicator={getStatusIndicator}
    onOpenCredentials={() => window.open('/pipelines#credentials', '_blank')}
    onAutoSave={(config) => handleAutoSave(phase.num, config)}
  />

  <div class="mt-4 flex gap-2">
    <button>Cancel</button>
    <button onclick={() => handleDataSourceConfig(phase.num, config)}>
      Confirm & Execute
    </button>
  </div>
</div>
```

**Benefits:**
- No wrapper component needed
- No modal state
- Integrated with phase flow
- FLUX component used directly

## Testing Scenarios

### Visual Testing
1. ✅ Verify FLUX UI appears within phase container
2. ✅ Verify gray background and border styling
3. ✅ Verify header "Configure Data Source (FLUX)" displays
4. ✅ Verify Confirm & Cancel buttons at bottom
5. ✅ Verify UI collapses after confirmation

### Functional Testing
1. ✅ Select MongoDB credential
2. ✅ Enter collection name
3. ✅ Test connection (should show pings)
4. ✅ Edit aggregation pipeline (JSON editor)
5. ✅ Use AI Pipeline Assistant
6. ✅ Click "Confirm & Execute"
7. ✅ Verify phase re-executes
8. ✅ Verify results display

### Integration Testing
1. ✅ Multiple phases with different configs
2. ✅ Re-run phase with cached config
3. ✅ Change credential button works
4. ✅ Cancel doesn't break state
5. ✅ Invalid config shows error toast

## Summary

**Inline rendering provides:**
- 🎯 Better UX - seamless integration
- 🔧 Simpler implementation - no wrapper
- 🚀 Better performance - no modal overhead
- 🎨 Consistent design - matches STAGE theme
- ✅ All FLUX features - nothing lost

**User requirement fulfilled:**
> "ok -> but render inline not in modal"

✅ **Complete!**
