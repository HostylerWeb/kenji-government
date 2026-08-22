# GRA portal — VPS deployment

Deploy path: `/var/www/kenji-government`  
Staff URL: `https://srv1781529.hstgr.cloud` (main domain)  
Ingest URL: `https://ingest.srv1781529.hstgr.cloud` (planned subdomain)

## Prerequisites

- Ubuntu 22/24, Node 22, PostgreSQL 16, Redis, Nginx
- See `docs/PROJECT_PLAN.md` §3 for package list

## 1. Bootstrap server (once)

```bash
# On VPS as root — review before running
bash scripts/vps-bootstrap.sh
```

Creates DB user `kenji_government`, installs Node 22, Nginx, PM2 (optional).

## 2. Clone and configure

```bash
cd /var/www
git clone git@github.com:HostylerWeb/kenji-government.git kenji-government
cd kenji-government
cp .env.example .env
# Edit: DATABASE_URL, REDIS_URL, JWT secrets, GOVERNMENT_TAX_RATE, NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
bash scripts/write-production-web-env.sh   # writes apps/web/.env.local (never localhost)
npm ci
npm run build
npm run db:migrate
npm run db:seed   # optional for demo data
```

**Important:** `apps/web/.env.local` is generated on the server by `scripts/write-production-web-env.sh`. Do not copy your local dev `.env.local` to production — it will bake `localhost:4000` into the client bundle.

## 2b. Deploy from local machine

```bash
# Git-based full deploy (recommended)
bash scripts/vps-deploy.sh

# Or sync workspace without overwriting server env files
bash scripts/vps-rsync-deploy.sh
```

## 3. Start with PM2

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

Ports: web `3000`, staff API `4000`, ingest `4001`.

## 4. Nginx

Copy templates from `deploy/nginx/` and enable SSL (certbot):

- `console.conf.template` → staff console + `/api` proxy
- `ingest.conf.template` → operator ingest API only

## 5. Smoke test

```bash
./scripts/production-smoke.sh https://srv1781529.hstgr.cloud
```

## 6. Operator production ingest (Phase 9.1)

1. Ensure ingest subdomain points to port 4001 (Nginx).
2. Give each operator site API key + HMAC from GRA admin DB.
3. Operator copies `integrations/operator/GraIngestService.php` — see `integrations/operator/README.md`.

## Local Docker (data layer only)

```bash
docker compose up -d
```

App processes run via PM2 or `npm run dev:*` locally.
