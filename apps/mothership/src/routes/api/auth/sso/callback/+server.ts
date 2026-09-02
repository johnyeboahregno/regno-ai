// GET /api/auth/sso/callback — validate the identity access token and bootstrap
// a local session (mirrors the sysadmin portal's tryIdentityTokenLogin).
import { redirect } from '@sveltejs/kit';
import { validateIdentityToken, upsertSsoUser } from '@regno/auth';
import { signSession, SESSION_COOKIE } from '@regno/auth';

export async function GET({ url, cookies }) {
  const token = String(url.searchParams.get('identity_access_token') ?? '').trim();
  const next = url.searchParams.get('next') || '/app';

  if (!token) throw redirect(303, `/login?error=sso-failed&next=${encodeURIComponent(next)}`);
  const claims = await validateIdentityToken(token);
  if (!claims) throw redirect(303, `/login?error=sso-invalid&next=${encodeURIComponent(next)}`);

  const user = await upsertSsoUser(claims);
  const session = await signSession({ sub: user._id, email: user.email, role: user.role });
  // secure:true — HTTPS is terminated at the Cloudflare edge.
  cookies.set(SESSION_COOKIE, session, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  const dest = next.startsWith('/') ? next : '/app';
  throw redirect(303, dest);
}
