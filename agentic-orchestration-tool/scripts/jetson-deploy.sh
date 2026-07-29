#!/usr/bin/env bash
# Routine Jetson deploy: git pull only (never SCP), then env + k8s + hotfix.
# Run on the device as the repo owner (kubectl works without sudo):
#   bash /var/projects/agentic-orchestration/agentic-orchestration-tool/scripts/jetson-deploy.sh
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"

if [[ ! -d "${PROJECT_ROOT}/.git" ]]; then
  echo "error: ${PROJECT_ROOT} is not a git repository" >&2
  exit 1
fi

echo "=== git fetch ${GIT_REMOTE} ==="
git -C "${PROJECT_ROOT}" fetch "${GIT_REMOTE}"
echo "=== git pull ${GIT_REMOTE} ${GIT_BRANCH} ==="
git -C "${PROJECT_ROOT}" pull "${GIT_REMOTE}" "${GIT_BRANCH}"

bash "${TOOL_ROOT}/scripts/jetson-apply-env.sh"
bash "${TOOL_ROOT}/scripts/jetson-coordinator-rollout.sh" apply
bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh"
bash "${TOOL_ROOT}/scripts/jetson-hotfix-web.sh"

# Additive Engine API daemon (KnowBuddy /api/v1/*). Opt out with AGENTIC_JETSON_ENABLE_ENGINE=0.
# Web UI stays on :30487; daemon publishes :8765 (hostPort) + NodePort 30765.
if [[ "${AGENTIC_JETSON_ENABLE_ENGINE:-1}" != "0" ]]; then
  bash "${TOOL_ROOT}/scripts/jetson-enable-engine.sh" "${PROJECT_ROOT}"
fi

PING_URL="http://127.0.0.1:30487/api/ping"
if ! curl -sf "${PING_URL}" >/dev/null 2>&1; then
  PING_URL="http://127.0.0.1/api/ping"
fi
echo "Deploy complete. Verify web: curl -s ${PING_URL}"
if [[ "${AGENTIC_JETSON_ENABLE_ENGINE:-1}" != "0" ]]; then
  echo "Verify engine (KnowBuddy Remote URL): curl -s http://127.0.0.1:8765/health"
fi
