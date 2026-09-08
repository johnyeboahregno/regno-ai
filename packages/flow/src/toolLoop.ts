/**
 * Tool loop — the agentic execution loop behind Cortex Flow phases.
 *
 * Previously `orchestrator.ts` *described* tools to the model in a system
 * prompt but never executed them. This loop closes that gap: it injects the
 * tool schemas, parses the model's tool-call request, runs the tool, feeds the
 * result back, and repeats until the model answers without a tool call (or the
 * iteration cap is hit).
 *
 * Provider-agnostic by design: instead of native function-calling per provider,
 * the model is asked to emit a single JSON object `{"tool": "...", "args": {...}}`
 * when it needs a tool. This works identically across OpenAI / Anthropic /
 * Google / DeepSeek.
 */
import { chatWithFallback } from '@regno/ai';
import type { ChatMessage, ChatOptions } from '@regno/ai';
import type { Tool } from './tools.js';

export type ChatFn = (messages: ChatMessage[], opts?: ChatOptions) => Promise<string>;

export interface ToolLoopOptions {
  system: string;
  task: string;
  tools: Tool[];
  maxIterations?: number;
  /** When compacting, keep the last N assistant/user turns (default 6). */
  compactTurns?: number;
  provider?: ChatOptions['provider'];
  model?: string;
  fallback?: boolean;
  taskId?: string;
  /** Injectable for tests; defaults to chatWithFallback. */
  chatFn?: ChatFn;
}

export interface ToolLoopResult {
  output: string;
  llmCalls: number;
  toolCalls: number;
}

/** Render tool schemas into the system prompt. */
export function renderTools(tools: Tool[]): string {
  return tools
    .map((t) => `- ${t.name}: ${t.description}\n  args schema: ${JSON.stringify(t.schema)}`)
    .join('\n');
}

/** Find the index of the `}` that balances the `{` at `start` (string/escape aware). */
function balancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Extract a `{"tool": "...", "args": {...}}` object from a model reply, if present. */
export function extractToolCall(text: string): { tool: string; args: Record<string, unknown> } | null {
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== '{') continue;
    const end = balancedEnd(text, start);
    if (end === -1) continue;
    const candidate = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate) as { tool?: unknown; args?: unknown };
      if (parsed && typeof parsed.tool === 'string' && parsed.tool.length > 0) {
        const args =
          parsed.args && typeof parsed.args === 'object' && !Array.isArray(parsed.args)
            ? (parsed.args as Record<string, unknown>)
            : {};
        return { tool: parsed.tool, args };
      }
    } catch {
      /* not JSON — keep scanning for another object */
    }
  }
  return null;
}

/**
 * Run the agentic tool loop for a single phase. Returns the final answer plus
 * call counts so the orchestrator can attribute LLM calls accurately.
 */
export async function runToolLoop(opts: ToolLoopOptions): Promise<ToolLoopResult> {
  const chatFn = opts.chatFn ?? chatWithFallback;
  const maxIterations = Math.max(1, opts.maxIterations ?? 8);
  const compactTurns = Math.max(1, opts.compactTurns ?? 6);

  const toolBlock = opts.tools.length
    ? `\n\n## Tool use\nYou may use tools by responding with ONLY a JSON object of the shape {"tool": "<name>", "args": {...}}.\nEmit exactly one such JSON object and nothing else when you need a tool. Otherwise answer normally.\n\nAvailable tools:\n${renderTools(opts.tools)}`
    : '';

  const system = `${opts.system}${toolBlock}`;
  const history: ChatMessage[] = [];
  let llmCalls = 0;
  let toolCalls = 0;

  const build = (): ChatMessage[] => [
    { role: 'system', content: system },
    { role: 'user', content: opts.task },
    ...history,
  ];

  for (let i = 0; i < maxIterations; i++) {
    const reply = await chatFn(build(), {
      provider: opts.provider,
      model: opts.model,
      fallback: opts.fallback,
      taskId: opts.taskId,
    });
    llmCalls++;

    const call = extractToolCall(reply);
    if (!call) {
      return { output: reply, llmCalls, toolCalls };
    }

    const tool = opts.tools.find((t) => t.name === call.tool);
    if (!tool) {
      history.push({ role: 'assistant', content: reply });
      history.push({
        role: 'user',
        content: `Unknown tool "${call.tool}". Available tools: ${opts.tools.map((t) => t.name).join(', ') || '(none)'}.`,
      });
      continue;
    }

    let result: string;
    try {
      result = await tool.run(call.args);
    } catch (e) {
      result = `${call.tool} error: ${(e as Error).message}`;
    }
    toolCalls++;

    history.push({ role: 'assistant', content: reply });
    history.push({ role: 'user', content: `Tool result for ${call.tool}:\n${result}` });

    // Deterministic context compaction — drop the OLD middle turns, keeping
    // the most recent exchanges (system + task live outside `history`).
    if (history.length > compactTurns * 2) {
      history.splice(0, history.length - compactTurns * 2);
    }
  }

  // Iteration cap reached — ask for a final synthesis with the history in hand.
  const final = await chatFn(build(), {
    provider: opts.provider,
    model: opts.model,
    fallback: opts.fallback,
    taskId: opts.taskId,
  });
  llmCalls++;
  return { output: final, llmCalls, toolCalls };
}

/**
 * Ask the model for a structured (JSON) answer and parse it. Returns the parsed
 * object when the reply contains a JSON object, else null with the raw text.
 */
export async function structuredChat<T>(
  messages: ChatMessage[],
  opts: ChatOptions = {},
  chatFn: ChatFn = chatWithFallback,
): Promise<{ data: T | null; raw: string }> {
  const text = await chatFn(messages, opts);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { data: null, raw: text };
  try {
    return { data: JSON.parse(match[0]) as T, raw: text };
  } catch {
    return { data: null, raw: text };
  }
}
