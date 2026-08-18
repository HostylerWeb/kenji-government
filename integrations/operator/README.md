# Operator ingest integration kit

Reference PHP client and patch scripts for **any licensed raffle operator** connecting to the GRA ingest API.

## Contents

| File | Purpose |
|------|---------|
| `GraIngestService.php` | Copy to operator app `app/Services/GraIngestService.php` |
| `HarambePayGatewayClient.php` | Raffle site client — calls **payment gateway** (not GRA) |
| `patch-operator-payment-controller.sh` | Wire ticket/payment live events (set `OPERATOR_APP_ROOT`) |
| `cron-hourly-session-aggregate.example.sh` | Example cron to emit hourly session rollups |

## Operator `.env`

```env
GRA_INGEST_ENABLED=true
GRA_INGEST_URL=https://ingest.your-gra-domain/v1
GRA_API_KEY=<per-site-api-key>
GRA_HMAC_SECRET=<per-site-hmac-secret>
```

Sandbox credentials are seeded for operator `op-001` — see `instructions.md`.

## Payment gateway (sandbox)

Raffle sites charge via the **payment gateway project**. GRA only receives notifications.

```bash
./tools/gateway-simulator/simulate-charge.sh 100 4242424242424242
```

Production: `HarambePayGatewayClient` targets the gateway service URL. See `docs/PAYMENT_GATEWAY_PROJECT.md`.

## Events

| Method | Endpoint | When to call |
|--------|----------|--------------|
| `emitOrderCompleted()` | ticket + payment | After order completes |
| `emitPlaySafeActivated()` | player-safety | Play Safe button |
| `emitSelfExclusion()` | player-safety | Self-exclusion request |
| `emitSessionAggregate()` | session-aggregate | Hourly cron (county rollups) |

## PHP examples (local)

```bash
php examples/operator-ingest-ticket-event.php
php examples/operator-ingest-player-safety.php
php examples/operator-ingest-session-aggregate.php
```

## Production (Phase 9.1)

1. GRA ingest API reachable on VPS (`docs/DEPLOY.md` — port 4001 / `ingest.*` subdomain).
2. Copy `GraIngestService.php` into the operator app.
3. Run payment patch or call emit methods from existing controllers.
4. Schedule `cron-hourly-session-aggregate.example.sh` on the operator server.

First pilot deployment historically used `/var/www/byanydream`; set `OPERATOR_APP_ROOT` to your operator path.
