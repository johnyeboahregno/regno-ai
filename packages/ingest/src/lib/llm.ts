/**
 * Small LLM/embedding helpers with a graceful keyless mode.
 * Every call degrades to null / deterministic fallback when no provider key
 * is configured, so the pipeline always completes (matches the repo's
 * "simulated fallback" convention).
 */
import { chat, embed } from '@regno/ai';
import type { ChatMessage, ChatOptions } from '@regno/ai';

export const EMBED_DIM = 1536;

export function hasLlmKey(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );
}

/** Best-effort chat; returns null when keyless or the provider errors. */
export async function chatSafe(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string | null> {
  if (!hasLlmKey()) return null;
  try {
    return await chat(messages, opts);
  } catch (e) {
    console.warn(`[ingest:llm] chat failed (${opts.model ?? 'default'}): ${(e as Error).message}`);
    return null;
  }
}

/** Best-effort OpenAI embedding; null when keyless or on error. */
export async function embedSafe(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return await embed(text);
  } catch (e) {
    console.warn(`[ingest:llm] embed failed: ${(e as Error).message}`);
    return null;
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Cheap deterministic relevance: fraction of significant query terms present. */
export function keywordScore(text: string, query: string): number {
  const q = (query ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  if (!q.length) return 0.5;
  const t = text.toLowerCase();
  const hits = q.filter((w) => t.includes(w)).length;
  return Math.min(1, 0.3 + (hits / q.length) * 0.7);
}
