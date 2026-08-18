#!/usr/bin/env bash
# Deprecated path — runs the external gateway simulator (not GRA ingest charge API).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/tools/gateway-simulator/simulate-charge.sh" "$@"
