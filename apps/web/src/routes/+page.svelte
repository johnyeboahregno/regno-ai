<script lang="ts">
  import { onMount } from 'svelte';
  import Brand from '$lib/Brand.svelte';
  let user: { email: string; role: string } | null = null;

  onMount(async () => {
    try {
      const r = await fetch('/api/auth/me');
      const d = await r.json();
      user = d.user;
    } catch {
      user = null;
    }
  });
</script>

<svelte:head>
  <title>Regno Architect Me</title>
  <meta name="description" content="A fresh, self-hosted Regno platform rebuilt from the regno.ai docs" />
</svelte:head>

<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="/"><Brand /></a>
    <nav class="nav-links">
      <a href="#capabilities">Capabilities</a>
      <a href="#architecture">Architecture</a>
      {#if user}
        <a class="btn solid" href="/app" style="padding:8px 18px;">Open app</a>
      {:else}
        <a href="/login">Sign in</a>
        <a class="btn solid" href="/register" style="padding:8px 18px;">Create account</a>
      {/if}
    </nav>
  </div>
</header>

<main class="wrap">
  <section style="padding:100px 0 48px; position:relative; overflow:hidden;">
    <div style="position:absolute; top:-10%; right:-10%; width:600px; height:600px; background:radial-gradient(circle, rgba(91,110,245,0.16) 0%, transparent 70%); pointer-events:none;"></div>
    <div class="eyebrow blue">Personal · Self-hosted · Cortex-powered</div>
    <h1 style="font-size:clamp(2.2rem, 5vw, 4rem); max-width:18ch; margin:22px 0 24px;">
      Your intelligent
      <em style="font-style:normal; background:linear-gradient(90deg, var(--signal), var(--signal-2)); -webkit-background-clip:text; background-clip:text; color:transparent;">workflow companion</em>.
    </h1>
    <p class="muted" style="max-width:60ch; font-size:1.15rem; margin-bottom:16px;">
      A fresh Regno platform — CORTEX brain, Cortex Flow reasoning, and the three-store data layer —
      that learns from your coding history and builds faster over time.
    </p>
    <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:32px;">
      <a class="btn solid" href={user ? '/app' : '/register'}>Get started</a>
      <a class="btn ghost" href="#architecture">Explore the stack</a>
    </div>
  </section>

  <section id="capabilities" style="padding:64px 0;">
    <div class="eyebrow blue">Capabilities</div>
    <h2 class="mt" style="font-size:2rem;">One engine, three stores, compounding memory.</h2>
    <div class="grid grid-3 mt2">
      <div class="card">
        <h3 style="font-size:17px;">🧠 CORTEX</h3>
        <p class="muted small mt">Patterns, memories, wisdom — the compounding brain that gets sharper with every run.</p>
      </div>
      <div class="card">
        <h3 style="font-size:17px;">🌊 Cortex Flow</h3>
        <p class="muted small mt">Agents · tools · orchestration · quality loop — one strong reasoning pass with a full toolkit.</p>
      </div>
      <div class="card">
        <h3 style="font-size:17px;">🗄️ Data layer</h3>
        <p class="muted small mt">MongoDB · Qdrant · Neo4j · Redis — three-store sync, eventual within seconds.</p>
      </div>
    </div>
  </section>

  <section id="architecture" style="padding:64px 0 96px;">
    <div class="eyebrow blue">Architecture</div>
    <h2 class="mt" style="font-size:2rem;">Built to run on a single bare-metal box.</h2>
    <div class="panel mt2" style="padding:24px; font-family:var(--mono); font-size:13px; color:var(--ink-dim); line-height:2.2;">
      Caddy → SvelteKit app + API · Realtime SSE · Execution workers<br />
      └─ MongoDB (documents) · Qdrant (vectors) · Neo4j (graph) · Redis (queues + pub/sub)
    </div>
  </section>
</main>
