<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '@regno/ui';
  import { architectAge, architectAgeOpen, refreshArchitectAge } from '$lib/architectAge';

  // Bar scaling caps — human years vs a centenarian, AI years vs the server's rate clamp.
  const HUMAN_CAP = 100;
  const AI_CAP = 400;

  onMount(refreshArchitectAge);

  $: age = $architectAge;
  $: humanPct = Math.max(2, Math.min(100, ((age?.humanYears ?? 0) / HUMAN_CAP) * 100));
  $: aiPct = Math.max(2, Math.min(100, ((age?.aiYears ?? 0) / AI_CAP) * 100));

  function fmtYears(n: number): string {
    return n >= 10 ? n.toFixed(0) : n.toFixed(1);
  }
</script>

<button
  class="age-widget"
  type="button"
  title="Architect age & intelligence"
  aria-label="Open architect age and intelligence popup"
  on:click={() => architectAgeOpen.set(true)}
>
  <span class="aw-head">
    <span class="aw-ic"><Icon name="architect-age" size={14} /></span>
    <span class="aw-title">Architect age</span>
  </span>

  <span class="aw-row human">
    <span class="aw-evo" aria-hidden="true">
      <Icon name="evo-h-ape" size={13} />
      <Icon name="evo-h-walker" size={13} />
      <Icon name="evo-h-astronaut" size={13} />
    </span>
    <span class="aw-track"><span class="aw-fill human" style={`width:${humanPct}%`}></span></span>
    <span class="aw-val">{age ? `${fmtYears(age.humanYears)} yrs` : '…'}</span>
  </span>

  <span class="aw-row ai">
    <span class="aw-evo" aria-hidden="true">
      <Icon name="evo-ai-abacus" size={13} />
      <Icon name="evo-ai-terminal" size={13} />
      <Icon name="evo-ai-robot" size={13} />
      <Icon name="evo-ai-brain" size={13} />
    </span>
    <span class="aw-track"><span class="aw-fill ai" style={`width:${aiPct}%`}></span></span>
    <span class="aw-val">{age ? `${fmtYears(age.aiYears)} AI yrs` : '…'}</span>
  </span>
</button>

<style>
  .age-widget {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 7px;
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: var(--r-sm);
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-family: var(--display);
    color: var(--ink-dim);
    transition: background 0.15s ease, color 0.15s ease;
  }
  .age-widget:hover {
    color: var(--ink);
    background: var(--panel-2);
  }

  .aw-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .aw-ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    flex: none;
    color: var(--signal);
  }
  .aw-title {
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .aw-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .aw-evo {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }
  .aw-row.human .aw-evo {
    color: var(--good);
  }
  .aw-row.ai .aw-evo {
    color: var(--signal);
  }

  .aw-track {
    flex: 1;
    min-width: 0;
    height: 6px;
    border-radius: 999px;
    background: var(--line);
    overflow: hidden;
  }
  .aw-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.5s ease;
  }
  .aw-fill.human {
    background: var(--good);
    box-shadow: 0 0 8px var(--signal-glow);
  }
  .aw-fill.ai {
    background: linear-gradient(90deg, var(--signal), var(--signal-2));
    box-shadow: 0 0 8px var(--signal-glow);
  }

  .aw-val {
    flex: none;
    min-width: 62px;
    text-align: right;
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--ink-faint);
    letter-spacing: 0.02em;
  }
</style>
