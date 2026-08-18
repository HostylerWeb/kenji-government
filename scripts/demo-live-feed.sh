#!/usr/bin/env bash
# Demo: simulate live ticket purchases for stakeholder meetings.
# Prerequisites: docker compose up, dev:api, dev:ingest, dev:web running.
#
# Usage: ./scripts/demo-live-feed.sh [count]
# Open http://localhost:3000/dashboard and watch the live ticker update.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COUNT="${1:-5}"

echo "Emitting $COUNT ticket purchase events to GRA ingest API..."
echo "Watch the dashboard live ticker at http://localhost:3000/dashboard"
echo ""

for i in $(seq 1 "$COUNT"); do
  echo "--- Event $i ---"
  php "$ROOT/examples/operator-ingest-ticket-event.php"
  sleep 2
done

echo ""
echo "Done. Check dashboard Tickets Today / Revenue Today counters."
