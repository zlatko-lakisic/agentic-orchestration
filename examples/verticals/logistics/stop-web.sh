#!/usr/bin/env bash
# Stop the detached server started by start-web-bg.sh in this example directory.
set -euo pipefail

EXAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$EXAMPLE_DIR/../../.." && pwd)"
WEB_ROOT="$(cd "$REPO_ROOT/agentic-orchestration-web" && pwd)"
pidfile="$EXAMPLE_DIR/.web-server.pid"

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

load_dotenv
PORT="${AGENTIC_WEB_PORT:-3851}"

kill_port_if_requested() {
  if [[ "${AGENTIC_WEB_KILL_PORT:-}" != "1" ]]; then
    return 0
  fi
  if ! command -v fuser >/dev/null 2>&1; then
    echo "[logistics-web] AGENTIC_WEB_KILL_PORT=1 but fuser not found (install psmisc)." >&2
    return 0
  fi
  echo "[logistics-web] AGENTIC_WEB_KILL_PORT=1 -> freeing TCP port ${PORT}"
  fuser -k "${PORT}/tcp" 2>/dev/null || true
}

if [[ ! -f "$pidfile" ]]; then
  echo "[logistics-web] no pid file ($pidfile)."
  kill_port_if_requested
  exit 0
fi

pid="$(cat "$pidfile" 2>/dev/null || true)"
if [[ -z "$pid" ]]; then
  echo "[logistics-web] pid file empty; removing."
  rm -f "$pidfile"
  kill_port_if_requested
  exit 0
fi

if kill -0 "$pid" 2>/dev/null; then
  kill "$pid" 2>/dev/null || true
  echo "[logistics-web] stopped pid=$pid"
else
  echo "[logistics-web] process not running (pid=$pid)"
fi

rm -f "$pidfile"
echo "[logistics-web] If the port is still busy: AGENTIC_WEB_KILL_PORT=1 $0"
kill_port_if_requested
