/**
 * GENESIS — node catalog.
 * Palette categories + node definitions, mirroring regno.ai/pipelines.
 */

export type CategoryKey =
  | 'sources'
  | 'transformation'
  | 'control'
  | 'ai'
  | 'visualization'
  | 'sinks'
  | 'tools'
  | 'utilities';

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  hint: string;
  color: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'sources', label: 'Data Sources', hint: 'Define source', color: '#22d3ee' },
  { key: 'transformation', label: 'Transformation', hint: 'Map and transform data', color: '#fbbf24' },
  { key: 'control', label: 'Control Flow', hint: 'Route data based on conditions', color: '#a78bfa' },
  { key: 'ai', label: 'AI & Intelligence', hint: 'LLM-powered nodes', color: '#6c5ce7' },
  { key: 'visualization', label: 'Visualization', hint: 'Render output', color: '#34d399' },
  { key: 'sinks', label: 'Data Sinks', hint: 'Define destination', color: '#fb7185' },
  { key: 'tools', label: 'Tools', hint: 'Capabilities for Expert nodes', color: '#f472b6' },
  { key: 'utilities', label: 'Utilities', hint: 'Observability, Error Handling, Performance', color: '#38bdf8' },
];

export interface CatalogField {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'select' | 'switch' | 'code';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  default?: unknown;
  help?: string;
}

export interface CatalogNode {
  type: string;
  label: string;
  icon: string;
  category: CategoryKey;
  description: string;
  inputs: string[];
  outputs: string[];
  fields: CatalogField[];
  defaults?: Record<string, unknown>;
  /** How the executor treats it. */
  impl?: 'implemented' | 'passthrough';
}

const NODE_W = 230;

export const NODE_WIDTH = NODE_W;

export const CATALOG: CatalogNode[] = [
  // ── Data Sources ────────────────────────────────────────────────
  {
    type: 'datasource',
    label: 'Data Source',
    icon: '🗄️',
    category: 'sources',
    description: 'Container node for data input. Connect data tools (MongoDB, PostgreSQL, File, etc.) to define source.',
    inputs: [],
    outputs: ['data'],
    impl: 'implemented',
    fields: [
      { key: 'collection', label: 'Mongo collection', kind: 'text', placeholder: 'e.g. notes', help: 'Fetch up to 20 docs from this collection (optional).' },
      { key: 'sample', label: 'Sample data (JSON)', kind: 'textarea', placeholder: '[{"title":"…","content":"…"}]', help: 'Used when no collection is set.' },
    ],
    defaults: { sample: '[{"title":"Welcome to GENESIS","content":"Pipelines turn Regno.ai capabilities into repeatable, governed flows."},{"title":"Composability","content":"Any platform capability can be composed into a pipeline."}]' },
  },
  {
    type: 'http',
    label: 'HTTP Request',
    icon: '🌐',
    category: 'sources',
    description: 'Make HTTP requests to external APIs.',
    inputs: [],
    outputs: ['response'],
    impl: 'implemented',
    fields: [
      { key: 'url', label: 'URL', kind: 'text', placeholder: 'https://api.example.com/data' },
      { key: 'method', label: 'Method', kind: 'select', default: 'GET', options: [{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }] },
    ],
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: '🔌',
    category: 'sources',
    description: 'Receive data from external webhook requests.',
    inputs: [],
    outputs: ['payload'],
    impl: 'passthrough',
    fields: [{ key: 'path', label: 'Path', kind: 'text', placeholder: '/hooks/my-pipeline' }],
  },
  {
    type: 'knowledge',
    label: 'Knowledge Source',
    icon: '📚',
    category: 'sources',
    description: 'Multi-source knowledge ingestion: URLs, files, directories, APIs, or manual input.',
    inputs: [],
    outputs: ['content'],
    impl: 'implemented',
    fields: [
      { key: 'content', label: 'Manual content', kind: 'textarea', placeholder: 'Paste knowledge text…' },
      { key: 'url', label: 'URL (simulated fetch)', kind: 'text', placeholder: 'https://…' },
    ],
    defaults: { content: 'GENESIS is Regno.ai\u2019s real-time data pipeline system. Pipelines are repeatable, governed flows that run the same way every time — no manual coordination, no drift.' },
  },
  {
    type: 'lab',
    label: 'Lab',
    icon: '🧪',
    category: 'sources',
    description: 'Interactive input from a Lab application (Research Assistant, etc.).',
    inputs: [],
    outputs: ['input'],
    impl: 'passthrough',
    fields: [],
  },
  {
    type: 'mcp-resource',
    label: 'MCP Resource',
    icon: '🧩',
    category: 'sources',
    description: 'Fetch resources from MCP servers for context injection.',
    inputs: [],
    outputs: ['resource'],
    impl: 'passthrough',
    fields: [{ key: 'uri', label: 'Resource URI', kind: 'text', placeholder: 'mcp://server/resource' }],
  },

  // ── Transformation ──────────────────────────────────────────────
  {
    type: 'transform',
    label: 'Transform',
    icon: '🔄',
    category: 'transformation',
    description: 'Map and transform data fields.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [
      { key: 'expression', label: 'Expression', kind: 'code', placeholder: 'item => ({ ...item, processed: true })', default: 'item => item' },
      { key: 'label', label: 'Field name', kind: 'text', placeholder: 'title' },
    ],
  },
  {
    type: 'code',
    label: 'Code',
    icon: '📝',
    category: 'transformation',
    description: 'Execute custom JavaScript code to transform data.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [
      { key: 'fn', label: 'Function body', kind: 'code', placeholder: 'items => items.map(i => ({...i, double: true}))', default: 'items => items' },
      { key: 'language', label: 'Language', kind: 'select', default: 'javascript', options: [{ label: 'JavaScript', value: 'javascript' }] },
    ],
  },
  {
    type: 'mapper',
    label: 'Mapper',
    icon: '🗺️',
    category: 'transformation',
    description: 'Map inputs to key-value pairs.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [
      { key: 'mapping', label: 'Mapping (JSON "in":"out")', kind: 'code', placeholder: '{"title":"name","content":"body"}', default: '{}' },
    ],
  },
  {
    type: 'aggregation',
    label: 'Aggregation',
    icon: '🧮',
    category: 'transformation',
    description: 'Group and aggregate data.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [
      { key: 'groupBy', label: 'Group by field', kind: 'text', placeholder: 'category' },
      { key: 'op', label: 'Operation', kind: 'select', default: 'count', options: [{ label: 'Count', value: 'count' }, { label: 'Sum', value: 'sum' }, { label: 'Avg', value: 'avg' }, { label: 'Join', value: 'join' }] },
      { key: 'valueField', label: 'Value field (sum/avg/join)', kind: 'text', placeholder: 'score' },
    ],
  },
  {
    type: 'staging',
    label: 'Knowledge Staging',
    icon: '📦',
    category: 'transformation',
    description: 'Stage and validate extracted knowledge before promoting to Cortex Index.',
    inputs: ['data'],
    outputs: ['staged'],
    impl: 'implemented',
    fields: [{ key: 'requireContent', label: 'Require content field', kind: 'switch', default: true }],
  },
  {
    type: 'synthesis',
    label: 'Knowledge Synthesis',
    icon: '🧬',
    category: 'transformation',
    description: 'Unify knowledge across documents: entity resolution, cross-linking, taxonomy construction, gap analysis.',
    inputs: ['data'],
    outputs: ['unified'],
    impl: 'implemented',
    fields: [{ key: 'joinKey', label: 'Join key', kind: 'text', placeholder: 'title' }],
  },
  {
    type: 'lookup',
    label: 'Lookup',
    icon: '🔎',
    category: 'transformation',
    description: 'Lookup and enrich data from cached tool outputs.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [],
  },
  {
    type: 'window',
    label: 'Streaming Window',
    icon: '🪟',
    category: 'transformation',
    description: 'Aggregate streaming data into time-based or count-based windows with aggregations.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'size', label: 'Window size', kind: 'number', default: 10 }],
  },

  // ── Control Flow ────────────────────────────────────────────────
  {
    type: 'filter',
    label: 'Filter',
    icon: '🔍',
    category: 'control',
    description: 'Pass or reject records based on a condition expression.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'condition', label: 'Condition', kind: 'code', placeholder: 'item => item.score > 10', default: 'item => true' }],
  },
  {
    type: 'switch',
    label: 'Switch',
    icon: '🔀',
    category: 'control',
    description: 'Route data to different branches based on field value or expression.',
    inputs: ['data'],
    outputs: ['default', 'branch-1', 'branch-2'],
    impl: 'implemented',
    fields: [
      { key: 'field', label: 'Field', kind: 'text', placeholder: 'type' },
      { key: 'value', label: 'Route value → branch-1', kind: 'text', placeholder: 'internal' },
      { key: 'value2', label: 'Route value → branch-2', kind: 'text', placeholder: 'external' },
    ],
  },
  {
    type: 'merge',
    label: 'Merge',
    icon: '🔗',
    category: 'control',
    description: 'Combine outputs from multiple branches into a single stream.',
    inputs: ['a', 'b'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [],
  },
  {
    type: 'gate',
    label: 'Gate',
    icon: '🚧',
    category: 'control',
    description: 'Hold data until a condition is met or trigger signal received.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'condition', label: 'Condition', kind: 'code', placeholder: 'true', default: 'true' }],
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: '⏳',
    category: 'control',
    description: 'Hold data for a specified duration before passing through.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'ms', label: 'Delay (ms)', kind: 'number', default: 500 }],
  },
  {
    type: 'buffer',
    label: 'Buffer',
    icon: '🪣',
    category: 'control',
    description: 'Buffer and batch data flow.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'size', label: 'Batch size', kind: 'number', default: 10 }],
  },
  {
    type: 'retry',
    label: 'Retry',
    icon: '🔁',
    category: 'control',
    description: 'Re-execute upstream node on failure with configurable retry logic.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'attempts', label: 'Attempts', kind: 'number', default: 3 }],
  },
  {
    type: 'rules',
    label: 'Rules Engine',
    icon: '📜',
    category: 'control',
    description: 'Route data based on conditional rules.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'rules', label: 'Rules (JSON)', kind: 'code', placeholder: '[]' }],
  },
  {
    type: 'foreach',
    label: 'ForEach',
    icon: '🔂',
    category: 'control',
    description: 'Iterate over array items, emitting each element individually.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'path', label: 'Field path', kind: 'text', placeholder: 'items' }],
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: '♻️',
    category: 'control',
    description: 'Iterate until a condition is met with visual back-edge.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'count', label: 'Iterations', kind: 'number', default: 3 }],
  },
  {
    type: 'while',
    label: 'While',
    icon: '🔄',
    category: 'control',
    description: 'Continue looping while condition is true.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'condition', label: 'Condition', kind: 'code', default: 'true' }],
  },

  // ── AI & Intelligence ───────────────────────────────────────────
  {
    type: 'llm',
    label: 'LLM',
    icon: '✨',
    category: 'ai',
    description: 'Large Language Model for text generation.',
    inputs: ['context'],
    outputs: ['response'],
    impl: 'implemented',
    fields: [
      { key: 'prompt', label: 'Prompt', kind: 'textarea', placeholder: 'Summarize the input…' },
      { key: 'provider', label: 'Provider', kind: 'select', default: 'openai', options: [{ label: 'OpenAI', value: 'openai' }, { label: 'Anthropic', value: 'anthropic' }, { label: 'Google', value: 'google' }] },
      { key: 'model', label: 'Model', kind: 'text', placeholder: 'gpt-4o-mini (optional)' },
      { key: 'temperature', label: 'Temperature', kind: 'number', default: 0.3 },
    ],
    defaults: { prompt: 'Summarize the following input concisely:\n\n{input}' },
  },
  {
    type: 'expert',
    label: 'Expert',
    icon: '🧠',
    category: 'ai',
    description: 'AI expert with Q&A workflow. Attach tool nodes (File I/O, Web Fetcher, Web Search) to the tools port.',
    inputs: ['context', 'tools'],
    outputs: ['answer'],
    impl: 'implemented',
    fields: [
      { key: 'prompt', label: 'Question', kind: 'textarea', placeholder: 'What should the expert answer?' },
      { key: 'mode', label: 'Mode', kind: 'select', default: 'reference', options: [{ label: 'Reference', value: 'reference' }, { label: 'Full', value: 'full' }, { label: 'Autonomous', value: 'autonomous' }] },
    ],
    defaults: { prompt: 'Analyze the following input and provide expert-level insights:\n\n{input}' },
  },
  {
    type: 'memory',
    label: 'Memory',
    icon: '🧠',
    category: 'ai',
    description: 'Store and retrieve conversation context.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'namespace', label: 'Namespace', kind: 'text', placeholder: 'default' }],
  },
  {
    type: 'analyst',
    label: 'Data Analyst',
    icon: '📊',
    category: 'ai',
    description: 'AGI-powered data analysis orchestrator. Analyzes data from multiple sources and outputs insights to charts and tables.',
    inputs: ['data'],
    outputs: ['insights'],
    impl: 'implemented',
    fields: [{ key: 'question', label: 'Question', kind: 'textarea', placeholder: 'What patterns do you see?' }],
    defaults: { question: 'Analyze this dataset and summarize the key patterns and outliers:\n\n{input}' },
  },
  {
    type: 'inspector',
    label: 'Index Inspector',
    icon: '🕵️',
    category: 'ai',
    description: 'Interrogate Cortex Index entries with auto-generated test suites to validate knowledge quality.',
    inputs: ['data'],
    outputs: ['report'],
    impl: 'passthrough',
    fields: [],
  },
  {
    type: 'insights',
    label: 'AI Insights',
    icon: '📈',
    category: 'ai',
    description: 'Generate expert AI insights from time-series data.',
    inputs: ['data'],
    outputs: ['insights'],
    impl: 'implemented',
    fields: [{ key: 'metric', label: 'Metric', kind: 'text', placeholder: 'revenue' }],
    defaults: { metric: 'value' },
  },
  {
    type: 'maestro',
    label: 'MAESTRO',
    icon: '🎭',
    category: 'ai',
    description: 'AI-driven pipeline orchestration — plans, builds, and optimizes pipelines for any task.',
    inputs: ['data'],
    outputs: ['plan'],
    impl: 'implemented',
    fields: [{ key: 'task', label: 'Task', kind: 'textarea', placeholder: 'Describe the pipeline to orchestrate…' }],
    defaults: { task: 'Produce an execution plan for the following input:\n\n{input}' },
  },
  {
    type: 'docgen',
    label: 'Document Generator',
    icon: '📄',
    category: 'ai',
    description: 'Generate comprehensive reports from research data using AI. Supports template-based formatting.',
    inputs: ['data'],
    outputs: ['document'],
    impl: 'implemented',
    fields: [{ key: 'template', label: 'Template', kind: 'textarea', placeholder: '## Report\n\n{input}' }],
    defaults: { template: 'Generate a concise, well-structured report from the following input:\n\n{input}' },
  },
  {
    type: 'mcp-service',
    label: 'MCP Service',
    icon: '🧩',
    category: 'ai',
    description: 'Connect to Model Context Protocol services.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'server', label: 'Server', kind: 'text' }],
  },
  {
    type: 'mcp-tool',
    label: 'MCP Tool',
    icon: '🛠️',
    category: 'ai',
    description: 'Execute any MCP tool from connected servers.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'passthrough',
    fields: [{ key: 'tool', label: 'Tool', kind: 'text' }],
  },

  // ── Visualization ───────────────────────────────────────────────
  {
    type: 'display',
    label: 'Display',
    icon: '🖥️',
    category: 'visualization',
    description: 'Display formatted output from any node. Auto-detects content type and renders appropriately.',
    inputs: ['data'],
    outputs: [],
    impl: 'implemented',
    fields: [],
  },
  {
    type: 'datagrid',
    label: 'Data Grid',
    icon: '📋',
    category: 'visualization',
    description: 'Interactive spreadsheet view of data.',
    inputs: ['data'],
    outputs: [],
    impl: 'implemented',
    fields: [],
  },
  {
    type: 'chart',
    label: 'Chart',
    icon: '📊',
    category: 'visualization',
    description: 'Visualize data with charts.',
    inputs: ['data'],
    outputs: [],
    impl: 'implemented',
    fields: [{ key: 'labelField', label: 'Label field', kind: 'text', placeholder: 'title' }],
  },

  // ── Data Sinks ──────────────────────────────────────────────────
  {
    type: 'sink',
    label: 'Data Sink',
    icon: '📥',
    category: 'sinks',
    description: 'Container node for data output. Connect write tools (MongoDB, PostgreSQL, File, Slack, etc.) to define destination.',
    inputs: ['data'],
    outputs: [],
    impl: 'implemented',
    fields: [{ key: 'collection', label: 'Mongo collection', kind: 'text', placeholder: 'pipeline_outputs' }],
  },
  {
    type: 'cortex-index',
    label: 'Cortex Index',
    icon: '🗂️',
    category: 'sinks',
    description: 'Store ingested knowledge in Cortex Index repository.',
    inputs: ['data'],
    outputs: [],
    impl: 'implemented',
    fields: [
      { key: 'domain', label: 'Domain', kind: 'text', placeholder: 'pipeline' },
      { key: 'tags', label: 'Tags (comma)', kind: 'text', placeholder: 'genesis, pipeline' },
    ],
  },

  // ── Tools (attachable to Expert nodes) ─────────────────────────
  {
    type: 'file-io',
    label: 'File I/O',
    icon: '📁',
    category: 'tools',
    description: 'Read from / write to files. Connects to an Expert node\u2019s tools port.',
    inputs: [],
    outputs: ['content'],
    impl: 'implemented',
    fields: [
      { key: 'path', label: 'File path', kind: 'text', placeholder: 'docs/README.md' },
      { key: 'content', label: 'Inline content', kind: 'textarea', placeholder: 'Content to pass through…' },
    ],
  },
  {
    type: 'web-fetcher',
    label: 'Web Fetcher',
    icon: '🌍',
    category: 'tools',
    description: 'Fetch a web page and pass its content to an Expert node.',
    inputs: [],
    outputs: ['content'],
    impl: 'implemented',
    fields: [{ key: 'url', label: 'URL', kind: 'text', placeholder: 'https://example.com' }],
  },
  {
    type: 'web-search',
    label: 'Web Search',
    icon: '🔎',
    category: 'tools',
    description: 'Search the web and return results to an Expert node.',
    inputs: [],
    outputs: ['results'],
    impl: 'implemented',
    fields: [
      { key: 'query', label: 'Query', kind: 'text', placeholder: 'search terms' },
      { key: 'engine', label: 'Engine', kind: 'select', default: 'simulated', options: [{ label: 'Simulated (no API key)', value: 'simulated' }] },
    ],
  },

  // ── Utilities (observability / error handling / performance) ───
  {
    type: 'cost-tracker',
    label: 'Cost Tracking',
    icon: '💰',
    category: 'utilities',
    description: 'Estimate LLM token cost flowing through the pipeline and tag it to the payload.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'budgetUsd', label: 'Budget cap (USD)', kind: 'number', default: 1 }],
  },
  {
    type: 'performance',
    label: 'Performance',
    icon: '⚡',
    category: 'utilities',
    description: 'Measure execution duration at this point in the pipeline and log it.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [],
  },
  {
    type: 'error-handler',
    label: 'Error Handling',
    icon: '🛡️',
    category: 'utilities',
    description: 'Catch upstream failures and continue with a fallback value.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'fallback', label: 'Fallback value', kind: 'code', placeholder: '{}', default: '{}' }],
  },
  {
    type: 'audit-trail',
    label: 'Audit Trail',
    icon: '📜',
    category: 'utilities',
    description: 'Record an audit entry for everything that flows through this point.',
    inputs: ['data'],
    outputs: ['data'],
    impl: 'implemented',
    fields: [{ key: 'action', label: 'Action label', kind: 'text', placeholder: 'pipeline-step' }],
  },
];

export const CATALOG_MAP = new Map(CATALOG.map((n) => [n.type, n]));

export function getCatalogNode(type: string): CatalogNode {
  return CATALOG_MAP.get(type) ?? {
    type,
    label: type,
    icon: '⬜',
    category: 'ai',
    description: 'Generic node',
    inputs: ['data'],
    outputs: ['data'],
    fields: [],
    impl: 'passthrough',
  };
}

export function nodeHeight(node: PipelineLike): number {
  const def = getCatalogNode(node.type);
  const ports = Math.max(def.inputs.length, def.outputs.length, 1);
  return 34 + ports * 30 + 8;
}

// local structural type to avoid a hard import cycle in catalog
interface PipelineLike {
  type: string;
}

export const PORT_SPACING = 30;
export const PORT_HEADER = 34;
