# User Impersonation (Alias) Feature

**Status**: Complete
**Date**: 2026-03-27
**Author**: Claude Code

## Overview

Server-side user impersonation gated by the `alias` privilege. A privileged user can "become" another user — seeing their tasks, acting on their behalf — with every CMS write stamped `{ user: targetId, alias: realUserId }` for audit.

## How It Works

1. **Session swap**: When aliasing, `session.userId`/`email` switch to the target user. All existing code that reads `session.userId` automatically resolves the impersonated user's data, roles, permissions. The real user is preserved in `session.aliasOf`.

2. **Full page reload** on start/stop ensures all components re-fetch for the correct user.

3. **Audit trail**: Every CMS history entry written while aliasing includes `alias: realUserId` alongside `user: targetUserId`.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Client (Browser)                                     │
│                                                      │
│  AuthStore.startAlias(targetId)                      │
│    → POST /api/auth/alias { targetUserId }           │
│    → window.location.reload()                        │
│                                                      │
│  AuthStore.stopAlias()                               │
│    → DELETE /api/auth/alias                          │
│    → window.location.reload()                        │
│                                                      │
│  AliasOverlay (fixed top-right pill)                 │
│    → shows when authStore.isAliasing                 │
│    → × button calls stopAlias()                      │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│ Server                                               │
│                                                      │
│  session.ts                                          │
│    → startAlias(): saves real user to aliasOf,       │
│      swaps userId/email to target                    │
│    → stopAlias(): restores from aliasOf              │
│                                                      │
│  authManager.ts                                      │
│    → authenticateRequest(): propagates aliasOf       │
│      to SecurityContext                              │
│                                                      │
│  cmsAudit.ts                                         │
│    → stampHistory(): adds alias field if present     │
│                                                      │
│  CMS endpoints (action, draft, submit)               │
│    → use stampHistory() for all writes               │
└─────────────────────────────────────────────────────┘
```

## Implementation Phases

| # | Phase | File(s) | Status |
|---|-------|---------|--------|
| 1 | Session layer | `src/lib/server/session.ts` | Done |
| 2 | SecurityContext | `src/lib/server/security/authManager.ts`, `types.ts` | Done |
| 3 | API endpoint | `src/routes/api/auth/alias/+server.ts` | Done |
| 4 | Session endpoint | `src/routes/api/auth/session/+server.ts` | Done |
| 5 | Client auth store | `src/lib/stores/auth.svelte.ts` | Done |
| 6 | CMS audit helper | `src/lib/server/services/cmsAudit.ts` | Done |
| 7 | CMS write endpoints | `action/`, `draft/`, `submit/` | Done |
| 8 | AliasOverlay component | `src/lib/components/common/AliasOverlay.svelte` | Done |
| 9 | Root layout mount | `src/routes/+layout.svelte` | Done |
| 10 | CmsPage alias trigger | `src/lib/components/pages/CmsPage.svelte` | Done |
| 11 | Privilege config | `authManager.ts` PRIVILEGE_ALIASES | Done |

## Key Decisions

- **Session swap, not context overlay**: Swapping the session's userId means all existing code (workspace queries, permission checks, task lists) works transparently for the impersonated user. No need to modify every endpoint.

- **`aliasOf` on session record**: Stores `{ userId, email, name }` of the real user. Cleared on stop. Blocks alias chaining (can't alias while already aliasing).

- **`stampHistory()` shared helper**: Single function used by all CMS write endpoints. Adds `alias: ctx.aliasOf.userId` to history entries when aliasing.

- **`alias` privilege**: Added to `PRIVILEGE_ALIASES['admin.*']` so all admins get it automatically. Can also be granted as a standalone privilege.

## Verification Checklist

- [ ] Grant `alias` privilege to test user
- [ ] Start alias via user picker → verify page reloads as target user
- [ ] Check tasks list shows target user's tasks
- [ ] Make a change → verify history has `{ user: targetId, alias: realId }`
- [ ] Stop alias → verify return to real user
- [ ] Verify overlay appears/disappears correctly
- [ ] Verify non-privileged users cannot access alias endpoints (403)
- [ ] Verify alias chaining blocked (can't alias while already aliasing)
