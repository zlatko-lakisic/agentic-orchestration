#!/usr/bin/env bash
set -eu
PROJECT_ROOT=/var/projects/agentic-orchestration
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
RUN_STORE_HOST=/var/lib/agentic/run-store
WORKER_IMAGE=agentic-orchestrator-worker:local
COORDINATOR_IMAGE=agentic-orchestrator-coordinator:local
ENV_FILE="${TOOL_ROOT}/.env"
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

APPLY_ENV="${TOOL_ROOT}/scripts/jetson-apply-env.sh"
if [[ -f "${APPLY_ENV}" ]]; then
  bash "${APPLY_ENV}"
fi

FIX_SCRIPT="${TOOL_ROOT}/scripts/jetson-fix-ollama-k8s.sh"
if [[ -f "${FIX_SCRIPT}" ]]; then
  if [[ "$(id -u)" -eq 0 ]]; then
    bash "${FIX_SCRIPT}"
  else
    echo "Hint: run sudo bash ${FIX_SCRIPT} if planner gets Ollama connection refused" >&2
  fi
fi

SECRET_TMP="$(mktemp)"
{
  grep -v '^#' "${ENV_FILE}" | grep '=' || true
  cat <<ENVEOF
AGENTIC_EXECUTION_BACKEND=kubernetes
AGENTIC_RUN_STORE_PATH=${RUN_STORE_HOST}
AGENTIC_K8S_RUN_STORE_VOLUME=hostpath
AGENTIC_K8S_RUN_STORE_HOST_PATH=${RUN_STORE_HOST}
AGENTIC_K8S_WORKER_IMAGE=${WORKER_IMAGE}
AGENTIC_K8S_NAMESPACE=agentic-orchestration
AGENTIC_K8S_RUN_STORE_PVC=agentic-run-store
AGENTIC_K8S_RUN_STORE_MOUNT=/run/store
AGENTIC_K8S_ENV_SECRET=agentic-orchestrator-env
AGENTIC_K8S_WARM_POOL_ENABLED=1
AGENTIC_K8S_DELEGATION_ENABLED=1
AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url,filesystem_local
AGENTIC_MCP_FETCH_ENABLED=1
FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace
AGENTIC_LOG_FORMAT=json
ENVEOF
} | awk -F= '{
  line=$0
  sub(/\r$/, "", line)
  if (line ~ /^[[:space:]]*#/ || line !~ /=/) next
  key=line
  sub(/=.*$/, "", key)
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
  if (key == "") next
  if (!(key in order)) order[++n]=key
  vals[key]=line
} END { for (i=1;i<=n;i++) print vals[order[i]] }' > "${SECRET_TMP}"

kubectl create secret generic agentic-orchestrator-env \
  -n agentic-orchestration \
  --from-env-file="${SECRET_TMP}" \
  --dry-run=client -o yaml | kubectl apply -f -
rm -f "${SECRET_TMP}"

echo "Building coordinator image..."
docker build -f "${TOOL_ROOT}/docker/Dockerfile.coordinator" \
  -t "${COORDINATOR_IMAGE}" "${PROJECT_ROOT}"

echo "Building worker image..."
docker build -f "${TOOL_ROOT}/docker/Dockerfile.worker" \
  -t "${WORKER_IMAGE}" "${TOOL_ROOT}"

kubectl rollout restart deployment/agentic-coordinator -n agentic-orchestration
kubectl rollout restart deployment/agentic-warm-pool -n agentic-orchestration
kubectl rollout restart deployment/agentic-delegation-broker -n agentic-orchestration

kubectl rollout status deployment/agentic-coordinator -n agentic-orchestration --timeout=600s
kubectl rollout status deployment/agentic-warm-pool -n agentic-orchestration --timeout=300s
kubectl rollout status deployment/agentic-delegation-broker -n agentic-orchestration --timeout=300s

echo "Deploy complete"
