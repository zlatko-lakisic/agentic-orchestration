#!/usr/bin/env bash
# Consume Admin-written host control request files (reboot / Ollama restart).
# Stale requests older than 120s are ignored so leftover files cannot reboot later.
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
CONTROL_DIR="${AGENTIC_HOST_CONTROL_DIR:-${PROJECT_ROOT}/var/agentic-control}"
MAX_AGE_SEC="${AGENTIC_HOST_CONTROL_MAX_AGE_SEC:-120}"
LOG="${CONTROL_DIR}/host-control.log"
mkdir -p "${CONTROL_DIR}"

log() {
  printf '%s %s\n' "$(date -Is)" "$*" >>"${LOG}" 2>/dev/null || true
  echo "$*"
}

file_age_ok() {
  local file="$1"
  python3 - "$file" "${MAX_AGE_SEC}" <<'PY'
import json, os, sys, time
from datetime import datetime, timezone
path, max_age = sys.argv[1], int(sys.argv[2])
now = time.time()
mtime = os.path.getmtime(path)
if now - mtime > max_age:
    raise SystemExit(1)
try:
    data = json.load(open(path, encoding="utf-8"))
except Exception:
    raise SystemExit(0)
raw = str(data.get("requestedAt") or "").strip()
if not raw:
    raise SystemExit(0)
try:
    ts = datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
except Exception:
    raise SystemExit(0)
if now - ts > max_age:
    raise SystemExit(1)
raise SystemExit(0)
PY
}

run_privileged() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

handle() {
  local file="$1"
  local action="$2"
  [[ -f "${file}" ]] || return 0
  if ! file_age_ok "${file}"; then
    log "ignore stale ${action} request"
    mv -f "${file}" "${file}.stale" 2>/dev/null || rm -f "${file}"
    return 0
  fi
  rm -f "${file}"
  case "${action}" in
    reboot)
      log "rebooting host (Admin control)"
      run_privileged /sbin/shutdown -r now "AO Admin host reboot"
      ;;
    ollama)
      log "restarting ollama (Admin control)"
      if [[ "$(id -u)" -eq 0 ]]; then
        systemctl restart ollama
      elif sudo -n systemctl restart ollama >/dev/null 2>&1; then
        sudo -n systemctl restart ollama
      else
        systemctl restart ollama
      fi
      ;;
    *)
      log "unknown action ${action}"
      ;;
  esac
}

handle "${CONTROL_DIR}/reboot.request" reboot
handle "${CONTROL_DIR}/ollama.restart.request" ollama
