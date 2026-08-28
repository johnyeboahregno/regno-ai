/**
 * Documentation pipeline — every artifact the architect builds is auto-documented
 * as a markdown file and stored in the `artifacts` collection (surfaced in Docs).
 */
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import type { ExecutionResult } from './types.js';

export interface ArtifactDoc {
  taskId: string;
  title: string;
  markdown: string;
  agentSlug: string;
  prompt: string;
  createdAt: Date;
}

export async function documentExecution(prompt: string, result: ExecutionResult): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const title = prompt.trim().slice(0, 80) || 'Untitled artifact';

  const markdown = [
    `# ${title}`,
    '',
    `> Generated ${now.toISOString()} · agent \`${result.agentSlug}\` · depth \`${result.depth}\` · score \`${result.finalScore}\``,
    '',
    '## Request',
    prompt,
    '',
    '## What was built',
    result.output || '(no output)',
    '',
    '## Phases',
    ...result.phases.map((p) => `### ${p.name}\n\n${p.output}`),
    '',
  ].join('\n');

  await db.collection(Collections.ARTIFACTS).updateOne(
    { taskId: result.executionId },
    {
      $set: {
        taskId: result.executionId,
        title,
        markdown,
        agentSlug: result.agentSlug,
        prompt,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return result.executionId;
}
