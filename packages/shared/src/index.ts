/**
 * @regno/shared — shared constants for the Regno Architect Me build.
 * Collection / queue / event names consolidated from docs/DB_SCHEMA.md.
 */

export const DB_NAME = 'regno';

/** MongoDB collections (see docs/DB_SCHEMA.md §2) */
export const Collections = {
  USERS: 'users',
  ROLES: 'roles',
  PRIVILEGES: 'privileges',
  ASSOCIATIONS: 'associations',
  CREDENTIALS: 'credentials',
  SYSTEM_CONFIG: 'system_config',
  STANDARDS: 'standards',
  DEVELOPERS: 'developers',
  PERSONAS: 'personas',
  ARTIFACTS: 'artifacts',
  AGENTS: 'agents',
  CORTEX: 'cortex',
  CORTEX_AGENTS: 'cortex_agents',
  CORTEX_PATTERNS: 'cortex_patterns',
  CORTEX_MEMORIES: 'cortex_memories',
  CORTEX_CHECKPOINTS: 'cortex_checkpoints',
  CORTEX_EXECUTIONS: 'cortex_executions',
  CORTEX_AGENT_MEMORIES: 'cortex_agent_memories',
  CORTEX_INDEX: 'cortex_index',
  CORTEX_KNOWLEDGE_FACTS: 'cortex_knowledge_facts',
  CORTEX_ENTITIES: 'cortex_entities',
  CORTEX_DOMAIN_EXPERTS: 'cortex_domain_experts',
  CORTEX_DOMAIN_ANALYSIS: 'cortex_domain_analysis',
  KNOWLEDGE_STAGING: 'knowledge_staging',
  KNOWLEDGE_SEED_STATUS: 'knowledge_seed_status',
  KNOWLEDGE_SEEDS_CUSTOM: 'knowledge_seeds_custom',
  PIPELINES: 'pipelines',
  PIPELINE_HISTORY: 'pipeline_history',
  STAGED_PROJECTS: 'staged_projects',
  STAGED_PROJECT_STATES: 'staged_project_states',
  MAESTRO_EVENTS: 'maestro_events',
  MAESTRO_VALIDATIONS: 'maestro_validations',
  AUDIT: 'audit',
  HISTORY: '_history',
  PROMPT_VERSIONS: 'prompt_versions',
  SKILLS: 'skills',
  VISION_NARRATIONS: 'vision_narrations',
  SHOWCASES: 'showcases',
} as const;

/** Qdrant collections (see docs/DB_SCHEMA.md §3) */
export const QdrantCollections = {
  CORTEX_PATTERNS: 'cortex_patterns',
  CORTEX_WISDOM: 'cortex_wisdom',
  CORTEX_EXECUTION_MEMORIES: 'cortex_execution_memories',
  KNOWLEDGE_VECTORS: 'knowledge_vectors',
  DOC_SEARCH: 'doc_search',
} as const;

/** BullMQ queues (see docs/DB_SCHEMA.md §5) */
export const Queues = {
  ORCHESTRATE: 'orchestrate',
  DOC_AUTHOR: 'doc-author',
  DOC_SEARCH: 'doc-search',
  SEAL_DAEMON: 'sealDaemon',
  NOTIFICATIONS: 'notifications',
} as const;

/** Realtime SSE event names */
export const Events = {
  AGENT_ROUTING: 'v2_agent_routing',
  PHASE_PROGRESS: 'v2_phase_progress',
  TOKENS: 'v2_tokens',
  EXECUTION_RESULT: 'v2_execution_result',
} as const;

/** Analysis depths for Cortex Flow topology selection */
export const AnalysisDepth = ['quick', 'standard', 'deep'] as const;
export type AnalysisDepth = (typeof AnalysisDepth)[number];
