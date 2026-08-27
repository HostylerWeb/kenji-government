# Kenya Government — GRA Raffle & Competition Oversight Platform

**GRA supervisory portal** — staff console, operator ingest API, compliance monitoring, and payment oversight for licensed raffle/competition operators in Kenya.

## Production (Force42 VPS)

| Service | URL |
|---------|-----|
| Staff console | https://console.force42.com |
| Staff API | https://console.force42.com/api |
| Operator ingest | https://ingest.force42.com |

Deploy path on VPS: `/var/www/kenji-government` · SSH and deploy: `ssh.txt`, `docs/DEPLOY.md` · Domain map: `vps-domain-structure.txt`

## Local development

```bash
cd /var/www/kenji-government
cp .env.example .env
docker compose up -d
npm ci && npm run db:migrate && npm run db:seed
npm run dev:web    # :3000
npm run dev:api    # :4000
npm run dev:ingest # :4001
```

Full guide: [`instructions.md`](instructions.md)

## Key docs

| Document | Description |
|----------|-------------|
| [instructions.md](instructions.md) | Run locally, architecture, npm scripts |
| [docs/DEPLOY.md](docs/DEPLOY.md) | VPS deployment |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Phases, roadmap, architecture |
| [docs/API.md](docs/API.md) | Operator ingest API spec |
| [docs/OPERATOR_INTEGRATION.md](docs/OPERATOR_INTEGRATION.md) | Operator onboarding |
| [integrations/operator/](integrations/operator/) | PHP ingest client for legacy operators |

## Related platforms (separate repos)

| Repo | Role |
|------|------|
| `/var/www/Kenji-raffle` | Operator raffle sites — live at `*.force42.com`, `api.force42.com` |
| `/var/www/kenji-gateway` | Payment gateway — live at **https://pay.force42.com** (`:4003` on VPS) |

Operators push signed events to GRA ingest; payment ledger rows arrive via the gateway at `POST /v1/gateway/notify`.
