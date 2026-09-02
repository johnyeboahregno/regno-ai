// Guard the /app/architects area — SSO + admin role required.
// Unauthenticated visitors are redirected to the Regno Identity login
// (the same SSO provider as sysadmin.regnocloud.com).
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';
import { verifySession, SESSION_COOKIE, isAdminRole } from '$lib/server/auth.js';
import { identityEnabled } from '$lib/server/identity.js';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const next = encodeURIComponent(url.pathname + url.search);
  const ssoStart = () => `/api/auth/sso/start?next=${next}`;
  const localLogin = (reason: string) => `/login?error=${reason}&next=${next}`;

  const token = cookies.get(SESSION_COOKIE);
  if (!token) throw redirect(303, identityEnabled() ? ssoStart() : localLogin('sign-in-required'));
  const session = await verifySession(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    throw redirect(303, identityEnabled() ? ssoStart() : localLogin('session-expired'));
  }
  if (!isAdminRole(session.role)) throw redirect(303, '/app?error=not-admin');
  return { user: { email: session.email, role: session.role } };
};
