#!/usr/bin/env bash
# Foreground web UI for this vertical (default port 3850; override with AGENTIC_WEB_PORT).
set -euo pipefail

RESTART_DELAY_SECONDS="${RESTART_DELAY_SECONDS:-2}"
EXAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "$EXAMPLE_DIR/../../.." && pwd)"
WEB_ROOT="$(cd "$TOOL_ROOT/../agentic-orchestration-web" && pwd)"

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

export AGENTIC_EXAMPLE=healthcare
export AGENTIC_TOOL_ROOT="$TOOL_ROOT"
export AGENTIC_WEB_HOST="${AGENTIC_WEB_HOST:-127.0.0.1}"
export AGENTIC_WEB_PORT="${AGENTIC_WEB_PORT:-3850}"

ensure_install() {
  if [[ ! -d "node_modules" ]]; then
    echo "[healthcare-web] node_modules missing -> npm install"
    npm install
  fi
}

echo "[healthcare-web] example=healthcare port=${AGENTIC_WEB_PORT} tool_root=${TOOL_ROOT}"
echo "[healthcare-web] web root: ${WEB_ROOT}"
cd "$WEB_ROOT"

while true; do
  set +e
  ensure_install
  echo "[healthcare-web] npm run start:healthcare"
  npm run start:healthcare
  code=$?
  set -e
  echo "[healthcare-web] server exited (code=$code)"
  sleep "$RESTART_DELAY_SECONDS"
  echo "[healthcare-web] restarting..."
done
