#!/usr/bin/env bash
# Redirect host TCP :80 -> NodePort 30487 so curl http://127.0.0.1/ works without hostPort.
# Requires root (or sudo). Safe with Recreate rollouts — no CNI hostPort conflict.
set -eu
TARGET_PORT="${AGENTIC_WEB_NODEPORT:-30487}"
WEB_PORT="${WEB_PORT:-80}"

_run_iptables() {
  if [[ "$(id -u)" -eq 0 ]]; then
    iptables "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo iptables "$@"
  else
    echo "error: need root or sudo for iptables" >&2
    exit 1
  fi
}

_rule_exists() {
  local chain="$1" to_port="$2"
  _run_iptables -t nat -C "${chain}" -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${to_port}" 2>/dev/null
}

_add_rule() {
  local chain="$1" to_port="$2"
  if _rule_exists "${chain}" "${to_port}"; then
    return 0
  fi
  _run_iptables -t nat -A "${chain}" -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${to_port}"
}

_del_rule() {
  local chain="$1" to_port="$2"
  while _rule_exists "${chain}" "${to_port}"; do
    _run_iptables -t nat -D "${chain}" -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${to_port}"
  done
}

usage() {
  echo "Usage: $0 enable|disable|status" >&2
  exit 1
}

cmd="${1:-enable}"
case "${cmd}" in
  enable)
    echo "=== iptables :${WEB_PORT} -> :${TARGET_PORT} (NodePort) ==="
    _add_rule PREROUTING "${TARGET_PORT}"
    _add_rule OUTPUT "${TARGET_PORT}"
    ;;
  disable)
    echo "=== remove iptables :${WEB_PORT} redirect ==="
    _del_rule PREROUTING "${TARGET_PORT}"
    _del_rule OUTPUT "${TARGET_PORT}"
    ;;
  status)
    if _rule_exists PREROUTING "${TARGET_PORT}" && _rule_exists OUTPUT "${TARGET_PORT}"; then
      echo "redirect active: ${WEB_PORT} -> ${TARGET_PORT}"
      exit 0
    fi
    echo "redirect not configured"
    exit 1
    ;;
  *)
    usage
    ;;
esac
