#!/usr/bin/env bash
# Install AMD host metrics writer (amdgpu sysfs) for engine / web GPU monitor.
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WRITER="${TOOL_ROOT}/scripts/amd-host-metrics-writer.py"
UNIT_SRC="${TOOL_ROOT}/deploy/systemd/agentic-amd-metrics.service"
UNIT_DST="/etc/systemd/system/agentic-amd-metrics.service"
OUT_DIR="${PROJECT_ROOT}/var/agentic-metrics"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

if [[ ! -f "${WRITER}" ]]; then
  echo "error: missing ${WRITER} — git pull first" >&2
  exit 3
fi

mkdir -p "${OUT_DIR}"
chmod 755 "${OUT_DIR}"

# Render unit with this checkout's paths.
sed \
  -e "s|/var/projects/agentic-orchestration|${PROJECT_ROOT}|g" \
  "${UNIT_SRC}" >"${UNIT_DST}"
systemctl daemon-reload
systemctl enable --now agentic-amd-metrics.service
systemctl restart agentic-amd-metrics.service

echo "amd host metrics writer active. Sample:"
sleep 2
if [[ -f "${OUT_DIR}/amd-metrics.json" ]]; then
  head -c 500 "${OUT_DIR}/amd-metrics.json"
  echo
else
  echo "warning: ${OUT_DIR}/amd-metrics.json not created yet; check: journalctl -u agentic-amd-metrics -n 30" >&2
fi

echo
echo "Ensure AGENTIC_AMD_HOST_METRICS_PATH=/host/agentic-metrics/amd-metrics.json"
echo "and hostPath ${OUT_DIR} → /host/agentic-metrics on coordinator/engine."
