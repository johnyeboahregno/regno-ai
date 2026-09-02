// POST /api/auth/register — create a user and set a session cookie.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { hashPassword, signSession, SESSION_COOKIE } from '@regno/auth';

export async function POST({ request, cookies }) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return json({ ok: false, error: 'A valid email and 8+ character password are required' }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection(Collections.USERS);
  const existing = await users.findOne({ email });
  if (existing) return json({ ok: false, error: 'An account with this email already exists' }, { status: 409 });

  const count = await users.countDocuments();
  const role = count === 0 ? 'owner' : 'user';
  const res = await users.insertOne({ email, passwordHash: hashPassword(password), role, createdAt: new Date() });

  const token = await signSession({ sub: String(res.insertedId), email, role });
  // secure:true — HTTPS is terminated at the Cloudflare edge (john.regno.ai).
  cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });

  return json({ ok: true, user: { email, role } });
}
