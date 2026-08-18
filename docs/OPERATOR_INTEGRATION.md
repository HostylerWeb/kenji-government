# Operator integration guide

This guide covers connecting an operator platform (e.g. ByAnyDream) to the GRA oversight portal for **monthly returns** and **document uploads**.

## Overview

```
Operator platform → HTTPS POST → GRA Ingest API (port 4001)
    → Redis queue (BullMQ) → Worker → submissions (monthly returns)
    → Redis pub/sub → Staff SSE → GRA dashboard live ticker (ticket events)
```

Monthly returns are queued for async processing. Real-time ticket and payment events are processed immediately and pushed to the staff console via Server-Sent Events.

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

Events appear on the GRA **Dashboard** live ticker within seconds via SSE.

Demo locally:

```bash
php examples/byanydream-ticket-event.php
./scripts/demo-live-feed.sh 5
```

## 6. Health checks

- `GET /v1/status` — verify credentials
- `POST /v1/heartbeat` — optional periodic ping

## 7. Error handling

| Code | Meaning |
|------|---------|
| 401 | Invalid API key or signature |
| 403 | Site suspended or IP blocked |
| 429 | Rate limit (60/min) |
| 400 | Invalid payload schema |

Retry transient failures with the **same** idempotency key.

## 8. Examples

- PHP: `examples/byanydream-monthly-return.php`
- PHP: `examples/byanydream-document-upload.php`
- PHP: `examples/byanydream-ticket-event.php`
- PHP: `examples/byanydream-payment-event.php`
- Demo: `scripts/demo-live-feed.sh`
- Postman: `docs/postman/gra-ingest-api.json`

## 9. ByAnyDream (pilot operator)

Map ByAnyDream monthly export fields to the ingest schema. For real-time visibility, call the ticket/payment event endpoints from ByAnyDream after each purchase (see PHP examples for HMAC signing).

Reference codebase: `/var/www/byanydream` on the VPS.
