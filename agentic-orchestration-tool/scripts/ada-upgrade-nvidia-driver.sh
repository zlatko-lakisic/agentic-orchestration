#!/usr/bin/env bash
# Upgrade Ada (x86 NVR) NVIDIA driver without switching to the open kernel module.
#
# Why: Ollama >= 0.32 requires driver 550+. Ada was on 535 and fell back to CPU.
# Stay on proprietary packages (nvidia-driver-NNN, not *-open) to match the
# existing 535 stack used by NVR ffmpeg / YOLO / STT / AO Ollama.
#
# Usage (on Ada, as a sudo-capable user):
#   sudo bash agentic-orchestration-tool/scripts/ada-upgrade-nvidia-driver.sh
#   # reboot when prompted, then:
#   sudo bash agentic-orchestration-tool/scripts/ada-upgrade-nvidia-driver.sh --verify
#
# Optional:
#   DRIVER_SERIES=580  # pin an older series instead of 595
#   SKIP_REBOOT=1      # install only; you reboot later
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

# ubuntu-drivers recommends 595-open; keep proprietary to avoid module ABI surprises.
DRIVER_SERIES="${DRIVER_SERIES:-595}"
TARGET_PKG="nvidia-driver-${DRIVER_SERIES}"

if [[ "${1:-}" == "--verify" ]]; then
  echo "=== post-upgrade verify ==="
  nvidia-smi || { echo "error: nvidia-smi failed" >&2; exit 1; }
  ver="$(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1 | tr -d '[:space:]')"
  echo "driver_version=${ver}"
  major="${ver%%.*}"
  if [[ "${major}" -lt 550 ]]; then
    echo "error: still below 550 (${ver})" >&2
    exit 1
  fi
  if kubectl get deploy agentic-ollama -n "${NS}" >/dev/null 2>&1; then
    kubectl -n "${NS}" get deploy agentic-ollama -o wide || true
    kubectl -n "${NS}" exec deploy/agentic-ollama -- ollama ps 2>/dev/null || true
  fi
  echo "OK: driver ${ver} meets Ollama 550+ requirement."
  exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "error: run as root (sudo bash $0)" >&2
  exit 1
fi

ARCH="$(uname -m)"
if [[ "${ARCH}" != "x86_64" && "${ARCH}" != "amd64" ]]; then
  echo "error: this script is for Ada/x86 only (got ${ARCH})" >&2
  exit 1
fi

echo "=== current driver ==="
nvidia-smi | head -15 || true
echo "=== target package: ${TARGET_PKG} ==="
apt-cache policy "${TARGET_PKG}" | head -15

if ! apt-cache show "${TARGET_PKG}" >/dev/null 2>&1; then
  echo "error: package ${TARGET_PKG} not found in apt" >&2
  exit 1
fi

echo "=== scale down agentic-ollama (free VRAM; other NVR apps keep running until reboot) ==="
if command -v kubectl >/dev/null 2>&1 && kubectl get deploy agentic-ollama -n "${NS}" >/dev/null 2>&1; then
  kubectl -n "${NS}" scale deploy/agentic-ollama --replicas=0 || true
fi

export DEBIAN_FRONTEND=noninteractive
echo "=== apt update ==="
apt-get update -y

echo "=== install ${TARGET_PKG} (proprietary, not -open) ==="
# Allow overwriting 535 metapackage; Ubuntu switches series cleanly when the new
# metapackage is installed. Do NOT install nvidia-driver-*-open here.
apt-get install -y "${TARGET_PKG}"

echo "=== installed nvidia driver packages ==="
dpkg -l | grep -E '^ii\s+nvidia-driver-|^ii\s+nvidia-dkms-|^ii\s+nvidia-utils-' || true

if [[ "${SKIP_REBOOT:-0}" == "1" ]]; then
  echo "SKIP_REBOOT=1 — reboot manually, then run: sudo bash $0 --verify"
  echo "After reboot, restore Ollama with:"
  echo "  bash ${TOOL_ROOT}/scripts/jetson-enable-ollama.sh"
  exit 0
fi

echo "=== reboot required to load the new kernel module ==="
echo "Rebooting in 5s… (NVR ffmpeg/YOLO/STT will restart with the host)"
sleep 5
systemctl reboot
