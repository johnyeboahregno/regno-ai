#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# Regno Architect Me — k3s build + deploy + validate
#
# Runs on the k3s node (self-hosted GitHub Actions runner) or any machine
# with `docker` and `kubectl` access to the cluster. Used by the CI/CD
# workflows AND callable manually:
#
#   bash scripts/k8s-deploy.sh                         # production (namespace: default, web :3000)
#   bash scripts/k8s-deploy.sh -n dev-jsmith -p 3010   # developer preview
#
# Options:
#   -n, --namespace NS    Kubernetes namespace        (default: default)
#   -p, --port PORT       Web host port               (default: 3000; realtime = PORT+2)
#   -e, --env-file FILE   Path to .env.prod           (default: auto-detect below)
#       --skip-build      Skip docker build           (reuse existing local images)
#       --skip-secret     Skip (re)creating the regno-env Secret
#       --skip-validate   Skip post-deploy health check
#       --no-rollback     Disable automatic rollout undo on failed validation
#
# Env:
#   KUBECTL       kubectl command (default: kubectl; set to "sudo kubectl" if needed)
#   IMAGE_PREFIX  image prefix    (default: regno-architect)
#   ENV_FILE      fallback path for .env.prod
# =====================================================================

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KUBECTL="${KUBECTL:-kubectl}"
IMAGE_PREFIX="${IMAGE_PREFIX:-regno-architect}"
NAMESPACE="default"
PORT="3000"
ENV_FILE=""
SKIP_BUILD=0
SKIP_SECRET=0
SKIP_VALIDATE=0
ROLLBACK=1
TIMEOUT=180

usage() {
  sed -n '5,24p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--namespace)  NAMESPACE="${2:?namespace required}"; shift 2 ;;
    -p|--port)       PORT="${2:?port required}"; shift 2 ;;
    -e|--env-file)   ENV_FILE="${2:?env file required}"; shift 2 ;;
    --skip-build)    SKIP_BUILD=1; shift ;;
    --skip-secret)   SKIP_SECRET=1; shift ;;
    --skip-validate) SKIP_VALIDATE=1; shift ;;
    --no-rollback)   ROLLBACK=0; shift ;;
    -h|--help)       usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

RTPORT=$((PORT + 2))
step() { echo; echo "==> $*"; }

# --- resolve .env.prod -------------------------------------------------
if [ -z "$ENV_FILE" ]; then
  for candidate in "${ENV_FILE:-}" "$HOME/regno/.env.prod" "/opt/regno/.env.prod" "$REPO_DIR/.env.prod"; do
    [ -n "$candidate" ] && [ -f "$candidate" ] && ENV_FILE="$candidate" && break
  done
fi

cd "$REPO_DIR"

# --- 1. build app images ----------------------------------------------
if [ "$SKIP_BUILD" -eq 0 ]; then
  step "building app images ($IMAGE_PREFIX-*)"
  docker build -t "$IMAGE_PREFIX-web:latest"       -f apps/web/Dockerfile .
  docker build -t "$IMAGE_PREFIX-execution:latest" -f apps/execution/Dockerfile .
  docker build -t "$IMAGE_PREFIX-realtime:latest"  -f apps/realtime/Dockerfile .
fi

# --- 2. namespace + secret ---------------------------------------------
step "ensuring namespace $NAMESPACE"
"$KUBECTL" create namespace "$NAMESPACE" --dry-run=client -o yaml | "$KUBECTL" apply -f -

if [ "$SKIP_SECRET" -eq 0 ]; then
  if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    step "creating secret regno-env in $NAMESPACE from $ENV_FILE"
    TMP_ENV="$(mktemp)"
    sed 's/"//g' "$ENV_FILE" > "$TMP_ENV"
    # shellcheck disable=SC1090
    ( set -a; . "$ENV_FILE" 2>/dev/null || true
      echo "NEO4J_AUTH=neo4j/${NEO4J_PASSWORD:-changeme}"
      echo "MONGO_INITDB_ROOT_USERNAME=regno"
    ) >> "$TMP_ENV"
    "$KUBECTL" -n "$NAMESPACE" delete secret regno-env --ignore-not-found >/dev/null 2>&1 || true
    "$KUBECTL" -n "$NAMESPACE" create secret generic regno-env --from-env-file="$TMP_ENV"
    rm -f "$TMP_ENV"
  else
    echo "[k8s-deploy] no .env.prod found — keeping existing regno-env Secret (if any)"
  fi
fi

# --- 3. apply manifests (unique host ports per namespace) ---------------
step "applying manifests (web :$PORT, realtime :$RTPORT)"
sed "s/hostPort: 3000/hostPort: $PORT/; s/hostPort: 3002/hostPort: $RTPORT/" k8s/app.yaml \
  | "$KUBECTL" apply -n "$NAMESPACE" -f -

# --- 4. wait for rollouts ----------------------------------------------
step "waiting for deployments to roll out"
failed=0
for d in mongo qdrant neo4j redis realtime execution web; do
  if "$KUBECTL" -n "$NAMESPACE" rollout status deployment/"$d" --timeout="${TIMEOUT}s"; then
    echo "  ✓ $d ready"
  else
    echo "  ✗ $d not ready" >&2
    [ "$d" = "web" ] && failed=1
  fi
done
if [ "$failed" -eq 1 ]; then
  echo "[k8s-deploy] web deployment failed to roll out" >&2
  exit 1
fi

# --- 5. validate the deployed version ----------------------------------
if [ "$SKIP_VALIDATE" -eq 0 ]; then
  step "validating deployed app at http://localhost:$PORT/api/health"
  ok=0
  for i in $(seq 1 24); do
    body="$(curl -fsS --max-time 5 "http://localhost:$PORT/api/health" 2>/dev/null || true)"
    if printf '%s' "$body" | grep -q '"ok":true'; then
      ok=1
      echo "  ✓ health OK: $body"
      break
    fi
    echo "  … health check retry $i/24"
    sleep 5
  done

  if [ "$ok" -eq 1 ]; then
    echo "[k8s-deploy] ✓ validation passed"
  else
    echo "[k8s-deploy] ✗ health check failed — deployed version is unhealthy" >&2
    if [ "$ROLLBACK" -eq 1 ]; then
      step "rolling back web / execution / realtime"
      for d in web execution realtime; do
        "$KUBECTL" -n "$NAMESPACE" rollout undo deployment/"$d" || true
      done
    fi
    exit 1
  fi
fi

step "done ✅  namespace=$NAMESPACE  web=http://<host>:$PORT"
"$KUBECTL" -n "$NAMESPACE" get pods
