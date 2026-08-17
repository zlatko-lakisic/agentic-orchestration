#!/usr/bin/env bash
# Re-apply warm-pool Deployment (fastapi bootstrap + worker entrypoint) and roll pods.
# Routine deploys patch volumes via jetson-hotfix-web.sh but never re-applied the
# base manifest — stale worker pods keep running without the litellm MCP fastapi dep.
#
# Run on Jetson after git pull:
#   bash agentic-orchestration-tool/scripts/jetson-sync-warm-pool.sh
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

WARM_YAML="${TOOL_ROOT}/deploy/k8s/warm-pool.yaml"
if [[ ! -f "${WARM_YAML}" ]]; then
  echo "error: missing ${WARM_YAML}" >&2
  exit 1
fi

WORKER_IMAGE="$(
  kubectl get deployment agentic-warm-pool -n "${NS}" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true
)"
if [[ -z "${WORKER_IMAGE}" ]]; then
  WORKER_IMAGE="$(
    kubectl get deployment agentic-coordinator -n "${NS}" \
      -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true
  )"
fi
if [[ -z "${WORKER_IMAGE}" ]]; then
  WORKER_IMAGE="${AGENTIC_K8S_WORKER_IMAGE:-agentic-orchestrator-worker:local}"
  echo "warning: no warm-pool/coordinator image; using ${WORKER_IMAGE}" >&2
else
  echo "=== warm-pool worker image: ${WORKER_IMAGE} ==="
fi

TMP_WARM="$(mktemp)"
trap 'rm -f "${TMP_WARM}"' EXIT
python3 - "${WARM_YAML}" "${TMP_WARM}" "${WORKER_IMAGE}" <<'PY'
import sys
src, dst, image = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(src, encoding="utf-8").read()
old = "image: agentic-orchestrator-worker:local"
new = f"image: {image}"
if old not in text:
    raise SystemExit(f"expected {old!r} in {src}")
open(dst, "w", encoding="utf-8").write(text.replace(old, new, 1))
PY

echo "=== apply agentic-warm-pool Deployment ==="
kubectl apply -f "${TMP_WARM}"

if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  echo "=== rollout restart agentic-warm-pool ==="
  kubectl rollout restart deployment/agentic-warm-pool -n "${NS}"
  kubectl rollout status deployment/agentic-warm-pool -n "${NS}" --timeout=600s

  WP="$(kubectl get pods -n "${NS}" -l app.kubernetes.io/name=agentic-warm-pool \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
  if [[ -n "${WP}" ]]; then
    echo "=== warm-pool fastapi probe (${WP}) ==="
    kubectl exec -n "${NS}" "${WP}" -- python -c "import fastapi; print('fastapi_ok', fastapi.__version__)" \
      || echo "warning: fastapi still missing in warm-pool pod" >&2
  fi
else
  echo "warning: agentic-warm-pool deployment not found" >&2
fi
