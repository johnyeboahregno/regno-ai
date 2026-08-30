/**
 * @regno/ai — multi-provider LLM gateway (Anthropic / OpenAI / Google / DeepSeek)
 * + embeddings, with an optional cross-provider fallback chain.
 * Mirrors the live regno.ai "Multi-Provider LLM Access" feature.
 * Zero external deps — uses native fetch against each provider's REST API.
 */

export type Provider = 'openai' | 'anthropic' | 'google' | 'deepseek';
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: Provider;
  /** Optional execution id to attribute usage to a Cortex Flow run. */
  taskId?: string;
  /** When false, chatWithFallback won't fall through to other providers. Default true. */
  fallback?: boolean;
}

export interface UsageRecord {
  provider: Provider;
  model: string;
  kind: 'chat' | 'embed';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  ts: string;
  taskId?: string;
}

/** $ per 1M tokens, keyed by `${provider}:${model}`. Fallbacks cover unknown models. */
const PRICING: Record<string, { input: number; output: number }> = {
  'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai:gpt-4o': { input: 2.5, output: 10 },
  'openai:text-embedding-3-small': { input: 0.02, output: 0 },
  'anthropic:claude-sonnet-4-20250514': { input: 3, output: 15 },
  'google:gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'deepseek:deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek:deepseek-reasoner': { input: 0.55, output: 2.19 },
};

const PROVIDER_DEFAULT: Record<Provider, { input: number; output: number }> = {
  openai: { input: 0.15, output: 0.6 },
  anthropic: { input: 3, output: 15 },
  google: { input: 0.1, output: 0.4 },
  deepseek: { input: 0.27, output: 1.1 },
};

/** Estimate USD cost from token counts (per-model pricing, provider fallback). */
export function estimateCost(
  provider: Provider,
  model: string,
  kind: 'chat' | 'embed',
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[`${provider}:${model}`] ?? PROVIDER_DEFAULT[provider];
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

/** Module-level sink — a process (web server, execution worker) installs one to persist usage. */
export type UsageSink = (usage: UsageRecord) => void;
let usageSink: UsageSink | null = null;
export function setUsageSink(fn: UsageSink | null): void {
  usageSink = fn;
}

function emitUsage(
  base: Omit<UsageRecord, 'totalTokens' | 'cost' | 'ts' | 'inputTokens' | 'outputTokens'>,
  inputTokens: number,
  outputTokens: number,
): void {
  if (!usageSink) return;
  usageSink({
    ...base,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cost: estimateCost(base.provider, base.model, base.kind, inputTokens, outputTokens),
    ts: new Date().toISOString(),
  });
}

/** Embed text with OpenAI text-embedding-3-small (matches the docs' Qdrant collections). */
export async function embed(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    data: Array<{ embedding: number[] }>;
    usage?: { prompt_tokens?: number; total_tokens?: number };
  };
  const u = json.usage;
  if (u) emitUsage({ provider: 'openai', model, kind: 'embed' }, u.prompt_tokens ?? u.total_tokens ?? 0, 0);
  return json.data[0].embedding;
}

/** Multi-provider chat — dispatches on opts.provider (defaults to openai). */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const provider = opts.provider ?? 'openai';
  if (provider === 'openai') return chatOpenAI(messages, opts);
  if (provider === 'anthropic') return chatAnthropic(messages, opts);
  if (provider === 'google') return chatGoogle(messages, opts);
  if (provider === 'deepseek') return chatDeepSeek(messages, opts);
  throw new Error(`Unknown provider: ${provider}`);
}

/** Shared OpenAI-compatible chat client (used by OpenAI and DeepSeek). */
interface OpenAICompatConfig {
  provider: Provider;
  key: string;
  baseUrl: string;
  defaultModel: string;
  label: string;
  missingKeyError: string;
}

async function chatOpenAICompat(
  messages: ChatMessage[],
  opts: ChatOptions,
  cfg: OpenAICompatConfig,
): Promise<string> {
  if (!cfg.key) throw new Error(cfg.missingKeyError);
  const model = opts.model ?? cfg.defaultModel;
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.4,
    }),
  });
  if (!res.ok) throw new Error(`${cfg.label} chat error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const u = json.usage;
  if (u) {
    emitUsage(
      { provider: cfg.provider, model, kind: 'chat', taskId: opts.taskId },
      u.prompt_tokens ?? 0,
      u.completion_tokens ?? 0,
    );
  }
  return json.choices[0].message.content;
}

async function chatOpenAI(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  return chatOpenAICompat(messages, opts, {
    provider: 'openai',
    key: process.env.OPENAI_API_KEY ?? '',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    label: 'OpenAI',
    missingKeyError: 'OPENAI_API_KEY is not set',
  });
}

async function chatDeepSeek(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  return chatOpenAICompat(messages, opts, {
    provider: 'deepseek',
    key: process.env.DEEPSEEK_API_KEY ?? '',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    label: 'DeepSeek',
    missingKeyError: 'DEEPSEEK_API_KEY is not set',
  });
}

async function chatAnthropic(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: opts.model ?? 'claude-sonnet-4-20250514',
      system,
      messages: rest,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic chat error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    content: Array<{ text: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const u = json.usage;
  if (u) {
    emitUsage(
      { provider: 'anthropic', model: opts.model ?? 'claude-sonnet-4-20250514', kind: 'chat', taskId: opts.taskId },
      u.input_tokens ?? 0,
      u.output_tokens ?? 0,
    );
  }
  return json.content.map((c) => c.text).join('');
}

async function chatGoogle(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_API_KEY is not set');
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const model = opts.model ?? 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    },
  );
  if (!res.ok) throw new Error(`Google chat error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const u = json.usageMetadata;
  if (u) {
    emitUsage(
      { provider: 'google', model, kind: 'chat', taskId: opts.taskId },
      u.promptTokenCount ?? 0,
      u.candidatesTokenCount ?? 0,
    );
  }
  return json.candidates[0].content.parts.map((p) => p.text).join('');
}

/**
 * Fallback chain — tries `opts.provider` first (defaults to openai), then the
 * remaining providers in order. Skips providers whose API key isn't configured
 * and falls through on any request/API error. Set `opts.fallback = false` to
 * disable (single-provider behavior).
 */
const FALLBACK_ORDER: Provider[] = ['openai', 'deepseek', 'anthropic', 'google'];

const KEY_FOR_PROVIDER: Record<Provider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_AI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
};

export async function chatWithFallback(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  if (opts.fallback === false) return chat(messages, opts);
  const preferred = opts.provider ?? 'openai';
  const order = [preferred, ...FALLBACK_ORDER.filter((p) => p !== preferred)];
  const tried: Provider[] = [];
  for (const provider of order) {
    if (!KEY_FOR_PROVIDER[provider]) continue; // skip providers without a key
    tried.push(provider);
    try {
      return await chat(messages, { ...opts, provider });
    } catch (err) {
      console.warn(`[ai] ${provider} failed (${(err as Error).message}) — trying next provider`);
    }
  }
  const detail = tried.length ? `tried: ${tried.join(', ')}` : 'no API keys configured';
  throw new Error(`All providers failed (${detail})`);
}
