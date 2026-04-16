#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pidfile="$here/.web-server.pid"

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

load_dotenv
PORT="${AGENTIC_WEB_PORT:-3847}"

kill_port_if_requested() {
  if [[ "${AGENTIC_WEB_KILL_PORT:-}" != "1" ]]; then
    return 0
  fi
  if ! command -v fuser >/dev/null 2>&1; then
    echo "[web-bg] AGENTIC_WEB_KILL_PORT=1 but fuser not found (install package psmisc)." >&2
    return 0
  fi
  echo "[web-bg] AGENTIC_WEB_KILL_PORT=1 -> freeing TCP port ${PORT}"
  fuser -k "${PORT}/tcp" 2>/dev/null || true
}

if [[ ! -f "$pidfile" ]]; then
  echo "[web-bg] no pid file found ($pidfile)."
  kill_port_if_requested
  exit 0
fi

pid="$(cat "$pidfile" 2>/dev/null || true)"
if [[ -z "$pid" ]]; then
  echo "[web-bg] pid file empty; removing."
  rm -f "$pidfile"
  kill_port_if_requested
  exit 0
fi

if kill -0 "$pid" 2>/dev/null; then
  kill "$pid" 2>/dev/null || true
  echo "[web-bg] stopped pid=$pid"
else
  echo "[web-bg] process not running (pid=$pid)"
fi

rm -f "$pidfile"

echo "[web-bg] If something still answers on the web port: pgrep -af 'server\\.mjs'  or  AGENTIC_WEB_KILL_PORT=1 $0"

kill_port_if_requested
