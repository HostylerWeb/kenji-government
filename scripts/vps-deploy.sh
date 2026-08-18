#!/usr/bin/env bash
# Deploy kenji-government to VPS — run from local machine with SSH access.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@152.239.119.54}"
DEPLOY_PATH="/var/www/kenji-government"
OLD_PATH="/var/www/government"
REPO="https://github.com/HostylerWeb/kenji-government.git"

echo "=== GRA VPS deploy ==="

ssh -o StrictHostKeyChecking=no "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail

OLD_PATH="/var/www/government"
DEPLOY_PATH="/var/www/kenji-government"
REPO="https://github.com/HostylerWeb/kenji-government.git"

# Remove legacy static POC site
if [ -d "$OLD_PATH" ]; then
  echo "Removing legacy $OLD_PATH ..."
  rm -rf "$OLD_PATH"
fi

# Clone or pull
if [ ! -d "$DEPLOY_PATH/.git" ]; then
  mkdir -p /var/www
  git clone "$REPO" "$DEPLOY_PATH"
else
  cd "$DEPLOY_PATH"
  git fetch origin
  git checkout main
  git pull origin main
fi

cd "$DEPLOY_PATH"

# Bootstrap postgres/redis if missing
if ! command -v docker >/dev/null; then
  apt-get update && apt-get install -y docker.io docker-compose-plugin git
fi

cd "$DEPLOY_PATH"
docker compose up -d postgres redis minio

if [ ! -f .env ]; then
  cp .env.example .env
  JWT_SECRET="$(openssl rand -hex 32)"
  JWT_REFRESH="$(openssl rand -hex 32)"
  INGEST_KEY="$(openssl rand -hex 32)"
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://kenji_government:kenji_government@localhost:5436/kenji_government?schema=public\"|" .env
  sed -i "s|REDIS_URL=.*|REDIS_URL=\"redis://localhost:6382\"|" .env
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"${JWT_SECRET}\"|" .env
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"${JWT_REFRESH}\"|" .env
  sed -i "s|INGEST_ENCRYPTION_KEY=.*|INGEST_ENCRYPTION_KEY=\"${INGEST_KEY}\"|" .env
  echo "Created .env with docker-compose ports (5436/6382)"
fi

npm ci
npm run build
npm run db:migrate
npm run db:seed

# Web env
mkdir -p apps/web
echo "NEXT_PUBLIC_API_URL=https://compliance.srv1781529.hstgr.cloud/api" > apps/web/.env.local
echo "NEXT_PUBLIC_SESSION_IDLE_MS=1800000" >> apps/web/.env.local

# PM2
if ! command -v pm2 >/dev/null; then
  npm install -g pm2
fi

pm2 delete gra-api gra-ingest gra-worker gra-web 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

# Apache proxy config
if [ -f deploy/apache/console.conf.template ]; then
  cp deploy/apache/console.conf.template /etc/apache2/sites-available/gra-console.conf
  a2enmod proxy proxy_http ssl headers 2>/dev/null || true
  a2dissite compliance.conf compliance-le-ssl.conf 000-default.conf 2>/dev/null || true
  a2ensite gra-console.conf
  systemctl reload apache2
fi

echo "Deploy complete."
REMOTE

echo "Done. Test: https://compliance.srv1781529.hstgr.cloud/login"
