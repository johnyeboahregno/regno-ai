<script lang="ts">
  import type { CortexHealthData } from './types.js';

  export let health: CortexHealthData | null = null;

  function fmt(n: number): string {
    return (n ?? 0).toLocaleString();
  }

  function time(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString();
  }
</script>

{#if !health}
  <div class="panel" style="padding:28px; text-align:center;">
    <p class="muted">Loading CORTEX health…</p>
  </div>
{:else}
  <div class="head">
    <h2>CORTEX Health</h2>
    <div class="faint mono small">auto-refreshing · {time(health.checkedAt)}</div>
  </div>

  <div class="grid grid-4 mb">
    <div class="card">
      <div class="stat">{fmt(health.patterns.total)}</div>
      <div class="lbl">Total Patterns</div>
    </div>
    <div class="card">
      <div class="stat">{fmt(health.patterns.active7d)}</div>
      <div class="lbl">Active (7 days)</div>
    </div>
    <div class="card">
      <div class="stat">{fmt(health.patterns.highPerformers)}</div>
      <div class="lbl">High Performers</div>
    </div>
    <div class="card">
      <div class="stat">{fmt(health.patterns.lowConfidence)}</div>
      <div class="lbl">Low Confidence</div>
    </div>
  </div>

  <div class="card mb">
    <h3 style="font-size:15px;">Knowledge Store</h3>
    <div class="k-grid mt">
      {#each health.knowledge as k}
        <div class="k-cell">
          <span class="k-glyph">{k.glyph}</span>
          <span class="k-val">{fmt(k.value)}</span>
          <span class="k-lbl">{k.label}</span>
        </div>
      {/each}
    </div>
    <div class="faint mono small mt">Total: {fmt(health.knowledgeTotal)} knowledge items</div>
  </div>

  <div class="card mb">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3 style="font-size:15px;">Service Status</h3>
      <span class="faint mono small">checked {time(health.checkedAt)}</span>
    </div>
    <div class="svc mt">
      {#each health.services as s}
        <div class="svc-row">
          <div class="svc-dot" class:good={s.status === 'online'} class:bad={s.status === 'offline'} class:amber={s.status === 'degraded'} class:signal={s.status === 'idle'}></div>
          <div class="svc-name">{s.name}</div>
          <div class="svc-role">{s.role}</div>
          <div class="svc-detail">
            {s.detail}
            {#if s.sync === 'out-of-sync'}<span class="tag amber" style="margin-left:8px;">Out of Sync</span>{/if}
            {#if s.sync === 'in-sync'}<span class="tag good-tag" style="margin-left:8px;">In Sync</span>{/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="card mb">
    <h3 style="font-size:15px;">Learning Metrics</h3>
    <div class="grid grid-4 mt">
      <div class="metric"><div class="stat">{fmt(health.learning.created7d)}</div><div class="lbl">Created (7d)</div></div>
      <div class="metric"><div class="stat">{fmt(health.learning.used7d)}</div><div class="lbl">Used (7d)</div></div>
      <div class="metric"><div class="stat">{fmt(health.learning.totalSuccesses)}</div><div class="lbl">Total Successes</div></div>
      <div class="metric"><div class="stat">{fmt(health.learning.totalFailures)}</div><div class="lbl">Total Failures</div></div>
    </div>
  </div>

  <div class="card">
    <h3 style="font-size:15px;">Patterns by Domain</h3>
    {#if health.patternsByDomain.length}
      <table class="mt">
        <thead>
          <tr><th>Domain</th><th>Count</th><th>Avg Confidence</th><th>Success Rate</th></tr>
        </thead>
        <tbody>
          {#each health.patternsByDomain as row}
            <tr>
              <td class="mono">{row.domain}</td>
              <td>{row.count}</td>
              <td>{row.avgConfidence.toFixed(2)}</td>
              <td>{row.successRate}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="faint small mt">No patterns yet — provision the foundation catalog in the Patterns tab.</p>
    {/if}
  </div>
{/if}

<style>
  .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
  .head h2 { font-size: 22px; }
  .stat { font-family: var(--display); font-size: 30px; font-weight: 800; letter-spacing: -0.01em; }
  .lbl { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-top: 6px; }
  .k-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .k-cell { display: flex; flex-direction: column; padding: 12px 14px; background: var(--panel-2); border: 1px solid var(--line-soft); border-radius: var(--r-sm); }
  .k-glyph { font-size: 16px; }
  .k-val { font-family: var(--display); font-size: 22px; font-weight: 700; margin-top: 6px; }
  .k-lbl { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
  .svc { display: flex; flex-direction: column; }
  .svc-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-soft); }
  .svc-row:last-child { border-bottom: none; }
  .svc-dot { width: 9px; height: 9px; border-radius: 2px; flex: none; background: var(--ink-faint); }
  .svc-dot.good { background: var(--good); }
  .svc-dot.bad { background: var(--danger); }
  .svc-dot.amber { background: var(--telemetry); }
  .svc-dot.signal { background: var(--signal); }
  .svc-name { font-family: var(--display); font-weight: 700; min-width: 90px; }
  .svc-role { color: var(--ink-faint); font-size: 13px; flex: 1; }
  .svc-detail { color: var(--ink-dim); font-size: 13px; display: flex; align-items: center; }
  .metric { padding: 4px 0; }
  .tag.amber { color: var(--telemetry); border-color: var(--telemetry); }
  .tag.good-tag { color: var(--good); border-color: var(--good); }
</style>
