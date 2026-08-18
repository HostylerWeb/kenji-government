# Pilot operator → GRA real-time integration (Phase 4.6)

**Date:** 2026-08-18  
**Purpose:** Reference audit for the **first pilot operator** (CodeIgniter raffle platform on VPS).  
**Operator app root:** set `OPERATOR_APP_ROOT` (pilot used `/var/www/byanydream`).  
**Stack:** CodeIgniter 4, PHP, MySQL, Redis cache

Any licensed raffle operator can use the same ingest contract via `integrations/operator/GraIngestService.php`.

## Ticket purchase flow (pilot operator)

| Step | Location | Notes |
|------|----------|-------|
| Checkout UI | `public/checkout.php` | User initiates payment |
| Order API | `app/Controllers/Api/OrderController.php` | Creates order, reserves tickets |
| Payment API | `app/Controllers/Api/PaymentController.php` | `processPayment()` — wallet/card completion |
| Ticket linking | `PaymentController::generateTickets()` | Marks reserved tickets `purchased`, links `order_id` |
| CashFlows webhook | `PaymentController::cashflowsWebhook()` | Async completion for card payments |
| Payment verify | `PaymentController::verify()` | Provider callback verification |

**Hook point:** After order `status = completed` and tickets generated.

## Payment completion flow

| Path | Method | When |
|------|--------|------|
| Wallet / free / immediate card | `processPayment()` | After `generateTickets()` |
| CashFlows card | `cashflowsWebhook()` | `paymentStatus === success` and new completion |
| Provider verify | `verify()` | Order not already completed |

## Integration implemented (GRA repo)

- **Service:** `integrations/operator/GraIngestService.php` → copy to operator `app/Services/`
- **Patch script:** `integrations/operator/patch-operator-payment-controller.sh` (set `OPERATOR_APP_ROOT`)
- **Hooks:** `PaymentController::emitGraLiveEvents()` on completion paths
- **Auth:** HMAC-SHA256 + API key → GRA ingest `POST /v1/events/ticket` and `/events/payment`

## Operator `.env` (per site)

```env
GRA_INGEST_ENABLED=true
GRA_INGEST_URL=http://127.0.0.1:4001/v1
GRA_API_KEY=<site-api-key>
GRA_HMAC_SECRET=<hmac-secret>
```

**Production:** Ticket purchase on operator site → GRA dashboard live ticker within seconds when ingest API is reachable.

## PHP examples (sandbox)

```bash
php examples/operator-ingest-ticket-event.php
php examples/operator-ingest-payment-event.php
```
