#!/usr/bin/env bash
set -euo pipefail
cd ~/regno

# Build the regno-env Secret from .env.prod (cleaned of shell quotes) + Neo4j auth.
set -a
# shellcheck disable=SC1091
source .env.prod 2>/dev/null || true
set +a

sed 's/"//g' .env.prod > /tmp/regno-env.clean
echo "NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}" >> /tmp/regno-env.clean
echo "MONGO_INITDB_ROOT_USERNAME=regno" >> /tmp/regno-env.clean
sudo kubectl delete secret regno-env --ignore-not-found >/dev/null 2>&1 || true
sudo kubectl create secret generic regno-env --from-env-file=/tmp/regno-env.clean
rm -f /tmp/regno-env.clean
echo "[k3s] secret regno-env created"

# Apply the manifests.
sudo kubectl apply -f k8s/app.yaml
echo "[k3s] manifests applied"

# Wait for the Deployments to roll out.
for d in mongo qdrant neo4j redis web execution realtime; do
  sudo kubectl rollout status deployment/$d --timeout=180s || echo "[k3s] $d not ready yet"
done

echo
echo "[k3s] pods:"
sudo kubectl get pods
