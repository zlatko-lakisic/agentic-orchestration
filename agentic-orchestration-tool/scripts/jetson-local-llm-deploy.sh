#!/usr/bin/env bash
set -euo pipefail
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

# One generator for the Secret (same script the routine deploy uses).
PROJECT_ROOT="${PROJECT_ROOT}" RUN_STORE_HOST="${RUN_STORE_HOST}" WORKER_IMAGE="${WORKER_IMAGE}" \
  AGENTIC_SECRET_SKIP_APPLY_ENV=1 \
  bash "${TOOL_ROOT}/scripts/jetson-sync-k8s-secret.sh" --no-restart

echo "Building coordinator image..."
docker build -f "${TOOL_ROOT}/docker/Dockerfile.coordinator" \
  -t "${COORDINATOR_IMAGE}" "${PROJECT_ROOT}"

echo "Building worker image..."
docker build -f "${TOOL_ROOT}/docker/Dockerfile.worker" \
  -t "${WORKER_IMAGE}" "${TOOL_ROOT}"

HOSTPROC_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/host-metrics-hostproc-patch.yaml"
if [[ -f "${HOSTPROC_PATCH}" ]]; then
  echo "Applying host /proc mount for web UI resource metrics..."
  kubectl patch deployment agentic-coordinator -n agentic-orchestration --patch-file "${HOSTPROC_PATCH}"
fi

kubectl rollout restart deployment/agentic-coordinator -n agentic-orchestration
kubectl rollout restart deployment/agentic-warm-pool -n agentic-orchestration
kubectl rollout restart deployment/agentic-delegation-broker -n agentic-orchestration

kubectl rollout status deployment/agentic-coordinator -n agentic-orchestration --timeout=600s
kubectl rollout status deployment/agentic-warm-pool -n agentic-orchestration --timeout=300s
kubectl rollout status deployment/agentic-delegation-broker -n agentic-orchestration --timeout=300s

echo "Deploy complete"
