<script lang="ts">
  import { onMount } from 'svelte';

  type Stats = {
    total: number;
    online: number;
    offline: number;
    healthy: number;
    provisioning: number;
    error: number;
    draft: number;
  };

  let stats: Stats = { total: 0, online: 0, offline: 0, healthy: 0, provisioning: 0, error: 0, draft: 0 };

  onMount(async () => {
    try {
      const r = await fetch('/api/overview');
      const d = await r.json();
      if (d.ok) stats = d.stats;
    } catch {
      // Backend unreachable (e.g. mid-deploy) — keep the zeroed stats.
    }
  });
</script>

<svelte:head><title>Dashboard — Regno Mothership</title></svelte:head>

<div class="page-head">
  <div class="eyebrow blue">Control plane</div>
  <h1>Mothership overview</h1>
  <p>Provision and monitor your fleet of Regno Architects.</p>
</div>

<div class="grid grid-4">
  <div class="card">
    <div class="faint mono small">ARCHITECTS</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px;">{stats.total}</div>
    <p class="muted small mt">registered Architects</p>
  </div>
  <div class="card">
    <div class="faint mono small">ONLINE</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px; color:var(--good);">{stats.online}</div>
    <p class="muted small mt">reporting telemetry</p>
  </div>
  <div class="card">
    <div class="faint mono small">OFFLINE</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px; color:var(--danger);">{stats.offline}</div>
    <p class="muted small mt">missed heartbeat</p>
  </div>
  <div class="card">
    <div class="faint mono small">PROVISIONING</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px;">{stats.provisioning}</div>
    <p class="muted small mt">deploying now</p>
  </div>
</div>

<div class="grid grid-2 mt2">
  <a class="card" href="/app/architects" style="display:block;">
    <div class="eyebrow blue">Fleet</div>
    <h3 class="mt" style="font-size:18px;">Manage Architects →</h3>
    <p class="muted small mt">Provision, redeploy, and remove Architects.</p>
  </a>
  <a class="card" href="/app/health" style="display:block;">
    <div class="eyebrow">System</div>
    <h3 class="mt" style="font-size:18px;">View health →</h3>
    <p class="muted small mt">Mothership services, queue, and SMTP.</p>
  </a>
</div>
