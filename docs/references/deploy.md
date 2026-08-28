# Regno AI — Production Deployment Guide

## Architecture Overview

```
                    ┌──────────────────────────────────────────────┐
                    │              Docker Compose                   │
                    │                                              │
  Internet ──▶ :443 ──▶ Caddy (TLS + routing)                    │
                    │       ├──▶ SvelteKit  :5173  (app + API)    │
                    │       ├──▶ Realtime   :3002  (SSE/streams)  │
                    │       └──▶ Execution  :3003  (workers)      │
                    │                  │                           │
                    │       Redis :6379 (queues, pub/sub, cache)  │
                    └──────────┬───────────────────────────────────┘
                               │
            ┌──────────────────┼───────────────────────┐
            ▼                  ▼                        ▼
        MongoDB            Neo4j                    Qdrant
     (documents)      (knowledge graph)       (vector embeddings)
```

Everything inside the box runs as Docker containers via a single `docker compose` command.
The databases (MongoDB, Neo4j, Qdrant) are external — you manage those separately.

---

## Prerequisites

- **Server**: Linux (Ubuntu 22.04+ recommended), 4+ CPU cores, 8GB+ RAM
- **Docker**: Docker Engine 24+ with Docker Compose v2
- **Databases** (already running):
  - MongoDB 7+
  - Neo4j 5+ (with APOC plugin)
  - Qdrant 1.7+
- **Domain** (optional): DNS A record pointing to your server's IP
- **API Keys**: Anthropic, OpenAI, Google AI (at least one)

### Install Docker (if needed)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

---

## Step 1: Transfer Code to Server

From your development machine:

```bash
# Option A: Git (recommended)
ssh your-server "git clone https://your-repo-url.git /opt/regno"

# Option B: Zip and transfer
zip -r regno.zip . -x "node_modules/*" ".svelte-kit/*" "build/*"
scp regno.zip your-server:/opt/
ssh your-server "cd /opt && unzip regno.zip -d regno"
```

---

## Step 2: Create Environment File

On the server, create `/opt/regno/.env.prod`:

```bash
cd /opt/regno

cat > .env.prod << 'EOF'
# ── Domain & TLS ──────────────────────────────────────────
DOMAIN=app.yoursite.com
TLS_EMAIL=admin@yoursite.com

# ── Databases ─────────────────────────────────────────────
MONGO_URI=mongodb://user:pass@your-mongo-host:27017/regno?authSource=admin
NEO4J_URI=bolt://your-neo4j-host:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
QDRANT_URL=http://your-qdrant-host:6333

# ── API Keys ──────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...

# ── Security ──────────────────────────────────────────────
JWT_SECRET=generate-a-strong-random-string-here

# ── Optional ──────────────────────────────────────────────
ALLOWED_ORIGINS=https://app.yoursite.com
EOF

chmod 600 .env.prod
```

---

## Step 3: Build & Launch

```bash
cd /opt/regno

# Build all images and start services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

This builds 3 custom images and pulls 2 pre-built ones:

| Service | Image | What it includes |
|---------|-------|-----------------|
| **sveltekit** | Built from `./Dockerfile` | Node 22 + SvelteKit app + Python 3 + pandas/numpy/matplotlib/seaborn/scipy |
| **execution** | Built from `services/execution/Dockerfile` | Node 22 + BullMQ workers + Python 3 + pandas/numpy/matplotlib/seaborn/scipy |
| **realtime** | Built from `services/realtime/Dockerfile` | Node 22 + SSE streaming server |
| **caddy** | `caddy:2-alpine` | Automatic TLS, reverse proxy, rate limiting |
| **redis** | `redis:7-alpine` | Job queues, pub/sub, caching |

First build takes 3-5 minutes. Subsequent builds use Docker layer cache and are much faster.

---

## Step 4: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# regno-caddy      running (healthy)
# regno-sveltekit  running (healthy)
# regno-realtime   running (healthy)
# regno-execution  running (healthy)
# regno-redis      running (healthy)

# Check health endpoints
curl -k https://localhost/health              # Caddy gateway
curl http://localhost:5173/api/proxy/health    # SvelteKit (internal)

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service
docker compose -f docker-compose.prod.yml logs -f execution
```

---

## Step 5: Seed Agents & Patterns

After the first deploy (or after agent/pattern changes):

```bash
# Exec into the sveltekit container to run seed scripts
docker compose -f docker-compose.prod.yml exec sveltekit sh -c "
  node scripts/seed-system-agents.cjs &&
  node scripts/seed-plan-template-patterns.cjs &&
  node scripts/seed-messaging-patterns.cjs
"
```

---

## Common Operations

### Update / Redeploy

```bash
cd /opt/regno

# Pull latest code
git pull

# Rebuild and restart (zero-downtime with health checks)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Scale Workers

```bash
# Run 3 execution workers for parallel processing
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --scale execution=3
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f execution --tail 100
```

### Stop Everything

```bash
docker compose -f docker-compose.prod.yml down
```

### Stop and Remove Volumes (full reset)

```bash
docker compose -f docker-compose.prod.yml down -v
```

### Shell into a Container

```bash
# SvelteKit container (has Python + Node)
docker compose -f docker-compose.prod.yml exec sveltekit sh

# Test Python is working
docker compose -f docker-compose.prod.yml exec sveltekit python3 -c "import pandas; import matplotlib; print('OK')"
```

---

## Resource Requirements

| Service | RAM (limit) | RAM (reserved) | Notes |
|---------|-------------|----------------|-------|
| Redis | 1.5 GB | 512 MB | In-memory data store |
| Caddy | 256 MB | 64 MB | Lightweight reverse proxy |
| SvelteKit | 2 GB | 512 MB | Main app + Python runtime |
| Realtime | 512 MB | 128 MB | SSE connections |
| Execution | 4 GB | 1 GB | Workers + Python data analysis |
| **Total** | **~8.3 GB** | **~2.2 GB** | Minimum 8 GB RAM recommended |

---

## Ports

| Port | Service | Exposed to |
|------|---------|-----------|
| 80 | Caddy (HTTP → HTTPS redirect) | Public |
| 443 | Caddy (HTTPS + HTTP/3) | Public |
| 5173 | SvelteKit | Internal only |
| 3002 | Realtime | Internal only |
| 3003 | Execution | Internal only |
| 6379 | Redis | Internal only |

Only ports 80 and 443 are exposed to the internet. All other services communicate over the internal Docker network.

---

## TLS / HTTPS

Caddy handles TLS automatically:
- **With a real domain** (`DOMAIN=app.yoursite.com`): Caddy obtains and renews Let's Encrypt certificates automatically
- **With localhost** (`DOMAIN=localhost`): Caddy generates a self-signed certificate

No manual certificate management required.

---

## Troubleshooting

### Container won't start

```bash
# Check build logs
docker compose -f docker-compose.prod.yml logs sveltekit

# Rebuild from scratch (no cache)
docker compose -f docker-compose.prod.yml build --no-cache sveltekit
```

### MongoDB connection issues

```bash
# Test from inside the container
docker compose -f docker-compose.prod.yml exec sveltekit sh -c "
  node -e \"const {MongoClient}=require('mongodb'); MongoClient.connect(process.env.MONGO_URI).then(c=>{console.log('OK');c.close()}).catch(e=>console.error(e))\"
"
```

### Python packages missing

```bash
# Verify Python environment inside sveltekit or execution container
docker compose -f docker-compose.prod.yml exec execution python3 -c "
import pandas, numpy, matplotlib, seaborn, scipy
print('All packages available')
"
```

### Check disk space

```bash
# Docker images can be large
docker system df

# Clean up old images
docker image prune -a
```
