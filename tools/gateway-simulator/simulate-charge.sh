#!/usr/bin/env bash
# Simulates payment gateway: applies test card rules, then notifies GRA ingest.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INGEST_URL="${GRA_INGEST_URL:-http://localhost:4001/v1}"
API_KEY="${GRA_API_KEY:-gra_sandbox_op001_devkey0001}"
HMAC_SECRET="${GRA_HMAC_SECRET:-sandbox_hmac_op001_secret_32chars_min}"
TAX_RATE="${TAX_RATE:-0.30}"

AMOUNT="${1:-100}"
CARD="${2:-4242424242424242}"
TICKET_REF="${3:-TKT-DEMO-$(date +%s)}"
OUTCOME="${4:-}"

notify_gra() {
  local body="$1"
  local idem_key="$2"
  local signature
  signature=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$HMAC_SECRET" | awk '{print $2}')

  curl -s -X POST "${INGEST_URL}/gateway/notify" \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: ${API_KEY}" \
    -H "X-Signature: ${signature}" \
    -H "X-Idempotency-Key: ${idem_key}" \
    -d "$body"
}

digits_only=$(printf '%s' "$CARD" | tr -cd '0-9')
last_four="${digits_only: -4}"

accepted=true
decline_reason=""

if [[ "$OUTCOME" == "reject" ]]; then
  accepted=false
  decline_reason="Forced reject (simulator)"
elif [[ "$OUTCOME" == "accept" ]]; then
  accepted=true
elif [[ "$last_four" == "0000" ]]; then
  accepted=false
  decline_reason="Card declined"
elif [[ "$last_four" == "1111" ]]; then
  accepted=false
  decline_reason="Insufficient funds"
fi

external_id="hpay-sim-$(date +%s)-$RANDOM"
idem_key="gw-sim-${external_id}"

if [[ "$accepted" == true ]]; then
  tax_amount=$(awk "BEGIN { printf \"%.2f\", $AMOUNT * $TAX_RATE }")
  operator_amount=$(awk "BEGIN { printf \"%.2f\", $AMOUNT - $tax_amount }")

  body=$(cat <<EOF
{"external_transaction_id":"${external_id}","gross_amount":${AMOUNT},"currency":"KES","status":"completed","ticket_reference":"${TICKET_REF}","tax_amount":${tax_amount},"operator_amount":${operator_amount}}
EOF
)

  echo "Gateway simulator: ACCEPT ${AMOUNT} KES (tax ${tax_amount})"
  echo "POST ${INGEST_URL}/gateway/notify"
  notify_gra "$body" "$idem_key" | jq .
else
  body=$(cat <<EOF
{"external_transaction_id":"${external_id}","gross_amount":${AMOUNT},"currency":"KES","status":"failed","decline_reason":"${decline_reason}","ticket_reference":"${TICKET_REF}"}
EOF
)

  echo "Gateway simulator: REJECT ${AMOUNT} KES — ${decline_reason}"
  echo "POST ${INGEST_URL}/gateway/notify"
  notify_gra "$body" "$idem_key" | jq .
fi
