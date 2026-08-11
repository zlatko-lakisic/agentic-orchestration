#!/usr/bin/env bash
# Install host control watcher (reboot / Ollama restart) and mount the dir
# into the coordinator. Safe to re-run. Prefers a system unit when root or
# passwordless sudo is available; otherwise a systemd --user path unit.
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
CONTROL_DIR="${PROJECT_ROOT}/var/agentic-control"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

mkdir -p "${CONTROL_DIR}"
chmod 775 "${CONTROL_DIR}" 2>/dev/null || true
hostname >"${CONTROL_DIR}/hostname" 2>/dev/null || true

can_sudo() { sudo -n true 2>/dev/null; }
as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}
can_reboot() {
  if [[ "$(id -u)" -eq 0 ]]; then return 0; fi
  can_sudo
}
can_ollama() {
  command -v systemctl >/dev/null 2>&1 || return 1
  systemctl status ollama >/dev/null 2>&1 && return 0
  sudo -n systemctl status ollama >/dev/null 2>&1
}

subst_root() {
  sed -e "s|/var/projects/agentic-orchestration|${PROJECT_ROOT}|g" "$1"
}

install_system_units() {
  local svc_src="${TOOL_ROOT}/deploy/systemd/agentic-host-control.service"
  local path_src="${TOOL_ROOT}/deploy/systemd/agentic-host-control.path"
  local svc_dst="/etc/systemd/system/agentic-host-control.service"
  local path_dst="/etc/systemd/system/agentic-host-control.path"
  subst_root "${svc_src}" | as_root tee "${svc_dst}" >/dev/null
  subst_root "${path_src}" | as_root tee "${path_dst}" >/dev/null
  as_root systemctl daemon-reload
  as_root systemctl enable --now agentic-host-control.path
}

install_user_units() {
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" && -S "${XDG_RUNTIME_DIR}/bus" ]]; then
    export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
  fi
  local unit_dir="${HOME}/.config/systemd/user"
  mkdir -p "${unit_dir}"
  subst_root "${TOOL_ROOT}/deploy/systemd/agentic-host-control.user.service" \
    >"${unit_dir}/agentic-host-control.service"
  subst_root "${TOOL_ROOT}/deploy/systemd/agentic-host-control.user.path" \
    >"${unit_dir}/agentic-host-control.path"
  systemctl --user daemon-reload
  systemctl --user enable --now agentic-host-control.path
}

MODE="none"
ARMED=false
if [[ "$(id -u)" -eq 0 ]] || can_sudo; then
  install_system_units
  MODE="system"
  ARMED=true
else
  if install_user_units; then
    MODE="user"
    ARMED=true
  else
    MODE="none"
    ARMED=false
  fi
fi

REBOOT=false
OLLAMA=false
if can_reboot; then REBOOT=true; fi
if can_ollama; then OLLAMA=true; fi
REASON=""
if [[ "${ARMED}" != "true" ]]; then
  REASON="Could not install systemd path unit"
elif [[ "${REBOOT}" != "true" ]]; then
  REASON="Watcher installed; host reboot needs passwordless sudo or root"
fi

WATCHER_JSON="$(mktemp)"
python3 - "${WATCHER_JSON}" "${ARMED}" "${MODE}" "${REBOOT}" "${OLLAMA}" "${REASON}" <<'PY'
import json, sys, datetime
path, armed, mode, reboot, ollama, reason = sys.argv[1:7]
data = {
  "armed": armed == "true",
  "mode": mode,
  "reboot": reboot == "true",
  "ollama": ollama == "true",
  "reason": reason or None,
  "installedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
}
open(path, "w", encoding="utf-8").write(json.dumps(data, indent=2) + "\n")
PY
cp "${WATCHER_JSON}" "${CONTROL_DIR}/watcher.json" 2>/dev/null || true
hostname >"${CONTROL_DIR}/hostname" 2>/dev/null || true

PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-host-control-hostpath-patch.yaml"
SYSRQ_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-host-sysrq-patch.yaml"
if command -v kubectl >/dev/null 2>&1; then
  if [[ -f "${PATCH}" ]]; then
    echo "Patching coordinator host control hostPath → ${CONTROL_DIR}"
    kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${PATCH}" || true
  fi
  if [[ -f "${SYSRQ_PATCH}" ]]; then
    echo "Patching coordinator host sysrq trigger"
    kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${SYSRQ_PATCH}" || true
  fi
  kubectl exec -n "${NS}" deploy/agentic-coordinator -- chmod 777 /host/agentic-control 2>/dev/null || true
  kubectl exec -i -n "${NS}" deploy/agentic-coordinator -- tee /host/agentic-control/watcher.json >/dev/null <"${WATCHER_JSON}" || true
  kubectl exec -n "${NS}" deploy/agentic-coordinator -- sh -c 'hostname > /host/agentic-control/hostname' || true
fi
rm -f "${WATCHER_JSON}"

echo "host control: armed=${ARMED} mode=${MODE} reboot=${REBOOT} ollama=${OLLAMA} dir=${CONTROL_DIR}"
if [[ -n "${REASON}" ]]; then
  echo "  note: ${REASON}" >&2
fi
