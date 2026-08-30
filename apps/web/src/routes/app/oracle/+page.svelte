<script lang="ts">
  let query = '';
  let busy = false;
  let error = '';
  let method = '';
  let results: Array<{ score: number; title: string; sourceUrl: string; text: string; source?: string }> = [];
  let patterns: Array<{ id: string; name: string; description: string; tags: string[]; confidence: number | null; score: number }> = [];
  let graph: Array<{ id: string; name: string; tags: string[] }> = [];

  async function search(e: Event) {
    e.preventDefault();
    if (!query.trim()) return;
    busy = true;
    error = '';
    results = [];
    try {
      const r = await fetch('/api/oracle/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const d = await r.json();
      if (d.ok) {
        results = d.results ?? [];
        patterns = d.patterns ?? [];
        graph = d.graph ?? [];
        method = d.method ?? '';
      } else error = d.error ?? 'Search failed';
    } catch {
      error = 'Search failed — is the knowledge base seeded?';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Oracle — Regno AI</title>
</svelte:head>

<div class="page-head">
  <div class="eyebrow blue">Oracle</div>
  <h1>Unified knowledge base</h1>
  <p>Semantic search across everything the brain has ingested.</p>
</div>

<form on:submit={search} class="mb" style="display:flex; gap:12px;">
  <input class="input" bind:value={query} placeholder="Search your docs, repos, and knowledge…" style="flex:1;" />
  <button class="btn solid" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
</form>

{#if error}<p class="error mb">{error}</p>{/if}
{#if method}<p class="faint mono small mb">method: {method} · {patterns.length} patterns · {graph.length} graph nodes</p>{/if}

{#each results as r}
  <div class="card mb">
    <div style="display:flex; justify-content:space-between; gap:12px;">
      <h3 style="font-size:16px;">{r.title}</h3>
      <span class="tag signal mono">{(r.score * 100).toFixed(0)}%</span>
    </div>
    <p class="muted small mt">{r.text}…</p>
    {#if r.sourceUrl}<p class="faint mono small mt">{r.sourceUrl}</p>{/if}
  </div>
{/each}

{#if patterns.length}
  <div class="eyebrow blue mb">🧠 Patterns</div>
  {#each patterns as p}
    <div class="card mb">
      <div style="display:flex; justify-content:space-between; gap:12px;">
        <h3 style="font-size:15px;">{p.name}</h3>
        <span class="tag signal mono">{(p.score * 100).toFixed(0)}%</span>
      </div>
      <p class="muted small mt">{p.description}</p>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
        {#each p.tags as t}<span class="tag">{t}</span>{/each}
      </div>
    </div>
  {/each}
{/if}

{#if graph.length}
  <div class="eyebrow blue mb">🕸️ Knowledge graph</div>
  <div class="card mb">
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      {#each graph as g}
        <span class="tag signal" title={g.tags.join(', ')}>{g.name}</span>
      {/each}
    </div>
  </div>
{/if}

{#if results.length === 0 && !busy && !error}
  <div class="panel" style="padding:28px; text-align:center;">
    <p class="muted">Ask anything — results surface from the ingested knowledge base.</p>
    <p class="faint small mt">Semantic search uses <code>OPENAI_API_KEY</code> when set; keyword search works without one. Re-run <code>npm run db:seed-brain</code> after Zaeem updates his docs.</p>
  </div>
{/if}
