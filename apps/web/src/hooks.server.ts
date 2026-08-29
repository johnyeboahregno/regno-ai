import type { Handle } from '@sveltejs/kit';
import { setUsageSink } from '@regno/ai';
import { recordAiUsage } from '@regno/db';

// Capture AI usage (tokens + cost) for every LLM call made from the web process
// (e.g. Oracle semantic search embeddings). recordAiUsage is best-effort/non-throwing.
setUsageSink((u) => {
  void recordAiUsage(u);
});

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
