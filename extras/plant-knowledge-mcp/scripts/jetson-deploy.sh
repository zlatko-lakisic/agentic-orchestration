#!/usr/bin/env bash
# Deploy standalone plant-knowledge MCP on Jetson (git pull only — never SCP).
# Run on the device:
#   bash /var/projects/agentic-orchestration/extras/plant-knowledge-mcp/scripts/jetson-deploy.sh
set -euo pipefail

PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
EXTRA_ROOT="${PROJECT_ROOT}/extras/plant-knowledge-mcp"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
IMAGE="${PLANT_KNOWLEDGE_IMAGE:-plant-knowledge-mcp:latest}"

if [[ ! -d "${PROJECT_ROOT}/.git" ]]; then
  echo "error: ${PROJECT_ROOT} is not a git repository" >&2
  exit 1
fi

echo "=== git fetch ${GIT_REMOTE} ==="
git -C "${PROJECT_ROOT}" fetch "${GIT_REMOTE}"
echo "=== git pull ${GIT_REMOTE} ${GIT_BRANCH} ==="
git -C "${PROJECT_ROOT}" pull "${GIT_REMOTE}" "${GIT_BRANCH}"

if [[ ! -d "${EXTRA_ROOT}" ]]; then
  echo "error: missing ${EXTRA_ROOT} (pull main with extras/plant-knowledge-mcp)" >&2
  exit 1
fi

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

echo "=== docker build ${IMAGE} ==="
docker build -t "${IMAGE}" "${EXTRA_ROOT}"

echo "=== kubectl apply ==="
kubectl apply -f "${EXTRA_ROOT}/k8s/deploy.yaml"
kubectl rollout status deployment/plant-knowledge-mcp -n plant-knowledge --timeout=180s

POD_IP="$(kubectl get pod -n plant-knowledge -l app.kubernetes.io/name=plant-knowledge-mcp \
  -o jsonpath='{.items[0].status.podIP}' 2>/dev/null || true)"
if [[ -n "${POD_IP}" ]]; then
  curl -sf "http://${POD_IP}:8080/healthz" >/dev/null
  echo "Deploy complete. MCP: http://plant-knowledge-mcp.plant-knowledge.svc.cluster.local:8080/mcp"
  echo "Health OK at pod ${POD_IP}:8080/healthz"
else
  echo "Deploy applied; verify: kubectl get pods -n plant-knowledge"
fi
