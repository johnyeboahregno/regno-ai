<script lang="ts">
  import { onMount } from 'svelte';

  let health = { redis: false, mongo: false, qdrant: false, neo4j: false, smtp: { configured: false } };
  let metrics: {
    executions: number;
    activity: number;
    cost: { totalCostUsd: number; totalTokens: number; chatCalls: number; embedCalls: number };
    llm: { totalLlmCalls: number; totalServedPhases: number; avgScore: number };
    latency: { avgMs: number; p50Ms: number; p95Ms: number };
    throughput: { today: number; last7d: number };
  } | null = null;
  let metricsError = '';

  onMount(async () => {
    try {
      const [hr, mr] = await Promise.all([fetch('/api/health'), fetch('/api/sentinel/overview')]);
      const hd = await hr.json();
      if (hd.ok) health = hd;
      const md = await mr.json();
      if (md.ok) metrics = md;
      else metricsError = md.error ?? 'unavailable';
    } catch (e) {
      metricsError = (e as Error).message;
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

  const usd = (n: number) => `$${(n ?? 0).toFixed(4)}`;
  const num = (n: number) => (n ?? 0).toLocaleString();
</script>

<div class="page-head">
  <div class="eyebrow">SENTINEL</div>
  <h1>Security & monitoring</h1>
  <p>Continuous posture check, cost, latency and activity across the platform.</p>
</div>

<div class="grid grid-2">
  {#each checks as c}
    <div class="card" style="display:flex; align-items:center; justify-content:space-between;">
      <span class="mono small">{c.label}</span>
      <span class="status"><span class="dot" class:good={c.ok} class:bad={!c.ok}></span>{c.ok ? 'ok' : 'off'}</span>
    </div>
  {/each}
</div>

{#if metrics}
  <div class="grid grid-3 mt2">
    <div class="card">
      <div class="muted small">Total cost</div>
      <div style="font-family:var(--display); font-size:28px;">{usd(metrics.cost.totalCostUsd)}</div>
      <div class="faint small">{num(metrics.cost.totalTokens)} tokens</div>
    </div>
    <div class="card">
      <div class="muted small">Executions</div>
      <div style="font-family:var(--display); font-size:28px;">{num(metrics.executions)}</div>
      <div class="faint small">{num(metrics.activity)} activity events</div>
    </div>
    <div class="card">
      <div class="muted small">Throughput</div>
      <div style="font-family:var(--display); font-size:28px;">{num(metrics.throughput.last7d)}<span class="faint small"> /7d</span></div>
      <div class="faint small">{num(metrics.throughput.today)} today</div>
    </div>
  </div>

  <div class="grid grid-3 mt">
    <div class="card">
      <div class="muted small">Latency (p50 / p95)</div>
      <div style="font-family:var(--display); font-size:28px;">{metrics.latency.p50Ms}<span class="faint small">ms</span></div>
      <div class="faint small">p95 {metrics.latency.p95Ms}ms · avg {metrics.latency.avgMs}ms</div>
    </div>
    <div class="card">
      <div class="muted small">LLM calls / served</div>
      <div style="font-family:var(--display); font-size:28px;">{num(metrics.llm.totalLlmCalls)}</div>
      <div class="faint small">{num(metrics.llm.totalServedPhases)} phases served from memory</div>
    </div>
    <div class="card">
      <div class="muted small">Avg quality score</div>
      <div style="font-family:var(--display); font-size:28px;">{Math.round(metrics.llm.avgScore)}</div>
      <div class="faint small">{num(metrics.cost.chatCalls)} chat · {num(metrics.cost.embedCalls)} embed calls</div>
    </div>
  </div>
{:else}
  <div class="panel mt2" style="padding:28px; text-align:center;">
    <p class="muted">{metricsError ? `SENTINEL metrics unavailable: ${metricsError}` : 'Loading SENTINEL metrics…'}</p>
  </div>
{/if}

