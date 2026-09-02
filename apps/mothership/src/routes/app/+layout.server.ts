// Guard the /app area with Regno Identity SSO (the Mothership always runs SSO).
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';
import { verifySession, SESSION_COOKIE } from '@regno/auth';
import { identityEnabled } from '@regno/auth';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const next = encodeURIComponent(url.pathname + url.search);
  const sso = () => `/api/auth/sso/start?next=${next}`;

  const token = cookies.get(SESSION_COOKIE);
  if (!token) throw redirect(303, identityEnabled() ? sso() : '/login');
  const session = await verifySession(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    throw redirect(303, identityEnabled() ? sso() : '/login');
  }

  return { user: { email: session.email, role: session.role } };
};
