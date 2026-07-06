#!/usr/bin/env bash
# Redirect host TCP :80 -> NodePort 30487 (Traefik / bookmarks use :80 without hostPort).
# Requires root (or sudo). Safe with Recreate rollouts — no CNI hostPort conflict.
set -eu
TARGET_PORT="${AGENTIC_WEB_NODEPORT:-30487}"
WEB_PORT="${WEB_PORT:-80}"

_run() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "error: need root or sudo" >&2
    exit 1
  fi
}

_enable_route_localnet() {
  _run sysctl -w net.ipv4.conf.all.route_localnet=1 >/dev/null 2>&1 || true
  _run sysctl -w net.ipv4.conf.lo.route_localnet=1 >/dev/null 2>&1 || true
}

_del_redirect_rules() {
  while _run iptables -t nat -C PREROUTING -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${TARGET_PORT}" 2>/dev/null; do
    _run iptables -t nat -D PREROUTING -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${TARGET_PORT}"
  done
  while _run iptables -t nat -C OUTPUT -p tcp -d 127.0.0.1 --dport "${WEB_PORT}" -j DNAT --to-destination "127.0.0.1:${TARGET_PORT}" 2>/dev/null; do
    _run iptables -t nat -D OUTPUT -p tcp -d 127.0.0.1 --dport "${WEB_PORT}" -j DNAT --to-destination "127.0.0.1:${TARGET_PORT}"
  done
}

_add_redirect_rules() {
  if ! _run iptables -t nat -C PREROUTING -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${TARGET_PORT}" 2>/dev/null; then
    _run iptables -t nat -A PREROUTING -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${TARGET_PORT}"
  fi
  if ! _run iptables -t nat -C OUTPUT -p tcp -d 127.0.0.1 --dport "${WEB_PORT}" -j DNAT --to-destination "127.0.0.1:${TARGET_PORT}" 2>/dev/null; then
    _run iptables -t nat -A OUTPUT -p tcp -d 127.0.0.1 --dport "${WEB_PORT}" -j DNAT --to-destination "127.0.0.1:${TARGET_PORT}"
  fi
}

_status() {
  local prerout=0 out=0
  _run iptables -t nat -C PREROUTING -p tcp --dport "${WEB_PORT}" -j REDIRECT --to-ports "${TARGET_PORT}" 2>/dev/null && prerout=1
  _run iptables -t nat -C OUTPUT -p tcp -d 127.0.0.1 --dport "${WEB_PORT}" -j DNAT --to-destination "127.0.0.1:${TARGET_PORT}" 2>/dev/null && out=1
  if [[ "${prerout}" -eq 1 && "${out}" -eq 1 ]]; then
    echo "redirect active: ${WEB_PORT} -> ${TARGET_PORT} (PREROUTING + OUTPUT DNAT)"
    return 0
  fi
  echo "redirect not fully configured (prerout=${prerout} output_dnat=${out})"
  return 1
}

usage() {
  echo "Usage: $0 enable|disable|status" >&2
  exit 1
}

cmd="${1:-enable}"
case "${cmd}" in
  enable)
    echo "=== iptables :${WEB_PORT} -> :${TARGET_PORT} (NodePort) ==="
    _enable_route_localnet
    _del_redirect_rules
    _add_redirect_rules
  ;;
  disable)
    echo "=== remove iptables :${WEB_PORT} redirect ==="
    _del_redirect_rules
  ;;
  status)
    _status
  ;;
  *)
    usage
  ;;
esac
