/**
 * PlanEngine — docs/cortex-flow-design.md §1-2:
 *   selectComposeFirstDepth (binary gap hint) + createPlanFromAgent
 *   (phases filtered by analysisDepth).
 */
import type { AgentDef, AnalysisDepth, ExecutionPlan, PlanPhase } from './types.js';

/** Binary gap hint: external/current material → deep, else quick (compose-first). */
export function selectComposeFirstDepth(prompt: string, requested?: AnalysisDepth): AnalysisDepth {
  if (requested) return requested;
  const gapHint = /\b(latest|market|pricing|2027|current|today|news)\b/i.test(prompt);
  return gapHint ? 'deep' : 'quick';
}

export function createPlanFromAgent(agent: AgentDef, depth: AnalysisDepth, prompt: string): ExecutionPlan {
  const phases = (agent.planTemplate?.phases ?? []).filter(
    (p) => !p.depths || p.depths.length === 0 || p.depths.includes(depth),
  );
  const planPhases: PlanPhase[] = phases.map((p) => ({
    name: p.name,
    needs: p.needs ?? [],
    prompt: `[${p.name}] ${prompt}`,
  }));
  return { agentSlug: agent.slug, depth, phases: planPhases };
}
