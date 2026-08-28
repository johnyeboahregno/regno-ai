#!/usr/bin/env bash
set -euo pipefail

# Seed the CORTEX brain from: docs/ corpus + local repos + GitHub org.
# Run AFTER adding OPENAI_API_KEY (and optionally GITHUB_TOKEN) to ~/regno/.env.prod.
#
#   ssh ubuntu@213.32.7.227
#   nano ~/regno/.env.prod        # add OPENAI_API_KEY=sk-...  (and GITHUB_TOKEN=ghp_...)
#   bash ~/regno/seed-brain.sh

cd ~/regno

set -a
# shellcheck disable=SC1091
source .env.prod
set +a

# Point host-run seed scripts at the localhost DB ports with auth.
export MONGO_URI="mongodb://regno:${MONGO_PASSWORD}@127.0.0.1:27017/regno?authSource=admin"
export NEO4J_URI="bolt://127.0.0.1:7687"
export NEO4J_USER="neo4j"
export QDRANT_URL="http://127.0.0.1:6333"
export REDIS_URL="redis://127.0.0.1:6379"

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "[brain] OPENAI_API_KEY is not set in .env.prod — add it and re-run."
  exit 1
fi

echo "[brain] restarting web + execution with the new keys…"
sudo docker compose --env-file .env.prod up -d web execution

echo "[brain] 1/3 — seeding docs corpus…"
node scripts/seed-brain.mjs

echo "[brain] 2/3 — seeding local repos (profile/repos.json)…"
node scripts/seed-history.mjs

if [ -n "${GITHUB_TOKEN:-}" ]; then
  echo "[brain] 3/3 — seeding GitHub org (${GITHUB_ORG:-regno-platform})…"
  node scripts/seed-github.mjs
else
  echo "[brain] 3/3 — GITHUB_TOKEN not set, skipping org seeding."
fi

echo "[brain] done ✅ — knowledge base seeded."
