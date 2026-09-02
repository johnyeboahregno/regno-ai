// /api/architects — Architect provisioning blueprints.
// GET  → list (admin) · POST → create draft (admin).
import { json } from '@sveltejs/kit';
import {
  createArchitectDraft,
  getArchitectBySlug,
  listArchitects,
  type ArchitectDeveloper,
  type ArchitectTarget,
  type ArchitectMode,
} from '@regno/db';
import { sanitizeSlug, fqdn } from '@regno/shared';
import { requireSession, isAdminRole } from '$lib/server/auth.js';
import { toPublicArchitect } from '$lib/server/architects.js';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architects = (await listArchitects()).map(toPublicArchitect);
  return json({ ok: true, architects });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    developer?: Partial<ArchitectDeveloper>;
    target?: Partial<ArchitectTarget>;
    env?: Record<string, string>;
  };

  let slug: string;
  try {
    slug = sanitizeSlug(body.slug);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, { status: 400 });
  }

  if (await getArchitectBySlug(slug)) {
    return json({ ok: false, error: `An Architect named "${slug}" already exists` }, { status: 409 });
  }

  const developer: ArchitectDeveloper = {
    name: String(body.developer?.name ?? '').trim(),
    email: String(body.developer?.email ?? '').trim(),
    github: String(body.developer?.github ?? '').trim(),
  };
  if (!developer.name) return json({ ok: false, error: 'developer.name is required' }, { status: 400 });

  const target: ArchitectTarget = {
    host: String(body.target?.host ?? '').trim(),
    sshUser: String(body.target?.sshUser ?? 'root').trim() || 'root',
    sshPort: Number(body.target?.sshPort ?? 22) || 22,
    mode: (body.target?.mode === 'k3s' ? 'k3s' : 'server') as ArchitectMode,
    wipe: Boolean(body.target?.wipe),
  };
  if (!target.host) return json({ ok: false, error: 'target.host is required' }, { status: 400 });

  const architect = await createArchitectDraft({
    slug,
    domain: fqdn(slug),
    developer,
    target,
    env: body.env ?? {},
  });

  return json({ ok: true, architect: toPublicArchitect(architect) });
}
