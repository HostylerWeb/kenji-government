# Remaining work — GRA Oversight Console

Snapshot: **19 Aug 2026**. Phases **1–7** (core product) and the UI restyle to match `/out/` are **built and deployed**. This file lists what is **not** done.

**Source plans:** [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md), [`docs/UI_UX_PLAN.md`](docs/UI_UX_PLAN.md), [`docs/PAYMENT_GATEWAY_PROJECT.md`](docs/PAYMENT_GATEWAY_PROJECT.md).

---

## Phase 0 — Alignment & branding (stakeholder / legal)

| # | Task | Owner |
|---|------|-------|
| 0.1 | Confirm GRA legal name, official logo assets, licence number format | Stakeholders |
| 0.4 | Confirm tax rate (e.g. 30%) and EOD withdrawal rules with GRA | Stakeholders |
| 0.5 | Confirm anonymisation rules for player safety / external data sales | Legal |
| 0.6 | Confirm payment gateway partnership / revenue share (gateway + GRA) | Business |
| 0.7 | Document pilot operator for real-time demo (formal stakeholder doc) | Dev |

### Dev gaps still open under Phase 0

| # | Task | Notes |
|---|------|-------|
| 0.3 | Favicon and Open Graph image | `apps/web/public/` has `gra-crest.png` only; no favicon/OG assets in metadata |
| — | Confirm email domain placeholder (`gra.go.ke`) with GRA | Login copy may still use a placeholder domain |

BCLB → GRA string replacement in the **app code** is done; confirm final licence prefix format (`GRA/RAF/...`) with stakeholders.

---

## Phase 2 — Optional / minor gaps

| # | Task | Notes |
|---|------|-------|
| 2.10 | Email notification on submission received | Marked optional in plan; not implemented |

---

## Phase 7A — Payment gateway (separate repository)

The GRA console **oversight** side is done. **Payment processing** belongs in a new repo (e.g. `kenji-harambe-pay`). See [`docs/PAYMENT_GATEWAY_PROJECT.md`](docs/PAYMENT_GATEWAY_PROJECT.md).

| # | Task | Notes |
|---|------|-------|
| 7.1 | Gateway API contract (`/charge`, split, escrow, withdraw) | Separate repo |
| 7.2 | Partnership / revenue share configuration | Business |
| 7.3 | Operator sites route ticket payments through gateway | Separate repo + operator apps |
| 7.4 | Split payment: operator share + tax share at transaction time | Separate repo |
| — | EOD withdrawal to treasury (bank / Harambe APIs) | Gateway worker |
| — | Operator authentication on gateway | Gateway project |
| — | GRA service account to read `tax_rate` from staff API | Optional; ingest can apply rate from `gross_amount` today |

**Local substitute until gateway exists:** `tools/gateway-simulator/`.

---

## Phase 8 — Production hardening

| # | Task | Status |
|---|------|--------|
| 8.1 | MFA for staff (TOTP) | Done |
| 8.2 | Session timeout + idle logout | Done |
| 8.3 | Postgres daily backup + restore test | Not done |
| 8.4 | MinIO/S3 backup for documents and reports | Not done |
| 8.5 | Centralised logging (e.g. Loki or cloud) | Not done |
| 8.6 | Uptime monitoring + alerting | Not done |
| 8.7 | Load test ingest: 30 operators × burst traffic | Not done |
| 8.8 | Load test staff dashboard under concurrent users | Not done |
| 8.9 | Security review: OWASP top 10 | Not done |
| 8.10 | Penetration test (or internal red-team checklist) | Not done |
| 8.11 | Kenya data residency documentation | Not done |
| 8.12 | Runbook: deploy, rollback, incident response | Partial — see `docs/DEPLOY.md`; full incident runbook not written |

### Optional hardening (mentioned in plan, not implemented)

| Task | Notes |
|------|-------|
| Dual approval for tax withdrawal | Supervisor + admin — optional in security requirements |
| IP allowlist for operator ingest | Optional |

---

## Phase 9 — Pilot & multi-operator scale

| # | Task | Status |
|---|------|--------|
| 9.1 | Pilot: first operator production traffic on ingest | Done |
| 9.2 | Onboard 2nd operator | Not done |
| 9.3 | Onboard 10+ operators | Not done |
| 9.4 | Data-sharing agreement templates (operators, UN, charities) | Not done |
| 9.5 | External partner API for anonymised regional exports | Optional — not done |
| 9.6 | Stakeholder training sessions | Not done |
| 9.7 | GRA public launch checklist | Not done |

---

## UI — remaining items

From [`docs/UI_UX_PLAN.md`](docs/UI_UX_PLAN.md) §8.

### UI Phase A — Design system (gaps)

| # | Task | Notes |
|---|------|-------|
| A.1 | GRA logo, favicon, OG image assets | Crest in use; official favicon/OG pending |
| A.10 | `/dev/ui` component gallery for internal QA | Not built |

Most other A/B items (tokens, AppShell, PageHeader, core pages, dialogs, toasts) are implemented; plan checkboxes were not updated.

### UI Phase D — Payments UI (gaps)

| # | Task | Notes |
|---|------|-------|
| D.6 | Gateway health indicator in header | Optional — not implemented (API `GET /v1/gateway/health` exists on ingest) |

### UI Phase E — Polish & accessibility

| # | Task | Notes |
|---|------|-------|
| E.1 | WCAG contrast audit + fixes | Not done |
| E.2 | Keyboard navigation audit | Not done |
| E.3 | Print styles for reports and operator summary | Not done |
| E.4 | Performance: lazy charts, image optimisation | Not done |
| E.5 | Stakeholder walkthrough with GRA staff (record feedback) | Not done |
| E.6 | Tablet + mobile QA pass on all routes | Partial — responsive work done; formal QA pass not recorded |

### UI success criteria not yet met

| Metric | Target |
|--------|--------|
| Stakeholder sign-off | GRA approves visual after Phase B demo |
| Accessibility | No critical WCAG AA failures (audit pending) |
| Performance | LCP < 2.5s on dashboard on 3G throttled (not measured) |

### Future / if requested

| Task | Notes |
|------|-------|
| Swahili (`sw`) locale | Phase 2 language support if GRA requests |
| Figma / wireframe deliverables | Optional design artefacts from UI plan §7.2 |
| Storybook | Alternative to `/dev/ui` for component inventory |

---

## Suggested priority order

1. **Phase 0** — Stakeholder/legal sign-off (blocks production branding and policy).
2. **Phase 8** — Backups, monitoring, security review, runbook (blocks confident production ops).
3. **Payment gateway repo (7A)** — Real card/M-Pesa processing and treasury withdrawal.
4. **Phase 9** — Onboard more operators, training, launch checklist.
5. **UI Phase E** — Accessibility, performance, and formal mobile QA.
6. **Optional** — Submission email alerts, gateway header health indicator, dual tax withdrawal approval, external partner API.

---

## Quick reference — what is already done

For full detail see checked items in `docs/PROJECT_PLAN.md` (Phases 3–7, partial 8–9) and `docs/UI_UX_PLAN.md` (Phases C–D).

- Monorepo, Docker, Prisma, staff API, ingest API, worker, Next.js console
- All core staff modules: operators, compliance, submissions, enforcement, audit, settings, dashboard
- Real-time live feed, regional analytics, reports hub, payment oversight UI
- MFA + session idle logout
- VPS deployment (PM2, Nginx, HTTPS)
- UI restyled to match `/out/` prototype aesthetic
