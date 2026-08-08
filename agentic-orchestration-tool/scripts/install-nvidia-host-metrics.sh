#!/usr/bin/env bash
# Install NVIDIA host metrics writer for the engine / KnowBuddy GPU monitor
# (x86_64 / discrete NVIDIA hosts where the engine runs in k8s without GPU devices).
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WRITER="${TOOL_ROOT}/scripts/nvidia-host-metrics-writer.py"
UNIT_SRC="${TOOL_ROOT}/deploy/systemd/agentic-nvidia-metrics.service"
UNIT_DST="/etc/systemd/system/agentic-nvidia-metrics.service"
OUT_DIR="${PROJECT_ROOT}/var/agentic-metrics"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "error: nvidia-smi not found — this host has no NVIDIA driver tooling" >&2
  exit 2
fi

if [[ ! -f "${WRITER}" ]]; then
  echo "error: missing ${WRITER} — git pull first" >&2
  exit 3
fi

mkdir -p "${OUT_DIR}"
chmod 755 "${OUT_DIR}"

sed \
  -e "s|/var/projects/agentic-orchestration|${PROJECT_ROOT}|g" \
  "${UNIT_SRC}" >"${UNIT_DST}"
systemctl daemon-reload
systemctl enable --now agentic-nvidia-metrics.service
systemctl restart agentic-nvidia-metrics.service

echo "nvidia host metrics writer active. Sample:"
sleep 2
if [[ -f "${OUT_DIR}/nvidia-metrics.json" ]]; then
  head -c 500 "${OUT_DIR}/nvidia-metrics.json"
  echo
else
  echo "warning: ${OUT_DIR}/nvidia-metrics.json not created yet; check: journalctl -u agentic-nvidia-metrics -n 30" >&2
fi

echo
echo "Engine/coordinator mount ${OUT_DIR} as /host/agentic-metrics."
echo "AGENTIC_NVIDIA_HOST_METRICS_PATH=/host/agentic-metrics/nvidia-metrics.json"
