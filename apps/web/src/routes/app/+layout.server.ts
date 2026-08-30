// Guard the /app area — redirect unauthenticated visitors to /login,
// carrying a reason code and the page they were trying to reach so the
// login screen can explain why and return them to their destination.
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';
import { verifySession, SESSION_COOKIE } from '$lib/server/auth.js';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const next = encodeURIComponent(url.pathname + url.search);
  const token = cookies.get(SESSION_COOKIE);
  if (!token) throw redirect(303, `/login?error=sign-in-required&next=${next}`);
  const session = await verifySession(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    throw redirect(303, `/login?error=session-expired&next=${next}`);
  }
  return { user: { email: session.email, role: session.role } };
};
