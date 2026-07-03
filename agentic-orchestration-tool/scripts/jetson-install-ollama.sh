#!/usr/bin/env bash
# Install or switch Ollama on Jetson.
#
# Default (native): upstream ollama.com binary via install.sh + systemd (CUDA on ARM64).
# Optional (--jetson-containers): NVIDIA jetson-containers image (dustynv/ollama) with host networking.
#
# See https://forums.developer.nvidia.com/t/introducing-ollama-support-for-jetson-devices/289333
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
MODE="${1:-native}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0 [native|jetson-containers]" >&2
  exit 1
fi

export PYTHONPATH="${TOOL_ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

case "${MODE}" in
  native)
    echo "=== Install native Ollama (ollama.com install.sh) ==="
    if ! command -v ollama >/dev/null 2>&1; then
      curl -fsSL https://ollama.com/install.sh | sh
    else
      echo "ollama already installed: $(ollama --version 2>/dev/null || true)"
    fi
    bash "${TOOL_ROOT}/scripts/jetson-fix-ollama-k8s.sh"
  ;;
  jetson-containers|container)
    echo "=== Start Jetson-containers Ollama (dustynv/ollama) ==="
    python3 - <<'PY'
import os
os.environ["AGENTIC_OLLAMA_RUNTIME"] = "jetson-container"
os.environ.setdefault("AGENTIC_EDGE_PLATFORM", "jetson")
from orchestration.ollama_runtime import _install_jetson_container_ollama
_install_jetson_container_ollama()
print("Jetson Ollama container started.")
PY
    bash "${TOOL_ROOT}/scripts/jetson-fix-ollama-k8s.sh"
  ;;
  *)
    echo "Usage: sudo bash $0 [native|jetson-containers]" >&2
    exit 2
    ;;
esac

echo "=== Runtime status ==="
bash "${TOOL_ROOT}/scripts/jetson-verify-ollama.sh"
