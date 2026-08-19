#!/usr/bin/env bash
# Edge validation for custom-tool sandbox + tunnel fallback (Ada / Jetson).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"

AO_WS_URL="${AO_WS_URL:-https://127.0.0.1:8765}"
AO_PROFILE="${AO_PROFILE:-mock-comstar}"
SANDBOX_FLAG="${AGENTIC_CUSTOM_TOOL_SANDBOX:-0}"

echo "== edge-custom-tool-smoke =="
echo "AO_WS_URL=${AO_WS_URL}"
echo "AO_PROFILE=${AO_PROFILE}"
echo "AGENTIC_CUSTOM_TOOL_SANDBOX=${SANDBOX_FLAG}"

CURL_OPTS=(-sf)
if [[ "${AO_WS_URL}" == https://* ]] || [[ "${AO_INSECURE:-0}" == "1" ]]; then
  CURL_OPTS=(-k -sf)
fi

if ! curl "${CURL_OPTS[@]}" "${AO_WS_URL%/}/api/ping" >/dev/null; then
  echo "FAIL: AO engine not reachable at ${AO_WS_URL}" >&2
  exit 1
fi
echo "PASS: engine /api/ping"

_resolve_reach_repo() {
  if [[ -n "${REACH_REPO:-}" ]]; then
    if [[ -f "${REACH_REPO}/python/ao_reach/mock_client_runner.py" ]]; then
      echo "${REACH_REPO}"
      return 0
    fi
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

_print_reach_clone_hint() {
  cat >&2 <<'EOF'
SKIP: agentic-orchestration-reach not found (mock_client_runner.py missing).
Clone alongside this repo, e.g.:
  git clone https://github.com/zlatko-lakisic/agentic-orchestration-reach.git \
    ../agentic-orchestration-reach
Or set REACH_REPO=/path/to/agentic-orchestration-reach
EOF
}

if ! REACH_ROOT="$(_resolve_reach_repo)"; then
  _print_reach_clone_hint
  if [[ "${SANDBOX_FLAG}" == "1" ]]; then
    echo "FAIL: sandbox smoke requires Reach repo" >&2
    exit 1
  fi
  echo "PASS: edge custom-tool smoke (ping only; Reach repo absent)"
  exit 0
fi

RUNNER="${REACH_ROOT}/python/ao_reach/mock_client_runner.py"
export PYTHONPATH="${REACH_ROOT}/python${PYTHONPATH:+:${PYTHONPATH}}"

_run_phase() {
  local label="$1"
  shift
  echo "== phase: ${label} =="
  python3 "${RUNNER}" \
    --base-url "${AO_WS_URL}" \
    --profile "${AO_PROFILE}" \
    "$@"
}

if [[ "${SANDBOX_FLAG}" == "1" ]]; then
  _run_phase "sandbox deploy"
  echo "PASS: edge custom-tool smoke (sandbox)"
else
  _run_phase "tunnel-only (legacy)" --tunnel-only
  echo "PASS: edge custom-tool smoke (tunnel-only)"
fi
