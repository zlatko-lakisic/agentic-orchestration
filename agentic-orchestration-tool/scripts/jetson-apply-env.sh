#!/usr/bin/env bash
# Merge config/env.jetson into agentic-orchestration-tool/.env (gitignored on device).
# Safe to re-run after git pull — updates keys from the tracked template.
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
TEMPLATE="${TOOL_ROOT}/config/env.jetson"
ENV_FILE="${TOOL_ROOT}/.env"

if [[ ! -f "${TEMPLATE}" ]]; then
  echo "Missing ${TEMPLATE} — git pull main?" >&2
  exit 1
fi

touch "${ENV_FILE}"

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    echo "${key}=${val}" >> "${ENV_FILE}"
  fi
}

while IFS= read -r line || [[ -n "${line}" ]]; do
  line="${line//$'\r'/}"
  [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
  if [[ "${line}" != *=* ]]; then
    continue
  fi
  key="${line%%=*}"
  val="${line#*=}"
  key="$(echo "${key}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  val="$(echo "${val}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -z "${key}" ]] && continue
  upsert_env "${key}" "${val}"
done < "${TEMPLATE}"

echo "Applied ${TEMPLATE} -> ${ENV_FILE}"
