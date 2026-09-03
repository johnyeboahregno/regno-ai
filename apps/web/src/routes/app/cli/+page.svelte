<script lang="ts">
  import { afterUpdate, onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { theme, THEMES, type Theme } from '@regno/ui';
  import { marked } from 'marked';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type LineKind = 'cmd' | 'info' | 'ok' | 'err' | 'muted' | 'banner' | 'md';

  interface Line {
    id: number;
    kind: LineKind;
    text: string;
  }

  interface CliSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    lines: Line[];
    history: string[];
    nextId: number;
  }

  let lines: Line[] = [];
  let input = '';
  let history: string[] = [];
  let histIdx = -1;
  let busy = false;
  let nextId = 1;
  let sessions: CliSession[] = [];
  let activeSessionId = '';

  let out: HTMLDivElement;
  let inputEl: HTMLInputElement;

  // Active SMA for architect jobs — persisted across sessions.
  let sma = 'base';
  let smas: Array<{ slug: string; name: string; developer?: string }> = [
    { slug: 'base', name: 'Base Regno Architect', developer: 'base' },
  ];

  const local = (data.user.email.split('@')[0] || 'you').toLowerCase();
  const promptText = `${local}@regno:~$`;
  const SESSIONS_KEY = `regno.cli.sessions.${data.user.email}`;
  const ACTIVE_SESSION_KEY = `regno.cli.activeSession.${data.user.email}`;

  // ---- helpers -------------------------------------------------------------
  function sessionTitle(session: CliSession): string {
    const command = [...session.lines].reverse().find((line) => line.kind === 'cmd')?.text.replace(promptText, '').trim();
    return command ? command.slice(0, 36) : session.title;
  }

  function persistSessions() {
    if (!activeSessionId) return;
    const now = new Date().toISOString();
    sessions = sessions.map((session) =>
      session.id === activeSessionId
        ? { ...session, lines, history, nextId, updatedAt: now, title: sessionTitle({ ...session, lines }) }
        : session,
    );
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
  }

  function createSession(activate = true): CliSession {
    const now = new Date().toISOString();
    const session: CliSession = {
      id: crypto.randomUUID(),
      title: `CLI session ${sessions.length + 1}`,
      createdAt: now,
      updatedAt: now,
      lines: [],
      history: [],
      nextId: 1,
    };
    sessions = [session, ...sessions];
    if (activate) activateSession(session.id);
    return session;
  }

  async function activateSession(id: string) {
    const session = sessions.find((candidate) => candidate.id === id);
    if (!session) return;
    activeSessionId = session.id;
    lines = session.lines;
    history = session.history;
    nextId = session.nextId;
    histIdx = -1;
    input = '';
    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    await scrollToBottom();
  }

  function startNewSession() {
    createSession(true);
    push('muted', 'New CLI session — type "help" for commands');
    focusInput();
    scrollToBottom();
  }

  function deleteSession(session: CliSession, event?: MouseEvent) {
    event?.stopPropagation();
    if (sessions.length === 1) {
      sessions = [];
      createSession(true);
      push('muted', 'New CLI session — type "help" for commands');
      persistSessions();
      return;
    }
    sessions = sessions.filter((candidate) => candidate.id !== session.id);
    if (session.id === activeSessionId) {
      const next = sessions[0];
      void activateSession(next.id);
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  function loadSessions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as CliSession[];
      sessions = Array.isArray(parsed) ? parsed : [];
    } catch {
      sessions = [];
    }
    if (!sessions.length) createSession(false);
    const savedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
    const active = sessions.find((session) => session.id === savedActive) ?? sessions[0];
    void activateSession(active.id);
  }

  function push(kind: LineKind, text: string) {
    lines = [...lines, { id: nextId++, kind, text }];
    persistSessions();
  }
  function pushMany(kind: LineKind, text: string) {
    for (const t of text.split('\n')) push(kind, t);
  }
  async function scrollToBottom() {
    await tick();
    if (out) out.scrollTop = out.scrollHeight;
  }

  afterUpdate(() => {
    if (out) out.scrollTop = out.scrollHeight;
  });

  function renderMarkdown(md: string): string {
    return marked.parse(md, { async: false }) as string;
  }

  function fmtTokens(n: number | undefined): string {
    const v = n ?? 0;
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
    return String(v);
  }
  function fmtDate(ts: unknown): string {
    if (!ts) return '—';
    const d = new Date(ts as string | number);
    if (isNaN(d.getTime())) return '—';
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }

  // ---- command registry ----------------------------------------------------
  interface Cmd {
    usage: string;
    desc: string;
    detail: string;
    run: (args: string[], raw: string) => Promise<void> | void;
  }

  const commands: Record<string, Cmd> = {
    help: {
      usage: '[command]',
      desc: 'list commands or show help for one',
      detail:
        'List every available command, or show detailed usage for a single command.\n\n  help            list all commands\n  help <command>  detailed usage for one command',
      run(args) {
        if (args[0]) {
          const name = resolve(args[0].toLowerCase());
          const c = name ? commands[name] : undefined;
          if (c) {
            push('info', '');
            push('cmd', `  ${name} ${c.usage}`.replace(/\s+/g, ' ').trim());
            push('info', `  ${c.desc}`);
            push('muted', '');
            pushMany('muted', c.detail);
          } else {
            push('err', `no help for: ${args[0]}`);
            push('muted', 'type "help" to list available commands.');
          }
          return;
        }
        push('info', 'Available commands:');
        const names = Object.keys(commands).sort();
        for (const n of names) {
          push('cmd', `  ${n.padEnd(12)} ${commands[n].desc}`);
        }
        push('muted', '');
        push('muted', 'Tips:  ↑/↓ recall history   ·   Tab autocomplete   ·   Ctrl+L clear   ·   "help <cmd>" for details');
      },
    },
    clear: {
      usage: '',
      desc: 'clear the terminal screen',
      detail: 'Clear the screen.\n\n  clear\n\nAliases: cls · Shortcut: Ctrl+L.',
      run() {
        lines = [];
      },
    },
    whoami: {
      usage: '',
      desc: 'print current session identity',
      detail: 'Show the logged-in user, role and active SMA.\n\n  whoami',
      run() {
        push('info', `user    ${data.user.email}`);
        push('info', `role    ${data.user.role}`);
        push('info', `sma     ${sma}`);
      },
    },
    date: {
      usage: '',
      desc: 'print current date and time',
      detail: 'Show the current date and time.\n\n  date',
      run() {
        push('info', new Date().toString());
      },
    },
    echo: {
      usage: '<text…>',
      desc: 'echo text back to the screen',
      detail: 'Echo text back.\n\n  echo hello world',
      run(args, raw) {
        const rest = raw.includes(' ') ? raw.slice(raw.indexOf(' ') + 1).trim() : '';
        push('info', rest || '');
      },
    },
    health: {
      usage: '',
      desc: 'report system, database and usage status',
      detail:
        'Report database / queue / SMTP status plus AI usage & cost.\n\n  health\n\nAliases: status.',
      async run() {
        push('info', '» checking system health…');
        try {
          const r = await fetch('/api/health');
          const d = await r.json();
          if (!d.ok) {
            push('err', 'health check failed');
            return;
          }
          const mark = (v: boolean) => (v ? 'ok' : 'err');
          const ok = (v: boolean) => (v ? 'OK' : 'DOWN');
          push(mark(!!d.redis), `  redis      ${ok(!!d.redis)}`);
          push(mark(!!d.mongo), `  mongo      ${ok(!!d.mongo)}`);
          push(mark(!!d.qdrant), `  qdrant     ${ok(!!d.qdrant)}`);
          push(mark(!!d.neo4j), `  neo4j      ${ok(!!d.neo4j)}`);
          const smtp = d.smtp ?? {};
          push('info', `  smtp       ${smtp.configured ? 'configured' : 'not configured'} (${smtp.host || '—'}:${smtp.port})`);
          const totals = d.usage?.totals;
          if (totals) {
            push('info', `  usage      ${totals.calls} calls · ${fmtTokens(totals.totalTokens)} tokens · $${(totals.cost ?? 0).toFixed(2)}`);
          }
        } catch {
          push('err', 'cannot reach the server');
        }
      },
    },
    agents: {
      usage: '',
      desc: 'list Subject Matter Experts (SMAs)',
      detail: 'List the available SMAs — expert lenses for architect jobs.\n\n  agents\n\nAliases: smas.',
      async run() {
        try {
          const r = await fetch('/api/agents');
          const d = await r.json();
          if (!d.ok || !Array.isArray(d.smas)) {
            push('err', 'could not load SMAs');
            return;
          }
          smas = d.smas;
          push('info', `Subject Matter Experts (${smas.length}):`);
          for (const s of smas) {
            const active = s.slug === sma;
            push(active ? 'ok' : 'info', `  ${s.slug.padEnd(16)} ${s.name}${active ? '  ◄ active' : ''}`);
          }
        } catch {
          push('err', 'cannot reach the server');
        }
      },
    },
    execs: {
      usage: '[limit]',
      desc: 'list recent executions',
      detail: 'List recent architect executions, newest first.\n\n  execs        last 10\n  execs 5      last 5\n\nAliases: history.',
      async run(args) {
        const limit = args[0] && /^\d+$/.test(args[0]) ? args[0] : '10';
        try {
          const r = await fetch(`/api/executions?limit=${limit}`);
          const d = await r.json();
          if (!d.ok || !Array.isArray(d.executions)) {
            push('err', 'could not load executions');
            return;
          }
          if (!d.executions.length) {
            push('muted', 'no executions yet — try: ask "build me something"');
            return;
          }
          push('info', `Recent executions (${d.executions.length}):`);
          for (const e of d.executions) {
            const status = e.status === 'complete' ? 'ok' : e.status === 'failed' ? 'err' : 'muted';
            const label = String(e.status ?? 'pending');
            push(status, `  ${fmtDate(e.createdAt)}  ${label.padEnd(9)}  ${String(e.prompt ?? '').slice(0, 64)}`);
          }
        } catch {
          push('err', 'cannot reach the server');
        }
      },
    },
    sma: {
      usage: '[slug]',
      desc: 'view or switch the active SMA',
      detail:
        'View or switch the SMA used by architect jobs.\n\n  sma          show active SMA\n  sma <slug>   switch SMA (run "agents" to list)',
      async run(args) {
        if (!args[0]) {
          push('info', `active SMA: ${sma}`);
          return;
        }
        try {
          const r = await fetch('/api/agents');
          const d = await r.json();
          if (d.ok && Array.isArray(d.smas)) smas = d.smas;
        } catch {
          /* fall through to local list */
        }
        const target = smas.find((s) => s.slug === args[0]);
        if (!target) {
          push('err', `unknown SMA: ${args[0]}`);
          push('muted', 'run "agents" to list available SMAs.');
          return;
        }
        sma = target.slug;
        localStorage.setItem('regno.cli.sma', sma);
        push('ok', `active SMA → ${sma} (${target.name})`);
      },
    },
    ask: {
      usage: '<prompt…>',
      desc: 'send a prompt to your Regno Architect',
      detail:
        'Send a prompt to your Regno Architect and stream the result back.\n\n  ask build me a small notes API with auth\n\nAliases: architect, run.',
      async run(args, raw) {
        const prompt = raw.includes(' ') ? raw.slice(raw.indexOf(' ') + 1).trim() : '';
        if (!prompt) {
          push('err', 'usage: ask <prompt…>');
          return;
        }
        if (busy) {
          push('err', 'a job is already running — wait for it to finish');
          return;
        }
        busy = true;
        push('info', `» enqueueing execution (sma: ${sma})…`);
        try {
          const r = await fetch('/api/executions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              settings: { forceAgent: 'regno-architect', analysisDepth: 'standard', sma },
            }),
          });
          const d = await r.json();
          if (!d.ok) {
            push('err', 'enqueue rejected: ' + (d.error ?? 'unknown error'));
            return;
          }
          const jobId = d.jobId;
          push('info', `» job ${jobId} queued — polling for result…`);
          let result: { status?: string; output?: string; error?: string } | null = null;
          for (let i = 0; i < 90; i++) {
            await new Promise((res) => setTimeout(res, 2000));
            const rr = await fetch(`/api/executions/${jobId}`);
            const rd = await rr.json();
            if (rd.ok && rd.execution) {
              result = rd.execution;
              break;
            }
          }
          if (result?.status === 'complete') {
            push('ok', '✔ complete');
            push('md', result.output || '(done — no output)');
          } else if (result?.status === 'failed') {
            push('err', '✖ failed: ' + (result.error || 'execution failed'));
          } else {
            push('err', '✖ no result yet — is the execution worker running and API keys set?');
          }
        } catch {
          push('err', 'cannot reach the server');
        } finally {
          busy = false;
        }
      },
    },
    goto: {
      usage: '<page>',
      desc: 'navigate to another page in the app',
      detail:
        'Navigate to another page in the app.\n\n  goto dashboard\n\nPages: dashboard, chat, canvas, stage, genesis, oracle, cortex, sentinel, executions, guides, docs, credentials, health, agents, settings, cli.\n\nAliases: open.',
      async run(args) {
        const pages: Record<string, string> = {
          dashboard: '',
          chat: 'chat',
          architect: 'chat',
          canvas: 'canvas',
          stage: 'stage',
          genesis: 'genesis',
          oracle: 'oracle',
          cortex: 'cortex',
          sentinel: 'sentinel',
          executions: 'executions',
          guides: 'guides',
          docs: 'docs',
          credentials: 'credentials',
          health: 'health',
          agents: 'agents',
          settings: 'settings',
          cli: 'cli',
        };
        const key = (args[0] ?? '').toLowerCase();
        if (!key || !(key in pages)) {
          push('err', 'usage: goto <page>');
          push('muted', 'pages: ' + Object.keys(pages).join(', '));
          return;
        }
        const dest = '/app' + (pages[key] ? '/' + pages[key] : '');
        push('info', `» navigating to ${dest || '/app'} …`);
        await goto(dest);
      },
    },
    theme: {
      usage: '[name]',
      desc: 'view or switch the UI theme',
      detail:
        'View or switch the UI theme.\n\n  theme            show current theme\n  theme tactical   switch theme\n\nThemes: dark, light, tactical, aurora, nova, emerald.',
      run(args) {
        const current = $theme;
        if (!args[0]) {
          push('info', `current theme: ${current}`);
          push('muted', `available: ${THEMES.join(', ')}`);
          return;
        }
        const next = args[0].toLowerCase();
        if (!THEMES.includes(next as Theme)) {
          push('err', `unknown theme: ${args[0]}`);
          push('muted', `available: ${THEMES.join(', ')}`);
          return;
        }
        theme.set(next as Theme);
        push('ok', `theme set to ${next}`);
      },
    },
    version: {
      usage: '',
      desc: 'print the CLI version',
      detail: 'Print the CLI version.\n\n  version',
      run() {
        push('info', 'Regno AI · CLI v1.0.0');
        push('muted', 'single-architect command console');
      },
    },
    exit: {
      usage: '',
      desc: 'leave the terminal (hint: you can’t)',
      detail: 'There is no escape. Try "goto dashboard" to leave.\n\n  exit',
      run() {
        push('muted', 'there is no escape — but "goto dashboard" will get you out of here.');
      },
    },
  };

  const ALIASES: Record<string, string> = {
    cls: 'clear',
    status: 'health',
    smas: 'agents',
    history: 'execs',
    architect: 'ask',
    run: 'ask',
    open: 'goto',
  };

  function resolve(name: string): string | undefined {
    if (commands[name]) return name;
    const canon = ALIASES[name];
    if (canon && commands[canon]) return canon;
    return undefined;
  }

  // ---- input handling ------------------------------------------------------
  async function run(rawInput: string) {
    const raw = rawInput.trim();
    if (!raw) {
      push('cmd', promptText + ' ');
      scrollToBottom();
      return;
    }
    if (raw === 'sudo' || raw.startsWith('sudo ')) {
      push('cmd', promptText + ' ' + raw);
      push('err', 'nice try — you already have root.');
      input = '';
      history = [...history, raw];
      persistSessions();
      histIdx = -1;
      scrollToBottom();
      return;
    }
    const [first = '', ...rest] = raw.split(/\s+/);
    const name = resolve(first.toLowerCase());
    push('cmd', promptText + ' ' + raw);
    input = '';
    history = [...history, raw];
    persistSessions();
    histIdx = -1;
    if (!name) {
      push('err', `command not found: ${first}`);
      push('muted', 'type "help" to list available commands.');
      scrollToBottom();
      return;
    }
    try {
      await commands[name].run(rest, raw);
    } catch (err) {
      push('err', 'error: ' + (err instanceof Error ? err.message : String(err)));
    }
    scrollToBottom();
  }

  function recallUp() {
    if (!history.length) return;
    if (histIdx === -1) histIdx = history.length - 1;
    else histIdx = Math.max(0, histIdx - 1);
    input = history[histIdx];
  }
  function recallDown() {
    if (histIdx === -1) return;
    histIdx += 1;
    if (histIdx >= history.length) {
      histIdx = -1;
      input = '';
    } else {
      input = history[histIdx];
    }
  }
  function autocomplete() {
    const val = input;
    if (/\s/.test(val)) return;
    const matches = Object.keys(commands)
      .filter((c) => c.startsWith(val.toLowerCase()))
      .sort();
    if (matches.length === 1) {
      input = matches[0] + ' ';
    } else if (matches.length > 1) {
      push('cmd', promptText + ' ' + val);
      push('info', matches.join('    '));
      scrollToBottom();
    }
  }

  async function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      await run(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      recallUp();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      recallDown();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      autocomplete();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      lines = [];
    }
  }

  function focusInput() {
    inputEl?.focus();
  }

  onMount(async () => {
    loadSessions();
    const saved = localStorage.getItem('regno.cli.sma');
    try {
      const r = await fetch('/api/agents');
      const d = await r.json();
      if (d.ok && Array.isArray(d.smas)) smas = d.smas;
    } catch {
      /* offline — keep the base list */
    }
    if (saved && smas.some((s) => s.slug === saved)) sma = saved;

    if (!lines.length) push('muted', 'Regno CLI — type "help" for commands');
    focusInput();
    scrollToBottom();
  });
</script>

<svelte:head><title>CLI — Regno Architect</title></svelte:head>

<div
  class="cli-wrap"
  role="application"
  aria-label="Regno command line interface"
  on:click={focusInput}
>
  <aside class="session-rail" aria-label="CLI sessions">
    <div class="rail-head">
      <div>
        <div class="rail-kicker">Sessions</div>
        <div class="rail-title">CLI history</div>
      </div>
      <button class="new-session" type="button" on:click|stopPropagation={startNewSession}>New</button>
    </div>
    <div class="session-list">
      {#each sessions as session}
        <div class="session-row" class:active={session.id === activeSessionId}>
          <button
            class="session-item"
            type="button"
            on:click|stopPropagation={() => activateSession(session.id)}
          >
            <strong>{sessionTitle(session)}</strong>
            <small>{fmtDate(session.updatedAt)} · {session.lines.length} lines</small>
          </button>
          <button class="delete-session" type="button" aria-label={`Delete ${session.title}`} on:click={(event) => deleteSession(session, event)}>
            ×
          </button>
        </div>
      {/each}
    </div>
  </aside>

  <div class="crt" aria-hidden="true"></div>
  <div class="term">
    <div class="output" bind:this={out}>
      {#each lines as line}
        {#if line.kind === 'md'}
          <div class="line md">{@html renderMarkdown(line.text)}</div>
        {:else}
          <div class="line {line.kind}">{line.text || ' '}</div>
        {/if}
      {/each}
      {#if busy}
        <div class="line info"><span class="blink">▌</span> working…</div>
      {/if}
    </div>

    <div class="input-row">
      <span class="prompt">{promptText}</span>
      <input
        class="cmd-input"
        bind:value={input}
        bind:this={inputEl}
        on:keydown={onKeydown}
        placeholder="type a command — help for hints"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Terminal input"
      />
    </div>
  </div>
</div>

<style>
  .cli-wrap {
    position: relative;
    height: calc(100vh - 32px);
    min-height: 420px;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    overflow: hidden;
    cursor: text;
    border: 1px solid var(--line);
    border-radius: 10px;
    background:
      radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--signal) 14%, transparent), transparent 36%),
      var(--bg-deep);
    box-shadow:
      inset 0 0 60px rgba(0, 0, 0, 0.35),
      0 0 46px var(--signal-glow);
  }

  .session-rail {
    position: relative;
    z-index: 4;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-right: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel) 72%, var(--bg-deep));
  }
  .rail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .rail-kicker {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--signal);
  }
  .rail-title {
    margin-top: 3px;
    font-family: var(--display);
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
  }
  .new-session,
  .delete-session {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--display);
    cursor: pointer;
  }
  .new-session {
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 700;
  }
  .new-session:hover { border-color: var(--signal); color: var(--signal); }
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    padding-right: 2px;
  }
  .session-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px;
    gap: 8px;
    align-items: stretch;
  }
  .session-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 10px 11px;
    border: 1px solid var(--line-soft);
    border-radius: 9px;
    background: color-mix(in srgb, var(--bg-alt) 84%, transparent);
    color: var(--ink-dim);
    cursor: pointer;
  }
  .session-item strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--display);
    font-size: 12.5px;
    color: var(--ink);
  }
  .session-item small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--mono);
    font-size: 10.5px;
    color: var(--ink-faint);
  }
  .session-row.active .session-item {
    border-color: var(--signal);
    background: var(--signal-bg);
    box-shadow: inset 3px 0 0 var(--signal);
  }
  .delete-session {
    width: 32px;
    min-height: 100%;
    font-size: 18px;
    color: var(--ink-faint);
  }
  .delete-session:hover {
    border-color: var(--danger);
    color: var(--danger);
  }

  /* scanlines + subtle vignette flicker (theme-neutral CRT effect) */
  .crt {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.18) 0px,
      rgba(0, 0, 0, 0.18) 1px,
      transparent 1px,
      transparent 3px
    );
  }
  .cli-wrap::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.32) 100%);
    animation: flicker 6s infinite;
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    91% { opacity: 1; }
    92% { opacity: 0.55; }
    93% { opacity: 1; }
    96% { opacity: 0.75; }
    97% { opacity: 1; }
  }

  .term {
    position: relative;
    z-index: 2;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 18px 20px 14px;
    font-family: var(--mono);
  }

  .output {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 10px;
    scrollbar-width: thin;
    scrollbar-color: var(--ink-faint) transparent;
  }
  .output::-webkit-scrollbar { width: 10px; }
  .output::-webkit-scrollbar-thumb { background: var(--ink-faint); border-radius: 6px; }

  .line {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--ink);
  }
  .line.cmd { color: var(--ink); font-weight: 600; }
  .line.ok { color: var(--good); }
  .line.err { color: var(--danger); }
  .line.muted { color: var(--ink-faint); }
  .line.banner { color: var(--signal); text-shadow: 0 0 10px var(--signal-glow); }

  /* Rendered markdown (architect "ask" output) */
  .line.md {
    white-space: normal;
    word-break: break-word;
  }
  .line.md :global(h1),
  .line.md :global(h2),
  .line.md :global(h3),
  .line.md :global(h4) {
    margin: 0.65em 0 0.35em;
    font-family: var(--display);
    font-weight: 700;
    color: var(--ink);
  }
  .line.md :global(h1) { font-size: 1.35em; }
  .line.md :global(h2) { font-size: 1.2em; }
  .line.md :global(h3) { font-size: 1.08em; }
  .line.md :global(h4) { font-size: 1em; }
  .line.md :global(p) { margin: 0.4em 0; }
  .line.md :global(ul),
  .line.md :global(ol) { margin: 0.4em 0 0.4em 1.4em; padding: 0; }
  .line.md :global(li) { margin: 0.2em 0; }
  .line.md :global(code) {
    font-family: var(--mono);
    font-size: 0.92em;
    background: var(--bg-alt);
    border: 1px solid var(--line-soft);
    border-radius: 4px;
    padding: 1px 5px;
  }
  .line.md :global(pre) {
    margin: 0.6em 0;
    padding: 10px 12px;
    background: var(--bg-deep);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    overflow-x: auto;
  }
  .line.md :global(pre code) {
    background: transparent;
    border: none;
    padding: 0;
    font-size: 12.5px;
  }
  .line.md :global(a) { color: var(--signal); text-decoration: none; }
  .line.md :global(a:hover) { text-decoration: underline; }
  .line.md :global(blockquote) {
    margin: 0.5em 0;
    padding-left: 12px;
    border-left: 2px solid var(--signal);
    color: var(--ink-dim);
  }
  .line.md :global(hr) { border: none; border-top: 1px solid var(--line); margin: 0.8em 0; }
  .line.md :global(table) { border-collapse: collapse; margin: 0.6em 0; }
  .line.md :global(th),
  .line.md :global(td) { border: 1px solid var(--line); padding: 4px 8px; text-align: left; }

  .input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
  .prompt {
    color: var(--signal);
    font-size: 13.5px;
    white-space: nowrap;
    text-shadow: 0 0 8px var(--signal-glow);
  }
  .cmd-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--ink);
    font-family: var(--mono);
    font-size: 13.5px;
    caret-color: var(--signal);
  }
  .cmd-input::placeholder { color: var(--ink-faint); }

  .blink { animation: blink 1s steps(2, start) infinite; }
  @keyframes blink { to { visibility: hidden; } }

  :global(:root[data-theme='light']) .cli-wrap {
    background: var(--panel);
    box-shadow: none;
  }
  :global(:root[data-theme='light']) .crt,
  :global(:root[data-theme='light']) .cli-wrap::after {
    display: none;
  }
  :global(:root[data-theme='light']) .session-rail {
    background: var(--bg-alt);
  }

  @media (max-width: 820px) {
    .cli-wrap {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(150px, 34vh) minmax(0, 1fr);
    }
    .session-rail {
      border-right: none;
      border-bottom: 1px solid var(--line);
    }
  }
</style>
