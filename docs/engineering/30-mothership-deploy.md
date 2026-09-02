# Deploying the Mothership (control plane)

> The Mothership is the lightweight Regno deployment that runs the Architect-creation wizard
> and the provisioning worker. Each developer Architect is a **separate** full stack on its
> own machine — the Mothership only ever runs web + execution + mongo + redis.

## 1. Requirements

- A basic VPS (1–2 vCPU, **2–4 GB RAM**) with a public IP.
- The `regno.ai` (or chosen) zone on Cloudflare, proxied with **Flexible** TLS (origin :80).
- A Cloudflare API token with **Zone → DNS → Edit** (for registering `slug.regno.ai`).
- Regno Identity SSO reachable (`https://identity.regnocloud.com`).

## 2. Env

Create `.env.prod` on the VPS with at least:

```ini
JWT_SECRET=<64-hex or strong random>
CREDENTIALS_KEY=<optional 64-hex, else derived from JWT_SECRET>
REGNO_IDENTITY_BASE_URL=https://identity.regnocloud.com
CF_API_TOKEN=<cloudflare token>
CF_ZONE_ID=<regno.ai zone id>
REGNO_ROOT_DOMAIN=regno.ai
REPO_URL=https://github.com/<you>/regno-ai.git
MOTHERSHIP_URL=https://<mothership-subdomain>   # Architects POST telemetry here
```

## 3. Start

```bash
git clone "$REPO_URL" /opt/regno && cd /opt/regno
cp .env.prod .env
docker compose -f docker-compose.mothership.yml up -d --build
```

Web serves on `:80`; point Cloudflare at the VPS IP and open the app. The health page will
show Neo4j/Qdrant as **degraded** on the Mothership — that is expected (it doesn't run them).

## 4. Provisioning flow

1. Log in via SSO (first SSO user becomes owner).
2. Open **System → Architects** → **New Architect**.
3. Fill the 6 wizard steps, tick **wipe** if repurposing an existing box, and **Save & launch**.
4. The execution worker SSHs to the target, writes `.env.prod`, runs `deploy.sh`, and registers
   `<slug>.regno.ai` in Cloudflare. Watch the live step-by-step progress in the wizard (and the
   status on the Architects page).

## 5. Notes

- The execution image installs `openssh-client` + `sshpass` (see `apps/execution/Dockerfile`);
  the Mothership VPS must allow **outbound SSH (22)** to target machines.
- The target machine needs enough RAM for Neo4j (4 GB heap) — 8 GB min, 16 GB comfortable.
- To repurpose `213.32.7.227` as a fresh Architect: point the wizard at it with **wipe** enabled.
