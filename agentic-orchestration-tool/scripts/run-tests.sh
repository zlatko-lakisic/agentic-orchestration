#!/usr/bin/env bash
# Run the default unit test tier (same as GitHub Actions CI).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
python -m pip install -q -r requirements.txt -r requirements-dev.txt
exec pytest "$@"
