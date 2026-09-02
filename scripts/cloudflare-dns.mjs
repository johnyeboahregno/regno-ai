#!/usr/bin/env node
// Cloudflare DNS automation for Regno Architect provisioning.
//
// Creates/updates the A record <slug>.regno.ai → <ip> (proxied through the
// Cloudflare edge by default), matching the production topology documented in
// docs/engineering/20-cloudflare-domain.md (edge TLS, Flexible → origin :80).
//
// Usage:
//   node scripts/cloudflare-dns.mjs upsert <slug> <ip> [--no-proxy]
//   node scripts/cloudflare-dns.mjs delete  <slug>
//   node scripts/cloudflare-dns.mjs list    [slug]
//
// Env:
//   CF_API_TOKEN          Cloudflare API token (Zone → DNS → Edit)  [required]
//   CF_ZONE_ID            Zone id (optional — resolved from REGNO_ROOT_DOMAIN)
//   REGNO_ROOT_DOMAIN     Root domain (default: regno.ai)
//   CLOUDFLARE_API_TOKEN  Alias for CF_API_TOKEN
//   CLOUDFLARE_ZONE_ID    Alias for CF_ZONE_ID
//
// Also importable as a module (used by the provisioning wizard / CLI later):
//   import { upsertDnsRecord, deleteDnsRecord, listDnsRecords, sanitizeSlug } from './cloudflare-dns.mjs';

import { pathToFileURL } from 'node:url';

const API_BASE = (process.env.CF_API_BASE || 'https://api.cloudflare.com/client/v4').replace(/\/+$/, '');
const ROOT_DOMAIN = (process.env.REGNO_ROOT_DOMAIN || 'regno.ai').replace(/^\.+/, '').replace(/\.+$/, '').toLowerCase();
const TOKEN = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
const ZONE_ID = process.env.CF_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || '';

// A valid Cloudflare host label: lowercase letters, digits, hyphens; no spaces.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED = new Set([
  'www', 'api', 'app', 'admin', 'docs', 'blog', 'mail', 'mx', 'cname', 'ns',
  'dns', 'staging', 'dev', 'prod', 'test', 'gateway',
  'cortex', 'nexus', 'maestro', 'flux', 'sentinel', 'stage',
]);

/** Normalize + validate a developer/architect name (e.g. "John" → "john"). */
export function sanitizeSlug(input) {
  const slug = String(input ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid architect name "${input}" — use lowercase letters, digits and hyphens only, ` +
      `no spaces (e.g. "john" or "darren-1").`,
    );
  }
  if (RESERVED.has(slug)) {
    throw new Error(`"${slug}" is reserved — pick a unique developer name.`);
  }
  return slug;
}

/** Fully-qualified domain for a slug: slug.regno.ai */
export function fqdn(slug) {
  return `${slug}.${ROOT_DOMAIN}`;
}

async function cf(path, { method = 'GET', body } = {}) {
  if (!TOKEN) {
    throw new Error('CF_API_TOKEN is not set (needs a Cloudflare API token with Zone → DNS → Edit permission).');
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const errs = (json.errors || []).map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    throw new Error(`Cloudflare API error: ${errs}`);
  }
  return json.result;
}

/** Resolve the zone id from env, or by looking up REGNO_ROOT_DOMAIN. */
export async function resolveZoneId() {
  if (ZONE_ID) return ZONE_ID;
  const zones = await cf(`/zones?name=${encodeURIComponent(ROOT_DOMAIN)}`);
  const zone = zones.find((z) => z.name === ROOT_DOMAIN) || zones[0];
  if (!zone) {
    throw new Error(`No Cloudflare zone found for "${ROOT_DOMAIN}" — set CF_ZONE_ID explicitly.`);
  }
  return zone.id;
}

async function findRecord(zoneId, name, type = 'A') {
  const records = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}&type=${type}`);
  return records.find((r) => r.name === name && r.type === type) || null;
}

/** Create or update the A record slug.regno.ai → ip. Returns { action, record }. */
export async function upsertDnsRecord(rawSlug, ip, { proxied = true } = {}) {
  const slug = sanitizeSlug(rawSlug);
  if (!ip || typeof ip !== 'string' || !ip.trim()) {
    throw new Error('IP address is required (2nd argument), e.g. 213.32.7.227.');
  }
  const name = fqdn(slug);
  const zoneId = await resolveZoneId();
  const existing = await findRecord(zoneId, name, 'A');
  const body = { type: 'A', name, content: ip.trim(), proxied: Boolean(proxied), ttl: 1 };
  if (existing) {
    const record = await cf(`/zones/${zoneId}/dns_records/${existing.id}`, { method: 'PUT', body });
    return { action: 'updated', record };
  }
  const record = await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body });
  return { action: 'created', record };
}

/** Delete the A record slug.regno.ai if it exists (idempotent). */
export async function deleteDnsRecord(rawSlug) {
  const slug = sanitizeSlug(rawSlug);
  const name = fqdn(slug);
  const zoneId = await resolveZoneId();
  const existing = await findRecord(zoneId, name, 'A');
  if (!existing) return { action: 'not-found', name };
  await cf(`/zones/${zoneId}/dns_records/${existing.id}`, { method: 'DELETE' });
  return { action: 'deleted', name, id: existing.id };
}

/** List A/AAAA records under the root domain (optionally for one slug). */
export async function listDnsRecords(rawSlug) {
  const zoneId = await resolveZoneId();
  const records = await cf(`/zones/${zoneId}/dns_records?per_page=100`);
  const match = rawSlug ? fqdn(sanitizeSlug(rawSlug)) : null;
  return records.filter((r) => {
    if (!r.name.endsWith(`.${ROOT_DOMAIN}`)) return false;
    if (match) return r.name === match;
    return true;
  });
}

const USAGE = `Regno Architect — Cloudflare DNS

Usage:
  node scripts/cloudflare-dns.mjs upsert <slug> <ip> [--no-proxy]
  node scripts/cloudflare-dns.mjs delete  <slug>
  node scripts/cloudflare-dns.mjs list    [slug]

Examples:
  node scripts/cloudflare-dns.mjs upsert john 213.32.7.227   # john.regno.ai → 213.32.7.227 (proxied)
  node scripts/cloudflare-dns.mjs upsert darren 1.2.3.4 --no-proxy
  node scripts/cloudflare-dns.mjs delete john
  node scripts/cloudflare-dns.mjs list

Env:
  CF_API_TOKEN   Cloudflare API token (Zone → DNS → Edit)  [required]
  CF_ZONE_ID     Zone id (optional — resolved from REGNO_ROOT_DOMAIN)
  REGNO_ROOT_DOMAIN  Root domain (default: regno.ai)`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const noProxy = args.includes('--no-proxy');

  switch (cmd) {
    case 'upsert': {
      const { action, record } = await upsertDnsRecord(args[1], args[2], { proxied: !noProxy });
      console.log(`✔ ${action} ${record.name} → ${record.content} (${record.proxied ? 'proxied' : 'DNS only'})`);
      console.log(`  https://${record.name}`);
      break;
    }
    case 'delete': {
      const res = await deleteDnsRecord(args[1]);
      console.log(res.action === 'not-found' ? `• ${res.name} not found (nothing to delete)` : `✔ deleted ${res.name}`);
      break;
    }
    case 'list': {
      const records = await listDnsRecords(args[1]);
      if (!records.length) {
        console.log('(no matching records)');
        break;
      }
      for (const r of records) {
        console.log(`${r.type}\t${r.name}\t→ ${r.content}\t${r.proxied ? 'proxied' : 'DNS only'}`);
      }
      break;
    }
    default:
      console.log(USAGE);
      process.exit(cmd && cmd !== 'help' ? 2 : 0);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`✖ ${err.message}`);
    process.exit(1);
  });
}
