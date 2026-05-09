#!/usr/bin/env bash
set -euo pipefail

# Installs a persistent systemd service for agentic-orchestration-web on Ubuntu.
# Usage:
#   sudo ./install-web-systemd.sh [PORT] [HOST]
# Example:
#   sudo ./install-web-systemd.sh 80 0.0.0.0
#
# Optional: also install Ollama as its own unit and start it before the web service:
#   sudo INSTALL_AGENTIC_OLLAMA=1 ./install-web-systemd.sh 80 0.0.0.0
# Or install only Ollama:
#   sudo ./install-ollama-systemd.sh
#
# Node on PATH: systemd does not load .bashrc / nvm. If `env -i PATH=/usr/local/bin:...:/usr/bin ... node -v`
# shows an old distro Node (e.g. v12 under /usr/bin) while your shell has Node 18+, set:
#   AGENTIC_WEB_SERVICE_PATH_PREFIX=/root/.nvm/versions/node/v25.9.0/bin
# or reinstall from a shell where `command -v node` is correct — this script prepends that dir automatically.

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

if [[ "${INSTALL_AGENTIC_OLLAMA:-0}" == "1" ]]; then
  if [[ ! -f "$here/install-ollama-systemd.sh" ]]; then
    echo "[systemd] INSTALL_AGENTIC_OLLAMA=1 but missing install-ollama-systemd.sh in $here" >&2
    exit 1
  fi
  bash "$here/install-ollama-systemd.sh"
  unit_after="After=network-online.target agentic-ollama.service"
  unit_wants="Wants=network-online.target agentic-ollama.service"
else
  unit_after="After=network-online.target"
  unit_wants="Wants=network-online.target"
fi

standard_sys_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
if [[ -n "${AGENTIC_WEB_SERVICE_PATH_PREFIX:-}" ]]; then
  service_path="${AGENTIC_WEB_SERVICE_PATH_PREFIX}:${standard_sys_path}"
  echo "[systemd] PATH: prepending AGENTIC_WEB_SERVICE_PATH_PREFIX"
elif command -v node >/dev/null 2>&1; then
  nodir="$(dirname "$(command -v node)")"
  major="$(node -p "parseInt(process.version.slice(1),10)" 2>/dev/null || echo 0)"
  if [[ "${major:-0}" -ge 14 ]] || [[ "$nodir" != "/usr/bin" ]]; then
    service_path="${nodir}:${standard_sys_path}"
    echo "[systemd] PATH: prepending Node from $(command -v node) ($(node -v 2>/dev/null || echo '?'))"
  else
    service_path="$standard_sys_path"
    echo "[systemd] WARNING: installer's default node is ${nodir}/node ($(node -v 2>/dev/null)); systemd would still see old PATH without nvm. Set AGENTIC_WEB_SERVICE_PATH_PREFIX to your Node 18+ bin directory." >&2
  fi
else
  service_path="$standard_sys_path"
  echo "[systemd] WARNING: node not found on PATH during install; unit PATH omits nvm/custom Node." >&2
fi

cat >/etc/systemd/system/$unit_name <<EOF
[Unit]
Description=Agentic Orchestration Web
$unit_after
$unit_wants

[Service]
Type=simple
WorkingDirectory=$here
Environment=HOST=$HOST
Environment=PORT=$PORT
Environment=PATH=$service_path
ExecStart=/usr/bin/env bash $here/start-web.sh
Restart=always
RestartSec=2
KillSignal=SIGTERM
TimeoutStopSec=20
# Send logs to journald so `journalctl -u agentic-orchestration-web` shows output.
# (Redirecting to a file leaves the journal empty and confuses debugging.)
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$unit_name"

echo "[systemd] installed $unit_name"
echo "[systemd] host=$HOST port=$PORT"
echo "[systemd] status: systemctl status $unit_name --no-pager"
echo "[systemd] logs:   journalctl -u $unit_name -f"
echo "[systemd] note:   older installs wrote stdout/stderr to $here/.web-service.log — check that file for errors before the last reinstall."

