/**
 * Lightweight dependency-free HTML → Markdown extraction.
 *
 * No cheerio/jsdom on the dependency budget, so this uses a small tokenizer
 * that (a) removes boilerplate subtrees (nav/footer/aside/ads/…), (b) converts
 * the remaining content to Markdown, and (c) collects links + assets.
 *
 * Good enough for static/content sites (regnostandard.com, docs sites, blogs).
 */

export interface HtmlToken {
  kind: 'tag' | 'close' | 'text' | 'comment' | 'doctype';
  name: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
  text: string;
}

export interface ExtractedPage {
  title: string;
  markdown: string;
  text: string;
  links: string[];
  assets: string[];
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'iframe', 'template', 'form', 'button', 'select', 'textarea', 'canvas', 'nav', 'header', 'footer', 'aside']);

/** Match tag/class/id tokens that mark boilerplate, e.g. class="nav main-menu". */
const BOILERPLATE = /(^|[\s_-])(nav|navbar|footer|header|aside|sidebar|breadcrumb|breadcrumbs|ads?|advert|advertisement|cookie|cookies?|popup|modal|social|share|sharing|comments?|disqus|menu|menubar|masthead|widget|banner|skip[-_]?link|toolbar|pagination)([\s_-]|$)/i;
const LINK_SKIP = /^(javascript:|mailto:|tel:|data:|#)/i;
const ASSET_RE = /\.(png|jpe?g|gif|webp|svg|avif|pdf|ico)([?#].*)?$/i;
const TITLE_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1].toLowerCase();
    attrs[key] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** Tokenize an HTML string. */
export function tokenize(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  // Text runs must stop at ANY tag open (incl. closing `</` and `<!`), not just `<letter`.
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[a-zA-Z][^>]*>|[\s\S]*?(?=<!--|<[a-zA-Z/!])/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[0];
    if (raw.startsWith('<!--')) {
      tokens.push({ kind: 'comment', name: '', attrs: {}, selfClosing: true, text: raw });
    } else if (raw.toLowerCase().startsWith('<!doctype')) {
      tokens.push({ kind: 'doctype', name: '', attrs: {}, selfClosing: true, text: raw });
    } else if (raw.startsWith('</')) {
      const name = raw.slice(2, -1).trim().split(/\s/)[0].toLowerCase();
      tokens.push({ kind: 'close', name, attrs: {}, selfClosing: false, text: '' });
    } else if (raw.startsWith('<')) {
      const inner = raw.slice(1, -1).trim();
      const selfClosing = /\/>$/.test(raw) || VOID_TAGS.has(inner.split(/\s/)[0].toLowerCase());
      const name = inner.split(/\s/)[0].toLowerCase();
      const attrs = parseAttrs(inner.slice(name.length));
      tokens.push({ kind: 'tag', name, attrs, selfClosing, text: '' });
    } else if (raw) {
      tokens.push({ kind: 'text', name: '', attrs: {}, selfClosing: false, text: raw });
    }
  }
  return tokens;
}

/**
 * Remove boilerplate subtrees (nav/footer/ads/…) + script/style content.
 * Stack-based: skips any open tag whose tag/class/id matches BOILERPLATE
 * or is in SKIP_TAGS, along with its entire balanced subtree.
 */
export function cleanHtml(tokens: HtmlToken[]): HtmlToken[] {
  const out: HtmlToken[] = [];
  const skipStack: string[] = [];
  for (const t of tokens) {
    if (skipStack.length) {
      const top = skipStack[skipStack.length - 1];
      if (t.kind === 'tag' && !t.selfClosing) skipStack.push(t.name);
      else if (t.kind === 'close' && t.name === top) skipStack.pop();
      continue;
    }
    if (t.kind === 'tag') {
      const cls = ` ${String(t.attrs.class ?? '')} ${String(t.attrs.id ?? '')} `;
      if (SKIP_TAGS.has(t.name) || BOILERPLATE.test(cls)) {
        if (!t.selfClosing) skipStack.push(t.name);
        continue;
      }
      out.push(t);
    } else {
      out.push(t);
    }
  }
  return out;
}

function collapse(s: string): string {
  return s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Convert cleaned tokens to Markdown, collecting links + assets along the way. */
export function toMarkdown(tokens: HtmlToken[]): Omit<ExtractedPage, 'title'> {
  const lines: string[] = [];
  const links: string[] = [];
  const assets: string[] = [];
  let listStack: Array<'ul' | 'ol'> = [];
  let listCounters: number[] = [];
  let paraBuf = '';
  let codeBuf: string[] | null = null;
  let headingDepth = 0;
  let strong = 0;
  let emph = 0;
  let tableRow: string[] = [];
  let table: string[][] = [];
  let inCell = false;
  let inHead = 0;

  const flushPara = () => {
    if (paraBuf.trim()) {
      lines.push(collapse(paraBuf));
    }
    paraBuf = '';
  };

  for (const t of tokens) {
    if (t.kind === 'comment' || t.kind === 'doctype') continue;

    // Skip <head> entirely (title/meta must not leak into the body markdown).
    if (t.kind === 'tag' && t.name === 'head') {
      inHead++;
      continue;
    }
    if (t.kind === 'close' && t.name === 'head') {
      inHead = Math.max(0, inHead - 1);
      continue;
    }
    if (inHead > 0) continue;

    if (t.kind === 'text') {
      if (codeBuf !== null) codeBuf.push(t.text);
      else if (inCell) tableRow[tableRow.length - 1] += t.text;
      else paraBuf += t.text;
      continue;
    }

    if (t.kind === 'close') {
      const name = t.name;
      if (name === 'code' && codeBuf !== null) {
        lines.push('```\n' + codeBuf.join('').trim() + '\n```');
        codeBuf = null;
      } else if (name === 'pre') {
        // handled by code close
      } else if (name === 'li') {
        const marker = listStack[listStack.length - 1] === 'ol' ? `${listCounters[listCounters.length - 1]}.` : '-';
        const indent = '  '.repeat(listStack.length - 1);
        lines.push(`${indent}${marker} ${collapse(paraBuf)}`);
        paraBuf = '';
        if (listStack[listStack.length - 1] === 'ol') listCounters[listCounters.length - 1]++;
      } else if (name === 'ul' || name === 'ol') {
        listStack.pop();
        listCounters.pop();
      } else if (name === 'tr') {
        table.push([...tableRow]);
        tableRow = [];
        inCell = false;
      } else if (name === 'td' || name === 'th') {
        inCell = false;
      } else if (TITLE_TAGS.has(name)) {
        // Heading text is buffered in paraBuf — emit it (without flushing first).
        lines.push(`${'#'.repeat(headingDepth)} ${collapse(paraBuf)}`);
        paraBuf = '';
        headingDepth = 0;
      } else if (name === 'strong' || name === 'b') {
        if (strong > 0) { strong--; paraBuf += '**'; }
      } else if (name === 'em' || name === 'i') {
        if (emph > 0) { emph--; paraBuf += '*'; }
      } else if (name === 'p' || name === 'div' || name === 'section' || name === 'article' || name === 'main') {
        flushPara();
      } else if (name === 'table') {
        flushPara();
        if (table.length) {
          const header = table[0];
          lines.push('| ' + header.join(' | ') + ' |');
          lines.push('|' + header.map(() => '---').join('|') + '|');
          for (let i = 1; i < table.length; i++) lines.push('| ' + table[i].join(' | ') + ' |');
        }
        table = [];
      }
      continue;
    }

    const name = t.name;
    const attrs = t.attrs;

    if (name === 'pre') {
      flushPara();
      codeBuf = [];
      continue;
    }
    if (name === 'code' && codeBuf === null) {
      codeBuf = [];
      continue;
    }
    if (name === 'ul' || name === 'ol') {
      listStack.push(name);
      listCounters.push(1);
      continue;
    }
    if (name === 'li') {
      flushPara();
      continue;
    }
    if (name === 'tr') {
      tableRow = [];
      continue;
    }
    if (name === 'td' || name === 'th') {
      tableRow.push('');
      inCell = true;
      continue;
    }
    if (name === 'a') {
      const href = String(attrs.href ?? '').trim();
      if (href && !LINK_SKIP.test(href)) {
        links.push(href);
        if (ASSET_RE.test(href)) assets.push(href);
      }
      continue;
    }
    if (name === 'img') {
      const src = String(attrs.src ?? '').trim();
      const alt = String(attrs.alt ?? '').trim();
      if (src) {
        assets.push(src);
        const abs = /^https?:\/\//i.test(src) ? src : src;
        paraBuf += `![${alt}](${abs}) `;
      }
      continue;
    }
    if (name === 'br') {
      paraBuf += '\n';
      continue;
    }
    if (name === 'hr') {
      flushPara();
      lines.push('---');
      continue;
    }
    if (TITLE_TAGS.has(name)) {
      flushPara();
      headingDepth = Number(name[1]);
      continue;
    }
    if (name === 'strong' || name === 'b') {
      strong++;
      paraBuf += '**';
      continue;
    }
    if (name === 'em' || name === 'i') {
      emph++;
      paraBuf += '*';
      continue;
    }
    if (name === 'p' || name === 'div' || name === 'section' || name === 'article' || name === 'main') {
      continue;
    }
    if (name === 'span') continue;
    if (name === 'figure' || name === 'figcaption') continue;
    if (name === 'head' || name === 'body' || name === 'html') continue;
    // unknown tags: treat content inline
    continue;
  }

  flushPara();
  if (codeBuf) lines.push('```\n' + codeBuf.join('').trim() + '\n```');

  const markdown = collapse(lines.join('\n'));
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*#+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const uniqueLinks = [...new Set(links)].filter((u) => /^https?:\/\//i.test(u));
  const uniqueAssets = [...new Set(assets)];
  return { markdown, text, links: uniqueLinks, assets: uniqueAssets };
}

/** Extract <title> (fallback: first h1/h2). */
export function extractTitle(tokens: HtmlToken[]): string {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'tag' && t.name === 'title') {
      let s = '';
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].kind === 'close' && tokens[j].name === 'title') break;
        if (tokens[j].kind === 'text') s += tokens[j].text;
      }
      return collapse(s) || 'Untitled';
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'tag' && TITLE_TAGS.has(t.name)) {
      let s = '';
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].kind === 'close' && tokens[j].name === t.name) break;
        if (tokens[j].kind === 'text') s += tokens[j].text;
      }
      if (s.trim()) return collapse(s);
    }
  }
  return 'Untitled';
}

/** Full pipeline: HTML string → cleaned Markdown page (+ title, links, assets). */
export function htmlToPage(html: string): ExtractedPage {
  const tokens = cleanHtml(tokenize(html));
  const title = extractTitle(tokens);
  const { markdown, text, links, assets } = toMarkdown(tokens);
  return { title, markdown, text, links, assets };
}
