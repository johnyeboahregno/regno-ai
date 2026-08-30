<script lang="ts">
  import { theme, type Theme } from '$lib/ui';

  const themes: Array<{ id: Theme; name: string; desc: string; swatch: string[] }> = [
    { id: 'dark', name: 'Midnight', desc: 'Deep navy with a purple-blue signal.', swatch: ['#0a0c16', '#6c5ce7', '#8d7bff'] },
    { id: 'light', name: 'Daylight', desc: 'Clean light interface with a violet accent.', swatch: ['#f3f5fa', '#5b4be0', '#7b6bff'] },
    { id: 'tactical', name: 'Tactical', desc: 'Near-black HUD with orange & green status accents.', swatch: ['#070907', '#ff9d2e', '#3ddc84'] },
    { id: 'aurora', name: 'Aurora', desc: 'Deep blue productivity HUD with glowing blue & purple accents.', swatch: ['#0a0e1a', '#4f8dff', '#8d7bff'] },
    { id: 'nova', name: 'Nova', desc: 'Black & gold with a premium, knightly feel.', swatch: ['#0a0906', '#e3b84a', '#f2d47e'] },
    { id: 'emerald', name: 'Emerald', desc: 'Dark olive green with gold, mystical tarot feel.', swatch: ['#0c120b', '#d4af37', '#b8d48a'] },
    { id: 'matrix', name: 'Matrix', desc: 'Black & phosphor green, terminal aesthetic.', swatch: ['#010502', '#00ff66', '#22ff88'] },
  ];

  function apply(id: Theme) {
    theme.set(id);
  }
</script>

<svelte:head><title>Settings — Regno AI</title></svelte:head>

<div class="page-head">
  <div class="eyebrow blue">Settings</div>
  <h1>Preferences</h1>
  <p>Personalise how the platform looks. Changes apply instantly and are remembered on this device.</p>
</div>

<div class="field-label">Theme</div>
<div class="theme-grid">
  {#each themes as t}
    <button class="theme-card" class:active={$theme === t.id} on:click={() => apply(t.id)} aria-pressed={$theme === t.id}>
      <span class="swatch">
        {#each t.swatch as c}<i style="background:{c};"></i>{/each}
      </span>
      <span class="t-name">{t.name}</span>
      <span class="t-desc">{t.desc}</span>
    </button>
  {/each}
</div>

<style>
  .field-label {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin: 8px 0 14px;
  }
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    max-width: 760px;
  }
  .theme-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    padding: 14px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--r);
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .theme-card:hover { border-color: var(--ink-faint); }
  .theme-card.active { border-color: var(--signal); box-shadow: 0 0 0 1px var(--signal); }
  .swatch {
    display: flex;
    height: 52px;
    border: 1px solid var(--line-soft);
    border-radius: 6px;
    overflow: hidden;
  }
  .swatch i { flex: 1; }
  .t-name { font-family: var(--display); font-size: 15px; font-weight: 600; color: var(--ink); }
  .t-desc { font-size: 12.5px; color: var(--ink-dim); }
</style>
