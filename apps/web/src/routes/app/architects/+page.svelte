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
    lastSeenAt: string | null;
    online: boolean | null;
    telemetry: {
      status: string;
      version: string;
      uptimeSeconds: number;
      memPercent: number;
      services: Array<{ name: string; online: boolean; detail?: string }>;
      receivedAt: string;
    } | null;
    updatedAt: string;
  };

  let architects: Architect[] = [];
  let error = '';
  let message = '';
  let timer: ReturnType<typeof setInterval> | null = null;

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

  function relative(ts: string | null): string {
    if (!ts) return '—';
    const secs = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
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

  onMount(() => {
    load();
    timer = setInterval(load, 5000);
    return () => { if (timer) clearInterval(timer); };
  });
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
      <tr><th>Architect</th><th>Domain</th><th>Target</th><th>Status</th><th>Telemetry</th><th></th></tr>
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
          <td>
            {#if a.telemetry}
              <div style="display:flex; gap:4px; flex-wrap:wrap;">
                {#each a.telemetry.services as s}
                  <span class="tag" class:signal={s.online} class:error={!s.online}>{s.name}</span>
                {/each}
              </div>
              <div class="faint small">v{a.telemetry.version} · {a.telemetry.status} · seen {relative(a.lastSeenAt)}</div>
            {:else if a.online}
              <span class="tag signal">online</span>
            {:else}
              <span class="faint small">{a.status === 'healthy' ? 'awaiting first report…' : '—'}</span>
            {/if}
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
        <tr><td colspan="6" class="faint">No Architects yet — click "New Architect" to provision the first one.</td></tr>
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
