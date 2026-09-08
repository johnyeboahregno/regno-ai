import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractToolCall, renderTools, runToolLoop, structuredChat } from '../src/toolLoop.js';
import type { Tool } from '../src/tools.js';

const fakeTool = (name: string, result: string): Tool => ({
  name,
  description: `${name} tool`,
  schema: { type: 'object', properties: {}, required: [] },
  run: async () => result,
});

test('extractToolCall parses a JSON tool call', () => {
  const out = extractToolCall('{"tool":"read","args":{"path":"a.ts"}}');
  assert.ok(out);
  assert.equal(out.tool, 'read');
  assert.equal(out.args.path, 'a.ts');
});

test('extractToolCall tolerates surrounding text', () => {
  const out = extractToolCall('I will use the tool now:\n{"tool":"grep","args":{"pattern":"foo"}}');
  assert.ok(out);
  assert.equal(out.tool, 'grep');
});

test('extractToolCall returns null for plain text and malformed JSON', () => {
  assert.equal(extractToolCall('here is the answer'), null);
  assert.equal(extractToolCall('{"tool":"broken"'), null);
  assert.equal(extractToolCall('{"args":{"x":1}}'), null);
});

test('renderTools lists tool names and schemas', () => {
  const tools = [fakeTool('read', 'ok')];
  const out = renderTools(tools);
  assert.match(out, /read/);
  assert.match(out, /args schema/);
});

test('runToolLoop executes a tool then returns the final answer', async () => {
  const replies = ['{"tool":"calc","args":{}}', 'final answer'];
  let i = 0;
  const loop = await runToolLoop({
    system: 'sys',
    task: 'task',
    tools: [fakeTool('calc', '42')],
    chatFn: async () => replies[i++] ?? 'done',
  });
  assert.equal(loop.output, 'final answer');
  assert.equal(loop.toolCalls, 1);
  assert.equal(loop.llmCalls, 2);
});

test('runToolLoop returns immediately when the model answers without a tool', async () => {
  const loop = await runToolLoop({
    system: 'sys',
    task: 'task',
    tools: [fakeTool('calc', '42')],
    chatFn: async () => 'direct answer',
  });
  assert.equal(loop.output, 'direct answer');
  assert.equal(loop.toolCalls, 0);
  assert.equal(loop.llmCalls, 1);
});

test('runToolLoop reports an unknown tool and keeps looping', async () => {
  const replies = ['{"tool":"nope","args":{}}', '{"tool":"calc","args":{}}', 'answer'];
  let i = 0;
  const loop = await runToolLoop({
    system: 'sys',
    task: 'task',
    tools: [fakeTool('calc', '42')],
    maxIterations: 5,
    chatFn: async () => replies[i++] ?? 'done',
  });
  assert.equal(loop.output, 'answer');
  assert.equal(loop.toolCalls, 1);
});

test('runToolLoop with no tools makes a single call', async () => {
  let calls = 0;
  const loop = await runToolLoop({
    system: 'sys',
    task: 'task',
    tools: [],
    chatFn: async () => {
      calls++;
      return 'plain';
    },
  });
  assert.equal(loop.output, 'plain');
  assert.equal(loop.llmCalls, 1);
  assert.equal(calls, 1);
});

test('structuredChat parses a JSON reply', async () => {
  const { data, raw } = await structuredChat<{ score: number }>([], {}, async () => '{"score":92}');
  assert.equal(data?.score, 92);
  assert.equal(raw, '{"score":92}');
});

test('structuredChat returns null data for non-JSON replies', async () => {
  const { data } = await structuredChat<{ score: number }>([], {}, async () => 'just text');
  assert.equal(data, null);
});
