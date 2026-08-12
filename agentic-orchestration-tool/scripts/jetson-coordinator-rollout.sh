#!/usr/bin/env bash
# Jetson coordinator rollout helpers — Recreate strategy, no hostPort, stale-RS cleanup.
set -eu
PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
DEPLOY="${COORDINATOR_DEPLOY:-agentic-coordinator}"
LABEL="app.kubernetes.io/name=agentic-coordinator"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

ROLLPATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-coordinator-rollout-patch.yaml"
NODEPORT_SVC="${TOOL_ROOT}/deploy/k8s/coordinator/service-nodeport.yaml"

usage() {
  echo "Usage: $0 apply|wait [timeout_seconds]|unblock" >&2
  exit 1
}

_apply_rollout_patch() {
  if [[ ! -f "${ROLLPATCH}" ]]; then
    echo "error: missing ${ROLLPATCH}" >&2
    exit 1
  fi
  if ! kubectl get deployment "${DEPLOY}" -n "${NS}" >/dev/null 2>&1; then
    echo "coordinator deployment not found in ${NS}; skip rollout patch" >&2
    return 0
  fi
  echo "=== coordinator rollout patch (Recreate, NodePort 30487) ==="
  # JSON patch replaces strategy wholesale (strategic merge cannot drop rollingUpdate).
  kubectl patch deployment "${DEPLOY}" -n "${NS}" --type=json \
    -p='[{"op": "replace", "path": "/spec/strategy", "value": {"type": "Recreate"}}]'
  kubectl patch deployment "${DEPLOY}" -n "${NS}" --type=json \
    -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/ports", "value": [{"name": "http", "containerPort": 3847, "protocol": "TCP"}]}]'
  if [[ -f "${ROLLPATCH}" ]]; then
    kubectl patch deployment "${DEPLOY}" -n "${NS}" --patch-file "${ROLLPATCH}" 2>/dev/null || true
  fi
  local admin_patch="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-admin-hostpath-patch.yaml"
  if [[ -f "${admin_patch}" ]]; then
    echo "=== AO Admin SPA hostPath mount ==="
    kubectl patch deployment "${DEPLOY}" -n "${NS}" --patch-file "${admin_patch}" 2>/dev/null || true
  fi
  local traces_patch="${TOOL_ROOT}/deploy/k8s/coordinator/run-traces-hostpath-patch.yaml"
  if [[ -f "${traces_patch}" ]]; then
    echo "=== run traces hostPath mount ==="
    kubectl patch deployment "${DEPLOY}" -n "${NS}" --patch-file "${traces_patch}" 2>/dev/null || true
  fi
  local providers_patch="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-agent-providers-hostpath-patch.yaml"
  if [[ -f "${providers_patch}" ]]; then
    echo "=== agent_providers_jetson hostPath mount ==="
    kubectl patch deployment "${DEPLOY}" -n "${NS}" --patch-file "${providers_patch}" 2>/dev/null || true
  fi
  if [[ -f "${NODEPORT_SVC}" ]]; then
    kubectl apply -f "${NODEPORT_SVC}"
  fi
  local redirect="${TOOL_ROOT}/scripts/jetson-web-port-redirect.sh"
  if [[ -f "${redirect}" ]]; then
    bash "${redirect}" disable 2>/dev/null \
      || sudo bash "${redirect}" disable 2>/dev/null \
      || true
  fi
}

_unblock_stale_replicasets() {
  if ! kubectl get deployment "${DEPLOY}" -n "${NS}" >/dev/null 2>&1; then
    return 0
  fi

  local desired_rev running pending scaled=0
  desired_rev="$(kubectl get deployment "${DEPLOY}" -n "${NS}" \
    -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || true)"

  running="$(kubectl get pods -n "${NS}" -l "${LABEL}" \
    --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | tr -d ' ')"
  pending="$(kubectl get pods -n "${NS}" -l "${LABEL}" \
    --field-selector=status.phase=Pending -o name 2>/dev/null | wc -l | tr -d ' ')"

  # hostPort deadlock: new pod Pending while old pod still Running.
  if [[ "${pending}" -eq 0 && "${running}" -le 1 ]]; then
    return 0
  fi

  echo "=== unblock coordinator ReplicaSets (pending=${pending}, running=${running}) ==="
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    local rs rev replicas ready
    rs="$(awk '{print $1}' <<<"${line}")"
    rev="$(awk '{print $2}' <<<"${line}")"
    replicas="$(awk '{print $3}' <<<"${line}")"
    ready="$(awk '{print $4}' <<<"${line}")"
    [[ "${replicas}" -eq 0 ]] && continue

    local drop=0
    if [[ -n "${desired_rev}" && "${rev}" != "${desired_rev}" ]]; then
      drop=1
    elif [[ "${pending}" -gt 0 && "${running}" -gt 0 && "${ready}" != "${replicas}" ]]; then
      drop=1
    elif [[ "${pending}" -gt 0 && "${running}" -gt 0 ]]; then
      # Keep only the newest RS when multiple have replicas > 0.
      local newest
      newest="$(kubectl get rs -n "${NS}" -l "${LABEL}" \
        --sort-by=.metadata.creationTimestamp \
        -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || true)"
      if [[ -n "${newest}" && "${rs}" != "${newest}" ]]; then
        drop=1
      fi
    fi

    if [[ "${drop}" -eq 1 ]]; then
      echo "scaling ${rs} (rev=${rev}) to 0"
      kubectl scale rs "${rs}" -n "${NS}" --replicas=0
      scaled=1
    fi
  done < <(
    kubectl get rs -n "${NS}" -l "${LABEL}" \
      -o custom-columns=NAME:.metadata.name,REV:.metadata.annotations.deployment\.kubernetes\.io/revision,REPLICAS:.spec.replicas,READY:.status.readyReplicas \
      --no-headers 2>/dev/null || true
  )

  if [[ "${scaled}" -eq 1 ]]; then
    sleep 2
  fi
}

_wait_rollout() {
  local timeout="${1:-300}"
  if ! kubectl get deployment "${DEPLOY}" -n "${NS}" >/dev/null 2>&1; then
    return 0
  fi
  if kubectl rollout status "deployment/${DEPLOY}" -n "${NS}" --timeout="${timeout}s"; then
    return 0
  fi
  echo "rollout stalled; attempting unblock..." >&2
  _unblock_stale_replicasets
  kubectl rollout status "deployment/${DEPLOY}" -n "${NS}" --timeout=120s
}

cmd="${1:-}"
shift || true
case "${cmd}" in
  apply)
    _apply_rollout_patch
    ;;
  wait)
    _wait_rollout "${1:-300}"
    ;;
  unblock)
    _unblock_stale_replicasets
    ;;
  *)
    usage
    ;;
esac
