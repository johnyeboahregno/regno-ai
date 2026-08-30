// Auto-discovered user guides from src/lib/guides/*.md.
// Single source of truth for the sidebar submenu + the guide pages — just drop a .md file in.
export interface Guide {
  slug: string;
  title: string;
  markdown: string;
}

const raw = import.meta.glob('./guides/*.md', { as: 'raw', eager: true }) as Record<string, string>;

/** Title = first H1 in the doc if present, else derived from the filename. */
function deriveTitle(path: string, markdown: string): string {
  const h1 = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h1) return h1.replace(/<[^>]+>/g, '').trim();
  const base = path.split('/').pop()?.replace(/\.md$/, '') ?? 'Guide';
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => (w.toLowerCase() === 'llm' ? 'LLM' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export const guides: Guide[] = Object.entries(raw)
  .map(([path, markdown]) => ({
    slug: path.split('/').pop()?.replace(/\.md$/, '') ?? 'guide',
    title: deriveTitle(path, markdown),
    markdown,
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
