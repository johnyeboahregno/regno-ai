/**
 * QualityAuditor — grades output against a rubric and returns a critique.
 * Docs: cortex-flow-design.md §2.3 (Orchestrator.runRefineLoop).
 */
import { structuredChat } from './toolLoop.js';
import type { ExecutionSettings } from './types.js';

export async function gradeOutput(
  rubric: string,
  output: string,
  settings: ExecutionSettings,
): Promise<{ score: number; critique: string }> {
  const prompt = [
    'You are a quality auditor. Grade the output against the rubric.',
    'Respond with JSON only: {"score": <0-100>, "critique": "<specific, actionable>"}',
    '',
    `Rubric:\n${rubric}`,
    '',
    `Output:\n${output}`,
  ].join('\n');

  const { data, raw } = await structuredChat<{ score?: number; critique?: string }>(
    [{ role: 'user', content: prompt }],
    {
      provider: settings.provider,
      model: settings.model,
      temperature: 0.2,
      fallback: settings.fallback,
    },
  );

  if (!data) return { score: 70, critique: raw };
  return { score: Number(data.score ?? 0), critique: String(data.critique ?? '') };
}
