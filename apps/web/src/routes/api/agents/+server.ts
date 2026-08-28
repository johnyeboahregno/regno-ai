// /api/agents — list + create architect agents (admin feature).
// Creating an agent: registers it, compiles its standards, and spawns a namespace.
import { json } from '@sveltejs/kit';
import { spawn } from 'node:child_process';
import { getDb, storeCredential } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.AGENTS).find({}).sort({ createdAt: -1 }).toArray();
  const agents = items.map((a) => ({
    slug: a.slug,
    name: a.name,
    technologies: a.technologies ?? [],
    repos: a.repos ?? [],
    datasources: a.datasources ?? [],
    namespace: a.namespace,
    port: a.port,
    status: a.status ?? 'unknown',
    createdAt: a.createdAt,
  }));
  return json({ ok: true, agents });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    technologies?: string[];
    repos?: string[];
    datasources?: unknown[];
  };
  const name = String(body.name ?? '').trim();
  const technologies = Array.isArray(body.technologies) ? body.technologies.map(String) : [];
  const repos = Array.isArray(body.repos) ? body.repos.map(String).filter(Boolean) : [];
  const datasources = Array.isArray(body.datasources) ? body.datasources : [];
  if (!name) return json({ ok: false, error: 'name is required' }, { status: 400 });

  const slug = slugify(name);
  if (!slug) return json({ ok: false, error: 'name must contain letters/numbers' }, { status: 400 });

  const db = await getDb();
  const count = await db.collection(Collections.AGENTS).countDocuments();
  const port = 3100 + count * 10;
  const namespace = `dev-${slug}`;

  // 1. Register the agent.
  await db.collection(Collections.AGENTS).insertOne({
    slug, name, technologies, repos, datasources, namespace, port,
    status: 'spawning', createdAt: new Date(),
  });

  // 2. Make it a runnable Cortex agent (technologies drive its injected standards).
  await db.collection(Collections.CORTEX_AGENTS).updateOne(
    { slug },
    {
      $set: {
        slug,
        name,
        technologies,
        triggers: [name.toLowerCase(), ...technologies],
        capabilities: { tools: ['read', 'grep', 'knowledgeBase', 'dataSourceQuery', 'pythonExec', 'webSearch', 'emailSend'] },
        planTemplate: {
          depthStrategy: 'auto',
          phases: [
            { name: 'understand', needs: ['knowledgeFacts'] },
            { name: 'plan', needs: [] },
            { name: 'implement', needs: [] },
            { name: 'verify', needs: [] },
            { name: 'document', needs: [] },
          ],
        },
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // 3. Store any datasource connection in the encrypted credentials vault.
  for (const ds of datasources as Array<{ type?: string; connection?: string }>) {
    if (ds?.type && ds?.connection) {
      await storeCredential({
        name: `${slug}-${ds.type}`,
        type: String(ds.type),
        provider: String(ds.type),
        secret: String(ds.connection),
      });
    }
  }

  // 4. Spawn the namespace asynchronously (detached, updates status when done).
  spawn('node', ['/app/scripts/spawn-agent.mjs', slug, String(port), repos.join(',')], {
    detached: true,
    stdio: 'ignore',
  }).unref();

  return json({ ok: true, slug, name, namespace, port, status: 'spawning' });
}
