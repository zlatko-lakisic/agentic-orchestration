#!/usr/bin/env bash
# Report edge platform + Ollama runtime on this host (JSON).
set -euo pipefail
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${TOOL_ROOT}"
export PYTHONPATH="${TOOL_ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
python3 -c "from orchestration.ollama_runtime import runtime_status_json; print(runtime_status_json())"
