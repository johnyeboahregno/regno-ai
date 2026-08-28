# Usage & Activity — design & architecture

**Status:** design (nothing built yet — every section below is *planned* unless it
says "exists"). **Owner area:** Audit & Governance (Regno.ai platform feature, with
pluggable per-module data). **Created:** 2026-06-27.

## 1. What it is & why

A second face on the **Audit & Governance** page that turns the audit stream into a
*human usage story*: for any date you can see **who used the system, what they did
(routes, changes touched, gates resolved), and trends over time** — and drill into a
single user's day as an **AI-narrated session timeline**.

The value-add the user asked for, restated as acceptance criteria:

- (a) For a picked date, instantly see **how many distinct users** were active.
- (b) See **what they did** — routes visited, changes touched, gates resolved, reviews,
  agent runs — not raw `_id`s and action codes.
- (c) See **trends** across dates (DAU, actions/user, busiest hours, module mix).
- (d) A **map** of active users that is *smart about scale*: all-UK users → a UK map,
  not a near-empty world map; a spread → widen the projection.
- (e) Click a user → a **per-session timeline + AI commentary** of exactly what they did
  that day, grounded in the events we actually collected.

The hard architectural ask: this is a **Regno.ai platform** feature, but "changes" and
"gates" are **CMS-specific**. So modules must **register as producers/consumers** through
a **standard interface**, and the generic UX renders whatever they registered — without
the usage page importing anything CMS-specific.

## 2. Grounding — what already exists (do not rebuild)

| Capability | Where | Shape |
|---|---|---|
| Per-module event silos | `src/lib/server/audit/store.ts` | time-series `audit_journal_<service>`; `service` = the producing module |
| Event envelope | `store.ts` `AuditEventDoc` | `ts`, `meta:{service,userId,tenant}`, **`sessionId`**, `action`, `entityType`, `entityId` |
| Indexes | `store.ts:49-54` | `meta.userId+ts`, `entityType+entityId+ts`, **`sessionId+ts`** |
| Query/summarise | `store.ts` `queryEvents`, `summarize` | distinct users, top creators, action counts |
| Producers emitting today | cortex, mcp, cortex-flow, alerts (grep `insertEvents`) | already tagged by `service` |
| Module registry | `src/lib/server/audit/registry.ts` | `registerDomainPack` / `registerAuditService`, `computeCoverage` (compliance lens) |
| Read API | `src/routes/api/admin/audit/query/+server.ts` | summary/coverage/timeline modes |
| Id→name resolver | `src/lib/server/audit/resolveUserNames.ts` | shared (built 2026-06-27) |
| UI | `src/lib/components/admin/AuditConsole.svelte` (+ `AuditDataBrowsers`, `AuditGraph`) | the current single page |

**Implication:** producers + session id + a registry already exist. We add a
**presentation facet** to the registry, **enrich the event envelope** (route/geo/outcome),
add a **session record**, and build the **Usage UX + AI timeline**. We do *not* invent a
new event bus.

## 3. The producer/consumer contract — the `UsageLens`

The existing `DomainPack` is a *compliance* lens (action → control). We add a parallel
**presentation lens** so a module declares how its events should *read* to a human.

```ts
// src/lib/server/usage/lensRegistry.ts   (NEW)
export interface UsageLens {
  module: string;                       // matches the audit `service`: 'cms','cortex','platform'
  label: string;                        // "Change Management"
  color?: string;                       // module accent for the timeline/legend
  events: UsageEventType[];
  /** Optional geo hint when the actor's location is derivable from the event (e.g. SP region). */
  geoHint?(e: AuditEventDoc): { lat: number; lon: number; label?: string } | null;
}

export interface UsageEventType {
  action: string;                       // matches AuditEventDoc.action, e.g. 'gate.resolve'
  label: string;                        // "Gate resolved"
  category: 'auth' | 'navigation' | 'content' | 'governance' | 'ai' | 'admin';
  icon?: string;                        // emoji/icon key for the timeline row
  weight?: number;                      // 1 = routine, 3 = material (drives "notable" filtering)
  describe(e: AuditEventDoc): string;   // "Resolved IC gate on CR1234 for Arqiva"
  href?(e: AuditEventDoc): string | null; // deep link, e.g. /cms?change=CR1234
}

export function registerUsageLens(l: UsageLens): void;
export function getLens(module: string): UsageLens | undefined;
export function describeEvent(e: AuditEventDoc): { label: string; category: string; icon?: string; href?: string|null; module: string };
```

- **CMS** registers a lens (in its server init) for `change.raise`, `gate.resolve`,
  `gate.reject`, `review.submit`, `change.withdraw`, … each with a `describe()` that turns
  the event into "Resolved IC gate on CR1234". The usage page never imports CMS code — it
  calls `describeEvent(e)` and the registry routes to the right lens by `e.meta.service`.
- **Platform** registers `auth.login`, `route.view`, `export`, etc.
- **Cortex** registers `agent.run`, `tool.call`, etc.
- Unregistered actions fall back to a humanised `action` string (refuse-to-invent: we show
  the code, we don't fabricate a description).

This is the standard interface the user asked for: **producers** emit `audit_journal_*`
events (already do) **and** register a `UsageLens`; the **consumer** (usage UX) is 100%
generic.

## 4. Datapoints — re-evaluation (the gaps to collect)

Today's envelope is enough for "who/what/when" but **not** for routes, geography, sessions
as first-class, or outcomes. Proposed additions (all optional, back-compatible):

| Field | On | Why | Source |
|---|---|---|---|
| `route` | event | navigation timeline ("viewed /cms/change/CR1234") | client nav → beacon, or server route |
| `outcome` | event | success/denied/error in the story | the action site |
| `durationMs` | event (nav) | dwell per page, busiest screens | client unload beacon |
| `target` (human key) | event | so timelines read without a second lookup | producer (e.g. `CR1234`) |
| **session record** | **new `audit_sessions`** | group a day into sessions; carry geo/device once | login + last-seen |

**`audit_sessions`** (new collection, one doc per login):
`{ sessionId, userId, service, startTs, lastTs, ip, geo:{country,region,city,lat,lon}, userAgent, device, eventCount }`.
Events keep just `sessionId`; the session carries the heavy/once-per-session context (geo,
device) so we don't stamp it on every event. The timeline joins events→session by
`sessionId`.

## 5. Session & geo capture

- **Session open/refresh:** `hooks.server.ts` (or the auth layer) writes/updates the
  `audit_sessions` doc on login and bumps `lastTs`/`eventCount` cheaply.
- **Geo:** resolve `ip → geo` **once per session** via a local lookup
  (`src/lib/server/usage/geo.ts`, an offline GeoLite-style table or a cached provider — no
  per-event calls). Fallback chain: IP geo → the user's company region → "unknown".
- **Privacy:** geo stored at city granularity, IP retained only on the session (not on
  every event), TTL-able. Stated here so it's a decision, not a leak.

## 6. The smart map

`src/lib/components/admin/usage/UsageMap.svelte` (NEW), fed `[{userId,name,geo,count}]`:

1. Compute the bounding box of active users' coords.
2. **Pick projection by spread:** bbox inside GB → `geoAlbers`-style UK inset; inside Europe
   → Europe; else → world (`geoNaturalEarth`). "Be smart" = projection follows the data.
3. Cluster co-located users (company HQ) into a sized bubble; click a bubble → filter the
   user list to those users. Empty-geo users live in an "Unlocated (n)" chip, never dropped.

Renders with the d3-geo already in the dep tree (same approach as existing charts); no new
heavy map lib.

## 7. The UX — tabs

Split `AuditConsole.svelte` into a thin shell with tabs (keep today's content as tab 1):

- **Tab 1 · Overview** — exactly today's page (health, compliance coverage, who-created,
  timeline, data browsers). No behaviour change.
- **Tab 2 · User Activity** — the new surface:
  - **Calendar** (`UsageCalendar.svelte`) — pick a date (heat-shaded by DAU so busy days
    pop); range mode for trends.
  - **Day header KPIs** — distinct users, sessions, actions, module mix (criterion a/b).
  - **Map** (§6) — active users that day; click → filter list.
  - **User list** — name · company · sessions · action count · last-seen; sortable.
  - **User drawer** — click a user → **per-session timeline**: each session is a lane
    (login → … → idle), rows rendered via `describeEvent()` with icon/category/href, plus
    an **AI commentary** panel (§8).
  - **Trends strip** — DAU sparkline, actions/user, busiest hour, top routes/gates over the
    selected range (criterion c).

## 8. AI timeline + commentary (grounded, queued)

Per rule 05 (no inline LLM) and rule 10 (ground, don't invent):

- **Input:** one user's events for one day, grouped by session, each already `describe()`d
  by its lens + the session's geo/device. This is the *grounding* — the model summarises
  **only** these events.
- **Path:** `/api/admin/usage/user-day` enqueues a **BullMQ** job (`usageTimelineJob`) on
  the execution server; the worker calls the LLM with the structured events and a strict
  "summarise these events, do not invent activity" prompt → returns a narrative + bullet
  commentary (what they focused on, notable/material actions by `weight`, anomalies).
- **Cache:** keyed `{userId}:{date}`; recompute only if the day's `eventCount` changed.
  Cheap days can also be **pre-computed nightly** by a scheduled task.
- **Refuse-to-invent:** if a user has no events that day, the panel says so — it never
  fabricates a story.

## 9. Dry-run usage (few real users today)

`scripts/seed-usage-dryrun.ts` (NEW) generates **realistic synthetic usage** so the feature
is demonstrable before real traffic, following the CMS seed convention (small, varied,
deterministic seeds):

- ~8–12 personas (DCC analysts, SP users, reviewers, an admin), each with believable
  sessions across a date range: login → navigate → CMS actions (raise/resolve gate/review/
  withdraw) → logout; varied devices; geo mostly UK + a couple EU to exercise the map.
- Writes real `audit_journal_*` events + `audit_sessions` via the **same producer API**
  modules use (so the dry-run exercises the real path, not a mock).
- Idempotent + clearly tagged (`meta.synthetic=true`) so it can be purged.

## 10. Touch points & build phases

| Phase | Deliverable | Files |
|---|---|---|
| 0 | Lens registry + CMS/platform lenses | `src/lib/server/usage/lensRegistry.ts`; CMS lens in CMS server init |
| 1 | Envelope + session + geo | `audit/store.ts` (route/outcome), `audit_sessions`, `usage/geo.ts`, `hooks.server.ts` |
| 2 | Usage API | `src/routes/api/admin/usage/+server.ts` (day, user-day, map, trends) |
| 3 | UX tabs + components | split `AuditConsole.svelte`; `usage/UsageCalendar|UsageMap|UserDayTimeline|UsageTrends.svelte` |
| 4 | AI timeline | `usageTimelineJob` worker + queue; cache collection |
| 5 | Dry-run seeder | `scripts/seed-usage-dryrun.ts` |

Each phase is independently shippable; phase 0 + 5 + the map can demo value before phase 4.

## 11. Built vs planned

**Built:** nothing yet — `resolveUserNames` (id→name) landed 2026-06-27 and is reused.
**Planned:** all of §3–§9. **Reuses (not rebuilt):** the `audit_journal_*` producer path,
`sessionId`, the registry pattern, `resolveUserNames`, d3-geo.

## 12. Open decisions (need a call before phase 1)

1. **Geo source** — offline GeoLite table (self-contained, ~70MB) vs cached provider vs
   company-region-only (no IP geo). Affects privacy + the map's precision.
2. **AI cadence** — on-demand per click (cheap, lazy) vs nightly pre-compute (instant, costs
   tokens for inactive users). Recommend on-demand + cache first.
3. **Route capture** — client beacon (accurate dwell, needs a tiny client hook) vs
   server-side route logging (no dwell). Recommend server-side first, beacon later.
