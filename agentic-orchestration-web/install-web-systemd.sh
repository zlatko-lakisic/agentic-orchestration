#!/usr/bin/env bash
set -euo pipefail

# Installs a persistent systemd service for agentic-orchestration-web on Ubuntu.
# Usage:
#   sudo ./install-web-systemd.sh [PORT] [HOST]
# Defaults: PORT=3847, HOST=127.0.0.1 (loopback only).
#
# The chat WebSocket is unauthenticated until UI tokens are minted, so only bind a routable
# address when an authenticating proxy / VPN is in front of it:
#   sudo ./install-web-systemd.sh 80 0.0.0.0
#
# Service account: the unit runs as a non-root user — AGENTIC_WEB_SERVICE_USER when set,
# otherwise the owner of this checkout, otherwise the sudo caller. It only stays root when all
# of those are root (a warning is printed). Example:
#   sudo AGENTIC_WEB_SERVICE_USER=agentic ./install-web-systemd.sh
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
HOST="${2:-127.0.0.1}"

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

case "$HOST" in
  127.*|localhost|::1) ;;
  *)
    echo "[systemd] WARNING: binding $HOST exposes the web UI beyond this machine. Put an authenticating proxy or VPN in front of it and mint the ao-web / ao-chat tokens (Admin → Access)." >&2
    ;;
esac

# Pick the service account (never root unless nothing else is available).
service_user="${AGENTIC_WEB_SERVICE_USER:-}"
if [[ -z "$service_user" ]]; then
  owner="$(stat -c '%U' "$here" 2>/dev/null || true)"
  if [[ -n "$owner" && "$owner" != "root" && "$owner" != "UNKNOWN" ]]; then
    service_user="$owner"
  elif [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    service_user="$SUDO_USER"
  else
    service_user="root"
  fi
fi
if ! id "$service_user" >/dev/null 2>&1; then
  echo "[systemd] service user '$service_user' does not exist. Create it or set AGENTIC_WEB_SERVICE_USER." >&2
  exit 1
fi
service_group="$(id -gn "$service_user")"

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

# A non-root account cannot use a Node that lives in root's home (nvm under /root).
if [[ "$service_user" != "root" && "$service_path" == /root/* ]]; then
  echo "[systemd] WARNING: Node is installed under /root (${service_path%%:*}), which '$service_user' cannot read; the service will run as root. Install Node system-wide (or set AGENTIC_WEB_SERVICE_PATH_PREFIX) to run it unprivileged." >&2
  service_user="root"
  service_group="root"
fi
if [[ "$service_user" == "root" ]]; then
  echo "[systemd] WARNING: the service will run as root. Set AGENTIC_WEB_SERVICE_USER to a dedicated account that owns $here and the tool checkout." >&2
fi

# The .env may hold API keys: owner-only, and owned by the account that reads it.
chown "$service_user:$service_group" "$env_file" 2>/dev/null || true
chmod 600 "$env_file" 2>/dev/null || true

# Install dependencies now (lockfile-pinned), not on every service start.
if [[ ! -d "$here/node_modules" ]]; then
  echo "[systemd] installing Node dependencies (npm ci) as $service_user"
  if [[ "$service_user" == "root" ]]; then
    (cd "$here" && PATH="$service_path" npm ci --omit=dev --no-audit --no-fund)
  elif command -v runuser >/dev/null 2>&1; then
    runuser -u "$service_user" -- env PATH="$service_path" bash -c 'cd "$1" && npm ci --omit=dev --no-audit --no-fund' _ "$here"
  else
    su -s /bin/bash "$service_user" -c "cd '$here' && PATH='$service_path' npm ci --omit=dev --no-audit --no-fund"
  fi
fi

# Ports below 1024 need a capability once the service is not root.
unit_caps=""
if [[ "$service_user" != "root" && "$PORT" =~ ^[0-9]+$ && "$PORT" -lt 1024 ]]; then
  unit_caps="AmbientCapabilities=CAP_NET_BIND_SERVICE"
fi

cat >/etc/systemd/system/$unit_name <<EOF
[Unit]
Description=Agentic Orchestration Web
$unit_after
$unit_wants

[Service]
Type=simple
User=$service_user
Group=$service_group
$unit_caps
WorkingDirectory=$here
Environment=HOST=$HOST
Environment=PORT=$PORT
Environment=PATH=$service_path
# Dependencies are installed by this installer; never run a package install at service start.
Environment=AGENTIC_WEB_SKIP_NPM_INSTALL=1
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
echo "[systemd] host=$HOST port=$PORT user=$service_user"
echo "[systemd] status: systemctl status $unit_name --no-pager"
echo "[systemd] logs:   journalctl -u $unit_name -f"
echo "[systemd] note:   older installs wrote stdout/stderr to $here/.web-service.log — check that file for errors before the last reinstall."

