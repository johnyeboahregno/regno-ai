#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# Regno Architect Me — SYS-GAME-1 bootstrap
#
# Run as root on a fresh Ubuntu 22.04/24.04 server:
#   git clone <this repo> /opt/regno
#   cd /opt/regno && bash deploy.sh
# =====================================================================

APP_DIR="${APP_DIR:-/opt/regno}"
REPO_URL="${REPO_URL:-}"
NODE_VERSION="${NODE_VERSION:-22}"

if [ "$(id -u)" -ne 0 ]; then
  echo "[deploy] please run as root (or with sudo)"
  exit 1
fi

if [ -z "$REPO_URL" ] && [ ! -d "$APP_DIR/.git" ]; then
  echo "[deploy] REPO_URL is required on first run, e.g. REPO_URL=https://github.com/you/regno-ai.git bash deploy.sh"
  exit 1
fi

step() { echo; echo "==> $*"; }

step "1/7 — installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker || true

step "2/7 — installing git + Node.js $NODE_VERSION"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates gnupg openssl
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi

step "3/7 — fetching the repo"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  # Repo already present — pull so re-running this script always picks up the latest fixes.
  git -C "$APP_DIR" pull --ff-only
fi
cd "$APP_DIR"

step "4/7 — installing node deps (for the seed scripts)"
npm install --no-audit --no-fund

step "5/7 — writing .env.prod"
if [ ! -f .env.prod ]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  DOMAIN="${DOMAIN:-}"
  while [ -z "$DOMAIN" ]; do read -r -p "Domain (e.g. app.example.com): " DOMAIN; done
  read -r -p "TLS/ACME email (for Caddy): " TLS_EMAIL
  read -r -p "OpenAI API key (blank to skip): " OPENAI_KEY
  read -r -p "Anthropic API key (blank to skip): " ANTHROPIC_KEY
  read -r -p "Google AI API key (blank to skip): " GOOGLE_KEY
  read -r -p "DeepSeek API key (blank to skip): " DEEPSEEK_KEY
  SMTP_HOST="${SMTP_HOST:-mail.postale.io}"
  SMTP_PORT="${SMTP_PORT:-587}"
  SMTP_USERNAME="${SMTP_USERNAME:-admin@regnocloud.com}"
  SMTP_ENCRYPTION="${SMTP_ENCRYPTION:-tls}"
  SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL:-admin@regnocloud.com}"
  SMTP_FROM_NAME="${SMTP_FROM_NAME:-Regno Cloud Admin}"
  read -r -p "SMTP host [${SMTP_HOST}]: " _sh && [ -n "$_sh" ] && SMTP_HOST="$_sh"
  read -r -p "SMTP port [${SMTP_PORT}]: " _sp && [ -n "$_sp" ] && SMTP_PORT="$_sp"
  read -r -p "SMTP username [${SMTP_USERNAME}]: " _su && [ -n "$_su" ] && SMTP_USERNAME="$_su"
  read -r -s -p "SMTP password (input hidden): " SMTP_PASSWORD; echo

  cat > .env.prod <<EOF
DOMAIN=$DOMAIN
TLS_EMAIL=$TLS_EMAIL
MONGO_URI=mongodb://mongo:27017/regno
MONGO_POOL_SIZE=50
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme
QDRANT_URL=http://qdrant:6333
REDIS_URL=redis://redis:6379
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
OPENAI_API_KEY=$OPENAI_KEY
GOOGLE_AI_API_KEY=$GOOGLE_KEY
DEEPSEEK_API_KEY=$DEEPSEEK_KEY
JWT_SECRET=$JWT_SECRET
ALLOWED_ORIGINS=https://$DOMAIN
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USERNAME=$SMTP_USERNAME
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_ENCRYPTION=$SMTP_ENCRYPTION
SMTP_FROM_EMAIL=$SMTP_FROM_EMAIL
SMTP_FROM_NAME="$SMTP_FROM_NAME"
GITHUB_ORG=$GITHUB_ORG
GITHUB_TOKEN=$GITHUB_TOKEN
EOF
  chmod 600 .env.prod
  echo "[deploy] wrote .env.prod"
fi

step "6/7 — building + starting the stack"
# Stop any containers left over from a previous/interrupted deploy first — otherwise a
# leftover container (e.g. redis, neo4j) still holding its host port makes `up` fail
# with "address already in use". Never touched here: volumes (no -v), so data survives
# a normal redeploy; only the wizard's explicit "wipe" flag removes volumes.
docker compose --env-file .env.prod down --remove-orphans 2>/dev/null || true
# Belt-and-braces: also force-remove any container (from an older/differently-named
# compose project, or started outside compose) still holding a port this stack needs —
# project-scoped `down` above only touches containers labeled for THIS project.
for port in 27017 6333 6334 7474 7687 6379 3000 3002; do
  ids="$(docker ps -q --filter "publish=$port")"
  [ -n "$ids" ] && docker rm -f $ids 2>/dev/null || true
done
# Unconditional daemon restart: an orphaned `docker-proxy` process can keep a host port
# bound with no owning container left to remove (known Docker behaviour after an
# interrupted/killed deploy). Detecting this reliably across ss/lsof versions isn't
# worth the fragility — just restart the daemon every time; a few seconds of downtime
# during a redeploy is cheap insurance against repeat "address already in use" failures.
systemctl restart docker || service docker restart || true
sleep 3
docker compose --env-file .env.prod up -d --build

step "7/8 — initializing + seeding (host → localhost DB ports)"
# Load API keys from .env.prod, then point host scripts at the published DB ports.
set -a
# shellcheck disable=SC1091
source .env.prod
set +a
# Mongo runs with root auth enabled (MONGO_INITDB_ROOT_USERNAME/PASSWORD in docker-compose.yml) —
# an unauthenticated URI here fails every seed script with "createIndexes requires authentication".
export MONGO_URI="mongodb://regno:${MONGO_PASSWORD}@localhost:27017/regno?authSource=admin"
export QDRANT_URL="http://localhost:6333"
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="${NEO4J_PASSWORD:-changeme}"
export REDIS_URL="redis://localhost:6379"

echo "[deploy] waiting for databases to be ready…"
sleep 20

node scripts/init-db.mjs
node scripts/seed-agents.mjs
node scripts/seed-profile.mjs
if [ -n "${OPENAI_API_KEY:-}" ]; then
  node scripts/seed-brain.mjs
  node scripts/seed-history.mjs
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    node scripts/seed-github.mjs
  fi
else
  echo "[deploy] no OPENAI_API_KEY — skipped embedding steps. Run 'npm run db:seed-brain' and 'npm run db:seed-history' after adding a key."
fi

step "8/8 — Cloudflare DNS (optional)"
if [ -n "${CF_API_TOKEN:-}" ]; then
  SLUG_DOMAIN="$(echo "$DOMAIN" | cut -d. -f1)"
  ROOT_DOMAIN="${DOMAIN#"$SLUG_DOMAIN".}"
  if [ -z "${SERVER_IP:-}" ]; then
    SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
  fi
  if [ -n "$SLUG_DOMAIN" ] && [ -n "$SERVER_IP" ]; then
    REGNO_ROOT_DOMAIN="$ROOT_DOMAIN" node scripts/cloudflare-dns.mjs upsert "$SLUG_DOMAIN" "$SERVER_IP"
  else
    echo "[deploy] skipped Cloudflare DNS — could not determine public IP (set SERVER_IP)"
  fi
else
  echo "[deploy] skipped Cloudflare DNS — CF_API_TOKEN not set"
fi

echo
echo "[deploy] done ✅  Regno Architect Me is up at https://$DOMAIN"
docker compose ps
