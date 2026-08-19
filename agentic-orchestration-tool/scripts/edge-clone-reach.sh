#!/usr/bin/env bash
# Clone or update agentic-orchestration-reach for edge smoke tests.
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${TOOL_ROOT}/.." && pwd)"

REACH_DIR="${REACH_DIR:-}"
REACH_REPO="${REACH_REPO:-https://github.com/zlatko-lakisic/agentic-orchestration-reach.git}"
REACH_BRANCH="${REACH_BRANCH:-main}"

_resolve_reach_dir() {
  if [[ -n "${REACH_DIR}" ]]; then
    echo "${REACH_DIR}"
    return 0
  fi
  local candidates=(
    "/mnt/nvme/projects/agentic-orchestration-reach"
    "${REPO_ROOT}/../agentic-orchestration-reach"
    "/var/projects/agentic-orchestration-reach"
    "${REPO_ROOT}/agentic-orchestration-reach"
    "${HOME}/agentic-orchestration-reach"
  )
  for dir in "${candidates[@]}"; do
    if [[ -f "${dir}/python/ao_reach/mock_client_runner.py" ]]; then
      echo "${dir}"
      return 0
    fi
  done
  for dir in "/mnt/nvme/projects/agentic-orchestration-reach" "${REPO_ROOT}/../agentic-orchestration-reach"; do
    local parent
    parent="$(dirname "${dir}")"
    if mkdir -p "${parent}" 2>/dev/null && [[ -w "${parent}" ]]; then
      echo "${dir}"
      return 0
    fi
  done
  echo "${REPO_ROOT}/agentic-orchestration-reach"
}

REACH_DIR="$(_resolve_reach_dir)"
REACH_RUNNER="${REACH_DIR}/python/ao_reach/mock_client_runner.py"

if [[ -f "${REACH_RUNNER}" ]]; then
  echo "=== Reach repo present at ${REACH_DIR}; pulling ${REACH_BRANCH} ==="
  git -C "${REACH_DIR}" fetch origin
  git -C "${REACH_DIR}" pull origin "${REACH_BRANCH}" || true
  exit 0
fi

echo "=== Cloning Reach repo to ${REACH_DIR} ==="
mkdir -p "$(dirname "${REACH_DIR}")"
git clone --depth 1 --branch "${REACH_BRANCH}" "${REACH_REPO}" "${REACH_DIR}"
