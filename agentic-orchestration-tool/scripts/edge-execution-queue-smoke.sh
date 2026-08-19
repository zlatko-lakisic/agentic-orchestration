#!/usr/bin/env bash
# Edge validation for global execution queue (Ada / Jetson).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"

AO_WS_URL="${AO_WS_URL:-http://127.0.0.1:8765}"
AO_APP_ID="${AO_APP_ID:-mock-comstar}"

echo "== edge-execution-queue-smoke =="
echo "AO_WS_URL=${AO_WS_URL}"
echo "AGENTIC_EXECUTION_QUEUE_ENABLED=${AGENTIC_EXECUTION_QUEUE_ENABLED:-0}"

if ! curl -sf "${AO_WS_URL%/}/api/ping" >/dev/null; then
  echo "FAIL: AO engine not reachable at ${AO_WS_URL}" >&2
  exit 1
fi

STATUS_URL="${AO_WS_URL%/}/api/agentic/execution-queue/status"
echo "GET ${STATUS_URL}"
if ! curl -sf "${STATUS_URL}" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'pending' in d and 'active' in d"; then
  echo "FAIL: execution-queue status missing pending/active keys" >&2
  exit 1
fi
echo "PASS: execution-queue status endpoint"

RUNNER="${REPO_ROOT}/../agentic-orchestration-reach/python/ao_reach/mock_client_runner.py"
if [[ -f "${RUNNER}" ]]; then
  echo "Reach simulator: concurrent low + realtime (best-effort)"
  python3 "${RUNNER}" \
    --base-url "${AO_WS_URL}" \
    --app-id "${AO_APP_ID}" \
    --profile mock-comstar \
    --priority-realtime-smoke || true
fi

if command -v kubectl >/dev/null 2>&1; then
  kubectl get deploy agentic-warm-pool -o wide 2>/dev/null || true
fi

echo "PASS: edge execution-queue smoke"
