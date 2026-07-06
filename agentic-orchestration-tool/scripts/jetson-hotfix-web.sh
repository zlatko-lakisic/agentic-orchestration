#!/usr/bin/env bash
# Hot-update web UI files in the coordinator pod without rebuilding the Docker image.
# Requires kubectl access (no sudo). Run via jetson-deploy.sh (git pull first — never SCP).
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WEB_ROOT="${PROJECT_ROOT}/agentic-orchestration-web"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

kubectl create configmap agentic-web-hotfix-public -n "${NS}" \
  --from-file=app.js="${WEB_ROOT}/public/app.js" \
  --from-file=index.html="${WEB_ROOT}/public/index.html" \
  --from-file=styles.css="${WEB_ROOT}/public/styles.css" \
  --from-file=host-metrics-ui.js="${WEB_ROOT}/public/host-metrics-ui.js" \
  --from-file=perf-options.js="${WEB_ROOT}/public/perf-options.js" \
  --from-file=crew-log-sequence.js="${WEB_ROOT}/public/crew-log-sequence.js" \
  --from-file=chat-output.js="${WEB_ROOT}/public/chat-output.js" \
  --from-file=text-normalize.js="${WEB_ROOT}/public/text-normalize.js" \
  --from-file=user-context.js="${WEB_ROOT}/public/user-context.js" \
  --from-file=install-prompt.js="${WEB_ROOT}/public/install-prompt.js" \
  --from-file=chat-session.js="${WEB_ROOT}/public/chat-session.js" \
  --from-file=manifest.webmanifest="${WEB_ROOT}/public/manifest.webmanifest" \
  --from-file=sw.js="${WEB_ROOT}/public/sw.js" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap agentic-web-hotfix-root -n "${NS}" \
  --from-file=server.mjs="${WEB_ROOT}/server.mjs" \
  --from-file=host-metrics.mjs="${WEB_ROOT}/host-metrics.mjs" \
  --from-file=perf-options.mjs="${WEB_ROOT}/lib/perf-options.mjs" \
  --from-file=ollama-keepalive.mjs="${WEB_ROOT}/lib/ollama-keepalive.mjs" \
  --from-file=chat-output.mjs="${WEB_ROOT}/lib/chat-output.mjs" \
  --from-file=text-normalize.mjs="${WEB_ROOT}/lib/text-normalize.mjs" \
  --from-file=user-context.mjs="${WEB_ROOT}/lib/user-context.mjs" \
  --dry-run=client -o yaml | kubectl apply -f -

ORCH_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool/orchestration"
kubectl create configmap agentic-tool-hotfix-orchestration -n "${NS}" \
  --from-file=dynamic_planner.py="${ORCH_ROOT}/dynamic_planner.py" \
  --from-file=provider_goal_match.py="${ORCH_ROOT}/provider_goal_match.py" \
  --from-file=ollama_keepalive.py="${ORCH_ROOT}/ollama_keepalive.py" \
  --from-file=kubernetes_warm_pool.py="${ORCH_ROOT}/backends/kubernetes_warm_pool.py" \
  --from-file=execute_step.py="${ORCH_ROOT}/execute_step.py" \
  --from-file=k8s_delegation_tool.py="${ORCH_ROOT}/k8s_delegation_tool.py" \
  --from-file=simple_chat.py="${ORCH_ROOT}/simple_chat.py" \
  --from-file=planner_greeting.py="${ORCH_ROOT}/planner_greeting.py" \
  --from-file=text_normalize.py="${ORCH_ROOT}/text_normalize.py" \
  --dry-run=client -o yaml | kubectl apply -f -

PATCH_FILE="${TOOL_ROOT}/deploy/k8s/coordinator/web-hotfix-volume-patch.yaml"
TOOL_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/tool-hotfix-volume-patch.yaml"
WARM_POOL_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-tool-hotfix-volume-patch.yaml"
HOSTPROC_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/host-metrics-hostproc-patch.yaml"
JTOP_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-jtop-metrics-patch.yaml"
SKILLS_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-agent-skills-hostpath-patch.yaml"
WARM_SKILLS_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-agent-skills-hostpath-patch.yaml"

kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${PATCH_FILE}"
kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${TOOL_PATCH}"
if [[ -f "${HOSTPROC_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${HOSTPROC_PATCH}"
fi
if [[ -f "${JTOP_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${JTOP_PATCH}"
fi
if [[ -f "${SKILLS_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${SKILLS_PATCH}"
fi
if [[ -f "${WARM_POOL_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_POOL_PATCH}"
fi
if [[ -f "${WARM_SKILLS_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_SKILLS_PATCH}"
fi

kubectl rollout restart deployment/agentic-coordinator -n "${NS}"
if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  kubectl rollout restart deployment/agentic-warm-pool -n "${NS}"
fi
kubectl rollout status deployment/agentic-coordinator -n "${NS}" --timeout=600s
if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  kubectl rollout status deployment/agentic-warm-pool -n "${NS}" --timeout=600s
fi

echo "Web hotfix applied. Verify: curl -s http://127.0.0.1/api/host-metrics | head -c 200"
