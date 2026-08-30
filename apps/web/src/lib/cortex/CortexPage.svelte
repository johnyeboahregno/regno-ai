<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CortexArchitecture from './CortexArchitecture.svelte';
  import CortexKnowledge from './CortexKnowledge.svelte';
  import CortexPatterns from './CortexPatterns.svelte';
  import CortexHealth from './CortexHealth.svelte';
  import CortexAbout from './CortexAbout.svelte';
  import type { CortexHealthData } from './types.js';

  type Tab = 'Architecture' | 'Knowledge' | 'Patterns' | 'Health' | 'About';
  const tabs: Tab[] = ['Architecture', 'Knowledge', 'Patterns', 'Health', 'About'];

  let active: Tab = 'Health';
  let health: CortexHealthData | null = null;
  let healthError = '';
  let autoRefresh = true;
  let timer: ReturnType<typeof setInterval> | undefined;

  async function loadHealth() {
    try {
      const r = await fetch('/api/cortex/health');
      const d = await r.json();
      if (d.ok) {
        health = d;
        healthError = '';
      } else {
        healthError = d.error ?? 'Failed to load CORTEX health';
      }
    } catch {
      healthError = 'CORTEX health unavailable — is the knowledge base seeded?';
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      loadHealth();
      timer = setInterval(loadHealth, 15000);
    } else {
      if (timer) clearInterval(timer);
      timer = undefined;
    }
  }

  onMount(() => {
    loadHealth();
    timer = setInterval(loadHealth, 15000);
  });
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<svelte:head><title>CORTEX — Regno AI</title></svelte:head>

<div class="page-head">
  <div class="eyebrow blue">🧠 CORTEX — Memory System</div>
  <h1>Intelligent memory &amp; knowledge system</h1>
  <p>Vector, graph and document stores plus quality-scored memory — wired to a reasoning layer.</p>
</div>

<div class="tabs" role="tablist">
  {#each tabs as t}
    <button
      class="tab"
      class:active={active === t}
      role="tab"
      aria-selected={active === t}
      on:click={() => (active = t)}
    >{t}</button>
  {/each}
</div>

{#if healthError}<p class="error mt">{healthError}</p>{/if}

{#if active === 'Architecture'}
  <CortexArchitecture {health} {autoRefresh} onToggleAutoRefresh={toggleAutoRefresh} onRefresh={loadHealth} />
{:else if active === 'Knowledge'}
  <CortexKnowledge {health} />
{:else if active === 'Patterns'}
  <CortexPatterns />
{:else if active === 'Health'}
  <CortexHealth {health} />
{:else if active === 'About'}
  <CortexAbout />
{/if}

<style>
  .tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--line);
  }
  .tab {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 10px 16px;
    font-family: var(--display);
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-dim);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .tab:hover { color: var(--ink); }
  .tab.active { color: var(--ink); border-bottom-color: var(--signal); }
</style>
