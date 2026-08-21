#!/usr/bin/env bash
# End-to-end test: gateway payment → oversight feed → staff counters.
# Ticket ingest is audit-only and no longer appears in the live feed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-http://localhost:4000}"

echo "== E2E oversight feed test =="
echo "Staff API: $API_URL"
echo ""

echo "1. Simulating gateway payment..."
if ! "$ROOT/tools/gateway-simulator/simulate-charge.sh" 250 4242424242424242 >/tmp/gra-e2e-gateway.log 2>&1; then
  echo "FAIL: gateway simulator"
  cat /tmp/gra-e2e-gateway.log
  exit 1
fi

TOKEN=$(curl -sf -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gra.go.ke","password":"GraAdmin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo ""
echo "2. Checking oversight activity feed..."
ACTIVITY=$(curl -sf "$API_URL/live/activity?limit=5" -H "Authorization: Bearer $TOKEN")
echo "$ACTIVITY" | python3 -m json.tool | head -25

if ! echo "$ACTIVITY" | python3 -c "
import sys, json
items = json.load(sys.stdin).get('items', [])
assert len(items) > 0, 'no items'
for item in items:
    assert not item['event_type'].startswith('ticket.'), 'ticket event in feed'
"; then
  echo "FAIL: oversight feed missing payment events or contains ticket noise"
  exit 1
fi

echo ""
echo "3. Checking counters..."
COUNTERS=$(curl -sf "$API_URL/live/counters" -H "Authorization: Bearer $TOKEN")
echo "$COUNTERS" | python3 -m json.tool

PAYMENTS=$(echo "$COUNTERS" | python3 -c "import sys,json; print(json.load(sys.stdin)['gateway_payments_today'])")
if [ "${PAYMENTS:-0}" -lt 1 ]; then
  echo "FAIL: gateway_payments_today should be >= 1"
  exit 1
fi

echo ""
echo "PASS: Oversight feed pipeline working (payments only, no tickets)."
