#!/usr/bin/env bash
# Build the agentic-orchestrator-env Secret from the tool .env and apply it.
#
# This is the ONLY place the Secret is generated. jetson-k3s-deploy.sh and
# jetson-local-llm-deploy.sh call it with --no-restart; jetson-deploy.sh calls it
# plain. (Three copy-pasted generators used to disagree on worker stdio MCPs,
# delegation and the filesystem MCP root, so the Secret changed depending on
# which script ran last.)
#
# Precedence, lowest to highest:
#   1. defaults below        — feature toggles; anything in .env wins
#   2. the tool .env         — operator settings (env.jetson + env.host are merged
#                              into it by jetson-apply-env.sh)
#   3. cluster wiring below  — values that describe THIS cluster (run-store PVC,
#                              namespace, worker image); a laptop-style .env must
#                              not override them
#
# Usage:
#   bash scripts/jetson-sync-k8s-secret.sh [--no-restart] [--print-keys]
# Env:
#   PROJECT_ROOT (default /var/projects/agentic-orchestration)
#   AGENTIC_RUN_STORE_HOST_PATH / RUN_STORE_HOST (default /var/lib/agentic/run-store)
#   WORKER_IMAGE (default agentic-orchestrator-worker:local)
#   AGENTIC_SECRET_DRY_RUN=1  write nothing to the cluster; print key names only
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${TOOL_ROOT:-${PROJECT_ROOT}/agentic-orchestration-tool}"
RUN_STORE_HOST="${RUN_STORE_HOST:-${AGENTIC_RUN_STORE_HOST_PATH:-/var/lib/agentic/run-store}}"
WORKER_IMAGE="${WORKER_IMAGE:-agentic-orchestrator-worker:local}"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
SECRET_NAME="agentic-orchestrator-env"
ENV_FILE="${ENV_FILE:-${TOOL_ROOT}/.env}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

RESTART=1
PRINT_KEYS=0
for arg in "$@"; do
  case "${arg}" in
    --no-restart) RESTART=0 ;;
    --print-keys) PRINT_KEYS=1 ;;
    *) echo "unknown argument: ${arg}" >&2; exit 2 ;;
  esac
done
DRY_RUN="${AGENTIC_SECRET_DRY_RUN:-0}"

if [[ "${AGENTIC_SECRET_SKIP_APPLY_ENV:-0}" != "1" && -f "${TOOL_ROOT}/scripts/jetson-apply-env.sh" ]]; then
  PROJECT_ROOT="${PROJECT_ROOT}" bash "${TOOL_ROOT}/scripts/jetson-apply-env.sh"
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

umask 077
SECRET_TMP="$(mktemp)"
trap 'rm -f "${SECRET_TMP}"' EXIT

env_file_has_key() {
  grep -qE "^[[:space:]]*$1=" "${ENV_FILE}" 2>/dev/null
}

# Shared operator secret between coordinator (Node) and engine (daemon): the daemon
# requires "Authorization: Bearer <AGENTIC_SERVE_ADMIN_TOKEN>" on /api/v1/admin/*
# when it is set. Keep the value stable across deploys (pods read the Secret only
# at start): .env wins, else reuse what the cluster already has, else generate.
ADMIN_TOKEN_LINE=""
if ! env_file_has_key AGENTIC_SERVE_ADMIN_TOKEN; then
  existing=""
  if [[ "${DRY_RUN}" != "1" ]]; then
    existing="$(kubectl get secret "${SECRET_NAME}" -n "${NS}" \
      -o jsonpath='{.data.AGENTIC_SERVE_ADMIN_TOKEN}' 2>/dev/null | base64 -d 2>/dev/null || true)"
  fi
  if [[ -z "${existing}" ]]; then
    if command -v openssl >/dev/null 2>&1; then
      existing="$(openssl rand -hex 32)"
    else
      existing="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    fi
    echo "generated AGENTIC_SERVE_ADMIN_TOKEN (not set in .env; stored in the Secret only)"
  fi
  ADMIN_TOKEN_LINE="AGENTIC_SERVE_ADMIN_TOKEN=${existing}"
  unset existing
fi

{
  # 1. defaults — overridden by .env
  cat <<ENVEOF
AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url,filesystem_local,openclaw_filesystem,media_understand,media_audio_transcribe,media_video_analyze
AGENTIC_MCP_FETCH_ENABLED=1
AGENTIC_MCP_MEDIA_ENABLED=1
FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace
ENVEOF
  if [[ -n "${ADMIN_TOKEN_LINE}" ]]; then
    printf '%s\n' "${ADMIN_TOKEN_LINE}"
  fi
  # 2. operator .env
  grep -v '^[[:space:]]*#' "${ENV_FILE}" | grep '=' || true
  # 3. cluster wiring — always wins
  cat <<ENVEOF
AGENTIC_EXECUTION_BACKEND=kubernetes
AGENTIC_RUN_STORE_PATH=${RUN_STORE_HOST}
AGENTIC_K8S_RUN_STORE_VOLUME=hostpath
AGENTIC_K8S_RUN_STORE_HOST_PATH=${RUN_STORE_HOST}
AGENTIC_K8S_WORKER_IMAGE=${WORKER_IMAGE}
AGENTIC_K8S_NAMESPACE=${NS}
AGENTIC_K8S_RUN_STORE_PVC=agentic-run-store
AGENTIC_K8S_RUN_STORE_MOUNT=/run/store
AGENTIC_K8S_ENV_SECRET=${SECRET_NAME}
AGENTIC_K8S_WARM_POOL_ENABLED=1
AGENTIC_LOG_FORMAT=json
ENVEOF
} | awk '{
  line=$0
  sub(/\r$/, "", line)
  if (line ~ /^[[:space:]]*#/ || line !~ /=/) next
  key=line
  sub(/=.*$/, "", key)
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
  if (key == "") next
  # Later lines win; seen[] keeps each key once in first-seen order.
  if (!(key in seen)) {
    seen[key]=1
    order[++n]=key
  }
  vals[key]=line
} END { for (i=1;i<=n;i++) print vals[order[i]] }' > "${SECRET_TMP}"
unset ADMIN_TOKEN_LINE

if [[ "${PRINT_KEYS}" == "1" || "${DRY_RUN}" == "1" ]]; then
  echo "--- ${SECRET_NAME} keys (values not shown) ---"
  sed -e 's/=.*$//' "${SECRET_TMP}" | sort
fi
if [[ "${DRY_RUN}" == "1" ]]; then
  if [[ -n "${AGENTIC_SECRET_DRY_RUN_OUT:-}" ]]; then
    cp "${SECRET_TMP}" "${AGENTIC_SECRET_DRY_RUN_OUT}"
  fi
  exit 0
fi

kubectl create secret generic "${SECRET_NAME}" \
  -n "${NS}" \
  --from-env-file="${SECRET_TMP}" \
  --dry-run=client -o yaml | kubectl apply -f -

# The run store holds step specs and results (prompts, tool output). Warn when the
# host directory is open to every local user; see deploy/k8s/README.md.
if [[ -d "${RUN_STORE_HOST}" ]]; then
  mode="$(stat -c '%a' "${RUN_STORE_HOST}" 2>/dev/null || echo "")"
  if [[ -n "${mode}" && "${mode: -1}" != "0" ]]; then
    echo "warning: ${RUN_STORE_HOST} is mode ${mode} (readable by every local user)." >&2
    echo "         Restrict it: sudo chown root:\$(id -gn) ${RUN_STORE_HOST} && sudo chmod 2770 ${RUN_STORE_HOST}" >&2
  fi
fi

if [[ "${RESTART}" == "1" ]]; then
  # Pods read the Secret only at start. Coordinator restart is deferred to
  # jetson-hotfix-web.sh (single rollout per deploy).
  for deploy in agentic-warm-pool agentic-delegation-broker; do
    if kubectl get deployment "${deploy}" -n "${NS}" >/dev/null 2>&1; then
      kubectl rollout restart "deployment/${deploy}" -n "${NS}"
    fi
  done
  if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
    kubectl rollout status deployment/agentic-warm-pool -n "${NS}" --timeout=300s
  fi
fi
