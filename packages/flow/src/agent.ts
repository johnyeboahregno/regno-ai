/**
 * Agent loading + routing — docs/cortex-flow-design.md §1:
 *   forceAgent? → that agent; else agentRouter.routePrompt (confidence ≥ 0.7)
 *   else general-assistant (default-path-as-agent).
 */
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import type { AgentDef } from './types.js';

export const DEFAULT_AGENT: AgentDef = {
  slug: 'general-assistant',
  name: 'General Assistant',
  triggers: [],
  capabilities: { tools: ['read', 'grep', 'knowledgeBase'] },
  planTemplate: {
    depthStrategy: 'auto',
    phases: [
      { name: 'understand', needs: ['knowledgeFacts', 'agentMemory'] },
      { name: 'act', needs: [] },
      { name: 'verify', needs: [] },
    ],
  },
};

export async function loadAgent(slug: string): Promise<AgentDef> {
  const db = await getDb();
  const doc = await db.collection(Collections.CORTEX_AGENTS).findOne({ slug });
  if (!doc) return DEFAULT_AGENT;
  const { _id, ...rest } = doc as Record<string, unknown>;
  return rest as unknown as AgentDef;
}

/** Route a prompt to the best-matching agent by trigger keywords. */
export async function routePrompt(prompt: string): Promise<{ agent: AgentDef; confidence: number }> {
  const db = await getDb();
  const agents = (await db.collection(Collections.CORTEX_AGENTS).find({}).toArray()) as unknown as AgentDef[];
  const p = prompt.toLowerCase();
  let best = { agent: DEFAULT_AGENT, confidence: 0 };

  for (const agent of agents) {
    const hits = (agent.triggers ?? []).filter((t) => t && p.includes(t.toLowerCase())).length;
    if (hits > 0) {
      const confidence = Math.min(0.5 + hits * 0.25, 0.99);
      if (confidence > best.confidence) best = { agent, confidence };
    }
  }
  return best;
}
