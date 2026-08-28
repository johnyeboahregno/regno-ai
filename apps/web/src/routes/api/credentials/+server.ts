// /api/credentials — encrypted credential vault (AES-256-GCM at rest).
// GET  → list (no secrets) · POST → create
import { json } from '@sveltejs/kit';
import { listCredentials, storeCredential } from '@regno/db';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return json({ ok: true, credentials: await listCredentials() });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    type?: string;
    provider?: string;
    secret?: string;
  };
  const name = String(body.name ?? '').trim();
  const secret = String(body.secret ?? '');
  if (!name || !secret) return json({ ok: false, error: 'name and secret are required' }, { status: 400 });

  const id = await storeCredential({
    name,
    type: String(body.type ?? 'api'),
    provider: body.provider,
    secret,
  });
  return json({ ok: true, id });
}
