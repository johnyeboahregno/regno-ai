<script lang="ts">
  import { onMount } from 'svelte';

  let overview = { patterns: 0, memories: 0, agents: 0, executions: 0, knowledge: 0 };
  let loaded = false;

  onMount(async () => {
    try {
      const r = await fetch('/api/cortex/overview');
      const d = await r.json();
      if (d.ok) overview = d;
    } catch {
      // Backend unreachable (e.g. mid-deploy) — keep the zeroed overview.
    } finally {
      loaded = true;
    }
  });
</script>

<div class="page-head">
  <div class="eyebrow blue">Dashboard</div>
  <h1>System overview</h1>
  <p>Your self-hosted Regno Architect.</p>
</div>

<div class="grid grid-4">
  <div class="card">
    <div class="faint mono small">PATTERNS</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px;">{overview.patterns}</div>
    <p class="muted small mt">proven patterns in the brain</p>
  </div>
  <div class="card">
    <div class="faint mono small">MEMORIES</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px;">{overview.memories}</div>
    <p class="muted small mt">compounding wisdom memories</p>
  </div>
  <div class="card">
    <div class="faint mono small">KNOWLEDGE</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px;">{overview.knowledge}</div>
    <p class="muted small mt">indexed documents</p>
  </div>
  <div class="card">
    <div class="faint mono small">EXECUTIONS</div>
    <div style="font-family:var(--display); font-size:34px; margin-top:8px;">{overview.executions}</div>
    <p class="muted small mt">Cortex Flow runs</p>
  </div>
</div>

<div class="grid grid-2 mt2">
  <a class="card" href="/app/executions" style="display:block;">
    <div class="eyebrow blue">Run</div>
    <h3 class="mt" style="font-size:18px;">Start an execution →</h3>
    <p class="muted small mt">Prompt the regno-architect agent to plan and build.</p>
  </a>
  <a class="card" href="/app/cortex" style="display:block;">
    <div class="eyebrow">Memory</div>
    <h3 class="mt" style="font-size:18px;">Inspect CORTEX →</h3>
    <p class="muted small mt">Patterns, memories, and the knowledge graph.</p>
  </a>
</div>
