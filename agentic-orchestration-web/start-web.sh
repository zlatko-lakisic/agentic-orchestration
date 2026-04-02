#!/usr/bin/env bash
set -euo pipefail

RESTART_DELAY_SECONDS="${RESTART_DELAY_SECONDS:-2}"

ensure_install() {
  if [[ ! -d "node_modules" ]]; then
    echo "[web] node_modules missing -> npm install"
    npm install
  fi
}

echo "[web] starting agentic-orchestration-web (auto-restart)"
echo "[web] cwd: $(pwd)"

while true; do
  set +e
  ensure_install
  echo "[web] npm start"
  npm start
  code=$?
  set -e
  echo "[web] server exited (code=$code)"
  sleep "$RESTART_DELAY_SECONDS"
  echo "[web] restarting..."
done

