#!/usr/bin/env bash
# Ensure agentic-orchestration-tool/.venv exists with requirements (Ada / edge host).
# Warm-pool mounts this read-only; packages must be installed on the host first.
#
#   bash agentic-orchestration-tool/scripts/edge-ensure-tool-venv.sh
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
REQ="${TOOL_ROOT}/requirements.txt"

if [[ ! -f "${REQ}" ]]; then
  echo "error: missing ${REQ}" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 not found" >&2
  exit 1
fi

if ! python3 -c "import venv" >/dev/null 2>&1; then
  echo "=== installing python3-venv (required for python3 -m venv) ==="
  apt-get update
  apt-get install -y python3-venv python3-full
fi

cd "${TOOL_ROOT}"

# Empty dir left by hostPath DirectoryOrCreate breaks python3 -m venv.
if [[ -d .venv && ! -x .venv/bin/python ]]; then
  echo "=== removing broken .venv (empty or incomplete) ==="
  rm -rf .venv
fi

if [[ ! -x .venv/bin/python ]]; then
  echo "=== creating ${TOOL_ROOT}/.venv ==="
  python3 -m venv .venv
fi

PY="${TOOL_ROOT}/.venv/bin/python"
PIP="${TOOL_ROOT}/.venv/bin/pip"

echo "=== upgrading pip ==="
"${PY}" -m pip install -U pip wheel

echo "=== installing ${REQ} ==="
"${PIP}" install -r requirements.txt

echo "=== verifying fastapi + crewai ==="
"${PY}" -c "import fastapi, crewai; print('venv_ok', fastapi.__version__)"
