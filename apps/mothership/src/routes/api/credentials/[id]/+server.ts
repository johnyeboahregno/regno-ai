// /api/credentials/[id] — reveal (decrypt) or delete a credential.
import { json } from '@sveltejs/kit';
import { revealCredential, deleteCredential } from '@regno/db';
import { requireSession } from '@regno/auth';

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const secret = await revealCredential(params.id);
  if (secret === null) return json({ ok: false, error: 'Not found' }, { status: 404 });
  return json({ ok: true, secret });
}

export async function DELETE({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await deleteCredential(params.id);
  return json({ ok: true });
}
