/**
 * CORTEX memories / wisdom — the compounding loop from docs/cortex-flow-design.md §2.4.
 * Every execution writes insights → AgentMemoryService → cortex_agent_memories (Mongo) + cortex_wisdom (Qdrant).
 */
import { writeWisdom } from '@regno/db';
import { embed } from '@regno/ai';

export interface Memory {
  id: string;
  agentSlug: string;
  category: string;
  content: string;
  contexts?: string[];
  developer?: string;
}

export function remember(memory: Memory): Promise<{ id: string }> {
  return writeWisdom(memory, embed);
}
