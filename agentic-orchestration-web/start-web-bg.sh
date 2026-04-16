#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-}"
PORT="${PORT:-}"
RESTART="${RESTART:-0}"            # 1 to restart if already running

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here"

load_dotenv() {
  local envfile="$here/.env"
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
  echo "[web-bg] error: node not found on PATH. Install Node.js." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[web-bg] error: npm not found on PATH. Install Node.js (includes npm)." >&2
  exit 1
fi

load_dotenv

HOST="${HOST:-${AGENTIC_WEB_HOST:-127.0.0.1}}"
PORT="${PORT:-${AGENTIC_WEB_PORT:-3847}}"

if [[ ! -d "node_modules" ]]; then
  echo "[web-bg] node_modules missing -> npm install"
  npm install
fi

pidfile="$here/.web-server.pid"
logfile="$here/.web-server.log"

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
    echo "[web-bg] restarting pid=$pid"
    kill "$pid" 2>/dev/null || true
    sleep 1
  else
    echo "[web-bg] already running (pid=$pid). Stop it with: ./stop-web-bg.sh" >&2
    exit 0
  fi
fi

export AGENTIC_WEB_HOST="$HOST"
export AGENTIC_WEB_PORT="$PORT"

echo "[web-bg] starting detached server..."
echo "[web-bg] log: $logfile"

# Run node directly so .web-server.pid is the real server PID (stopping npm can leave node bound to the port).
nohup node server.mjs >>"$logfile" 2>&1 </dev/null &
pid="$!"
echo "$pid" >"$pidfile"

echo "[web-bg] started pid=$pid (http://$HOST:$PORT/)"

