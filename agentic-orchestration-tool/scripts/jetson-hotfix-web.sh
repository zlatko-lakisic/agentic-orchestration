#!/usr/bin/env bash
# Hot-update web UI files in the coordinator pod without rebuilding the Docker image.
# Requires kubectl access (no sudo). Re-run after git pull when web assets change.
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WEB_ROOT="${PROJECT_ROOT}/agentic-orchestration-web"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

kubectl create configmap agentic-web-hotfix-public -n "${NS}" \
  --from-file=app.js="${WEB_ROOT}/public/app.js" \
  --from-file=index.html="${WEB_ROOT}/public/index.html" \
  --from-file=styles.css="${WEB_ROOT}/public/styles.css" \
  --from-file=host-metrics-ui.js="${WEB_ROOT}/public/host-metrics-ui.js" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap agentic-web-hotfix-root -n "${NS}" \
  --from-file=server.mjs="${WEB_ROOT}/server.mjs" \
  --from-file=host-metrics.mjs="${WEB_ROOT}/host-metrics.mjs" \
  --dry-run=client -o yaml | kubectl apply -f -

PATCH_FILE="${TOOL_ROOT}/deploy/k8s/coordinator/web-hotfix-volume-patch.yaml"
HOSTPROC_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/host-metrics-hostproc-patch.yaml"

kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${PATCH_FILE}"
if [[ -f "${HOSTPROC_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${HOSTPROC_PATCH}"
fi

kubectl rollout restart deployment/agentic-coordinator -n "${NS}"
kubectl rollout status deployment/agentic-coordinator -n "${NS}" --timeout=600s

echo "Web hotfix applied. Verify: curl -s http://127.0.0.1/api/host-metrics | head -c 200"
