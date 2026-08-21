#!/usr/bin/env bash
# Stop detached GRA dev servers started by dev-persistent.sh
set -euo pipefail

stop_one() {
  local name="$1"
  local port="$2"
  local pidfile="/tmp/kenji-government-dev/${name}.pid"

  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "→ Stopping ${name} (pid ${pid})…"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi

  if ss -tln 2>/dev/null | rg -q ":${port} "; then
    echo "→ Freeing port ${port}…"
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi

  echo "✓ ${name} stopped"
}

stop_one "api" 4000
stop_one "web" 3000
