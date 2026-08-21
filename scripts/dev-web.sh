#!/usr/bin/env bash
# Start the Next.js web app.
# Set CLEAN_NEXT=1 to wipe .next first (use only when chunks are stale/corrupted).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/web"
if [[ "${CLEAN_NEXT:-0}" == "1" ]]; then
  echo "CLEAN_NEXT=1 — removing apps/web/.next"
  rm -rf .next
fi
exec npx next dev --port 3000
