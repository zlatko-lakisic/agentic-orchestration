#!/usr/bin/env bash
# Shared helper (source it): install scripts that root systemd units execute into
# a root-owned directory instead of running them from the git checkout.
#
# Why: the checkout is owned by the deploy user and the tool tree is hostPath-
# mounted read-write into network-facing pods (engine, warm pool). A root unit
# whose ExecStart points into that tree lets anything that can write the tree —
# the deploy user, or code execution inside one of those pods — become host root
# by editing a script.
#
# What it does: copies the file as committed at git HEAD (not the working tree,
# which those pods can modify; they cannot reach the repository's .git directory)
# to ${AGENTIC_LIBEXEC_DIR:-/usr/local/libexec/agentic-orchestration}, root:root 0755.
#
# Usage (after setting PROJECT_ROOT):
#   source "$(dirname "${BASH_SOURCE[0]}")/lib-root-install.sh"
#   install_root_owned_script agentic-host-control-run.sh
#
# AGENTIC_INSTALL_FROM_WORKTREE=1 installs the working-tree copy instead (local
# testing of an uncommitted change); never set it on a host that serves traffic.

AGENTIC_LIBEXEC_DIR="${AGENTIC_LIBEXEC_DIR:-/usr/local/libexec/agentic-orchestration}"

_root_install_as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

# install_root_owned_script <file name under agentic-orchestration-tool/scripts>
install_root_owned_script() {
  local name="$1"
  local project_root="${PROJECT_ROOT:?PROJECT_ROOT must be set}"
  local rel="agentic-orchestration-tool/scripts/${name}"
  local worktree_file="${project_root}/${rel}"
  local tmp
  tmp="$(mktemp)"
  local source_desc="git HEAD"

  if [[ "${AGENTIC_INSTALL_FROM_WORKTREE:-0}" == "1" ]]; then
    cp "${worktree_file}" "${tmp}"
    source_desc="working tree (AGENTIC_INSTALL_FROM_WORKTREE=1)"
  elif git -c safe.directory="${project_root}" -C "${project_root}" \
      show "HEAD:${rel}" >"${tmp}" 2>/dev/null && [[ -s "${tmp}" ]]; then
    if [[ -f "${worktree_file}" ]] && ! cmp -s "${tmp}" "${worktree_file}"; then
      echo "warning: ${worktree_file} differs from the committed version;" >&2
      echo "         installing the committed version for the root unit." >&2
    fi
  else
    echo "warning: could not read ${rel} from git HEAD; installing the working-tree copy." >&2
    cp "${worktree_file}" "${tmp}"
    source_desc="working tree (git HEAD unavailable)"
  fi

  local rc=0
  _root_install_as_root install -d -o root -g root -m 0755 "${AGENTIC_LIBEXEC_DIR}" || rc=$?
  if [[ "${rc}" -eq 0 ]]; then
    _root_install_as_root install -o root -g root -m 0755 "${tmp}" "${AGENTIC_LIBEXEC_DIR}/${name}" || rc=$?
  fi
  rm -f "${tmp}"
  if [[ "${rc}" -ne 0 ]]; then
    echo "error: could not install ${name} into ${AGENTIC_LIBEXEC_DIR}" >&2
    return "${rc}"
  fi
  echo "installed ${AGENTIC_LIBEXEC_DIR}/${name} (root-owned, from ${source_desc})"
}
