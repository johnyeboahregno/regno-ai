import { getDb } from './mongo.js';
import { Collections } from '@regno/shared';

export type LlmProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';
export type LlmTaskContext = 'default' | 'coding' | 'debugging' | 'research' | 'writing' | 'analysis' | 'fast';

export interface LlmTaskPreference {
  context: LlmTaskContext;
  label: string;
  description: string;
  provider: LlmProvider;
  model?: string;
}

export interface LlmPreferences {
  defaultProvider: LlmProvider;
  defaultModel?: string;
  fallback: boolean;
  taskPreferences: LlmTaskPreference[];
  updatedAt?: Date;
}

const CONFIG_ID = 'llm_preferences';

export const LLM_PROVIDERS: Array<{ provider: LlmProvider; label: string; defaultModel: string }> = [
  { provider: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { provider: 'anthropic', label: 'Anthropic', defaultModel: 'claude-sonnet-4-20250514' },
  { provider: 'google', label: 'Google', defaultModel: 'gemini-2.0-flash' },
  { provider: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
];

export const DEFAULT_LLM_TASK_PREFERENCES: LlmTaskPreference[] = [
  {
    context: 'coding',
    label: 'Coding & implementation',
    description: 'Code generation, refactors, framework work, and concrete implementation tasks.',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
  {
    context: 'debugging',
    label: 'Debugging & fixes',
    description: 'Failure analysis, stack traces, regressions, and precise repair loops.',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  {
    context: 'research',
    label: 'Research & discovery',
    description: 'Exploration, comparison, summarisation, and knowledge-gathering jobs.',
    provider: 'google',
    model: 'gemini-2.0-flash',
  },
  {
    context: 'writing',
    label: 'Writing & documentation',
    description: 'Guides, docs, explanations, release notes, and narrative synthesis.',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
  {
    context: 'analysis',
    label: 'Reasoning & architecture',
    description: 'Planning, tradeoff analysis, system design, and multi-step reasoning.',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  {
    context: 'fast',
    label: 'Fast / low-cost jobs',
    description: 'Small, cheap, latency-sensitive tasks where good-enough output is fine.',
    provider: 'deepseek',
    model: 'deepseek-chat',
  },
];

export const DEFAULT_LLM_PREFERENCES: LlmPreferences = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o-mini',
  fallback: true,
  taskPreferences: DEFAULT_LLM_TASK_PREFERENCES,
};

function isProvider(value: unknown): value is LlmProvider {
  return LLM_PROVIDERS.some((provider) => provider.provider === value);
}

function isContext(value: unknown): value is LlmTaskContext {
  return ['default', 'coding', 'debugging', 'research', 'writing', 'analysis', 'fast'].includes(String(value));
}

function normaliseTaskPreferences(input: unknown): LlmTaskPreference[] {
  if (!Array.isArray(input)) return DEFAULT_LLM_TASK_PREFERENCES;
  const defaults = new Map(DEFAULT_LLM_TASK_PREFERENCES.map((pref) => [pref.context, pref]));
  for (const item of input) {
    const pref = item as Partial<LlmTaskPreference>;
    if (!isContext(pref.context) || pref.context === 'default' || !isProvider(pref.provider)) continue;
    const current = defaults.get(pref.context);
    if (!current) continue;
    defaults.set(pref.context, {
      ...current,
      provider: pref.provider,
      model: String(pref.model ?? '').trim() || undefined,
    });
  }
  return [...defaults.values()];
}

function normalisePreferences(input: Partial<LlmPreferences> | null | undefined): LlmPreferences {
  return {
    defaultProvider: isProvider(input?.defaultProvider) ? input.defaultProvider : DEFAULT_LLM_PREFERENCES.defaultProvider,
    defaultModel: String(input?.defaultModel ?? DEFAULT_LLM_PREFERENCES.defaultModel ?? '').trim() || undefined,
    fallback: input?.fallback ?? DEFAULT_LLM_PREFERENCES.fallback,
    taskPreferences: normaliseTaskPreferences(input?.taskPreferences),
    updatedAt: input?.updatedAt,
  };
}

export async function getLlmPreferences(): Promise<LlmPreferences> {
  const db = await getDb();
  const doc = await db.collection(Collections.SYSTEM_CONFIG).findOne({ key: CONFIG_ID });
  return normalisePreferences(doc?.value as Partial<LlmPreferences> | undefined);
}

export async function saveLlmPreferences(input: Partial<LlmPreferences>): Promise<LlmPreferences> {
  const db = await getDb();
  const next = { ...normalisePreferences(input), updatedAt: new Date() };
  await db.collection(Collections.SYSTEM_CONFIG).updateOne(
    { key: CONFIG_ID },
    { $set: { key: CONFIG_ID, value: next, updatedAt: next.updatedAt }, $setOnInsert: { createdAt: next.updatedAt } },
    { upsert: true },
  );
  return next;
}

export function inferLlmTaskContext(prompt: string): LlmTaskContext {
  const text = prompt.toLowerCase();
  if (/\b(fix|bug|error|failed|failing|stack trace|debug|regression|broken)\b/.test(text)) return 'debugging';
  if (/\b(code|implement|build|refactor|component|api|database|svelte|react|typescript|php|python)\b/.test(text)) return 'coding';
  if (/\b(research|compare|find|search|learn|investigate|explore|summari[sz]e)\b/.test(text)) return 'research';
  if (/\b(document|docs|guide|explain|write|release notes|readme|copy)\b/.test(text)) return 'writing';
  if (/\b(architecture|design|plan|strategy|tradeoff|reason|analyse|analyze)\b/.test(text)) return 'analysis';
  if (/\b(quick|fast|cheap|low cost|small)\b/.test(text)) return 'fast';
  return 'default';
}

export async function resolveLlmSettingsForPrompt(
  prompt: string,
  explicit: { provider?: unknown; model?: unknown; fallback?: unknown } = {},
): Promise<{ provider: LlmProvider; model?: string; fallback: boolean; llmContext: LlmTaskContext }> {
  const prefs = await getLlmPreferences();
  const llmContext = inferLlmTaskContext(prompt);
  const taskPref = prefs.taskPreferences.find((pref) => pref.context === llmContext);
  const provider = isProvider(explicit.provider)
    ? explicit.provider
    : taskPref?.provider ?? prefs.defaultProvider;
  const model = String(explicit.model ?? taskPref?.model ?? prefs.defaultModel ?? '').trim() || undefined;
  const fallback = typeof explicit.fallback === 'boolean' ? explicit.fallback : prefs.fallback;
  return { provider, model, fallback, llmContext };
}