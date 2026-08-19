#!/usr/bin/env bash
# Edge validation for custom-tool sandbox + tunnel fallback (Ada / Jetson).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"

AO_WS_URL="${AO_WS_URL:-http://127.0.0.1:8765}"
AO_APP_ID="${AO_APP_ID:-mock-comstar}"
SANDBOX_FLAG="${AGENTIC_CUSTOM_TOOL_SANDBOX:-0}"

echo "== edge-custom-tool-smoke =="
echo "AO_WS_URL=${AO_WS_URL}"
echo "AGENTIC_CUSTOM_TOOL_SANDBOX=${SANDBOX_FLAG}"

if ! curl -sf "${AO_WS_URL%/}/api/ping" >/dev/null; then
  echo "FAIL: AO engine not reachable at ${AO_WS_URL}" >&2
  exit 1
fi

RUNNER="${REPO_ROOT}/../agentic-orchestration-reach/python/ao_reach/mock_client_runner.py"
if [[ ! -f "${RUNNER}" ]]; then
  echo "SKIP: mock_client_runner not found at ${RUNNER}" >&2
  exit 0
fi

python3 "${RUNNER}" \
  --base-url "${AO_WS_URL}" \
  --app-id "${AO_APP_ID}" \
  --profile mock-comstar \
  --sandbox-flag "${SANDBOX_FLAG}"

echo "PASS: edge custom-tool smoke"
