#!/usr/bin/env bash
# Switch Jetson to llama3.2:3b and remove legacy Ollama models.
set -euo pipefail
PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
ENV_FILE="${TOOL_ROOT}/.env"

cd "${PROJECT_ROOT}"
git pull origin main

# Update .env keys (create if missing)
upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    echo "${key}=${val}" >> "${ENV_FILE}"
  fi
}

upsert_env AGENTIC_PLANNER_MODEL 'ollama/llama3.2:3b'
upsert_env AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS 'ollama_llama3_2_3b'
grep -q '^AGENTIC_AGENT_PROVIDERS_CATALOG=' "${ENV_FILE}" || \
  echo 'AGENTIC_AGENT_PROVIDERS_CATALOG=config/agent_providers_jetson' >> "${ENV_FILE}"

# llava not on disk — disable until pulled
if grep -q '^AGENTIC_VIDEO_VISION_MODEL=' "${ENV_FILE}"; then
  sed -i 's|^AGENTIC_VIDEO_VISION_MODEL=|#AGENTIC_VIDEO_VISION_MODEL=|' "${ENV_FILE}"
fi

echo "Pulling llama3.2:3b on host Ollama..."
sudo -u ollama ollama pull llama3.2:3b

echo "Removing legacy models..."
sudo -u ollama ollama rm qwen2.5 2>/dev/null || true
sudo -u ollama ollama rm sike_aditya/AgriLlama 2>/dev/null || true

sudo -u ollama ollama list

sed -i 's/\r$//' "${TOOL_ROOT}/scripts/jetson-local-llm-deploy.sh"
bash "${TOOL_ROOT}/scripts/jetson-local-llm-deploy.sh"
