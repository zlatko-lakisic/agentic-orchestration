#!/usr/bin/env bash
# Jetson wrapper: run-store backends smoke (filesystem default, S3/MinIO, Redis).
# Offline by default — no bucket and no Redis needed. Opt into live checks with
# AGENTIC_SMOKE_RUN_STORE_S3_LIVE=1 / AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE=1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi

export PYTHONPATH="${ROOT}${PYTHONPATH:+:$PYTHONPATH}"
# The offline checks must not inherit a remote backend from the device env.
unset AGENTIC_RUN_STORE_BACKEND

exec "$PY" "$ROOT/scripts/smoke_run_store_backends.py" "$@"
