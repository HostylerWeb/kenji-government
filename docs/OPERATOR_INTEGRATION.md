# Operator integration guide

This guide covers connecting **any licensed operator raffle platform** to the GRA oversight portal for **monthly returns**, **document uploads**, and **real-time events**.

## Overview

```
Operator platform → HTTPS POST → GRA Ingest API (port 4001)
    → Redis queue (BullMQ) → Worker → submissions (monthly returns)
    → Redis pub/sub → Staff SSE → GRA dashboard live ticker (ticket events)
```

Monthly returns are queued for async processing. Real-time ticket and payment events are processed immediately and pushed to the staff console via Server-Sent Events.

**Kenji Raffle (multi-tenant SaaS)** uses an **async queue + platform relay** pattern instead of synchronous cURL from each checkout: tenant sites enqueue `gra_outbound_events`; a central worker signs and POSTs to ingest. See `Kenji-raffle/docs/GRA_INTEGRATION_ARCHITECTURE.md`. The PHP integration kit (`integrations/operator/GraIngestService.php`) remains valid for single-site operators.

## 1. Obtain API credentials

GRA administrators generate credentials in **Settings → Operator API Credentials**:

1. Select the operator
2. Click **Generate new credential**
3. Store the `api_key` and `hmac_secret` securely — shown once only

For local development, seed data includes sandbox credentials for `op-001`:

- API Key: `gra_sandbox_op001_devkey0001`
- HMAC Secret: `sandbox_hmac_op001_secret_32chars_min`

## 2. Request signing

```php
$body = json_encode($payload, JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha256', $body, $hmacSecret);
```

Headers:

```
X-Api-Key: <api_key>
X-Signature: <signature>
X-Idempotency-Key: <unique-uuid>
Content-Type: application/json
```

## 3. Submit monthly return

Endpoint: `POST /v1/returns/monthly`

Submit once per reporting period. Use a stable idempotency key if retrying the same period (e.g. `monthly-op-001-2026-07`).

Processing is async — poll ingest status via staff tools or wait for submission to appear in GRA console.

## 4. Upload documents

Endpoint: `POST /v1/documents` (multipart)

Sign with HMAC of **empty body**.

Fields: `file`, `title`, `document_type`.

## 5. Real-time events (live dashboard)

Endpoints (processed immediately, no worker required):

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/events/ticket` | Ticket purchased or voided |
| `POST /v1/events/payment` | Payment completed or failed |
| `POST /v1/events/operator-updated` | Operator site metadata change |
| `POST /v1/events/player-safety` | Play Safe activation or self-exclusion (anonymised — county only) |
| `POST /v1/events/session-aggregate` | Hourly session/stake-band rollups (no player IDs) |

Payloads containing player identifiers (`player_id`, `email`, `phone`, etc.) are **rejected**.

## 6. Player safety & regional analytics (Phase 6)

Operators emit anonymised events for policy-grade regional analytics:

| Endpoint | Body highlights |
|----------|-----------------|
| `POST /v1/events/player-safety` | `event_type`: `play_safe` or `self_exclusion`, `county`, `occurred_at` |
| `POST /v1/events/session-aggregate` | `county`, `bucket_start`, `session_count`, `total_session_minutes`, `stake_band_distribution` |

Operator apps: `GraIngestService::emitPlaySafeActivated()`, `emitSelfExclusion()`, `emitSessionAggregate()` (`integrations/operator/`).

Demo:

```bash
php examples/operator-ingest-player-safety.php
php examples/operator-ingest-session-aggregate.php
```

Nightly worker job rolls raw events into `player_safety_aggregates` (midnight EAT). Staff view: **Regional & Player Safety** in the console.

## 7. Health checks

- `GET /v1/status` — verify credentials
- `POST /v1/heartbeat` — optional periodic ping

## 8. Error handling

| Code | Meaning |
|------|---------|
| 401 | Invalid API key or signature |
| 403 | Site suspended or IP blocked |
| 429 | Rate limit (60/min) |
| 400 | Invalid payload schema |

Retry transient failures with the **same** idempotency key.

## 9. Examples

- PHP: `examples/operator-ingest-monthly-return.php`
- PHP: `examples/operator-ingest-document-upload.php`
- PHP: `examples/operator-ingest-ticket-event.php`
- PHP: `examples/operator-ingest-payment-event.php`
- Demo: `scripts/demo-live-feed.sh`
- Postman: `docs/postman/gra-ingest-api.json`

## 10. Pilot operator (first integration)

Map the operator’s monthly export fields to the ingest schema. For real-time visibility, call ticket/payment event endpoints after each purchase (see PHP examples for HMAC signing).

Integration kit: `integrations/operator/` — copy `GraIngestService.php` into the operator app; use `patch-operator-payment-controller.sh` with `OPERATOR_APP_ROOT` set to the operator PHP root on the server.
