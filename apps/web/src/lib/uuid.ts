/**
 * Client-safe UUID v4 generator.
 *
 * `crypto.randomUUID()` is only defined in *secure contexts* (HTTPS or
 * localhost). On a plain-HTTP origin (e.g. a non-TLS reverse proxy or direct
 * port access) it is `undefined` — so we fall back to a v4 generator built on
 * `crypto.getRandomValues` (available in every context, including insecure
 * HTTP), and finally to `Math.random` as a last resort.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10 (RFC 4122)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
