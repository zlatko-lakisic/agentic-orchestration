#!/usr/bin/env bash
# Jetson wrapper: engine API daemon (orchestration.serve) smoke.
# Offline by default and safe without the optional serve extras (FastAPI checks skip).
# Set AGENTIC_SMOKE_SERVE_LIVE=1 to bind a real uvicorn port and probe /health.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi

export PYTHONPATH="${ROOT}${PYTHONPATH:+:$PYTHONPATH}"
# Identity stays implicit-local for the smoke run; the checks toggle it themselves.
unset AGENTIC_REQUIRE_IDENTITY || true

exec "$PY" "$ROOT/scripts/smoke_serve.py" "$@"
