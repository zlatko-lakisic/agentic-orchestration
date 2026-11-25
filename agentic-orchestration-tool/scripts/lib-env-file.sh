#!/usr/bin/env bash
# Shared helper (source it): read selected KEY=VALUE settings from a .env file
# WITHOUT sourcing it.
#
# `source .env` executes the file as shell: a value containing spaces, `$(...)`,
# backticks or `;` runs commands, and every secret in the file is exported into
# the script's environment (and its children's). These scripts only need a few
# non-secret settings, so they read exactly those.
#
#   load_env_keys <env file> KEY [KEY ...]
#
# A variable that is already set in the environment keeps its value (the
# environment wins over the file).
load_env_keys() {
  local file="$1"
  shift
  [[ -f "${file}" ]] || return 0
  local key val
  for key in "$@"; do
    if [[ -n "${!key+x}" ]]; then
      continue
    fi
    val="$(grep -E "^[[:space:]]*${key}=" "${file}" 2>/dev/null | tail -n 1 \
      | sed -e "s/^[[:space:]]*${key}=//" -e 's/\r$//' || true)"
    [[ -n "${val}" ]] || continue
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    export "${key}=${val}"
  done
}
