#!/usr/bin/env bash
set -euo pipefail

RESTART_DELAY_SECONDS="${RESTART_DELAY_SECONDS:-2}"

ensure_install() {
  if [[ ! -d "node_modules" ]]; then
    # Services (see install-web-systemd.sh) install at install time and must not fetch packages
    # on every start.
    if [[ "${AGENTIC_WEB_SKIP_NPM_INSTALL:-0}" == "1" ]]; then
      echo "[web] node_modules missing and AGENTIC_WEB_SKIP_NPM_INSTALL=1 — run: npm ci --omit=dev" >&2
      return 1
    fi
    # Lockfile-pinned install (npm ci), never a floating `npm install`.
    echo "[web] node_modules missing -> npm ci"
    npm ci --omit=dev --no-audit --no-fund
  fi
}

echo "[web] starting agentic-orchestration-web (auto-restart)"
echo "[web] cwd: $(pwd)"

while true; do
  set +e
  if ensure_install; then
    echo "[web] npm start"
    npm start
    code=$?
  else
    code=1
  fi
  set -e
  echo "[web] server exited (code=$code)"
  sleep "$RESTART_DELAY_SECONDS"
  echo "[web] restarting..."
done

