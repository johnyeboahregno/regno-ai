#!/usr/bin/env node
/**
 * regno — Regno Architect Me CLI
 * Zero-dependency arg parsing (node:util parseArgs) + native fetch.
 */
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const REGNO_URL = process.env.REGNO_URL ?? 'http://localhost:5173';
const ROOT = process.env.REGNO_ROOT ?? process.cwd();
const AUTH_DIR = join(homedir(), '.regno');
const AUTH_FILE = join(AUTH_DIR, 'auth.json');
const HISTORY_FILE = join(AUTH_DIR, 'history.jsonl');
// In-memory cap for arrow-key recall inside a session. The history file itself
// is append-only and never trimmed — every command is kept forever.
const HISTORY_SIZE = 100_000;

interface Auth {
  cookie: string;
}

interface HistoryEntry {
  ts: number; // epoch ms when the command ran
  cmd: string;
}

function readAuth(): Auth | null {
  try {
    return JSON.parse(readFileSync(AUTH_FILE, 'utf8')) as Auth;
  } catch {
    return null;
  }
}

function writeAuth(auth: Auth): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = readFileSync(HISTORY_FILE, 'utf8').trim();
    if (!raw) return [];
    return raw
      .split('\n')
      .map((l) => {
        try {
          return JSON.parse(l) as HistoryEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is HistoryEntry => e !== null);
  } catch {
    return [];
  }
}

/** Append a command to the forever-kept history file (best-effort). */
function appendHistory(cmd: string): void {
  try {
    mkdirSync(AUTH_DIR, { recursive: true });
    appendFileSync(HISTORY_FILE, JSON.stringify({ ts: Date.now(), cmd }) + '\n');
  } catch {
    /* never fail a command because history could not be written */
  }
}

function printHistory(): void {
  const entries = loadHistory();
  if (!entries.length) {
    console.log('(no history yet)');
    return;
  }
  for (const e of entries) {
    const d = new Date(e.ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    console.log(`${stamp}\t${e.cmd}`);
  }
}

function clearHistoryWindow(window: string): boolean {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const windows: Record<string, number> = { '3d': 3 * day, '1w': 7 * day, '1m': 30 * day };
  if (window === 'all') {
    writeFileSync(HISTORY_FILE, '');
    console.log('history cleared (all)');
    return true;
  }
  const ms = windows[window];
  if (!ms) {
    console.error('usage: regno history clear <3d|1w|1m|all>');
    return false;
  }
  const entries = loadHistory();
  const kept = entries.filter((e) => e.ts < now - ms);
  const removed = entries.length - kept.length;
  writeFileSync(HISTORY_FILE, kept.map((e) => JSON.stringify(e)).join('\n') + (kept.length ? '\n' : ''));
  console.log(`history cleared (${window}): removed ${removed} of ${entries.length} entries`);
  return true;
}

/** Split a shell line into argv, honouring single/double quotes and backslash escapes. */
function splitCommand(line: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let esc = false;
  for (const ch of line) {
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === '\\' && quote !== "'") {
      esc = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function runScript(name: string): boolean {
  const p = join(ROOT, 'scripts', name);
  if (!existsSync(p)) {
    console.error(`script not found: ${p}`);
    return false;
  }
  const r = spawnSync('node', [p], { stdio: 'inherit', shell: true });
  return r.status === 0;
}

async function api(path: string, opts: RequestInit = {}) {
  const auth = readAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string> | undefined) ?? {}),
  };
  if (auth) headers.Cookie = auth.cookie;
  const res = await fetch(REGNO_URL + path, { ...opts, headers });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, res };
}

function help(): void {
  console.log(`regno — Regno Architect Me CLI

Usage: regno <command> [options]
  regno                       Start an interactive shell (persistent history)
  regno history               Show the full command history (kept forever)
  regno history clear <w>     Clear history for the last <w>: 3d | 1w | 1m | all
  regno history ingest        Ingest your repos (profile/repos.json)

Commands:
  login --email <e> --password <p>     Sign in and store the session locally
  run "<prompt>" [--depth <d>]         Enqueue a Cortex Flow execution
  credentials list                     List stored credentials (no secrets)
  credentials add --name <n> --type <t> --secret <s> [--provider <p>]
  credentials reveal <name>            Reveal a decrypted secret
  credentials remove <name>            Delete a credential
  db init                              Bootstrap indexes / Qdrant / Neo4j constraints
  brain seed                           Ingest docs/ into the CORTEX brain
  github ingest                        Ingest all repos in GITHUB_ORG
  ingest --url <url> --description <d> [--max-pages <n>] [--depth <d>]   Crawl & ingest a website
  profile seed                         Seed user conventions as userMemories
  standards seed                       Seed base coding standards (immutable core)
  remember "content" [--category]     Store a CORTEX memory
  pattern add --name --description    Store a CORTEX pattern (three-store sync)
  developer add --slug --name         Register a developer flavour identity
  persona create --slug --name       Create a persona (base + developer flavour)

History:
  Every command you run (interactive or one-shot) is appended to
  ~/.regno/history.jsonl and kept forever. Clear it in chunks:
    regno history clear 3d   # drop the last 3 days
    regno history clear 1w   # drop the last week
    regno history clear 1m   # drop the last month
    regno history clear all  # wipe everything

Env:
  REGNO_URL   API base (default http://localhost:5173)
  REGNO_ROOT  repo root for scripts (default cwd)
`);
}

async function runCli(args: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args,
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      depth: { type: 'string' },
      name: { type: 'string' },
      type: { type: 'string' },
      provider: { type: 'string' },
      secret: { type: 'string' },
      description: { type: 'string' },
      tags: { type: 'string' },
      category: { type: 'string' },
      agent: { type: 'string' },
      slug: { type: 'string' },
      developer: { type: 'string' },
      url: { type: 'string' },
      domain: { type: 'string' },
      'max-pages': { type: 'string' },
      'rate-limit-ms': { type: 'string' },
      phases: { type: 'string' },
      'seed-id': { type: 'string' },
      'no-llm': { type: 'boolean' },
      'no-assets': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  const cmd = positionals[0];
  const sub = positionals[1];
  if (!cmd || values.help) return help();

  switch (cmd) {
    case 'login': {
      const email = values.email ?? '';
      const password = values.password ?? '';
      if (!email || !password) {
        console.error('usage: regno login --email <e> --password <p>');
        return;
      }
      const { status, json, res } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (status !== 200) {
        console.error('login failed:', json.error ?? json.raw);
        return;
      }
      const setCookie = res.headers.getSetCookie?.() ?? [];
      const sc = setCookie.find((c) => c.startsWith('regno_session='));
      if (!sc) {
        console.error('login failed: no session cookie returned');
        return;
      }
      writeAuth({ cookie: sc.split(';')[0] });
      const user = json.user as { email: string; role: string };
      console.log(`logged in as ${user.email} (${user.role})`);
      return;
    }

    case 'run': {
      const prompt = sub ?? '';
      if (!prompt) {
        console.error('usage: regno run "prompt" [--depth quick|standard|deep]');
        return;
      }
      const depth = values.depth ?? 'quick';
      const { status, json } = await api('/api/executions', {
        method: 'POST',
        body: JSON.stringify({ prompt, settings: { analysisDepth: depth } }),
      });
      if (status !== 200) {
        console.error('run failed:', json.error ?? json.raw);
        return;
      }
      console.log(`enqueued execution — job ${json.jobId}`);
      return;
    }

    case 'credentials': {
      if (sub === 'list') {
        const { status, json } = await api('/api/credentials');
        if (status !== 200) {
          console.error('failed:', json.error ?? json.raw);
          return;
        }
        const items = (json.credentials as Array<Record<string, unknown>>) ?? [];
        if (!items.length) {
          console.log('(no credentials stored)');
          return;
        }
        for (const c of items) console.log(`${c.name}\t${c.type}\t${c.provider}`);
        return;
      }
      if (sub === 'add') {
        const name = values.name ?? '';
        const secret = values.secret ?? '';
        if (!name || !secret) {
          console.error('usage: regno credentials add --name <n> --type <t> --secret <s> [--provider <p>]');
          return;
        }
        const { status, json } = await api('/api/credentials', {
          method: 'POST',
          body: JSON.stringify({ name, type: values.type ?? 'api', provider: values.provider, secret }),
        });
        if (status !== 200) {
          console.error('add failed:', json.error ?? json.raw);
          return;
        }
        console.log(`stored credential "${name}"`);
        return;
      }
      if (sub === 'reveal' || sub === 'remove') {
        const name = values.name ?? '';
        if (!name) {
          console.error(`usage: regno credentials ${sub} <name>`);
          return;
        }
        const list = await api('/api/credentials');
        const items = (list.json.credentials as Array<{ id: string; name: string }>) ?? [];
        const found = items.find((c) => c.name === name);
        if (!found) {
          console.error(`credential "${name}" not found`);
          return;
        }
        if (sub === 'reveal') {
          const r = await api(`/api/credentials/${found.id}`);
          if (r.status !== 200) {
            console.error('reveal failed:', r.json.error);
            return;
          }
          console.log(r.json.secret);
        } else {
          const r = await api(`/api/credentials/${found.id}`, { method: 'DELETE' });
          if (r.status !== 200) {
            console.error('remove failed:', r.json.error);
            return;
          }
          console.log(`removed credential "${name}"`);
        }
        return;
      }
      console.error('unknown credentials subcommand');
      help();
      return;
    }

    case 'db':
      if (sub === 'init') {
        runScript('init-db.mjs');
        return;
      }
      console.error('unknown db subcommand');
      help();
      return;

    case 'brain':
      if (sub === 'seed') {
        runScript('seed-brain.mjs');
        return;
      }
      console.error('unknown brain subcommand');
      help();
      return;

    case 'history':
      if (sub === 'ingest') {
        runScript('seed-history.mjs');
        return;
      }
      if (sub === 'clear') {
        clearHistoryWindow(positionals[2] ?? '');
        return;
      }
      if (!sub) {
        printHistory();
        return;
      }
      console.error('unknown history subcommand');
      help();
      return;

    case 'github':
      if (sub === 'ingest') {
        runScript('seed-github.mjs');
        return;
      }
      console.error('unknown github subcommand');
      help();
      return;

    case 'ingest': {
      const url = values.url ?? '';
      if (!url) {
        console.error('usage: regno ingest --url <url> --description <desc> [options]');
        console.error('options: --max-pages <n>, --depth <n>, --rate-limit-ms <n>, --seed-id <id>, --no-llm, --no-assets');
        return;
      }
      // Build arguments array for the ingest-site.ts script
      const scriptArgs: string[] = ['--url', url];
      if (values.description) scriptArgs.push('--description', values.description);
      if (values.name) scriptArgs.push('--name', values.name);
      if (values.domain) scriptArgs.push('--domain', values.domain);
      if (values['max-pages']) scriptArgs.push('--max-pages', values['max-pages']);
      if (values.depth && values.depth !== 'quick' && values.depth !== 'standard' && values.depth !== 'deep') {
        // depth might be used for other commands, only add to ingest if numeric
        scriptArgs.push('--depth', values.depth);
      }
      if (values['rate-limit-ms']) scriptArgs.push('--rate-limit-ms', values['rate-limit-ms']);
      if (values.phases) scriptArgs.push('--phases', values.phases);
      if (values['seed-id']) scriptArgs.push('--seed-id', values['seed-id']);
      if (values['no-llm']) scriptArgs.push('--no-llm');
      if (values['no-assets']) scriptArgs.push('--no-assets');
      
      // Run the ingest script via tsx
      const p = join(ROOT, 'scripts', 'ingest-site.ts');
      const r = spawnSync('npx', ['tsx', p, ...scriptArgs], { stdio: 'inherit' });
      if (r.status !== 0) {
        console.error(`ingest failed with exit code ${r.status}`);
        process.exit(r.status ?? 1);
      }
      return;
    }

    case 'profile':
      if (sub === 'seed') {
        runScript('seed-profile.mjs');
        return;
      }
      console.error('unknown profile subcommand');
      help();
      return;

    case 'standards':
      if (sub === 'seed') {
        runScript('seed-standards.mjs');
        return;
      }
      console.error('unknown standards subcommand');
      help();
      return;

    case 'developer':
      if (sub === 'add') {
        const slug = values.slug ?? '';
        const name = values.name ?? '';
        if (!slug || !name) {
          console.error('usage: regno developer add --slug <s> --name <n>');
          return;
        }
        const { status, json } = await api('/api/developers', {
          method: 'POST',
          body: JSON.stringify({ slug, name }),
        });
        if (status !== 200) {
          console.error('failed:', json.error ?? json.raw);
          return;
        }
        console.log(`developer registered (${json.slug})`);
        return;
      }
      console.error('unknown developer subcommand');
      help();
      return;

    case 'persona':
      if (sub === 'create') {
        const slug = values.slug ?? '';
        const name = values.name ?? '';
        const developer = values.developer ?? 'base';
        if (!slug || !name) {
          console.error('usage: regno persona create --slug <s> --name <n> [--developer <d>]');
          return;
        }
        const { status, json } = await api('/api/personas', {
          method: 'POST',
          body: JSON.stringify({ slug, name, developer }),
        });
        if (status !== 200) {
          console.error('failed:', json.error ?? json.raw);
          return;
        }
        console.log(`persona created (${json.slug} → ${developer})`);
        return;
      }
      console.error('unknown persona subcommand');
      help();
      return;

    case 'remember': {
      const content = sub ?? '';
      if (!content) {
        console.error('usage: regno remember "content" [--category note] [--agent regno-architect]');
        return;
      }
      const { status, json } = await api('/api/cortex/memories', {
        method: 'POST',
        body: JSON.stringify({
          content,
          category: values.category ?? 'note',
          agentSlug: values.agent ?? 'regno-architect',
        }),
      });
      if (status !== 200) {
        console.error('failed:', json.error ?? json.raw);
        return;
      }
      console.log(`memory stored (${json.id})`);
      return;
    }

    case 'pattern': {
      if (sub === 'add') {
        const name = values.name ?? '';
        const description = values.description ?? '';
        if (!name || !description) {
          console.error('usage: regno pattern add --name <n> --description <d> [--tags a,b]');
          return;
        }
        const tags = (values.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
        const { status, json } = await api('/api/cortex/patterns', {
          method: 'POST',
          body: JSON.stringify({ name, description, tags }),
        });
        if (status !== 200) {
          console.error('failed:', json.error ?? json.raw);
          return;
        }
        console.log(`pattern stored (${json.id})`);
        return;
      }
      console.error('unknown pattern subcommand');
      help();
      return;
    }

    default:
      help();
  }
}

async function runInteractive(): Promise<void> {
  const saved = loadHistory();
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: HISTORY_SIZE,
    prompt: 'regno> ',
  });
  // `history` / `historyIndex` are real runtime properties but aren't in the
  // @types/node surface, so reach them through a narrow cast.
  const rlHistory = rl as unknown as { history: string[]; historyIndex: number };
  rlHistory.history = saved.slice(-HISTORY_SIZE).map((h) => h.cmd);
  rlHistory.historyIndex = rlHistory.history.length;

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }
    appendHistory(trimmed);
    if (trimmed === 'exit' || trimmed === 'quit') {
      rl.close();
      return;
    }
    if (trimmed === 'help') {
      help();
      rl.prompt();
      return;
    }
    try {
      await runCli(splitCommand(trimmed));
    } catch (err) {
      console.error(err);
    }
    rl.prompt();
  });

  rl.on('SIGINT', () => rl.close());

  rl.on('close', () => {
    console.log('bye');
    process.exit(0);
  });

  rl.prompt();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    if (process.stdin.isTTY) return runInteractive();
    return help();
  }
  // Keep every command forever, even one-shot invocations.
  appendHistory(args.join(' '));
  await runCli(args);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
