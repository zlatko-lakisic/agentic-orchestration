#!/usr/bin/env bash
# kind cluster e2e: hostPath PVC + stub worker Jobs (no LLM). Used by GitHub/GitLab CI.
set -euo pipefail

TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${TOOL_ROOT}"

RUN_STORE="${AGENTIC_RUN_STORE_PATH:-/tmp/agentic-run-store}"
WORKER_IMAGE="${AGENTIC_K8S_WORKER_IMAGE:-agentic-orchestrator-worker-stub:ci}"
CLUSTER_NAME="${AGENTIC_KIND_CLUSTER_NAME:-agentic}"

export AGENTIC_KIND_E2E=1
export AGENTIC_KIND_RECREATE=1
export AGENTIC_KIND_USE_CI_CONFIG=1
export AGENTIC_RUN_STORE_PATH="${RUN_STORE}"
export AGENTIC_K8S_RUN_STORE_HOST_PATH="${RUN_STORE}"
export AGENTIC_K8S_RUN_STORE_VOLUME=hostpath
export AGENTIC_EXECUTION_BACKEND=kubernetes
export AGENTIC_K8S_WORKER_IMAGE="${WORKER_IMAGE}"
export AGENTIC_K8S_NAMESPACE=agentic-orchestration
export AGENTIC_K8S_RUN_STORE_PVC=agentic-run-store
export AGENTIC_K8S_RUN_STORE_MOUNT=/run/store
export OPENAI_API_KEY="${OPENAI_API_KEY:-test-key-for-kind-e2e}"

mkdir -p "${RUN_STORE}"

if ! command -v kind >/dev/null 2>&1; then
  KIND_VERSION="${KIND_VERSION:-v0.27.0}"
  curl -fsSL "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-$(uname)-amd64" -o /usr/local/bin/kind
  chmod +x /usr/local/bin/kind
fi

bash scripts/k8s-kind-up.sh
bash scripts/k8s-apply-run-store.sh

kubectl delete pod run-store-probe -n agentic-orchestration --ignore-not-found
kubectl apply -f deploy/k8s/run-store/probe-pod.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded \
  pod/run-store-probe -n agentic-orchestration --timeout=180s

echo "Building stub worker image ${WORKER_IMAGE} ..."
docker build -f docker/Dockerfile.worker-stub -t "${WORKER_IMAGE}" .
kind load docker-image "${WORKER_IMAGE}" --name "${CLUSTER_NAME}"

python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt

echo "Running kind kubernetes e2e test ..."
python -m pytest tests/test_kind_kubernetes_e2e.py -m kind_e2e -o 'addopts=-ra'

echo "kind kubernetes e2e OK"
