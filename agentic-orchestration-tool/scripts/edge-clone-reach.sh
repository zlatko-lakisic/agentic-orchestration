#!/usr/bin/env bash
# Clone or update agentic-orchestration-reach for edge smoke tests.
set -eu

REACH_DIR="${REACH_DIR:-/mnt/nvme/projects/agentic-orchestration-reach}"
REACH_REPO="${REACH_REPO:-https://github.com/zlatko-lakisic/agentic-orchestration-reach.git}"
REACH_BRANCH="${REACH_BRANCH:-main}"

REACH_RUNNER="${REACH_DIR}/python/ao_reach/mock_client_runner.py"
ALT_RUNNER="/var/projects/agentic-orchestration-reach/python/ao_reach/mock_client_runner.py"

if [[ -f "${REACH_RUNNER}" ]]; then
  echo "=== Reach repo present at ${REACH_DIR}; pulling ${REACH_BRANCH} ==="
  git -C "${REACH_DIR}" fetch origin
  git -C "${REACH_DIR}" pull origin "${REACH_BRANCH}" || true
  exit 0
fi

if [[ -f "${ALT_RUNNER}" ]]; then
  echo "=== Reach repo present at /var/projects/agentic-orchestration-reach; skipping clone ==="
  exit 0
fi

echo "=== Cloning Reach repo to ${REACH_DIR} ==="
mkdir -p "$(dirname "${REACH_DIR}")"
git clone --depth 1 --branch "${REACH_BRANCH}" "${REACH_REPO}" "${REACH_DIR}"
