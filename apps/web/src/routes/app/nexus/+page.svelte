<script lang="ts">
  let query = '';
  let busy = false;
  let error = '';
  let results: Array<{ score: number; title: string; sourceUrl: string; text: string }> = [];

  const searchIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  const syncIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

  const cubeIcon =
    '<svg viewBox="0 0 100 100"><polygon points="50,4 96,27 50,50 4,27" fill="#8d7bff"/><polygon points="50,50 96,27 96,73 50,96" fill="#6c5ce7"/><polygon points="50,50 4,27 4,73 50,96" fill="#4f3fd0"/></svg>';

  const fileIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

  const activityIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';

  const trendIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';

  const ghIcon =
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';

  const driveIcon =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 20h6.2l3.8-6.6 3.8 6.6H22L12 3z"/></svg>';

  const docIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';

  function statIcon(name: string): string {
    switch (name) {
      case 'doc':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      case 'plug':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v5"/><path d="M15 2v5"/><path d="M6 7h12v3a6 6 0 0 1-12 0V7z"/><path d="M12 16v6"/></svg>';
      case 'users':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
      case 'db':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';
      case 'pulse':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
      default:
        return '';
    }
  }

  const suggested = ['system architecture', 'api authentication', 'performance issues', 'data pipeline', 'deployment runbook'];

  const stats = [
    { label: 'Documents', value: '24,381', delta: '+124 this week', icon: 'doc', tone: 'blue' },
    { label: 'Integrations', value: '156', delta: '+13 this week', icon: 'plug', tone: 'purple' },
    { label: 'Collaborations', value: '8,712', delta: '+89 this week', icon: 'users', tone: 'green' },
    { label: 'Total Storage', value: '3.2 TB', delta: '+150 GB this week', icon: 'db', tone: 'amber' },
    { label: 'Search Health', value: '98.7%', delta: 'Healthy', icon: 'pulse', tone: 'green' },
  ];

  const sources = [
    { name: 'Github', sub: 'regnoAI', synced: 'Synced 5m ago', count: '12,942 docs', tile: ghIcon, color: '#181a22' },
    { name: 'Confluence', sub: 'Regno Internal', synced: 'Synced 5m ago', count: '3,451 docs', tile: '<b>C</b>', color: '#0052cc' },
    { name: 'Notion', sub: 'Product & Strategy', synced: 'Synced 11h ago', count: '2,156 docs', tile: '<b>N</b>', color: '#111111' },
    { name: 'Google Drive', sub: 'Shared drives', synced: 'Synced 2h ago', count: '1,845 docs', tile: driveIcon, color: '#0f1b2d' },
    { name: 'Slack', sub: 'Rego_platform_#ui', synced: 'Synced 6m ago', count: '8,712 msg', tile: '<b>S</b>', color: '#4a154b' },
    { name: 'Jira', sub: 'All projects', synced: 'Synced 15m ago', count: '4,311 issues', tile: '<b>J</b>', color: '#0052cc' },
    { name: 'Docs', sub: 'regno.ai docs', synced: 'Synced 14d ago', count: '1,176 docs', tile: docIcon, color: '#2b3a67' },
    { name: 'S3 Bucket', sub: 'regno-s3-db', synced: 'Synced 2h ago', count: '2.1 TB', tile: '<b>S3</b>', color: '#e47911' },
  ];

  const graphNodes = [
    { x: 16, y: 22, label: 'User Authentication', docs: 23, color: '#4f8dff' },
    { x: 80, y: 24, label: 'API Gateway', docs: 18, color: '#34d399' },
    { x: 9, y: 56, label: 'Rate Limiting', docs: 14, color: '#8d7bff' },
    { x: 90, y: 58, label: 'Security Policies', docs: 31, color: '#f0a944' },
    { x: 22, y: 88, label: 'Microservices', docs: 47, color: '#34d399' },
    { x: 68, y: 89, label: 'Data Pipeline', docs: 29, color: '#4f8dff' },
  ];

  const ingestions = [
    { file: 'user-authentication.md', desc: 'regnoAuth - requirements', time: '2m ago', color: '#4f8dff' },
    { file: 'architecture-overview.pdf', desc: 'System architecture - regno', time: '15m ago', color: '#f0555a' },
    { file: 'api-rate-limiting.ts', desc: 'User - integration tests', time: '28m ago', color: '#8d7bff' },
    { file: 'deployment-runbook.md', desc: 'Docs - Runbooks', time: '1h ago', color: '#4f8dff' },
    { file: 'incident-2024-05-20.md', desc: 'Confluence - Performance', time: '2h ago', color: '#f0a944' },
  ];

  const activity = [
    { action: 'Ingested 24 commits', desc: 'regnoAI/Cortex', time: '2m ago', color: '#34d399' },
    { action: 'Indexed 48 new documents', desc: 'Confluence - Architecture', time: '15m ago', color: '#4f8dff' },
    { action: 'Processed 156 new messages', desc: '#platform', time: '21m ago', color: '#8d7bff' },
    { action: 'Updated 12 issues', desc: 'regnoAI/tickets - Jira', time: '1h ago', color: '#f0a944' },
  ];

  const popular = [
    { q: 'How does authentication work?', n: 128 },
    { q: 'System architecture overview', n: 94 },
    { q: 'API rate limiting configuration', n: 72 },
    { q: 'Deployment troubleshooting', n: 61 },
    { q: 'Data pipeline schema', n: 48 },
  ];

  async function search(e?: Event) {
    e?.preventDefault();
    if (!query.trim()) return;
    busy = true;
    error = '';
    results = [];
    try {
      const r = await fetch('/api/nexus/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const d = await r.json();
      if (d.ok) results = d.results;
      else error = d.error ?? 'Search failed';
    } catch {
      error = 'Search failed — is the knowledge base seeded?';
    } finally {
      busy = false;
    }
  }

  function runSuggestion(s: string) {
    query = s;
    search();
  }
</script>

<svelte:head>
  <title>Nexus — Regno AI</title>
</svelte:head>

<div class="head">
  <div>
    <div class="eyebrow blue">Nexus</div>
    <h1>Unified knowledge base</h1>
    <p>Semantic search across everything the brain has ingested.</p>
  </div>
  <a class="btn ghost" href="/app/docs">Configure Nexus</a>
</div>

<form class="searchbar" on:submit={search}>
  <span class="search-icon">{@html searchIcon}</span>
  <input
    bind:value={query}
    placeholder="Search your docs, repos, code, tickets, conversations, and more..."
    aria-label="Search knowledge base"
  />
  <button class="btn solid" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
  <button class="btn ghost" type="button">Filters</button>
</form>

{#if error}<p class="error mb">{error}</p>{/if}

{#if results.length > 0}
  <div class="results">
    {#each results as r}
      <div class="card result">
        <div class="result-top">
          <h3>{r.title}</h3>
          <span class="tag signal mono">{(r.score * 100).toFixed(0)}%</span>
        </div>
        <p class="muted small">{r.text}…</p>
        {#if r.sourceUrl}<p class="faint mono small">{r.sourceUrl}</p>{/if}
      </div>
    {/each}
  </div>
{/if}

<div class="section-head">
  <h2>Suggested</h2>
</div>
<div class="chips">
  {#each suggested as s}
    <button class="chip" on:click={() => runSuggestion(s)}>{s}</button>
  {/each}
</div>

<div class="stat-grid">
  {#each stats as s}
    <div class="stat card">
      <div class="stat-tile" class:tone-good={s.tone === 'green'} class:tone-blue={s.tone === 'blue'} class:tone-purple={s.tone === 'purple'} class:tone-amber={s.tone === 'amber'}>
        {@html statIcon(s.icon)}
      </div>
      <div class="stat-value">{s.value}</div>
      <div class="stat-label">{s.label}</div>
      <div class="stat-delta" class:good={s.tone === 'green'}>{s.delta}</div>
    </div>
  {/each}
</div>

<div class="section-head">
  <h2>Knowledge Sources</h2>
  <a href="/app/docs">View all sources</a>
</div>
<div class="src-grid">
  {#each sources as s}
    <div class="src card">
      <div class="src-top">
        <div class="icon-tile" style="background:{s.color};">{@html s.tile}</div>
        <div class="src-meta">
          <div class="src-name">{s.name}</div>
          <div class="src-sub">{s.sub}</div>
        </div>
        <span class="sync" title="Synced">{@html syncIcon}</span>
      </div>
      <div class="src-foot">
        <span class="synced">{s.synced}</span>
        <span class="src-count">{s.count}</span>
      </div>
    </div>
  {/each}
</div>

<div class="section-head">
  <h2>Knowledge Graph</h2>
  <a href="/app/cortex">Explore graph</a>
</div>
<div class="graph card">
  <svg class="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {#each graphNodes as n}
      <line x1="50" y1="50" x2={n.x} y2={n.y} class="graph-line" />
    {/each}
  </svg>
  <div class="cube">{@html cubeIcon}</div>
  {#each graphNodes as n}
    <div class="gnode" style="left:{n.x}%; top:{n.y}%;">
      <span class="gdot" style="background:{n.color}; box-shadow:0 0 0 5px {n.color}22;"></span>
      <span class="glabel">{n.label}</span>
      <span class="gdocs">{n.docs} docs</span>
    </div>
  {/each}
</div>

<div class="lower">
  <div class="col">
    <div class="section-head">
      <h2>Recent Ingestions</h2>
      <a href="/app/docs">View all</a>
    </div>
    <div class="card list">
      {#each ingestions as it}
        <div class="row">
          <div class="icon-tile sm" style="background:{it.color}22; color:{it.color};">{@html fileIcon}</div>
          <div class="row-main">
            <div class="row-title">{it.file}</div>
            <div class="row-sub">{it.desc}</div>
          </div>
          <span class="row-time">{it.time}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="col">
    <div class="section-head">
      <h2>Recent Activity</h2>
      <a href="/app/executions">View all</a>
    </div>
    <div class="card list">
      {#each activity as a}
        <div class="row">
          <div class="icon-tile sm" style="background:{a.color}22; color:{a.color};">{@html activityIcon}</div>
          <div class="row-main">
            <div class="row-title">{a.action}</div>
            <div class="row-sub">{a.desc}</div>
          </div>
          <span class="row-time">{a.time}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="col">
    <div class="section-head">
      <h2>Popular Queries</h2>
      <a href="/app/docs">View all</a>
    </div>
    <div class="card list">
      {#each popular as p}
        <div class="row">
          <div class="icon-tile sm" style="background:rgba(108,92,231,0.14); color:var(--signal);">{@html trendIcon}</div>
          <div class="row-main">
            <div class="row-title">{p.q}</div>
          </div>
          <span class="row-count">{p.n}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 24px; margin-bottom: 26px;
  }
  .head h1 { font-size: 30px; }
  .head p { color: var(--ink-dim); margin-top: 8px; }

  .searchbar {
    display: flex; align-items: center; gap: 10px;
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 8px 10px 8px 16px; margin-bottom: 22px;
  }
  .searchbar:focus-within { border-color: var(--signal); }
  .searchbar .search-icon { color: var(--ink-faint); display: flex; flex: none; }
  .searchbar input {
    flex: 1; background: transparent; border: none; outline: none; color: var(--ink);
    font-family: var(--body); font-size: 14.5px; padding: 8px 0;
  }
  .searchbar input::placeholder { color: var(--ink-faint); }

  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; }

  .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 30px; }
  .stat { padding: 18px; }
  .stat-tile {
    width: 38px; height: 38px; border-radius: 10px; flex: none;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .stat-tile svg { width: 18px; height: 18px; }
  .stat-tile.tone-blue { background: rgba(79, 141, 255, 0.16); color: #4f8dff; }
  .stat-tile.tone-purple { background: rgba(108, 92, 231, 0.16); color: #8d7bff; }
  .stat-tile.tone-green { background: rgba(52, 211, 153, 0.16); color: #34d399; }
  .stat-tile.tone-amber { background: rgba(240, 169, 68, 0.16); color: #f0a944; }
  .stat-value { font-family: var(--display); font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
  .stat-label { color: var(--ink-dim); font-size: 13px; margin-top: 2px; }
  .stat-delta { font-family: var(--mono); font-size: 11.5px; color: var(--ink-faint); margin-top: 6px; }
  .stat-delta.good { color: var(--good); }

  .src-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 30px; }
  .src { padding: 16px; }
  .src-top { display: flex; align-items: center; gap: 12px; }
  .src-meta { min-width: 0; flex: 1; }
  .src-name { font-size: 14px; font-weight: 600; color: var(--ink); }
  .src-sub { font-size: 12.5px; color: var(--ink-faint); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sync { color: var(--signal-blue); display: flex; flex: none; }
  .sync svg { width: 15px; height: 15px; }
  .src-foot {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line-soft);
  }
  .synced { font-size: 12px; color: var(--ink-faint); display: flex; align-items: center; gap: 6px; }
  .src-count { font-family: var(--mono); font-size: 12px; color: var(--ink-dim); }

  .graph {
    position: relative; height: 340px; margin-bottom: 30px;
    background:
      radial-gradient(ellipse at center, rgba(108, 92, 231, 0.10) 0%, transparent 62%),
      var(--panel);
    overflow: hidden;
  }
  .graph-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .graph-line { stroke: #2a2f52; stroke-width: 0.6; }
  .cube { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
  .cube svg { width: 72px; height: 72px; filter: drop-shadow(0 10px 30px rgba(108, 92, 231, 0.45)); }
  .gnode {
    position: absolute; transform: translate(-50%, -50%);
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    width: 118px; text-align: center; pointer-events: none;
  }
  .gdot { width: 11px; height: 11px; border-radius: 50%; flex: none; }
  .glabel { font-size: 12.5px; font-weight: 600; color: var(--ink); line-height: 1.25; }
  .gdocs { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); }

  .lower { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; align-items: start; }
  .lower .section-head { margin: 0 0 12px; }
  .lower .section-head h2 { font-size: 10.5px; }

  .list { padding: 6px 16px; }
  .row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line-soft); }
  .row:last-child { border-bottom: none; }
  .icon-tile.sm { width: 30px; height: 30px; border-radius: 8px; font-size: 13px; }
  .icon-tile.sm svg { width: 14px; height: 14px; }
  .row-main { flex: 1; min-width: 0; }
  .row-title { font-size: 13.5px; font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-sub { font-size: 12px; color: var(--ink-faint); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-time { font-family: var(--mono); font-size: 11.5px; color: var(--ink-faint); flex: none; }
  .row-count { font-family: var(--mono); font-size: 13px; color: var(--ink-dim); flex: none; }

  .results { display: grid; gap: 14px; margin-bottom: 26px; }
  .result-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
  .result h3 { font-size: 16px; }
  .result p { margin-top: 8px; }

  @media (max-width: 1100px) {
    .stat-grid { grid-template-columns: repeat(3, 1fr); }
    .src-grid { grid-template-columns: repeat(2, 1fr); }
    .lower { grid-template-columns: 1fr; }
  }
</style>
