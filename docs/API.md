# GRA Operator Ingest API

Base URL (local): `http://localhost:4001/v1`

Production will use `https://ingest.<gra-domain>/v1`.

## Authentication

Every request requires three headers:

| Header | Description |
|--------|-------------|
| `X-Api-Key` | Operator site API key |
| `X-Signature` | `HMAC-SHA256` hex digest of the raw request body using the HMAC secret |
| `X-Idempotency-Key` | Unique string per logical operation (UUID recommended) |

### Signing JSON requests

```javascript
const signature = crypto
  .createHmac("sha256", hmacSecret)
  .update(rawJsonBody)
  .digest("hex");
```

### Signing multipart document uploads

For `POST /v1/documents`, sign an **empty body** (HMAC of empty string).

## Rate limiting

60 requests per minute per API key. Returns `429` when exceeded.

## Endpoints

### `GET /v1/status`

Credential and site health check. Sign an **empty body** (same as document uploads).

**Response**

```json
{
  "status": "ok",
  "site_id": "...",
  "operator_external_id": "op-001",
  "operator_name": "Safari Jackpot",
  "operator_status": "active",
  "compliance_status": "compliant",
  "api_key_prefix": "gra_sandbox"
}
```

### `POST /v1/heartbeat`

Optional liveness ping.

**Body**

```json
{
  "site_version": "1.2.0",
  "message": "ok"
}
```

### `POST /v1/returns/monthly`

Submit a monthly financial return. Stored as `ingest_events` and processed asynchronously.

**Body**

```json
{
  "reporting_year": 2026,
  "reporting_month": 7,
  "tickets_sold": 12500,
  "gross_revenue": 52000000,
  "prizes_paid": 26000000,
  "expenses": 6500000,
  "gross_gaming_revenue": 40500000,
  "tax_paid": 5000000,
  "notes": "July 2026 return"
}
```

`tax_due` is optional; defaults to `gross_gaming_revenue × 0.15`.

**Response**

```json
{
  "ingest_event_id": "...",
  "event_type": "monthly_return",
  "status": "received",
  "received_at": "2026-08-17T12:00:00.000Z",
  "processed_at": null
}
```

After worker processing, the return appears in the GRA **Submissions** queue with status `pending`.

### `POST /v1/documents`

Multipart upload: `file`, optional `title`, optional `document_type`.

`document_type` values: `trading_licence`, `registration`, `tax_certificate`, `audit_report`, `insurance`, `other`.

### `POST /v1/events/ticket`

Real-time ticket purchase or void. Processed immediately; appears on the GRA dashboard live feed within seconds.

**Body**

```json
{
  "action": "purchased",
  "ticket_id": "TKT-abc123",
  "raffle_id": "raffle-weekly-001",
  "raffle_name": "Weekly Dream Draw",
  "amount": 500,
  "currency": "KES",
  "purchased_at": "2026-08-18T10:30:00+03:00"
}
```

`action`: `purchased` | `voided`

### `POST /v1/events/payment`

Real-time payment completion or failure.

**Body**

```json
{
  "action": "completed",
  "payment_id": "PAY-xyz789",
  "amount": 500,
  "currency": "KES",
  "method": "mpesa",
  "reference": "QGH123456",
  "occurred_at": "2026-08-18T10:30:01+03:00"
}
```

`action`: `completed` | `failed`

### `POST /v1/events/operator-updated`

Operator site metadata change (e.g. maintenance mode).

**Body**

```json
{
  "field": "site_status",
  "previous_value": "online",
  "new_value": "maintenance",
  "occurred_at": "2026-08-18T10:30:00+03:00"
}
```

## Idempotency

Duplicate `X-Idempotency-Key` returns the original ingest event response without re-processing.

## Sandbox credentials (local seed)

| Field | Value |
|-------|-------|
| Operator | `op-001` (Safari Jackpot) |
| API Key | `gra_sandbox_op001_devkey0001` |
| HMAC Secret | `sandbox_hmac_op001_secret_32chars_min` |

See `docs/OPERATOR_INTEGRATION.md` for full onboarding guide.

## OpenAPI

Swagger UI: `http://localhost:4001/docs`
