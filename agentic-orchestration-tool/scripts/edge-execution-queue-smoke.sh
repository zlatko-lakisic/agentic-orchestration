#!/usr/bin/env bash
# Edge validation for global execution queue (Ada / Jetson).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"

AO_WS_URL="${AO_WS_URL:-https://127.0.0.1:8765}"
AO_APP_ID="${AO_APP_ID:-mock-comstar}"

echo "== edge-execution-queue-smoke =="
echo "AO_WS_URL=${AO_WS_URL}"
echo "AO_APP_ID=${AO_APP_ID}"

CURL_OPTS=(-sf)
if [[ "${AO_WS_URL}" == https://* ]] || [[ "${AO_INSECURE:-1}" == "1" ]]; then
  CURL_OPTS=(-k -sf)
fi

_queue_enabled_hint() {
  if [[ -f "${TOOL_ROOT}/.env" ]]; then
    grep -E '^AGENTIC_EXECUTION_QUEUE_ENABLED=' "${TOOL_ROOT}/.env" 2>/dev/null || true
    return
  fi
  if command -v kubectl >/dev/null 2>&1; then
    kubectl get secret agentic-env -o jsonpath='{.data.AGENTIC_EXECUTION_QUEUE_ENABLED}' 2>/dev/null \
      | python3 -c "import base64,sys; b=sys.stdin.read().strip(); print('AGENTIC_EXECUTION_QUEUE_ENABLED='+base64.b64decode(b).decode() if b else '')" 2>/dev/null \
      || true
  fi
}
_queue_enabled_hint | head -1 || echo "AGENTIC_EXECUTION_QUEUE_ENABLED=(unknown)"

if ! curl "${CURL_OPTS[@]}" "${AO_WS_URL%/}/api/ping" >/dev/null; then
  echo "FAIL: AO engine not reachable at ${AO_WS_URL}" >&2
  exit 1
fi
echo "PASS: engine /api/ping"

STATUS_URL="${AO_WS_URL%/}/api/agentic/execution-queue/status"
echo "GET ${STATUS_URL}"
if ! curl "${CURL_OPTS[@]}" "${STATUS_URL}" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'pending' in d and 'active' in d"; then
  echo "FAIL: execution-queue status missing pending/active keys" >&2
  exit 1
fi
echo "PASS: execution-queue status endpoint"

_resolve_reach_repo() {
  if [[ -n "${REACH_REPO:-}" ]] && [[ -f "${REACH_REPO}/python/ao_reach/mock_client_runner.py" ]]; then
    echo "${REACH_REPO}"
    return 0
  fi
  local candidates=(
    "${REPO_ROOT}/../agentic-orchestration-reach"
    "/mnt/nvme/projects/agentic-orchestration-reach"
    "/var/projects/agentic-orchestration-reach"
  )
  for dir in "${candidates[@]}"; do
    if [[ -f "${dir}/python/ao_reach/mock_client_runner.py" ]]; then
      echo "${dir}"
      return 0
    fi
  done
  return 1
}

if REACH_ROOT="$(_resolve_reach_repo)"; then
  RUNNER="${REACH_ROOT}/python/ao_reach/mock_client_runner.py"
  echo "Reach simulator: concurrent low + realtime (best-effort)"
  python3 "${RUNNER}" \
    --base-url "${AO_WS_URL}" \
    --profile "${AO_APP_ID}" \
    --tunnel-only || true
else
  echo "SKIP: Reach mock_client_runner not found (clone agentic-orchestration-reach beside AO repo)"
fi

if command -v kubectl >/dev/null 2>&1; then
  kubectl get deploy agentic-warm-pool -o wide 2>/dev/null || true
fi

echo "PASS: edge execution-queue smoke"
