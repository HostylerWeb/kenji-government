# GRA portal — VPS deployment

Deploy path: `/var/www/kenji-government`  
Staff URL: `https://console.force42.com`  
Ingest URL: `https://ingest.force42.com`  
Domain map: `vps-domain-structure.txt` · SSH: `ssh.txt`

## Prerequisites

- Ubuntu 22/24, Node 22, Docker (Postgres/Redis/MinIO), Apache 2.4
- Cloudflare origin cert at `/etc/ssl/cloudflare/force42.pem`
- See `docs/PROJECT_PLAN.md` §3 for package list

## 1. Bootstrap server (once)

```bash
# On VPS as root — review before running
bash scripts/vps-bootstrap.sh
```

Creates DB user `kenji_government`, installs Node 22, PM2 (optional).

## 2. Clone and configure

```bash
cd /var/www
git clone git@github.com:HostylerWeb/kenji-government.git kenji-government
cd kenji-government
cp .env.example .env
# Edit: DATABASE_URL, REDIS_URL, JWT secrets, GOVERNMENT_TAX_RATE, NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
CONSOLE_DOMAIN=console.force42.com bash scripts/write-production-web-env.sh
npm ci
npm run build
npm run db:migrate
npm run db:seed   # optional for demo data
```

**Important:** `apps/web/.env.local` is generated on the server by `scripts/write-production-web-env.sh`. Do not copy your local dev `.env.local` to production — it will bake `localhost:4000` into the client bundle.

## 2b. Deploy from local machine

```bash
cd /var/www/kenji-government

# Git-based full deploy (recommended)
SSHPASS='...' sshpass -e bash scripts/vps-deploy.sh

# Or sync workspace without overwriting server env files
SSHPASS='...' sshpass -e bash scripts/vps-rsync-deploy.sh
```

Override domains if needed: `CONSOLE_DOMAIN=console.force42.com INGEST_DOMAIN=ingest.force42.com`

## 3. Start with PM2

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

Ports: web `3000`, staff API `4000`, ingest `4001`.

## 4. Apache

Templates in `deploy/apache/` are copied by `scripts/vps-deploy.sh`:

- `console.conf.template` → `/etc/apache2/sites-available/gra-force42-console.conf`
- `ingest.conf.template` → `/etc/apache2/sites-available/gra-force42-ingest.conf`

Legacy Nginx templates remain in `deploy/nginx/` for reference only.

## 5. Smoke test

```bash
./scripts/production-smoke.sh https://console.force42.com https://console.force42.com/api
```

## 6. Operator production ingest (Phase 9.1)

1. Ingest is live at `https://ingest.force42.com`.
2. Give each operator site API key + HMAC from GRA admin DB.
3. Operator copies `integrations/operator/GraIngestService.php` — see `integrations/operator/README.md`.

## Local Docker (data layer only)

```bash
docker compose up -d
```

App processes run via PM2 or `npm run dev:*` locally.
