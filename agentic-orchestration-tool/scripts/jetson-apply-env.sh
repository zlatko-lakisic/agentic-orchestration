#!/usr/bin/env bash
# Merge tracked env template(s) into agentic-orchestration-tool/.env (gitignored on device).
# Safe to re-run after git pull — updates keys from the template(s).
#
# Template layering (later wins):
#   1. config/env.jetson (shared edge defaults), unless AGENTIC_ENV_TEMPLATE is set
#      (then only that file is applied — absolute or relative to tool root)
#   2. config/env.host (optional per-machine overrides; gitignored)
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
ENV_FILE="${TOOL_ROOT}/.env"

TEMPLATES=()
if [[ -n "${AGENTIC_ENV_TEMPLATE:-}" ]]; then
  if [[ "${AGENTIC_ENV_TEMPLATE}" = /* ]]; then
    TEMPLATES+=("${AGENTIC_ENV_TEMPLATE}")
  else
    TEMPLATES+=("${TOOL_ROOT}/${AGENTIC_ENV_TEMPLATE}")
  fi
else
  TEMPLATES+=("${TOOL_ROOT}/config/env.jetson")
  if [[ -f "${TOOL_ROOT}/config/env.host" ]]; then
    TEMPLATES+=("${TOOL_ROOT}/config/env.host")
  fi
fi

touch "${ENV_FILE}"

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    echo "${key}=${val}" >>"${ENV_FILE}"
  fi
}

apply_template() {
  local template="$1"
  if [[ ! -f "${template}" ]]; then
    echo "Missing ${template} — git pull main?" >&2
    return 1
  fi
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line//$'\r'/}"
    [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
    if [[ "${line}" != *=* ]]; then
      continue
    fi
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(echo "${key}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    val="$(echo "${val}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "${key}" ]] && continue
    upsert_env "${key}" "${val}"
  done < "${template}"
  echo "Applied ${template} -> ${ENV_FILE}"
}

for TEMPLATE in "${TEMPLATES[@]}"; do
  apply_template "${TEMPLATE}"
done

sed -i 's/\r$//' "${ENV_FILE}"

VERIFY="${TOOL_ROOT}/scripts/jetson-verify-ollama.sh"
if [[ -x "${VERIFY}" ]] || [[ -f "${VERIFY}" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    echo "--- edge / ollama runtime ---"
    bash "${VERIFY}" 2>/dev/null || true
  fi
fi
