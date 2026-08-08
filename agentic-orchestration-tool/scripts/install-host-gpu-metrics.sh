#!/usr/bin/env bash
# Install the correct host GPU metrics writer for this machine.
# Detects: jetson (Tegra) | nvidia_cuda (discrete nvidia-smi) | amd (amdgpu sysfs).
#
# Usage:
#   bash install-host-gpu-metrics.sh [/var/projects/agentic-orchestration]
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
OUT_DIR="${PROJECT_ROOT}/var/agentic-metrics"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"

mkdir -p "${OUT_DIR}"
chmod 755 "${OUT_DIR}" 2>/dev/null || true

is_jetson() {
  if [[ -f /etc/nv_tegra_release ]]; then
    return 0
  fi
  local model=""
  if [[ -f /proc/device-tree/model ]]; then
    model="$(tr -d '\0' </proc/device-tree/model 2>/dev/null || true)"
  fi
  model="$(printf '%s' "${model}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${model}" == *nvidia* ]] && [[ "${model}" == *jetson* || "${model}" == *orin* || "${model}" == *xavier* || "${model}" == *nano* ]]; then
    return 0
  fi
  return 1
}

has_nvidia_smi() {
  command -v nvidia-smi >/dev/null 2>&1
}

has_amdgpu() {
  local card vendor
  for card in /sys/class/drm/card[0-9]*; do
    [[ -e "${card}" ]] || continue
    [[ "${card}" == *-* ]] && continue
    vendor=""
    if [[ -f "${card}/device/vendor" ]]; then
      vendor="$(tr -d '[:space:]' <"${card}/device/vendor" | tr '[:upper:]' '[:lower:]')"
    fi
    if [[ "${vendor}" == "0x1002" || "${vendor}" == "1002" ]]; then
      return 0
    fi
    if [[ -f "${card}/device/mem_info_vram_total" ]]; then
      return 0
    fi
  done
  return 1
}

patch_k8s_metrics_mount() {
  local patch="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-jtop-metrics-patch.yaml"
  local engine_patch="${TOOL_ROOT}/deploy/k8s/engine/jetson-jtop-metrics-patch.yaml"
  if ! command -v kubectl >/dev/null 2>&1; then
    return 0
  fi
  if [[ -f "${patch}" ]]; then
    echo "Patching coordinator metrics hostPath → ${OUT_DIR}"
    kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${patch}" || true
  fi
  if [[ -f "${engine_patch}" ]] && kubectl get deployment agentic-engine -n "${NS}" >/dev/null 2>&1; then
    echo "Patching engine metrics hostPath → ${OUT_DIR}"
    kubectl patch deployment agentic-engine -n "${NS}" --patch-file "${engine_patch}" || true
  fi
}

detect_class() {
  if is_jetson; then
    echo "jetson"
    return
  fi
  if has_nvidia_smi; then
    echo "nvidia_cuda"
    return
  fi
  if has_amdgpu; then
    echo "amd"
    return
  fi
  echo "none"
}

CLASS="$(detect_class)"
echo "host GPU class: ${CLASS}"
echo "metrics dir: ${OUT_DIR}"

case "${CLASS}" in
  jetson)
    bash "${TOOL_ROOT}/scripts/jetson-install-jtop-metrics.sh" "${PROJECT_ROOT}"
    ;;
  nvidia_cuda)
    if [[ "$(id -u)" -ne 0 ]]; then
      echo "nvidia_cuda install needs root for systemd; re-run with sudo" >&2
      echo "  sudo bash $0 ${PROJECT_ROOT}" >&2
      # Still ensure dir + k8s mount so a later root install lands in the right place.
      patch_k8s_metrics_mount
      exit 0
    fi
    bash "${TOOL_ROOT}/scripts/install-nvidia-host-metrics.sh" "${PROJECT_ROOT}"
    patch_k8s_metrics_mount
    ;;
  amd)
    if [[ "$(id -u)" -ne 0 ]]; then
      echo "amd install needs root for systemd; re-run with sudo" >&2
      echo "  sudo bash $0 ${PROJECT_ROOT}" >&2
      patch_k8s_metrics_mount
      exit 0
    fi
    bash "${TOOL_ROOT}/scripts/install-amd-host-metrics.sh" "${PROJECT_ROOT}"
    patch_k8s_metrics_mount
    ;;
  *)
    echo "no GPU writer installed (cpu/macos/unknown)"
    patch_k8s_metrics_mount
    ;;
esac
