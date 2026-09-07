// Server-side Subject Matter Agent (SMA) helpers.
// Single home for the technology catalog (shared with /api/technologies), the
// slug/tag parsing used by the /api/agents routes, the Mongo upsert, and the
// LLM "prompt → structured SMA profile" inference used by the CLI's
// `regno sma create --file` command.
import { chatWithFallback } from '@regno/ai';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export interface CatalogItem {
  slug: string;
  label: string;
  icon: string;
}

/** Disciplines & languages a user can pick when creating an SMA. */
export const DISCIPLINES: CatalogItem[] = [
  { slug: 'web', label: 'Web Development', icon: '🌐' },
  { slug: 'backend', label: 'Backend / APIs', icon: '🔌' },
  { slug: 'data-engineering', label: 'Data Engineering', icon: '🗄️' },
  { slug: 'machine-learning', label: 'Machine Learning / AI', icon: '🧠' },
  { slug: 'devops', label: 'DevOps / Platform', icon: '🚀' },
  { slug: 'embedded', label: 'Embedded Systems', icon: '🔧' },
  { slug: 'ros', label: 'Robotics (ROS)', icon: '🤖' },
  { slug: 'security', label: 'Security', icon: '🛡️' },
  { slug: 'mobile', label: 'Mobile Apps', icon: '📱' },
];

export const LANGUAGES: CatalogItem[] = [
  { slug: 'web-typescript', label: 'Web / TypeScript', icon: '🕸️' },
  { slug: 'go', label: 'Go', icon: '🐹' },
  { slug: 'rust', label: 'Rust', icon: '🦀' },
  { slug: 'python', label: 'Python', icon: '🐍' },
  { slug: 'cpp', label: 'C++', icon: '⚡' },
  { slug: 'c', label: 'C', icon: '🏗️' },
  { slug: 'java', label: 'Java', icon: '☕' },
  { slug: 'kotlin', label: 'Kotlin', icon: '🎯' },
  { slug: 'swift', label: 'Swift', icon: '🦅' },
  { slug: 'csharp', label: 'C# / .NET', icon: '💜' },
  { slug: 'php', label: 'PHP', icon: '🐘' },
  { slug: 'ruby', label: 'Ruby', icon: '💎' },
  { slug: 'elixir', label: 'Elixir', icon: '💧' },
  { slug: 'zig', label: 'Zig', icon: '⚙️' },
  { slug: 'sql', label: 'SQL', icon: '🗃️' },
  { slug: 'shell', label: 'Shell / Bash', icon: '🐚' },
];

// ── Built-in SMAs — predefined Subject Matter Agent templates ──────────────────
// Shown on /app/agents so a user can activate one; activating copies it into the
// `agents` store, which makes it appear in the list of available SMAs. Kept in
// code so every deployment ships with the same starter set.
export interface BuiltinSma {
  slug: string;
  name: string;
  icon: string;
  description: string;
  focusTags: string[];
  disciplines: string[];
  languages: string[];
}

export const BUILTIN_SMAS: BuiltinSma[] = [
  {
    slug: 'f1-race-engineer',
    name: 'F1 Race Engineer',
    icon: '🏎️',
    description: 'Racetrack strategist — telemetry, aero maps, tyre life and setup.',
    focusTags: ['F1', 'telemetry', 'aerodynamics', 'tyres', 'race strategy'],
    disciplines: [],
    languages: [],
  },
  {
    slug: 'cloud-security-architect',
    name: 'Cloud Security Architect',
    icon: '🛡️',
    description: 'Zero-trust, IAM, compliance and threat modelling for cloud estates.',
    focusTags: ['cloud security', 'IAM', 'compliance', 'zero trust', 'threat modeling'],
    disciplines: ['security', 'devops'],
    languages: ['go', 'python'],
  },
  {
    slug: 'data-engineer',
    name: 'Data Engineer',
    icon: '🗄️',
    description: 'ETL/ELT, warehouses, lakehouses and dependable data pipelines.',
    focusTags: ['ETL', 'data pipelines', 'warehousing', 'data quality'],
    disciplines: ['data-engineering'],
    languages: ['sql', 'python'],
  },
  {
    slug: 'machine-learning-engineer',
    name: 'Machine Learning Engineer',
    icon: '🧠',
    description: 'Training, evaluation, serving and LLM application engineering.',
    focusTags: ['ML training', 'inference', 'evaluation', 'LLMs'],
    disciplines: ['machine-learning', 'data-engineering'],
    languages: ['python'],
  },
  {
    slug: 'devops-platform-engineer',
    name: 'DevOps Platform Engineer',
    icon: '🚀',
    description: 'Kubernetes, CI/CD, observability and infrastructure-as-code.',
    focusTags: ['Kubernetes', 'CI/CD', 'observability', 'infra-as-code'],
    disciplines: ['devops'],
    languages: ['go', 'shell', 'python'],
  },
  {
    slug: 'frontend-engineer',
    name: 'Frontend Engineer',
    icon: '🕸️',
    description: 'Svelte/TypeScript UIs, design systems and accessibility.',
    focusTags: ['Svelte', 'TypeScript', 'UI/UX', 'accessibility'],
    disciplines: ['web'],
    languages: ['web-typescript'],
  },
  {
    slug: 'backend-engineer',
    name: 'Backend Engineer',
    icon: '🔌',
    description: 'APIs, services, databases and authentication/authorisation.',
    focusTags: ['APIs', 'services', 'databases', 'auth'],
    disciplines: ['backend', 'web'],
    languages: ['go', 'python', 'sql'],
  },
  {
    slug: 'embedded-systems-engineer',
    name: 'Embedded Systems Engineer',
    icon: '🔧',
    description: 'Firmware, RTOS, hardware bring-up and low-level debugging.',
    focusTags: ['firmware', 'RTOS', 'hardware', 'low-level'],
    disciplines: ['embedded'],
    languages: ['c', 'cpp', 'rust'],
  },
  {
    slug: 'robotics-engineer',
    name: 'Robotics Engineer',
    icon: '🤖',
    description: 'ROS pipelines, control, perception and motion planning.',
    focusTags: ['ROS', 'control', 'perception', 'planning'],
    disciplines: ['ros', 'embedded'],
    languages: ['cpp', 'python'],
  },
  {
    slug: 'mobile-engineer',
    name: 'Mobile Engineer',
    icon: '📱',
    description: 'iOS and Android apps, releases and store distribution.',
    focusTags: ['iOS', 'Android', 'app distribution'],
    disciplines: ['mobile'],
    languages: ['swift', 'kotlin'],
  },
  {
    slug: 'rust-systems-engineer',
    name: 'Rust Systems Engineer',
    icon: '🦀',
    description: 'High-performance, memory-safe systems and FFI work.',
    focusTags: ['systems', 'performance', 'memory safety', 'FFI'],
    disciplines: ['backend', 'embedded'],
    languages: ['rust'],
  },
  {
    slug: 'go-services-engineer',
    name: 'Go Services Engineer',
    icon: '🐹',
    description: 'Microservices, concurrency, reliability and gRPC in Go.',
    focusTags: ['microservices', 'concurrency', 'reliability', 'gRPC'],
    disciplines: ['backend'],
    languages: ['go'],
  },
];

export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function parseTags(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === 'string' && input.trim()
      ? input.split(',')
      : [];
  return Array.from(new Set(list.map((t) => String(t).trim()).filter(Boolean)));
}

/** Keep only slugs that exist in the given catalog (dedup, preserve order). */
function intersectCatalog(list: unknown, catalog: CatalogItem[]): string[] {
  const valid = new Set(catalog.map((c) => c.slug));
  const arr = Array.isArray(list) ? list.map((x) => String(x).trim()) : [];
  return Array.from(new Set(arr.filter((s) => valid.has(s))));
}

/** A fully-resolved, ready-to-persist SMA definition. */
export interface SmaDefinition {
  name: string;
  description: string;
  focusTags: string[];
  disciplines: string[];
  languages: string[];
  technologies: string[];
  developer: string;
}

/** Resolve a partial SMA body into a persistable definition (mirrors the old route logic). */
export function normalizeSma(body: {
  name?: string;
  description?: string;
  focusTags?: unknown;
  disciplines?: string[];
  languages?: string[];
  technologies?: string[];
  developer?: string;
}): SmaDefinition {
  const disciplines = Array.isArray(body.disciplines) ? body.disciplines.map(String) : [];
  const languages = Array.isArray(body.languages) ? body.languages.map(String) : [];
  return {
    name: String(body.name ?? '').trim(),
    description: String(body.description ?? '').trim(),
    focusTags: parseTags(body.focusTags),
    disciplines,
    languages,
    technologies: Array.from(
      new Set([
        ...(Array.isArray(body.technologies) ? body.technologies.map(String) : []),
        ...disciplines,
        ...languages,
      ]),
    ),
    developer: String(body.developer ?? 'base').trim() || 'base',
  };
}

/** Upsert an SMA doc (keeps createdAt on first insert, bumps updatedAt otherwise). */
export async function upsertSma(
  db: Awaited<ReturnType<typeof getDb>>,
  def: SmaDefinition,
): Promise<{ slug: string; name: string; created: boolean }> {
  const slug = slugify(def.name);
  const now = new Date();
  const existing = await db.collection(Collections.SMAS).findOne({ slug }, { projection: { _id: 1 } });
  await db.collection(Collections.SMAS).updateOne(
    { slug },
    {
      $set: {
        slug,
        name: def.name,
        description: def.description,
        focusTags: def.focusTags,
        disciplines: def.disciplines,
        languages: def.languages,
        technologies: def.technologies,
        developer: def.developer,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return { slug, name: def.name, created: !existing };
}

// ── LLM inference: turn a freeform "prompt file" into a structured SMA ──────

/** The profile shape the LLM is asked to produce. */
export interface InferSmaResult {
  name: string;
  description: string;
  focusTags: string[];
  disciplines: string[];
  languages: string[];
}

/** Pull the first balanced JSON object out of an LLM reply (handles prose/fences). */
function extractJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('the model reply did not contain a JSON object');
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error('the model reply JSON was not an object');
    }
    return obj as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `could not parse the model reply as JSON (${(err as Error).message}). Reply was: ${text.slice(0, 300)}`,
    );
  }
}

function toStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

/**
 * Ask the LLM gateway to derive a structured SMA profile from a freeform brief.
 * The brief is usually the contents of a prompt file dumped into the CLI:
 *   regno sma create --file f1-race-engineer.md
 */
export async function inferSmaFromPrompt(prompt: string): Promise<InferSmaResult> {
  const disciplines = DISCIPLINES.map((d) => `${d.slug} — ${d.label}`).join('\n');
  const languages = LANGUAGES.map((l) => `${l.slug} — ${l.label}`).join('\n');
  const system = [
    'You design concise Subject Matter Agent (SMA) profiles for Regno.ai — an expert lens used to center an architect job on a domain.',
    'Turn the user\'s freeform subject-matter brief into ONE compact profile.',
    'Rules:',
    '- "name": short human label, <= 60 chars (e.g. "F1 Race Engineer").',
    '- "description": 1-3 sentences summarising the specialism.',
    '- "focusTags": 3-8 short keywords or phrases describing the knowledge domain (for retrieval centering).',
    '- "disciplines" and "languages": ONLY slugs from the allowed catalogs below (empty arrays are fine; pick at most 3 each).',
    '- Never invent discipline/language slugs — if none fit, return empty arrays.',
    'Reply with ONLY a JSON object, no prose, no markdown fences:',
    '{ "name": string, "description": string, "focusTags": string[], "disciplines": string[], "languages": string[] }',
  ].join('\n');
  const user = [
    `Allowed discipline slugs:\n${disciplines}`,
    `Allowed language slugs:\n${languages}`,
    `Subject-matter brief:\n\n${prompt.trim().slice(0, 12_000)}`,
  ].join('\n\n');

  const raw = await chatWithFallback(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.2 },
  );

  const obj = extractJsonObject(raw);
  const name = String(obj.name ?? '').trim();
  if (!name || !slugify(name)) throw new Error('could not infer an SMA name from the prompt');
  return {
    name: name.slice(0, 60),
    description: String(obj.description ?? '').trim().slice(0, 2000),
    focusTags: toStringList(obj.focusTags).slice(0, 8),
    disciplines: intersectCatalog(obj.disciplines, DISCIPLINES),
    languages: intersectCatalog(obj.languages, LANGUAGES),
  };
}
