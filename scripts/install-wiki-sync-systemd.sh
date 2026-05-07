#!/usr/bin/env bash
set -euo pipefail

# Install a systemd service+timer that runs scripts/sync-wiki.sh periodically.
# Usage:
#   sudo ./scripts/install-wiki-sync-systemd.sh [interval_minutes]
# Example:
#   sudo ./scripts/install-wiki-sync-systemd.sh 5

interval_min="${1:-5}"
if ! [[ "$interval_min" =~ ^[0-9]+$ ]] || [[ "$interval_min" -lt 1 ]]; then
  echo "[wiki-sync] interval must be a positive integer (minutes)." >&2
  exit 1
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "[wiki-sync] run as root (use sudo)." >&2
  exit 1
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script_path="$here/sync-wiki.sh"

if [[ ! -f "$script_path" ]]; then
  echo "[wiki-sync] missing script: $script_path" >&2
  exit 1
fi

chmod +x "$script_path"

service_file="/etc/systemd/system/agentic-wiki-sync.service"
timer_file="/etc/systemd/system/agentic-wiki-sync.timer"

cat >"$service_file" <<EOF
[Unit]
Description=Auto-sync agentic wiki repository
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$here
ExecStart=/usr/bin/env bash $script_path
EOF

cat >"$timer_file" <<EOF
[Unit]
Description=Run wiki sync every ${interval_min} minute(s)

[Timer]
OnBootSec=2min
OnUnitActiveSec=${interval_min}min
Unit=agentic-wiki-sync.service
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now agentic-wiki-sync.timer

echo "[wiki-sync] installed timer: agentic-wiki-sync.timer"
echo "[wiki-sync] check timer: systemctl status agentic-wiki-sync.timer --no-pager"
echo "[wiki-sync] check runs:  journalctl -u agentic-wiki-sync.service -f"

