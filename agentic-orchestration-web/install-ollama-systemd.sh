#!/usr/bin/env bash
set -euo pipefail

# Installs systemd unit agentic-ollama.service so `ollama serve` runs at boot with Restart=always.
#
# Usage (from this directory):
#   sudo ./install-ollama-systemd.sh
#
# Environment:
#   AGENTIC_OLLAMA_LISTEN — value for OLLAMA_HOST (default 127.0.0.1:11434). Must match what the
#     orchestrator expects (see agent_providers/ollama_provider.py).
#   OLLAMA_BIN_OVERRIDE — full path to ollama when it is not on PATH for root (optional).
#
# If you already use the upstream `ollama.service` from ollama.com’s installer, disable one of the
# two units to avoid two processes binding the same port:
#   sudo systemctl disable --now ollama.service
# or skip this script and only add After=/Wants= to the web unit for `ollama.service`.

unit_name="agentic-ollama.service"
listen="${AGENTIC_OLLAMA_LISTEN:-127.0.0.1:11434}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$EUID" -ne 0 ]]; then
  echo "[systemd] run as root (use sudo)." >&2
  exit 1
fi

if systemctl is-active --quiet ollama.service 2>/dev/null; then
  echo "[systemd] ollama.service is already running — skip $unit_name to avoid port 11434 conflicts."
  echo "[systemd] To use only agentic-ollama instead: sudo systemctl disable --now ollama.service"
  exit 0
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "[systemd] systemctl not found. This script requires systemd." >&2
  exit 1
fi

resolve_ollama_bin() {
  if [[ -n "${OLLAMA_BIN_OVERRIDE:-}" ]]; then
    if [[ -x "$OLLAMA_BIN_OVERRIDE" ]]; then
      printf '%s\n' "$OLLAMA_BIN_OVERRIDE"
      return 0
    fi
    echo "[systemd] OLLAMA_BIN_OVERRIDE is set but not executable: $OLLAMA_BIN_OVERRIDE" >&2
    return 1
  fi
  if command -v ollama >/dev/null 2>&1; then
    command -v ollama
    return 0
  fi
  local candidate
  for candidate in /usr/local/bin/ollama /usr/bin/ollama; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

ollama_bin="$(resolve_ollama_bin)" || {
  echo "[systemd] ollama binary not found. Install Ollama (https://ollama.com) or set OLLAMA_BIN_OVERRIDE." >&2
  exit 1
}

cat >/etc/systemd/system/$unit_name <<EOF
[Unit]
Description=Ollama (Agentic Orchestration)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$ollama_bin serve
Restart=always
RestartSec=3
Environment=OLLAMA_HOST=$listen

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$unit_name"

echo "[systemd] installed $unit_name (ExecStart=$ollama_bin serve, OLLAMA_HOST=$listen)"
echo "[systemd] status: systemctl status $unit_name --no-pager"
echo "[systemd] logs:   journalctl -u $unit_name -f"
