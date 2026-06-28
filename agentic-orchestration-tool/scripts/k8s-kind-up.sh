#!/usr/bin/env bash
# Create or reuse a local kind cluster with host run store bind-mounted at /run/store.
set -euo pipefail

TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ROOT="${TOOL_ROOT}/deploy/k8s"
CLUSTER_NAME="${AGENTIC_KIND_CLUSTER_NAME:-agentic}"

if [[ -f "${TOOL_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${TOOL_ROOT}/.env"
  set +a
fi

HOST_PATH="${AGENTIC_K8S_RUN_STORE_HOST_PATH:-${AGENTIC_RUN_STORE_PATH:-/tmp/agentic-run-store}}"
HOST_PATH="${HOST_PATH//\\//}"
mkdir -p "${HOST_PATH}"

if ! command -v kind >/dev/null 2>&1; then
  echo "kind not found on PATH; install from https://kind.sigs.k8s.io/" >&2
  exit 1
fi

if [[ "${AGENTIC_KIND_RECREATE:-}" == "1" ]]; then
  kind delete cluster --name "${CLUSTER_NAME}" 2>/dev/null || true
fi

if kind get clusters 2>/dev/null | grep -qx "${CLUSTER_NAME}"; then
  echo "kind cluster '${CLUSTER_NAME}' already exists."
else
  CONFIG_PATH="${DEPLOY_ROOT}/kind/cluster.yaml"
  if [[ "${AGENTIC_KIND_USE_CI_CONFIG:-}" == "1" ]]; then
    CONFIG_PATH="${DEPLOY_ROOT}/kind/cluster.ci.yaml"
  else
    RENDERED="$(mktemp)"
    sed "s|__RUN_STORE_HOST_PATH__|${HOST_PATH}|g" "${CONFIG_PATH}" > "${RENDERED}"
    CONFIG_PATH="${RENDERED}"
  fi
  echo "Creating kind cluster '${CLUSTER_NAME}' (host mount ${HOST_PATH} -> /run/store) ..."
  kind create cluster --name "${CLUSTER_NAME}" --config "${CONFIG_PATH}"
fi

kubectl config use-context "kind-${CLUSTER_NAME}"
echo "kubectl context: kind-${CLUSTER_NAME}"
