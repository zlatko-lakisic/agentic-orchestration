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

# Export deploy toggles from the merged .env (apply-env writes the file; this shell
# must see AGENTIC_OLLAMA_MODE / ENABLE_* for the steps below).
if [[ -f "${TOOL_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  # Only pull known toggles — avoid sourcing secrets into the script environment broadly.
  while IFS='=' read -r key val; do
    case "${key}" in
      AGENTIC_JETSON_ENABLE_ENGINE|AGENTIC_OLLAMA_MODE|AGENTIC_JETSON_ENABLE_OLLAMA|AGENTIC_OLLAMA_IMAGE|AGENTIC_OLLAMA_MODELS_HOSTPATH|AGENTIC_OLLAMA_RUNTIME_CLASS)
        # strip optional surrounding quotes
        val="${val%\"}"
        val="${val#\"}"
        val="${val%\'}"
        val="${val#\'}"
        export "${key}=${val}"
        ;;
    esac
  done < <(grep -E '^(AGENTIC_JETSON_ENABLE_ENGINE|AGENTIC_OLLAMA_MODE|AGENTIC_JETSON_ENABLE_OLLAMA|AGENTIC_OLLAMA_IMAGE|AGENTIC_OLLAMA_MODELS_HOSTPATH|AGENTIC_OLLAMA_RUNTIME_CLASS)=' "${TOOL_ROOT}/.env" || true)
  set +a
fi

bash "${TOOL_ROOT}/scripts/jetson-coordinator-rollout.sh" apply
# Ensure coordinator can stream pods/log for Admin live logs.
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
kubectl apply -n "${NS}" \
  -f "${TOOL_ROOT}/deploy/k8s/coordinator/serviceaccount.yaml" \
  -f "${TOOL_ROOT}/deploy/k8s/coordinator/role.yaml" \
  -f "${TOOL_ROOT}/deploy/k8s/coordinator/rolebinding.yaml" \
  2>/dev/null || true
bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh"
# Install the correct host GPU writer (Jetson / CUDA / AMD) before hotfix.
bash "${TOOL_ROOT}/scripts/install-host-gpu-metrics.sh" "${PROJECT_ROOT}" || true
bash "${TOOL_ROOT}/scripts/jetson-install-host-control.sh" "${PROJECT_ROOT}" || true
bash "${TOOL_ROOT}/scripts/jetson-hotfix-web.sh"

# Additive Engine API daemon (KnowBuddy /api/v1/*). Opt out with AGENTIC_JETSON_ENABLE_ENGINE=0.
# Web UI stays on :30487; daemon publishes :8765 (hostPort) + NodePort 30765.
if [[ "${AGENTIC_JETSON_ENABLE_ENGINE:-1}" != "0" ]]; then
  bash "${TOOL_ROOT}/scripts/jetson-enable-engine.sh" "${PROJECT_ROOT}"
fi

# In-cluster Ollama when managed_k8s (or AGENTIC_JETSON_ENABLE_OLLAMA=1).
# Flags are loaded from .env after jetson-apply-env.sh above.
if [[ "${AGENTIC_OLLAMA_MODE:-}" == "managed_k8s" || "${AGENTIC_JETSON_ENABLE_OLLAMA:-0}" == "1" ]]; then
  bash "${TOOL_ROOT}/scripts/jetson-enable-ollama.sh" "${PROJECT_ROOT}"
fi

PING_URL="http://127.0.0.1:30487/api/ping"
if ! curl -sf "${PING_URL}" >/dev/null 2>&1; then
  PING_URL="http://127.0.0.1/api/ping"
fi
echo "Deploy complete. Verify web: curl -s ${PING_URL}"
if [[ "${AGENTIC_JETSON_ENABLE_ENGINE:-1}" != "0" ]]; then
  echo "Verify engine (KnowBuddy Remote URL): curl -s http://127.0.0.1:8765/health"
fi
