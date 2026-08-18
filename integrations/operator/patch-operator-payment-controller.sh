#!/usr/bin/env bash
# Patch an operator app's PaymentController to emit GRA live ingest events.
# Set OPERATOR_APP_ROOT to the operator PHP app root on the server.
set -euo pipefail

OPERATOR_APP_ROOT="${OPERATOR_APP_ROOT:-/var/www/operator-app}"
FILE="${OPERATOR_APP_ROOT}/app/Controllers/Api/PaymentController.php"

if [ ! -f "$FILE" ]; then
  echo "PaymentController not found at: $FILE"
  echo "Set OPERATOR_APP_ROOT to your operator application root."
  exit 1
fi

if grep -q "emitGraLiveEvents" "$FILE"; then
  echo "Already patched."
  exit 0
fi

export PATCH_FILE="$FILE"

python3 <<'PY'
import os
from pathlib import Path

path = Path(os.environ["PATCH_FILE"])
text = path.read_text()

helper = '''
    /**
     * Notify GRA regulatory ingest API of completed order (real-time live feed).
     */
    private function emitGraLiveEvents(int $orderId): void
    {
        try {
            $gra = new \\App\\Services\\GraIngestService();
            $gra->emitOrderCompleted($orderId);
        } catch (\\Throwable $e) {
            log_message('error', "[GRA Ingest] emitGraLiveEvents failed for order {$orderId}: " . $e->getMessage());
        }
    }

'''

marker = "    private function generateTickets($order)"
if marker not in text:
    raise SystemExit("generateTickets marker not found")
text = text.replace(marker, helper + marker, 1)

replacements = [
    (
        "                log_message('error', \"Error tracking Klaviyo purchase event for order {$orderId}: \" . $e->getMessage());\n            }\n            \n            return $this->respond([",
        "                log_message('error', \"Error tracking Klaviyo purchase event for order {$orderId}: \" . $e->getMessage());\n            }\n\n            $this->emitGraLiveEvents($orderId);\n            \n            return $this->respond([",
    ),
    (
        "                        log_message('info', 'CashFlows Webhook: Payment completed for order ' . $orderId);",
        "                        log_message('info', 'CashFlows Webhook: Payment completed for order ' . $orderId);\n                        $this->emitGraLiveEvents($orderId);",
    ),
    (
        "                        log_message('info', 'CashFlows Webhook: Payment failed for order ' . $orderId . ' with status ' . $paymentStatus);",
        "                        log_message('info', 'CashFlows Webhook: Payment failed for order ' . $orderId . ' with status ' . $paymentStatus);\n\n                        try {\n                            $gra = new \\App\\Services\\GraIngestService();\n                            $gra->emitPaymentFailed($orderId, $paymentStatus);\n                        } catch (\\Throwable $e) {\n                            log_message('error', '[GRA Ingest] emitPaymentFailed: ' . $e->getMessage());\n                        }",
    ),
    (
        "        return $this->successResponse(null, 'Payment verified successfully');",
        "        $this->emitGraLiveEvents((int) $orderId);\n\n        return $this->successResponse(null, 'Payment verified successfully');",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"Patch anchor not found: {old[:60]}...")
    text = text.replace(old, new, 1)

path.write_text(text)
print("PaymentController patched successfully.")
PY
