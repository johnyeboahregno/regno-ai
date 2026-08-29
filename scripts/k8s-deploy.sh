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
#   -r, --image-repo REPO Docker Hub repo, e.g. regnodockerhub/regno (enables push mode)
#       --tag TAG         Image tag                   (default: latest)
#       --push            Push images to the registry after build
#       --skip-build      Skip docker build           (reuse existing local images)
#       --skip-secret     Skip (re)creating the regno-env Secret
#       --skip-validate   Skip post-deploy health check
#       --no-rollback     Disable automatic rollout undo on failed validation
#
# Env:
#   KUBECTL       kubectl command (default: kubectl; set to "sudo kubectl" if needed)
#   IMAGE_PREFIX  local image prefix (default: regno-architect)
#   ENV_FILE      fallback path for .env.prod
# =====================================================================

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KUBECTL="${KUBECTL:-kubectl}"
IMAGE_PREFIX="${IMAGE_PREFIX:-regno-architect}"
IMAGE_REPO=""
TAG="latest"
PUSH=0
NAMESPACE="default"
PORT="3000"
ENV_FILE=""
SKIP_BUILD=0
SKIP_SECRET=0
SKIP_VALIDATE=0
ROLLBACK=1
TIMEOUT=180

usage() {
  cat <<'EOF'
Usage: scripts/k8s-deploy.sh [options]

  -n, --namespace NS     Kubernetes namespace       (default: default)
  -p, --port PORT        Web host port              (default: 3000; realtime = PORT+2)
  -e, --env-file FILE    Path to .env.prod
  -r, --image-repo REPO  Registry repo, e.g. regnodockerhub/regno (enables push mode)
      --tag TAG          Image tag                  (default: latest)
      --push             Push images after build
      --skip-build       Reuse existing local images
      --skip-secret      Skip (re)creating regno-env Secret
      --skip-validate    Skip post-deploy health check
      --no-rollback      Disable auto rollback on failed validation
  -h, --help             Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--namespace)  NAMESPACE="${2:?namespace required}"; shift 2 ;;
    -p|--port)       PORT="${2:?port required}"; shift 2 ;;
    -e|--env-file)   ENV_FILE="${2:?env file required}"; shift 2 ;;
    -r|--image-repo) IMAGE_REPO="${2:?image repo required}"; shift 2 ;;
    --tag)           TAG="${2:?tag required}"; shift 2 ;;
    --push)          PUSH=1; shift ;;
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

# --- 1. resolve names + build (and optionally push) app images ---------
if [ -n "$IMAGE_REPO" ]; then
  WEB_IMG="$IMAGE_REPO-web:$TAG"
  EXEC_IMG="$IMAGE_REPO-execution:$TAG"
  RT_IMG="$IMAGE_REPO-realtime:$TAG"
else
  WEB_IMG="$IMAGE_PREFIX-web:$TAG"
  EXEC_IMG="$IMAGE_PREFIX-execution:$TAG"
  RT_IMG="$IMAGE_PREFIX-realtime:$TAG"
fi

if [ "$SKIP_BUILD" -eq 0 ]; then
  step "building app images"
  docker build -t "$WEB_IMG"  -f apps/web/Dockerfile .
  docker build -t "$EXEC_IMG" -f apps/execution/Dockerfile .
  docker build -t "$RT_IMG"   -f apps/realtime/Dockerfile .
fi

if [ "$PUSH" -eq 1 ]; then
  step "pushing app images"
  docker push "$WEB_IMG"
  docker push "$EXEC_IMG"
  docker push "$RT_IMG"
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

# --- 3. apply manifests (unique host ports + image tag per namespace) ---
step "applying manifests (web :$PORT, realtime :$RTPORT, tag $TAG)"
# Always substitute the image references so a new --tag changes the pod spec
# and triggers a rolling update. With the default tag (latest) this is a no-op,
# so manual runs behave exactly as before.
SED_EXPR="s/hostPort: 3000/hostPort: $PORT/; s/hostPort: 3002/hostPort: $RTPORT/; s|image: regno-architect-web:latest|image: $WEB_IMG|; s|image: regno-architect-execution:latest|image: $EXEC_IMG|; s|image: regno-architect-realtime:latest|image: $RT_IMG|"
sed "$SED_EXPR" k8s/app.yaml | "$KUBECTL" apply -n "$NAMESPACE" -f -

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
