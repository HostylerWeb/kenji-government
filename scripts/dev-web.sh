#!/usr/bin/env bash
# Start the Next.js web app with a clean .next cache to avoid stale chunk 404s.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/web"
rm -rf .next
exec npx next dev --port 3000
