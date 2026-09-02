#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# Regno Mothership — control-plane bootstrap (lightweight VPS, 2 GB OK)
#
# Run as root on a fresh Ubuntu 22.04/24.04 server:
#   scp deploy-mothership.sh ubuntu@<ip>:/tmp/
#   ssh ubuntu@<ip> 'sudo REPO_URL=https://github.com/<you>/regno-ai.git bash /tmp/deploy-mothership.sh'
#
# Installs Docker, adds swap headroom, clones the repo, writes .env.prod
# (prompts only for the Cloudflare token — secrets stay on the box), and
# starts web + execution + mongo + redis via docker-compose.mothership.yml.
# =====================================================================

APP_DIR="${APP_DIR:-/opt/regno}"
REPO_URL="${REPO_URL:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "[mothership] please run as root (or with sudo)"
  exit 1
fi
if [ -z "$REPO_URL" ] && [ ! -d "$APP_DIR/.git" ]; then
  echo "[mothership] REPO_URL is required on first run, e.g. REPO_URL=https://github.com/you/regno-ai.git"
  exit 1
fi

step() { echo; echo "==> $*"; }

step "1/6 — installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker || true

step "2/6 — adding 2GB swap (headroom for the image build)"
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "3/6 — installing git + fetching the repo"
apt-get update -y
apt-get install -y git curl
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

step "4/6 — writing .env.prod"
if [ ! -f .env.prod ]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  CREDENTIALS_KEY="$(openssl rand -hex 32)"
  read -r -p "Regno Identity base URL [https://identity.regnocloud.com]: " IDENTITY
  IDENTITY="${IDENTITY:-https://identity.regnocloud.com}"
  read -r -p "Cloudflare API token (Zone → DNS → Edit, blank to skip DNS): " CF_TOKEN
  read -r -p "Cloudflare zone ID (blank to resolve from root domain): " CF_ZONE
  read -r -p "Root domain [regno.ai]: " ROOT
  ROOT="${ROOT:-regno.ai}"
  cat > .env.prod <<EOF
JWT_SECRET=$JWT_SECRET
CREDENTIALS_KEY=$CREDENTIALS_KEY
REGNO_IDENTITY_BASE_URL=$IDENTITY
CF_API_TOKEN=$CF_TOKEN
CF_ZONE_ID=$CF_ZONE
REGNO_ROOT_DOMAIN=$ROOT
REPO_URL=$REPO_URL
EOF
  chmod 600 .env.prod
  echo "[mothership] wrote .env.prod"
fi

step "5/6 — building + starting the Mothership"
docker compose -f docker-compose.mothership.yml --env-file .env.prod up -d --build

step "6/6 — done"
echo
echo "[mothership] up ✅ — point a Cloudflare A record at this box's IP (port 80, Flexible TLS)"
echo "[mothership] then open: https://<your-subdomain> and register the first (owner) account."
docker compose -f docker-compose.mothership.yml ps
