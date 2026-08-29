# Deploying to SYS-GAME-1 — Runbook

> Target: **OVHcloud eco SYS-GAME-1** — AMD Ryzen 5 3600X (6c/12t), 64GB RAM, 2×512GB SSD, 500Mbps.
> OS: Ubuntu 24.04. Everything self-hosts on this one box via Docker Compose.

---

> ⚙️ **CI/CD:** pushes to `master` are tested, built, deployed to k3s and validated automatically via
> GitHub Actions, and developers get isolated preview namespaces. See [`docs/ci-cd.md`](./docs/ci-cd.md).

---

## 0. Before the server arrives

1. **Order SYS-GAME-1** (OVHcloud eco, "Configure") — choose Ubuntu 24.04, 64GB RAM.
2. **Add your SSH public key** during ordering (or use the OVH manager "SSH keys" tab).
3. **Point a domain** (optional but recommended) — create a DNS `A` record to the server IP,
   e.g. `architect.yourdomain.com`.
4. **Have these ready:**
   - `OPENAI_API_KEY` (required for embeddings / brain seeding)
   - `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY` (optional)
   - A git host URL for this repo (or you'll `scp` the folder)

---

## 1. First login + hardening (manual, ~5 min)

```bash
ssh root@<SERVER_IP>

# Update
apt-get update -y && apt-get upgrade -y

# Firewall — allow SSH (22), web (80/443). DB ports stay closed to the internet.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

> If you use a non-default SSH port, add that port to `ufw` **before** enabling.
> For stricter security, disable password auth and use keys only
> (`/etc/ssh/sshd_config` → `PasswordAuthentication no`, then `systemctl restart ssh`).

---

## 2. Bootstrap (automatic)

```bash
# Get the repo onto the server (pick one):
git clone <YOUR_REPO_URL> /opt/regno
#   — or, if no remote yet:
#   scp -r ./regno-ai root@<SERVER_IP>:/opt/regno

cd /opt/regno
bash deploy.sh
```

`deploy.sh` installs Docker + git + Node 22, writes `.env.prod` (prompts for domain, TLS email,
API keys; auto-generates `JWT_SECRET`), builds and starts the full stack, then runs the DB
bootstrap + seed scripts.

---

## 3. Bootstrap (manual, if you prefer step-by-step)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

cd /opt/regno
npm install

# Create .env.prod from the template and fill in real values
cp .env.example .env.prod
nano .env.prod

# Start everything
docker compose --env-file .env.prod up -d --build

# Initialize + seed (host → localhost DB ports)
export MONGO_URI="mongodb://localhost:27017/regno"
export QDRANT_URL="http://localhost:6333"
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="changeme"
export REDIS_URL="redis://localhost:6379"
source .env.prod

node scripts/init-db.mjs        # indexes + Qdrant collections + Neo4j constraints
node scripts/seed-agents.mjs    # general-assistant + regno-architect
node scripts/seed-profile.mjs   # your conventions → userMemories
node scripts/seed-brain.mjs     # docs/ → ask-the-docs RAG  (needs OPENAI_API_KEY)
node scripts/seed-history.mjs   # your repos → code + commits (needs OPENAI_API_KEY)
```

---

## 4. Verify

```bash
docker compose ps                     # all services Up
curl -s localhost:3000/api/health     # {"ok":true,...}  (via Caddy: https://DOMAIN/api/health)
docker compose logs -f web execution  # tail logs
```

Caddy obtains TLS automatically from `DOMAIN` + `TLS_EMAIL` — give it ~1 min on first start.

**Test an execution:**

```bash
curl -s -X POST https://DOMAIN/api/executions \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Scaffold a small Node.js API for notes"}'
# → {"ok":true,"jobId":"..."}  then watch: docker compose logs -f execution
```

---

## 5. Backups (recommended)

```bash
# MongoDB
docker compose exec mongo mongodump --out /data/backup/mongo
# Neo4j
docker compose exec neo4j neo4j-admin database dump neo4j --to-path=/data/backup/neo4j
# Qdrant snapshot
curl -X POST http://localhost:6333/collections/cortex_patterns/snapshots
curl -X POST http://localhost:6333/collections/cortex_wisdom/snapshots
```

Add a cron job for nightly dumps + copy off-box (e.g. OVHcloud Object Storage / external drive).

---

## 6. Monitoring

```bash
docker compose ps            # status
docker stats                 # live resource usage
docker compose logs -f       # follow all logs
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Caddy can't get a cert | Check DNS `A` record + ports 80/443 open; `docker compose logs caddy` |
| Seed scripts can't reach DBs | DBs may still be starting — wait, then `docker compose ps` |
| `seed-brain` fails on embed | `OPENAI_API_KEY` missing/expired — check `.env.prod` |
| Mongo healthcheck red | `docker compose logs mongo` |
| Neo4j auth error | `NEO4J_PASSWORD` in `.env.prod` must match compose default (`changeme`) |

---

*Generated with the Regno Architect rebuild — see `REBUILD_PLAN.md` for the full plan.*
