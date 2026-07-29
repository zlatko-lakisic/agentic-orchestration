#!/usr/bin/env bash
# Jetson wrapper: unified impartial QA gate (v1) smoke.
# Offline by default; set AGENTIC_SMOKE_IMPARTIAL_LIVE=1 to score a fixture with the real judge.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi

export PYTHONPATH="${ROOT}${PYTHONPATH:+:$PYTHONPATH}"
# Never let a smoke run inherit a live gate that would exit the process non-zero.
export AGENTIC_IMPARTIAL_QA_FAIL=0

exec "$PY" "$ROOT/scripts/smoke_impartial_qa.py" "$@"
