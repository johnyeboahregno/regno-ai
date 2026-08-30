<script lang="ts">
  import { onMount } from 'svelte';
  import { uuid } from '$lib/uuid';

  type NodeType = 'input' | 'llm' | 'datasource' | 'transform' | 'email';
  interface Node {
    id: string;
    type: NodeType;
    label: string;
    config: Record<string, string>;
  }

  let nodes: Node[] = [];
  let name = '';
  let message = '';
  let error = '';
  let pipelines: Array<{ id: string; name: string; nodes: Node[]; createdAt: string }> = [];

  const palette: Array<{ type: NodeType; label: string; icon: string }> = [
    { type: 'input', label: 'Input', icon: '⇥' },
    { type: 'llm', label: 'LLM', icon: '✦' },
    { type: 'datasource', label: 'Data Source', icon: '⌗' },
    { type: 'transform', label: 'Transform', icon: '⇄' },
    { type: 'email', label: 'Email', icon: '✉' },
  ];

  function addNode(type: NodeType) {
    nodes = [...nodes, { id: uuid(), type, label: type, config: {} }];
  }

  function removeNode(id: string) {
    nodes = nodes.filter((n) => n.id !== id);
  }

  async function loadPipelines() {
    try {
      const r = await fetch('/api/pipelines');
      const d = await r.json();
      if (d.ok) pipelines = d.pipelines;
    } catch {
      /* ignore */
    }
  }

  async function save() {
    error = '';
    message = '';
    if (!name.trim() || nodes.length === 0) {
      error = 'Give the pipeline a name and add at least one node';
      return;
    }
    const r = await fetch('/api/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nodes }),
    });
    const d = await r.json();
    if (d.ok) {
      message = `Pipeline "${name}" saved`;
      loadPipelines();
    } else {
      error = d.error ?? 'Failed to save';
    }
  }

  async function run() {
    error = '';
    message = '';
    const llmPrompts = nodes.filter((n) => n.type === 'llm').map((n) => n.config.prompt).filter(Boolean);
    const prompt = llmPrompts.join('\n\n') || `Run pipeline: ${name || 'untitled'}`;
    const r = await fetch('/api/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, settings: { analysisDepth: 'standard' } }),
    });
    const d = await r.json();
    if (d.ok) message = `Execution enqueued — job ${d.jobId}`;
    else error = d.error ?? 'Failed to run';
  }

  onMount(loadPipelines);
</script>

<div class="page-head">
  <div class="eyebrow blue">Canvas</div>
  <h1>Pipeline builder</h1>
  <p>Compose a pipeline from nodes, save it, and run it through Cortex Flow.</p>
</div>

<div class="grid canvas-layout">
  <div>
    <div class="card">
      <div class="faint mono small mb">NODE PALETTE</div>
      {#each palette as p}
        <button class="btn ghost" on:click={() => addNode(p.type)} style="width:100%; justify-content:space-between; margin-bottom:8px;">
          <span>{p.icon} {p.label}</span><span class="faint">+</span>
        </button>
      {/each}
    </div>
  </div>

  <div>
    <div class="card mb">
      <label for="pipe-name">Pipeline name</label>
      <input class="input" id="pipe-name" bind:value={name} placeholder="e.g. notes-api-builder" />
    </div>

    {#if nodes.length === 0}
      <div class="panel" style="padding:32px; text-align:center;">
        <p class="faint">No nodes yet — add one from the palette.</p>
      </div>
    {:else}
      {#each nodes as n}
        <div class="card mb" style="border-left:2px solid var(--signal);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <span class="tag signal mono">{n.type}</span>
            <button class="btn ghost" on:click={() => removeNode(n.id)} style="padding:4px 10px;">✕</button>
          </div>
          <label>Label</label>
          <input class="input mb" bind:value={n.label} />

          {#if n.type === 'llm' || n.type === 'transform' || n.type === 'input'}
            <label>Prompt / instruction</label>
            <textarea class="input" rows="2" bind:value={n.config.prompt} placeholder={n.type === 'llm' ? 'What should the agent do?' : 'Instruction'}></textarea>
          {:else if n.type === 'datasource'}
            <label>Collection</label>
            <input class="input" bind:value={n.config.collection} placeholder="e.g. notes" />
          {:else if n.type === 'email'}
            <div class="grid grid-2">
              <div>
                <label>To</label>
                <input class="input" type="email" bind:value={n.config.to} placeholder="you@example.com" />
              </div>
              <div>
                <label>Subject</label>
                <input class="input" bind:value={n.config.subject} placeholder="Notification" />
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}

    <div style="display:flex; gap:14px;">
      <button class="btn solid" on:click={save}>Save pipeline</button>
      <button class="btn" on:click={run} disabled={nodes.length === 0}>Run</button>
    </div>
    {#if message}<p class="ok mt">{message}</p>{/if}
    {#if error}<p class="error mt">{error}</p>{/if}
  </div>
</div>

<div class="mt2">
  <div class="eyebrow blue mb">Saved pipelines</div>
  {#if pipelines.length === 0}
    <p class="faint small">No pipelines saved yet.</p>
  {:else}
    <div class="panel" style="overflow-x:auto;">
      <table>
        <thead><tr><th>Name</th><th>Nodes</th><th>Created</th></tr></thead>
        <tbody>
          {#each pipelines as p}
            <tr>
              <td class="mono">{p.name}</td>
              <td>{p.nodes?.length ?? 0}</td>
              <td class="faint">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .canvas-layout {
    grid-template-columns: 240px 1fr;
    align-items: start;
  }
  @media (max-width: 720px) {
    .canvas-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
