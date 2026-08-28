// GET /api/auth/me — return the current session user (or null).
import { json } from '@sveltejs/kit';
import { verifySession, SESSION_COOKIE } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return json({ ok: true, user: null });
  const session = await verifySession(token);
  if (!session) return json({ ok: true, user: null });
  return json({ ok: true, user: { email: session.email, role: session.role } });
}
