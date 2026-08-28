# Studio doc → audio narration (STUDIO-AUDIO)

Turns an authored HTML doc (the **Script** / html-author pipeline, `/admin` → Documentation
→ Script) into narrated **MP3s** — one per selected voice — via OpenAI text-to-speech.
Great for learning/practising a pitch on a walk, or sharing a doc as audio.

## What it is / why

The Script tool already generates scored HTML docs. This adds: pick voices → on ship, a
narrated MP3 is produced **in the background** for each voice; existing docs can be
**retrofitted** with audio on demand. Defaults: **Onyx + Nova**, quality **`tts-1-hd`**.

## Architecture / where the code lives

| Part | File |
|---|---|
| TTS + storage service | `src/lib/server/services/studioAudio.ts` |
| Trigger + status API | `src/routes/api/admin/studio/docs/[id]/audio/+server.ts` (POST/GET) |
| Stream API (per voice) | `src/routes/api/admin/studio/docs/[id]/audio/[voice]/+server.ts` (GET) |
| UI | `src/lib/components/admin/AdminStudioTab.svelte` |

**Data model** — an `audio` sub-doc on the `authored_docs` record:
```
audio: { status: 'generating'|'ready'|'partial'|'failed', model, voices[],
         tracks: [{ voice, fileId, bytes, seconds, at }], error?, startedAt, finishedAt? }
```
MP3 bytes live in **GridFS** (`studio_audio` bucket); `tracks[].fileId` references them.

**Flow**
1. `POST …/audio {voices, model}` → validates the doc has HTML, sets `audio.status='generating'`,
   **fire-and-forget** kicks `generateDocAudio()`, returns `202` immediately.
2. `generateDocAudio()` (background): `htmlToNarration(finalHtml)` (strips chrome + markup) →
   `chunkText` under the 4096-char tts cap → OpenAI `/v1/audio/speech` per chunk →
   `Buffer.concat` → GridFS store → update `audio.tracks`. **Voices run in parallel**;
   superseded files are deleted.
3. UI polls `GET …/audio`; renders `<audio>` players streaming from `…/audio/[voice]`.
4. **Auto**: on ship, `AdminStudioTab.checkCompletion()` calls `triggerAudio()` if voices are
   selected. **Retrofit**: the active-doc "Generate audio" button works on any doc with HTML.

**Auth**: all routes `ensureAdmin(event, 'admin.studio')`. **Key**: `OPENAI_API_KEY` env →
else `getBestCredentialForProvider('openai')` (encrypted store).

## Key decisions

- **Background = fire-and-forget on the SvelteKit server**, not a BullMQ queue job. TTS is a
  simple I/O-bound API call (like `generate-preset` / the Launchpad live-agent), and a full
  new queue+worker was disproportionate. Trade-off: a mid-generation restart leaves
  `status='generating'`; the retrofit button re-runs it. *Built vs planned:* moving to the
  execution queue for durability/retries is a straightforward future upgrade.
- **GridFS** for the MP3s (7 MB × N voices) — never inline in the Mongo doc.
- **Narration = stripped HTML** (drops `<header>/<footer>/<nav>/<script>/<style>`), so the
  audio is the doc's content, not its chrome.

## How to use / operate

- Script tab → pick voice chips (gear for more voices + `tts-1`/`tts-1-hd`) → **Generate**.
  On ship, audio appears in the active-doc **Audio narration** panel.
- Retrofit an old doc: open it → **Generate audio**.
- Regenerate: same button (replaces the prior files for those voices).
- Standalone regen of the Launchpad practice track (separate, CLI): `scripts/tts-openai-launchpad.ts`.

## Requires

An **OpenAI credential** configured (Settings → Framework) or `OPENAI_API_KEY`. Without one,
generation marks `status='failed'` with a clear message; docs still generate normally.
