<script lang="ts">
  import { onMount } from 'svelte';

  let prompt = '';
  let depth = 'quick';
  let busy = false;
  let message = '';
  let error = '';
  let executions: Array<{
    taskId: string;
    agentSlug: string;
    prompt: string;
    depth: string;
    finalScore: number;
    status: string;
    llmCalls: number;
    servedPhases: number;
    createdAt: string;
  }> = [];

  async function loadExecutions() {
    try {
      const r = await fetch('/api/executions');
      const d = await r.json();
      if (d.ok) executions = d.executions;
    } catch {
      /* ignore */
    }
  }

  onMount(loadExecutions);

  function statusClass(s?: string) {
    if (s === 'failed') return 'bad';
    if (s === 'complete' || s === 'success') return 'good';
    return 'amber';
  }

  async function run() {
    if (!prompt.trim()) return;
    busy = true;
    error = '';
    message = '';
    const r = await fetch('/api/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, settings: { analysisDepth: depth } }),
    });
    const d = await r.json();
    busy = false;
    if (d.ok) {
      message = `Execution enqueued — job ${d.jobId}`;
      prompt = '';
      setTimeout(loadExecutions, 1500);
    } else {
      error = d.error ?? 'Failed to enqueue';
    }
  }
</script>

<div class="page-head">
  <div class="eyebrow blue">Cortex Flow</div>
  <h1>Executions</h1>
  <p>Run the agentic pipeline — route, plan, act, refine, learn.</p>
</div>

<div class="card mb">
  <label>Prompt</label>
  <textarea class="input" bind:value={prompt} rows="3" placeholder="e.g. Scaffold a small Node.js API for notes"></textarea>
  <div class="mt" style="display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap;">
    <div style="width:180px;">
      <label>Depth</label>
      <select class="input" bind:value={depth}>
        <option value="quick">quick</option>
        <option value="standard">standard</option>
        <option value="deep">deep</option>
      </select>
    </div>
    <button class="btn solid" on:click={run} disabled={busy}>{busy ? 'Enqueueing…' : 'Run'}</button>
  </div>
  {#if message}<p class="ok mt">{message}</p>{/if}
  {#if error}<p class="error mt">{error}</p>{/if}
</div>

<div class="panel" style="overflow-x:auto;">
  <table>
    <thead>
      <tr><th>Status</th><th>Agent</th><th>Prompt</th><th>Depth</th><th>Score</th><th>Served</th><th>LLM calls</th><th>Created</th></tr>
    </thead>
    <tbody>
      {#each executions as e}
        <tr>
          <td><span class="status"><span class="dot {statusClass(e.status)}"></span>{e.status ?? 'complete'}</span></td>
          <td>{e.agentSlug}</td>
          <td class="muted">{e.prompt?.slice(0, 80)}{e.prompt?.length > 80 ? '…' : ''}</td>
          <td>{e.depth}</td>
          <td>{e.finalScore ?? '—'}</td>
          <td>
            {#if e.servedPhases > 0}
              <span class="tag signal">✓ {e.servedPhases} served</span>
            {:else}
              <span class="faint">—</span>
            {/if}
          </td>
          <td>{e.llmCalls ?? '—'}</td>
          <td class="faint">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}</td>
        </tr>
      {/each}
      {#if executions.length === 0}
        <tr><td colspan="8" class="faint">No executions yet — run one above.</td></tr>
      {/if}
    </tbody>
  </table>
</div>
