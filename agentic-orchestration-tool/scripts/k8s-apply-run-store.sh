#!/usr/bin/env bash
# Apply namespace + shared run-store PVC (filestore or nfs).
# Set AGENTIC_K8S_RUN_STORE_VOLUME=filestore|nfs (default: nfs).
set -euo pipefail

TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ROOT="${TOOL_ROOT}/deploy/k8s"

if [[ -f "${TOOL_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${TOOL_ROOT}/.env"
  set +a
fi

VOLUME="${AGENTIC_K8S_RUN_STORE_VOLUME:-nfs}"
VOLUME="${VOLUME,,}"
if [[ "${VOLUME}" != "filestore" && "${VOLUME}" != "nfs" && "${VOLUME}" != "hostpath" ]]; then
  echo "AGENTIC_K8S_RUN_STORE_VOLUME must be 'hostpath', 'filestore', or 'nfs', got '${VOLUME}'" >&2
  exit 1
fi

echo "Applying namespace ..."
kubectl apply -k "${DEPLOY_ROOT}/base"

if [[ "${VOLUME}" == "hostpath" ]]; then
  echo "Applying hostPath run store (kind local bind mount) ..."
  kubectl apply -k "${DEPLOY_ROOT}/run-store/hostpath"
  exit 0
fi

if [[ "${VOLUME}" == "nfs" ]]; then
  echo "Applying NFS run store (kind/local) ..."
  kubectl apply -k "${DEPLOY_ROOT}/run-store/nfs"
  exit 0
fi

NETWORK="${AGENTIC_K8S_FILESTORE_NETWORK:-default}"
TIER="${AGENTIC_K8S_FILESTORE_TIER:-standard}"
SC_PATH="${DEPLOY_ROOT}/run-store/filestore/storageclass.yaml"

echo "Applying Filestore StorageClass (network=${NETWORK} tier=${TIER}) ..."
sed -e "s/__FILESTORE_NETWORK__/${NETWORK}/g" \
    -e "s/__FILESTORE_TIER__/${TIER}/g" \
    "${SC_PATH}" | kubectl apply -f -

echo "Applying Filestore PVC (1 TiB RWX) ..."
kubectl apply -f "${DEPLOY_ROOT}/run-store/filestore/pvc.yaml"
