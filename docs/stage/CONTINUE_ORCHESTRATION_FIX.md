# Continue Orchestration Fix

## Problem
When user adds data source, it calls `/regenerate-from-phase` which:
- Regenerates phases 2-7 statically
- Sets status to 'draft' (not 'generating')
- Does NOT continue the live SSE streaming orchestration

## Solution
Use `/api/stage/generate-project-stream` with the existing projectId to continue the streaming orchestration.

##Files to Update

### 1. `/disks/disk1/chat/src/routes/stage/+page.svelte`

In `handleInlineDataSourceSubmit()` function (around line 1192-1207), replace the regenerate call with SSE streaming:

```typescript
// OLD (doesn't continue orchestration):
const regenResponse = await fetch(`/api/stage/projects/${originalProjectId}/regenerate-from-phase`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromPhase: 2,
    dataSourceConfig
  })
});

// NEW (continues SSE streaming orchestration):
// Update project status
await fetch(`/api/stage/projects/${originalProjectId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'generating',
    pauseForDataSource: false,
    error: null
  })
});

// Clear inline UI before starting stream
showInlineDataSourceSelector = false;
inlineEditPhase = null;

// Reset generation state for streaming
generationInProgress = true;
generationProgress.phases = selectedProject.orchestrationPhases?.map((p: any, idx: number) => ({
  num: idx + 1,
  name: p.name,
  status: p.status === 'success' ? 'completed' : 'pending',
  progress: p.status === 'success' ? 100 : 0,
  startTime: null,
  duration: p.duration,
  events: [],
  llmCalls: [],
  outputs: p.outputs || {}
})) || [];

// Continue orchestration via SSE stream with existing projectId
const enhancedContext = JSON.stringify({
  dataSourceConfig,
  resumeFromPhase: 2
});

const eventSource = new EventSource(
  `/api/stage/generate-project-stream?goal=${encodeURIComponent(selectedProject.goal || selectedProject.description)}&projectId=${originalProjectId}&context=${encodeURIComponent(enhancedContext)}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleStreamEvent(data);
};

eventSource.onerror = (error) => {
  console.error('[STAGE] SSE error:', error);
  eventSource.close();
  regeneratingPhases = false;
  toastManager.error('Stream connection failed');
};

// No need to reload - SSE will update UI in real-time
regeneratingPhases = false;
regenerationProgress = '';
toastManager.success('Continuing orchestration...');
```

### 2. Show/Edit Data Source

Add a "Review Data Source" section BEFORE the data source selector that shows current selection and allows editing:

```svelte
<!-- Current Data Source (if exists) -->
{#if phase.outputs?.dataSourceConfig}
  {@const ds = phase.outputs.dataSourceConfig}
  <div class="mt-4 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-semibold text-green-300">✓ Data Source Configured</h4>
      <button
        onclick={() => {
          showInlineDataSourceSelector = true;
          inlineEditPhase = phase.num;
          // Pre-populate form
          selectedDatabaseType = ds.type === 'MongoDB' ? 'mongo' : 'postgres';
          selectedCredentialId = ds.credentialId || '';
          selectedDatabase = ds.database || '';
          selectedCollection = ds.collection || '';
          selectedTable = ds.table || '';
        }}
        class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
      >
        Change Data Source
      </button>
    </div>
    <div class="text-xs text-green-200 space-y-1">
      <div><span class="font-medium">Type:</span> {ds.type}</div>
      <div><span class="font-medium">Database:</span> {ds.database}</div>
      {#if ds.collection}
        <div><span class="font-medium">Collection:</span> {ds.collection}</div>
      {/if}
      {#if ds.table}
        <div><span class="font-medium">Table:</span> {ds.table}</div>
      {/if}
    </div>
  </div>
{/if}
```

This goes around line 4200, BEFORE the inline data source selector block.

## Result
- Clicking "Continue Orchestration" will now properly continue the SSE streaming
- User can see what data source was selected
- User can click "Change Data Source" to modify it
- Phases 2-7 will stream in real-time with progress updates
