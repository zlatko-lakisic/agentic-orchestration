#!/usr/bin/env bash
# One-shot live object_detection e2e.
# Usage: bash scripts/detection-e2e.sh [--serve]
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Installing requirements-detection.txt ..."
python -m pip install -r requirements-detection.txt
export AGENTIC_DETECTION_E2E=1
if [[ "${1:-}" == "--serve" ]]; then
  export AGENTIC_DETECTION_E2E_SERVE=1
fi
echo "Running live detection e2e ..."
python -m pytest tests/test_object_detection_e2e.py -m integration -s
