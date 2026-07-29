#!/usr/bin/env bash
# Jetson wrapper: cloud anonymization Tier 1+2 smoke (recursive until green).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PY="${ROOT}/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi

export PYTHONPATH="${ROOT}${PYTHONPATH:+:$PYTHONPATH}"
export AGENTIC_ANONYMIZE_CLOUD="${AGENTIC_ANONYMIZE_CLOUD:-1}"

# Prefer local NodePort orchestrate when present (optional soft check).
if [[ -z "${SMOKE_URL:-}" ]]; then
  if curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:30487/" 2>/dev/null; then
    export SMOKE_URL="http://127.0.0.1:30487/api/v1/orchestrate"
  fi
fi

# Pull API key from k8s secret when available.
if [[ -z "${SMOKE_API_KEY:-}" ]] && command -v kubectl >/dev/null 2>&1; then
  SMOKE_API_KEY="$(
    kubectl -n agentic-orchestration get secret agentic-orchestration-env -o jsonpath='{.data.AGENTIC_ORCHESTRATE_API_KEY}' 2>/dev/null \
      | base64 -d 2>/dev/null || true
  )"
  if [[ -z "${SMOKE_API_KEY}" ]]; then
    SMOKE_API_KEY="$(
      kubectl -n agentic-orchestration get secret agentic-orchestration-env -o jsonpath='{.data.AGENTIC_CHAT_COMPLETIONS_API_KEY}' 2>/dev/null \
        | base64 -d 2>/dev/null || true
    )"
  fi
  export SMOKE_API_KEY
fi

exec "$PY" "$ROOT/scripts/smoke_cloud_anonymize.py" --until-pass "$@"
