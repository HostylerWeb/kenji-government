#!/usr/bin/env bash
# VPS bootstrap — run on fresh Ubuntu as root. Review before executing.
set -euo pipefail

echo "=== GRA VPS bootstrap ==="

apt update && apt upgrade -y
apt install -y curl git build-essential ufw fail2ban nginx redis-server postgresql postgresql-contrib

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi

npm install -g pm2

DB_PASS="${KENJI_DB_PASSWORD:-$(openssl rand -hex 16)}"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='kenji_government'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER kenji_government WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='kenji_government'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE kenji_government OWNER kenji_government;"

echo "Database password (save in .env): ${DB_PASS}"
echo "Bootstrap complete. Clone repo to /var/www/kenji-government and follow docs/DEPLOY.md"
