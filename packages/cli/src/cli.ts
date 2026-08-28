#!/usr/bin/env node
/**
 * regno — Regno Architect Me CLI
 * Zero-dependency arg parsing (node:util parseArgs) + native fetch.
 */
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REGNO_URL = process.env.REGNO_URL ?? 'http://localhost:5173';
const ROOT = process.env.REGNO_ROOT ?? process.cwd();
const AUTH_DIR = join(homedir(), '.regno');
const AUTH_FILE = join(AUTH_DIR, 'auth.json');

interface Auth {
  cookie: string;
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

Commands:
  login --email <e> --password <p>     Sign in and store the session locally
  run "<prompt>" [--depth <d>]         Enqueue a Cortex Flow execution
  credentials list                     List stored credentials (no secrets)
  credentials add --name <n> --type <t> --secret <s> [--provider <p>]
  credentials reveal <name>            Reveal a decrypted secret
  credentials remove <name>            Delete a credential
  db init                              Bootstrap indexes / Qdrant / Neo4j constraints
  brain seed                           Ingest docs/ into the CORTEX brain
  history ingest                       Ingest your repos (profile/repos.json)
  github ingest                        Ingest all repos in GITHUB_ORG
  profile seed                         Seed user conventions as userMemories
  standards seed                       Seed base coding standards (immutable core)
  remember "content" [--category]     Store a CORTEX memory
  pattern add --name --description    Store a CORTEX pattern (three-store sync)
  developer add --slug --name         Register a developer flavour identity
  persona create --slug --name       Create a persona (base + developer flavour)

Env:
  REGNO_URL   API base (default http://localhost:5173)
  REGNO_ROOT  repo root for scripts (default cwd)
`);
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
