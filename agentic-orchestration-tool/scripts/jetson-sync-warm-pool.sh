#!/usr/bin/env bash
# Apply warm-pool fastapi bootstrap (litellm MCP) without replacing Jetson volume patches.
# Full `kubectl apply -f warm-pool.yaml` wipes hotfix hostPath/ConfigMap mounts from
# jetson-hotfix-web.sh and leaves new pods CrashLooping — use patch-only here.
#
# Run on Jetson after git pull:
#   bash agentic-orchestration-tool/scripts/jetson-sync-warm-pool.sh
#
# If a prior apply already broke the rollout, this script re-applies warm-pool patches first.
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

BOOTSTRAP_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-fastapi-bootstrap-patch.yaml"
if [[ ! -f "${BOOTSTRAP_PATCH}" ]]; then
  echo "error: missing ${BOOTSTRAP_PATCH}" >&2
  exit 1
fi

if ! kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  echo "error: agentic-warm-pool deployment not found in ${NS}" >&2
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

_tool_venv_ready() {
  local py="${TOOL_ROOT}/.venv/bin/python"
  [[ -x "${py}" ]] && "${py}" -c "import fastapi" >/dev/null 2>&1
}

_reapply_warm_pool_patches() {
  local patch venv_patch="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-tool-venv-hostpath-patch.yaml"
  if [[ -f "${venv_patch}" ]]; then
    if _tool_venv_ready; then
      echo "=== host tool .venv ok (fastapi present) ==="
    elif [[ "${AGENTIC_ENSURE_TOOL_VENV:-1}" != "0" ]]; then
      echo "=== ensuring host tool .venv (Ada / edge) ==="
      bash "${TOOL_ROOT}/scripts/edge-ensure-tool-venv.sh" "${PROJECT_ROOT}"
    fi
  fi

  for patch in \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-tool-hotfix-volume-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-agent-skills-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-rag-sources-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-mcp-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-openclaw-mcp-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-runtime-bootstrap-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-run-traces-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-llm-usage-hostpath-patch.yaml"
  do
    if [[ -f "${patch}" ]]; then
      echo "=== warm-pool patch $(basename "${patch}") ==="
      kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${patch}"
    fi
  done

  if [[ -f "${venv_patch}" ]]; then
    if _tool_venv_ready; then
      echo "=== warm-pool patch $(basename "${venv_patch}") ==="
      kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${venv_patch}"
    else
      echo "warning: skipping venv mount — no working ${TOOL_ROOT}/.venv (image python + pip bootstrap)" >&2
    fi
  fi
}

echo "=== re-apply Jetson warm-pool volume patches (safe after prior full apply) ==="
_reapply_warm_pool_patches

echo "=== patch fastapi bootstrap command ==="
kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${BOOTSTRAP_PATCH}"

PROJECT_ROOT="${PROJECT_ROOT}" bash "${TOOL_ROOT}/scripts/jetson-warm-pool-rollout.sh" apply

CURRENT_IMAGE="$(
  kubectl get deployment agentic-warm-pool -n "${NS}" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true
)"
if [[ "${CURRENT_IMAGE}" != "${WORKER_IMAGE}" ]]; then
  echo "=== set warm-pool image ${WORKER_IMAGE} ==="
  kubectl set image deployment/agentic-warm-pool -n "${NS}" "worker=${WORKER_IMAGE}"
fi

echo "=== rollout restart agentic-warm-pool ==="
kubectl rollout restart deployment/agentic-warm-pool -n "${NS}"

PROJECT_ROOT="${PROJECT_ROOT}" bash "${TOOL_ROOT}/scripts/jetson-warm-pool-rollout.sh" wait 600

WP="$(
  kubectl get pods -n "${NS}" -l app.kubernetes.io/name=agentic-warm-pool \
    --field-selector=status.phase=Running \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true
)"
if [[ -n "${WP}" ]]; then
  echo "=== warm-pool fastapi probe (${WP}) ==="
  kubectl exec -n "${NS}" "${WP}" -- bash -c '
    if [[ -x /app/tool/.venv/bin/python ]]; then PY=/app/tool/.venv/bin/python
    else PY="${AGENTIC_PYTHON:-python}"
      if [[ "${PY}" != */* ]] && command -v "${PY}" >/dev/null 2>&1; then PY="$(command -v "${PY}")"; fi
    fi
    "${PY}" -c "import fastapi; print(\"fastapi_ok\", fastapi.__version__)"
  ' || echo "warning: fastapi still missing in warm-pool pod" >&2
else
  echo "warning: no Running warm-pool pod for fastapi probe" >&2
fi
