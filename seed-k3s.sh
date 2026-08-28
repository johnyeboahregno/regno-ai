#!/usr/bin/env bash
set -euo pipefail
cd ~/regno

# Seed the databases by running the seed scripts INSIDE the web pod
# (which ships with docs/, scripts/, profile/, and node_modules in the image).

WPOD=$(sudo kubectl get pods -l app=web -o jsonpath='{.items[0].metadata.name}')
echo "[k3s] seeding via pod $WPOD"

sudo kubectl exec "$WPOD" -- node scripts/init-db.mjs
sudo kubectl exec "$WPOD" -- node scripts/seed-agents.mjs
sudo kubectl exec "$WPOD" -- node scripts/seed-profile.mjs
sudo kubectl exec "$WPOD" -- node scripts/seed-standards.mjs
sudo kubectl exec "$WPOD" -- node scripts/seed-brain.mjs

echo "SEED_DONE"
