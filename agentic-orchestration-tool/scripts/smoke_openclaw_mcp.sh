#!/usr/bin/env bash
# Jetson smoke: OpenClaw MCP tools via AO POST /api/v1/orchestrate.
# Usage:
#   bash agentic-orchestration-tool/scripts/smoke_openclaw_mcp.sh
#   SMOKE_ROUNDS=5 bash .../smoke_openclaw_mcp.sh --until-pass
#   bash .../smoke_openclaw_mcp.sh --only fs_list_workspace,fs_read_smoke_file
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

export SMOKE_URL="${SMOKE_URL:-http://127.0.0.1:30487/api/v1/orchestrate}"
export SMOKE_PROVIDER_ID="${SMOKE_PROVIDER_ID:-ollama_llama3_2_3b}"
export SMOKE_TIMEOUT_S="${SMOKE_TIMEOUT_S:-300}"
export SMOKE_WORKSPACE="${SMOKE_WORKSPACE:-${HOME}/.openclaw/workspace}"

if [[ -z "${SMOKE_API_KEY:-}" ]]; then
  SMOKE_API_KEY="$(
    kubectl get secret agentic-orchestrator-env -n "${NS}" \
      -o jsonpath='{.data.AGENTIC_ORCHESTRATE_API_KEY}' 2>/dev/null | base64 -d || true
  )"
  if [[ -z "${SMOKE_API_KEY}" ]]; then
    SMOKE_API_KEY="$(
      kubectl get secret agentic-orchestrator-env -n "${NS}" \
        -o jsonpath='{.data.AGENTIC_CHAT_COMPLETIONS_API_KEY}' 2>/dev/null | base64 -d || true
    )"
  fi
  export SMOKE_API_KEY
fi

exec python3 "${SCRIPT_DIR}/smoke_openclaw_mcp_api.py" "$@"
