# The `/docs` Portal — Published + Internal, Access-Scoped

## What it is

`/docs` is the signed-in/public documentation portal (distinct from the **admin**
Documentation browser at `/admin`, which is deploy-gated). It now surfaces **two**
corpora in one interface, each gated by its own access model, plus an **Ask-the-docs**
RAG search scoped to exactly what the viewer is allowed to read:

1. **Published docs** — entries an admin set to `public` in the `doc_access`
   collection (the pre-existing behaviour).
2. **Internal `doc/` sections** — surfaced per the viewer's **`doc.<section>`
   privileges** (granted directly or via the `admin.docs` role). A user sees only the
   sections they hold the privilege for; locked sections are *omitted*, not greyed.

The two access systems are deliberately parallel: `doc_access` modes
(`public`/`authenticated`/`private`) drive **published** visibility; `doc.*`
privileges drive **internal** visibility. `/docs` is the first surface to show both.

## Architecture (where the code lives)

| Concern | File | Notes |
|---|---|---|
| Portal page | `src/routes/docs/+page.svelte` | Grouped **Published**/**Internal** browse + Ask panel. Loads `/api/docs/public` and `/api/docs/accessible` in parallel. |
| Published index | `src/routes/api/docs/public/+server.ts` | `mode:public` docs, no auth. Unchanged. |
| Internal index | `src/routes/api/docs/accessible/+server.ts` | **New.** Walks `doc/`, returns only sections where `can('doc.<slug>')`. No deploy/admin gate — purely `doc.*` via `getPrivilegeChecker`. Same response shape as `/api/docs/public`. |
| Published content | `src/routes/api/docs/public/content/+server.ts` | Returns `isHtml`. |
| Internal content | `src/routes/api/docs/content/+server.ts` | `doc.*`-gated per section (`sectionSlugForPath`). Page derives `isHtml` from the `.html` extension. |
| Ask (enqueue/poll) | `src/routes/api/docs/ask/+server.ts` | **New.** Resolves the caller's readable corpus — `doc.*` sections (`listDocSections` ∩ `can`) + published paths (`listPublicDocs`) — and enqueues a `doc-search` job carrying `allowedSlugs`/`allowedRels`. 403 if the caller can read nothing. |
| RAG worker | `src/lib/server/queues/workers/ScheduledWorker.ts` → `handleDocSearch` | When `allowedSlugs` is present, retrieves a wider candidate pool and **filters passages to the allow-list before Haiku synthesis**, so the answer can never cite an unreadable doc. `allowedSlugs === null` ⇒ unscoped (the admin browser's whole-corpus search). |
| Index | `src/lib/server/grounding/docSearchIndex.ts` | Shared Qdrant `doc_search` collection (chunk/embed, `{rel,heading,version,isLatest}` provenance). Built via `/api/docs/search/build`. |

### Access-scoping flow (Ask)

```
/docs Ask box → POST /api/docs/ask
  getPrivilegeChecker(event)            → allowedSlugs = doc.* sections the user holds
  listPublicDocs()                      → allowedRels  = published doc paths
  addScheduledJob('doc-search', {query, limit, allowedSlugs, allowedRels})
        ↓ (BullMQ, execution worker — never the SvelteKit server, rule 05 §2)
  handleDocSearch: retrieveDocPassages(wide) → keep p where
        allowedRels.has(p.rel) || allowedSlugs.has(sectionSlugForPath(p.rel))
        → Haiku synthesis over the filtered passages → cited answer
  GET /api/docs/ask?jobId → answer + passages (jobId opaque; already scoped)
```

## Key decisions

- **Two endpoints, not one relaxed `/api/docs/list`.** `/api/docs/list` stays
  deploy-gated and returns *all* sections (locked greyed) for the admin browser.
  `/docs` gets its own `/api/docs/accessible` that returns *only* readable sections.
  Keeps the admin surface untouched and the portal leak-free.
- **Filter at retrieval, not citations.** Scoping the passage set *before* synthesis
  means the model never even sees restricted content — stronger than hiding citations
  after the fact.
- **Admins are not special on `/docs`.** `getPrivilegeChecker` has no
  `app.administration` shortcut (by design). An admin holding only `doc.general`
  (via the `admin.docs` role) sees General + published on `/docs`; full access lives
  in the admin browser. Consistent with the privilege model.
- **Reuse the one `doc_search` index.** Both the admin "Ask the docs" and the portal
  Ask share the same Qdrant collection; only the *scoping* differs per caller.

## How to run / operate

- The Ask feature needs the `doc_search` index populated: `POST /api/docs/search/build`
  (deploy-gated) or the admin browser's build button. Readiness: `GET /api/docs/search/build`.
- `doc.<section>` privileges auto-sync to live folders via `syncDocPrivileges`
  (fired from `/api/docs/list`); seed/re-sync with `node scripts/seed-doc-privileges.cjs`.
- Grant access: assign the `admin.docs` role (baseline `doc.general`) and/or specific
  `doc.<section>` privileges to a user/role. Effective privileges resolve **at login**
  — existing sessions need a re-login to pick up new grants.

## Built vs planned

- **Built:** everything above — both indexes, access-scoped RAG, grouped portal UI,
  clickable citations.
- **Not done:** instant keyword search (the portal uses RAG only); per-doc
  `authenticated`-mode docs (`accessiblePathsForRoles`) are **not** yet merged into the
  portal's internal list — only `public` (published) + `doc.*` (internal) are shown.
