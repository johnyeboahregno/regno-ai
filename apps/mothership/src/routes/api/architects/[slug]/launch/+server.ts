// POST /api/architects/[slug]/launch — validate and enqueue provisioning.
// Optional body { wipe: boolean } overrides the Architect's persisted target.wipe flag for this
// run only — used by "Redeploy" to force a non-destructive deploy even if wipe was ticked once
// at creation time (that flag must never silently re-wipe data on every later redeploy).
import { json } from '@sveltejs/kit';
import { getArchitectBySlug, setArchitectStatus, revealCredentialByName } from '@regno/db';
import { enqueueProvision } from '@regno/provision';
import { requireSession, isAdminRole } from '@regno/auth';

export async function POST({ params, cookies, request }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });

  const secrets = await revealCredentialByName(`architect:${params.slug}:env`);
  if (secrets === null) {
    return json({ ok: false, error: 'Secrets not set — save the wizard before launching' }, { status: 400 });
  }

  let wipe: boolean | undefined;
  try {
    const body = await request.json();
    if (typeof body?.wipe === 'boolean') wipe = body.wipe;
  } catch {
    /* no body sent — fall back to the persisted target.wipe flag */
  }

  const job = await enqueueProvision({ slug: params.slug, wipe });
  await setArchitectStatus(params.slug, 'provisioning', { jobId: String(job.id), error: null });
  return json({ ok: true, jobId: String(job.id) });
}
