// GET /api/auth/sso/start — begin Regno Identity SSO login (mirrors the
// sysadmin portal's redirectToRegnoIdentityLogin). Falls back to the local
// login screen when SSO isn't configured (local dev).
import { redirect } from '@sveltejs/kit';
import { identityLoginUrl, identityEnabled } from '@regno/auth';

export function GET({ url }) {
  const next = url.searchParams.get('next') || '/app';
  if (!identityEnabled()) throw redirect(303, `/login?error=sign-in-required&next=${encodeURIComponent(next)}`);
  const redirectUri = new URL('/api/auth/sso/callback', url.origin);
  redirectUri.searchParams.set('next', next);
  throw redirect(302, identityLoginUrl(redirectUri.toString()));
}
