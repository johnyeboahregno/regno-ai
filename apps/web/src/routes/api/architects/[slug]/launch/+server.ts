// POST /api/architects/[slug]/launch — validate and enqueue provisioning.
import { json } from '@sveltejs/kit';
import { getArchitectBySlug, setArchitectStatus, revealCredentialByName } from '@regno/db';
import { enqueueProvision } from '@regno/provision';
import { requireSession, isAdminRole } from '$lib/server/auth.js';

export async function POST({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });

  const secrets = await revealCredentialByName(`architect:${params.slug}:env`);
  if (secrets === null) {
    return json({ ok: false, error: 'Secrets not set — save the wizard before launching' }, { status: 400 });
  }

  const job = await enqueueProvision({ slug: params.slug });
  await setArchitectStatus(params.slug, 'provisioning', { jobId: String(job.id), error: null });
  return json({ ok: true, jobId: String(job.id) });
}
