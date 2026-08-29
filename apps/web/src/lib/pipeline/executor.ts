/**
 * GENESIS — pipeline executor.
 * Runs a visual pipeline DAG (topological order), executing each node by type
 * and emitting node progress events for SSE. Mirrors regno.ai/pipelines.
 */
import { randomUUID } from 'node:crypto';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { chat } from '@regno/ai';
import { getCatalogNode } from './catalog.js';
import type { PipelineEdge, PipelineNode } from './types.js';

export type Emit = (event: string, data: Record<string, unknown>) => void;

export interface RunRequest {
  name?: string;
  nodes?: PipelineNode[];
  edges?: PipelineEdge[];
  pipelineId?: string;
  settings?: Record<string, unknown>;
}

export interface RunOutcome {
  executionId: string;
  status: 'completed' | 'failed';
  durationMs: number;
  outputs: Record<string, unknown>;
  error?: string;
}

/** In-memory SSE bus: executionId → { events, listeners }. */
const bus = new Map<
  string,
  {
    events: Array<{ event: string; data: Record<string, unknown> }>;
    listeners: Set<(event: string, data: Record<string, unknown>) => void>;
    done: boolean;
  }
>();

export function subscribe(executionId: string, listener: (event: string, data: Record<string, unknown>) => void): () => void {
  let entry = bus.get(executionId);
  if (!entry) {
    entry = { events: [], listeners: new Set(), done: false };
    bus.set(executionId, entry);
  }
  // replay buffered events
  for (const { event, data } of entry.events) listener(event, data);
  entry.listeners.add(listener);
  return () => entry?.listeners.delete(listener);
}

export function isExecutionDone(executionId: string): boolean {
  return bus.get(executionId)?.done ?? false;
}

export function getExecutionEvents(executionId: string) {
  return bus.get(executionId)?.events ?? [];
}

function emitToBus(executionId: string, event: string, data: Record<string, unknown>) {
  // Buffer events even before any subscriber connects, so a fast run that
  // completes before the SSE client subscribes is never lost.
  let entry = bus.get(executionId);
  if (!entry) {
    entry = { events: [], listeners: new Set(), done: false };
    bus.set(executionId, entry);
  }
  const rec = { event, data };
  entry.events.push(rec);
  for (const l of entry.listeners) {
    try {
      l(event, data);
    } catch {
      /* ignore */
    }
  }
}

// ── helpers ───────────────────────────────────────────────────────
function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  return [v];
}

function stringify(v: unknown, max = 4000): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    const s = JSON.stringify(v, null, 2);
    return s.length > max ? s.slice(0, max) + '\n…(truncated)' : s;
  } catch {
    return String(v);
  }
}

function parseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function evalExpr(expr: string, ctx: unknown): unknown {
  // eslint-disable-next-line no-new-func
  const fn = new Function('ctx', `return (${expr})`);
  return fn(ctx);
}

function evalCode(body: string, ctx: Record<string, unknown>): unknown {
  // eslint-disable-next-line no-new-func
  const fn = new Function(...Object.keys(ctx), body);
  return fn(...Object.values(ctx));
}

// ── topo sort ─────────────────────────────────────────────────────
function topoSort(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!indegree.has(e.from) || !indegree.has(e.to)) continue;
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
    adj.get(e.from)?.push(e.to);
  }
  const queue: string[] = [];
  for (const [id, d] of indegree) if (d === 0) queue.push(id);
  const order: PipelineNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodes.find((n) => n.id === id);
    if (node) order.push(node);
    for (const to of adj.get(id) ?? []) {
      indegree.set(to, (indegree.get(to) ?? 0) - 1);
      if ((indegree.get(to) ?? 0) === 0) queue.push(to);
    }
  }
  if (order.length !== nodes.length) {
    throw new Error('Pipeline contains a cycle — remove a loop edge and try again.');
  }
  return order;
}

function firstInput(portValues: Record<string, unknown>): unknown {
  const keys = Object.keys(portValues);
  return keys.length ? portValues[keys[0]] : null;
}

// ── node implementations ───────────────────────────────────────────
async function runNode(
  node: PipelineNode,
  portValues: Record<string, unknown>,
  emit: Emit,
  executionId: string,
  settings: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const def = getCatalogNode(node.type);
  const cfg = node.config ?? {};
  const out = (v: unknown): Record<string, unknown> => {
    const r: Record<string, unknown> = {};
    for (const p of def.outputs) r[p] = v;
    if (def.outputs.length === 0) r['__out'] = v;
    return r;
  };
  const log = (message: string, level: 'info' | 'ok' | 'error' | 'warn' = 'info') =>
    emitToBus(executionId, 'log', { message, level, nodeId: node.id });

  switch (node.type) {
    case 'datasource': {
      let items: unknown[] = [];
      const collection = String(cfg.collection ?? '').trim();
      if (collection) {
        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const docs = await db.collection(collection).find({}).limit(20).toArray();
            items = docs.map((d) => ({ ...d, _id: String(d._id) }));
            log(`Fetched ${items.length} docs from "${collection}"`);
          } catch (e) {
            log(`Collection "${collection}" unavailable (${(e as Error).message})`, 'warn');
          }
        }
      }
      if (items.length === 0) {
        const parsed = parseJson(String(cfg.sample ?? ''));
        items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      }
      return out(items);
    }

    case 'http': {
      const url = String(cfg.url ?? '').trim();
      if (!url) throw new Error('HTTP Request needs a URL');
      const res = await fetch(url, { method: String(cfg.method ?? 'GET') });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const text = await res.text();
      log(`Fetched ${text.length} chars from ${url}`);
      return out(text);
    }

    case 'knowledge': {
      let content = String(cfg.content ?? '').trim();
      const url = String(cfg.url ?? '').trim();
      if (url) {
        try {
          const res = await fetch(url);
          content = (await res.text()).slice(0, 8000);
        } catch {
          log(`URL fetch simulated for ${url}`, 'warn');
          content = content || `Knowledge from ${url}`;
        }
      }
      return out([{ title: 'Knowledge Source', content, sourceUrl: url || 'manual' }]);
    }

    case 'transform': {
      const expr = String(cfg.expression ?? '').trim() || 'item => item';
      // eslint-disable-next-line no-new-func
      const mapper = new Function(
        'item',
        'index',
        `return typeof (${expr}) === "function" ? (${expr})(item, index) : (${expr})`,
      ) as (item: unknown, index: number) => unknown;
      const input = firstInput(portValues);
      if (typeof input === 'string') return out(mapper(input, 0));
      return out(asArray(input).map((item, i) => mapper(item, i)));
    }

    case 'code': {
      const body = String(cfg.fn ?? '').trim() || 'items => items';
      const input = firstInput(portValues);
      const value = evalCode(body, { items: asArray(input), input });
      return out(value);
    }

    case 'mapper': {
      const mapping = (parseJson(String(cfg.mapping ?? '{}')) as Record<string, string>) || {};
      const input = firstInput(portValues);
      return out(
        asArray(input).map((item) => {
          const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : { value: item };
          const r: Record<string, unknown> = {};
          for (const [from, to] of Object.entries(mapping)) r[to || from] = o[from];
          return r;
        }),
      );
    }

    case 'aggregation': {
      const groupBy = String(cfg.groupBy ?? '').trim();
      const op = String(cfg.op ?? 'count');
      const valueField = String(cfg.valueField ?? '').trim();
      const input = asArray(firstInput(portValues));
      const groups = new Map<string, unknown[]>();
      for (const item of input) {
        const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : { value: item };
        const key = String(o[groupBy] ?? 'default');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      const results = Array.from(groups.entries()).map(([key, items]) => {
        const base: Record<string, unknown> = { [groupBy || 'group']: key, count: items.length };
        if (op === 'sum' || op === 'avg') {
          const vals = items.map((i) => Number((i as Record<string, unknown>)[valueField] ?? 0));
          const sum = vals.reduce((a, b) => a + b, 0);
          base.sum = sum;
          if (op === 'avg') base.avg = items.length ? sum / items.length : 0;
        }
        if (op === 'join') {
          base.items = items;
        }
        return base;
      });
      return out(results);
    }

    case 'filter': {
      const cond = String(cfg.condition ?? '').trim() || 'item => true';
      // eslint-disable-next-line no-new-func
      const predicate = new Function(
        'item',
        `return typeof (${cond}) === "function" ? (${cond})(item) : (${cond})`,
      ) as (item: unknown) => boolean;
      const input = firstInput(portValues);
      return out(asArray(input).filter((item) => !!predicate(item)));
    }

    case 'switch': {
      const field = String(cfg.field ?? '').trim();
      const v1 = String(cfg.value ?? '').trim();
      const v2 = String(cfg.value2 ?? '').trim();
      const input = asArray(firstInput(portValues));
      const byBranch: Record<string, unknown[]> = { default: [] };
      for (const item of input) {
        const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : { value: item };
        const val = String(o[field] ?? '');
        let branch = 'default';
        if (v1 && val === v1) branch = 'branch-1';
        else if (v2 && val === v2) branch = 'branch-2';
        if (!byBranch[branch]) byBranch[branch] = [];
        byBranch[branch].push(item);
      }
      const r: Record<string, unknown> = {};
      for (const p of def.outputs) r[p] = byBranch[p] ?? [];
      return r;
    }

    case 'merge': {
      const merged: unknown[] = [];
      for (const v of Object.values(portValues)) merged.push(...asArray(v));
      return out(merged);
    }

    case 'delay': {
      const ms = Math.max(0, Number(cfg.ms ?? 0));
      if (ms > 0) await new Promise((res) => setTimeout(res, ms));
      return out(firstInput(portValues));
    }

    case 'buffer': {
      const size = Math.max(1, Number(cfg.size ?? 10));
      const input = asArray(firstInput(portValues));
      const batches: unknown[][] = [];
      for (let i = 0; i < input.length; i += size) batches.push(input.slice(i, i + size));
      return out(batches);
    }

    case 'foreach': {
      const input = firstInput(portValues);
      if (typeof input === 'string') return out([input]);
      return out(asArray(input));
    }

    case 'staging': {
      const requireContent = cfg.requireContent !== false;
      const input = asArray(firstInput(portValues));
      const staged = input
        .map((item) => {
          if (typeof item === 'string') return { content: item, __staged: true };
          const o = item as Record<string, unknown>;
          if (requireContent && o?.content == null && o?.text == null) return null;
          return { ...o, __staged: true };
        })
        .filter(Boolean);
      log(`Staged ${staged.length} knowledge items (${input.length - staged.length} rejected)`);
      return out(staged);
    }

    case 'synthesis': {
      const input = asArray(firstInput(portValues));
      const joinKey = String(cfg.joinKey ?? '').trim();
      const byKey = new Map<string, string[]>();
      for (const item of input) {
        const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : { content: item };
        const key = String(joinKey && o[joinKey] != null ? o[joinKey] : o.title ?? 'doc');
        const content = stringify(o.content ?? item, 2000);
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(content);
      }
      const unified = Array.from(byKey.entries()).map(([key, parts]) => ({
        title: key,
        content: parts.join('\n\n'),
        __unified: true,
      }));
      log(`Synthesized ${unified.length} unified documents`);
      return out(unified);
    }

    case 'llm':
    case 'expert':
    case 'analyst':
    case 'insights':
    case 'maestro':
    case 'docgen': {
      const promptTemplate =
        String(cfg.prompt ?? cfg.question ?? cfg.task ?? cfg.template ?? 'Answer using the input:\n\n{input}');
      // Build context from EVERY connected input port (e.g. an Expert node's
      // 'context' + 'tools' ports), so attached tool nodes feed the model.
      const ctxParts = Object.entries(portValues)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([port, v]) => `[${port}]\n${stringify(v, 5000)}`);
      const contextBlock = ctxParts.join('\n\n');
      const prompt = promptTemplate.replaceAll('{input}', contextBlock || 'No input');
      const provider =
        (String(cfg.provider ?? settings.provider ?? 'openai') as 'openai' | 'anthropic' | 'google') || 'openai';
      const model = String(cfg.model ?? settings.model ?? '').trim() || undefined;
      try {
        const answer = await chat(
          [
            { role: 'system', content: `You are the ${def.label} node inside a Regno.ai GENESIS pipeline.` },
            { role: 'user', content: prompt },
          ],
          { provider, model, taskId: executionId },
        );
        log(`${def.label} answered (${answer.length} chars)`, 'ok');
        return out(answer);
      } catch (e) {
        log(`${def.label} provider error: ${(e as Error).message} — returning simulated analysis`, 'warn');
        const simulated = `[${def.label} — simulated]\n\nInput:\n${contextBlock || stringify(firstInput(portValues), 1200)}\n\nAnalysis:\nThe ${def.label} node reviewed the incoming payload and produced a deterministic analysis. Configure a provider API key to enable real generation.`;
        return out(simulated);
      }
    }

    case 'file-io': {
      const path = String(cfg.path ?? '').trim();
      const content = String(cfg.content ?? '').trim();
      if (path && !content) {
        try {
          const { readFileSync } = await import('node:fs');
          const fsContent = readFileSync(path, 'utf8');
          log(`Read ${fsContent.length} chars from ${path}`, 'ok');
          return out([{ tool: 'file-io', path, content: fsContent.slice(0, 20000) }]);
        } catch (e) {
          log(`file-io read failed: ${(e as Error).message}`, 'warn');
        }
      }
      return out([{ tool: 'file-io', path, content: content || '(no content)' }]);
    }

    case 'web-fetcher': {
      const url = String(cfg.url ?? '').trim();
      if (!url) throw new Error('Web Fetcher needs a URL');
      const res = await fetch(url);
      const text = await res.text();
      log(`Fetched ${text.length} chars from ${url}`, 'ok');
      return out([{ tool: 'web-fetcher', url, content: text.slice(0, 20000) }]);
    }

    case 'web-search': {
      const query = String(cfg.query ?? '').trim() || 'genesis pipelines';
      log(`Web Search (simulated) for "${query}" — configure a search engine to enable real results`, 'warn');
      return out([
        { tool: 'web-search', query, results: [`Simulated result for "${query}" — hook up a search API to enable live results.`] },
      ]);
    }

    case 'cost-tracker': {
      const budget = Number(cfg.budgetUsd ?? 1);
      const input = firstInput(portValues);
      const estChars = stringify(input, 20000).length;
      const estTokens = Math.ceil(estChars / 4);
      const estCost = (estTokens / 1_000_000) * 3; // rough $3/M tokens
      log(`Cost Tracking: ~${estTokens} tokens ≈ $${estCost.toFixed(4)} (budget $${budget})`, 'ok');
      return out({ ...(input && typeof input === 'object' ? (input as object) : { value: input }), __costUsd: estCost });
    }

    case 'performance': {
      const start = Date.now();
      const input = firstInput(portValues);
      const ms = Date.now() - start;
      log(`Performance: node took ${ms}ms`, 'ok');
      return out(input);
    }

    case 'error-handler': {
      const input = firstInput(portValues);
      if (input === null || input === undefined) {
        const fallback = parseJson(String(cfg.fallback ?? '{}'));
        log('Error Handling: upstream produced no data — applied fallback', 'warn');
        return out(fallback ?? {});
      }
      return out(input);
    }

    case 'audit-trail': {
      const input = firstInput(portValues);
      const action = String(cfg.action ?? 'pipeline-step') || 'pipeline-step';
      const entry = { action, node: node.label, ts: new Date().toISOString(), payload: stringify(input, 2000) };
      try {
        const db = await getDb().catch(() => null);
        if (db) await db.collection(Collections.AUDIT).insertOne(entry);
      } catch {
        /* best effort */
      }
      log(`Audit Trail: recorded "${action}"`, 'ok');
      return out(input);
    }

    case 'display':
    case 'datagrid':
    case 'chart': {
      return out(firstInput(portValues));
    }

    case 'sink': {
      const input = firstInput(portValues);
      const collection = String(cfg.collection ?? '').trim();
      if (collection) {
        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const items = asArray(input).map((i) =>
              typeof i === 'string' ? { content: i } : i,
            ) as Record<string, unknown>[];
            await db.collection(collection).insertMany(items.map((i) => ({ ...i, _pipeline: executionId })));
            log(`Wrote ${items.length} records to "${collection}"`, 'ok');
          } catch (e) {
            log(`Sink write failed: ${(e as Error).message}`, 'warn');
          }
        }
      }
      return out(input);
    }

    case 'cortex-index': {
      const input = asArray(firstInput(portValues));
      const db = await getDb().catch(() => null);
      let written = 0;
      if (db) {
        const domain = String(cfg.domain ?? 'pipeline') || 'pipeline';
        const tags = String(cfg.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
        for (const item of input) {
          const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : { content: item };
          const title = String(o.title ?? o.name ?? `GENESIS ${executionId.slice(0, 6)}`);
          const content = stringify(o.content ?? item, 20000);
          await db.collection(Collections.CORTEX_INDEX).insertOne({
            title,
            content,
            domain,
            tags,
            sourceUrl: `genesis://${executionId}`,
            status: 'indexed',
            indexedAt: new Date(),
            _factsExtracted: false,
          });
          written++;
        }
      }
      log(`Promoted ${written} items into Cortex Index`, written ? 'ok' : 'warn');
      return out({ written, domain: String(cfg.domain ?? 'pipeline') });
    }

    default: {
      // passthrough / no-op nodes
      log(`${def.label}: no-op in this build`, 'warn');
      return out(firstInput(portValues));
    }
  }
}

// ── public runner ──────────────────────────────────────────────────
export async function runPipeline(
  req: RunRequest,
  emit: Emit,
  executionId: string = randomUUID(),
): Promise<RunOutcome> {
  const started = Date.now();
  const nodes = Array.isArray(req.nodes) ? req.nodes : [];
  const edges = Array.isArray(req.edges) ? req.edges : [];
  const results = new Map<string, Record<string, unknown>>();
  const outputs: Record<string, unknown> = {};
  const logs: Array<{ message: string; level: string }> = [];

  const emitL = (event: string, data: Record<string, unknown>) => {
    emit(event, data);
    emitToBus(executionId, event, data);
  };

  emitL('execution_started', { executionId, name: req.name ?? 'untitled' });

  try {
    const order = topoSort(nodes, edges);

    for (const node of order) {
      emitL('node_started', { nodeId: node.id, type: node.type, label: node.label });
      const portValues: Record<string, unknown> = {};
      for (const e of edges.filter((ed) => ed.to === node.id)) {
        const src = results.get(e.from);
        if (!src) {
          portValues[e.toPort] = null;
          continue;
        }
        // The UI stores ports as oN / iN; resolve 'oN' to the source node's
        // catalog output label (e.g. 'data', 'default', 'branch-1').
        const srcNode = nodes.find((n) => n.id === e.from);
        const srcDef = srcNode ? getCatalogNode(srcNode.type) : null;
        let val: unknown = null;
        if (srcDef && e.fromPort.startsWith('o')) {
          const idx = parseInt(e.fromPort.slice(1), 10);
          const key = Number.isFinite(idx) ? srcDef.outputs[idx] : undefined;
          val = key ? src[key] ?? null : src['__out'] ?? null;
        } else {
          val = src[e.fromPort] ?? src['__out'] ?? null;
        }
        portValues[e.toPort] = val;
      }
      try {
        const byPort = await runNode(node, portValues, emitL, executionId, req.settings ?? {});
        results.set(node.id, byPort);
        outputs[node.id] = byPort['__out'] ?? firstInput(byPort);
        emitL('node_completed', { nodeId: node.id, output: outputs[node.id] });
        logs.push({ message: `✓ ${node.label}`, level: 'ok' });
      } catch (e) {
        emitL('node_error', { nodeId: node.id, error: (e as Error).message });
        logs.push({ message: `✗ ${node.label}: ${(e as Error).message}`, level: 'error' });
        throw e;
      }
    }

    const durationMs = Date.now() - started;
    emitL('execution_completed', {
      executionId,
      durationMs,
      outputs,
      nodeCount: nodes.length,
      mode: req.settings?.mode ?? 'full',
    });
    return { executionId, status: 'completed', durationMs, outputs };
  } catch (e) {
    const durationMs = Date.now() - started;
    emitL('execution_failed', { executionId, error: (e as Error).message });
    return { executionId, status: 'failed', durationMs, outputs, error: (e as Error).message };
  } finally {
    emitL('log', { message: `Execution finished in ${Date.now() - started}ms`, level: 'info' });
    const entry = bus.get(executionId);
    if (entry) entry.done = true;
    // persist a run record
    try {
      const db = await getDb().catch(() => null);
      if (db) {
        await db.collection(Collections.PIPELINE_HISTORY).insertOne({
          executionId,
          pipelineId: req.pipelineId ?? null,
          name: req.name ?? 'untitled',
          status: 'finished',
          nodeCount: nodes.length,
          logs,
          startedAt: new Date(started),
          finishedAt: new Date(),
          durationMs: Date.now() - started,
        });
      }
    } catch {
      /* best effort */
    }
  }
}
