#!/usr/bin/env bash
set -eu
TOOL_ROOT=/var/projects/agentic-orchestration/agentic-orchestration-tool
RUN_STORE_HOST=/var/lib/agentic/run-store
WORKER_IMAGE=agentic-orchestrator-worker:local
ENV_FILE="${TOOL_ROOT}/.env"
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
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
OLLAMA_HOST=http://host.k3s.internal:11434
ENVEOF
} | awk -F= '{key=$1; if (!(key in order)) order[++n]=key; vals[key]=$0} END{for (i=1;i<=n;i++) print vals[order[i]]}' > "${SECRET_TMP}"
kubectl create secret generic agentic-orchestrator-env \
  -n agentic-orchestration \
  --from-env-file="${SECRET_TMP}" \
  --dry-run=client -o yaml | kubectl apply -f -
rm -f "${SECRET_TMP}"
kubectl rollout restart deployment/agentic-coordinator deployment/agentic-warm-pool deployment/agentic-delegation-broker -n agentic-orchestration
kubectl rollout status deployment/agentic-coordinator -n agentic-orchestration --timeout=300s
