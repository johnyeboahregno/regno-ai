/**
 * Architect slug helpers — shared by the provisioning wizard, the DB layer and
 * the Cloudflare DNS script (which keeps an equivalent standalone copy).
 *
 * A slug is the developer-facing machine name that becomes the subdomain:
 * "john" → john.regno.ai. Lowercase letters, digits and hyphens only — no spaces.
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED = new Set([
  'www', 'api', 'app', 'admin', 'docs', 'blog', 'mail', 'mx', 'cname', 'ns',
  'dns', 'staging', 'dev', 'prod', 'test', 'gateway',
  'cortex', 'nexus', 'maestro', 'flux', 'sentinel', 'stage', 'architect',
]);

/** Root domain for architect subdomains (env-overridable). */
export function rootDomain(): string {
  return (process.env.REGNO_ROOT_DOMAIN || 'regno.ai')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .toLowerCase();
}

/** Normalize + validate a developer/architect name ("John" → "john"). Throws on invalid input. */
export function sanitizeSlug(input: unknown): string {
  const slug = String(input ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid architect name "${String(input)}" — use lowercase letters, digits and hyphens only, no spaces.`,
    );
  }
  if (RESERVED.has(slug)) {
    throw new Error(`"${slug}" is reserved — pick a unique developer name.`);
  }
  return slug;
}

/** Fully-qualified domain for a slug: slug.regno.ai */
export function fqdn(slug: string): string {
  return `${slug}.${rootDomain()}`;
}
