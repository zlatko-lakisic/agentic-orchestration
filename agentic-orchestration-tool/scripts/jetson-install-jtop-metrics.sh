#!/usr/bin/env bash
# Install Jetson GPU metrics writer for the web UI (jtop or tegrastats fallback).
#
# Root: installs system unit agentic-jtop-metrics.service
# Non-root: installs user unit (~/.config/systemd/user/) — works without jtop group
#           via tegrastats. Requires linger enabled for the user (already on Jetson).
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WRITER="${TOOL_ROOT}/scripts/jetson-jtop-metrics-writer.py"
OUT_DIR="${PROJECT_ROOT}/var/agentic-metrics"
OUT_FILE="${OUT_DIR}/jtop-metrics.json"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"

mkdir -p "${OUT_DIR}"

if [[ ! -f "${WRITER}" ]]; then
  echo "error: writer missing: ${WRITER}" >&2
  exit 1
fi

install_user_unit() {
  local unit_src="${TOOL_ROOT}/deploy/systemd/agentic-jtop-metrics.user.service"
  local unit_dst="${HOME}/.config/systemd/user/agentic-jtop-metrics.service"
  # Non-interactive SSH often lacks a user bus; point at the linger runtime dir.
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" && -S "${XDG_RUNTIME_DIR}/bus" ]]; then
    export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
  fi
  mkdir -p "$(dirname "${unit_dst}")"
  install -m 0644 "${unit_src}" "${unit_dst}"
  systemctl --user daemon-reload
  systemctl --user enable --now agentic-jtop-metrics.service
  systemctl --user restart agentic-jtop-metrics.service
  echo "user unit agentic-jtop-metrics.service active"
}

install_system_unit() {
  local unit_src="${TOOL_ROOT}/deploy/systemd/agentic-jtop-metrics.service"
  local unit_dst="/etc/systemd/system/agentic-jtop-metrics.service"
  if command -v jtop >/dev/null 2>&1; then
    systemctl enable --now jtop.service 2>/dev/null || true
  else
    echo "note: jtop not installed; writer will use tegrastats"
  fi
  install -m 0644 "${unit_src}" "${unit_dst}"
  systemctl daemon-reload
  systemctl enable --now agentic-jtop-metrics.service
  systemctl restart agentic-jtop-metrics.service
  echo "system unit agentic-jtop-metrics.service active"
}

if [[ "$(id -u)" -eq 0 ]]; then
  install_system_unit
else
  echo "non-root install: using systemd --user + tegrastats fallback (no jtop group needed)"
  install_user_unit
fi

echo "metrics sample:"
sleep 2
if [[ -f "${OUT_FILE}" ]]; then
  head -c 500 "${OUT_FILE}"
  echo
else
  echo "warning: ${OUT_FILE} not created yet" >&2
  if [[ "$(id -u)" -eq 0 ]]; then
    journalctl -u agentic-jtop-metrics -n 30 --no-pager >&2 || true
  else
    systemctl --user status agentic-jtop-metrics --no-pager -l >&2 || true
  fi
fi

JTOP_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-jtop-metrics-patch.yaml"
ENGINE_JTOP_PATCH="${TOOL_ROOT}/deploy/k8s/engine/jetson-jtop-metrics-patch.yaml"
if command -v kubectl >/dev/null 2>&1 && [[ -f "${JTOP_PATCH}" ]]; then
  echo "Patching coordinator hostPath to ${OUT_DIR}…"
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${JTOP_PATCH}" || true
fi
if command -v kubectl >/dev/null 2>&1 && [[ -f "${ENGINE_JTOP_PATCH}" ]]; then
  if kubectl get deployment agentic-engine -n "${NS}" >/dev/null 2>&1; then
    echo "Patching engine hostPath to ${OUT_DIR}…"
    kubectl patch deployment agentic-engine -n "${NS}" --patch-file "${ENGINE_JTOP_PATCH}" || true
  fi
fi

echo "Done. JSON path: ${OUT_FILE}"
echo "Coordinator mount: /host/agentic-metrics <- ${OUT_DIR}"
