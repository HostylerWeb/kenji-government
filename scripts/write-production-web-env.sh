#!/usr/bin/env bash
# Write apps/web/.env.local for production — never use localhost.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONSOLE_DOMAIN="${CONSOLE_DOMAIN:-console.force42.com}"
API_URL="https://${CONSOLE_DOMAIN}/api"

if [[ "${FORCE_PRODUCTION_WEB_ENV:-}" != "1" ]]; then
  case "$(hostname -s 2>/dev/null || hostname)" in
    srv*|vps*|production*) ;;
    *)
      echo "write-production-web-env: run on the VPS only, or set FORCE_PRODUCTION_WEB_ENV=1" >&2
      exit 1
      ;;
  esac
fi

if [[ "$API_URL" == *"localhost"* ]] || [[ "$API_URL" == *"127.0.0.1"* ]]; then
  echo "write-production-web-env: refusing localhost API URL (${API_URL})" >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  local file="$2"
  if [[ -f "$file" ]]; then
    grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true
  fi
}

MAPBOX_TOKEN="$(read_env_value NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN "$ROOT_DIR/.env")"
if [[ -z "$MAPBOX_TOKEN" ]]; then
  MAPBOX_TOKEN="$(read_env_value NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN "$ROOT_DIR/apps/web/.env.local")"
fi

SESSION_IDLE_MS="$(read_env_value NEXT_PUBLIC_SESSION_IDLE_MS "$ROOT_DIR/.env")"
SESSION_IDLE_MS="${SESSION_IDLE_MS:-1800000}"

mkdir -p "$ROOT_DIR/apps/web"
cat > "$ROOT_DIR/apps/web/.env.local" <<ENV
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_SESSION_IDLE_MS=${SESSION_IDLE_MS}
NEXT_PUBLIC_AUTH_EMAIL_OTP_DISABLED=true
NEXT_PUBLIC_AUTH_MFA_DISABLED=true
ENV

if [[ -n "$MAPBOX_TOKEN" ]]; then
  echo "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=${MAPBOX_TOKEN}" >> "$ROOT_DIR/apps/web/.env.local"
fi

# Keep root .env aligned (used by some tooling; must not point web clients at localhost).
if [[ -f "$ROOT_DIR/.env" ]]; then
  if grep -q '^NEXT_PUBLIC_API_URL=' "$ROOT_DIR/.env"; then
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=\"${API_URL}\"|" "$ROOT_DIR/.env"
  else
    echo "NEXT_PUBLIC_API_URL=\"${API_URL}\"" >> "$ROOT_DIR/.env"
  fi
fi

echo "Wrote production web env: NEXT_PUBLIC_API_URL=${API_URL}"
