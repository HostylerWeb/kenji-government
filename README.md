# Kenya Government — Raffle & Competition Website Oversight Platform

**Standalone initiative.** This folder is **not** part of any operator codebase (e.g. CompetitionGo). It holds design intent, structure, and phased delivery notes for a future regulatory monitoring system.

## Purpose

Give authorised Kenyan government teams a **single supervisory dashboard** to:

- Register and profile **operators** (legal entities running raffle/competition websites).
- Monitor **commercial activity**: tickets sold, revenue, prizes, expenses, net positions (as defined by law and reporting standards).
- Track **tax and levy compliance**: filings, assessments, payments, arrears, supporting invoices/receipts.
- Run **enforcement**: notices, reminders, suspension/activation of listed sites (with audit trail).
- Maintain **auditability**: who did what, when; exports for inspections and partner agencies.

## Contents of this folder

| Document | Description |
|----------|-------------|
| [docs/PLATFORM_STRUCTURE.md](docs/PLATFORM_STRUCTURE.md) | Logical modules, boundaries, suggested repo layout |
| [docs/DATA_AND_INTEGRATIONS.md](docs/DATA_AND_INTEGRATIONS.md) | What data is collected, quality, operator reporting integration |
| [docs/GOVERNANCE_AND_SECURITY.md](docs/GOVERNANCE_AND_SECURITY.md) | Roles, audit, residency, access — high level |
| [docs/PHASED_ROADMAP.md](docs/PHASED_ROADMAP.md) | Suggested delivery phases and milestones |

## Next steps (for stakeholders)

1. Align **legal mapping**: which metrics are legally defined (GGR, stakes, prizes, levies) vs internal bookkeeping.
2. Confirm **owning agency** and **data-sharing agreements** with operators.
3. Choose **deployment model**: dedicated government cloud vs on-prem; Kenya data residency requirements.
4. Pilot with **one voluntary operator** + manual CSV/API before scaling.

---

*This repository is documentation and planning only until an implementation repository is created.*
