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

# Strategic merge cannot delete volumeMounts. Drop leftover jetson-orch-hostpath
# mounts under /app/orchestration (file subPaths *or* a prior full-dir mount).
_strip_orch_hostpath_mounts() {
  local idx=0
  local -a to_remove=()
  local mounts
  mounts="$(
    kubectl get deployment agentic-warm-pool -n "${NS}" \
      -o jsonpath='{range .spec.template.spec.containers[0].volumeMounts[*]}{.name}{"|"}{.mountPath}{"\n"}{end}' \
      2>/dev/null || true
  )"
  [[ -z "${mounts}" ]] && return 0
  while IFS='|' read -r name mpath; do
    if [[ "${name}" == "jetson-orch-hostpath" && ( "${mpath}" == "/app/orchestration" || "${mpath}" == /app/orchestration/* ) ]]; then
      to_remove+=("${idx}")
    fi
    idx=$((idx + 1))
  done <<< "${mounts}"
  [[ ${#to_remove[@]} -eq 0 ]] && return 0
  local -a patch=()
  local i
  for ((i = ${#to_remove[@]} - 1; i >= 0; i--)); do
    patch+=("{\"op\":\"remove\",\"path\":\"/spec/template/spec/containers/0/volumeMounts/${to_remove[i]}\"}")
  done
  echo "=== strip ${#to_remove[@]} jetson-orch-hostpath mount(s) ==="
  kubectl patch deployment agentic-warm-pool -n "${NS}" --type=json -p "[$(IFS=,; echo "${patch[*]}")]"
}

# Full orchestration hostPath dir cannot coexist with ConfigMap file overlays on
# /app/orchestration/*.py (OCI: mount file over directory). Keep agent-providers
# ConfigMap mounts; drop all tool-hotfix-orchestration mounts.
_strip_configmap_orch_mounts() {
  local idx=0
  local -a to_remove=()
  local mounts
  mounts="$(
    kubectl get deployment agentic-warm-pool -n "${NS}" \
      -o jsonpath='{range .spec.template.spec.containers[0].volumeMounts[*]}{.name}{"|"}{.mountPath}{"\n"}{end}' \
      2>/dev/null || true
  )"
  [[ -z "${mounts}" ]] && return 0
  while IFS='|' read -r name mpath; do
    if [[ "${name}" == "tool-hotfix-orchestration" ]]; then
      to_remove+=("${idx}")
    fi
    idx=$((idx + 1))
  done <<< "${mounts}"
  [[ ${#to_remove[@]} -eq 0 ]] && return 0
  local -a patch=()
  local i
  for ((i = ${#to_remove[@]} - 1; i >= 0; i--)); do
    patch+=("{\"op\":\"remove\",\"path\":\"/spec/template/spec/containers/0/volumeMounts/${to_remove[i]}\"}")
  done
  echo "=== strip ${#to_remove[@]} ConfigMap tool-hotfix-orchestration mount(s) ==="
  kubectl patch deployment agentic-warm-pool -n "${NS}" --type=json -p "[$(IFS=,; echo "${patch[*]}")]"
}

_reapply_warm_pool_patches() {
  local patch venv_patch="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-tool-venv-hostpath-patch.yaml"

  # Apply ConfigMap + hostPaths, then remove orchestration ConfigMap file overlays
  # and ensure a single full-dir hostPath at /app/orchestration.
  for patch in \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-tool-hotfix-volume-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-agent-skills-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-rag-sources-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-mcp-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-openclaw-mcp-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-run-traces-hostpath-patch.yaml" \
    "${TOOL_ROOT}/deploy/k8s/warm-pool-llm-usage-hostpath-patch.yaml"
  do
    if [[ -f "${patch}" ]]; then
      echo "=== warm-pool patch $(basename "${patch}") ==="
      kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${patch}"
    fi
  done

  _strip_configmap_orch_mounts
  _strip_orch_hostpath_mounts

  if [[ -f "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-runtime-bootstrap-hostpath-patch.yaml" ]]; then
    echo "=== warm-pool patch warm-pool-jetson-runtime-bootstrap-hostpath-patch.yaml (full orch dir) ==="
    kubectl patch deployment agentic-warm-pool -n "${NS}" \
      --patch-file "${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-runtime-bootstrap-hostpath-patch.yaml"
  fi

  # Optional PYTHONPATH fallback only. Never required — Jetson often has no host venv.
  # Do not create .venv here (DirectoryOrCreate left an empty stub on Ada).
  if [[ -f "${venv_patch}" ]] && _tool_venv_ready; then
    echo "=== warm-pool patch $(basename "${venv_patch}") (optional site-packages) ==="
    kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${venv_patch}"
  else
    echo "=== skip host .venv mount (image python + pip; fine on Jetson and Ada) ==="
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
    PY="$(command -v python || command -v python3 || echo python)"
    "${PY}" -c "import fastapi; print(\"fastapi_ok\", fastapi.__version__)"
  ' || echo "warning: fastapi still missing in warm-pool pod" >&2
else
  echo "warning: no Running warm-pool pod for fastapi probe" >&2
fi
