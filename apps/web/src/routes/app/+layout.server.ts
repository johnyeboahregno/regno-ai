// Guard the /app area. When Regno Identity SSO is configured (the Mothership),
// unauthenticated visitors go through the same SSO as sysadmin.regnocloud.com;
// otherwise they fall back to the local /login screen.
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';
import { verifySession, SESSION_COOKIE } from '$lib/server/auth.js';
import { identityEnabled } from '$lib/server/identity.js';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const next = encodeURIComponent(url.pathname + url.search);
  const sso = () => `/api/auth/sso/start?next=${next}`;
  const local = (reason: string) => `/login?error=${reason}&next=${next}`;

  const token = cookies.get(SESSION_COOKIE);
  if (!token) throw redirect(303, identityEnabled() ? sso() : local('sign-in-required'));
  const session = await verifySession(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    throw redirect(303, identityEnabled() ? sso() : local('session-expired'));
  }
  return { user: { email: session.email, role: session.role } };
};
