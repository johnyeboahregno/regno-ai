// POST /api/architects/[slug]/seed — re-seed an Architect's data layer (init-db +
// agents + profile + docs brain + repo history) WITHOUT redeploying or restarting
// the stack. Mirrors the "Redeploy" flow but enqueues a `seed` job that the
// provision worker runs against the already-running databases on the target box.
import { json } from '@sveltejs/kit';
import { getArchitectBySlug, setArchitectStatus, revealCredentialByName } from '@regno/db';
import { enqueueSeed } from '@regno/provision';
import { requireSession, isAdminRole } from '@regno/auth';

export async function POST({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });
  if (architect.status === 'draft') {
    return json(
      { ok: false, error: `"${params.slug}" is still a draft — provision it before seeding` },
      { status: 400 },
    );
  }
  if (architect.status === 'provisioning' || architect.status === 'seeding') {
    return json(
      { ok: false, error: `A ${architect.status} job is already running for "${params.slug}"` },
      { status: 409 },
    );
  }

  const secrets = await revealCredentialByName(`architect:${params.slug}:env`);
  if (secrets === null) {
    return json({ ok: false, error: 'Secrets not set — save the wizard before seeding' }, { status: 400 });
  }

  const job = await enqueueSeed(params.slug);
  await setArchitectStatus(params.slug, 'seeding', { jobId: String(job.id), error: null });
  return json({ ok: true, jobId: String(job.id) });
}
