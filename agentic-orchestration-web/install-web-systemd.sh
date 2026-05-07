#!/usr/bin/env bash
set -euo pipefail

# Installs a persistent systemd service for agentic-orchestration-web on Ubuntu.
# Usage:
#   sudo ./install-web-systemd.sh [PORT] [HOST]
# Example:
#   sudo ./install-web-systemd.sh 80 0.0.0.0

PORT="${1:-3847}"
HOST="${2:-0.0.0.0}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
unit_name="agentic-orchestration-web.service"
env_file="$here/.env"

if [[ ! -f "$here/start-web.sh" ]]; then
  echo "[systemd] missing start-web.sh in $here" >&2
  exit 1
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "[systemd] run as root (use sudo)." >&2
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "[systemd] systemctl not found. This script requires systemd." >&2
  exit 1
fi

# Ensure static host/port are present in .env (replace if existing, append otherwise).
touch "$env_file"
if grep -q '^AGENTIC_WEB_PORT=' "$env_file"; then
  sed -i "s/^AGENTIC_WEB_PORT=.*/AGENTIC_WEB_PORT=${PORT}/" "$env_file"
else
  printf '\nAGENTIC_WEB_PORT=%s\n' "$PORT" >>"$env_file"
fi

if grep -q '^AGENTIC_WEB_HOST=' "$env_file"; then
  sed -i "s/^AGENTIC_WEB_HOST=.*/AGENTIC_WEB_HOST=${HOST}/" "$env_file"
else
  printf 'AGENTIC_WEB_HOST=%s\n' "$HOST" >>"$env_file"
fi

cat >/etc/systemd/system/$unit_name <<EOF
[Unit]
Description=Agentic Orchestration Web
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$here
Environment=HOST=$HOST
Environment=PORT=$PORT
ExecStart=/usr/bin/env bash $here/start-web.sh
Restart=always
RestartSec=2
KillSignal=SIGTERM
TimeoutStopSec=20
StandardOutput=append:$here/.web-service.log
StandardError=append:$here/.web-service.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$unit_name"

echo "[systemd] installed $unit_name"
echo "[systemd] host=$HOST port=$PORT"
echo "[systemd] status: systemctl status $unit_name --no-pager"
echo "[systemd] logs:   journalctl -u $unit_name -f"

