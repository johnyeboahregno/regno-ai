#!/usr/bin/env bash
set -euo pipefail

# =====================================================================
# Regno Architect Me — Redeploy Helper
#
# Cleans up Docker containers and reruns deploy.sh with API keys.
# Usage: bash redeploy.sh
#
# Prompts for:
#   - SSH connection (user@host)
#   - SSH key path (optional)
#   - API keys (OpenAI, Anthropic, Google, DeepSeek)
# =====================================================================

step() { echo; echo "==> $*"; }

step "Collecting deployment information"

read -r -p "SSH user@host (e.g. root@192.168.1.100): " SSH_TARGET
SSH_KEY="${SSH_KEY:-}"
read -r -p "SSH key path (leave blank for default ~/.ssh/id_rsa): " _key && [ -n "$_key" ] && SSH_KEY="$_key"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

# Test SSH connection
step "Testing SSH connection"
if ! ssh $SSH_OPTS "$SSH_TARGET" "echo OK" >/dev/null 2>&1; then
  echo "[redeploy] SSH connection failed. Check your connection and try again."
  exit 1
fi
echo "[redeploy] SSH connection OK"

step "Gathering API keys (leave blank to skip)"
read -r -s -p "OpenAI API key: " OPENAI_KEY; echo
read -r -s -p "Anthropic API key: " ANTHROPIC_KEY; echo
read -r -s -p "Google AI API key: " GOOGLE_KEY; echo
read -r -s -p "DeepSeek API key: " DEEPSEEK_KEY; echo

step "Step 1: Cleaning up Docker containers on remote server"
ssh $SSH_OPTS "$SSH_TARGET" <<'EOF'
  cd /opt/regno
  echo "[redeploy] stopping docker compose..."
  docker compose down --remove-orphans 2>/dev/null || true
  
  echo "[redeploy] removing port-holding containers..."
  for port in 27017 6333 6334 7474 7687 6379 3000 3002; do
    ids=$(docker ps -q --filter "publish=$port" 2>/dev/null || true)
    [ -n "$ids" ] && docker rm -f $ids 2>/dev/null || true
  done
  
  echo "[redeploy] restarting docker daemon..."
  systemctl restart docker 2>/dev/null || service docker restart 2>/dev/null || true
  sleep 3
  echo "[redeploy] cleanup complete"
EOF

step "Step 2: Re-running deploy.sh with API keys"
ssh $SSH_OPTS "$SSH_TARGET" "cd /opt/regno && OPENAI_API_KEY='$OPENAI_KEY' ANTHROPIC_API_KEY='$ANTHROPIC_KEY' GOOGLE_AI_API_KEY='$GOOGLE_KEY' DEEPSEEK_API_KEY='$DEEPSEEK_KEY' bash deploy.sh"

step "Step 3: Deployment complete!"
echo "[redeploy] your application is now running."
echo "[redeploy] check the logs: ssh $SSH_TARGET 'docker compose logs -f'"
