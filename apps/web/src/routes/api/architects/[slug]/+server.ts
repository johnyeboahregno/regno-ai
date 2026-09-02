// /api/architects/[slug] — get (masked), update draft, or delete an Architect.
import { json } from '@sveltejs/kit';
import {
  getArchitectBySlug,
  updateArchitectDraft,
  deleteArchitect,
  deleteCredentialByName,
  type ArchitectDeveloper,
  type ArchitectTarget,
} from '@regno/db';
import { sanitizeSlug, fqdn } from '@regno/shared';
import { requireSession, isAdminRole } from '$lib/server/auth.js';
import { toPublicArchitect } from '$lib/server/architects.js';

const vaultName = (slug: string) => `architect:${slug}:env`;

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });
  return json({ ok: true, architect: toPublicArchitect(architect) });
}

export async function PUT({ params, request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });
  if (architect.status !== 'draft' && architect.status !== 'error') {
    return json({ ok: false, error: `Cannot edit an Architect in "${architect.status}" state` }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    developer?: Partial<ArchitectDeveloper>;
    target?: Partial<ArchitectTarget>;
    env?: Record<string, string>;
  };

  const patch: { developer?: ArchitectDeveloper; target?: ArchitectTarget; env?: Record<string, string>; domain?: string } = {};
  if (body.developer) {
    patch.developer = {
      name: String(body.developer.name ?? architect.developer.name).trim(),
      email: String(body.developer.email ?? architect.developer.email).trim(),
      github: String(body.developer.github ?? architect.developer.github).trim(),
    };
  }
  if (body.target) {
    patch.target = {
      host: String(body.target.host ?? architect.target.host).trim(),
      sshUser: String(body.target.sshUser ?? architect.target.sshUser).trim() || 'root',
      sshPort: Number(body.target.sshPort ?? architect.target.sshPort) || 22,
      mode: body.target.mode === 'k3s' ? 'k3s' : body.target.mode === 'server' ? 'server' : architect.target.mode,
      wipe: body.target.wipe !== undefined ? Boolean(body.target.wipe) : architect.target.wipe,
    };
  }
  if (body.env) patch.env = body.env;
  if (body.target?.mode) patch.domain = fqdn(architect.slug);

  const updated = await updateArchitectDraft(params.slug, patch);
  return json({ ok: true, architect: toPublicArchitect(updated!) });
}

export async function DELETE({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  await deleteCredentialByName(vaultName(params.slug));
  await deleteArchitect(params.slug);
  return json({ ok: true });
}
