# Orchestrator worker image (K8s Phase 2.3)

Ephemeral **one-step** container: runs `python main.py --execute-step <spec.json>` with a mini-Crew inside the pod. Used by subprocess coordinator locally (optional) and K8s Jobs (K3).

## Build

From `agentic-orchestration-tool/`:

```bash
docker build -f docker/Dockerfile.worker -t agentic-orchestrator-worker:local .
```

Image name for K8s: set `AGENTIC_K8S_WORKER_IMAGE` (see [[Kubernetes-execution-upgrade]]).

## Run (local smoke)

1. Write a step spec JSON (or let the subprocess coordinator write `{step_id}-spec.json` under a run store dir).
2. Mount config + env + run store:

```bash
docker run --rm --env-file .env \
  -v "$(pwd)/config:/app/config:ro" \
  -v /tmp/agentic-run:/run/store \
  agentic-orchestrator-worker:local /run/store/research_topic-spec.json
```

PowerShell:

```powershell
docker run --rm --env-file .env `
  -v "${PWD}/config:/app/config:ro" `
  -v C:\temp\agentic-run:/run/store `
  agentic-orchestrator-worker:local /run/store/research_topic-spec.json
```

Quick validation without LLM (missing agent id → exit 2):

```powershell
powershell -File scripts/docker-worker-smoke.ps1
```

## Volume mounts

| Mount | Purpose |
|-------|---------|
| `/app/config` (ro) | Agent + MCP + workflow YAML catalogs |
| `/run/store` | Step specs + `{run_id}/{step_id}/result.json` handoffs (PVC on K8s) |
| Optional extra catalog path | `AGENTIC_EXTRA_*_PATH` env if used |

## Secrets → environment

Worker uses the **same env var names** as local `.env` / `.env.example`. In Kubernetes, map a Secret to the Job pod env (no custom rename layer).

| Category | Examples |
|----------|----------|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL_NAME`, `OPENAI_BASE_URL` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Hugging Face | `HF_TOKEN`, `HUGGINGFACE_API_BASE` |
| Ollama | `OLLAMA_HOST` |
| MCP HTTP | `BRAVE_SEARCH_API_KEY`, `TAVILY_API_KEY`, `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |
| MCP opt-in | `AGENTIC_MCP_FETCH_ENABLED`, `AGENTIC_MCP_MEMORY_MCP_ENABLED`, `FILESYSTEM_MCP_ALLOWED_DIRECTORY` |

Authoritative list: `.env.example` and wiki [[Configuration]].

## Logs (Phase 2.2)

Worker stderr/stdout lines are prefixed with `[run_id/step_id]` for correlation in Loki/Datadog/K8s logs.

## Stub worker (CI kind e2e)

CI uses a minimal image with no CrewAI/LLM — writes canned `result.json` from the step spec. The stub embeds `config/agent_skills` and verifies `skills` + `paths.agent_skills_catalog` + baked task description markers on skills workflows (`workflow_agent_skills_smoke.yaml`).

```bash
docker build -f docker/Dockerfile.worker-stub -t agentic-orchestrator-worker-stub:ci .
```

Orchestrated by `scripts/k8s-kind-e2e.sh` (GitHub job **kind-kubernetes-e2e**).

## Related

- [[Kubernetes-execution-upgrade]] — Phase 2 / 3
- [[Dual-execution-framework]] — `--execute-step` worker CLI
- [[Infrastructure]] — deployment overview
