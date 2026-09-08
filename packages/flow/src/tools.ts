/**
 * ToolRegistry — the tools available to Cortex Flow agents (docs/cortex-flow-design.md §2).
 *
 * Each tool is a name + description + JSON-args schema + an async `run`.
 * Tools are executed by the tool loop in `toolLoop.ts`; the loop is what
 * actually feeds tool results back to the model (previously these were only
 * *described* to the model, not executed).
 *
 * Stateless tools (read/grep/findFiles/knowledgeBase/webSearch/dataSourceQuery/
 * cortexPattern) are safe by default. `pythonExec` (subprocess) and `emailSend`
 * are opt-in and must be listed in the agent's `capabilities.tools` to run.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { getDb, getQdrant, run as neo4jRun } from '@regno/db';
import { QdrantCollections } from '@regno/shared';
import { embed } from '@regno/ai';
import { keywordSearch, patternSearch } from '@regno/cortex';
import { enqueueEmail } from '@regno/mail';

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments (surfaced to the model). */
  schema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<string>;
}

/** Mutable per-execution state used by stateful tools (todoWrite). */
export interface ToolState {
  todos: string[];
}

interface DocPayload {
  title?: string;
  text?: string;
}

function schema(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return { type: 'object', properties, required };
}

/** Run a Python snippet in a subprocess with a hard timeout. Tries $PYTHON, python3, python. */
function runPython(code: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const candidates = [process.env.PYTHON ?? '', 'python3', 'python'].filter(Boolean);
    const tryNext = (i: number): void => {
      if (i >= candidates.length) {
        resolve({ stdout: '', stderr: 'pythonExec: no Python interpreter found (set PYTHON env var)' });
        return;
      }
      execFile(
        candidates[i],
        ['-c', code],
        { timeout: timeoutMs, maxBuffer: 1_000_000 },
        (err, stdout, stderr) => {
          if (err) {
            const codeErr = err as NodeJS.ErrnoException & { killed?: boolean; code?: string | number };
            if (codeErr.code === 'ENOENT') {
              tryNext(i + 1);
              return;
            }
            const reason = codeErr.killed
              ? `timed out after ${timeoutMs}ms`
              : `exit ${codeErr.code ?? 'unknown'}: ${err.message}`;
            resolve({ stdout: String(stdout ?? ''), stderr: `${reason}\n${String(stderr ?? '')}` });
            return;
          }
          resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
        },
      );
    };
    tryNext(0);
  });
}

/** Build the set of tools enabled for this execution (filtered by agent capability). */
export function buildTools(repoRoot: string, enabled: string[], state: ToolState = { todos: [] }): Tool[] {
  const all: Tool[] = [
    {
      name: 'read',
      description: 'Read a file from the repo',
      schema: schema({ path: { type: 'string', description: 'Path relative to the repo root' } }, ['path']),
      run: async (args) => {
        const p = join(repoRoot, String(args.path ?? ''));
        try {
          return await readFile(p, 'utf8');
        } catch (e) {
          return `read error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'grep',
      description: 'Search files for a pattern (basic substring)',
      schema: schema(
        {
          pattern: { type: 'string', description: 'Substring to search for' },
          path: { type: 'string', description: 'Directory to search (relative to repo root, default repo root)' },
        },
        ['pattern'],
      ),
      run: async (args) => {
        const pattern = String(args.pattern ?? '').toLowerCase();
        const dir = join(repoRoot, String(args.path ?? ''));
        try {
          const entries = await readdir(dir, { withFileTypes: true, recursive: true });
          const hits: string[] = [];
          for (const e of entries) {
            if (!e.isFile()) continue;
            const f = join(dir, e.name);
            const text = await readFile(f, 'utf8');
            const lines = text.split('\n').filter((l) => l.toLowerCase().includes(pattern)).slice(0, 5);
            if (lines.length) hits.push(`${relative(repoRoot, f)}: ${lines.join(' · ')}`);
            if (hits.length >= 10) break;
          }
          return hits.join('\n') || 'no matches';
        } catch (e) {
          return `grep error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'findFiles',
      description: 'List files in the repo matching a name substring or extension',
      schema: schema(
        {
          pattern: { type: 'string', description: 'Substring to match in file paths (e.g. "orchestrator" or ".ts")' },
          path: { type: 'string', description: 'Directory to search (relative to repo root, default repo root)' },
        },
        ['pattern'],
      ),
      run: async (args) => {
        const pattern = String(args.pattern ?? '').toLowerCase();
        const dir = join(repoRoot, String(args.path ?? ''));
        try {
          const entries = await readdir(dir, { withFileTypes: true, recursive: true });
          const matches = entries
            .filter((e) => e.isFile())
            .map((e) => relative(repoRoot, join(dir, e.name)))
            .filter((p) => p.toLowerCase().includes(pattern))
            .slice(0, 50);
          return matches.join('\n') || 'no matching files';
        } catch (e) {
          return `findFiles error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'knowledgeBase',
      description: 'Semantic search over the doc corpus (Qdrant doc_search); falls back to keyword/TF-IDF when no embedding key',
      schema: schema(
        {
          query: { type: 'string', description: 'Question or search phrase' },
          limit: { type: 'number', description: 'Max results (default 5)' },
        },
        ['query'],
      ),
      run: async (args) => {
        const query = String(args.query ?? '');
        const limit = Number(args.limit ?? 5);
        if (!query) return 'knowledgeBase: missing "query"';
        const q = getQdrant();
        if (process.env.OPENAI_API_KEY) {
          try {
            const vector = await embed(query);
            const res = await q.query(QdrantCollections.DOC_SEARCH, {
              query: vector,
              limit,
              with_payload: true,
            });
            const hits = (res.points ?? []).map((p) => {
              const payload = p.payload as DocPayload;
              return `[${(p.score ?? 0).toFixed(3)}] ${payload.title ?? '?'}: ${(payload.text ?? '').slice(0, 400)}`;
            });
            if (hits.length) return hits.join('\n\n');
          } catch {
            /* fall through to keyword */
          }
        }
        const kw = await keywordSearch(query, limit);
        return kw.map((h) => `[${h.score.toFixed(3)}] ${h.title}: ${h.text.slice(0, 400)}`).join('\n\n') || 'no matches';
      },
    },
    {
      name: 'webSearch',
      description: 'Search the web (DuckDuckGo Instant Answer — keyless)',
      schema: schema({ query: { type: 'string', description: 'Search phrase' } }, ['query']),
      run: async (args) => {
        const q = String(args.query ?? '');
        if (!q) return 'webSearch: missing "query"';
        try {
          const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
          const res = await fetch(url);
          if (!res.ok) return `webSearch error ${res.status}`;
          const json = (await res.json()) as {
            AbstractText?: string;
            AbstractURL?: string;
            RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
          };
          const parts: string[] = [];
          if (json.AbstractText) parts.push(`Abstract: ${json.AbstractText}${json.AbstractURL ? ` (${json.AbstractURL})` : ''}`);
          for (const t of (json.RelatedTopics ?? []).slice(0, 5)) {
            if (t.Text) parts.push(`- ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ''}`);
          }
          return parts.join('\n') || 'webSearch: no results';
        } catch (e) {
          return `webSearch error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'dataSourceQuery',
      description: 'Query live data stores: MongoDB (collection), Qdrant (semantic), Neo4j (Cypher)',
      schema: schema(
        {
          store: { type: 'string', description: 'mongo | qdrant | neo4j' },
          collection: { type: 'string', description: 'For mongo/qdrant: collection name' },
          query: { type: 'string', description: 'mongo: JSON filter; qdrant: text; neo4j: Cypher' },
          limit: { type: 'number', description: 'Max rows (default 10, max 100)' },
        },
        ['store'],
      ),
      run: async (args) => {
        const store = String(args.store ?? 'mongo');
        const limit = Math.min(Number(args.limit ?? 10) || 10, 100);
        try {
          if (store === 'mongo') {
            const coll = String(args.collection ?? '');
            if (!coll) return 'dataSourceQuery: mongo needs "collection"';
            const filter = args.query ? (JSON.parse(String(args.query)) as Record<string, unknown>) : {};
            const docs = await (await getDb()).collection(coll).find(filter).limit(limit).toArray();
            return JSON.stringify(docs, null, 2);
          }
          if (store === 'qdrant') {
            const collection = String(args.collection ?? QdrantCollections.DOC_SEARCH);
            const text = String(args.query ?? '');
            if (!text) return 'dataSourceQuery: qdrant needs "query" (text)';
            const vector = await embed(text);
            const res = await getQdrant().query(collection, { query: vector, limit, with_payload: true });
            return JSON.stringify(res.points ?? [], null, 2);
          }
          if (store === 'neo4j') {
            const query = String(args.query ?? '');
            if (!query) return 'dataSourceQuery: neo4j needs "query" (Cypher)';
            const rows = await neo4jRun(query, {});
            return JSON.stringify(rows, null, 2);
          }
          return `dataSourceQuery: unknown store "${store}" (mongo | qdrant | neo4j)`;
        } catch (e) {
          return `dataSourceQuery error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'cortexPattern',
      description: 'Retrieve proven patterns from the CORTEX pattern store (semantic + keyword)',
      schema: schema(
        {
          query: { type: 'string', description: 'Pattern/approach to look up' },
          limit: { type: 'number', description: 'Max results (default 5)' },
        },
        ['query'],
      ),
      run: async (args) => {
        const q = String(args.query ?? '');
        if (!q) return 'cortexPattern: missing "query"';
        try {
          const hits = await patternSearch(q, Number(args.limit ?? 5));
          return (
            hits.map((h) => `[${h.score.toFixed(2)}] ${h.name} (${h.domain}): ${h.description}`).join('\n') ||
            'cortexPattern: no matches'
          );
        } catch (e) {
          return `cortexPattern error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'todoWrite',
      description: 'Maintain a task list for the current run (set/add/clear)',
      schema: schema(
        {
          action: { type: 'string', description: 'set | add | clear' },
          todos: { type: 'array', items: { type: 'string' }, description: 'Task strings (for set/add)' },
        },
        ['action'],
      ),
      run: async (args) => {
        const action = String(args.action ?? 'set');
        const items = (Array.isArray(args.todos) ? args.todos : []).map(String);
        if (action === 'set') {
          state.todos.length = 0;
          state.todos.push(...items);
        } else if (action === 'add') {
          state.todos.push(...items);
        } else if (action === 'clear') {
          state.todos.length = 0;
        }
        return `Todos:\n${state.todos.map((t, i) => `${i + 1}. ${t}`).join('\n') || '(empty)'}`;
      },
    },
    {
      name: 'pythonExec',
      description: 'Run a Python snippet in a subprocess (timeout-limited, opt-in)',
      schema: schema(
        {
          code: { type: 'string', description: 'Python source to run' },
          timeout: { type: 'number', description: 'Timeout ms (default 5000)' },
        },
        ['code'],
      ),
      run: async (args) => {
        const code = String(args.code ?? '');
        if (!code) return 'pythonExec: missing "code"';
        const { stdout, stderr } = await runPython(code, Number(args.timeout ?? 5000));
        return stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
      },
    },
    {
      name: 'emailSend',
      description: 'Send an email via the notifications queue (opt-in)',
      schema: schema(
        {
          to: { type: 'string', description: 'Recipient email' },
          subject: { type: 'string', description: 'Subject' },
          body: { type: 'string', description: 'Plain-text body' },
        },
        ['to'],
      ),
      run: async (args) => {
        const to = String(args.to ?? '');
        if (!to) return 'emailSend: missing "to"';
        await enqueueEmail({ to, subject: String(args.subject ?? 'Regno'), text: String(args.body ?? '') });
        return `email queued to ${to}`;
      },
    },
  ];

  return all.filter((t) => enabled.includes(t.name));
}

/** Render a compact tool list for the model (used by the non-loop path). */
export function renderToolHelp(tools: Tool[]): string {
  return tools.map((t) => `${t.name}: ${t.description}`).join('\n');
}
