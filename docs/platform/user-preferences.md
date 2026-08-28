# Regno User Preferences (REGNO-USER-PREFS)

## What it is

A platform-wide, **per-user, per-area** preferences store so durable UI preferences (favourite tab, kept
filters, grid column settings, theme) **follow the user across devices and survive sign-out** — instead of
living only in `localStorage`, where the logout-clear logic wiped them.

This is the honest home for "what the user likes", separate from identity/auth/roles (which live on the
`users` doc and have very different access/lifecycle patterns).

## The problem it solves

Preferences were split and fragile:
- Most CMS UI prefs (favourite tab, filters, grid settings) were **localStorage-only** → lost on logout
  (the `change-management.*` clear sweep) and never followed the user to another device.
- The one server-backed path (`/api/auth/preferences` → `users.preferences`) was a **flat whitelisted
  bag** with a whole-object `$set` that clobbers on concurrent writes and doesn't scale across apps.

## Data model

One document per user in the platform `regno` DB, collection **`regno_preferences`**:

```jsonc
{
  "userId": "<platform user _id>",   // canonical key (stable; email can change)
  "email":  "user@org",              // denormalised for lookup/debug
  "prefs": {
    "global": { "theme": "dark" },
    "cms":    { "favoriteTab": "summary", "keptFilters": [...], "grid": { ... } },
    "chat":   { "defaultChatMode": "bubble" },
    "cortex": { ... }, "f1": { ... }
  },
  "createdAt": "…", "updatedAt": "…"
}
```

Namespaces (`PREF_NAMESPACES`): `global, cms, chat, cortex, f1, knowledge, labs, admin`. Each area owns
its keys — no shared flat whitelist.

## Architecture — where the code lives

| Layer | File / symbol |
|---|---|
| Server store | `src/lib/server/services/userPreferences.ts` → `userPreferencesStore.{getAll,getNamespace,setNamespace,setKey}` |
| API | `src/routes/api/preferences/+server.ts` — `GET` (all or `?ns=`), `PUT {ns, patch}` |
| Client store | `src/lib/stores/userPrefs.svelte.ts` → `userPrefs.{get,set,getNamespace,hydrate,migrateLegacy}` |
| Hydrate on login | `src/routes/+layout.svelte` (`userPrefs.hydrate()` alongside `chatStore.loadPreferencesFromServer()`) |
| First consumer | `src/apps/cms/components/CmsPage.svelte` — favourite tab via `userPrefs.get/set('cms','favoriteTab')` + `migrateLegacy` |

### Writes never clobber

`setNamespace` writes **per key** — `$set: { 'prefs.cms.favoriteTab': … }` (and `$unset` for `value:null`)
— so two areas (or two tabs) saving at once don't overwrite each other. Verified: setting `chat` after
`cms` leaves `cms` intact; `setKey(…, null)` deletes just that key. Upserts on first write.

### Seamless UX (the client store)

`localStorage` (`regno-prefs-cache`) is a **write-through cache, not the source of truth**:
- **Reads never block** — `get()` reads the reactive cache (seeded from localStorage at startup), so the UI
  has last-known prefs instantly, even before the server responds or while offline.
- **Writes are optimistic** — `set()` updates reactive state + cache immediately, then a per-namespace
  patch is **debounced (800 ms)** and `PUT` to the server; on failure the patch stays in the cache and the
  next `hydrate()` pushes it up (so a dropped write is never lost).
- **`hydrate()` reconciles** server → local: the **server wins per key**, but **local-only keys are pushed
  UP** — which makes first-login migration automatic and lossless.
- **`migrateLegacy(ns, {prefKey: legacyStorageKey})`** adopts an old localStorage value once (no-op
  thereafter), so existing users keep their settings.

## Key decisions

- **Dedicated collection, not a `users` field.** Prefs grow and change often; keeping them off the identity
  doc avoids bloat and `$set` clobbering, and lets prefs scale independently.
- **Keyed by `userId`,** not email (email is mutable).
- **Namespaced by area** so each app owns its keys and writes are atomic per key.
- **localStorage as cache, not truth** — the source of truth is the server, so logout-clear is harmless and
  prefs follow the user. This mirrors the pattern `chatStore` already uses for theme.

## Built vs planned

- **Built:**
  - The collection, `userPreferencesStore`, `/api/preferences`, the `userPrefs` client store with
    cache/hydrate/optimistic-sync/migration, hydrate-on-login.
  - **CMS favourite tab** — first consumer, migrated off localStorage-only.
  - **Report-grid settings** (`ReportGrid.svelte`) — sort / search / column filters / frozen / column
    widths now persist under `cms.grid_<persistKey>` (sanitised key), migrated from the old
    `reportgrid:*` localStorage keys. They follow the user across devices.
  - **Chat unified** — `/api/auth/preferences` is now a thin shim over `userPreferencesStore` (namespace
    `chat`); the legacy flat `users.preferences` bag is migrated into `prefs.chat` on first read.
    `chatStore` is unchanged (same endpoint contract). One source of truth.
- **Planned (follow-ups under REGNO-USER-PREFS):**
  - Retire `users.preferences` writes entirely once all users have been read-migrated (the shim still
    reads the legacy bag once; nothing writes it any more).
  - Optional explicit per-device scope for genuinely device-specific state (panel widths on a small screen).

## How to verify

```bash
# store round-trip (set → namespaced merge → per-key delete → cleanup)
npx tsx --tsconfig tsconfig.workers.json scripts/diag-prefs.ts   # (ad-hoc; see PR)
# API gate
curl -i http://localhost:5173/api/preferences        # 401 unauthenticated
```
