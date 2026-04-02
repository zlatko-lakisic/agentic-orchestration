#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pidfile="$here/.web-server.pid"

if [[ ! -f "$pidfile" ]]; then
  echo "[web-bg] no pid file found ($pidfile)."
  exit 0
fi

pid="$(cat "$pidfile" 2>/dev/null || true)"
if [[ -z "$pid" ]]; then
  echo "[web-bg] pid file empty; removing."
  rm -f "$pidfile"
  exit 0
fi

if kill -0 "$pid" 2>/dev/null; then
  kill "$pid" 2>/dev/null || true
  echo "[web-bg] stopped pid=$pid"
else
  echo "[web-bg] process not running (pid=$pid)"
fi

rm -f "$pidfile"

