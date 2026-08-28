/**
 * ToolRegistry — the core tools available to agents (docs/cortex-flow-design.md §2).
 * read / grep / knowledgeBase are real; webSearch / pythonExec are Phase 3 stubs.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getQdrant } from '@regno/db';
import { QdrantCollections } from '@regno/shared';
import { embed } from '@regno/ai';
import { enqueueEmail } from '@regno/mail';

export interface Tool {
  name: string;
  description: string;
  run: (args: Record<string, string>) => Promise<string>;
}

interface DocPayload {
  title?: string;
  text?: string;
}

export function buildTools(repoRoot: string, enabled: string[]): Tool[] {
  const tools: Tool[] = [
    {
      name: 'read',
      description: 'Read a file from the repo',
      run: async (args) => {
        const p = join(repoRoot, args.path ?? '');
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
      run: async (args) => {
        const { readdir } = await import('node:fs/promises');
        const { join: j } = await import('node:path');
        const pattern = (args.pattern ?? '').toLowerCase();
        const dir = join(repoRoot, args.path ?? '');
        try {
          const entries = await readdir(dir, { withFileTypes: true, recursive: true });
          const hits: string[] = [];
          for (const e of entries) {
            if (!e.isFile()) continue;
            const f = j(dir, e.name);
            const text = await readFile(f, 'utf8');
            const lines = text.split('\n').filter((l) => l.toLowerCase().includes(pattern)).slice(0, 5);
            if (lines.length) hits.push(`${f}: ${lines.join(' · ')}`);
            if (hits.length >= 10) break;
          }
          return hits.join('\n') || 'no matches';
        } catch (e) {
          return `grep error: ${(e as Error).message}`;
        }
      },
    },
    {
      name: 'knowledgeBase',
      description: 'Semantic search over the doc corpus (Qdrant doc_search)',
      run: async (args) => {
        const q = getQdrant();
        const vector = await embed(args.query ?? '');
        const res = await q.query(QdrantCollections.DOC_SEARCH, {
          query: vector,
          limit: Number(args.limit ?? 5),
          with_payload: true,
        });
        return (res.points ?? [])
          .map((p) => {
            const payload = p.payload as DocPayload;
            return `[${(p.score ?? 0).toFixed(3)}] ${payload.title ?? '?'}: ${(payload.text ?? '').slice(0, 400)}`;
          })
          .join('\n\n');
      },
    },
    {
      name: 'webSearch',
      description: 'Search the web (stub — needs a search API)',
      run: async () => 'webSearch: not yet implemented',
    },
    {
      name: 'emailSend',
      description: 'Send an email via the notifications queue',
      run: async (args) => {
        const to = args.to ?? '';
        if (!to) return 'emailSend: missing "to"';
        await enqueueEmail({ to, subject: args.subject ?? 'Regno', text: args.body ?? '' });
        return `email queued to ${to}`;
      },
    },
    {
      name: 'pythonExec',
      description: 'Run a Python snippet in the sandbox (stub)',
      run: async () => 'pythonExec: not yet implemented',
    },
  ];
  return tools.filter((t) => enabled.includes(t.name));
}
