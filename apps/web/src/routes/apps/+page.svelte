<script lang="ts">
  import { Brand } from '@regno/ui';

  interface App {
    name: string;
    href: string | null;
    glyph: string;
    color: string;
    desc: string;
    done?: boolean;
  }

  const apps: App[] = [
    { name: 'ORACLE', href: '/app/oracle', glyph: '💬', color: '#2dd4bf', desc: 'Knowledge base' },
    { name: 'GENESIS', href: '/app/genesis', glyph: '📈', color: '#22d3ee', desc: 'Pipelines', done: true },
    { name: 'CORTEX', href: '/app/cortex', glyph: '🧠', color: '#eea23c', desc: 'Memory system', done: true },
    { name: 'STAGE', href: '/app/stage', glyph: '🗂️', color: '#3b82f6', desc: 'Projects' },
    { name: '75 Hard', href: null, glyph: '🔥', color: '#ef4444', desc: 'Separate app' },
    { name: 'SENTINEL', href: '/app/sentinel', glyph: '🛡️', color: '#f0555a', desc: 'Security' },
    { name: 'CMS', href: null, glyph: '📄', color: '#60a5fa', desc: 'Excluded' },
    { name: 'Regno.ai', href: '/app', glyph: '👁️', color: '#7c3aed', desc: 'Platform', done: true },
    { name: 'Launchpad', href: '/app/launchpad', glyph: '◆', color: '#8f7dfb', desc: 'Program' },
    { name: 'Docs', href: '/app/docs', glyph: '📚', color: '#60a5fa', desc: 'Documentation', done: true },
  ];
</script>

<svelte:head><title>Regno AI — Choose Your Application</title></svelte:head>

<div class="chooser">
  <header class="chooser-head">
    <Brand />
    <span class="faint mono small">Choose your application</span>
  </header>

  <div class="grid">
    {#each apps as a}
      {#if a.href}
        <a class="tile" href={a.href} style={`--c:${a.color}`}>
          <span class="glyph" style={`background:${a.color}22; color:${a.color};`}>{a.glyph}</span>
          <span class="label">{a.name}</span>
          <span class="desc">{a.desc}</span>
          {#if a.done}<span class="check">✓</span>{/if}
        </a>
      {:else}
        <div class="tile off" style={`--c:${a.color}`}>
          <span class="glyph" style={`background:${a.color}22; color:${a.color}; opacity:.5;`}>{a.glyph}</span>
          <span class="label faint">{a.name}</span>
          <span class="desc faint">{a.desc}</span>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .chooser {
    min-height: 100vh;
    padding: 28px 32px;
    background: linear-gradient(180deg, #171033 0%, #0a0e15 45%, #0b1f1e 100%);
  }
  .chooser-head {
    max-width: 960px;
    margin: 0 auto 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .grid {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 16px;
  }
  .tile {
    position: relative;
    background: #12192c;
    border: 1px solid #22304a;
    border-radius: 16px;
    padding: 20px 16px;
    text-align: center;
    text-decoration: none;
    color: var(--ink);
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .tile:hover { transform: translateY(-3px); border-color: var(--c); }
  .tile.off { opacity: 0.45; }
  .glyph {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  .label {
    display: block;
    margin-top: 12px;
    font-family: var(--display);
    font-weight: 600;
    font-size: 15px;
    color: var(--ink);
  }
  .desc { display: block; font-family: var(--mono); font-size: 11px; color: var(--ink-faint); margin-top: 4px; }
  .check {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--good);
    color: #04120c;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  @media (max-width: 640px) {
    .chooser {
      padding: 20px 16px;
    }
    .chooser-head {
      flex-wrap: wrap;
      gap: 8px;
    }
  }
</style>
