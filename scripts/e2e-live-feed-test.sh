#!/usr/bin/env bash
# End-to-end test: ingest ticket event → live_activity_feed → staff API counters.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-http://localhost:4000}"
INGEST_URL="${INGEST_URL:-http://localhost:4001/v1}"

echo "== E2E live feed test =="
echo "Ingest: $INGEST_URL"
echo "Staff:  $API_URL"
echo ""

# 1. Emit ticket via PHP example
echo "1. Posting ticket event..."
OUT=$(php "$ROOT/examples/byanydream-ticket-event.php")
echo "$OUT"
if ! echo "$OUT" | grep -q "HTTP 201"; then
  echo "FAIL: ingest did not return 201"
  exit 1
fi

# 2. Login staff API
TOKEN=$(curl -sf -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gra.go.ke","password":"GraAdmin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 3. Check activity feed
echo ""
echo "2. Checking live activity..."
ACTIVITY=$(curl -sf "$API_URL/live/activity?limit=1" -H "Authorization: Bearer $TOKEN")
echo "$ACTIVITY" | python3 -m json.tool | head -20

if ! echo "$ACTIVITY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d.get('items',[]))>0"; then
  echo "FAIL: no items in live activity"
  exit 1
fi

# 4. Check counters incremented
echo ""
echo "3. Checking counters..."
COUNTERS=$(curl -sf "$API_URL/live/counters" -H "Authorization: Bearer $TOKEN")
echo "$COUNTERS" | python3 -m json.tool

TICKETS=$(echo "$COUNTERS" | python3 -c "import sys,json; print(json.load(sys.stdin)['tickets_today'])")
if [ "${TICKETS:-0}" -lt 1 ]; then
  echo "FAIL: tickets_today should be >= 1"
  exit 1
fi

echo ""
echo "PASS: E2E live feed pipeline working."
