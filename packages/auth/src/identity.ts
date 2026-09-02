/**
 * Regno Identity SSO — mirrors the sysadmin portal's auth (regno-websites →
 * sysadmin.regnocloud.com/includes/auth.php). Flow: redirect to
 * `${REGNO_IDENTITY_BASE_URL}/login?redirect_uri=…`, receive `identity_access_token`
 * on the callback, validate it at `/api/token/validate`, then bootstrap a local
 * `regno_session`. This is how `*.regno.ai` shares auth with `*.regnocloud.com`
 * without sharing a cookie domain.
 */
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

const IDENTITY_BASE_URL = (process.env.REGNO_IDENTITY_BASE_URL || 'https://identity.regnocloud.com').replace(/\/+$/, '');

export interface IdentityClaims {
  sub: string | number;
  email?: string;
  username?: string;
  role?: string;
  is_admin?: boolean | number | string;
}

export function identityLoginUrl(redirectUri: string): string {
  return `${IDENTITY_BASE_URL}/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

/** True when Regno Identity SSO is configured (env var set). */
export function identityEnabled(): boolean {
  return Boolean(process.env.REGNO_IDENTITY_BASE_URL);
}

/** Validate an identity access token against the Regno Identity service. */
export async function validateIdentityToken(token: string): Promise<IdentityClaims | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${IDENTITY_BASE_URL}/api/token/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: '',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { valid?: boolean; claims?: IdentityClaims };
    if (!data.valid || !data.claims || !data.claims.sub) return null;
    return data.claims;
  } catch {
    return null;
  }
}

/** Map identity claims to a local role. First SSO user becomes owner (mirrors register). */
function mapSsoRole(claims: IdentityClaims, isFirstUser: boolean): string {
  if (isFirstUser) return 'owner';
  const role = String(claims.role ?? '').toLowerCase();
  if (['owner', 'admin', 'sysadmin'].includes(role)) return 'owner';
  if (claims.is_admin === true || claims.is_admin === 1 || String(claims.is_admin) === '1') return 'owner';
  return 'user';
}

/** Find-or-create the local user for the given identity claims. */
export async function upsertSsoUser(claims: IdentityClaims): Promise<{ _id: string; email: string; role: string }> {
  const db = await getDb();
  const users = db.collection(Collections.USERS);
  const sub = String(claims.sub);
  const email = String(claims.email ?? `${sub}@regnocloud.com`).toLowerCase();

  const existing = await users.findOne({ $or: [{ identitySub: sub }, { email }] });
  if (existing) {
    await users.updateOne({ _id: existing._id }, { $set: { identitySub: sub, email } });
    return { _id: String(existing._id), email, role: String(existing.role ?? 'user') };
  }

  const count = await users.countDocuments();
  const role = mapSsoRole(claims, count === 0);
  const res = await users.insertOne({ identitySub: sub, email, role, createdAt: new Date() });
  return { _id: String(res.insertedId), email, role };
}
