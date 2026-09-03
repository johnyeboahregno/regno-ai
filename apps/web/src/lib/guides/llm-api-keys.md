# LLM API Keys After Install

Use **Settings → LLM API Keys** to add or replace provider keys after an Architect has already
been installed. Keys are encrypted in the credential vault and the UI only shows whether each
provider is configured.

## Supported keys

| Provider | Setting |
|---|---|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google AI Studio | `GOOGLE_AI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |

## How to update keys

1. Open `/app/settings`.
2. Paste the key for each provider you want the Architect to use.
3. Leave an existing provider blank to keep its current key.
4. Save.
5. Click **Restart execution** in the same Settings panel so Architect chat and Cortex Flow jobs
	hydrate the saved keys.

The web process can use newly saved keys immediately for web-side calls such as semantic search.
The execution worker hydrates vault keys on startup, and the Settings button restarts only that
worker. You do not need command-line access for normal post-install key updates.

## Verify

Run a small Architect chat job and check `/app/health` or `/app/executions` for LLM usage. If no
provider keys are configured, the fallback chain reports `no API keys configured` and keyless flows
continue to use deterministic fallbacks where available.