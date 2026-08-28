// Guard the /app area — redirect unauthenticated visitors to /login.
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';
import { verifySession, SESSION_COOKIE } from '$lib/server/auth.js';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) throw redirect(303, '/login');
  const session = await verifySession(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    throw redirect(303, '/login');
  }
  return { user: { email: session.email, role: session.role } };
};
