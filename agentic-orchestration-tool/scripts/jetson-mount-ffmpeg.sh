#!/usr/bin/env bash
# Optionally mount host ffmpeg/ffprobe into engine + warm-pool (#125).
#
# Default: skip. Coordinator/worker images since v2.25.1 ship apt ``ffmpeg``.
# Host binary mounts alone break (missing shared libs). Opt in only when needed:
#   AGENTIC_MOUNT_HOST_FFMPEG=1 bash scripts/jetson-mount-ffmpeg.sh
set -euo pipefail
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

ENGINE_PATCH="${TOOL_ROOT}/deploy/k8s/engine/ffmpeg-hostpath-patch.yaml"
WARM_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-ffmpeg-hostpath-patch.yaml"

if [[ "${AGENTIC_MOUNT_HOST_FFMPEG:-0}" != "1" ]]; then
  echo "jetson-mount-ffmpeg: skip (image ships ffmpeg; set AGENTIC_MOUNT_HOST_FFMPEG=1 to force)"
  exit 0
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "jetson-mount-ffmpeg: kubectl missing; skip"
  exit 0
fi

HOST_FFMPEG="${AGENTIC_HOST_FFMPEG:-/usr/bin/ffmpeg}"
HOST_FFPROBE="${AGENTIC_HOST_FFPROBE:-/usr/bin/ffprobe}"

if [[ ! -x "${HOST_FFMPEG}" || ! -x "${HOST_FFPROBE}" ]]; then
  echo "jetson-mount-ffmpeg: host binaries missing (${HOST_FFMPEG}, ${HOST_FFPROBE}); skip"
  exit 0
fi

# Rewrite patch hostPath when non-default locations are used.
_tmpdir="$(mktemp -d)"
trap 'rm -rf "${_tmpdir}"' EXIT
sed "s|/usr/bin/ffmpeg|${HOST_FFMPEG}|g; s|/usr/bin/ffprobe|${HOST_FFPROBE}|g" \
  "${ENGINE_PATCH}" > "${_tmpdir}/engine.yaml"
sed "s|/usr/bin/ffmpeg|${HOST_FFMPEG}|g; s|/usr/bin/ffprobe|${HOST_FFPROBE}|g" \
  "${WARM_PATCH}" > "${_tmpdir}/warm.yaml"

echo "=== mount host ffmpeg into agentic-engine ==="
if kubectl get deployment agentic-engine -n "${NS}" >/dev/null 2>&1; then
  kubectl patch deployment agentic-engine -n "${NS}" --patch-file "${_tmpdir}/engine.yaml"
else
  echo "agentic-engine not found; skip"
fi

echo "=== mount host ffmpeg into agentic-warm-pool ==="
if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  # Warm-pool container name may be worker (or the first container).
  cname="$(kubectl -n "${NS}" get deploy agentic-warm-pool -o jsonpath='{.spec.template.spec.containers[0].name}')"
  if [[ -n "${cname}" && "${cname}" != "worker" ]]; then
    sed "s/name: worker/name: ${cname}/" "${_tmpdir}/warm.yaml" > "${_tmpdir}/warm2.yaml"
    kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${_tmpdir}/warm2.yaml"
  else
    kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${_tmpdir}/warm.yaml"
  fi
else
  echo "agentic-warm-pool not found; skip"
fi

echo "jetson-mount-ffmpeg: done (rollout may restart pods)"
