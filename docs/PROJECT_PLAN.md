# Kenji Government — Project Plan

**GRA Kenya Raffle & Competition Oversight Platform**

Last updated: August 2026

---

## 1. What This Project Is

A **government supervisory portal** for the **Gambling Regulatory Authority (GRA)** — Kenya’s new division overseeing raffle and competition operators (formerly referenced as BCLB in the UI prototype; **all branding must use GRA**). Authorised staff use it to monitor raffle/competition websites similar to how `/var/www/compgo` manages competitions — but this is the **government side**: oversight, compliance, tax, enforcement, and real-time visibility across **all** operator platforms.

The portal ingests data from **every licensed operator dashboard** (first pilot on the VPS at `/var/www/byanydream`). Operators push commercial, player-safety, and payment events; the government console reflects changes in **real time** (e.g. a ticket purchased on an operator site appears on the GRA dashboard immediately).

### Core goals

| Goal | Description |
|------|-------------|
| Operator registry | Register and profile legal entities running raffle/competition websites |
| Commercial monitoring | Tickets sold, revenue, prizes, expenses, GGR, net positions — **live and aggregated** |
| Tax & levy compliance | Filings, assessments, payments, arrears — plus **real-time tax earmarking** via payment gateway |
| Enforcement | Notices, warnings, suspensions, licence actions — with audit trail |
| Player safety & policy data | Anonymised regional analytics: play-safe usage, peak play times, spend patterns — for policy and licensed data partnerships |
| Payment gateway oversight | Monitor payments, tax earmarking, AML via **separate payment gateway project** + GRA ingest |
| Reports hub | Stakeholder-facing report library — quick access to standard and custom exports |
| Auditability | Who did what, when; exports for inspections, UN, charities, data brokers (anonymised datasets) |
| Multi-site ingest | Tens of operator websites push events to this portal via API + real-time streams |

### Current state

| Item | Status |
|------|--------|
| UI | Live Next.js staff console at `https://console.force42.com` (evolved from `/out/` prototype) |
| Stakeholder review | Positive — UI/concept approved; tweaks listed in §2 |
| Backend | **Built and deployed** — NestJS staff API (:4000) + ingest API (:4001) |
| Database | PostgreSQL 16 (Docker on VPS `:5436`; local Compose) |
| Operator ingest API | **Live** at `https://ingest.force42.com` |
| Operator real-time ingest link | Built (pilot + Kenji-raffle worker relay) |
| Payment gateway (separate repo) | Not deployed on VPS yet — see `docs/PAYMENT_GATEWAY_PROJECT.md` |
| Production VPS | `https://console.force42.com` (staff), `https://ingest.force42.com` (ingest) |

The `out/` folder is a **historical design reference** from the original static prototype. Production runs the full monorepo under `/var/www/kenji-government`.

---

## 2. Stakeholder feedback (GRA review — must implement)

Stakeholders love the overall UI and concept. Required changes and additions:

### 2.1 Branding — BCLB → GRA

| Item | Action |
|------|--------|
| All UI text | Replace **BCLB** with **GRA** (Gambling Regulatory Authority) |
| Logos, favicon, OG images | New GRA assets |
| Meta titles | e.g. `GRA Kenya - Raffle Oversight Console` |
| Licence number format | Update prefix from `BCLB/RAF/...` to `GRA/RAF/...` (confirm exact format with GRA) |
| Email copy, exports, PDF headers | GRA branding throughout |

### 2.2 Reports section (new module)

A dedicated **Reports** area so stakeholders can see at a glance:

- Pre-built reports (GGR by operator, tax collected, compliance status, regional summary)
- Scheduled reports (daily / weekly / monthly email to stakeholders)
- Role-based access (some reports only for supervisors / external partners)
- Export formats: CSV, PDF, Excel
- Report catalogue with descriptions and last-generated timestamp

### 2.3 Expanded regional analysis (player safety & policy data)

Regional view must go beyond GGR and operator counts. Feed from **all operator datasets** (anonymised):

| Data type | Example use |
|-----------|-------------|
| Play Safe button usage | How many players used self-exclusion / play-safe per county |
| Peak play times | Hour-of-day / day-of-week heatmaps by region |
| Session patterns | Average session length, frequency (aggregated) |
| Spend bands | Distribution of stake sizes (anonymised buckets) |
| Demographic aggregates | Age band / region (no PII) |
| Poverty-risk indicators | Correlations for policy (UN, charities, research) |

Purpose: **policy adjustment**, **player safety**, and **licensed export** of anonymised datasets to data brokers, UN, charities — **real-time** aggregated feeds where possible.

Technical: operators emit `player_safety_event` and `session_aggregate` ingest events; government DB stores only anonymised aggregates.

### 2.4 Real-time integration with operator dashboards (pilot first, multi-operator)

| Requirement | Detail |
|-------------|--------|
| Source | Licensed operator platforms (pilot: PHP raffle app on VPS) |
| Behaviour | Ticket purchase, payment, refund, operator config change → **immediate** on GRA dashboard |
| Demo value | Show operators and GRA that both systems are interlinked live |
| Transport | Webhook + optional Redis pub/sub or SSE to staff console |
| Scope | Extend to all operators using the same ingest contract |

Events to stream in real time:

- `ticket.purchased`, `ticket.voided`
- `payment.completed`, `payment.failed`
- `operator.updated` (licence, status)
- `submission.submitted`
- `play_safe.activated`

### 2.5 Real-time tax earmarking

When a punter pays e.g. **100 KSH** and tax is **30 KSH** (30%):

1. Payment splits at gateway: **70 KSH** operator, **30 KSH** tax sub-account
2. Tax sits in **earmarked sub-account** (payment gateway ledger)
3. By **23:59** same day, GRA can **withdraw** accumulated tax to chosen government account
4. GRA dashboard shows: earmarked today, withdrawn today, pending balance

### 2.6 Government payment gateway (separate project)

GRA wants a **government-aligned payment gateway** (similar to ZapPay for Zap) — a **standalone NestJS service** (not part of this repo) that raffle operators use to charge tickets. **This console** provides oversight: AML, KYC visibility, tax earmarking records, EOD withdrawal tracking, CBK exports.

| Goal | Detail |
|------|--------|
| Payment processing | **Separate gateway project** — charge, split, escrow, treasury withdrawal |
| Operator ticket payments | Route through gateway service; gateway notifies GRA ingest |
| GRA visibility | Real-time AML, KYC, transaction monitoring (this project) |
| GRA tax slice | Gateway event → GRA records earmarked tax; EOD withdrawal in GRA UI |
| GRA role | **Insight and oversight** — does not run the card processor |

**Three platforms (do not merge in code):**

| Platform | Connects to | Role |
|----------|-------------|------|
| Raffle operator websites | Payment gateway | Sell tickets; charge customers via gateway |
| Payment gateway (**separate repo**, e.g. `kenji-harambe-pay`) | Raffle sites + GRA ingest | Process payments, split tax, hold escrow, notify GRA |
| **kenji-government** (this repo) | Gateway notifications only | Staff console — ingest, AML, tax records, reports |

```
Raffle sites  →  Payment gateway  →  GRA ingest (/v1/gateway/notify)  →  GRA web console
```

Full integration spec: `docs/PAYMENT_GATEWAY_PROJECT.md`

**Local dev (no gateway repo yet):** external simulator — `tools/gateway-simulator/simulate-charge.sh` (not a charge API on GRA ingest). See `docs/MOCK_GATEWAY.md`.

**New dashboard module: Payment Gateway**

- Live transaction volume, success rate, failures
- Tax earmarked vs withdrawn (daily)
- AML / KYC flags and case queue
- Per-operator payment volume
- Sub-account balances
- CBK-oriented compliance exports

### 2.7 Summary — stakeholder priority order

1. GRA branding (quick win)
2. Core functionality (registry, submissions, compliance) — UI already approved
3. Reports section
4. Real-time operator ingest link (demo-critical)
5. Expanded regional / player safety analytics
6. Payment gateway **oversight module** (this repo) + **separate gateway project** for processing


## 2. Technology Stack

### Frontend (staff console)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router) | Matches existing UI prototype; SSR + API routes for staff app |
| Language | **TypeScript** | Type safety across frontend and shared contracts |
| UI | **React 19** + **Tailwind CSS** + **shadcn/ui** | Already used in prototype; fast, consistent government UI |
| Charts / maps | **Recharts** + **Leaflet** | GGR trends, regional map on dashboard |
| Forms | **React Hook Form** + **Zod** | Validation aligned with backend schemas |

### Backend

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Node.js 22** | Same language as frontend; strong async I/O for ingest |
| Framework | **NestJS** on **Fastify** | Structured modules, guards, queues; production-grade |
| ORM | **Prisma** | Migrations, type-safe queries, PostgreSQL-first |
| Validation | **Zod** (shared package) | Same schemas frontend ↔ backend |
| Auth (staff) | **JWT** + refresh tokens, or session cookies | Role-based access for government users |
| Auth (operators) | Per-site **API key** + **HMAC signature** + optional IP allowlist | Many untrusted external senders |

### Two HTTP surfaces (same codebase, different hosts)

```
Staff API + Console     →  Local: http://localhost:3000 (+ staff API :4000)
                            Production: https://console.force42.com (+ /api → :4000)
Operator Ingest API     →  Local: http://localhost:4001
                            Production: https://ingest.force42.com
```

Never mix operator ingest traffic with the privileged staff application process.

### Data layer

| Layer | Choice | Why |
|-------|--------|-----|
| Primary database | **PostgreSQL 16** | Relational integrity for money, licences, audit logs |
| Queue / cache | **Redis 7** + **BullMQ** | Async ingest, retries, per-operator rate limits |
| File storage | **S3-compatible** (MinIO locally, S3 on VPS) | Invoices, certificates, audit reports |
| Raw payload archive | **JSONB** columns in Postgres | Store original operator payloads for dispute/replay |

### Infrastructure

| Layer | Choice | Why |
|-------|--------|-----|
| Reverse proxy | **Apache 2.4** on VPS (Cloudflare origin cert); **Nginx** templates in `deploy/nginx/` are reference only | TLS termination, separate ingest vs console routes |
| Process manager | **PM2** or **Docker Compose** | Run API, worker, Next.js |
| CI/CD | **GitHub Actions** | Build, test, deploy to VPS |
| Local dev | **Docker Compose** | Postgres, Redis, MinIO, all services |

### What we are NOT using

- **Nuxt / Vue** — UI is already React/Next.js
- **MongoDB** — money and compliance need relational integrity
- **Next.js as ingest backend** — security boundary separation
- **Kafka / microservices** — overkill for tens of operators; Postgres + queue is enough

---

## 3. VPS Setup

### Server details

See `ssh.txt` and `vps-domain-structure.txt` in the project root.

| Field | Value |
|-------|-------|
| Host | `152.239.119.54` |
| User | `root` |
| Project path | `/var/www/kenji-government` |
| Staff URL | `https://console.force42.com` |
| Ingest URL | `https://ingest.force42.com` |
| PM2 processes | `gra-api`, `gra-ingest`, `gra-worker`, `gra-web` |
| Deploy script | `SSHPASS='…' sshpass -e bash scripts/vps-deploy.sh` |

**Obsolete (do not use):** `/var/www/government`, `compliance.srv1781529.hstgr.cloud`, `compliance.conf`.

### Software on VPS (current)

- **Node.js 22** + **PM2** — API, ingest, worker, Next.js web
- **Docker Compose** — Postgres `:5436`, Redis `:6382`, MinIO `:9000-9001`
- **Apache 2.4** — reverse proxy to Node; SSL via Cloudflare origin cert at `/etc/ssl/cloudflare/force42.pem`

Full bootstrap steps: `docs/DEPLOY.md`.

### Apache virtual hosts (production)

Templates: `deploy/apache/console.conf.template`, `deploy/apache/ingest.conf.template`  
Installed as: `gra-force42-console.conf`, `gra-force42-ingest.conf`

```
console.force42.com  →  :3000 (web), /api → :4000 (staff API)
ingest.force42.com   →  :4001 (ingest API only)
```

Legacy Nginx examples (reference only):

```nginx
# Staff console
server {
    listen 443 ssl;
    server_name console.force42.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
    }
}

# Operator ingest
server {
    listen 443 ssl;
    server_name ingest.force42.com;
    location / {
        proxy_pass http://127.0.0.1:4001;
    }
}
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 'Apache Full'
ufw enable
```

### SSL

Production uses **Cloudflare** (proxied, Full strict) with an **origin certificate** on the VPS. Do not use Let's Encrypt for `force42.com` on the origin when Cloudflare terminates public TLS.

### Local development

| Item | Value |
|------|-------|
| Workspace | `/var/www/kenji-government` |
| Staff web | `http://localhost:3000` |
| Staff API | `http://localhost:4000` |
| Ingest API | `http://localhost:4001` |
| Docker Compose | Postgres `:5436`, Redis `:6382`, MinIO `:9000-9001` |

---

## 4. Repository Structure (planned)

```
kenji-government/
├── apps/
│   ├── web/                 # Next.js staff console
│   ├── api/                 # NestJS — staff API + ingest API modules
│   └── worker/              # BullMQ job processors (optional separate process)
├── packages/
│   ├── database/            # Prisma schema + migrations
│   ├── shared/              # Zod schemas, types, constants
│   └── ui/                  # Shared React components (optional)
├── docker/
│   └── docker-compose.yml   # Local + production stack
├── docs/
│   ├── PROJECT_PLAN.md      # This file
│   └── API.md               # Operator ingest API spec (to write)
├── out/                     # Legacy static prototype (reference only)
├── ssh.txt
└── README.md
```

---

## 5. Database Structure

All table and column names: **lowercase with underscores**. Enum values: **lowercase** (e.g. `active`, `suspended`, `compliant`).

### 5.1 Identity & access

#### `users`
Government staff accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | varchar unique | |
| password_hash | varchar | bcrypt |
| full_name | varchar | |
| role | enum | `admin`, `supervisor`, `analyst`, `auditor` |
| is_active | boolean | |
| last_login_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `audit_logs`
Append-only — never update or delete.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | nullable (system actions) |
| action | varchar | e.g. `operator.suspend`, `submission.approve` |
| entity_type | varchar | e.g. `operator`, `submission` |
| entity_id | uuid | |
| metadata | jsonb | before/after snapshot |
| ip_address | varchar | |
| created_at | timestamptz | |

### 5.2 Operators & sites

#### `operators`
Legal entities (companies).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| external_id | varchar unique | e.g. `op-001` for display |
| legal_name | varchar | |
| trading_name | varchar | |
| registration_number | varchar | |
| beneficial_owner | varchar | |
| email | varchar | |
| phone | varchar | |
| county | varchar | |
| region | varchar | |
| status | enum | `active`, `suspended`, `revoked`, `pending` |
| compliance_status | enum | `compliant`, `at_risk`, `non_compliant` |
| risk_score | smallint | 0–100 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `operator_sites`
Websites / platforms belonging to an operator.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK → operators | |
| domain | varchar | e.g. `safarijackpot.co.ke` |
| site_name | varchar | |
| is_primary | boolean | |
| status | enum | `active`, `suspended` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `licences`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK → operators | |
| licence_number | varchar unique | e.g. `GRA/RAF/2024/001` |
| licence_type | enum | `raffle`, `competition`, `mixed` |
| issued_at | date | |
| expires_at | date | |
| status | enum | `active`, `expired`, `suspended`, `revoked` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `api_credentials`
Per-operator-site ingest keys.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_site_id | uuid FK → operator_sites | |
| api_key_hash | varchar | hashed |
| api_key_prefix | varchar | first 8 chars for identification |
| hmac_secret_hash | varchar | |
| allowed_ips | jsonb | optional IP allowlist |
| is_active | boolean | |
| last_used_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 5.3 Reporting & submissions

#### `reporting_periods`
Normalised month/quarter buckets.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| year | smallint | |
| month | smallint | 1–12 |
| label | varchar | e.g. `March 2026` |
| starts_at | date | |
| ends_at | date | |

#### `submissions`
Monthly returns from operators.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK → operators | |
| reporting_period_id | uuid FK → reporting_periods | |
| tickets_sold | bigint | |
| gross_revenue | decimal(18,2) | stakes / sales |
| prizes_paid | decimal(18,2) | |
| expenses | decimal(18,2) | |
| gross_gaming_revenue | decimal(18,2) | GGR |
| tax_due | decimal(18,2) | |
| tax_paid | decimal(18,2) | |
| tax_outstanding | decimal(18,2) | |
| status | enum | `pending`, `approved`, `rejected`, `revision_requested` |
| submitted_at | timestamptz | |
| reviewed_by | uuid FK → users | nullable |
| reviewed_at | timestamptz | |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `ingest_events`
Raw inbound payloads from operator sites (audit + replay).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_site_id | uuid FK → operator_sites | |
| event_type | varchar | e.g. `monthly_return`, `heartbeat`, `document` |
| idempotency_key | varchar unique | prevent duplicate processing |
| raw_payload | jsonb | original JSON |
| status | enum | `received`, `processing`, `processed`, `failed` |
| error_message | text | |
| processed_at | timestamptz | |
| created_at | timestamptz | |

### 5.4 Enforcement

#### `enforcement_cases`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK → operators | |
| case_number | varchar unique | |
| case_type | enum | `warning`, `fine`, `investigation`, `suspension` |
| title | varchar | |
| description | text | |
| status | enum | `open`, `resolved`, `escalated`, `closed` |
| opened_by | uuid FK → users | |
| resolved_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `enforcement_actions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| enforcement_case_id | uuid FK → enforcement_cases | |
| action_type | enum | `notice`, `warning`, `fine`, `suspension`, `revocation` |
| details | text | |
| fine_amount | decimal(18,2) | nullable |
| performed_by | uuid FK → users | |
| created_at | timestamptz | |

### 5.5 Documents

#### `documents`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK → operators | |
| document_type | enum | `trading_licence`, `registration`, `tax_certificate`, `audit_report`, `insurance`, `other` |
| title | varchar | |
| file_path | varchar | S3/MinIO key |
| file_size | bigint | |
| mime_type | varchar | |
| uploaded_by | uuid FK → users | nullable (operator upload via ingest) |
| uploaded_at | timestamptz | |
| created_at | timestamptz | |

### 5.6 Aggregates (optional, for dashboard speed)

#### `operator_monthly_snapshots`
Pre-computed GGR per operator per month for fast charts.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK → operators | |
| reporting_period_id | uuid FK → reporting_periods | |
| gross_gaming_revenue | decimal(18,2) | |
| tax_paid | decimal(18,2) | |
| tickets_sold | bigint | |
| updated_at | timestamptz | |

| updated_at | timestamptz | |

### 5.7 Player safety & regional aggregates (anonymised)

#### `player_safety_aggregates`
County/region rollups — no individual player IDs.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| reporting_period_id | uuid FK → reporting_periods | or daily bucket |
| county | varchar | |
| region | varchar | |
| play_safe_activations | bigint | Play Safe button uses |
| self_exclusion_requests | bigint | |
| session_count | bigint | anonymised sessions |
| avg_session_minutes | decimal | |
| peak_hour | smallint | 0–23 most common play hour |
| stake_band_distribution | jsonb | e.g. `{ "0-50": 1200, "51-100": 800 }` |
| age_band_distribution | jsonb | anonymised buckets only |
| updated_at | timestamptz | |

#### `player_safety_events` (raw ingest, anonymised at ingest)
Optional short-retention staging before aggregation.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_site_id | uuid FK | |
| event_type | enum | `play_safe`, `session_end`, `stake_placed` |
| county | varchar | derived, no user id |
| hour_of_day | smallint | |
| stake_amount_band | varchar | bucket not exact amount |
| occurred_at | timestamptz | |
| created_at | timestamptz | |

### 5.8 Payment gateway (Harambe Pay)

#### `payment_transactions`
Every ticket payment through Harambe Pay.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| external_transaction_id | varchar unique | gateway reference |
| operator_id | uuid FK → operators | |
| operator_site_id | uuid FK → operator_sites | |
| ticket_reference | varchar | nullable |
| gross_amount | decimal(18,2) | e.g. 100.00 KSH |
| operator_amount | decimal(18,2) | e.g. 70.00 |
| tax_amount | decimal(18,2) | e.g. 30.00 |
| tax_rate | decimal(5,4) | e.g. 0.3000 |
| currency | varchar | `KES` |
| status | enum | `pending`, `completed`, `failed`, `refunded` |
| kyc_status | enum | `verified`, `pending`, `flagged` |
| aml_risk_score | smallint | 0–100 |
| payer_fingerprint | varchar | hashed — no raw PII in GRA DB |
| county | varchar | nullable |
| completed_at | timestamptz | |
| created_at | timestamptz | |

#### `tax_escrow_entries`
Earmarked tax per transaction + daily settlement.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| payment_transaction_id | uuid FK → payment_transactions | |
| tax_amount | decimal(18,2) | |
| status | enum | `earmarked`, `withdrawn`, `reversed` |
| earmarked_at | timestamptz | |
| withdrawal_batch_id | uuid FK → tax_withdrawal_batches | nullable |
| created_at | timestamptz | |

#### `tax_withdrawal_batches`
End-of-day (23:59) withdrawals to government account.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_date | date | |
| total_amount | decimal(18,2) | |
| destination_account_ref | varchar | government bank / treasury ref |
| gateway_batch_id | varchar | Harambe Pay reference |
| status | enum | `pending`, `completed`, `failed` |
| initiated_by | uuid FK → users | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

#### `aml_alerts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| payment_transaction_id | uuid FK | nullable |
| operator_id | uuid FK | |
| alert_type | enum | `velocity`, `structuring`, `kyc_mismatch`, `other` |
| severity | enum | `low`, `medium`, `high` |
| details | jsonb | |
| status | enum | `open`, `reviewed`, `escalated`, `closed` |
| reviewed_by | uuid FK → users | |
| created_at | timestamptz | |

### 5.9 Reports catalogue

#### `report_definitions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| slug | varchar unique | e.g. `ggr_by_operator_monthly` |
| title | varchar | |
| description | text | |
| category | enum | `commercial`, `compliance`, `regional`, `payment`, `player_safety` |
| required_role | enum | min role to view |
| parameters_schema | jsonb | date range, operator filter, etc. |
| is_scheduled | boolean | |
| created_at | timestamptz | |

#### `report_runs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| report_definition_id | uuid FK | |
| requested_by | uuid FK → users | |
| parameters | jsonb | |
| file_path | varchar | S3 export path |
| status | enum | `queued`, `running`, `completed`, `failed` |
| completed_at | timestamptz | |
| created_at | timestamptz | |

### 5.10 Real-time events (live dashboard)

#### `live_activity_feed`
Recent events for dashboard ticker / real-time UI.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| operator_id | uuid FK | |
| event_type | varchar | `ticket.purchased`, etc. |
| summary | varchar | human-readable |
| amount | decimal(18,2) | nullable |
| metadata | jsonb | |
| occurred_at | timestamptz | |
| created_at | timestamptz | |

### Entity relationship summary (extended)

```
users ────────────── audit_logs
  │
  ├── reviews submissions
  ├── opens enforcement_cases
  └── initiates tax_withdrawal_batches

operators ──┬── operator_sites ── api_credentials
            ├── licences
            ├── submissions ── reporting_periods
            ├── enforcement_cases ── enforcement_actions
            ├── documents
            ├── operator_monthly_snapshots
            ├── payment_transactions ── tax_escrow_entries
            └── aml_alerts

operator_sites ── ingest_events
              ── player_safety_events

report_definitions ── report_runs

tax_withdrawal_batches ── tax_escrow_entries

player_safety_aggregates ── reporting_periods (by county)
```

---

## 6. Operator Ingest API (high level)

Operators **push** data; the portal does not scrape their sites.

### Authentication

```
X-Api-Key: <site-api-key>
X-Signature: HMAC-SHA256(body, hmac_secret)
X-Idempotency-Key: <unique-per-request>
```

### Endpoints (planned)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/returns/monthly` | Submit monthly financial return |
| POST | `/v1/documents` | Upload certificate / filing (multipart) |
| POST | `/v1/events/ticket` | Real-time ticket purchase / void |
| POST | `/v1/events/payment` | Real-time payment completed / failed |
| POST | `/v1/events/player-safety` | Play Safe, self-exclusion (anonymised) |
| POST | `/v1/events/session-aggregate` | Hourly session/stake band rollups |
| POST | `/v1/heartbeat` | Site alive + version ping |
| GET | `/v1/status` | Credential check |

### Operator platform integration (ingest contract)

| Step | Detail |
|------|--------|
| 1 | Map operator ticket/payment models to shared ingest schema |
| 2 | Webhook from operator on each ticket sale → ingest API |
| 3 | Redis pub/sub → SSE/WebSocket to GRA staff console |
| 4 | Live activity feed on dashboard (ticket count, revenue today) |
| 5 | Demo mode: buy ticket on operator site → see update on GRA within seconds |

Reference kit: `integrations/operator/` in this repo. First pilot operator deployed on VPS at `/var/www/byanydream` (PHP / CodeIgniter).

### Processing flow

```
Operator site → HTTPS POST → Ingest API (validate auth, store raw)
    → Redis queue → Worker (validate schema, map to submissions table)
    → Update operator snapshots → Staff dashboard reflects new data
```

Rate limits: per API key (e.g. 60 req/min). Failed jobs retry with backoff.

---

## 7. Pages & Features

Based on the existing UI prototype in `out/` — **GRA branding**, plus new modules from stakeholder review.

**UI/UX detail:** see `docs/UI_UX_PLAN.md` (design system, layout, responsive rules, UI delivery phases).

### 7.1 Authentication

| Route | Page | Features |
|-------|------|----------|
| `/login` | Login | Email/password, MFA (phase 2), session timeout, GRA branding |

### 7.2 Dashboard

| Route | Page | Features |
|-------|------|----------|
| `/` | Dashboard | National KPIs: operators, GGR, tax collected, compliance rate; **live activity feed** (ticket purchases); trend charts; regional snapshot; recent AML alerts |

### 7.3 Operators

| Route | Page | Features |
|-------|------|----------|
| `/operators` | Operator registry | Searchable table: name, licence, county, GGR, compliance, risk; filters |
| `/operators/[id]` | Operator detail | KPI cards; tabs: Overview, Submissions, Enforcement, Documents, **Live activity** |

**Operator actions:** Renew licence, request return, issue warning, suspend licence.

### 7.4 Compliance

| Route | Page | Features |
|-------|------|----------|
| `/compliance` | Compliance overview | Tiers, overdue submissions, tax arrears, trends |

### 7.5 Submissions

| Route | Page | Features |
|-------|------|----------|
| `/submissions` | All submissions | Cross-operator queue; approve/reject; bulk actions |

### 7.6 Enforcement

| Route | Page | Features |
|-------|------|----------|
| `/enforcement` | Enforcement centre | Cases, warnings, fines, suspensions |

### 7.7 Regional (expanded)

| Route | Page | Features |
|-------|------|----------|
| `/regional` | Regional & player safety | Kenya map by county; GGR by region; **Play Safe usage**; **peak play times** (heatmap); spend bands; session patterns; export anonymised dataset for partners |

### 7.8 Reports (new)

| Route | Page | Features |
|-------|------|----------|
| `/reports` | Reports hub | Catalogue of pre-built reports; filters; generate on demand |
| `/reports/[slug]` | Report detail | Parameters (date range, operator, county); preview; CSV/PDF/Excel export |
| `/reports/scheduled` | Scheduled reports | Daily/weekly/monthly jobs; email to stakeholders |

**Report catalogue (initial):**

| Report | Audience |
|--------|----------|
| GGR by operator (monthly) | Supervisors, analysts |
| Tax collected vs due | Supervisors, treasury liaison |
| Compliance status summary | All staff |
| Regional commercial summary | Policy team |
| Player safety aggregates | Policy, external partners (anonymised) |
| Payment gateway daily volume | Supervisors, CBK liaison |
| AML alert summary | Compliance officers |
| Operator licence expiry | Operations |

### 7.9 Payment gateway (new — Harambe Pay)

| Route | Page | Features |
|-------|------|----------|
| `/payments` | Gateway overview | Live volume, success rate, today's tax earmarked vs withdrawn |
| `/payments/transactions` | Transaction log | Search, filter by operator, status, AML flag |
| `/payments/tax-escrow` | Tax sub-account | Earmarked balance, EOD withdrawal trigger, history |
| `/payments/aml` | AML / KYC queue | Open alerts, review workflow, escalate to enforcement |
| `/payments/operators` | Per-operator payment stats | Volume, failure rate, tax split |

### 7.10 Audit

| Route | Page | Features |
|-------|------|----------|
| `/audit` | Audit log | Immutable staff action log; export |

### 7.11 Settings

| Route | Page | Features |
|-------|------|----------|
| `/settings` | Settings | Users, roles, API credentials, tax rate config, gateway partnership settings, notifications |

### 7.12 Error pages

| Route | Page |
|-------|------|
| `/404` | Not found |
| `/403` | Forbidden |

---

## 8. Delivery phases (complete breakdown)

Every checkbox is a deliverable. Do not skip items — mark done only when tested.

---

### Phase 0 — Alignment & branding (1 week)

**Goal:** GRA identity on prototype; legal/business sign-off on tax split and data sharing.

| # | Task | Owner | Done |
|---|------|-------|------|
| 0.1 | Confirm GRA legal name, logo assets, licence number format | Stakeholders | ☐ |
| 0.2 | Replace all BCLB strings in UI with GRA | Dev | ☐ |
| 0.3 | Update favicon, OG image, login screen branding | Dev | ☐ |
| 0.4 | Confirm tax rate (e.g. 30%) and EOD withdrawal rules with GRA | Stakeholders | ☐ |
| 0.5 | Confirm anonymisation rules for player safety / external data sales | Legal | ☐ |
| 0.6 | Confirm payment gateway partnership / revenue share (gateway project + GRA) | Business | ☐ |
| 0.7 | Document pilot operator for real-time demo | Dev | ☐ |

---

### Phase 1 — Foundation & infrastructure (4–6 weeks)

**Goal:** Runnable monorepo, local Docker, empty staff app deployed to VPS.

#### 1A — Repository & tooling

| # | Task | Done |
|---|------|------|
| 1.1 | Create monorepo (`apps/web`, `apps/api`, `packages/database`, `packages/shared`) | ☐ |
| 1.2 | TypeScript, ESLint, Prettier, shared tsconfig | ☐ |
| 1.3 | Docker Compose: Postgres 16, Redis 7, MinIO | ☐ |
| 1.4 | Environment variable templates (`.env.example`) | ☐ |
| 1.5 | GitHub Actions: lint, typecheck, test on PR | ☐ |

#### 1B — Database core

| # | Task | Done |
|---|------|------|
| 1.6 | Prisma schema: `users`, `audit_logs` | ☐ |
| 1.7 | Prisma schema: `operators`, `operator_sites`, `licences`, `api_credentials` | ☐ |
| 1.8 | Prisma schema: `reporting_periods`, `submissions`, `ingest_events` | ☐ |
| 1.9 | Prisma schema: `enforcement_cases`, `enforcement_actions`, `documents` | ☐ |
| 1.10 | Initial migration + seed script (demo operators op-001–op-015) | ☐ |
| 1.11 | Seed GRA staff users (admin, supervisor, analyst, auditor) | ☐ |

#### 1C — Staff API (NestJS)

| # | Task | Done |
|---|------|------|
| 1.12 | NestJS app on Fastify, health check | ☐ |
| 1.13 | Staff auth: login, JWT access + refresh, logout | ☐ |
| 1.14 | Role guard (`admin`, `supervisor`, `analyst`, `auditor`) | ☐ |
| 1.15 | Operators CRUD API (list, get, create, update) | ☐ |
| 1.16 | Licences CRUD nested under operators | ☐ |
| 1.17 | Audit log writer middleware (all mutating staff actions) | ☐ |
| 1.18 | OpenAPI / Swagger for staff API | ☐ |

#### 1D — Staff web (Next.js)

| # | Task | Done |
|---|------|------|
| 1.19 | Next.js App Router scaffold, GRA theme (from prototype CSS) | ☐ |
| 1.20 | App shell: sidebar, header, navigation | ☐ |
| 1.21 | Login page + auth cookie/session handling | ☐ |
| 1.22 | Protected route wrapper (redirect if unauthenticated) | ☐ |
| 1.23 | Dashboard page shell (KPI placeholders wired to API) | ☐ |
| 1.24 | Operators list page (live data from API) | ☐ |
| 1.25 | Operator detail page — Overview tab only | ☐ |

#### 1E — VPS deployment (first cut)

| # | Task | Done |
|---|------|------|
| 1.26 | Install Node 22, Postgres, Redis, Nginx on VPS | ☑ |
| 1.27 | Create `kenji_government` database and user | ☑ |
| 1.28 | Nginx reverse proxy: HTTPS → Next.js + API | ☑ |
| 1.29 | PM2 or Docker production compose | ☑ |
| 1.30 | Run migrations on VPS | ☑ |
| 1.31 | Smoke test: login, view operators list on production URL | ☑ |

**Phase 1 exit criteria:** Staff can log in and view operator registry with seeded data on VPS.

---

### Phase 2 — Core modules (UI parity with prototype) (4–5 weeks)

**Goal:** All prototype pages functional with real API data (no mock JSON).

#### 2A — Operator detail (full)

| # | Task | Done |
|---|------|------|
| 2.1 | Overview tab: licence block, contact, financial summary | ☐ |
| 2.2 | GGR trend chart (6 months from `operator_monthly_snapshots`) | ☐ |
| 2.3 | Submissions tab: history table + export CSV | ☐ |
| 2.4 | Enforcement tab: cases list + create case | ☐ |
| 2.5 | Documents tab: list + upload + download (MinIO) | ☐ |
| 2.6 | Operator actions dropdown (warning, suspend — API + audit) | ☐ |

#### 2B — Compliance & submissions modules

| # | Task | Done |
|---|------|------|
| 2.7 | Compliance page: overdue list, arrears, compliance tiers | ☐ |
| 2.8 | Submissions queue page: filter pending/approved/rejected | ☐ |
| 2.9 | Approve / reject submission (supervisor only) | ☐ |
| 2.10 | Email notification on submission received (optional) | ☐ |

#### 2C — Enforcement module

| # | Task | Done |
|---|------|------|
| 2.11 | Enforcement centre: all open cases across operators | ☐ |
| 2.12 | Case detail: timeline, actions, link to operator | ☐ |
| 2.13 | Create enforcement action (warning, fine, suspension) | ☐ |
| 2.14 | Auto-update operator status on suspension | ☐ |

#### 2D — Audit & settings

| # | Task | Done |
|---|------|------|
| 2.15 | Audit log page: filter by user, action, date | ☐ |
| 2.16 | Audit export CSV (auditor role) | ☐ |
| 2.17 | Settings: user list, create/deactivate users (admin) | ☐ |
| 2.18 | Settings: role assignment | ☐ |
| 2.19 | Settings: API credential generate/revoke per operator site | ☐ |

#### 2E — Dashboard KPIs

| # | Task | Done |
|---|------|------|
| 2.20 | Aggregate queries: total operators, active licences | ☐ |
| 2.21 | National GGR and tax collected (current period) | ☐ |
| 2.22 | Compliance rate calculation | ☐ |
| 2.23 | Recent alerts widget (overdue, licence expiry) | ☐ |

**Phase 2 exit criteria:** Feature parity with static prototype except Reports, Payments, expanded Regional, real-time feed.

---

### Phase 3 — Operator ingest & monthly reporting (3–4 weeks)

**Goal:** Operators push monthly returns; async processing; not real-time yet.

#### 3A — Ingest API

| # | Task | Done |
|---|------|------|
| 3.1 | Separate ingest NestJS module / port (4001) | ☑ |
| 3.2 | API key + HMAC validation guard | ☑ |
| 3.3 | Idempotency key handling | ☑ |
| 3.4 | `POST /v1/returns/monthly` → store `ingest_events` | ☑ |
| 3.5 | `POST /v1/documents` multipart → MinIO + `documents` row | ☑ |
| 3.6 | `POST /v1/heartbeat`, `GET /v1/status` | ☑ |
| 3.7 | Rate limiting per API key (Redis) | ☑ |
| 3.8 | Ingest API OpenAPI spec → `docs/API.md` | ☑ |

#### 3B — Worker pipeline

| # | Task | Done |
|---|------|------|
| 3.9 | BullMQ queue: `ingest-process` | ☑ |
| 3.10 | Worker: validate monthly return schema (Zod) | ☑ |
| 3.11 | Worker: upsert `submissions` + update snapshots | ☑ |
| 3.12 | Worker: mark `ingest_events` processed / failed + retry | ☑ |
| 3.13 | Dead-letter queue + admin alert on repeated failure | ☑ |

#### 3C — Operator onboarding

| # | Task | Done |
|---|------|------|
| 3.14 | Operator integration guide (auth, endpoints, examples) | ☑ |
| 3.15 | Postman collection / example PHP operator ingest client | ☑ |
| 3.16 | Sandbox API keys for testing | ☑ |

**Phase 3 exit criteria:** External system can POST monthly return; appears in GRA submissions queue after processing.

---

### Phase 4 — Real-time operator integration (pilot first) (3–4 weeks)

**Goal:** Ticket purchase on operator site visible on GRA dashboard within seconds.

#### 4A — Real-time ingest events

| # | Task | Done |
|---|------|------|
| 4.1 | `POST /v1/events/ticket` (purchased, voided) | ☑ |
| 4.2 | `POST /v1/events/payment` (completed, failed) | ☑ |
| 4.3 | `POST /v1/events/operator-updated` | ☑ |
| 4.4 | Map events to `live_activity_feed` + dashboard counters | ☑ |
| 4.5 | Redis pub/sub channel per event type | ☑ |

#### 4B — Operator webhook integration (pilot)

| # | Task | Done |
|---|------|------|
| 4.6 | Audit pilot operator ticket/payment code paths | ☑ |
| 4.7 | Add webhook emitter on ticket purchase in operator app | ☑ |
| 4.8 | Add webhook emitter on payment completion | ☑ |
| 4.9 | HMAC signing from operator app to ingest API | ☑ |
| 4.10 | End-to-end test: buy ticket → GRA feed updates | ☑ |

> **Note:** Operator ingest hooks live in `integrations/operator/` (copy `GraIngestService.php` into each operator app). Set `GRA_INGEST_ENABLED=true` when ingest API is reachable. Local E2E: `./scripts/e2e-live-feed-test.sh`.

#### 4C — Live staff console

| # | Task | Done |
|---|------|------|
| 4.11 | SSE or WebSocket endpoint for staff (`/api/live`) | ☑ |
| 4.12 | Dashboard live ticker: recent ticket purchases | ☑ |
| 4.13 | Operator detail "Live activity" tab | ☑ |
| 4.14 | "Tickets today" / "Revenue today" counters (real-time) | ☑ |
| 4.15 | Demo script for stakeholder meetings | ☑ |

**Phase 4 exit criteria:** Demonstrable real-time link operator platform ↔ GRA dashboard.

---

### Phase 5 — Reports module (2–3 weeks)

**Goal:** Stakeholders access standard reports without asking analysts.

| # | Task | Done |
|---|------|------|
| 5.1 | DB: `report_definitions`, `report_runs` | ☑ |
| 5.2 | Seed initial report catalogue (§7.8) | ☑ |
| 5.3 | Reports hub UI: cards by category | ☑ |
| 5.4 | Report runner: queue job, generate CSV/PDF | ☑ |
| 5.5 | Report download from MinIO (signed URL) | ☑ |
| 5.6 | Role-based report visibility | ☑ |
| 5.7 | Scheduled reports (BullMQ cron: daily 06:00 EAT) | ☑ |
| 5.8 | Email report to stakeholder list | ☑ |
| 5.9 | Report history: who generated what, when | ☑ |

**Phase 5 exit criteria:** Supervisor generates "GGR by operator monthly" PDF from UI.

---

### Phase 6 — Regional & player safety analytics (3–4 weeks)

**Goal:** Policy-grade anonymised data for GRA, UN, charities, brokers.

#### 6A — Data ingest

| # | Task | Done |
|---|------|------|
| 6.1 | `POST /v1/events/player-safety` (play_safe, self_exclusion) | ☑ |
| 6.2 | `POST /v1/events/session-aggregate` (hourly rollups) | ☑ |
| 6.3 | Enforce: no raw player IDs in payload (reject if present) | ☑ |
| 6.4 | Operator platforms: emit play-safe and session events | ☑ |

#### 6B — Aggregation pipeline

| # | Task | Done |
|---|------|------|
| 6.5 | Nightly job: roll `player_safety_events` → `player_safety_aggregates` | ☑ |
| 6.6 | County + hour peak calculation | ☑ |
| 6.7 | Stake band + age band distribution aggregation | ☑ |

#### 6C — Regional UI (expanded)

| # | Task | Done |
|---|------|------|
| 6.8 | Map: GGR by county (existing) | ☑ |
| 6.9 | Play Safe activations by county (bar chart) | ☑ |
| 6.10 | Peak play time heatmap (hour × day of week) | ☑ |
| 6.11 | Spend band distribution chart | ☑ |
| 6.12 | County drill-down page | ☑ |
| 6.13 | Export anonymised regional dataset (CSV) for external partners | ☑ |
| 6.14 | Report: "Player safety regional summary" in Reports hub | ☑ |

**Phase 6 exit criteria:** Regional page shows play-safe and peak-time data; export works with no PII.

---

### Phase 7 — Payment gateway oversight + separate gateway project (6–8 weeks)

**Goal:** Government payment visibility (this repo), AML/KYC, tax earmarking records, EOD withdrawal tracking. **Payment processing** lives in a **separate NestJS repository** — see `docs/PAYMENT_GATEWAY_PROJECT.md`.

#### 7A — Payment gateway application (**separate repository — not kenji-government**)

| # | Task | Done |
|---|------|------|
| 7.1 | Gateway API contract (pay, split, escrow, withdraw) | ☐ separate repo |
| 7.2 | Partnership / revenue share configuration | ☐ business |
| 7.3 | Operator sites route ticket payments through gateway service | ☐ separate repo |
| 7.4 | Split payment: operator share + tax share at transaction time | ☐ separate repo |
| 7.5 | Gateway notifies GRA on payment completed | ☑ GRA ingest `POST /gateway/notify`; gateway project must call it |

#### 7B — GRA database & API (**kenji-government**)

| # | Task | Done |
|---|------|------|
| 7.6 | Tables: `payment_transactions`, `tax_escrow_entries`, `tax_withdrawal_batches`, `aml_alerts` | ☑ |
| 7.7 | Ingest handler for gateway webhooks | ☑ |
| 7.8 | Tax rate config in settings (default 30%) | ☑ (super admin only) |
| 7.9 | EOD withdrawal job (23:59 EAT) — batch earmarked tax | ☑ |
| 7.10 | Manual withdrawal trigger (supervisor) with audit log | ☑ |

#### 7C — Payment oversight UI (**kenji-government**)

| # | Task | Done |
|---|------|------|
| 7.11 | `/payments` overview: volume, success rate, tax today | ☑ |
| 7.12 | `/payments/transactions` searchable log | ☑ |
| 7.13 | `/payments/tax-escrow` balance + withdrawal history | ☑ |
| 7.14 | `/payments/aml` alert queue + review actions | ☑ |
| 7.15 | `/payments/operators` per-operator stats | ☑ |
| 7.16 | Real-time transaction counter on main dashboard | ☑ |

#### 7D — AML / KYC / CBK (**kenji-government**)

| # | Task | Done |
|---|------|------|
| 7.17 | AML rules engine (velocity, thresholds) — v1 | ☑ |
| 7.18 | KYC status display per transaction | ☑ |
| 7.19 | CBK-oriented export report | ☑ (`cbk_aml_payment_export` in Reports) |
| 7.20 | Link high-severity AML alert → enforcement case | ☑ |

**Phase 7 exit criteria:** 100 KSH payment → 30 KSH earmarked visible in UI; EOD withdrawal recorded; AML alert reviewable.

---

### Phase 8 — Production hardening (2–3 weeks)

| # | Task | Done |
|---|------|------|
| 8.1 | MFA for staff (TOTP) | ☑ |
| 8.2 | Session timeout + idle logout | ☑ |
| 8.3 | Postgres daily backup + restore test | ☐ |
| 8.4 | MinIO/S3 backup for documents and reports | ☐ |
| 8.5 | Centralised logging (e.g. Loki or cloud) | ☐ |
| 8.6 | Uptime monitoring + alerting | ☐ |
| 8.7 | Load test ingest: 30 operators × burst traffic | ☐ |
| 8.8 | Load test staff dashboard under concurrent users | ☐ |
| 8.9 | Security review: OWASP top 10 | ☐ |
| 8.10 | Penetration test (or internal red-team checklist) | ☐ |
| 8.11 | Kenya data residency documentation | ☐ |
| 8.12 | Runbook: deploy, rollback, incident response | ☐ |

---

### Phase 9 — Pilot & multi-operator scale (ongoing)

| # | Task | Done |
|---|------|------|
| 9.1 | Pilot: first operator production traffic on ingest | ☑ |
| 9.2 | Onboard 2nd operator | ☐ |
| 9.3 | Onboard 10+ operators | ☐ |
| 9.4 | Data-sharing agreement templates (operators, UN, charities) | ☐ |
| 9.5 | External partner API for anonymised regional exports (optional) | ☐ |
| 9.6 | Stakeholder training sessions | ☐ |
| 9.7 | GRA public launch checklist | ☐ |

---

### Phase dependency map

```
Phase 0 (branding)
    ↓
Phase 1 (foundation)
    ↓
Phase 2 (core UI) ──────────────────────────┐
    ↓                                       │
Phase 3 (monthly ingest)                    │
    ↓                                       │
Phase 4 (real-time operator ingest)            │
    ↓                                       │
Phase 5 (reports) ← can start after Phase 2 │
    ↓                                       │
Phase 6 (regional / player safety) ← needs Phase 3/4 events
    ↓
Phase 7 (gateway project + GRA oversight) ← needs Phase 4 payment events
    ↓
Phase 8 (hardening)
    ↓
Phase 9 (pilot & scale)
```

---

## 9. Roles & permissions (updated)

| Role | Access |
|------|--------|
| `admin` | Full access, users, API credentials, gateway settings, tax withdrawal |
| `supervisor` | All modules, enforcement, approve submissions, trigger tax withdrawal |
| `analyst` | View all, review submissions, generate reports, no enforcement |
| `auditor` | Read-only + audit log + report export |
| `cbk_liaison` (optional) | Payment gateway + AML views only, read-only |

---

## 10. Security requirements (updated)

- All traffic HTTPS (TLS 1.2+)
- Staff passwords: bcrypt, minimum complexity policy
- Operator ingest: API key + HMAC, rate limits, IP allowlist optional
- **No raw player PII** in GRA database — anonymised aggregates only
- Payment data: hashed payer fingerprints, no card numbers in GRA DB
- Audit log: append-only, no deletes
- Tax withdrawal: dual approval optional (supervisor + admin)
- Session timeout for staff (e.g. 30 min idle)
- Kenya data residency: database and files hosted in Kenya or approved region
- Regular automated backups (Postgres daily, files weekly)
- AML alerts: restricted to compliance roles

---

## 11. Success criteria (updated)

| Metric | Target |
|--------|--------|
| Operators onboarded | 10+ in pilot |
| Real-time latency (ticket → GRA UI) | < 5 seconds |
| Ingest reliability | 99.9% payloads processed within 5 min |
| Tax earmarking accuracy | 100% match gateway ledger |
| EOD tax withdrawal | Automated by 23:59 EAT |
| Dashboard load time | < 2s on government network |
| Audit coverage | 100% of staff actions logged |
| Player safety exports | Zero PII in anonymised datasets |
| Stakeholder reports | 8+ standard reports available in hub |

---

## 12. References

- UI prototype reference: `/out/` (historical static export — production is live at `console.force42.com`)
- **UI/UX plan:** `docs/UI_UX_PLAN.md`
- Similar operator model: `/var/www/compgo` (raffle/competition platform)
- Operator integration kit: `integrations/operator/` (pilot VPS path: `/var/www/byanydream`)
- VPS staff console: `https://console.force42.com` · ingest: `https://ingest.force42.com`
- Domain map: `vps-domain-structure.txt` · SSH: `ssh.txt`
- Payment gateway (separate project): `docs/PAYMENT_GATEWAY_PROJECT.md`
- **Operator raffle platform:** `/var/www/Kenji-raffle` — live at `https://api.force42.com`, `https://platform.force42.com`, tenant `*.force42.com`
- README: project purpose and stakeholder next steps
