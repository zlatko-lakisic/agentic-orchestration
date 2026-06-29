---
title: "Execution Backends"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

The orchestration engine supports three execution backends. The planner and step contracts stay the same; only how each step runs changes.

## Comparison

| Backend | Env value | How steps run | Good for |
|---|---|---|---|
| CrewAI in-process | `inprocess` (default) | Whole crew in one Python process | Local dev, single machine |
| Subprocess | `subprocess` + `AGENTIC_SUBPROCESS_WORKERS=1` | One `python main.py --execute-step` worker per step | Step isolation, container testing |
| Kubernetes | `kubernetes` | K8s Job per step, PVC run store | Production, multi-tenant |

## In-process (default)

No extra configuration. `CrewAIExecutionBackend` runs agents in the coordinator process.

```bash
# implicit default
AGENTIC_EXECUTION_BACKEND=inprocess
```

## Subprocess

Each step spawns a worker subprocess that reads a `StepSpec` JSON file and writes `result.json` to the shared run store.

```bash
export AGENTIC_EXECUTION_BACKEND=subprocess
export AGENTIC_SUBPROCESS_WORKERS=1
export AGENTIC_RUN_STORE_PATH=/tmp/agentic-run-store
python main.py --dynamic "Smoke test subprocess isolation"
```

**Status:** F0–F4 complete — subprocess path proven in CI.

## Kubernetes

Each step becomes a one-shot K8s Job mounting a ReadWriteMany PVC at `AGENTIC_K8S_RUN_STORE_MOUNT` (default `/run/store`).

```bash
export AGENTIC_EXECUTION_BACKEND=kubernetes
export AGENTIC_K8S_WORKER_IMAGE=agentic-orchestrator-worker:local
export AGENTIC_K8S_RUN_STORE_PVC=agentic-run-store
export AGENTIC_RUN_STORE_PATH=/run/store   # coordinator must share the same store
```

Deploy manifests: `agentic-orchestration-tool/deploy/k8s/`.

| Concern | Notes |
|---|---|
| MCP stdio | Worker-native stdio or cluster sidecar gateways |
| Run store | hostPath (kind), NFS, or GKE Filestore |
| CI | kind e2e with stub worker image |

**Status:** K3 MVP implemented (kind CI e2e). K5 operational polish (warm pool, structured logs) optional.

## Run store layout

```
{AGENTIC_RUN_STORE_PATH}/{run_id}/{step_id}/result.json
{AGENTIC_RUN_STORE_PATH}/{run_id}/{step_id}-spec.json
```

Workers and coordinator must share this path (bind mount, PVC, or NFS).

## What stays the same

- YAML agent and MCP catalogs
- Planner JSON plan format
- Session, KB, learning, and QA hooks
- `--execute-step` worker contract

See [Architecture]({{ '/architecture/' | relative_url }}) for the full pipeline.

Deep dives: [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) (F0–F5 code seam) and [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) (cluster delivery, K3–K5).
