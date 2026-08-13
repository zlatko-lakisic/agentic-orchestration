#!/usr/bin/env bash
# Pull Jetson-friendly Ollama models into AGENTIC_OLLAMA_MODELS_HOSTPATH
# (default /mnt/nvme/ollama/models). Safe to re-run.
set -u
MODELS_DIR="${AGENTIC_OLLAMA_MODELS_HOSTPATH:-/mnt/nvme/ollama/models}"
export OLLAMA_MODELS="${MODELS_DIR}"
mkdir -p "${MODELS_DIR}"

models=(
  llama3.2:3b
  gemma4:e2b
  gemma4:e4b
  gemma4:12b
  gemma4:26b
  qwen3.5:4b
  qwen3.5:9b
  qwen3.5:27b
  llama3.1:8b
  muse-glimmer
  nemotron-3.5-lightning
  qwen2.5:7b
  qwen2.5:14b-instruct
  mistral-nemo
  deepseek-r1:14b
  glm4
  moondream
  lfm2:24b
  granite4.1:8b
  phi4
)

ok=0
fail=0
for m in "${models[@]}"; do
  echo "=== ollama pull ${m} ==="
  if ollama pull "${m}"; then
    ok=$((ok + 1))
  else
    echo "WARN: pull failed for ${m}" >&2
    fail=$((fail + 1))
  fi
done
echo "Done. ok=${ok} fail=${fail}"
ollama list
df -h "${MODELS_DIR}" || true
