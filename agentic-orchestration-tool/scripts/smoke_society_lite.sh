#!/usr/bin/env bash
# Jetson wrapper: agent societies K6.1 (society lite) smoke.
# Offline by default; set AGENTIC_SMOKE_SOCIETY_LIVE=1 for a short real run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi

export PYTHONPATH="${ROOT}${PYTHONPATH:+:$PYTHONPATH}"
# The society controller costs an LLM call per round; the smoke run does not need it.
export AGENTIC_SOCIETY_CONTROLLER="${AGENTIC_SOCIETY_CONTROLLER:-0}"

exec "$PY" "$ROOT/scripts/smoke_society_lite.py" "$@"
