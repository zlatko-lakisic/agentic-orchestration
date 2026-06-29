# MCP sidecars and HTTP gateways (K4)

Stdio MCPs (`fetch_url`, `filesystem_local`, …) cannot spawn subprocesses inside ephemeral worker pods. Phase 4 provides two patterns:

## 1. In-pod supergateway sidecar (K4.1)

Worker Job pod = **worker container** + **supergateway sidecar** that bridges stdio MCP → streamable HTTP on `localhost`.

Enable per MCP id:

```env
AGENTIC_K8S_POD_SIDECAR_MCPS=fetch_url
AGENTIC_MCP_FETCH_ENABLED=1
```

The coordinator rewrites the step spec so the worker uses `http://127.0.0.1:8080/mcp` instead of stdio.

See `worker-with-fetch-sidecar.example.yaml`.

Sidecar image (override if needed):

```env
AGENTIC_K8S_SUPERGATEWAY_IMAGE=supercorp/supergateway:uvx
```

Worker image must include the stdio server (`mcp-server-fetch` is in `Dockerfile.worker`).

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
