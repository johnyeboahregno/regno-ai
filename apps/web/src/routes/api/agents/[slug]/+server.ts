// /api/agents/[slug] — delete an architect agent and tear down its namespace.
import { json } from '@sveltejs/kit';
import { spawn } from 'node:child_process';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function DELETE({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const slug = String(params.slug ?? '').trim();
  if (!slug) return json({ ok: false, error: 'slug is required' }, { status: 400 });

  const db = await getDb();

  // 1. Remove the agent record and its Cortex brain.
  await db.collection(Collections.AGENTS).deleteOne({ slug });
  await db.collection(Collections.CORTEX_AGENTS).deleteOne({ slug });
  await db.collection(Collections.CORTEX_AGENT_MEMORIES).deleteMany({ agentSlug: slug });
  await db.collection(Collections.CORTEX_EXECUTIONS).deleteMany({ agentSlug: slug });
  await db.collection(Collections.ARTIFACTS).deleteMany({ agentSlug: slug });
  await db.collection(Collections.CORTEX_INDEX).deleteMany({ developer: slug });

  // 2. Remove any datasource credentials created for this agent.
  await db.collection(Collections.CREDENTIALS).deleteMany({ name: { $regex: `^${escapeRegex(slug)}-` } });

  // 3. Tear down the k3s namespace (best-effort, detached — kubectl lives in the web pod).
  try {
    spawn('kubectl', ['delete', 'namespace', `dev-${slug}`, '--ignore-not-found=true'], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } catch {
    /* kubectl may not be available in local dev — records are already removed above */
  }

  return json({ ok: true, slug });
}
