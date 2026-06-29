#!/usr/bin/env bash
# Run platform agent harness (see wiki Agent-harness-roadmap).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "$HERE/.." && pwd)"
cd "$TOOL_ROOT"

TIER="${1:-static}"
FILTER="${2:-}"
PY="${AGENTIC_PYTHON:-python}"

ARGS=(main.py --harness-batch "--harness-tier=$TIER")
if [[ -n "$FILTER" ]]; then
  ARGS+=(--harness-filter "$FILTER")
fi

exec "$PY" "${ARGS[@]}"
