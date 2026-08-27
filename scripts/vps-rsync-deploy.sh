#!/usr/bin/env bash
# Sync local workspace to VPS (excludes dev env files) then rebuild on server.
# Usage: SSHPASS='...' sshpass -e bash scripts/vps-rsync-deploy.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@152.239.119.54}"
CONSOLE_DOMAIN="${CONSOLE_DOMAIN:-console.force42.com}"
INGEST_DOMAIN="${INGEST_DOMAIN:-ingest.force42.com}"
DEPLOY_PATH="/var/www/kenji-government"

run_ssh() {
  if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -e ssh -o StrictHostKeyChecking=no "$@"
  else
    ssh -o StrictHostKeyChecking=no "$@"
  fi
}

run_rsync() {
  local ssh_opts="-o StrictHostKeyChecking=no"
  if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
    rsync -az "$@" -e "sshpass -e ssh ${ssh_opts}"
  else
    rsync -az "$@" -e "ssh ${ssh_opts}"
  fi
}

echo "=== GRA VPS rsync deploy (console=${CONSOLE_DOMAIN}) ==="

run_rsync --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude apps/web/.next \
  --exclude .git \
  --exclude '.env' \
  --exclude 'apps/web/.env.local' \
  --exclude 'apps/web/.env' \
  /var/www/kenji-government/ "${VPS_HOST}:${DEPLOY_PATH}/"

run_ssh "$VPS_HOST" env CONSOLE_DOMAIN="$CONSOLE_DOMAIN" DEPLOY_PATH="$DEPLOY_PATH" bash -s <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_PATH"
chmod +x scripts/write-production-web-env.sh scripts/verify-production-web-build.sh
CONSOLE_DOMAIN="$CONSOLE_DOMAIN" bash scripts/write-production-web-env.sh
npm run build -w @kenji-government/web
CONSOLE_DOMAIN="$CONSOLE_DOMAIN" bash scripts/verify-production-web-build.sh
pm2 restart gra-web --update-env
REMOTE

echo "Done. Test: https://${CONSOLE_DOMAIN}/login"
