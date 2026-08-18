#!/usr/bin/env bash
# Post-deploy smoke test for GRA staff console.
set -euo pipefail

BASE="${1:-http://localhost:3000}"
API="${2:-http://localhost:4000}"

echo "=== Health ==="
curl -sf "$API/health" | head -c 200
echo ""

echo "=== Login ==="
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gra.go.ke","password":"GraAdmin123!"}' | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login failed"
  exit 1
fi

echo "=== Operators ==="
curl -sf "$API/operators" -H "Authorization: Bearer $TOKEN" | jq 'length'

echo "=== Regional ==="
curl -sf "$API/regional/overview?days=7" -H "Authorization: Bearer $TOKEN" | jq '{counties: (.counties|length)}'

echo "=== Web ==="
curl -sf -o /dev/null -w "dashboard:%{http_code} regional:%{http_code}\n" "$BASE/dashboard" "$BASE/regional"

echo "=== Production smoke OK ==="
