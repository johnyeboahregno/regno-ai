# Create an SMA from a Prompt File

You can create a **Subject Matter Agent (SMA)** without the admin UI by pointing
the standalone `regno` CLI at a prompt file. The CLI reads the file, sends it to
the server, and the LLM turns your freeform brief into a structured SMA profile
(name, description, focus tags, disciplines, languages).

## Usage

```bash
regno sma create --file <path>     # recommended
regno agents create --file <path>  # alias
regno sma create <path>            # positional path also works
regno sma <path>                   # drop the file path directly
regno agents <path>                # same, via the alias
```

Tip: you can **drag the file into the terminal** and drop it after `regno sma` —
the pasted path (quotes, backslashes, `~` included) is read as-is.

On success the new SMA becomes your **active SMA**, so the next
`regno ask "…"` / `regno run "…"` runs with that expert lens automatically.
Switch back any time with `regno sma base` or `regno sma <slug>`.

## Example prompt file

Save something like `f1-race-engineer.md`:

```text
I want an SMA that acts as an F1 race engineer. It should centre on Formula 1
telemetry, aero maps, tyre strategy and setup changes, speak the language of
race engineers, and be strongest when reviewing sector times and balance issues.
```

```bash
regno sma create --file f1-race-engineer.md
# creating SMA from f1-race-engineer.md (231 chars)…
# SMA created: F1 Race Engineer (f1-race-engineer)
# switched active SMA → f1-race-engineer
```

## What the LLM fills in

From your brief it derives:

- **name** — a short label (slugs from the name).
- **description** — the specialism in 1–3 sentences.
- **focusTags** — 3–8 keywords used to **centre knowledge retrieval**.
- **disciplines / languages** — picked only from the known catalog, so the SMA
  pulls the matching best-practice standards.

## Notes

- You must be logged in as an **owner** (`regno login`).
- The server needs at least one LLM provider key for the inference step
  (e.g. `OPENAI_API_KEY`) — otherwise the create fails with a clear message.
- The active SMA is a client-side selection (like the web app's `localStorage`):
  this CLI keeps it in `~/.regno/state.json` and attaches it as `settings.sma`
  on each `ask` / `run`.
- See **System → SMA** (`/app/agents`) to review, edit, or delete the result.
