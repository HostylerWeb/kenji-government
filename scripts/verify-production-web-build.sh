#!/usr/bin/env bash
# Fail if the Next.js client bundle still references localhost API.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONSOLE_DOMAIN="${CONSOLE_DOMAIN:-console.force42.com}"
CHUNKS_DIR="$ROOT_DIR/apps/web/.next/static/chunks"

if [[ ! -d "$CHUNKS_DIR" ]]; then
  echo "verify-production-web-build: no build output at $CHUNKS_DIR" >&2
  exit 1
fi

if grep -rq 'localhost:4000' "$CHUNKS_DIR" 2>/dev/null; then
  echo "verify-production-web-build: web bundle still contains localhost:4000" >&2
  exit 1
fi

if ! grep -rq "$CONSOLE_DOMAIN" "$CHUNKS_DIR" 2>/dev/null; then
  echo "verify-production-web-build: production host ${CONSOLE_DOMAIN} not found in client bundles" >&2
  exit 1
fi

echo "verify-production-web-build: OK"
