<script lang="ts">
  let query = '';
  let busy = false;
  let error = '';
  let results: Array<{ score: number; title: string; sourceUrl: string; text: string }> = [];

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
      if (d.ok) results = d.results;
      else error = d.error ?? 'Search failed';
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

{#if results.length === 0 && !busy && !error}
  <div class="panel" style="padding:28px; text-align:center;">
    <p class="muted">Ask anything — results surface from the seeded knowledge base.</p>
    <p class="faint small mt">(Requires <code>db:seed-brain</code> / <code>db:seed-github</code> to have run with <code>OPENAI_API_KEY</code>.)</p>
  </div>
{/if}
