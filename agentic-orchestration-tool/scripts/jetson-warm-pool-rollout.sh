#!/usr/bin/env bash
# Warm-pool rollout helpers — Recreate strategy, stale ReplicaSet cleanup (Jetson/Ada).
set -eu
PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
DEPLOY="${WARM_POOL_DEPLOY:-agentic-warm-pool}"
LABEL="app.kubernetes.io/name=agentic-warm-pool"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

ROLLPATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-edge-rollout-patch.yaml"

usage() {
  echo "Usage: $0 apply|wait [timeout_seconds]|unblock|diagnose" >&2
  exit 1
}

_apply_rollout_patch() {
  if ! kubectl get deployment "${DEPLOY}" -n "${NS}" >/dev/null 2>&1; then
    echo "warm-pool deployment not found in ${NS}; skip rollout patch" >&2
    return 0
  fi
  echo "=== warm-pool rollout patch (Recreate, progressDeadline 1200s) ==="
  kubectl patch deployment "${DEPLOY}" -n "${NS}" --type=json \
    -p='[{"op": "replace", "path": "/spec/strategy", "value": {"type": "Recreate"}}]'
  if [[ -f "${ROLLPATCH}" ]]; then
    kubectl patch deployment "${DEPLOY}" -n "${NS}" --patch-file "${ROLLPATCH}" 2>/dev/null || true
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

  if [[ "${pending}" -eq 0 && "${running}" -le 2 ]]; then
    local not_ready
    not_ready="$(kubectl get pods -n "${NS}" -l "${LABEL}" --no-headers 2>/dev/null \
      | awk '$2 !~ /^2\/2$|^1\/1$/ && $3 != "Completed" {print $1}' | head -1 || true)"
    if [[ -z "${not_ready}" ]]; then
      return 0
    fi
  fi

  echo "=== unblock warm-pool ReplicaSets (pending=${pending}, running=${running}) ==="
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
    elif [[ "${pending}" -gt 0 && "${running}" -gt 0 ]]; then
      drop=1
    elif [[ -n "${ready}" && "${ready}" != "${replicas}" && "${rev}" != "${desired_rev}" ]]; then
      drop=1
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

_diagnose() {
  echo "=== warm-pool pods ==="
  kubectl get pods -n "${NS}" -l "${LABEL}" -o wide 2>/dev/null || true
  echo "=== warm-pool ReplicaSets ==="
  kubectl get rs -n "${NS}" -l "${LABEL}" 2>/dev/null || true
  local bad
  bad="$(kubectl get pods -n "${NS}" -l "${LABEL}" --no-headers 2>/dev/null \
    | awk '$3 ~ /CrashLoop|Error|BackOff|Pending|CreateContainer/ {print $1}' | head -1 || true)"
  if [[ -n "${bad}" ]]; then
    echo "=== describe ${bad} ==="
    kubectl describe pod -n "${NS}" "${bad}" 2>/dev/null | tail -35 || true
    echo "=== logs ${bad} ==="
    kubectl logs -n "${NS}" "${bad}" --tail=40 2>/dev/null || true
  fi
}

_wait_rollout() {
  local timeout="${1:-600}"
  if ! kubectl get deployment "${DEPLOY}" -n "${NS}" >/dev/null 2>&1; then
    return 0
  fi
  if kubectl rollout status "deployment/${DEPLOY}" -n "${NS}" --timeout="${timeout}s"; then
    return 0
  fi
  echo "warm-pool rollout stalled; attempting unblock..." >&2
  _unblock_stale_replicasets
  if kubectl rollout status "deployment/${DEPLOY}" -n "${NS}" --timeout=180s; then
    return 0
  fi
  echo "warm-pool rollout still failing; diagnostics:" >&2
  _diagnose
  return 1
}

cmd="${1:-}"
shift || true
case "${cmd}" in
  apply)
    _apply_rollout_patch
    ;;
  wait)
    _wait_rollout "${1:-600}"
    ;;
  unblock)
    _unblock_stale_replicasets
    ;;
  diagnose)
    _diagnose
    ;;
  *)
    usage
    ;;
esac
