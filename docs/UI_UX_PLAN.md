# GRA Oversight Console — UI/UX Plan

**Gambling Regulatory Authority (GRA) — Kenya Raffle Oversight Platform**

Last updated: August 2026

This document defines how we design, build, and validate the government dashboard UI. It complements `PROJECT_PLAN.md` (features/phases) with visual language, layout rules, component standards, and delivery steps.

**Reference prototype:** `/out/` (static Next.js export — stakeholders approved the concept and layout; we evolve it, not replace it).

---

## 1. UX review of the current prototype

### What works (keep)

| Area | Assessment |
|------|------------|
| **Overall concept** | Stakeholders love it — supervisory console for operators, compliance, enforcement |
| **App shell** | Sidebar + main content — correct pattern for government back-office tools |
| **Card-based KPIs** | Four metric cards on dashboard and operator pages — scannable at a glance |
| **Operator detail** | Header + status badge + tabbed sections (Overview, Submissions, Enforcement, Documents) — strong information hierarchy |
| **Tables** | Submissions history with status badges and export — fits analyst workflow |
| **Status semantics** | Green = compliant/success, warning/destructive for risk — clear without reading labels |
| **Login screen** | Kenya flag stripe, shield motif, “Authorized Personnel Only”, official footer — credible government entry |
| **Document vault** | Grid of file cards with download — intuitive for licence paperwork |
| **Empty states** | e.g. “No enforcement cases” with icon — reduces anxiety for clean operators |
| **Tech stack** | Next.js + Tailwind + shadcn/ui + Lucide — fast to extend consistently |

### What must change

| Issue | Action |
|-------|--------|
| **BCLB branding** | Replace all BCLB references with **GRA** (logo, titles, emails, licence prefixes) |
| **Navigation gaps** | Add **Reports**, **Payments** (Harambe Pay), expand **Regional** label to “Regional & Player Safety” |
| **Mock data only** | Wire loading, empty, and error states for real APIs |
| **No live feed** | Add live activity strip / ticker on dashboard (Phase 4) |
| **CSR-heavy pages** | Rebuild with SSR where possible for faster first paint on slow government networks |
| **Email domain in login** | Change `bclb.go.ke` placeholder → `gra.go.ke` (confirm with GRA) |

### UX risks to address in rebuild

| Risk | Mitigation |
|------|------------|
| Too much data on one screen | Progressive disclosure: summary first, drill-down on click |
| Small touch targets on mobile | Minimum 44×44px interactive areas; test on tablet |
| Colour-only status | Always pair colour with text label or icon |
| Long tables on phone | Horizontal scroll container + sticky first column |
| Destructive actions (suspend, withdraw tax) | Confirmation modal + reason field + audit trail message |

---

## 2. Design principles — “government-style”

### 2.1 Tone

- **Authoritative, not flashy** — looks like a serious regulatory system, not a startup SaaS
- **Calm and readable** — light backgrounds, restrained shadows, no gratuitous animation
- **Trust-first** — GRA logo, Republic of Kenya footer, security cues on login
- **Data-forward** — numbers and tables are heroes; decoration is minimal

### 2.2 Ease of use (for non-technical staff)

| Principle | Implementation |
|-----------|----------------|
| **One primary action per screen** | e.g. Submissions queue → “Review pending” is obvious |
| **Plain language** | “Tax outstanding” not “AR balance”; “Operator” not “entity” |
| **Consistent layout** | Every module: page title → filters → content → actions bottom-right |
| **Breadcrumbs** | `Dashboard → Operators → Safari Jackpot` on detail pages |
| **No hidden power features** | Export, suspend, approve always visible to permitted roles (not buried in menus only) |
| **Forgiving filters** | Reset filters button; sensible defaults (current month, active operators) |
| **Help text** | Short descriptions under section titles (already used in prototype card descriptions) |

### 2.3 Professional polish

- Consistent 8px spacing scale (Tailwind `space-y-4`, `gap-4`, `p-6`)
- One border radius family: `rounded-lg` for inputs, `rounded-xl` for cards
- Subtle borders (`border-border`) over heavy shadows
- Monospace only for IDs, licence numbers, API keys — not body text
- Currency always **Ksh** with thousands separators: `Ksh 72,750,000`

### 2.4 Responsive strategy

Government users may use desktop in office, tablet in meetings, phone in the field.

| Breakpoint | Layout behaviour |
|------------|------------------|
| **Desktop (≥1280px)** | Full sidebar, 4-column KPI grid, map + side panel |
| **Tablet (768–1279px)** | Collapsible sidebar (icon rail), 2-column KPIs, stacked charts |
| **Mobile (<768px)** | Hamburger nav, 1-column KPIs, tables scroll horizontally, sticky table headers |

**Target devices for QA:** 1366×768 (common office laptop), iPad, Android phone.

---

## 3. Visual design system (GRA)

### 3.1 Brand

| Element | Specification |
|---------|---------------|
| **Name** | Gambling Regulatory Authority (GRA) |
| **Product name** | GRA Raffle Oversight Console (or “GRA Oversight Console”) |
| **Logo** | GRA official mark — replace `bclb-logo.png` |
| **Kenya identity** | Thin top stripe: black → red → green (login already does this — reuse in app header bar) |

### 3.2 Colour palette

Evolve prototype colours toward GRA + Kenya government conventions.

| Token | Hex | Usage |
|-------|-----|--------|
| `primary` | `#006B3F` or GRA official green | Primary buttons, active nav, positive compliance |
| `primary-foreground` | `#FFFFFF` | Text on primary |
| `secondary` | `#F1F5F9` (slate-100) | Tab backgrounds, secondary panels |
| `background` | `#F8FAFC` (slate-50) | Page background |
| `card` | `#FFFFFF` | Cards |
| `foreground` | `#0F172A` (slate-900) | Headings |
| `muted-foreground` | `#64748B` | Labels, descriptions |
| `accent-navy` | `#1A365D` | Header bar, sidebar (prototype `theme-color`) |
| `success` | `#059669` | Compliant, paid, active licence |
| `warning` | `#D97706` | At risk, due soon |
| `destructive` | `#DC2626` | Non-compliant, suspended, AML alert |
| `info` | `#2563EB` | Informational badges, links |

**Do not** rely on red/green alone — always show text (`compliant`, `suspended`).

### 3.3 Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Page title | Geist or **Inter** | 24–30px | 600 |
| Section title | Same | 16–18px | 600 |
| Body | Same | 14–16px | 400 |
| KPI value | Same | 24–32px | 700 |
| KPI label | Same | 12px | 500, muted |
| Table header | Same | 12px | 600, uppercase optional |
| Footer / legal | Same | 10–12px | 400, muted |

**Line height:** 1.5 for body; 1.2 for KPI numbers.

### 3.4 Iconography

- **Lucide React** only — consistent stroke width
- Nav icons: 20px; inline icons: 16px; empty states: 48px at 50% opacity
- Meaningful pairs: Building2 = operators, Gavel = enforcement, Shield = compliance/AML

### 3.5 Components (shadcn/ui baseline)

| Component | Government usage rules |
|-----------|------------------------|
| **Card** | All KPIs and sections; `shadow-sm`, not `shadow-2xl` except login |
| **Badge** | Status only — outline variant with semantic border colour |
| **Button** | Primary = one per card footer; destructive = red + confirm |
| **Table** | Zebra optional; row hover `bg-secondary/50` (prototype pattern) |
| **Tabs** | Operator detail, regional sub-views — `bg-secondary` tab list |
| **Dialog** | Confirm suspend, approve submission, trigger tax withdrawal |
| **Sheet** | Mobile filters and quick preview (optional) |
| **Toast** | Success/error after actions — auto-dismiss 5s |
| **Skeleton** | Loading KPIs and tables — avoid blank flashes |

Store shared components in `packages/ui` or `apps/web/components/`.

---

## 4. Layout & navigation

### 4.1 App shell structure

```
┌─────────────────────────────────────────────────────────────┐
│ Kenya stripe (3px) │ GRA logo │ Product name    │ User ▾     │  ← Top bar (navy)
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │  Breadcrumb                                      │
│          │  Page title                    [Primary action]  │
│ Nav      ├──────────────────────────────────────────────────┤
│ items    │  Filters (optional)                              │
│          │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│          │  │ KPI card│ │ KPI card│ │ KPI card│           │
│          │  └─────────┘ └─────────┘ └─────────┘           │
│          │  Main content (cards, tables, charts, map)      │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│ © Republic of Kenya · GRA · Official use only               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Sidebar navigation (final)

| Order | Label | Route | Icon | Roles |
|-------|-------|-------|------|-------|
| 1 | Dashboard | `/` | LayoutDashboard | all |
| 2 | Operators | `/operators` | Building2 | all |
| 3 | Submissions | `/submissions` | FileText | all |
| 4 | Compliance | `/compliance` | ShieldCheck | all |
| 5 | Enforcement | `/enforcement` | Gavel | supervisor+ |
| 6 | Regional & Player Safety | `/regional` | MapPin | all |
| 7 | Reports | `/reports` | BarChart3 | all (filtered by role) |
| 8 | Payment Gateway | `/payments` | CreditCard | supervisor+, cbk_liaison |
| 9 | Audit Log | `/audit` | ScrollText | auditor+ |
| 10 | Settings | `/settings` | Settings | admin |

**Active state:** `bg-primary/10 text-primary` + left border accent.

**Mobile:** Sidebar → drawer; bottom nav not used (too many items).

### 4.3 Page templates

| Template | Used on |
|----------|---------|
| **Dashboard** | `/` — KPI grid + 2-column charts + live feed + alerts |
| **Registry** | `/operators`, `/submissions`, `/payments/transactions` — filters + data table |
| **Detail** | `/operators/[id]` — hero header + KPI row + tabs |
| **Analytics** | `/regional`, `/compliance` — map + chart grid + export |
| **Hub** | `/reports` — card grid of report types |
| **Queue** | `/payments/aml`, enforcement — status tabs + actionable rows |
| **Settings** | `/settings` — left sub-nav + form sections |

Every template includes: **page title**, **last updated** timestamp on data-heavy pages, **export** where applicable.

---

## 5. Module-specific UX notes

### 5.1 Dashboard

- **Top row:** 4 KPIs — Active operators, GGR (MTD), Tax collected (MTD), Compliance rate
- **Live feed panel:** scrolling list of last 20 events (“Safari Jackpot — ticket purchased — Ksh 500”) with pulse dot when SSE connected
- **Charts:** 6-month GGR trend (line), compliance breakdown (donut)
- **Alerts column:** overdue submissions, licence expiring in 30 days, open AML alerts

### 5.2 Operators

- Registry: search by name, county, status; sort by GGR, risk score
- Row click → detail; status badge visible in table
- Detail: sticky action bar on scroll (Edit, Suspend) on desktop

### 5.3 Regional & player safety

- **Tab 1:** Commercial — map + GGR by county (existing)
- **Tab 2:** Player safety — Play Safe activations, self-exclusion by county
- **Tab 3:** Behaviour — peak play time heatmap (hour × day)
- **Tab 4:** Spend patterns — anonymised stake bands
- Prominent **“Anonymised aggregate data”** disclaimer + export for licensed partners

### 5.4 Reports

- Card layout: icon + title + description + “Generate” + last run date
- Generation → progress modal → download button
- Scheduled reports: toggle + recipient list (admin)

### 5.5 Payment gateway

- **Overview:** today’s volume, success %, tax earmarked, available to withdraw
- **Traffic light** for gateway health (green/amber/red)
- Transaction table: time, operator, amount, tax split, AML flag icon
- Tax escrow: large balance number + “Withdraw to Treasury” (supervisor, with confirm)
- AML queue: severity-sorted, one-click “Review” opens side panel

### 5.6 Login (retain prototype quality)

- Keep Kenya stripe, shield watermark, centred card
- Update copy: GRA, `gra.go.ke` emails
- After failed login: clear error, no stack traces
- Optional: “Session expires after 30 minutes” notice post-login

---

## 6. Accessibility (WCAG 2.1 AA target)

| Requirement | Implementation |
|-------------|----------------|
| Colour contrast | 4.5:1 body text; test primary green on white |
| Keyboard nav | Full sidebar and tables via Tab; Esc closes modals |
| Focus rings | Visible `ring-2 ring-primary` — prototype already uses focus-visible |
| Screen readers | `aria-label` on icon-only buttons; table captions |
| Forms | Labels linked to inputs; errors linked with `aria-describedby` |
| Motion | `prefers-reduced-motion` — disable live feed pulse |
| Language | `lang="en"` on `<html>`; Swahili (`sw`) phase 2 if GRA requests |

---

## 7. How we build the UI (workflow)

### 7.1 Approach: “Prototype port, not redesign”

1. **Extract** layout and class patterns from `out/` (AppShell, cards, tables)
2. **Recreate** as source components in `apps/web` (not static export)
3. **Apply** GRA design tokens (CSS variables in `globals.css`)
4. **Wire** to API with React Query or Server Components + client islands
5. **Add** new modules (Reports, Payments) using same templates

### 7.2 Design deliverables (before each phase)

| Deliverable | Tool | When |
|-------------|------|------|
| GRA brand tokens | CSS + Figma (optional) | Phase 0 |
| Component inventory | Storybook or `/dev/ui` page | Phase 1 |
| Navigation map | This doc + living sidebar | Phase 1 |
| Wireframes for new modules | Figma or Excalidraw | Before Phase 5, 7 |
| Responsive screenshots | Chrome devtools | Each phase exit |

### 7.3 Frontend stack (unchanged)

- Next.js 15 App Router
- Tailwind CSS 4 + CSS variables for theming
- shadcn/ui (Radix primitives)
- Recharts (charts), Leaflet (Kenya map)
- TanStack Table (large operator/submission tables)
- TanStack Query (client data fetching + live polling)

### 7.4 File organisation

```
apps/web/
├── app/
│   ├── (auth)/login/
│   ├── (console)/                    # AppShell wrapper
│   │   ├── page.tsx                  # Dashboard
│   │   ├── operators/
│   │   ├── submissions/
│   │   ├── compliance/
│   │   ├── enforcement/
│   │   ├── regional/
│   │   ├── reports/
│   │   ├── payments/
│   │   ├── audit/
│   │   └── settings/
├── components/
│   ├── shell/                        # Sidebar, Header, Footer
│   ├── dashboard/
│   ├── operators/
│   ├── charts/
│   └── ui/                           # shadcn primitives
├── lib/
│   ├── format-currency.ts            # Ksh formatter
│   └── api-client.ts
└── styles/
    └── globals.css                   # GRA tokens
```

---

## 8. UI delivery phases (aligned with PROJECT_PLAN)

### UI Phase A — Design system & shell (with PROJECT_PLAN Phase 0–1)

| # | Task | Done |
|---|------|------|
| A.1 | GRA logo, favicon, OG image assets | ☐ |
| A.2 | `globals.css` colour tokens + typography | ☐ |
| A.3 | AppShell: top bar + sidebar + footer | ☐ |
| A.4 | Login page (GRA copy) | ☐ |
| A.5 | Breadcrumb component | ☐ |
| A.6 | PageHeader component (title + actions slot) | ☐ |
| A.7 | KpiCard, StatusBadge, DataTable wrappers | ☐ |
| A.8 | EmptyState, LoadingSkeleton, ErrorBanner | ☐ |
| A.9 | Responsive sidebar (collapse + mobile drawer) | ☐ |
| A.10 | `/dev/ui` component gallery for internal QA | ☐ |

### UI Phase B — Core pages (with PROJECT_PLAN Phase 2)

| # | Task | Done |
|---|------|------|
| B.1 | Dashboard layout + KPI cards | ☐ |
| B.2 | Dashboard charts (GGR trend, compliance donut) | ☐ |
| B.3 | Operators registry table + filters | ☐ |
| B.4 | Operator detail header + KPI row | ☐ |
| B.5 | Operator tabs: Overview, Submissions, Enforcement, Documents | ☐ |
| B.6 | Compliance overview page | ☐ |
| B.7 | Submissions queue page | ☐ |
| B.8 | Enforcement centre page | ☐ |
| B.9 | Audit log table + filters | ☐ |
| B.10 | Settings layout + user management forms | ☐ |
| B.11 | Confirm dialogs for destructive actions | ☐ |
| B.12 | Toast notifications for CRUD feedback | ☐ |

### UI Phase C — Live & analytics (with PROJECT_PLAN Phase 4–6)

| # | Task | Done |
|---|------|------|
| C.1 | Live activity feed component + SSE connection indicator | ☐ |
| C.2 | Operator “Live activity” tab | ☐ |
| C.3 | Regional map (Kenya counties) | ☐ |
| C.4 | Regional tabs: commercial, player safety, behaviour, spend | ☐ |
| C.5 | Play Safe bar chart by county | ☐ |
| C.6 | Peak play time heatmap | ☐ |
| C.7 | Anonymised data disclaimer + export button | ☐ |
| C.8 | Reports hub card grid | ☐ |
| C.9 | Report generator modal + download UX | ☐ |

### UI Phase D — Payment gateway UI (with PROJECT_PLAN Phase 7)

| # | Task | Done |
|---|------|------|
| D.1 | Payments overview dashboard | ☐ |
| D.2 | Transaction log table (tax split columns) | ☐ |
| D.3 | Tax escrow balance card + withdrawal flow UI | ☐ |
| D.4 | AML alert queue + review panel | ☐ |
| D.5 | Per-operator payment stats page | ☐ |
| D.6 | Gateway health indicator in header (optional) | ☐ |

### UI Phase E — Polish & accessibility (with PROJECT_PLAN Phase 8)

| # | Task | Done |
|---|------|------|
| E.1 | WCAG contrast audit + fixes | ☐ |
| E.2 | Keyboard navigation audit | ☐ |
| E.3 | Print styles for reports and operator summary | ☐ |
| E.4 | Performance: lazy charts, image optimisation | ☐ |
| E.5 | Stakeholder walkthrough with GRA staff (record feedback) | ☐ |
| E.6 | Tablet + mobile QA pass on all routes | ☐ |

---

## 9. Content & copy guidelines

| Context | Style |
|---------|--------|
| Buttons | Verb-first: “Approve submission”, “Export CSV”, not “OK” |
| Errors | “Unable to load operators. Check your connection or try again.” |
| Empty states | Explain + next step: “No open cases. This operator has a clean record.” |
| Confirmations | State impact: “Suspend licence? Players cannot purchase tickets on this operator’s sites.” |
| Live feed | Short: `{operator} — ticket purchased — Ksh {amount}` |
| Dates | `17 Aug 2026` or `17/08/2026` — pick one, use consistently (prefer `17 Aug 2026`) |
| Time | EAT (UTC+3) always labeled on reports |

---

## 10. Success criteria for UI/UX

| Metric | Target |
|--------|--------|
| Stakeholder sign-off | GRA approves visual after Phase B demo |
| Task completion | Analyst reviews submission in < 3 clicks from dashboard |
| Mobile usability | All pages usable on tablet without horizontal overflow (except tables) |
| Accessibility | No critical WCAG AA failures |
| Performance | LCP < 2.5s on dashboard on 3G throttled |
| Consistency | 100% pages use PageHeader + AppShell |
| Brand | Zero BCLB references in production UI |

---

## 11. References

- Prototype: `/var/www/kenji-government/out/`
- Feature plan: `docs/PROJECT_PLAN.md`
- Similar operator UX patterns: `/var/www/compgo` (raffle ticket flows — government view is read-only mirror)
- Kenya government digital guidelines (align colours and accessibility where applicable)
