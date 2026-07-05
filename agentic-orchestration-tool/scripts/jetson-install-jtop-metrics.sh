#!/usr/bin/env bash
# Install jetson-stats jtop metrics writer for the web UI GPU monitor (Jetson hosts).
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WRITER="${TOOL_ROOT}/scripts/jetson-jtop-metrics-writer.py"
UNIT_SRC="${TOOL_ROOT}/deploy/systemd/agentic-jtop-metrics.service"
UNIT_DST="/etc/systemd/system/agentic-jtop-metrics.service"
OUT_DIR="/var/run/agentic"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

if ! command -v jtop >/dev/null 2>&1; then
  echo "Installing jetson-stats (jtop)…"
  pip3 install -U jetson-stats
fi

systemctl enable --now jtop.service 2>/dev/null || true

mkdir -p "${OUT_DIR}"
chmod 755 "${OUT_DIR}"

install -m 0644 "${UNIT_SRC}" "${UNIT_DST}"
systemctl daemon-reload
systemctl enable --now agentic-jtop-metrics.service
systemctl restart agentic-jtop-metrics.service

echo "jtop metrics writer active. Sample:"
sleep 2
if [[ -f "${OUT_DIR}/jtop-metrics.json" ]]; then
  head -c 400 "${OUT_DIR}/jtop-metrics.json"
  echo
else
  echo "warning: ${OUT_DIR}/jtop-metrics.json not created yet; check: journalctl -u agentic-jtop-metrics -n 30" >&2
fi

echo "Apply k8s patch on coordinator:"
echo "  kubectl patch deployment agentic-coordinator -n agentic-orchestration --patch-file ${TOOL_ROOT}/deploy/k8s/coordinator/jetson-jtop-metrics-patch.yaml"
