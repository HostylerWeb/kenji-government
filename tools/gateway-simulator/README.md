# Gateway simulator (dev only)

Simulates the **payment gateway service** locally. It does **not** run inside GRA ingest.

**Flow:** test card rules → (accept|reject) → `POST /v1/gateway/notify` on GRA ingest.

Production raffle sites call the real gateway project; the gateway notifies GRA. Use this tool until that project exists.

## Usage

```bash
# Accept — 100 KES with test card
./tools/gateway-simulator/simulate-charge.sh 100 4242424242424242

# Decline — card ending 0000
./tools/gateway-simulator/simulate-charge.sh 100 4111111111110000
```

## Environment

| Variable | Default |
|----------|---------|
| `GRA_INGEST_URL` | `http://localhost:4001/v1` |
| `GRA_API_KEY` | `gra_sandbox_op001_devkey0001` |
| `GRA_HMAC_SECRET` | `sandbox_hmac_op001_secret_32chars_min` |
| `TAX_RATE` | `0.30` |

Same credentials as operator ingest — the gateway notifies GRA per operator site.

## Test cards

| Input | Result |
|-------|--------|
| Card ending `0000` | Failed — card declined |
| Card ending `1111` | Failed — insufficient funds |
| Other cards | Completed |

## GRA endpoint

`POST /v1/gateway/notify` — see `docs/PAYMENT_GATEWAY_PROJECT.md`.
