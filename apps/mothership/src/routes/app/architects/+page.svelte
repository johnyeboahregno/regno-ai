<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '@regno/ui';
  import ArchitectWizard from '$lib/architects/ArchitectWizard.svelte';
  import ProgressModal from '$lib/architects/ProgressModal.svelte';
  import ArchitectDetailsModal from '$lib/architects/ArchitectDetailsModal.svelte';
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
  let pendingDelete: string | null = null;
  let deleteConfirmText = '';
  let progressSlug: string | null = null;
  let progressJobId: string | undefined = undefined;
  let detailsSlug: string | null = null;
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

  const SERVICE_ICONS: Record<string, string> = { mongo: 'database', redis: 'redis', qdrant: 'qdrant', neo4j: 'neo4j' };
  function serviceIcon(name: string): string {
    return SERVICE_ICONS[name.toLowerCase()] ?? 'database';
  }

  async function relaunch(slug: string) {
    error = '';
    message = '';
    const r = await fetch(`/api/architects/${slug}/launch`, { method: 'POST' });
    const d = await r.json();
    if (d.ok) { progressSlug = slug; progressJobId = d.jobId; load(); }
    else error = d.error ?? 'Failed to launch';
  }

  async function redeploy(slug: string) {
    error = '';
    message = '';
    // Explicitly force wipe:false — a redeploy must only rebuild/restart the apps, never
    // touch data, even if "wipe" was ticked once at creation and is still saved on the target.
    const r = await fetch(`/api/architects/${slug}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wipe: false }),
    });
    const d = await r.json();
    if (d.ok) { progressSlug = slug; progressJobId = d.jobId; load(); }
    else error = d.error ?? 'Failed to redeploy';
  }

  async function confirmDelete() {
    if (!pendingDelete || deleteConfirmText !== pendingDelete) return;
    const slug = pendingDelete;
    pendingDelete = null;
    deleteConfirmText = '';
    await fetch(`/api/architects/${slug}`, { method: 'DELETE' });
    message = `Deleted "${slug}" from the Mothership registry`;
    load();
  }

  async function copyError(text: string | null | undefined) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message = 'Error message copied to clipboard';
    } catch {
      error = 'Could not copy — clipboard access denied';
    }
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
        <tr class="row-click" role="button" tabindex="0" on:click={() => (detailsSlug = a.slug)} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') detailsSlug = a.slug; }}>
          <td>
            <div class="mono">{a.slug}</div>
            <div class="faint small">{a.developer?.name || '—'}</div>
          </td>
          <td class="mono">
            <a href="https://{a.domain}" target="_blank" rel="noopener noreferrer" on:click|stopPropagation>{a.domain}</a>
          </td>
          <td class="mono small">{a.target?.sshUser}@{a.target?.host}:{a.target?.sshPort}</td>
          <td>
            <span
              class="tag"
              class:signal={a.status === 'healthy'}
              class:error={a.status === 'error'}
              title={a.status === 'error' ? `${a.error ?? 'Unknown error'} (click to copy)` : undefined}
              role={a.status === 'error' ? 'button' : undefined}
              tabindex={a.status === 'error' ? 0 : undefined}
              on:click={(e) => { e.stopPropagation(); if (a.status === 'error') copyError(a.error); }}
              on:keydown={(e) => { if (a.status === 'error' && (e.key === 'Enter' || e.key === ' ')) { e.stopPropagation(); copyError(a.error); } }}
            >
              {a.status}
            </span>
          </td>
          <td>
            {#if a.telemetry}
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                {#each a.telemetry.services as s}
                  <span class="tag icon-tag" class:signal={s.online} class:error={!s.online} title="{s.name}: {s.online ? 'online' : 'offline'}{s.detail ? ' — ' + s.detail : ''}">
                    <Icon name={serviceIcon(s.name)} size={14} />
                  </span>
                {/each}
              </div>
              <div class="faint small">v{a.telemetry.version} · {a.telemetry.status} · seen {relative(a.lastSeenAt)}</div>
            {:else if a.online}
              <span class="tag signal">online</span>
            {:else}
              <span class="faint small">{a.status === 'healthy' ? 'awaiting first report…' : '—'}</span>
            {/if}
          </td>
          <td style="white-space:nowrap;" on:click|stopPropagation>
            {#if a.status === 'draft'}
              <button class="btn ghost icon-btn" title="Launch" aria-label="Launch" on:click={() => relaunch(a.slug)}><Icon name="refresh" size={16} /></button>
            {:else if a.status === 'error'}
              <button class="btn ghost icon-btn" style="border-color:var(--danger); color:var(--danger);" title="Redeploy (apps only, no data wipe)" aria-label="Redeploy" on:click={() => redeploy(a.slug)}><Icon name="refresh" size={16} /></button>
            {:else if a.status !== 'provisioning'}
              <button class="btn ghost icon-btn" title="Redeploy (apps only, no data wipe)" aria-label="Redeploy" on:click={() => redeploy(a.slug)}><Icon name="refresh" size={16} /></button>
            {/if}
            <button class="btn ghost icon-btn" title="Delete" aria-label="Delete" on:click={() => { pendingDelete = a.slug; deleteConfirmText = ''; }}><Icon name="trash" size={16} /></button>
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

{#if progressSlug}
  <ProgressModal slug={progressSlug} jobId={progressJobId} on:close={() => { progressSlug = null; load(); }} />
{/if}

{#if detailsSlug}
  <ArchitectDetailsModal slug={detailsSlug} on:close={() => (detailsSlug = null)} />
{/if}

{#if pendingDelete}
  <div class="modal-backdrop" on:click={() => (pendingDelete = null)}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Delete Architect" on:click|stopPropagation>
      <div class="modal-head">
        <span class="eyebrow" style="color:var(--danger);">Delete Architect</span>
        <button class="x" on:click={() => (pendingDelete = null)}>✕</button>
      </div>
      <div class="modal-body">
        <p style="margin:0 0 10px; color:var(--ink);">
          You're about to delete <span class="mono">{pendingDelete}</span> from the Mothership.
        </p>
        <ul style="margin:0 0 10px; padding-left:18px; color:var(--ink-dim); font-size:13px; line-height:1.6;">
          <li>Permanently erases its blueprint, target config, and stored secrets (SSH key/password, API keys) here — <strong>this cannot be undone</strong>.</li>
          <li>You will lose the ability to redeploy, monitor, or manage it from this dashboard.</li>
        </ul>
        <p style="margin:0 0 14px; padding:10px 12px; border-radius:8px; background:var(--signal-bg); color:var(--ink);">
          <strong>What this does NOT do:</strong> it does not SSH into <span class="mono">{pendingDelete}</span>'s server, and does not stop, wipe, or delete anything running there — its containers and databases keep running untouched until you manually tear them down on that box.
        </p>
        <label for="delete-confirm" style="display:block; font-size:12px; color:var(--ink-dim); margin-bottom:6px;">
          Type <span class="mono">{pendingDelete}</span> to confirm:
        </label>
        <input id="delete-confirm" class="input mono" bind:value={deleteConfirmText} placeholder={pendingDelete} autocomplete="off" />
      </div>
      <div class="modal-foot">
        <button class="btn ghost" on:click={() => (pendingDelete = null)}>Cancel</button>
        <button class="btn danger" on:click={confirmDelete} disabled={deleteConfirmText !== pendingDelete}>Delete permanently</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop { position: fixed; inset: 0; background: rgba(4,6,12,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--panel-2); border: 1px solid var(--line); border-radius: 14px; width: min(440px, 92vw); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line-soft); }
  .modal-body { padding: 18px; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--line-soft); }
  .x { background: transparent; border: 0; color: var(--ink-faint); font-size: 18px; cursor: pointer; }
  .x:hover { color: var(--ink); }
  .icon-tag { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; }
  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; }
  .row-click { cursor: pointer; }
  .row-click:hover { background: var(--panel-hover, rgba(255,255,255,0.03)); }
</style>
