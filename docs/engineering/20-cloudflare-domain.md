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
- Direct `http://213.32.7.227:3000` still works as a fallback (`hostPort` on the web pod).

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

- `web` / `realtime` keep `hostPort` + `Recreate`; the Ingress points at their ClusterIP
  Services, so `:3000` / `:3002` stay internal.

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
