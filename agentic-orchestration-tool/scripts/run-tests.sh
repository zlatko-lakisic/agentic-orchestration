#!/usr/bin/env bash
# Run the default unit test tier (same as GitHub Actions CI).
set -euo pipefail
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$TOOL_ROOT"
python -m pip install -q -r requirements-test.txt
exec python -m pytest "$@"
