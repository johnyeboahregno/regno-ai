// POST /api/auth/login — verify credentials and set a session cookie.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { verifyPassword, signSession, SESSION_COOKIE } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  const db = await getDb();
  const user = await db.collection(Collections.USERS).findOne({ email });
  if (!user || !verifyPassword(password, String(user.passwordHash ?? ''))) {
    return json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const role = String(user.role ?? 'user');
  const token = await signSession({ sub: String(user._id), email, role });
  // secure:true — HTTPS is terminated at the Cloudflare edge (john.regno.ai).
  cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

  return json({ ok: true, user: { email, role } });
}
