# ByAnyDream → GRA real-time integration audit (Phase 4.6)

**Date:** 2026-08-18  
**Repo path (VPS):** `/var/www/byanydream`  
**Stack:** CodeIgniter 4, PHP, MySQL (`byanydream`), Redis cache

## Ticket purchase flow

| Step | Location | Notes |
|------|----------|-------|
| Checkout UI | `public/checkout.php` | User initiates payment |
| Order API | `app/Controllers/Api/OrderController.php` | Creates order, reserves tickets |
| Payment API | `app/Controllers/Api/PaymentController.php` | `processPayment()` — wallet/card completion |
| Ticket linking | `PaymentController::generateTickets()` | Marks reserved tickets `purchased`, links `order_id` |
| CashFlows webhook | `PaymentController::cashflowsWebhook()` | Async completion for card payments |
| Payment verify | `PaymentController::verify()` | Provider callback verification |

**Hook point:** After order `status = completed` and tickets generated — same pattern as Klaviyo `trackPurchaseEvent`.

## Payment completion flow

| Path | Method | When |
|------|--------|------|
| Wallet / free / immediate card | `processPayment()` | `transCommit` after `generateTickets()` |
| CashFlows card | `cashflowsWebhook()` | `paymentStatus === success` and `$isNewCompletion` |
| Provider verify | `verify()` | Order not already completed |

## Integration implemented

- **Service:** `app/Services/GraIngestService.php` (from `integrations/byanydream/GraIngestService.php`)
- **Hooks:** `PaymentController::emitGraLiveEvents()` called from all three completion paths
- **Failed payments:** `emitPaymentFailed()` on CashFlows webhook failure statuses
- **Auth:** HMAC-SHA256 + API key → GRA ingest `POST /v1/events/ticket` and `/events/payment`

## Configuration (ByAnyDream `.env`)

```env
GRA_INGEST_ENABLED=true
GRA_INGEST_URL=http://127.0.0.1:4001/v1
GRA_API_KEY=gra_sandbox_op001_devkey0001
GRA_HMAC_SECRET=sandbox_hmac_op001_secret_32chars_min
GRA_OPERATOR_EXTERNAL_ID=op-001
```

On VPS production, set `GRA_INGEST_URL` to the deployed ingest API (e.g. `https://ingest.<gra-domain>/v1`).

## E2E verification

**Local:** `./scripts/e2e-live-feed-test.sh` (ingest + staff API + Redis required)

**Production:** Purchase on ByAnyDream → GRA dashboard live ticker updates within seconds when ingest API is reachable.
