# Cloudflare domain routing — john.regno.ai

> How the production site is served at `https://john.regno.ai` through Cloudflare,
> and how the pieces fit together on SYS-GAME-1 (k3s).

## Topology

```
https://john.regno.ai ──▶ Cloudflare (edge TLS, proxy) ──▶ 213.32.7.227:80 (Traefik)
                                                             ├─ /events*   → realtime :3002
                                                             └─ /*         → web :3000
```

- Cloudflare terminates TLS at the edge. SSL/TLS mode is **Flexible** → origin serves plain HTTP on `:80`.
- `http://john.regno.ai` is 301'd to `https://` by Cloudflare ("Always Use HTTPS").
- The production `web` pod no longer binds `hostPort` (it rolls zero-downtime), so the direct
  `http://213.32.7.227:3000` fallback is gone — use the domain, or reach the app with
  `kubectl -n default port-forward svc/web 3000:3000`.

## Cloudflare DNS

| Type | Name  | Content      | Proxy |
|------|-------|--------------|-------|
| A    | john  | 213.32.7.227 | Proxied (orange cloud) |

`regno.ai` nameservers: `gabriella.ns.cloudflare.com`, `glen.ns.cloudflare.com`.

> Cloudflare only proxies to origin ports **80/443** (never 3000) — hence the Traefik Ingress.

## Mothership / Docker Compose

- The Mothership is exposed through Docker Compose on port `80`; Cloudflare Flexible TLS
  terminates HTTPS at the edge and forwards to the VPS.
- Each Architect is provisioned on its own target machine by the Mothership worker and
  runs its own full Docker Compose stack.

## Env

`.env.prod` (on the box at `/home/ubuntu/regno/.env.prod`) → `regno-env` Secret:

```ini
DOMAIN=john.regno.ai
ALLOWED_ORIGINS=https://john.regno.ai
TLS_EMAIL=admin@regnocloud.com
```

After changing `.env.prod`, rebuild the Mothership stack:

```bash
cd /opt/regno
sudo docker compose -f docker-compose.mothership.yml --env-file .env.prod up -d --build --remove-orphans
```

## Verify

```bash
curl -s -k https://mothership.regno.ai/api/health                 # Mothership health
# → {"ok":true,"service":"regno-architect","redis":true,...}
```

## Gotchas

- Auth cookies are `Secure` (`apps/mothership/src/routes/api/auth/sso/callback/+server.ts`).
  The browser sees HTTPS at the Cloudflare edge, so `Secure` cookies are accepted even
  though the origin speaks HTTP (Flexible mode).
- Architect telemetry is sent to `/api/architects/{slug}/telemetry` on the Mothership.
- If Cloudflare ever returns `521`/`522`, the SSL/TLS mode is set to Full while the origin
  only serves HTTP — switch it back to **Flexible** (or add origin TLS).

## Automating DNS for new Architects

The Mothership provisioning worker creates/updates the A record for a developer name so
**`<slug>.regno.ai`** points at the provisioned Architect.

```bash
node scripts/cloudflare-dns.mjs upsert john 213.32.7.227   # john.regno.ai → 213.32.7.227 (proxied)
node scripts/cloudflare-dns.mjs upsert darren 1.2.3.4 --no-proxy
node scripts/cloudflare-dns.mjs delete john
node scripts/cloudflare-dns.mjs list
```

Requirements:

- `CF_API_TOKEN` — Cloudflare API token with **Zone → DNS → Edit** permission.
- `CF_ZONE_ID` — optional; resolved from `REGNO_ROOT_DOMAIN` (default `regno.ai`) if omitted.
- Slug rules: lowercase `a-z`/`0-9`/hyphens, no spaces; reserved names (`www`, `api`, `admin`, …) are rejected.

`deploy.sh` and the Mothership provision worker call it automatically when the token is set,
skipping gracefully otherwise.
A user-facing walkthrough lives in **User Guides → Cloudflare DNS for new Architects**.
