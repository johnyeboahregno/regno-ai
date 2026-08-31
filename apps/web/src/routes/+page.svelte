<script lang="ts">
  import { onMount } from 'svelte';
  import Brand from '$lib/Brand.svelte';
  import NeuralBackground from '$lib/NeuralBackground.svelte';
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
  <meta name="description" content="Your AI subject-matter architect — a self-hosted Regno platform powered by a CORTEX brain and Cortex Flow reasoning." />
</svelte:head>

<NeuralBackground />

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

<main class="wrap landing">
  <!-- Hero -->
  <section class="hero">
    <div class="hero-scrim" aria-hidden="true"></div>

    <div class="eyebrow blue">
      <span class="eyebrow-dot" aria-hidden="true"></span>
      Personal · Self-hosted · Cortex-powered
    </div>

    <h1>
      Your intelligent
      <em>subject-matter architect</em>.
    </h1>

    <p class="muted lead">
      Bring any subject — a codebase, a domain, a discipline — and Regno becomes its architect.
      A CORTEX brain, Cortex Flow reasoning, and the three-store data layer compound everything
      it learns, so it gets sharper with every run.
    </p>

    <div class="cta">
      <a class="btn solid lg" href={user ? '/app' : '/register'}>Get started</a>
      <a class="btn ghost lg" href="#architecture">Explore the stack</a>
    </div>

    <!-- floating telemetry chips -->
    <div class="chips" aria-hidden="true">
      <span class="chip c1"><i class="dot good"></i> CORTEX online</span>
      <span class="chip c2"><i class="dot signal"></i> 3 stores · synced</span>
      <span class="chip c3"><i class="dot amber"></i> memory compounding</span>
    </div>

    <a class="scroll-cue" href="#capabilities" aria-label="Scroll to capabilities">
      <span class="cue-line"></span>
    </a>
  </section>

  <!-- Capabilities -->
  <section id="capabilities" class="block">
    <div class="eyebrow blue">Capabilities</div>
    <h2>One engine, three stores, compounding memory.</h2>
    <div class="grid grid-3 mt2">
      <div class="card feat">
        <span class="feat-ico">🧠</span>
        <h3>CORTEX</h3>
        <p class="muted small">Patterns, memories, wisdom — the compounding brain that gets sharper with every run.</p>
      </div>
      <div class="card feat">
        <span class="feat-ico">🌊</span>
        <h3>Cortex Flow</h3>
        <p class="muted small">Agents · tools · orchestration · quality loop — one strong reasoning pass with a full toolkit.</p>
      </div>
      <div class="card feat">
        <span class="feat-ico">🗄️</span>
        <h3>Data layer</h3>
        <p class="muted small">MongoDB · Qdrant · Neo4j · Redis — three-store sync, eventual within seconds.</p>
      </div>
    </div>
  </section>

  <!-- Architecture -->
  <section id="architecture" class="block last">
    <div class="eyebrow blue">Architecture</div>
    <h2>Built to run on a single bare-metal box.</h2>
    <div class="panel stack">
      <span class="stack-line">Caddy → SvelteKit app + API · Realtime SSE · Execution workers</span>
      <span class="stack-line">└─ MongoDB (documents) · Qdrant (vectors) · Neo4j (graph) · Redis (queues + pub/sub)</span>
    </div>
  </section>
</main>

<style>
  .landing { position: relative; z-index: 1; }

  /* ── Hero ─────────────────────────────────────────────────────── */
  .hero {
    position: relative;
    min-height: 92vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 140px 0 40px;
  }
  .hero-scrim {
    position: absolute;
    left: -20%;
    top: 50%;
    width: 70%;
    height: 120%;
    transform: translateY(-50%);
    background: radial-gradient(ellipse at 40% 50%, var(--bg) 20%, transparent 75%);
    pointer-events: none;
  }

  .eyebrow-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--signal);
    box-shadow: 0 0 12px var(--signal-glow);
    animation: blink 2.6s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .hero h1 {
    font-size: clamp(2.6rem, 6vw, 4.6rem);
    max-width: 16ch;
    margin: 24px 0 24px;
    position: relative;
    z-index: 1;
  }
  .hero h1 em {
    font-style: normal;
    background: linear-gradient(92deg, var(--signal), var(--signal-2) 55%, var(--signal-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    background-size: 200% 100%;
    animation: sheen 6s ease-in-out infinite;
  }
  @keyframes sheen {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .lead {
    max-width: 58ch;
    font-size: 1.18rem;
    position: relative;
    z-index: 1;
  }

  .cta {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 36px;
    position: relative;
    z-index: 1;
  }
  .btn.lg { padding: 13px 24px; font-size: 15px; }

  .chips {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 44px;
    position: relative;
    z-index: 1;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-dim);
    padding: 9px 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in srgb, var(--panel) 72%, transparent);
    backdrop-filter: blur(8px);
    animation: floaty 7s ease-in-out infinite;
  }
  .chip.c1 { animation-delay: 0s; }
  .chip.c2 { animation-delay: -2.3s; }
  .chip.c3 { animation-delay: -4.6s; }
  @keyframes floaty {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-7px); }
  }

  .scroll-cue {
    position: absolute;
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    width: 26px;
    height: 44px;
    border: 1.5px solid var(--line);
    border-radius: 999px;
    display: flex;
    justify-content: center;
    padding-top: 8px;
    transition: border-color 0.2s ease;
  }
  .scroll-cue:hover { border-color: var(--signal); }
  .cue-line {
    width: 2px;
    height: 10px;
    border-radius: 2px;
    background: var(--signal);
    animation: cue 1.8s ease-in-out infinite;
  }
  @keyframes cue {
    0% { transform: translateY(0); opacity: 1; }
    70% { transform: translateY(14px); opacity: 0; }
    100% { transform: translateY(0); opacity: 0; }
  }

  /* ── Sections ─────────────────────────────────────────────────── */
  .block { padding: 88px 0; }
  .block.last { padding-bottom: 120px; }
  .block h2 { font-size: clamp(1.6rem, 3.4vw, 2.2rem); margin-top: 16px; max-width: 24ch; }

  .card.feat {
    padding: 26px 22px;
    transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  }
  .card.feat:hover {
    transform: translateY(-4px);
    border-color: var(--signal);
    box-shadow: 0 18px 44px -18px var(--signal-glow);
  }
  .feat-ico { font-size: 22px; display: block; margin-bottom: 12px; }
  .card.feat h3 { font-size: 17px; }
  .card.feat p { margin-top: 8px; }

  .panel.stack {
    padding: 22px 24px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-dim);
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-left: 2px solid var(--signal);
  }

  @media (max-width: 640px) {
    .hero { min-height: 86vh; padding-top: 110px; }
    .hero-scrim { left: -40%; width: 120%; }
    .block { padding: 60px 0; }
    .block.last { padding-bottom: 80px; }
  }
</style>
