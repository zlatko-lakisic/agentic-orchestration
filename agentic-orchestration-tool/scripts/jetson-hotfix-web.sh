#!/usr/bin/env bash
# Hot-update web UI files in the coordinator pod without rebuilding the Docker image.
# Requires kubectl access (no sudo). Run via jetson-deploy.sh (git pull first — never SCP).
set -eu
PROJECT_ROOT="${1:-/var/projects/agentic-orchestration}"
TOOL_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
WEB_ROOT="${PROJECT_ROOT}/agentic-orchestration-web"
NS="${AGENTIC_K8S_NAMESPACE:-agentic-orchestration}"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

# Prefer replace/create over client-side apply: large Python files exceed the
# last-applied-configuration annotation size limit (262144 bytes).
apply_configmap() {
  local name="$1"
  shift
  kubectl create configmap "${name}" -n "${NS}" "$@" --dry-run=client -o yaml \
    | kubectl replace -f - \
    || kubectl create configmap "${name}" -n "${NS}" "$@"
}

apply_configmap agentic-web-hotfix-public \
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
  --from-file=proxy-context.js="${WEB_ROOT}/public/proxy-context.js" \
  --from-file=ws-singleton.js="${WEB_ROOT}/public/ws-singleton.js" \
  --from-file=pwa-manifest-data.js="${WEB_ROOT}/public/pwa-manifest-data.js" \
  --from-file=pwa-manifest-link.js="${WEB_ROOT}/public/pwa-manifest-link.js" \
  --from-file=chat-session.js="${WEB_ROOT}/public/chat-session.js" \
  --from-file=manifest.webmanifest="${WEB_ROOT}/public/manifest.webmanifest" \
  --from-file=sw.js="${WEB_ROOT}/public/sw.js"

apply_configmap agentic-web-hotfix-root \
  --from-file=server.mjs="${WEB_ROOT}/server.mjs" \
  --from-file=host-metrics.mjs="${WEB_ROOT}/host-metrics.mjs" \
  --from-file=perf-options.mjs="${WEB_ROOT}/lib/perf-options.mjs" \
  --from-file=ollama-keepalive.mjs="${WEB_ROOT}/lib/ollama-keepalive.mjs" \
  --from-file=chat-output.mjs="${WEB_ROOT}/lib/chat-output.mjs" \
  --from-file=text-normalize.mjs="${WEB_ROOT}/lib/text-normalize.mjs" \
  --from-file=user-context.mjs="${WEB_ROOT}/lib/user-context.mjs" \
  --from-file=admin-api.mjs="${WEB_ROOT}/lib/admin-api.mjs"

TOOL_PY_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool"
ORCH_ROOT="${TOOL_PY_ROOT}/orchestration"
apply_configmap agentic-tool-hotfix-orchestration \
  --from-file=main.py="${TOOL_PY_ROOT}/main.py" \
  --from-file=dynamic_planner.py="${ORCH_ROOT}/dynamic_planner.py" \
  --from-file=provider_goal_match.py="${ORCH_ROOT}/provider_goal_match.py" \
  --from-file=ollama_keepalive.py="${ORCH_ROOT}/ollama_keepalive.py" \
  --from-file=ollama_serve_lifecycle.py="${ORCH_ROOT}/ollama_serve_lifecycle.py" \
  --from-file=session_overlay.py="${ORCH_ROOT}/session_overlay.py" \
  --from-file=session_overlay_runtime.py="${ORCH_ROOT}/session_overlay_runtime.py" \
  --from-file=mcp_tunnel.py="${ORCH_ROOT}/mcp_tunnel.py" \
  --from-file=kubernetes_warm_pool.py="${ORCH_ROOT}/backends/kubernetes_warm_pool.py" \
  --from-file=execute_step.py="${ORCH_ROOT}/execute_step.py" \
  --from-file=k8s_delegation_tool.py="${ORCH_ROOT}/k8s_delegation_tool.py" \
  --from-file=simple_chat.py="${ORCH_ROOT}/simple_chat.py" \
  --from-file=planner_greeting.py="${ORCH_ROOT}/planner_greeting.py" \
  --from-file=text_normalize.py="${ORCH_ROOT}/text_normalize.py" \
  --from-file=mcp_task_hints.py="${ORCH_ROOT}/mcp_task_hints.py" \
  --from-file=mcp_tool_leak_recovery.py="${ORCH_ROOT}/mcp_tool_leak_recovery.py" \
  --from-file=irrigation_minutes.py="${ORCH_ROOT}/irrigation_minutes.py" \
  --from-file=fetch_url_tool.py="${ORCH_ROOT}/fetch_url_tool.py" \
  --from-file=step_context.py="${ORCH_ROOT}/step_context.py" \
  --from-file=video_vision_synopsis.py="${ORCH_ROOT}/video_vision_synopsis.py" \
  --from-file=goal_format_hints.py="${ORCH_ROOT}/goal_format_hints.py" \
  --from-file=mcp_providers_catalog.py="${ORCH_ROOT}/mcp_providers_catalog.py" \
  --from-file=output_artifacts.py="${ORCH_ROOT}/output_artifacts.py" \
  --from-file=k8s_mcp_compat.py="${ORCH_ROOT}/k8s_mcp_compat.py" \
  --from-file=workflow_materializer.py="${ORCH_ROOT}/workflow_materializer.py" \
  --from-file=attachments.py="${ORCH_ROOT}/attachments.py" \
  --from-file=cloud_anonymize.py="${ORCH_ROOT}/cloud_anonymize.py" \
  --from-file=cloud_anonymize_tier3.py="${ORCH_ROOT}/cloud_anonymize_tier3.py" \
  --from-file=knowledge_base.py="${ORCH_ROOT}/knowledge_base.py" \
  --from-file=orchestrator_session.py="${ORCH_ROOT}/orchestrator_session.py" \
  --from-file=user_context.py="${ORCH_ROOT}/user_context.py" \
  --from-file=dynamic_run.py="${ORCH_ROOT}/dynamic_run.py" \
  --from-file=direct_agent.py="${ORCH_ROOT}/direct_agent.py" \
  --from-file=host_metrics.py="${ORCH_ROOT}/host_metrics.py" \
  --from-file=deal_auth.py="${ORCH_ROOT}/deal_auth.py" \
  --from-file=hardware_profile.py="${ORCH_ROOT}/hardware_profile.py" \
  --from-file=learning_store.py="${ORCH_ROOT}/learning_store.py" \
  --from-file=impartial_qa.py="${ORCH_ROOT}/impartial_qa.py" \
  --from-file=society_charter.py="${ORCH_ROOT}/society_charter.py" \
  --from-file=society_session.py="${ORCH_ROOT}/society_session.py" \
  --from-file=society_controller.py="${ORCH_ROOT}/society_controller.py" \
  --from-file=society_runtime.py="${ORCH_ROOT}/society_runtime.py" \
  --from-file=society_messages.py="${ORCH_ROOT}/society_messages.py" \
  --from-file=society_message_tools.py="${ORCH_ROOT}/society_message_tools.py" \
  --from-file=society_protocols.py="${ORCH_ROOT}/society_protocols.py" \
  --from-file=delegate_task_tool.py="${ORCH_ROOT}/delegate_task_tool.py" \
  --from-file=media_grounding.py="${ORCH_ROOT}/media_grounding.py" \
  --from-file=crewai_mcp_normalize.py="${ORCH_ROOT}/crewai_mcp_normalize.py" \
  --from-file=runner.py="${ORCH_ROOT}/runner.py" \
  --from-file=config_loader.py="${ORCH_ROOT}/config_loader.py" \
  --from-file=run_store.py="${ORCH_ROOT}/run_store.py" \
  --from-file=run_store_backends.py="${ORCH_ROOT}/run_store_backends.py" \
  --from-file=rag_sources_catalog.py="${ORCH_ROOT}/rag_sources_catalog.py" \
  --from-file=rag_retrieve.py="${ORCH_ROOT}/rag_retrieve.py" \
  --from-file=rag_embeddings.py="${ORCH_ROOT}/rag_embeddings.py" \
  --from-file=rag_context.py="${ORCH_ROOT}/rag_context.py" \
  --from-file=rag_apply.py="${ORCH_ROOT}/rag_apply.py" \
  --from-file=rag_tool.py="${ORCH_ROOT}/rag_tool.py" \
  --from-file=rag_grounding.py="${ORCH_ROOT}/rag_grounding.py" \
  --from-file=backends_base.py="${ORCH_ROOT}/backends/base.py" \
  --from-file=backends_crewai.py="${ORCH_ROOT}/backends/crewai.py" \
  --from-file=serve_init.py="${ORCH_ROOT}/serve/__init__.py" \
  --from-file=serve_main.py="${ORCH_ROOT}/serve/__main__.py" \
  --from-file=serve_app.py="${ORCH_ROOT}/serve/app.py" \
  --from-file=serve_ws.py="${ORCH_ROOT}/serve/ws.py"

PROV_ROOT="${PROJECT_ROOT}/agentic-orchestration-tool/agent_providers"
apply_configmap agentic-tool-hotfix-agent-providers \
  --from-file=base.py="${PROV_ROOT}/base.py" \
  --from-file=factory.py="${PROV_ROOT}/factory.py" \
  --from-file=ollama_provider.py="${PROV_ROOT}/ollama_provider.py"

PATCH_FILE="${TOOL_ROOT}/deploy/k8s/coordinator/web-hotfix-volume-patch.yaml"
TOOL_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/tool-hotfix-volume-patch.yaml"
WARM_POOL_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-tool-hotfix-volume-patch.yaml"
HOSTPROC_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/host-metrics-hostproc-patch.yaml"
JTOP_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-jtop-metrics-patch.yaml"
SKILLS_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-agent-skills-hostpath-patch.yaml"
RAG_SOURCES_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-rag-sources-hostpath-patch.yaml"
PLANT_MCP_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-plant-knowledge-mcp-hostpath-patch.yaml"
MCP_PROVIDERS_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-mcp-providers-hostpath-patch.yaml"
MCP_SERVERS_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-mcp-servers-hostpath-patch.yaml"
OPENCLAW_MCP_PATCH="${TOOL_ROOT}/deploy/k8s/coordinator/jetson-openclaw-mcp-hostpath-patch.yaml"
WARM_SKILLS_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-agent-skills-hostpath-patch.yaml"
WARM_RAG_SOURCES_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-rag-sources-hostpath-patch.yaml"
WARM_MCP_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-mcp-hostpath-patch.yaml"
WARM_OPENCLAW_MCP_PATCH="${TOOL_ROOT}/deploy/k8s/warm-pool-jetson-openclaw-mcp-hostpath-patch.yaml"

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
if [[ -f "${RAG_SOURCES_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${RAG_SOURCES_PATCH}"
fi
if [[ -f "${PLANT_MCP_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${PLANT_MCP_PATCH}"
fi
if [[ -f "${MCP_PROVIDERS_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${MCP_PROVIDERS_PATCH}"
fi
if [[ -f "${MCP_SERVERS_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${MCP_SERVERS_PATCH}"
fi
if [[ -f "${OPENCLAW_MCP_PATCH}" ]]; then
  kubectl patch deployment agentic-coordinator -n "${NS}" --patch-file "${OPENCLAW_MCP_PATCH}"
fi
if [[ -f "${WARM_POOL_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_POOL_PATCH}"
fi
if [[ -f "${WARM_SKILLS_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_SKILLS_PATCH}"
fi
if [[ -f "${WARM_RAG_SOURCES_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_RAG_SOURCES_PATCH}"
fi
if [[ -f "${WARM_MCP_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_MCP_PATCH}"
fi
if [[ -f "${WARM_OPENCLAW_MCP_PATCH}" ]]; then
  kubectl patch deployment agentic-warm-pool -n "${NS}" --patch-file "${WARM_OPENCLAW_MCP_PATCH}"
fi

kubectl rollout restart deployment/agentic-coordinator -n "${NS}"
if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  kubectl rollout restart deployment/agentic-warm-pool -n "${NS}"
fi
PROJECT_ROOT="${PROJECT_ROOT}" bash "${TOOL_ROOT}/scripts/jetson-coordinator-rollout.sh" wait 600
if kubectl get deployment agentic-warm-pool -n "${NS}" >/dev/null 2>&1; then
  kubectl rollout status deployment/agentic-warm-pool -n "${NS}" --timeout=600s
fi

PING_URL="http://127.0.0.1/api/host-metrics"
if ! curl -sf "${PING_URL}" >/dev/null 2>&1; then
  PING_URL="http://127.0.0.1:30487/api/host-metrics"
fi
echo "Web hotfix applied. Verify: curl -s ${PING_URL} | head -c 200"
