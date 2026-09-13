#!/usr/bin/env bash
# One-shot live object_detection e2e.
# Usage: bash scripts/detection-e2e.sh [--gpu] [--serve]
set -euo pipefail
cd "$(dirname "$0")/.."
GPU=0
SERVE=0
for arg in "$@"; do
  case "$arg" in
    --gpu) GPU=1 ;;
    --serve) SERVE=1 ;;
  esac
done
if [[ "$GPU" == "1" ]]; then
  echo "Installing requirements-detection-gpu.txt (onnxruntime-gpu + cuDNN) ..."
  python -m pip uninstall -y onnxruntime >/dev/null 2>&1 || true
  python -m pip install -r requirements-detection-gpu.txt
else
  echo "Installing requirements-detection.txt ..."
  python -m pip install -r requirements-detection.txt
fi
export AGENTIC_DETECTION_E2E=1
if [[ "$SERVE" == "1" ]]; then
  export AGENTIC_DETECTION_E2E_SERVE=1
fi
echo "Running live detection e2e ..."
python -m pytest tests/test_object_detection_e2e.py -m integration -s
