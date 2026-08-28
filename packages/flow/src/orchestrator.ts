/**
 * Orchestrator — the Cortex Flow execution pipeline (docs/cortex-flow-design.md §2):
 *   route → plan → phase loop (tools + context) → refine loop → persist + wisdom.
 */
import { randomUUID } from 'node:crypto';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { chat } from '@regno/ai';
import { remember } from '@regno/cortex';
import { DEFAULT_AGENT, loadAgent, routePrompt } from './agent.js';
import { createPlanFromAgent, selectComposeFirstDepth } from './plan.js';
import { buildTools } from './tools.js';
import { buildContext } from './context.js';
import { gradeOutput } from './quality.js';
import type { AgentDef, ExecutionResult, ExecutionSettings } from './types.js';

export type EventSink = (event: string, data: unknown) => void;

const RUBRIC =
  'Accurate and grounded, complete against the task, well-structured, actionable, and free of hallucination.';

export async function runExecution(
  prompt: string,
  settings: ExecutionSettings = {},
  onEvent?: EventSink,
  executionId: string = randomUUID(),
): Promise<ExecutionResult> {
  const emit = (event: string, data: unknown) => onEvent?.(event, { executionId, ...(data as object) });

  // 1. Agent routing
  let agent: AgentDef;
  let confidence = 0;
  if (settings.forceAgent) {
    agent = await loadAgent(settings.forceAgent);
    confidence = 1;
  } else {
    const routed = await routePrompt(prompt);
    agent = routed.agent;
    confidence = routed.confidence;
    if (confidence < 0.7) agent = DEFAULT_AGENT;
  }
  emit('v2_agent_routing', { agentSlug: agent.slug, confidence });

  // 2. Plan
  const depth = selectComposeFirstDepth(prompt, settings.analysisDepth);
  const plan = createPlanFromAgent(agent, depth, prompt);
  emit('v2_plan', { plan });

  // 3. Tools
  const repoRoot = process.env.CORTEX_REPO_ROOT ?? process.cwd();
  const tools = buildTools(repoRoot, agent.capabilities?.tools ?? []);
  const toolHelp = tools.map((t) => `${t.name}: ${t.description}`).join('\n');

  // 4. Phase loop — single strong pass per phase with context injection
  const phaseResults: Array<{ name: string; output: string }> = [];
  let finalOutput = '';
  for (const phase of plan.phases) {
    emit('v2_phase_progress', { phase: phase.name, status: 'running' });
    const ctx = await buildContext(phase.needs, settings.developer);
    const output = await chat(
      [
        {
          role: 'system',
          content: `You are the agent "${agent.name}". Complete the phase "${phase.name}" using any tools you are given (describe tool calls as needed).\nAvailable tools:\n${toolHelp}`,
        },
        {
          role: 'user',
          content: `${ctx ? `Context:\n${ctx}\n\n` : ''}Task: ${prompt}\nPhase: ${phase.name}`,
        },
      ],
      { provider: settings.provider, model: settings.model },
    );
    finalOutput = output;
    phaseResults.push({ name: phase.name, output });
    emit('v2_phase_progress', { phase: phase.name, status: 'done' });
  }

  // 5. Refine loop (QualityAuditor)
  const target = settings.targetScore ?? 80;
  const maxPasses = settings.maxPasses ?? 2;
  let graded = await gradeOutput(RUBRIC, finalOutput, settings);
  for (let pass = 0; pass < maxPasses && graded.score < target; pass++) {
    emit('v2_refine', { pass, score: graded.score });
    finalOutput = await chat(
      [
        { role: 'system', content: 'Refine the output to address the critique. Return only the improved output.' },
        { role: 'user', content: `Output:\n${finalOutput}\n\nCritique:\n${graded.critique}` },
      ],
      { provider: settings.provider, model: settings.model },
    );
    graded = await gradeOutput(RUBRIC, finalOutput, settings);
  }

  // 6. Persist execution + wisdom memory
  const db = await getDb();
  await db.collection(Collections.CORTEX_EXECUTIONS).insertOne({
    taskId: executionId,
    agentSlug: agent.slug,
    prompt,
    depth,
    phases: phaseResults,
    finalScore: graded.score,
    output: finalOutput,
    status: 'complete',
    createdAt: new Date(),
  });

  if (graded.score >= target) {
    await remember({
      id: executionId,
      agentSlug: agent.slug,
      category: 'insight',
      content: finalOutput.slice(0, 2000),
      developer: settings.developer,
    });
  }

  const result: ExecutionResult = {
    executionId,
    agentSlug: agent.slug,
    depth,
    output: finalOutput,
    finalScore: graded.score,
    phases: phaseResults,
  };
  emit('v2_execution_result', result);
  return result;
}
