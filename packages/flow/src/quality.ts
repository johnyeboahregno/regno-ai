/**
 * QualityAuditor — grades output against a rubric and returns a critique.
 * Docs: cortex-flow-design.md §2.3 (Orchestrator.runRefineLoop).
 */
import { chat } from '@regno/ai';
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

  const text = await chat([{ role: 'user', content: prompt }], {
    provider: settings.provider,
    model: settings.model,
    temperature: 0.2,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { score: 70, critique: text };
  try {
    const parsed = JSON.parse(match[0]) as { score?: number; critique?: string };
    return { score: Number(parsed.score ?? 0), critique: String(parsed.critique ?? '') };
  } catch {
    return { score: 70, critique: text };
  }
}
