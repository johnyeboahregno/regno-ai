# Intelligent Version History Component Guide

## Overview

The `VersionHistory.svelte` component is a powerful, reusable component that can track versions of ANY data type in your application. It provides automatic saving, visual timeline, diff viewing, and easy restoration.

## Features

- ✅ **Universal**: Works with strings, objects, arrays, JSON, etc.
- ✅ **Auto-Save**: Automatic version saving with configurable debouncing
- ✅ **Visual Timeline**: Beautiful UI showing all versions with timestamps
- ✅ **Diff Viewing**: Compare any two versions side-by-side
- ✅ **Easy Restore**: One-click restoration of any version
- ✅ **Source Tracking**: Tracks source (manual, auto, restored, initial, imported)
- ✅ **Persistence**: Optional localStorage integration
- ✅ **Metadata Support**: Attach custom metadata to versions
- ✅ **Smart**: Only saves unique versions (no duplicates)

## Basic Usage

```svelte
<script>
  import VersionHistory from '$lib/components/VersionHistory.svelte';

  let myData = $state('{}');
</script>

<VersionHistory
  bind:value={myData}
  storageKey="my-feature-versions"
  label="My Data History"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | any (bindable) | required | The value to track versions of |
| `storageKey` | string | undefined | LocalStorage key for persistence |
| `label` | string | "Version History" | Display label |
| `maxVersions` | number | 20 | Maximum versions to keep |
| `autoSave` | boolean | true | Enable automatic saving |
| `debounceMs` | number | 2000 | Debounce delay in milliseconds |
| `onRestore` | function | undefined | Callback when version is restored |
| `onChange` | function | undefined | Callback when value changes |
| `disabled` | boolean | false | Disable all interactions |

## Advanced Usage

### With Callbacks

```svelte
<VersionHistory
  bind:value={pipelineConfig}
  storageKey="pipeline-versions"
  label="Pipeline Versions"
  maxVersions={50}
  onRestore={(version) => {
    console.log('Restored version:', version);
    showNotification('Pipeline restored!');
  }}
  onChange={(newValue) => {
    console.log('Value changed:', newValue);
    triggerValidation(newValue);
  }}
/>
```

### Without Auto-Save

```svelte
<VersionHistory
  bind:value={config}
  autoSave={false}
  label="Manual Save Only"
/>

<button onclick={() => {
  // Manually save a version by updating the value
  config = {...config, updated: Date.now()};
}}>
  Save Version
</button>
```

### With Custom Metadata

The component automatically tracks:
- Timestamp
- Source (initial, manual, auto, restored, imported)
- Description

You can extend this by managing versions programmatically if needed.

## Use Cases

### 1. Pipeline Editor
```svelte
<VersionHistory
  bind:value={aggregationPipeline}
  storageKey="pipeline-{pipelineId}"
  label="Pipeline Versions"
/>
```

### 2. Configuration Editor
```svelte
<VersionHistory
  bind:value={appConfig}
  storageKey="app-config-versions"
  label="Configuration History"
  maxVersions={30}
/>
```

### 3. Code Editor
```svelte
<VersionHistory
  bind:value={code}
  storageKey="code-{fileId}"
  label="Code History"
  debounceMs={1000}
/>
```

### 4. Form State
```svelte
<VersionHistory
  bind:value={formData}
  storageKey="form-{formId}"
  label="Form History"
  maxVersions={10}
/>
```

### 5. JSON Schema Editor
```svelte
<VersionHistory
  bind:value={schema}
  storageKey="schema-versions"
  label="Schema History"
/>
```

## UI Features

### Version Timeline
- Shows all versions in reverse chronological order (latest first)
- Displays source badge (Initial, Manual, Auto, Restored, Imported)
- Shows "Latest" badge for the most recent version
- Shows "Active" badge for currently selected version
- Relative timestamps (e.g., "5m ago", "2h ago", "3d ago")

### Compare Mode
- Click "Compare" to enter comparison mode
- Select any version to compare against the active version
- Shows line-by-line diff with added/removed/changed counts
- Side-by-side diff view

### Actions
- **Restore**: One-click restoration of any version
- **Delete**: Remove unwanted versions (except active version)
- **Compare**: Select for side-by-side comparison

## Integration Examples

### With MongoDB Aggregation Pipeline

```svelte
<script>
  import VersionHistory from '$lib/components/VersionHistory.svelte';
  import RegnoJsonEditor from '$lib/components/RegnoJsonEditor.svelte';

  let pipeline = $state('[]');
</script>

<RegnoJsonEditor
  bind:value={pipeline}
  label="Pipeline Stages"
/>

<VersionHistory
  bind:value={pipeline}
  storageKey="pipeline-{nodeId}"
  label="Pipeline Version History"
  onRestore={(version) => {
    console.log('Restored pipeline:', version);
  }}
/>
```

### With LLM Prompt Management

```svelte
<script>
  import VersionHistory from '$lib/components/VersionHistory.svelte';

  let systemPrompt = $state('');
</script>

<textarea bind:value={systemPrompt}></textarea>

<VersionHistory
  bind:value={systemPrompt}
  storageKey="llm-prompts"
  label="Prompt History"
  debounceMs={1500}
/>
```

## Best Practices

1. **Use Unique Storage Keys**: Each feature should have its own storage key
   ```svelte
   storageKey="pipeline-{pipelineId}-{nodeId}"
   ```

2. **Set Appropriate Max Versions**: Balance between history and memory
   ```svelte
   maxVersions={20}  // Good for most use cases
   ```

3. **Adjust Debounce for Use Case**:
   - Fast typing: `debounceMs={2000}` (default)
   - Slow edits: `debounceMs={1000}`
   - Real-time: `debounceMs={500}`

4. **Use Callbacks for Integration**:
   ```svelte
   onRestore={(version) => {
     validateData(version);
     showSuccessMessage();
   }}
   ```

5. **Disable When Needed**:
   ```svelte
   disabled={isReadOnly || isLoading}
   ```

## LocalStorage Persistence

When `storageKey` is provided:
- Versions are automatically saved to localStorage
- Versions are loaded on mount
- Survives page refreshes
- Synchronized across component instances with same key

Format: `localStorage.setItem(storageKey, JSON.stringify(versions))`

## Performance Considerations

- Only last `maxVersions` are kept (default: 20)
- Debouncing prevents excessive saves (default: 2000ms)
- Duplicate versions are not saved (smart deduplication)
- Efficient diff calculation for compare mode

## Styling

The component uses Tailwind CSS classes and is fully responsive. All UI elements have hover states and smooth transitions.

### Colors:
- Blue: Active/selected version
- Green: Latest version, manual saves
- Purple: AI-optimized, comparing
- Gray: Initial version
- Orange: Imported

## Future Enhancements

Possible additions:
- Export versions to file
- Import versions from file
- Advanced diff view with line highlighting
- Branch/merge support for complex workflows
- Undo/redo stack integration
- Comments on versions
- Version tags/labels

## Support

For issues or feature requests, check the component source at:
`src/lib/components/VersionHistory.svelte`

## Example: Complete Integration

```svelte
<script lang="ts">
  import VersionHistory from '$lib/components/VersionHistory.svelte';
  import RegnoJsonEditor from '$lib/components/RegnoJsonEditor.svelte';
  import { toast } from '$lib/utils/toast';

  let pipelineConfig = $state({
    stages: [],
    options: {}
  });

  function handleRestore(version: any) {
    toast.success('Pipeline restored successfully!');
    // Trigger any side effects
    validatePipeline(pipelineConfig);
  }

  function handleChange(value: any) {
    // Auto-validate on change
    if (autoValidate) {
      validatePipeline(value);
    }
  }
</script>

<div class="pipeline-editor">
  <h2>Pipeline Configuration</h2>

  <RegnoJsonEditor
    bind:value={pipelineConfig}
    label="Pipeline Config"
    rows={15}
  />

  <VersionHistory
    bind:value={pipelineConfig}
    storageKey="pipeline-{$page.params.id}"
    label="Pipeline Version History"
    maxVersions={30}
    debounceMs={2000}
    onRestore={handleRestore}
    onChange={handleChange}
  />
</div>
```
