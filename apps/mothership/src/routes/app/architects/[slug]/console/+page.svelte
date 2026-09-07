<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';

  // $page.params is a union across sibling routes (the /app/architects list has no
  // :slug), so narrow it for this /[slug]/console page.
  const slug = $page.params.slug as string;

  type Line = { id: number; kind: 'cmd' | 'out' | 'err' | 'info' | 'live'; text: string };
  let lines: Line[] = [];
  let nextId = 1;
  let input = '';
  let busy = false;
  let termBodyEl: HTMLDivElement | undefined = undefined;
  let config = {
    architect: null as { slug: string; mode: string; host: string; cluster: string | null; namespace: string | null } | null,
    kubeconfigConfigured: false,
    consoleReady: false,
  };
  let cmdIndex = 0;
  let history: string[] = [];
  let livePod = '';
  let liveContainer = '';
  let liveActive = false;
  let liveAbort: AbortController | null = null;

  type PodSum = { name: string; phase: string; ready: string; restarts: number; age: string; containers: string[] };
  type WorkloadSum = { name: string; desired: number; ready: number; available: number };
  type SvcSum = { name: string; type: string; clusterIP: string; ports: string[] };
  let showWorkloads = false;
  let workloadsLoading = false;
  let workloadsError = '';
  let workloads: { pods: PodSum[]; deployments: WorkloadSum[]; statefulsets: WorkloadSum[]; services: SvcSum[] } | null = null;

  async function loadWorkloads() {
    if (!config.consoleReady) return;
    workloadsLoading = true;
    workloadsError = '';
    try {
      const r = await fetch(`/api/architects/${slug}/console?view=workloads`);
      const d = await r.json();
      if (!d.ok) workloadsError = d.error ?? 'Failed to load workloads';
      else workloads = d.workloads;
    } catch {
      workloadsError = 'Failed to load workloads';
    } finally {
      workloadsLoading = false;
    }
  }

  function toggleWorkloads() {
    showWorkloads = !showWorkloads;
    if (showWorkloads && !workloads) void loadWorkloads();
  }

  function followPod(name: string) {
    livePod = name;
    liveContainer = '';
    if (!liveActive) void toggleLive();
  }

  function restartWorkload(kind: 'deployment' | 'statefulset', name: string) {
    if (!window.confirm(`rollout restart ${kind}/${name}?`)) return;
    void run(`rollout restart ${kind}/${name}`);
    void loadWorkloads();
  }

  const QUICK = [
    'get pods',
    'get deployments',
    'get statefulsets',
    'get svc',
    'get events',
    'top pods',
    'top nodes',
    'logs ',
    'describe pod ',
    'rollout restart deployment/',
    'delete pod ',
  ];

  function push(text: string, kind: Line['kind'] = 'out') {
    lines = [...lines, { id: nextId++, kind, text }].slice(-600); // cap terminal output
    void scrollBottom();
  }

  async function scrollBottom() {
    await tick();
    if (termBodyEl) termBodyEl.scrollTop = termBodyEl.scrollHeight;
  }

  function stopLive() {
    liveActive = false;
    liveAbort?.abort();
    liveAbort = null;
  }

  /** Tail a pod's logs live over SSE (`kubectl logs -f`), appended into the terminal. */
  async function toggleLive() {
    if (liveActive) {
      stopLive();
      push('live log stream stopped', 'info');
      return;
    }
    const pod = livePod.trim();
    if (!pod) {
      push('enter a pod name to follow its logs', 'err');
      return;
    }
    const container = liveContainer.trim();
    liveActive = true;
    push(`[live] kubectl logs -f ${pod}${container ? ' -c ' + container : ''} — streaming…`, 'live');

    const ac = new AbortController();
    liveAbort = ac;
    const q = new URLSearchParams({ stream: 'logs', pod, tail: '200' });
    if (container) q.set('container', container);
    try {
      const r = await fetch(`/api/architects/${slug}/console?${q.toString()}`, { signal: ac.signal });
      if (!r.ok || !r.body) {
        push(`live logs failed (HTTP ${r.status})`, 'err');
        liveActive = false;
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!block.startsWith('data:')) continue; // SSE comment / heartbeat
          try {
            const ev = JSON.parse(block.replace(/^data:\s*/, '')) as {
              line?: string; err?: string; done?: boolean; code?: number; command?: string;
            };
            if (ev.command) push(`[live] ${ev.command}`, 'live');
            if (ev.line) push(ev.line, 'out');
            if (ev.err) push(`[kubectl] ${ev.err}`, 'err');
            if (ev.done) { push(`live log stream ended (code ${ev.code ?? 0})`, 'info'); liveActive = false; return; }
          } catch { /* skip malformed frame */ }
        }
      }
      if (!ac.signal.aborted) push('live log stream closed', 'info');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        push(`live logs failed: ${(e as Error).message ?? e}`, 'err');
      }
    } finally {
      liveActive = false;
      liveAbort = null;
    }
  }

  async function run(raw?: string) {
    const command = (raw ?? input).trim();
    if (!command || busy) return;
    input = '';
    busy = true;
    push(`kubectl ${command}`, 'cmd');
    try {
      const r = await fetch(`/api/architects/${slug}/console`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const d = await r.json();
      if (!d.ok) {
        push(d.error ?? 'Request failed', 'err');
      } else {
        if (d.code !== 0 && d.stderr.trim()) push(d.stderr.trimEnd(), 'err');
        if (d.stdout.trim()) push(d.stdout.trimEnd(), 'out');
        if (d.code !== 0 && !d.stderr.trim()) push(`exited ${d.code}`, 'err');
      }
    } catch {
      push('Console request failed (server unreachable?)', 'err');
    } finally {
      busy = false;
      history = [...history.filter((h) => h !== command), command];
    }
  }

  async function load() {
    try {
      const r = await fetch(`/api/architects/${slug}/console`);
      const d = await r.json();
      if (!d.ok) {
        push(d.error ?? 'Failed to load console config', 'err');
        return;
      }
      config = d;
      const a = d.architect;
      push(
        `Architect ${a.slug} · ${a.mode} · context ${a.cluster ?? '—'} · ns ${a.namespace ?? '—'} · host ${a.host}`,
        'info',
      );
      if (!d.consoleReady) {
        const reasons: string[] = [];
        if (a.mode !== 'k3s') reasons.push('mode is not k3s');
        if (!a.cluster || !a.namespace) reasons.push('no cluster context / namespace set');
        if (!d.kubeconfigConfigured) reasons.push('no KUBECONFIG in the vault');
        push(`Console not ready: ${reasons.join('; ')}. Open the wizard (k3s mode) to configure it.`, 'err');
        return;
      }
      push('Connected. Type a command or pick a shortcut below.', 'info');
      void run('get pods');
    } catch {
      push('Failed to load console config', 'err');
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { void run(); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdIndex > 0) cmdIndex -= 1;
      input = history[history.length - 1 - cmdIndex] ?? '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdIndex += 1;
      if (cmdIndex >= history.length) { cmdIndex = history.length; input = ''; }
      else input = history[history.length - 1 - cmdIndex] ?? '';
    }
  }

  function insert(prefix: string) {
    input = prefix;
    cmdIndex = 0;
  }

  onMount(() => {
    load();
  });
  onDestroy(() => {
    stopLive();
  });
</script>

<svelte:head><title>Console · {slug} — Regno</title></svelte:head>

<div class="page-head" style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
  <div>
    <div class="eyebrow blue"><a class="back" href="/app/architects" style="text-decoration:none;">← Architects</a></div>
    <h1 style="margin:2px 0 6px;">Cluster console · <span class="mono">{slug}</span></h1>
    {#if config.architect}
      <p class="muted small" style="margin:0;">
        <span class="mono">{config.architect.cluster ?? '—'}</span> /
        <span class="mono">{config.architect.namespace ?? '—'}</span>
        · {config.architect.mode} · {config.architect.host}
        · <span class:signal={config.consoleReady} class:error={!config.consoleReady}>{config.consoleReady ? 'ready' : 'not configured'}</span>
      </p>
    {/if}
  </div>
  <div style="display:flex; gap:8px;">
    <button class="btn ghost" on:click={toggleWorkloads}>{showWorkloads ? 'Hide workloads' : 'Workloads'}</button>
    <button class="btn ghost" on:click={() => (lines = [])}>Clear</button>
    <a class="btn ghost" href="/app/architects">Close</a>
  </div>
</div>

{#if showWorkloads}
  <div class="panel workloads">
    <div class="wl-head">
      <div class="eyebrow blue">Workloads <span class="muted mono">· ns {config.architect?.namespace ?? '—'}</span></div>
      <button class="btn ghost" on:click={() => void loadWorkloads()} disabled={workloadsLoading}>
        {workloadsLoading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
    {#if workloadsError}<p class="error small">{workloadsError}</p>{/if}
    {#if workloads}
      <div class="wl-group">
        <div class="section-label">Pods ({workloads.pods.length})</div>
        {#if workloads.pods.length === 0}
          <p class="faint small">none</p>
        {:else}
          <table>
            <thead><tr><th>Name</th><th>Ready</th><th>Phase</th><th>Restarts</th><th>Age</th><th></th></tr></thead>
            <tbody>
              {#each workloads.pods as pod}
                <tr>
                  <td class="mono">{pod.name}</td>
                  <td>{pod.ready}</td>
                  <td>
                    <span class="tag" class:signal={pod.phase === 'Running'} class:error={pod.phase === 'Failed'}>{pod.phase}</span>
                  </td>
                  <td>{pod.restarts}</td>
                  <td>{pod.age}</td>
                  <td class="row-actions">
                    <button class="btn ghost icon-sm" title="Follow logs (live)" on:click={() => followPod(pod.name)}>▶ logs</button>
                    <button class="btn ghost icon-sm" title="describe" on:click={() => void run(`describe pod ${pod.name}`)}>describe</button>
                    <button class="btn ghost icon-sm danger-text" title="delete pod" on:click={() => { if (window.confirm(`delete pod ${pod.name}?`)) void run(`delete pod ${pod.name}`); }}>✕</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <div class="wl-group">
        <div class="section-label">Deployments ({workloads.deployments.length})</div>
        {#if workloads.deployments.length === 0}
          <p class="faint small">none</p>
        {:else}
          <table>
            <thead><tr><th>Name</th><th>Ready</th><th>Desired</th><th>Available</th><th></th></tr></thead>
            <tbody>
              {#each workloads.deployments as dep}
                <tr>
                  <td class="mono">{dep.name}</td>
                  <td>{dep.ready}/{dep.desired}</td>
                  <td>{dep.desired}</td>
                  <td>{dep.available}</td>
                  <td class="row-actions">
                    <button class="btn ghost icon-sm" title="Rollout restart" on:click={() => restartWorkload('deployment', dep.name)}>restart</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <div class="wl-group">
        <div class="section-label">StatefulSets ({workloads.statefulsets.length})</div>
        {#if workloads.statefulsets.length === 0}
          <p class="faint small">none</p>
        {:else}
          <table>
            <thead><tr><th>Name</th><th>Ready</th><th>Desired</th><th>Available</th><th></th></tr></thead>
            <tbody>
              {#each workloads.statefulsets as sts}
                <tr>
                  <td class="mono">{sts.name}</td>
                  <td>{sts.ready}/{sts.desired}</td>
                  <td>{sts.desired}</td>
                  <td>{sts.available}</td>
                  <td class="row-actions">
                    <button class="btn ghost icon-sm" title="Rollout restart" on:click={() => restartWorkload('statefulset', sts.name)}>restart</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <div class="wl-group">
        <div class="section-label">Services ({workloads.services.length})</div>
        {#if workloads.services.length === 0}
          <p class="faint small">none</p>
        {:else}
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>ClusterIP</th><th>Ports</th></tr></thead>
            <tbody>
              {#each workloads.services as svc}
                <tr>
                  <td class="mono">{svc.name}</td>
                  <td>{svc.type}</td>
                  <td class="mono">{svc.clusterIP || '—'}</td>
                  <td class="mono">{svc.ports.join(', ') || '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    {:else if !workloadsLoading}
      <p class="faint small mt">Click <strong>Refresh</strong> to load the namespace inventory.</p>
    {/if}
  </div>
{/if}

<div class="panel term">
  <div class="term-body" bind:this={termBodyEl}>
    {#each lines as l (l.id)}
      <div class="term-line" class:cmd={l.kind === 'cmd'} class:err={l.kind === 'err'} class:info={l.kind === 'info'} class:live={l.kind === 'live'}>
        {#if l.kind === 'cmd'}<span class="ps">➜ </span>{/if}{l.text}
      </div>
    {/each}
    {#if busy}
      <div class="term-line info"><span class="spinner">●</span> running…</div>
    {/if}
    {#if liveActive}
      <div class="term-line live"><span class="live-dot active">●</span> streaming <span class="mono">{livePod || '…'}</span> — click Stop to end</div>
    {/if}
  </div>
  <div class="term-input-row">
    <span class="ps">➜</span>
    <input
      class="term-input"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      bind:value={input}
      on:keydown={onKeydown}
      on:input={() => (cmdIndex = 0)}
      placeholder="kubectl get pods — try get deployments, top pods, logs <pod>…"
      aria-label="kubectl command"
    />
    <button class="btn solid" on:click={() => void run()} disabled={busy || !config.consoleReady}>Run</button>
  </div>
  <div class="term-live-row">
    <span class="live-dot" class:active={liveActive}>●</span>
    <span class="faint small" style="flex:none;">Follow logs:</span>
    <input
      class="term-input mono"
      placeholder="pod name"
      aria-label="pod name"
      autocomplete="off"
      spellcheck="false"
      bind:value={livePod}
      style="max-width:230px;"
    />
    <input
      class="term-input mono"
      placeholder="container (optional)"
      aria-label="container"
      autocomplete="off"
      spellcheck="false"
      bind:value={liveContainer}
      style="max-width:180px;"
    />
    <button
      class="btn"
      style={liveActive ? 'border-color:var(--danger); color:var(--danger);' : ''}
      on:click={() => void toggleLive()}
      disabled={!config.consoleReady || busy}
    >{liveActive ? 'Stop' : 'Follow logs'}</button>
  </div>
  <div class="term-quick">
    {#each QUICK as q}
      <button class="chip" on:click={() => insert(q)}>{q.trim() === q ? q : '…'}</button>
    {/each}
  </div>
</div>

<style>
  .back { color: var(--signal-blue); }
  .term { display: flex; flex-direction: column; overflow: hidden; }
  .term-body {
    background: #0b0e17;
    border: 1px solid var(--line);
    border-radius: 10px 10px 0 0;
    padding: 12px 14px;
    min-height: 320px;
    max-height: 58vh;
    overflow-y: auto;
    font-family: var(--mono);
    font-size: 12.5px;
    line-height: 1.55;
  }
  .term-line { white-space: pre-wrap; word-break: break-word; color: #c9d1e4; }
  .term-line.cmd { color: #7ce38b; margin-top: 6px; }
  .term-line.err { color: #ff7a7a; }
  .term-line.info { color: #8d9bb8; }
  .term-line.live { color: #7ce38b; }
  .ps { color: var(--signal-blue); user-select: none; }
  .spinner { display: inline-block; animation: pulse 1s infinite; color: var(--signal); }
  .live-dot { color: #8d9bb8; font-size: 10px; flex: none; }
  .live-dot.active { color: #ff5b6a; animation: pulse 1s infinite; }
  @keyframes pulse { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
  .term-input-row { display: flex; gap: 8px; align-items: center; background: #0b0e17; border: 1px solid var(--line); border-top: 1px solid var(--line-soft); padding: 8px 10px; }
  .term-input {
    flex: 1; background: transparent; border: 0; outline: none; color: #e6e9f2;
    font-family: var(--mono); font-size: 13px;
  }
  .term-live-row {
    display: flex; gap: 8px; align-items: center; background: #0b0e17;
    border: 1px solid var(--line); border-top: 0; border-radius: 0 0 10px 10px;
    padding: 8px 10px; flex-wrap: wrap;
  }
  .term-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip {
    background: var(--panel-2); border: 1px solid var(--line-soft); color: var(--ink-dim);
    border-radius: 999px; padding: 3px 10px; font-family: var(--mono); font-size: 11px; cursor: pointer;
  }
  .chip:hover { border-color: var(--signal); color: var(--ink); }
  .signal { color: var(--good); }
  .error { color: var(--danger); }
  a.btn { text-decoration: none; }

  .workloads { padding: 14px; margin-bottom: 14px; max-height: 40vh; overflow-y: auto; }
  .wl-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .wl-group { margin-top: 14px; }
  .section-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 6px; }
  .workloads table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .workloads th { text-align: left; color: var(--ink-faint); font-family: var(--mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 8px; border-bottom: 1px solid var(--line-soft); }
  .workloads td { padding: 5px 8px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
  .workloads tr:last-child td { border-bottom: 0; }
  .row-actions { white-space: nowrap; text-align: right; }
  .icon-sm { padding: 2px 8px; font-size: 11px; }
  .danger-text { color: var(--danger); }
  .workloads table { margin-top: 0; }
</style>
