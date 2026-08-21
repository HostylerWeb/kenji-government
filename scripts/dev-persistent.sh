#!/usr/bin/env bash
# Start GRA dev servers detached from the terminal so they survive
# Cursor/agent session cleanup. Logs: /tmp/gra-api.log and /tmp/gra-web.log
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p /tmp/kenji-government-dev

is_listening() {
  local port="$1"
  ss -tln 2>/dev/null | rg -q ":${port} "
}

start_if_down() {
  local name="$1"
  local port="$2"
  local cmd="$3"
  local log="/tmp/kenji-government-dev/${name}.log"
  local pidfile="/tmp/kenji-government-dev/${name}.pid"

  if is_listening "$port"; then
    echo "✓ ${name} already running on :${port}"
    return
  fi

  echo "→ Starting ${name} on :${port}…"
  nohup bash -lc "cd '$ROOT' && $cmd" >>"$log" 2>&1 &
  echo $! >"$pidfile"

  local waited=0
  while ! is_listening "$port" && [[ $waited -lt 45 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_listening "$port"; then
    echo "✓ ${name} started (pid $(cat "$pidfile"), log: $log)"
  else
    echo "✗ ${name} failed to start — check $log"
    tail -20 "$log" || true
    exit 1
  fi
}

start_if_down "api" 4000 "npm run dev:api"
start_if_down "web" 3000 "npm run dev:web"

echo ""
echo "Staff console: http://localhost:3000"
echo "Staff API:     http://localhost:4000"
echo ""
echo "Stop with: npm run dev:stop"
echo "Logs:      tail -f /tmp/kenji-government-dev/{api,web}.log"
