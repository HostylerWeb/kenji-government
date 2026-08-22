#!/usr/bin/env bash
# Sync local workspace to VPS (excludes dev env files) then rebuild on server.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@152.239.119.54}"
MAIN_DOMAIN="${MAIN_DOMAIN:-srv1781529.hstgr.cloud}"
DEPLOY_PATH="/var/www/kenji-government"

echo "=== GRA VPS rsync deploy (${MAIN_DOMAIN}) ==="

rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude apps/web/.next \
  --exclude .git \
  --exclude '.env' \
  --exclude 'apps/web/.env.local' \
  --exclude 'apps/web/.env' \
  /var/www/kenji-government/ "${VPS_HOST}:${DEPLOY_PATH}/"

ssh -o StrictHostKeyChecking=no "$VPS_HOST" env MAIN_DOMAIN="$MAIN_DOMAIN" DEPLOY_PATH="$DEPLOY_PATH" bash -s <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_PATH"
chmod +x scripts/write-production-web-env.sh scripts/verify-production-web-build.sh
bash scripts/write-production-web-env.sh
npm run build -w @kenji-government/web
bash scripts/verify-production-web-build.sh
pm2 restart gra-web
REMOTE

echo "Done. Test: https://${MAIN_DOMAIN}/login"
