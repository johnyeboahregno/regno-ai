// POST /api/auth/logout — clear the session cookie.
import { json } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/auth.js';

export function POST({ cookies }) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ ok: true });
}
