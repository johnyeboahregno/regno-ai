/**
 * Auth helpers — password hashing (scrypt) + JWT sessions (jose, HS256).
 * Users live in the MongoDB `users` collection (docs/DB_SCHEMA.md §2.1).
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { Cookies } from '@sveltejs/kit';
import { Collections } from '@regno/shared';
import { getDb } from '@regno/db';

const enc = new TextEncoder();

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  return candidate.length === storedBuf.length && timingSafeEqual(candidate, storedBuf);
}

function secret(): Uint8Array {
  return enc.encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');
}

export interface SessionUser {
  sub: string;
  email: string;
  role: string;
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { sub: payload.sub, email: String(payload.email ?? ''), role: String(payload.role ?? 'user') };
  } catch {
    return null;
  }
}

/** Resolve the current session from request cookies (null if unauthenticated). */
export async function requireSession(cookies: Cookies): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;
  return verifySession(token);
}

/** Roles allowed to use admin-only surfaces (architect provisioning). */
export const ADMIN_ROLES = new Set(['owner', 'admin', 'sysadmin']);

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

/** Admin gate — session + role in the admin set (null when not an admin). */
export async function requireAdmin(cookies: Cookies): Promise<SessionUser | null> {
  const user = await requireSession(cookies);
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

export const SESSION_COOKIE = 'regno_session';
