# Gateway simulator (dev)

GRA ingest no longer exposes a mock charge API. The government platform only **receives** payment notifications.

For local testing, use the external simulator:

```bash
chmod +x tools/gateway-simulator/simulate-charge.sh
./tools/gateway-simulator/simulate-charge.sh 100 4242424242424242
./tools/gateway-simulator/simulate-charge.sh 100 4111111111110000   # decline
```

See `tools/gateway-simulator/README.md` and `docs/PAYMENT_GATEWAY_PROJECT.md`.

**Production:** raffle sites → payment gateway project → `POST /v1/gateway/notify` on GRA ingest.
