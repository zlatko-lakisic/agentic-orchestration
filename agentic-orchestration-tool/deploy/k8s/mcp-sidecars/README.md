# MCP sidecars and HTTP gateways (K4)

Stdio MCPs need a K8s-compatible transport. Phase 4 provides three patterns:

## 0. Worker-native stdio (recommended for `fetch_url` and `filesystem_local`)

The worker image includes `mcp-server-fetch` and **Node.js/npm** for `npx @modelcontextprotocol/server-filesystem`.

```env
AGENTIC_K8S_WORKER_STDIO_MCPS=fetch_url,filesystem_local
AGENTIC_MCP_FETCH_ENABLED=1
FILESYSTEM_MCP_ALLOWED_DIRECTORY=/run/store/mcp-fs-workspace
```

Seed the PVC subdirectory before workflows that read files:

```bash
mkdir -p "${RUN_STORE}/mcp-fs-workspace"
echo "K4 filesystem smoke" > "${RUN_STORE}/mcp-fs-workspace/hello.txt"
```

Smoke tests: `workflow_fetch_sidecar_smoke.yaml`, `workflow_filesystem_smoke.yaml`.

No supergateway sidecar required for these MCPs when using worker stdio.

## 1. In-pod supergateway sidecar (K4.1)

Worker Job pod = **worker container** + **supergateway init sidecar** that bridges stdio MCP → streamable HTTP on `localhost`.

Use for MCPs not bundled in the worker image (e.g. `filesystem_local`):

```env
AGENTIC_K8S_POD_SIDECAR_MCPS=filesystem_local
```

Optional bridge tuning:

```env
AGENTIC_K8S_SUPERGATEWAY_STATEFUL=1
```

Note: CrewAI + supergateway Streamable HTTP may return HTTP 400 for some MCPs; use worker stdio for `fetch_url` instead. Repro: `python scripts/mcp-fetch-supergateway-repro.py --crewai`.

See `worker-with-fetch-sidecar.example.yaml`.

Sidecar image:

```env
AGENTIC_K8S_SUPERGATEWAY_IMAGE=supercorp/supergateway:uvx
```

## 2. Cluster HTTP gateway (K4.2)

Run a shared Deployment + Service; point workers at it via env (no pod sidecar):

```env
AGENTIC_K8S_MCP_FETCH_URL=http://agentic-mcp-fetch.agentic-orchestration.svc.cluster.local:8080/mcp
```

Catalog entries are adapted at runtime to `streamable_http` (no YAML schema change).

Gateway env vars:

| MCP id | Env var |
|--------|---------|
| `fetch_url` | `AGENTIC_K8S_MCP_FETCH_URL` |
| `filesystem_local` | `AGENTIC_K8S_MCP_FILESYSTEM_URL` |
| `search_exa` | `AGENTIC_K8S_MCP_EXA_URL` |
| `memory_knowledge_graph` | `AGENTIC_K8S_MCP_MEMORY_URL` |

## Planner / materializer policy (K4.3)

When `AGENTIC_EXECUTION_BACKEND=kubernetes`:

- Default: only native HTTP MCPs (`search_brave`, `search_tavily`, `home_assistant`)
- Plus stdio MCPs with a gateway URL configured
- Plus all stdio MCPs when `AGENTIC_K8S_ALLOW_STDIO_MCPS=1` (after sidecars/gateways exist)

Implemented in `orchestration/k8s_mcp_compat.py` (`apply_kubernetes_mcp_catalog_policy`).

## Worker image pre-pull (K4.4)

Optional DaemonSet: `../worker-image-prep.yaml` — caches worker image on each node.

## GPU / resources (K4.5)

Optional env on coordinator (applied to worker Job pods):

```env
AGENTIC_K8S_WORKER_RESOURCES={"requests":{"cpu":"500m","memory":"1Gi"}}
AGENTIC_K8S_GPU_NODE_SELECTOR={"cloud.google.com/gke-accelerator":"nvidia-tesla-t4"}
AGENTIC_K8S_GPU_PROVIDER_IDS=ollama_llava,hf_llama_local
```

## Apply examples

```bash
kubectl apply -f fetch-url-gateway.yaml          # shared gateway (optional)
kubectl apply -f worker-with-fetch-sidecar.example.yaml  # reference Job shape
kubectl apply -f ../worker-image-prep.yaml       # optional image prep
```
