/**
 * Cloudflare DNS helper for the provisioning worker — registers `<slug>.regno.ai`
 * → target IP (proxied through Cloudflare, matching the production topology in
 * docs/engineering/20-cloudflare-domain.md). Kept minimal; the standalone CLI in
 * scripts/cloudflare-dns.mjs carries the richer surface.
 */
const CF_API_BASE = (process.env.CF_API_BASE || 'https://api.cloudflare.com/client/v4').replace(/\/+$/, '');
const ROOT = (process.env.REGNO_ROOT_DOMAIN || 'regno.ai').replace(/^\.+/, '').replace(/\.+$/, '').toLowerCase();

async function cf(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}) {
  const token = process.env.CF_API_TOKEN;
  if (!token) throw new Error('CF_API_TOKEN is not set');
  const res = await fetch(`${CF_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; result?: unknown; errors?: Array<{ message?: string }> };
  if (!res.ok || json.success === false) {
    const errs = (json.errors || []).map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    throw new Error(`Cloudflare API error: ${errs}`);
  }
  return json.result;
}

async function resolveZoneId(): Promise<string> {
  const zoneId = process.env.CF_ZONE_ID;
  if (zoneId) return zoneId;
  const zones = (await cf(`/zones?name=${encodeURIComponent(ROOT)}`)) as Array<{ id: string; name: string }>;
  const zone = zones.find((z) => z.name === ROOT) || zones[0];
  if (!zone) throw new Error(`No Cloudflare zone found for "${ROOT}" — set CF_ZONE_ID`);
  return zone.id;
}

export async function upsertDnsRecord(slug: string, ip: string, proxied = true): Promise<{ action: string; name: string }> {
  const name = `${slug}.${ROOT}`;
  const zoneId = await resolveZoneId();
  const existing = (await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}&type=A`)) as Array<{ id: string }>;
  const body = { type: 'A', name, content: ip, proxied, ttl: 1 };
  if (existing.length) {
    await cf(`/zones/${zoneId}/dns_records/${existing[0].id}`, { method: 'PUT', body });
    return { action: 'updated', name };
  }
  await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body });
  return { action: 'created', name };
}
