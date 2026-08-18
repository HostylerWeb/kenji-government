# GRA portal — VPS deployment

Deploy path: `/var/www/kenji-government`  
Staff URL: `https://compliance.srv1781529.hstgr.cloud` (or custom domain)  
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
# Edit: DATABASE_URL, REDIS_URL, JWT secrets, NEXT_PUBLIC_API_URL=https://your-domain/api
npm ci
npm run build
npm run db:migrate
npm run db:seed   # optional for demo data
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
./scripts/production-smoke.sh https://compliance.srv1781529.hstgr.cloud
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
