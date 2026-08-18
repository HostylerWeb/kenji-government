# Kenji Government (GRA Oversight Console) — Run Instructions

Local development guide for the monorepo: staff web app, staff API, operator ingest API, background worker, and infrastructure services.

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **npm** (workspaces monorepo)
- **Docker** + Docker Compose (Postgres, Redis, MinIO)
- **PHP** (optional — only for `examples/byanydream-monthly-return.php`)

Project path: `/var/www/kenji-government`

## Architecture (local)

| Service | Port | Purpose |
|---------|------|---------|
| **Web** (Next.js) | 3000 | GRA staff console UI |
| **Staff API** (NestJS) | 4000 | Login, operators, submissions, compliance, etc. |
| **Ingest API** (NestJS) | 4001 | Operator monthly returns / documents (Phase 3) |
| **Worker** (BullMQ) | — | Processes ingest queue → submissions |
| **Postgres** | 5436 | Main database (`kenji_government`) |
| **Redis** | 6382 | Queues + rate limiting |
| **MinIO** | 9000 / 9001 | Document storage (API / console) |

Ports **5436** and **6382** are used instead of defaults **5432** and **6379** to avoid conflicts with other projects on the same machine.

---

## First-time setup

### 1. Clone / open the repo

```bash
cd /var/www/kenji-government
```

### 2. Environment file

Copy the example env to the repo root (if you do not already have `.env`):

```bash
cp .env.example .env
```

Key variables (defaults are fine for local dev):

- `DATABASE_URL` → Postgres on `localhost:5436`
- `REDIS_URL` → `redis://localhost:6382`
- `MINIO_ENDPOINT=localhost`, `MINIO_PORT=9000`
- `API_PORT=4000`, `INGEST_PORT=4001`
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

The web app reads API URL from `apps/web/.env.local` (should match `NEXT_PUBLIC_API_URL`).

### 3. Install dependencies

```bash
npm install
```

### 4. Start infrastructure (Docker)

```bash
docker compose up -d
```

Verify containers are healthy:

```bash
docker compose ps
```

Expected: `kenji-government-postgres`, `kenji-government-redis`, `kenji-government-minio`.

### 5. Database setup

```bash
npm run db:generate    # Prisma client
npm run db:migrate     # Apply migrations
npm run db:seed        # Demo operators, staff users, sandbox API keys
```

**MinIO bucket:** On first document upload, the API uses bucket `kenji-government`. Create it in the MinIO console (`http://localhost:9001`, login `minioadmin` / `minioadmin`) if uploads fail with bucket errors.

---

## Running the application (daily dev)

You need **Docker** running plus **four Node processes** for full stack (web + staff API + ingest + worker).

### Option A — Separate terminals (recommended)

**Terminal 1 — Infrastructure** (if not already up):

```bash
cd /var/www/kenji-government
docker compose up -d
```

**Terminal 2 — Staff API:**

```bash
cd /var/www/kenji-government
npm run dev:api
```

**Terminal 3 — Ingest API** (operator integrations / Phase 3):

```bash
cd /var/www/kenji-government
npm run dev:ingest
```

**Terminal 4 — Worker** (required for ingest monthly returns to appear in submissions):

```bash
cd /var/www/kenji-government
npm run dev:worker
```

**Terminal 5 — Web frontend:**

```bash
cd /var/www/kenji-government
npm run dev:web
```

### Option B — All workspaces that define `dev`

```bash
npm run dev
```

This starts every workspace `dev` script that exists (api, web, worker). **Ingest API is separate** — still run `npm run dev:ingest` in another terminal.

---

## URLs

| What | URL |
|------|-----|
| **Staff console** | http://localhost:3000 |
| **Login** | http://localhost:3000/login |
| **Staff API** | http://localhost:4000 |
| **Staff API Swagger** | http://localhost:4000/docs |
| **Ingest API** | http://localhost:4001/v1 |
| **Ingest Swagger** | http://localhost:4001/docs |
| **MinIO console** | http://localhost:9001 |
| **Prisma Studio** | `npm run db:studio` → http://localhost:5555 |

### Staff login (seed data)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gra.go.ke` | `GraAdmin123!` |
| Supervisor | `supervisor@gra.go.ke` | `GraAdmin123!` |
| Analyst | `analyst@gra.go.ke` | `GraAdmin123!` |
| Auditor | `auditor@gra.go.ke` | `GraAdmin123!` |

### Operator ingest sandbox (seed, `op-001`)

| Field | Value |
|-------|-------|
| API Key | `gra_sandbox_op001_devkey0001` |
| HMAC Secret | `sandbox_hmac_op001_secret_32chars_min` |
| Test script | `php examples/byanydream-monthly-return.php` |

See `docs/API.md` and `docs/OPERATOR_INTEGRATION.md` for signing and endpoints.

---

## Useful npm scripts

Run from repo root:

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Next.js dev server (:3000) |
| `npm run dev:api` | Staff NestJS API (:4000) |
| `npm run dev:ingest` | Operator ingest API (:4001) |
| `npm run dev:worker` | BullMQ ingest processor |
| `npm run build` | Build all packages |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Shared package unit tests |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Reseed database |
| `npm run db:studio` | Prisma Studio UI |

---

## Health checks

```bash
# Staff API
curl http://localhost:4000/health

# Ingest API status (requires signed headers — see docs/API.md)
# Or use the PHP example for a full ingest test
php examples/byanydream-monthly-return.php
php examples/byanydream-ticket-event.php   # live dashboard demo
./scripts/demo-live-feed.sh 5              # stakeholder demo (5 tickets)
./scripts/e2e-live-feed-test.sh            # automated E2E pipeline check
```

### Live feed demo (Phase 4)

With `dev:api`, `dev:ingest`, and `dev:web` running, open the dashboard and run:

```bash
./scripts/demo-live-feed.sh 5
# or single ticket:
php examples/byanydream-ticket-event.php
```

Watch **Tickets Today**, **Revenue Today**, and the live activity ticker update at http://localhost:3000/dashboard.

Staff API live endpoints (JWT required):

- `GET /live/activity` — recent feed items
- `GET /live/counters` — tickets/revenue today (EAT)
- `GET /live/stream?access_token=<jwt>` — SSE stream for dashboard

Staff API health example response:

```json
{"status":"ok","service":"gra-staff-api","timestamp":"..."}
```

---

## Troubleshooting

### Port already in use (3000 / 4000 / 4001)

Find and free the port:

```bash
fuser -k 3000/tcp 4000/tcp 4001/tcp
```

Then restart the dev servers.

### Webpack / login or dashboard crash (`Internal Server Error`)

Often caused by a **stale or corrupted** `.next` cache — common after running `npm run build` while `dev:web` is still running, or after many hot-reloads during development.

```bash
fuser -k 3000/tcp 4000/tcp
rm -rf apps/web/.next
npm run build -w @kenji-government/api   # restores API dist if needed
npm run dev:api
npm run dev:web
```

Symptoms: plain text `Internal Server Error` on `/login` or `/dashboard`, or errors like `Cannot find module './728.js'` in the terminal.

Do **not** run `next build` while `dev:web` is running.

### Submissions not appearing after ingest POST

The **worker must be running** (`npm run dev:worker`). Ingest only queues events; the worker writes to `submissions`.

### Database connection errors

1. `docker compose ps` — Postgres should be healthy on **5436**
2. `.env` `DATABASE_URL` must use port **5436**, not 5432

### Redis / ingest errors

1. Redis container on **6382**
2. `REDIS_URL=redis://localhost:6382` in `.env`

### Document upload failures

1. MinIO running (`docker compose up -d`)
2. `MINIO_ENDPOINT=localhost` in `.env`
3. Bucket `kenji-government` exists in MinIO console

### After schema changes

```bash
npm run db:generate
npm run db:migrate
npm run build -w @kenji-government/shared   # if shared types changed
```

---

## Production / VPS (not automated yet)

Phase 1 VPS deploy (Nginx, PM2, HTTPS) is documented in `docs/PROJECT_PLAN.md` (items 1.26–1.31). Local instructions above are for development only.

Planned production URLs:

- Staff console: `console.*`
- Operator ingest: `ingest.*`

---

## Related docs

- `docs/PROJECT_PLAN.md` — phases and feature roadmap
- `docs/UI_UX_PLAN.md` — UI conventions
- `docs/API.md` — operator ingest API spec
- `docs/OPERATOR_INTEGRATION.md` — operator onboarding
- `docs/postman/gra-ingest-api.json` — Postman collection
