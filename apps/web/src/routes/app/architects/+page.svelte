<script lang="ts">
  import { onMount } from 'svelte';
  import ArchitectWizard from '$lib/architects/ArchitectWizard.svelte';
  import { wizardOpen, openWizard, closeWizard } from '$lib/architects/store.js';

  type Architect = {
    slug: string;
    domain: string;
    status: string;
    developer: { name: string; email: string; github: string };
    target: { host: string; sshUser: string; sshPort: number; mode: string; wipe: boolean };
    error: string | null;
    updatedAt: string;
  };

  let architects: Architect[] = [];
  let error = '';
  let message = '';

  async function load() {
    try {
      const r = await fetch('/api/architects');
      const d = await r.json();
      if (d.ok) architects = d.architects;
      else error = d.error ?? 'Failed to load Architects';
    } catch {
      error = 'Failed to load Architects';
    }
  }

  async function relaunch(slug: string) {
    error = '';
    message = '';
    const r = await fetch(`/api/architects/${slug}/launch`, { method: 'POST' });
    const d = await r.json();
    if (d.ok) { message = `Provisioning "${slug}"… (job ${d.jobId})`; load(); }
    else error = d.error ?? 'Failed to launch';
  }

  async function remove(slug: string) {
    if (!confirm(`Delete Architect "${slug}"? This removes its blueprint and stored secrets.`)) return;
    await fetch(`/api/architects/${slug}`, { method: 'DELETE' });
    message = `Deleted "${slug}"`;
    load();
  }

  onMount(load);
</script>

<svelte:head><title>Architects — Regno</title></svelte:head>

<div class="page-head">
  <div class="eyebrow blue">Control plane</div>
  <h1>Architects</h1>
  <p>Provision a fresh Regno Architect for each developer — deploy over SSH and register <span class="mono">slug.regno.ai</span>.</p>
</div>

<div class="card mb" style="display:flex; align-items:center; justify-content:space-between;">
  <div class="muted">Each Architect runs a full stack on its own machine. This page is the Mothership.</div>
  <button class="btn solid" on:click={openWizard}>+ New Architect</button>
</div>

{#if message}<p class="ok mt">{message}</p>{/if}
{#if error}<p class="error mt">{error}</p>{/if}

<div class="panel" style="overflow-x:auto;">
  <table>
    <thead>
      <tr><th>Architect</th><th>Domain</th><th>Target</th><th>Status</th><th></th></tr>
    </thead>
    <tbody>
      {#each architects as a}
        <tr>
          <td>
            <div class="mono">{a.slug}</div>
            <div class="faint small">{a.developer?.name || '—'}</div>
          </td>
          <td class="mono">{a.domain}</td>
          <td class="mono small">{a.target?.sshUser}@{a.target?.host}:{a.target?.sshPort}</td>
          <td>
            <span class="tag" class:signal={a.status === 'healthy'} class:error={a.status === 'error'}>
              {a.status}
            </span>
            {#if a.error}<div class="error small">{a.error}</div>{/if}
          </td>
          <td style="white-space:nowrap;">
            {#if a.status === 'draft' || a.status === 'error'}
              <button class="btn ghost" style="padding:6px 12px;" on:click={() => relaunch(a.slug)}>Launch</button>
            {/if}
            <button class="btn ghost" style="padding:6px 12px;" on:click={() => remove(a.slug)}>Delete</button>
          </td>
        </tr>
      {/each}
      {#if architects.length === 0}
        <tr><td colspan="5" class="faint">No Architects yet — click "New Architect" to provision the first one.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if $wizardOpen}
  <ArchitectWizard
    onDone={() => { closeWizard(); load(); }}
    on:close={closeWizard}
  />
{/if}
