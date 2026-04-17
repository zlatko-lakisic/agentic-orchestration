#!/usr/bin/env bash
# Detached web UI for this vertical. PID + log live in this example directory.
set -euo pipefail

EXAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$EXAMPLE_DIR/../../.." && pwd)"
TOOL_ROOT="$(cd "$REPO_ROOT/agentic-orchestration-tool" && pwd)"
WEB_ROOT="$(cd "$REPO_ROOT/agentic-orchestration-web" && pwd)"

HOST="${HOST:-}"
PORT="${PORT:-}"
RESTART="${RESTART:-0}"

load_dotenv() {
  local envfile="$WEB_ROOT/.env"
  [[ -f "$envfile" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    [[ "${line:0:1}" == "#" ]] && continue
    [[ "$line" == *"="* ]] || continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(echo "$key" | xargs)"
    val="$(echo "$val" | xargs)"
    [[ -z "$key" ]] && continue
    if [[ -z "${!key:-}" ]]; then
      export "$key=$val"
    fi
  done <"$envfile"
}

if ! command -v node >/dev/null 2>&1; then
  echo "[logistics-web-bg] error: node not found on PATH." >&2
  exit 1
fi

load_dotenv

export AGENTIC_EXAMPLE=logistics
export AGENTIC_TOOL_ROOT="$TOOL_ROOT"
export AGENTIC_WEB_HOST="${HOST:-${AGENTIC_WEB_HOST:-127.0.0.1}}"
export AGENTIC_WEB_PORT="${PORT:-${AGENTIC_WEB_PORT:-3851}}"

cd "$WEB_ROOT"

if [[ ! -d "node_modules" ]]; then
  echo "[logistics-web-bg] node_modules missing -> npm install"
  npm install
fi

pidfile="$EXAMPLE_DIR/.web-server.pid"
logfile="$EXAMPLE_DIR/.web-server.log"

is_running() {
  [[ -f "$pidfile" ]] || return 1
  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

if is_running; then
  pid="$(cat "$pidfile")"
  if [[ "$RESTART" == "1" ]]; then
    echo "[logistics-web-bg] restarting pid=$pid"
    kill "$pid" 2>/dev/null || true
    sleep 1
  else
    echo "[logistics-web-bg] already running (pid=$pid). Stop with: $EXAMPLE_DIR/stop-web.sh" >&2
    exit 0
  fi
fi

echo "[logistics-web-bg] starting detached server..."
echo "[logistics-web-bg] log: $logfile"

nohup node server.mjs --example logistics >>"$logfile" 2>&1 </dev/null &
pid="$!"
echo "$pid" >"$pidfile"

echo "[logistics-web-bg] started pid=$pid (http://${AGENTIC_WEB_HOST}:${AGENTIC_WEB_PORT}/)"
