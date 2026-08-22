#!/usr/bin/env bash
# Deploy kenji-government to VPS — run from local machine with SSH access.
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@152.239.119.54}"
MAIN_DOMAIN="${MAIN_DOMAIN:-srv1781529.hstgr.cloud}"
DEPLOY_PATH="/var/www/kenji-government"
REPO="https://github.com/HostylerWeb/kenji-government.git"

echo "=== GRA VPS deploy (${MAIN_DOMAIN}) ==="

ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "$VPS_HOST" env MAIN_DOMAIN="$MAIN_DOMAIN" DEPLOY_PATH="$DEPLOY_PATH" REPO="$REPO" bash -s <<'REMOTE'
set -euo pipefail

OLD_PATH="/var/www/government"
API_URL="https://${MAIN_DOMAIN}/api"

write_web_env() {
  bash scripts/write-production-web-env.sh
}

verify_web_build() {
  bash scripts/verify-production-web-build.sh
}

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
  apt-get update && apt-get install -y docker.io docker-compose git
  systemctl enable --now docker
fi

docker-compose up -d postgres redis minio 2>/dev/null || docker compose up -d postgres redis minio
sleep 8

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Only generate secrets on first bootstrap (do not rotate every deploy).
if ! grep -q '^JWT_SECRET=change-me' .env && ! grep -q '^JWT_SECRET=""' .env; then
  : # keep existing secrets
else
  JWT_SECRET="$(openssl rand -hex 32)"
  JWT_REFRESH="$(openssl rand -hex 32)"
  INGEST_KEY="$(openssl rand -hex 32)"
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"${JWT_SECRET}\"|" .env
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"${JWT_REFRESH}\"|" .env
  sed -i "s|INGEST_ENCRYPTION_KEY=.*|INGEST_ENCRYPTION_KEY=\"${INGEST_KEY}\"|" .env
fi

sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://kenji_government:kenji_government@localhost:5436/kenji_government?schema=public\"|" .env
sed -i "s|REDIS_URL=.*|REDIS_URL=\"redis://localhost:6382\"|" .env

grep -q '^AUTH_EMAIL_OTP_DISABLED=' .env || echo 'AUTH_EMAIL_OTP_DISABLED=true' >> .env
grep -q '^AUTH_MFA_DISABLED=' .env || echo 'AUTH_MFA_DISABLED=true' >> .env
sed -i 's|^AUTH_EMAIL_OTP_DISABLED=.*|AUTH_EMAIL_OTP_DISABLED=true|' .env
sed -i 's|^AUTH_MFA_DISABLED=.*|AUTH_MFA_DISABLED=true|' .env
grep -q '^GOVERNMENT_TAX_RATE=' .env || echo 'GOVERNMENT_TAX_RATE=0.3' >> .env
sed -i 's|^GOVERNMENT_TAX_RATE=.*|GOVERNMENT_TAX_RATE=0.3|' .env
sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=\"${API_URL}\"|" .env

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

chmod +x scripts/write-production-web-env.sh scripts/verify-production-web-build.sh

# Production web env MUST exist before any Next.js build.
write_web_env

npm ci
npm run db:generate
npm run migrate:deploy -w @kenji-government/database
npm run db:seed

# Build without sourcing root .env into the shell (prevents localhost overrides).
npm run build -w @kenji-government/database
npm run build -w @kenji-government/shared
npm run build -w @kenji-government/api
npm run build -w @kenji-government/worker
npm run build -w @kenji-government/web

verify_web_build

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
  a2enmod proxy proxy_http ssl headers rewrite 2>/dev/null || true
  a2dissite byanydream.conf byanydream-le-ssl.conf compliance.conf compliance-le-ssl.conf 000-default.conf 2>/dev/null || true
  a2ensite gra-console.conf
  systemctl reload apache2
fi

echo "Deploy complete."
REMOTE

echo "Done. Test: https://${MAIN_DOMAIN}/login"
