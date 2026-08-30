/**
 * Orchestrator — the Cortex Flow execution pipeline (docs/cortex-flow-design.md §2):
 *   route → plan → phase loop (tools + context) → refine loop → persist + wisdom.
 */
import { randomUUID, createHash } from 'node:crypto';
import { getDb, reinforceWisdom } from '@regno/db';
import { Collections } from '@regno/shared';
import { chatWithFallback } from '@regno/ai';
import { remember, recallBest, shouldServe } from '@regno/cortex';
import { DEFAULT_AGENT, loadAgent, routePrompt } from './agent.js';
import { createPlanFromAgent, selectComposeFirstDepth } from './plan.js';
import { buildTools } from './tools.js';
import { buildContext, loadSma } from './context.js';
import { gradeOutput } from './quality.js';
import { documentExecution } from './documentation.js';
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

  // 3.4. Subject Matter Expert — the lens for this job (focus area + knowledge centering).
  const sma = await loadSma(settings.sma);
  if (sma) emit('v2_sma', { sma: sma.slug, focusTags: sma.focusTags ?? [] });

  // 3.5. Recall & Serve — decision layer (docs/architecture/RECALL_SERVE_DECISION_LAYER.md).
  const serveEnabled = settings.serveEnabled ?? process.env.CORTEX_SERVE_ENABLED !== 'false';
  const serveMinScore = settings.serveMinScore ?? Number(process.env.CORTEX_SERVE_MIN_SCORE ?? 0.86);
  const serveMaxAgeDays = settings.serveMaxAgeDays ?? Number(process.env.CORTEX_SERVE_MAX_AGE_DAYS ?? 180);
  const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 16);

  // 4. Phase loop — serve from memory when confident, else a single strong LLM pass per phase.
  const phaseResults: Array<{ name: string; output: string }> = [];
  let finalOutput = '';
  let finalScore = 0;
  let servedPhases = 0;
  let llmCalls = 0;
  let taskServed = false;
  const servedFrom: Record<string, string> = {};
  const servedPromptHashes = new Set<string>();
  const developer = settings.developer ?? sma?.developer;
  const serveOpts = { developer, minScore: serveMinScore, maxAgeDays: serveMaxAgeDays };

  // 4a. Whole-task short-circuit (opt-in) — serve the entire task from memory.
  if (serveEnabled && settings.serveWholeTask) {
    const dec = shouldServe(
      (await recallBest(prompt, { ...serveOpts, limit: 3, exactPromptHash: promptHash }))[0],
      { ...serveOpts, exactPromptHash: promptHash },
    );
    if (dec.served && dec.candidate) {
      taskServed = true;
      servedPhases = plan.phases.length;
      finalOutput = dec.candidate.content;
      finalScore =
        dec.candidate.storedScore ?? (dec.candidate.score >= 0.8 ? 100 : Math.round(dec.candidate.score * 100));
      servedFrom.recall = dec.candidate.id;
      if (dec.candidate.promptHash) servedPromptHashes.add(dec.candidate.promptHash);
      emit('v2_served', { scope: 'task', candidateId: dec.candidate.id, score: dec.candidate.score, reason: dec.reason });
      await reinforceWisdom(dec.candidate.promptHash ?? promptHash).catch(() => {});
    }
  }

  if (!taskServed) {
    for (const phase of plan.phases) {
      emit('v2_phase_progress', { phase: phase.name, status: 'running' });
      let output: string | null = null;

      // Per-phase recall: a strong prior answer for this task+phase skips the LLM.
      if (serveEnabled) {
        const phaseQuery = `${prompt} — ${phase.name}`;
        const dec = shouldServe((await recallBest(phaseQuery, { ...serveOpts, limit: 3 }))[0], serveOpts);
        if (dec.served && dec.candidate) {
          output = dec.candidate.content;
          servedPhases++;
          servedFrom[phase.name] = dec.candidate.id;
          if (dec.candidate.promptHash) servedPromptHashes.add(dec.candidate.promptHash);
          finalScore = Math.max(finalScore, dec.candidate.storedScore ?? Math.round(dec.candidate.score * 100));
          emit('v2_served', {
            scope: 'phase',
            phase: phase.name,
            candidateId: dec.candidate.id,
            score: dec.candidate.score,
            reason: dec.reason,
          });
        }
      }

      if (output === null) {
        const ctx = await buildContext(phase.needs, { developer, technologies: agent.technologies, sma, prompt });
        output = await chatWithFallback(
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
          { provider: settings.provider, model: settings.model, taskId: executionId, fallback: settings.fallback },
        );
        llmCalls++;
      }

      finalOutput = output;
      phaseResults.push({ name: phase.name, output });
      emit('v2_phase_progress', { phase: phase.name, status: 'done' });
    }
  }

  // 5. Refine loop (QualityAuditor) — skipped when served from memory (saves LLM calls).
  const target = settings.targetScore ?? 80;
  const maxPasses = settings.maxPasses ?? 2;
  if (!taskServed && servedPhases === 0) {
    let graded = await gradeOutput(RUBRIC, finalOutput, settings);
    llmCalls++;
    for (let pass = 0; pass < maxPasses && graded.score < target; pass++) {
      emit('v2_refine', { pass, score: graded.score });
      finalOutput = await chatWithFallback(
        [
          { role: 'system', content: 'Refine the output to address the critique. Return only the improved output.' },
          { role: 'user', content: `Output:\n${finalOutput}\n\nCritique:\n${graded.critique}` },
        ],
        { provider: settings.provider, model: settings.model, taskId: executionId, fallback: settings.fallback },
      );
      llmCalls++;
      graded = await gradeOutput(RUBRIC, finalOutput, settings);
      llmCalls++;
    }
    finalScore = graded.score;
  }

  // 6. Persist execution + wisdom memory (or reinforce what we served).
  const db = await getDb();
  await db.collection(Collections.CORTEX_EXECUTIONS).insertOne({
    taskId: executionId,
    agentSlug: agent.slug,
    prompt,
    depth,
    phases: phaseResults,
    finalScore,
    output: finalOutput,
    status: 'complete',
    llmCalls,
    servedPhases,
    servedFrom,
    createdAt: new Date(),
  });

  if (taskServed || servedPhases > 0) {
    // Served path — reinforce the memories we served from instead of duplicating them.
    for (const h of servedPromptHashes) {
      await reinforceWisdom(h).catch(() => {});
    }
  } else if (finalScore >= target) {
    await remember({
      id: executionId,
      agentSlug: agent.slug,
      category: 'insight',
      content: finalOutput.slice(0, 2000),
      developer: settings.developer,
      prompt,
      promptHash,
      phase: 'whole',
      score: finalScore,
    });
  }

  const result: ExecutionResult = {
    executionId,
    agentSlug: agent.slug,
    depth,
    output: finalOutput,
    finalScore,
    phases: phaseResults,
  };

  // 7. Documentation pipeline — auto-document the artifact (best-effort).
  try {
    await documentExecution(prompt, result);
  } catch (e) {
    console.warn('[orchestrator] documentation skipped:', (e as Error).message);
  }

  emit('v2_execution_result', { ...result, llmCalls, servedPhases });
  return result;
}
