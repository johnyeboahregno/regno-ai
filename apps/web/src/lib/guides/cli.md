# CLI Console

The **CLI** page (sidebar → Build → CLI) is an old-school green-screen terminal that lets you drive Regno entirely by typing commands — no buttons, just a keyboard.

## Getting started

Open the page and type `help` then press Enter. The terminal greets you with a banner and hints.

Useful shortcuts while typing:

| Key | Action |
| --- | --- |
| `Enter` | run the command |
| `↑` / `↓` | recall previous commands (history) |
| `Tab` | autocomplete a command name |
| `Ctrl+L` | clear the screen |

## Commands

| Command | What it does |
| --- | --- |
| `help` / `help <cmd>` | list commands, or show details for one |
| `ask <prompt…>` | send a prompt to your Regno Architect (aliases: `architect`, `run`) |
| `agents` | list Subject Matter Agents (alias: `smas`) |
| `agents builtins` | list built-in SMAs you can activate |
| `agents activate <slug>` | activate a built-in SMA |
| `agents create <prompt…>` | create an SMA from a prompt (alias of `sma create`) |
| `sma <slug>` | switch the active SMA used by `ask` |
| `sma create <prompt…>` | create an SMA from a prompt (LLM-derived) |
| `execs [limit]` | list recent executions (alias: `history`) |
| `ingest --url <url> [--description <desc>] [--max-pages <n>]` | crawl & ingest a website into CORTEX |
| `health` | report database / queue / SMTP / usage status (alias: `status`) |
| `goto <page>` | navigate to another page (alias: `open`) |
| `theme [name]` | view or switch the UI theme |
| `whoami` | show session identity |
| `date` | show current date & time |
| `echo <text>` | echo text back |
| `banner` | re-print the ASCII banner |
| `version` | show the CLI version |
| `clear` | clear the screen (alias: `cls`, `Ctrl+L`) |
| `exit` | leave the terminal (there is no escape) |

## Examples

```text
you@regno:~$ ask build me a small notes API with auth
you@regno:~$ agents
you@regno:~$ sma security
you@regno:~$ sma create F1 race engineer telemetry
  SMA created: F1 Race Engineer (f1-race-engineer)
  switched active SMA → f1-race-engineer
you@regno:~$ ingest --url https://example.com --description "Docs site"
you@regno:~$ execs 5
you@regno:~$ health
you@regno:~$ goto canvas
```

## Notes

- **Drop a prompt file** onto the terminal (drag & drop) to create an SMA from its contents — it reads the file and auto-switches to the new SMA.
- `ask` enqueues the same Cortex Flow execution used by the Architect chat page and polls for the result.
- Your **active SMA** is shown at the bottom of the session sidebar and remembered across sessions in `localStorage` (`regno.cli.sma`).
- The terminal follows the active app theme — switch to the **Matrix** theme for the full phosphor-green CRT look. Scanlines and a subtle flicker are always on.
