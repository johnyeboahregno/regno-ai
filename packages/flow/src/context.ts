/**
 * ContextBuilder — injects only the `needs` a phase declares
 * (knowledgeFacts / agentMemory / priorDocuments / userMemories), per
 * docs/cortex-flow-design.md §2. Phase 3: pulls from cortex_agent_memories.
 */
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { keywordSearch } from '@regno/cortex';

/** A Subject Matter Expert — a selectable profile for architect jobs. */
export interface SmaProfile {
  slug: string;
  name: string;
  description?: string;
  focusTags?: string[];
  developer?: string;
  technologies?: string[];
}

export interface BuildContextOptions {
  developer?: string;
  technologies?: string[];
  sma?: SmaProfile;
  /** The user prompt — used to retrieve relevant knowledge (centered on the SMA's focus). */
  prompt?: string;
}

/** Load an SMA profile by slug (undefined when not found, or for the built-in base). */
export async function loadSma(slug?: string | null): Promise<SmaProfile | undefined> {
  if (!slug) return undefined;
  const db = await getDb();
  const doc = await db.collection(Collections.SMAS).findOne({ slug });
  if (!doc) return undefined;
  return {
    slug: String(doc.slug ?? slug),
    name: String(doc.name ?? slug),
    description: doc.description ? String(doc.description) : undefined,
    focusTags: Array.isArray(doc.focusTags) ? doc.focusTags.map(String) : undefined,
    developer: doc.developer ? String(doc.developer) : undefined,
    technologies: Array.isArray(doc.technologies) ? doc.technologies.map(String) : undefined,
  };
}

export async function buildContext(needs: string[], opts: BuildContextOptions = {}): Promise<string> {
  const db = await getDb();
  const blocks: string[] = [];
  const technologies = opts.technologies?.length ? opts.technologies : opts.sma?.technologies;
  const developer = opts.developer ?? opts.sma?.developer;
  const sma = opts.sma;

  // Base standards — immutable core, always injected first, highest priority.
  const standards = await db.collection(Collections.STANDARDS).find({}).sort({ name: 1 }).toArray();
  const general = standards.filter((s) => !s.tech);
  const tech = standards.filter((s) => s.tech && (technologies ?? []).includes(String(s.tech)));
  const selected = [...general, ...tech];
  if (selected.length) {
    const text = selected
      .map((s) => `### ${String(s.name).toUpperCase()}\n${s.content}`)
      .join('\n\n');
    blocks.push(`## BASE STANDARDS (non-negotiable — follow these always)\n${text}`);
  }

  // Subject Matter Expert — the lens for this job (focus area + knowledge centering).
  if (sma) {
    const focus = (sma.focusTags ?? []).filter(Boolean);
    let text = `You are acting as the Subject Matter Expert **${sma.name}**.`;
    if (sma.description) text += `\n\n${sma.description}`;
    if (focus.length) {
      text += `\n\nFocus areas: ${focus.map((t) => `\`${t}\``).join(', ')}. Center your reasoning and knowledge on these areas, while remaining free to draw on all available knowledge when needed.`;
    }
    blocks.push(`## SUBJECT MATTER EXPERT\n${text}`);
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
    if (need === 'knowledgeFacts' && opts.prompt) {
      const hits = await keywordSearch(opts.prompt, 6, sma?.focusTags);
      if (hits.length) {
        const text = hits.map((h) => `- [${h.title}] ${h.text}`).join('\n\n');
        const label = sma?.focusTags?.length
          ? `Focused knowledge (centered on: ${sma.focusTags.join(', ')})`
          : 'Relevant knowledge';
        blocks.push(`## ${label}\n${text}`);
      }
    }
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
        .find({ category: 'profile', active: { $ne: false } })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray();
      const text = mems.map((m) => `- ${m.content}`).join('\n');
      blocks.push(text ? `## userMemories\n${text}` : `## userMemories\n(base conventions apply)`);
    }
  }

  return blocks.join('\n\n');
}
