<script lang="ts">
  import { onMount } from 'svelte';

  let health = {
    redis: false,
    mongo: false,
    qdrant: false,
    neo4j: false,
    smtp: { host: '', port: 587, from: '', configured: false },
  };
  let usage: {
    totals: { calls: number; inputTokens: number; outputTokens: number; totalTokens: number; cost: number };
    month: { calls: number; totalTokens: number; cost: number };
    byDay: Array<{ day: string; calls: number; totalTokens: number; cost: number }>;
    byModel: Array<{ provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; totalTokens: number; cost: number }>;
  } | null = null;
  let loaded = false;
  let emailTo = '';
  let mailMessage = '';
  let mailError = '';
  let busy = false;

  $: maxTokens = usage ? Math.max(1, ...usage.byDay.map((d) => d.totalTokens)) : 1;

  function fmtTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }
  function fmtCost(n: number): string {
    return '$' + (n >= 10 ? n.toFixed(2) : n.toFixed(4));
  }
  function barPct(n: number): number {
    if (!n) return 3;
    return Math.max(6, Math.round((n / maxTokens) * 100));
  }

  async function load() {
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      if (d.ok) {
        health = d;
        usage = d.usage ?? null;
      }
    } catch {
      /* ignore */
    }
    loaded = true;
  }

  async function sendTest(e: Event) {
    e.preventDefault();
    busy = true;
    mailError = '';
    mailMessage = '';
    const r = await fetch('/api/test/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo }),
    });
    const d = await r.json();
    busy = false;
    if (d.ok) mailMessage = 'Test email queued for delivery';
    else mailError = d.error ?? 'Failed to send';
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow good">Health</div>
  <h1>System status</h1>
  <p>Databases, queues, email connectivity, and AI usage &amp; cost.</p>
</div>

<div class="card" style="margin-bottom:22px;">
  <div class="eyebrow blue" style="margin-bottom:14px;">AI usage &amp; cost</div>

  {#if usage}
    <div class="u-grid">
      <div class="u-stat">
        <div class="u-value">{fmtTokens(usage.totals.totalTokens)}</div>
        <div class="u-label">Total tokens</div>
      </div>
      <div class="u-stat">
        <div class="u-value">{fmtCost(usage.totals.cost)}</div>
        <div class="u-label">Total cost</div>
      </div>
      <div class="u-stat">
        <div class="u-value">{fmtCost(usage.month.cost)}</div>
        <div class="u-label">Cost this month</div>
      </div>
      <div class="u-stat">
        <div class="u-value">{usage.totals.calls}</div>
        <div class="u-label">LLM calls</div>
      </div>
    </div>

    <div class="u-chart" role="img" aria-label="Daily token usage over the last 30 days">
      {#each usage.byDay as d}
        <div class="u-col" title="{d.day} · {fmtTokens(d.totalTokens)} tokens · {fmtCost(d.cost)}">
          <div class="u-bar-wrap"><div class="u-bar" style="height:{barPct(d.totalTokens)}%;"></div></div>
        </div>
      {/each}
    </div>
    <div class="u-chart-label">Tokens per day — last 30 days</div>

    {#if usage.byModel.length}
      <div class="u-table">
        <div class="u-row u-head"><span>Model</span><span>Calls</span><span>Tokens</span><span>Cost</span></div>
        {#each usage.byModel as m}
          <div class="u-row">
            <span><span class="u-prov">{m.provider}</span> · {m.model}</span>
            <span>{m.calls}</span>
            <span>{fmtTokens(m.totalTokens)}</span>
            <span>{fmtCost(m.cost)}</span>
          </div>
        {/each}
      </div>
    {/if}
    <p class="faint small mt">Usage is captured from every LLM call going forward.</p>
  {:else}
    <p class="muted small">No usage recorded yet — it appears after the first LLM call runs.</p>
  {/if}
</div>

<div class="grid grid-4">
  <div class="card">
    <span class="status"><span class="dot" class:good={health.mongo} class:bad={!health.mongo}></span>MongoDB</span>
    <p class="faint small mt">document store</p>
  </div>
  <div class="card">
    <span class="status"><span class="dot" class:good={health.qdrant} class:bad={!health.qdrant}></span>Qdrant</span>
    <p class="faint small mt">vector store</p>
  </div>
  <div class="card">
    <span class="status"><span class="dot" class:good={health.neo4j} class:bad={!health.neo4j}></span>Neo4j</span>
    <p class="faint small mt">graph store</p>
  </div>
  <div class="card">
    <span class="status"><span class="dot" class:good={health.redis} class:bad={!health.redis}></span>Redis / BullMQ</span>
    <p class="faint small mt">queues + pub/sub</p>
  </div>
</div>

<div class="card mt2">
  <div class="eyebrow blue">Email · SMTP</div>
  <div class="grid grid-3 mt" style="font-family:var(--mono); font-size:13px; color:var(--ink-dim);">
    <div>Host <span class="faint">· {health.smtp.host || '—'}:{health.smtp.port}</span></div>
    <div>From <span class="faint">· {health.smtp.from || '—'}</span></div>
    <div>
      <span class="status"><span class="dot" class:good={health.smtp.configured} class:amber={!health.smtp.configured}></span>{health.smtp.configured ? 'configured' : 'password missing'}</span>
    </div>
  </div>

  <form on:submit={sendTest} class="mt" style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;">
    <div style="flex:1; min-width:220px;">
      <label for="health-to">Send test email to</label>
      <input class="input" id="health-to" type="email" bind:value={emailTo} required placeholder="you@example.com" />
    </div>
    <button class="btn solid" type="submit" disabled={busy || !health.smtp.configured}>
      {busy ? 'Sending…' : 'Send test'}
    </button>
  </form>
  {#if mailMessage}<p class="ok mt">{mailMessage}</p>{/if}
  {#if mailError}<p class="error mt">{mailError}</p>{/if}
</div>

<style>
  .u-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  .u-stat {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 16px;
  }
  .u-value {
    font-family: var(--display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .u-label {
    color: var(--ink-dim);
    font-size: 12px;
    margin-top: 3px;
  }
  .u-chart {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 110px;
    margin-bottom: 6px;
  }
  .u-col {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  .u-bar-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  .u-bar {
    width: 100%;
    background: linear-gradient(180deg, #8d7bff, #6c5ce7);
    border-radius: 2px 2px 0 0;
    min-height: 2px;
  }
  .u-chart-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-faint);
    margin-bottom: 18px;
  }
  .u-table {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow-x: auto;
  }
  .u-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 10px;
    padding: 9px 14px;
    font-family: var(--mono);
    font-size: 12.5px;
    color: var(--ink-dim);
    border-bottom: 1px solid var(--line-soft);
  }
  .u-row:last-child {
    border-bottom: none;
  }
  .u-head {
    background: var(--panel);
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 10.5px;
  }
  .u-prov {
    color: var(--signal);
  }
  @media (max-width: 900px) {
    .u-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    .u-row {
      min-width: 480px;
    }
  }
  @media (max-width: 480px) {
    .u-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
