#!/usr/bin/env bash
# Shared helper (source it): resolve the host's OpenClaw directory and render the
# OpenClaw hostPath patches for it.
#
# The patches used to hard-code one operator's home directory and were applied on
# every host with hostPath type DirectoryOrCreate — so any other machine got that
# home directory created as root. They now carry the placeholder
# __AGENTIC_OPENCLAW_HOME__ and are applied only when the directory is known.
#
# Resolution order:
#   1. AGENTIC_OPENCLAW_HOME in the environment
#   2. AGENTIC_OPENCLAW_HOME=... in the tool .env (set it in config/env.host)
#   3. derived from FILESYSTEM_MCP_ALLOWED_DIRECTORY=<dir>/.openclaw/workspace in
#      the tool .env (keeps hosts configured before this variable existed working)
#
# Example (config/env.host):
#   AGENTIC_OPENCLAW_HOME=/home/<your-user>/.openclaw
#   FILESYSTEM_MCP_ALLOWED_DIRECTORY=/home/<your-user>/.openclaw/workspace

_openclaw_env_value() {
  # _openclaw_env_value <env file> <key> — last assignment wins, quotes stripped.
  local file="$1" key="$2" val=""
  [[ -f "${file}" ]] || return 0
  val="$(grep -E "^[[:space:]]*${key}=" "${file}" 2>/dev/null | tail -n 1 | sed -e "s/^[[:space:]]*${key}=//" -e 's/\r$//' || true)"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  printf '%s' "${val}"
}

# resolve_openclaw_home <tool root> — prints the directory, or nothing when unknown.
resolve_openclaw_home() {
  local tool_root="$1"
  local env_file="${tool_root}/.env"
  local home="${AGENTIC_OPENCLAW_HOME:-}"
  if [[ -z "${home}" ]]; then
    home="$(_openclaw_env_value "${env_file}" AGENTIC_OPENCLAW_HOME)"
  fi
  if [[ -z "${home}" ]]; then
    local fs_dir
    fs_dir="$(_openclaw_env_value "${env_file}" FILESYSTEM_MCP_ALLOWED_DIRECTORY)"
    fs_dir="${fs_dir%/}"
    if [[ "${fs_dir}" == */.openclaw/workspace ]]; then
      home="${fs_dir%/workspace}"
    fi
  fi
  home="${home%/}"
  # Absolute path, no characters that would need escaping in sed or YAML.
  if [[ -n "${home}" && "${home}" == /* && "${home}" =~ ^[A-Za-z0-9_./@-]+$ ]]; then
    printf '%s' "${home}"
  fi
}

# render_openclaw_patch <patch template> <openclaw home> — prints the rendered temp file path.
render_openclaw_patch() {
  local src="$1" home="$2" out
  out="$(mktemp)"
  sed -e "s|__AGENTIC_OPENCLAW_HOME__|${home}|g" "${src}" >"${out}"
  printf '%s' "${out}"
}

# apply_openclaw_patch <deployment> <namespace> <patch template> <tool root>
apply_openclaw_patch() {
  local deployment="$1" ns="$2" src="$3" tool_root="$4"
  [[ -f "${src}" ]] || return 0
  local home rendered rc=0
  home="$(resolve_openclaw_home "${tool_root}")"
  if [[ -z "${home}" ]]; then
    echo "=== skip $(basename "${src}"): AGENTIC_OPENCLAW_HOME not set (no OpenClaw mounts) ==="
    return 0
  fi
  rendered="$(render_openclaw_patch "${src}" "${home}")"
  echo "=== ${deployment} patch $(basename "${src}") (OpenClaw home ${home}) ==="
  kubectl patch deployment "${deployment}" -n "${ns}" --patch-file "${rendered}" || rc=$?
  rm -f "${rendered}"
  return "${rc}"
}
