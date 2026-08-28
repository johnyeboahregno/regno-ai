<script lang="ts">
  import { onMount } from 'svelte';

  let health = { redis: false, mongo: false, qdrant: false, neo4j: false, smtp: { configured: false } };

  onMount(async () => {
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      if (d.ok) health = d;
    } catch {
      /* ignore */
    }
  });

  const checks = [
    { label: 'MongoDB (auth)', ok: health.mongo },
    { label: 'Qdrant (vector)', ok: health.qdrant },
    { label: 'Neo4j (graph, auth)', ok: health.neo4j },
    { label: 'Redis / BullMQ', ok: health.redis },
    { label: 'SMTP configured', ok: health.smtp.configured },
    { label: 'Session cookies', ok: true },
  ];
</script>

<div class="page-head">
  <div class="eyebrow">SENTINEL</div>
  <h1>Security & monitoring</h1>
  <p>Continuous posture check across the platform.</p>
</div>

<div class="grid grid-2">
  {#each checks as c}
    <div class="card" style="display:flex; align-items:center; justify-content:space-between;">
      <span class="mono small">{c.label}</span>
      <span class="status"><span class="dot" class:good={c.ok} class:bad={!c.ok}></span>{c.ok ? 'ok' : 'off'}</span>
    </div>
  {/each}
</div>

<div class="panel mt2" style="padding:28px; text-align:center;">
  <p class="muted">Full SENTINEL engine is the next build in your list.</p>
  <p class="faint small mt">Planned: audit seal + lineage graph, anomaly detectors, RFC-3161 anchoring, alert digest emails.</p>
</div>
