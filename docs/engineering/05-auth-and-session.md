# Authentication & Session

> Status: stable · Last updated: 2026-08-28

## What it is

Email/password auth with JWT sessions, a protected `/app` area, and owner-role bootstrap.

## Why

Secure, self-hosted single-user-first auth with RBAC-friendly schema (`users`, `roles`).

## How it works

- Passwords: `scrypt` + per-user salt → `users.passwordHash` (`salt:hash` hex).
- Sessions: `jose` HS256 JWT in an httpOnly cookie `regno_session` (7 days).
- Endpoints: `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`.
- First registered user becomes `owner`.
- `/app/*` guarded by `app/+layout.server.ts` → redirect to `/login`.
- **Cookie gotcha**: SvelteKit defaults `secure:true` in production → over HTTP the browser
  drops the cookie and login loops. We set `secure:false` explicitly until HTTPS is on.

## Files involved

- `apps/web/src/lib/server/auth.ts`
- `apps/web/src/routes/api/auth/*`
- `apps/web/src/routes/app/+layout.server.ts`

## Reproduce / verify

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"hunter2hunter2"}'
# → sets regno_session cookie; first user = owner
```
