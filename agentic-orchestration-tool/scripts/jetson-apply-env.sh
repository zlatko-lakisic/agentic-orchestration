#!/usr/bin/env bash
# Merge a tracked env template into agentic-orchestration-tool/.env (gitignored on device).
# Safe to re-run after git pull — updates keys from the template.
#
# Template resolution (first match wins):
#   1. $AGENTIC_ENV_TEMPLATE (absolute or relative to tool root)
#   2. config/env.host (optional per-machine override; gitignored)
#   3. config/env.jetson (default Jetson / edge template)
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
ENV_FILE="${TOOL_ROOT}/.env"

if [[ -n "${AGENTIC_ENV_TEMPLATE:-}" ]]; then
  if [[ "${AGENTIC_ENV_TEMPLATE}" = /* ]]; then
    TEMPLATE="${AGENTIC_ENV_TEMPLATE}"
  else
    TEMPLATE="${TOOL_ROOT}/${AGENTIC_ENV_TEMPLATE}"
  fi
elif [[ -f "${TOOL_ROOT}/config/env.host" ]]; then
  TEMPLATE="${TOOL_ROOT}/config/env.host"
else
  TEMPLATE="${TOOL_ROOT}/config/env.jetson"
fi

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

sed -i 's/\r$//' "${ENV_FILE}"

echo "Applied ${TEMPLATE} -> ${ENV_FILE}"

VERIFY="${TOOL_ROOT}/scripts/jetson-verify-ollama.sh"
if [[ -x "${VERIFY}" ]] || [[ -f "${VERIFY}" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    echo "--- edge / ollama runtime ---"
    bash "${VERIFY}" 2>/dev/null || true
  fi
fi
