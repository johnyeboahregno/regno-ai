# First Run — get Regno Architect Me running locally

This walks you from zero to a working, self-hosted Regno platform on **this Windows machine**.
Goal: databases up → seeded → apps running → create account → run your first execution.

---

## 0. What you need

| Tool | Required | Status on this machine |
|---|---|---|
| Node.js 22+ | ✅ | v24.19.0 ✅ |
| npm | ✅ | 11.17.0 ✅ |
| **Docker Desktop** (or WSL2 + Docker engine) | ✅ | ❌ not installed |
| OpenAI API key (for embeddings + LLM) | recommended | — |
| SMTP password (postale.io) | optional (email only) | — |

---

## 1. Install Docker Desktop (Windows)

1. Download **Docker Desktop for Windows**: https://www.docker.com/products/docker-desktop/
2. Install (default settings, enable **WSL 2 backend** when prompted).
3. Launch Docker Desktop and wait until the whale icon is steady / "Engine running".
4. Verify from a terminal:

```bash
docker --version
docker compose version
```

> If you prefer no GUI: install WSL2 + Docker engine inside Ubuntu — but Docker Desktop is the simplest on Windows.

---

## 2. Create your environment file

```bash
cd C:\repos\regno-ai
cp .env.example .env
```

Edit `.env` and fill in:

```ini
OPENAI_API_KEY=sk-...          # required for embeddings / brain / executions
ANTHROPIC_API_KEY=             # optional
GOOGLE_AI_API_KEY=             # optional
JWT_SECRET=<any long random string>
SMTP_PASSWORD=your-postale-password   # optional (email notifications)
```

> `.env` is git-ignored — secrets never get committed.

---

## 3. Start the databases

```bash
docker compose up -d mongo qdrant neo4j redis
```

Wait ~30s, then confirm all four are healthy:

```bash
docker compose ps
```

---

## 4. Initialize + seed the brain

```bash
npm install            # already done, but safe to re-run
npm run db:init        # indexes, Qdrant collections, Neo4j constraints
npm run db:seed        # agents: general-assistant + regno-architect
npm run db:seed-profile   # your conventions → userMemories
npm run db:seed-brain     # docs/ → ask-the-docs RAG (needs OPENAI_API_KEY)
npm run db:seed-history   # your repos → code + commits (needs OPENAI_API_KEY)
```

---

## 5. Start the apps (three terminals, or use the full stack)

**Option A — dev mode (fast iteration):**

```bash
npm run dev:web          # http://localhost:5173
npm run dev:execution    # BullMQ workers (orchestrator + notifications)
npm run dev:realtime     # SSE on :3002
```

**Option B — production-like (Docker):**

```bash
docker compose up -d --build
# then http://localhost:3000 (web) — Caddy on 80/443 if DOMAIN set
```

---

## 6. Create your account + first execution

1. Open **http://localhost:5173/register** (dev) — the **first account becomes owner**.
2. Log in → you land on the dashboard.
3. Go to **Executions** → enter a prompt, e.g.:

```
Scaffold a small Node.js API for notes
```

4. Click **Run** → the job goes to BullMQ → execution worker → LLM → result streams back.
5. Watch progress: `docker compose logs -f execution` (Docker) or the execution terminal.

---

## 7. CLI (optional)

```bash
npm run cli -- login --email you@example.com --password "…"
npm run cli -- run "Scaffold a small Node.js API for notes" --depth quick
npm run cli -- credentials add --name openai --type api --secret sk-...
npm run cli -- credentials list
```

---

## 8. Verify health + email

- **Health page:** `/app/health` → green dots for Mongo/Qdrant/Neo4j/Redis + SMTP status.
- **Test email:** enter an address on the Health page → "Send test".

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: command not found` | Docker Desktop not installed / not started |
| `db:init` can't connect | DBs still starting — wait, then `docker compose ps` |
| `seed-brain`/`seed-history` fail | `OPENAI_API_KEY` missing/invalid in `.env` |
| Health shows red for a DB | check `docker compose logs <mongo|qdrant|neo4j|redis>` |
| Execution stuck "waiting" | execution worker not running (`npm run dev:execution`) |
| Neo4j auth error | `NEO4J_PASSWORD` must be `changeme` (compose default) |

---

## When it works locally

Deploy to the bare-metal server (SYS-GAME-1) with:

```bash
bash deploy.sh
```

See [`DEPLOY.md`](./DEPLOY.md) for the full runbook.

---

*Next build once it runs: the **Canvas / Pipeline builder** surface.*
