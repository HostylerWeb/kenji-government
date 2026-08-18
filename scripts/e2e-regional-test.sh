#!/usr/bin/env bash
# E2E smoke test for Phase 6 regional & player safety APIs.
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000}"
INGEST_URL="${INGEST_URL:-http://localhost:4001/v1}"
EMAIL="${EMAIL:-analyst@gra.go.ke}"
PASSWORD="${PASSWORD:-GraAdmin123!}"

echo "=== Login ==="
TOKEN=$(curl -sf -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login failed"
  exit 1
fi

echo "=== Regional overview ==="
curl -sf "$API_URL/regional/overview?days=30" -H "Authorization: Bearer $TOKEN" \
  | jq '{counties: (.counties|length), play_safe: (.play_safe_by_county|length)}'

echo "=== County drill-down ==="
curl -sf "$API_URL/regional/counties/Nairobi?days=30" -H "Authorization: Bearer $TOKEN" \
  | jq '{county, play_safe_activations, session_count}'

echo "=== Export (no PII columns) ==="
HEADERS=$(curl -sf "$API_URL/regional/export?days=7" -H "Authorization: Bearer $TOKEN" | head -1)
echo "$HEADERS"
if echo "$HEADERS" | grep -qiE 'player|email|phone|user_id'; then
  echo "FAIL: export may contain PII column names"
  exit 1
fi

echo "=== Player safety report ==="
RUN_ID=$(curl -sf -X POST "$API_URL/reports/player_safety_aggregates/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"format":"csv"}' | jq -r '.id')

for i in 1 2 3 4 5 6 7 8 9 10; do
  STATUS=$(curl -sf "$API_URL/reports/runs/$RUN_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then break; fi
  sleep 1
done
curl -sf "$API_URL/reports/runs/$RUN_ID" -H "Authorization: Bearer $TOKEN" | jq '{status, file_path}'

echo "=== Phase 6 E2E OK ==="
