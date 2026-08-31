/**
 * Process phase — heading-aware chunking of large documents.
 * Docs > CHUNK_SIZE (8000 chars) are split into (Part N/M) pieces that keep
 * their nearest heading as context. Deterministic + free, no state needed.
 */
export interface ProcessedChunk {
  title: string;
  content: string;
  part?: string;
}

export const CHUNK_SIZE = 8000;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

/** Chunk a document, preserving the most recent heading as context. */
export function chunkDocument(title: string, content: string, size = CHUNK_SIZE): ProcessedChunk[] {
  const text = content.trim();
  if (!text) return [];
  if (text.length <= size) return [{ title, content: text }];

  const lines = text.split('\n');
  const chunks: ProcessedChunk[] = [];
  let buf = '';
  let lastHeading = '';
  let parts = 0;

  const flush = () => {
    if (!buf.trim()) return;
    parts++;
    chunks.push({ title, content: buf.trim() });
    buf = '';
  };

  for (const line of lines) {
    const h = line.match(HEADING_RE);
    if (buf.length >= size && line.trim()) {
      flush();
      if (lastHeading) buf = lastHeading + '\n\n';
    }
    buf += line + '\n';
    if (h) lastHeading = `#${'#'.repeat(h[1].length)} ${h[2]}`;
  }
  flush();

  if (chunks.length === 1) return chunks;
  return chunks.map((c, i) => ({ ...c, part: `(Part ${i + 1}/${chunks.length})` }));
}

/** Deterministic condensation used before the LLM expert compile (and as fallback artifact). */
export function condense(content: string, maxChars = 20000): string {
  const text = content.trim();
  if (text.length <= maxChars) return text;
  const lines = text.split('\n');
  const out: string[] = [];
  let len = 0;
  for (const line of lines) {
    const h = line.match(HEADING_RE);
    // Keep headings + first ~2 lines of each section, compress the rest.
    if (h || line.trim().length < 240) {
      if (len + line.length > maxChars) break;
      out.push(line);
      len += line.length;
    }
  }
  return out.join('\n').slice(0, maxChars);
}
