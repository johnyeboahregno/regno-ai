#!/usr/bin/env bash
set -euo pipefail

# Clone the Regno Architect for a developer: a fresh k3s namespace with the
# full stack + the base standards/docs seeded. Their flavour is added later via
# `DEVELOPER=<slug> node scripts/seed-history.mjs` (or seed-github.mjs).
#
# Usage:  bash clone-developer.sh <slug> <webPort>
#   e.g.  bash clone-developer.sh jsmith 3010   → web on :3010, realtime on :3012

SLUG="${1:?usage: clone-developer.sh <slug> <webPort>}"
PORT="${2:-3010}"
RTPORT=$((PORT + 2))
NS="dev-$SLUG"
cd ~/regno

echo "[clone] provisioning developer '$SLUG' → namespace $NS (web :$PORT, realtime :$RTPORT)"

# 1. Namespace
sudo kubectl create namespace "$NS" --dry-run=client -o yaml | sudo kubectl apply -f -

# 2. Secret (recreated from .env.prod, namespaced)
set -a
# shellcheck disable=SC1091
source .env.prod 2>/dev/null || true
set +a
sed 's/"//g' .env.prod > /tmp/regno-env.clean
echo "NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}" >> /tmp/regno-env.clean
echo "MONGO_INITDB_ROOT_USERNAME=regno" >> /tmp/regno-env.clean
sudo kubectl -n "$NS" delete secret regno-env --ignore-not-found >/dev/null 2>&1 || true
sudo kubectl -n "$NS" create secret generic regno-env --from-env-file=/tmp/regno-env.clean
rm -f /tmp/regno-env.clean

# 3. Manifests with unique host ports (web hostPort re-added for direct access;
#    a hostPort can only be held by one pod, so clones terminate old-before-new)
sed "s|{ containerPort: 3000 }|{ containerPort: 3000, hostPort: $PORT }|; s/hostPort: 3002/hostPort: $RTPORT/; s/maxUnavailable: 0/maxUnavailable: 1/; s/maxSurge: 1/maxSurge: 0/" k8s/app.yaml \
  | sudo kubectl apply -n "$NS" -f -

# 4. Wait for the web + neo4j pods
sudo kubectl -n "$NS" wait --for=condition=ready pod -l app=web --timeout=180s
sudo kubectl -n "$NS" wait --for=condition=ready pod -l app=neo4j --timeout=180s

# 5. Seed the clone (base standards + docs + agents) inside its web pod
WPOD=$(sudo kubectl -n "$NS" get pods -l app=web -o jsonpath='{.items[0].metadata.name}')
# Neo4j can still be warming up bolt after "Ready" — retry init-db.
for i in $(seq 1 6); do
  if sudo kubectl -n "$NS" exec "$WPOD" -- node scripts/init-db.mjs; then break; fi
  echo "[clone] init-db retry $i/6 (Neo4j warming up)…"
  sleep 10
done
sudo kubectl -n "$NS" exec "$WPOD" -- node scripts/seed-agents.mjs
sudo kubectl -n "$NS" exec "$WPOD" -- node scripts/seed-standards.mjs
sudo kubectl -n "$NS" exec "$WPOD" -- node scripts/seed-brain.mjs

echo "[clone] done ✅ — $SLUG at http://<server>:$PORT (namespace $NS)"
