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

## k3s / Traefik

- Traefik is the default `IngressClass` and binds `80`/`443` at the public IP via `svclb-traefik`.
- The route lives in [`k8s/ingress.yaml`](../../k8s/ingress.yaml), applied to `default`:

```bash
sudo kubectl -n default apply -f k8s/ingress.yaml
sudo kubectl -n default get ingress regno-web   # → HOSTS john.regno.ai, ADDRESS 213.32.7.227
```

- `web` rolls zero-downtime (`RollingUpdate` + readiness probe, no `hostPort`); `realtime`
  keeps `hostPort` + `Recreate`. The Ingress points at their ClusterIP Services, so
  `:3000` / `:3002` stay internal.

## Env

`.env.prod` (on the box at `/home/ubuntu/regno/.env.prod`) → `regno-env` Secret:

```ini
DOMAIN=john.regno.ai
ALLOWED_ORIGINS=https://john.regno.ai
TLS_EMAIL=admin@regnocloud.com
```

After changing `.env.prod`, rebuild the secret (same logic as `scripts/k8s-deploy.sh`) and restart:

```bash
cd /home/ubuntu/regno
sudo bash -c '
  sed "s/\"//g" .env.prod > /tmp/regno-env.clean
  ( set -a; . .env.prod 2>/dev/null || true
    echo "NEO4J_AUTH=neo4j/${NEO4J_PASSWORD:-changeme}"
    echo "MONGO_INITDB_ROOT_USERNAME=regno"
  ) >> /tmp/regno-env.clean
  kubectl -n default delete secret regno-env --ignore-not-found
  kubectl -n default create secret generic regno-env --from-env-file=/tmp/regno-env.clean
  rm -f /tmp/regno-env.clean
'
sudo kubectl -n default rollout restart deployment/web deployment/execution deployment/realtime
```

## Verify

```bash
curl -s -H "Host: john.regno.ai" http://213.32.7.227/api/health   # origin via Traefik
curl -s -k https://john.regno.ai/api/health                       # end-to-end via Cloudflare
# → {"ok":true,"service":"regno-architect","redis":true,...}
```

## Gotchas

- Auth cookies are `Secure` (`apps/web/src/routes/api/auth/login|register/+server.ts`).
  The browser sees HTTPS at the Cloudflare edge, so `Secure` cookies are accepted even
  though the origin speaks HTTP (Flexible mode).
- Realtime SSE: `/events*` must route to the **realtime** service, not `web`.
- `k8s/app.yaml` deploys do **not** apply `k8s/ingress.yaml` (production-only, `default`
  namespace) — keeping it out of `app.yaml` avoids clobbering dev preview namespaces.
- If Cloudflare ever returns `521`/`522`, the SSL/TLS mode is set to Full while the origin
  only serves HTTP — switch it back to **Flexible** (or add origin TLS).

## Automating DNS for new Architects

`scripts/cloudflare-dns.mjs` creates/updates the A record for a developer name so
**`<slug>.regno.ai`** points at the deployed server (proxied through Cloudflare, matching
the topology above). It's also importable as a module for the provisioning wizard.

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

Both `deploy.sh` (step 8/8) and `clone-developer.sh` (step 6) call it automatically when
the token (and `SERVER_IP` for the clone path) are set, skipping gracefully otherwise.
A user-facing walkthrough lives in **User Guides → Cloudflare DNS for new Architects**.
