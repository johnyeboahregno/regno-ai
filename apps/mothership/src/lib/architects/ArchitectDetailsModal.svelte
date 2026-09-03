<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import LineChart from './LineChart.svelte';

  export let slug: string;

  const dispatch = createEventDispatcher();

  type Architect = {
    slug: string;
    domain: string;
    status: string;
    developer: { name: string; email: string; github: string };
    target: { host: string; sshUser: string; sshPort: number; mode: string; wipe: boolean };
    error: string | null;
    lastSeenAt: string | null;
    online: boolean | null;
    createdAt: string;
    updatedAt: string;
  };

  type HistoryPoint = { at: string; status: string; uptimeSeconds: number; memPercent: number; servicesOnline: number; servicesTotal: number };
  type Telemetry = {
    summary: { status: string; version: string; uptimeSeconds: number; memPercent: number; services: Array<{ name: string; online: boolean; detail?: string }> } | null;
    history: HistoryPoint[];
    receivedAt: string | null;
  } | null;

  let architect: Architect | null = null;
  let telemetry: Telemetry = null;
  let loading = true;
  let loadError = '';
  let timer: ReturnType<typeof setInterval> | null = null;

  async function load() {
    try {
      const [a, t] = await Promise.all([
        fetch(`/api/architects/${slug}`).then((r) => r.json()),
        fetch(`/api/architects/${slug}/telemetry`).then((r) => r.json()),
      ]);
      if (a.ok) architect = a.architect;
      else loadError = a.error ?? 'Failed to load Architect';
      if (t.ok) telemetry = t.telemetry;
    } catch {
      loadError = 'Failed to load Architect details';
    } finally {
      loading = false;
    }
  }

  function fmtUptime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function close() {
    dispatch('close');
  }

  onMount(() => {
    load();
    timer = setInterval(load, 5000);
  });
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<div class="modal-backdrop" on:click={close}>
  <div class="modal wide" role="dialog" aria-modal="true" aria-label="Architect details" on:click|stopPropagation>
    <div class="modal-head">
      <span class="eyebrow blue">Architect <span class="mono">{slug}</span></span>
      <button class="x" on:click={close}>✕</button>
    </div>
    <div class="modal-body">
      {#if loading}
        <p class="faint small">Loading…</p>
      {:else if loadError}
        <p class="error small">{loadError}</p>
      {:else if architect}
        <div class="grid">
          <div>
            <div class="section-label">Developer</div>
            <p class="mono">{architect.developer?.name || '—'}</p>
            <p class="faint small">{architect.developer?.email || '—'} · {architect.developer?.github || '—'}</p>
          </div>
          <div>
            <div class="section-label">Domain</div>
            <p><a class="mono" href="https://{architect.domain}" target="_blank" rel="noopener noreferrer">{architect.domain}</a></p>
          </div>
          <div>
            <div class="section-label">Target</div>
            <p class="mono small">{architect.target?.sshUser}@{architect.target?.host}:{architect.target?.sshPort} ({architect.target?.mode})</p>
          </div>
          <div>
            <div class="section-label">Status</div>
            <span class="tag" class:signal={architect.status === 'healthy'} class:error={architect.status === 'error'}>{architect.status}</span>
          </div>
        </div>

        {#if architect.error}<p class="error small mt">{architect.error}</p>{/if}

        {#if telemetry?.summary}
          <div class="section-label mt">Live telemetry</div>
          <div class="grid">
            <p class="faint small">Version <span class="mono">{telemetry.summary.version}</span></p>
            <p class="faint small">Uptime <span class="mono">{fmtUptime(telemetry.summary.uptimeSeconds)}</span></p>
            <p class="faint small">Memory <span class="mono">{telemetry.summary.memPercent.toFixed(1)}%</span></p>
            <p class="faint small">Status <span class="mono">{telemetry.summary.status}</span></p>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin:8px 0;">
            {#each telemetry.summary.services as s}
              <span class="tag" class:signal={s.online} class:error={!s.online} title={s.detail}>{s.name}: {s.online ? 'online' : 'offline'}</span>
            {/each}
          </div>

          <div class="charts">
            <LineChart
              label="Memory %"
              unit="%"
              color="var(--signal)"
              points={telemetry.history.map((h) => h.memPercent)}
            />
            <LineChart
              label="Services online"
              color="var(--accent-2, var(--signal))"
              points={telemetry.history.map((h) => h.servicesOnline)}
            />
          </div>
        {:else}
          <p class="faint small mt">No telemetry received yet — the Architect reports in shortly after it comes online.</p>
        {/if}
      {/if}
    </div>
    <div class="modal-foot">
      <button class="btn ghost" on:click={close}>Close</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; inset: 0; background: rgba(4,6,12,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--panel-2); border: 1px solid var(--line); border-radius: 14px; width: min(640px, 92vw); max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
  .modal.wide { width: min(760px, 96vw); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line-soft); }
  .modal-body { padding: 18px; overflow-y: auto; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--line-soft); }
  .x { background: transparent; border: 0; color: var(--ink-faint); font-size: 18px; cursor: pointer; }
  .x:hover { color: var(--ink); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
  .section-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 4px; }
  .mt { margin-top: 14px; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
</style>
