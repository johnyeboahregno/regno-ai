# Rebuild From Scratch

> Status: stable · Last updated: 2026-08-28

> The master reproducibility runbook: from an empty repo to a running Regno Architect.

## 1. Local build

```bash
git clone <this-repo> regno-ai && cd regno-ai
npm install
npm run build              # all workspaces compile
```

## 2. Databases (Compose variant)

```bash
cp .env.example .env       # fill secrets (OPENAI_API_KEY, SMTP_PASSWORD, JWT_SECRET)
docker compose up -d mongo qdrant neo4j redis
npm run db:init
```

## 3. Seed the brain

```bash
npm run db:seed             # agents
npm run db:seed-standards   # base standards (immutable)
npm run db:seed-profile     # user conventions
npm run db:seed-brain       # docs corpus → knowledge base
npm run db:seed-history     # local repos
npm run db:seed-github      # org repos (needs GITHUB_TOKEN)
```

## 4. Run

```bash
npm run dev:web          # :5173
npm run dev:execution    # BullMQ workers
npm run dev:realtime     # SSE :3002
```

## 5. Deploy to k3s (production)

```bash
ssh ubuntu@213.32.7.227
cd ~/regno
# .env.prod already has secrets; rebuild if changed:
bash migrate-k3s.sh      # Secret + manifests
bash seed-k3s.sh         # in-pod seeding
sudo kubectl get pods
```

## 6. Register + use

1. `http://<server>:3000/register` (first user = owner)
2. `/app/chat` → pick a persona → talk to the architect

## 7. Clone for a new developer

```bash
regno developer add --slug <dev> --name "<Name>"
DEVELOPER=<dev> node scripts/seed-history.mjs     # learn their code
regno persona create --slug <dev>-arch --name "<Name>'s Architect" --developer <dev>
```
