/**
 * ContextBuilder — injects only the `needs` a phase declares
 * (knowledgeFacts / agentMemory / priorDocuments / userMemories), per
 * docs/cortex-flow-design.md §2. Phase 3: pulls from cortex_agent_memories.
 */
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export async function buildContext(needs: string[], developer?: string): Promise<string> {
  const db = await getDb();
  const blocks: string[] = [];

  // Base standards — immutable core, always injected first, highest priority.
  const standards = await db.collection(Collections.STANDARDS).find({}).sort({ name: 1 }).toArray();
  if (standards.length) {
    const text = standards
      .map((s) => `### ${String(s.name).toUpperCase()}\n${s.content}`)
      .join('\n\n');
    blocks.push(`## BASE STANDARDS (non-negotiable — follow these always)\n${text}`);
  }

  // Developer flavour — learned from their code, filtered by developer.
  // Style to emulate, but it must NEVER override the base standards above.
  if (developer && developer !== 'base') {
    const devDocs = await db
      .collection(Collections.CORTEX_INDEX)
      .find({ developer })
      .limit(15)
      .toArray();
    if (devDocs.length) {
      const text = devDocs
        .map((k) => `- [${k.title}] ${String(k.content ?? '').slice(0, 400)}`)
        .join('\n\n');
      blocks.push(`## DEVELOPER FLAVOUR (${developer}) — emulate this style, never override base standards\n${text}`);
    }
  }

  for (const need of needs) {
    if (need === 'agentMemory' || need === 'knowledgeFacts') {
      const mems = await db
        .collection(Collections.CORTEX_AGENT_MEMORIES)
        .find({})
        .sort({ relevanceScore: -1 })
        .limit(5)
        .toArray();
      const text = mems.map((m) => `- [${m.category}] ${m.content}`).join('\n');
      if (text) blocks.push(`## ${need}\n${text}`);
    }
    if (need === 'priorDocuments') {
      blocks.push(`## priorDocuments\n(no prior documents attached — Phase 3 scaffold)`);
    }
    if (need === 'userMemories') {
      const mems = await db
        .collection(Collections.CORTEX_AGENT_MEMORIES)
        .find({ category: 'profile' })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray();
      const text = mems.map((m) => `- ${m.content}`).join('\n');
      blocks.push(text ? `## userMemories\n${text}` : `## userMemories\n(no profile set — run \`npm run db:seed-profile\`)`);
    }
  }

  return blocks.join('\n\n');
}
