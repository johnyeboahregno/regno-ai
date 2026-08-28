<script lang="ts">
  import { onMount } from 'svelte';

  let projects: Array<{ id: string; name: string; status: string; description: string; phases: unknown[]; createdAt: string }> = [];
  let name = '';
  let description = '';
  let error = '';
  let message = '';

  async function load() {
    try {
      const r = await fetch('/api/stage/projects');
      const d = await r.json();
      if (d.ok) projects = d.projects;
    } catch {
      /* ignore */
    }
  }

  async function create(e: Event) {
    e.preventDefault();
    error = '';
    message = '';
    if (!name.trim()) return;
    const r = await fetch('/api/stage/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const d = await r.json();
    if (d.ok) {
      message = `Project "${name}" created`;
      name = '';
      description = '';
      load();
    } else {
      error = d.error ?? 'Failed';
    }
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow blue">STAGE</div>
  <h1>Project orchestration</h1>
  <p>Phased AI-powered project execution.</p>
</div>

<div class="card mb">
  <form on:submit={create}>
    <label for="pname">Project name</label>
    <input class="input mb" id="pname" bind:value={name} placeholder="e.g. New customer portal" />
    <label for="pdesc">Description</label>
    <textarea class="input mb" id="pdesc" rows="2" bind:value={description} placeholder="What should this project deliver?"></textarea>
    <button class="btn solid" type="submit">Create project</button>
  </form>
  {#if message}<p class="ok mt">{message}</p>{/if}
  {#if error}<p class="error mt">{error}</p>{/if}
</div>

<div class="panel" style="overflow-x:auto;">
  <table>
    <thead><tr><th>Project</th><th>Status</th><th>Description</th><th>Created</th></tr></thead>
    <tbody>
      {#each projects as p}
        <tr>
          <td class="mono">{p.name}</td>
          <td><span class="tag">{p.status}</span></td>
          <td class="muted">{p.description}</td>
          <td class="faint">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
        </tr>
      {/each}
      {#if projects.length === 0}
        <tr><td colspan="4" class="faint">No projects yet.</td></tr>
      {/if}
    </tbody>
  </table>
</div>
