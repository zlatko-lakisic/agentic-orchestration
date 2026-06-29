#!/usr/bin/env bash
# Run user agent harness packs (see wiki User-agent-harnesses).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tool_root="$(cd "$here/.." && pwd)"
cd "$tool_root"

py="${AGENTIC_PYTHON:-python}"
args=(main.py)

example=""
agent=""
run_all=0
json=0
fail_fast=0
harness_dirs=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --example) example="$2"; shift 2 ;;
    --harness-dir) harness_dirs+=("$2"); shift 2 ;;
    --harness-agent) agent="$2"; shift 2 ;;
    --user-harness-run-all) run_all=1; shift ;;
    --harness-json) json=1; shift ;;
    --harness-fail-fast) fail_fast=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$example" ]] && args+=(--example "$example")
for d in "${harness_dirs[@]}"; do
  args+=(--harness-dir "$d")
done
if [[ -n "$agent" ]]; then
  args+=(--harness-agent "$agent")
elif [[ "$run_all" -eq 1 ]]; then
  args+=(--user-harness-run-all)
else
  echo "Specify --harness-agent ID or --user-harness-run-all" >&2
  exit 2
fi
[[ "$json" -eq 1 ]] && args+=(--harness-json)
[[ "$fail_fast" -eq 1 ]] && args+=(--harness-fail-fast)

exec "$py" "${args[@]}"
