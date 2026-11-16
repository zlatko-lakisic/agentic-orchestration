#!/usr/bin/env bash
# Reduce Jetson unified-memory allocation failures during large Ollama model loads.
#
# Defaults:
#   vm.vfs_cache_pressure=200  - reclaim inode/dentry caches more aggressively
#                               than the Linux default of 100.
#   vm.min_free_kbytes=262144  - keep a 256 MiB reserve for GPU/NvMap allocations.
#
# Existing values above these defaults are preserved. Overrides:
#   AGENTIC_JETSON_VFS_CACHE_PRESSURE
#   AGENTIC_JETSON_MIN_FREE_KBYTES
#   AGENTIC_JETSON_DROP_CACHES_THRESHOLD_KB (default: 1048576 / 1 GiB)
#
# Page-cache dropping is deliberately opt-in. With AGENTIC_JETSON_DROP_CACHES=1,
# caches are dropped when MemAvailable is below the threshold, or unconditionally
# for a one-shot recovery invocation after an Ollama model_load failure:
#   AGENTIC_JETSON_DROP_CACHES=1 bash jetson-ollama-memory-tune.sh
#   AGENTIC_JETSON_DROP_CACHES=1 bash jetson-ollama-memory-tune.sh \
#     --after-model-load-failure
set -euo pipefail

if [[ "$(uname -s 2>/dev/null || true)" != "Linux" ]]; then
  echo "Memory tuning skipped: Linux is required."
  exit 0
fi

VFS_CACHE_PRESSURE="${AGENTIC_JETSON_VFS_CACHE_PRESSURE:-200}"
MIN_FREE_KBYTES="${AGENTIC_JETSON_MIN_FREE_KBYTES:-262144}"
DROP_THRESHOLD_KB="${AGENTIC_JETSON_DROP_CACHES_THRESHOLD_KB:-1048576}"
AFTER_MODEL_LOAD_FAILURE="${AGENTIC_JETSON_MODEL_LOAD_FAILED:-0}"

case "${1:-}" in
  "") ;;
  --after-model-load-failure) AFTER_MODEL_LOAD_FAILURE=1 ;;
  *)
    echo "error: unknown argument: $1" >&2
    exit 2
    ;;
esac

for setting in \
  "AGENTIC_JETSON_VFS_CACHE_PRESSURE:${VFS_CACHE_PRESSURE}" \
  "AGENTIC_JETSON_MIN_FREE_KBYTES:${MIN_FREE_KBYTES}" \
  "AGENTIC_JETSON_DROP_CACHES_THRESHOLD_KB:${DROP_THRESHOLD_KB}"
do
  name="${setting%%:*}"
  value="${setting#*:}"
  if [[ ! "${value}" =~ ^[0-9]+$ ]] || (( value < 1 )); then
    echo "error: ${name} must be a positive integer" >&2
    exit 2
  fi
done

if ! command -v sudo >/dev/null 2>&1 || ! command -v sysctl >/dev/null 2>&1; then
  echo "error: sudo and sysctl are required for Linux memory tuning" >&2
  exit 1
fi

raise_sysctl() {
  local key="$1"
  local target="$2"
  local current
  current="$(sysctl -n "${key}")"
  if [[ ! "${current}" =~ ^[0-9]+$ ]]; then
    echo "error: could not read numeric ${key}" >&2
    exit 1
  fi
  if (( current < target )); then
    sudo sysctl -w "${key}=${target}"
  else
    echo "${key}=${current} (already at or above ${target})"
  fi
}

raise_sysctl vm.vfs_cache_pressure "${VFS_CACHE_PRESSURE}"
raise_sysctl vm.min_free_kbytes "${MIN_FREE_KBYTES}"

MEM_AVAILABLE_KB="$(awk '/^MemAvailable:/ { print $2; exit }' /proc/meminfo)"
if [[ ! "${MEM_AVAILABLE_KB}" =~ ^[0-9]+$ ]]; then
  echo "warn: MemAvailable is unavailable; skipping optional cache drop" >&2
  exit 0
fi

DROP_REASON=""
if [[ "${AFTER_MODEL_LOAD_FAILURE}" == "1" ]]; then
  DROP_REASON="one-shot recovery after model_load failure"
elif (( MEM_AVAILABLE_KB < DROP_THRESHOLD_KB )); then
  DROP_REASON="MemAvailable ${MEM_AVAILABLE_KB} KiB is below ${DROP_THRESHOLD_KB} KiB"
fi

if [[ "${AGENTIC_JETSON_DROP_CACHES:-0}" == "1" && -n "${DROP_REASON}" ]]; then
  echo "Dropping page caches: ${DROP_REASON}."
  sync
  echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null
elif [[ -n "${DROP_REASON}" ]]; then
  echo "Cache drop recommended (${DROP_REASON}) but AGENTIC_JETSON_DROP_CACHES is not 1."
else
  echo "Cache drop not needed; MemAvailable=${MEM_AVAILABLE_KB} KiB."
fi
