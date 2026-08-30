# Agent Disciplines & Languages

The **Regno Architects** creation wizard (`/app/agents`) originally offered a single flat
"Technologies" picker with five entries. It now splits the catalog into **Disciplines**
(practice areas) and **Languages** (implementations), and greatly expands the options.

## What changed

- **Catalog** — `GET /api/technologies` now returns `{ disciplines, languages }` instead of
  a flat `technologies` array. Entries keep the same shape: `{ slug, label, icon }`.
- **UI** — Step 2 renders two labeled groups ("Disciplines", "Languages"), each multi-select.
  Selections are tracked separately (`selectedDisciplines`, `selectedLanguages`).
- **Agent record** — `POST /api/agents` accepts `disciplines`, `languages`, and (for
  backward compatibility) `technologies`. The combined, de-duplicated list is stored in
  `technologies`, and the two groups are stored on their own fields as well.
- **Standards** — new best-practice standards were added under `standards/` so every
  selectable slug injects real guidance (see below).

## Catalog

### Disciplines

| Slug | Label | Standard |
|------|-------|----------|
| `web` | Web Development | `standards/disciplines/web.md` |
| `backend` | Backend / APIs | `standards/disciplines/backend.md` |
| `data-engineering` | Data Engineering | `standards/disciplines/data-engineering.md` |
| `machine-learning` | Machine Learning / AI | `standards/disciplines/machine-learning.md` |
| `devops` | DevOps / Platform | `standards/disciplines/devops.md` |
| `embedded` | Embedded Systems | `standards/disciplines/embedded.md` |
| `ros` | Robotics (ROS) | `standards/technologies/ros.md` |
| `security` | Security | `standards/disciplines/security.md` |
| `mobile` | Mobile Apps | `standards/disciplines/mobile.md` |

### Languages

| Slug | Label | Standard |
|------|-------|----------|
| `web-typescript` | Web / TypeScript | `standards/technologies/web-typescript.md` |
| `go` | Go | `standards/technologies/go.md` |
| `rust` | Rust | `standards/technologies/rust.md` |
| `python` | Python | `standards/technologies/python.md` |
| `cpp` | C++ | `standards/technologies/cpp.md` |
| `c` | C | `standards/technologies/c.md` |
| `java` | Java | `standards/technologies/java.md` |
| `kotlin` | Kotlin | `standards/technologies/kotlin.md` |
| `swift` | Swift | `standards/technologies/swift.md` |
| `csharp` | C# / .NET | `standards/technologies/csharp.md` |
| `php` | PHP | `standards/technologies/php.md` |
| `ruby` | Ruby | `standards/technologies/ruby.md` |
| `elixir` | Elixir | `standards/technologies/elixir.md` |
| `zig` | Zig | `standards/technologies/zig.md` |
| `sql` | SQL | `standards/technologies/sql.md` |
| `shell` | Shell / Bash | `standards/technologies/shell.md` |

## How standards are injected

`scripts/seed-standards.mjs` walks `standards/` and tags any file under
`standards/technologies/` **or** `standards/disciplines/` with `tech = <basename>`.
`packages/flow/src/context.ts` then injects a standard when its `tech` value appears in the
agent's `technologies` array. The path check is normalised (`\` → `/`) so seeding works on
Windows and Linux alike.

## Adding a new entry

1. Add the entry to `DISCIPLINES` or `LANGUAGES` in
   `apps/web/src/routes/api/technologies/+server.ts` (slug must match a standard file name).
2. Create `standards/disciplines/<slug>.md` or `standards/technologies/<slug>.md` with the
   same section style as the existing standards.
3. Re-run `node scripts/seed-standards.mjs` to index the new standard.

## Deleting an architect

The Agents table has a **Delete** action per row. It calls `DELETE /api/agents/[slug]`, which:

1. Removes the record from `agents`, `cortex_agents`, `cortex_agent_memories`,
   `cortex_executions`, `artifacts`, and `cortex_index` (developer-flavour docs).
2. Removes any `credentials` whose name is prefixed `<slug>-` (datasource secrets).
3. Tears down the k3s namespace `dev-<slug>` (best-effort, detached `kubectl`).

Owner-only, like the rest of the `/api/agents` surface.
