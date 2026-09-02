import type { Handle } from '@sveltejs/kit';
import { setUsageSink } from '@regno/ai';
import { recordAiUsage } from '@regno/db';
import { startArchitectTelemetry } from '$lib/server/architect-telemetry.js';

// Capture AI usage (tokens + cost) for every LLM call made from the web process
// (e.g. Oracle semantic search embeddings). recordAiUsage is best-effort/non-throwing.
setUsageSink((u) => {
  void recordAiUsage(u);
});

// Report back to the Mothership when this process is a provisioned Architect
// (MOTHERSHIP_URL + ARCHITECT_SLUG + ARCHITECT_TELEMETRY_TOKEN are set in .env.prod).
startArchitectTelemetry();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
