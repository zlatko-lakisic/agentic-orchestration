---
layout: single
title: "System architecture (Kubernetes / Jetson)"
permalink: /system-architecture/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
mermaid: true
---
# System architecture (Kubernetes / Jetson)

This page is the **deployed system** view — runtime components, networks, and storage — similar to an AWS/Azure landing-zone diagram. It complements the conceptual product flow on [Architecture]({{ '/architecture/' | relative_url }}).

**Primary reference deployment:** NVIDIA Jetson AGX Orin running **k3s**, namespace `agentic-orchestration`, repo at `/var/projects/agentic-orchestration`.

## Component map (edge)

Color key: **blue** = clients/ingress · **amber** = host processes · **indigo** = k8s workloads · **green** = shared storage · **pink** = MCP gateways.

```mermaid
flowchart TB
  classDef client fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
  classDef ingress fill:#BFDBFE,stroke:#1D4ED8,stroke-width:2px,color:#1E3A8A
  classDef host fill:#FDE68A,stroke:#D97706,stroke-width:2px,color:#78350F
  classDef coord fill:#C7D2FE,stroke:#4338CA,stroke-width:2px,color:#312E81
  classDef worker fill:#A5B4FC,stroke:#4F46E5,stroke-width:2px,color:#312E81
  classDef store fill:#6EE7B7,stroke:#059669,stroke-width:2px,color:#064E3B
  classDef mcp fill:#FBCFE8,stroke:#DB2777,stroke-width:2px,color:#831843
  classDef opt fill:#E5E7EB,stroke:#6B7280,stroke-width:1px,color:#374151

  Browser["Browser / OpenClaw / API"]:::client
  Traefik["Traefik / Warpgate - TLS upstream"]:::ingress

  subgraph Host["Jetson host"]
    Ollama["Host Ollama :11434"]:::host
    GitTree["Git checkout + catalogs"]:::host
    OpenClawHost["OpenClaw host paths"]:::host
  end

  subgraph Cluster["k3s - agentic-orchestration"]
    SVC["Service NodePort 30487 to :3847"]:::coord
    Web["Coordinator web UI + WS"]:::coord
    Orch["Coordinator planner + harness"]:::coord
    WP["Warm-pool workers"]:::worker
    Broker["Delegation broker optional"]:::opt
    Jobs["Ephemeral worker Jobs"]:::opt
    PVC[("run-store PVC /run/store")]:::store
    MCPFetch["mcp-fetch :8080"]:::mcp
    MCPFs["mcp-filesystem :8081"]:::mcp
  end

  Browser --> Traefik
  Traefik -->|"NodePort 30487"| SVC
  SVC --> Web
  Web --- Orch
  Orch -->|"enqueue StepSpec"| PVC
  WP -->|"claim + result.json"| PVC
  Broker -.-> Jobs
  Jobs -.-> PVC
  Orch <-->|"LLM"| Ollama
  WP <-->|"LLM"| Ollama
  Orch -.->|"hostPath"| GitTree
  WP -.->|"hostPath"| GitTree
  Orch -.-> OpenClawHost
  WP -.-> OpenClawHost
  Orch --> MCPFetch
  Orch --> MCPFs
  WP --> MCPFetch
  WP --> MCPFs
```

## Request path (control + data)

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Edge as Traefik / Warpgate
  participant Coord as Coordinator
  participant Plan as Planner harness
  participant Store as run-store PVC
  participant Worker as Warm-pool / Job
  participant LLM as Host Ollama
  participant Tools as MCP / RAG / skills

  User->>Edge: HTTPS chat / API
  Edge->>Coord: NodePort 30487 to port 3847
  Coord->>Plan: dynamic plan rag_ids, mcp, skills
  Plan->>Coord: WorkflowConfig / StepSpec list
  Coord->>Store: enqueue step specs
  Worker->>Store: claim step
  Worker->>Tools: inject RAG / skills; call MCP
  Worker->>LLM: agent completion
  LLM-->>Worker: model output
  Worker->>Store: result.json + rag_audit
  Coord->>Store: read results / progress
  Coord-->>User: WebSocket / HTTP reply
```

## What runs where

| Component | Role | Typical image / process |
|-----------|------|-------------------------|
| **agentic-coordinator** | Web UI + planner + step dispatch (`AGENTIC_EXECUTION_BACKEND=kubernetes`) | `ghcr.io/.../agentic-orchestrator-coordinator` |
| **agentic-warm-pool** | Pre-warmed workers executing steps from the PVC queue | `ghcr.io/.../agentic-orchestrator-worker` |
| **agentic-delegation-broker** | Spawns child Jobs for `k8s_delegate_task` (often **off** on Jetson) | worker image entrypoint `--delegation-broker` |
| **Host Ollama** | Local LLMs for planner + agents | Host binary, not an in-cluster pod |
| **run-store PVC** | Shared step handoff `{run_id}/{step_id}/result.json` | hostPath or RWX volume at `/run/store` |
| **MCP gateways** | Optional shared fetch / filesystem MCP over HTTP | in-cluster Deployments |
| **RAG / skills / MCP YAML** | Catalogs — **not** separate pods | hostPath from git (and OpenClaw dirs) |

**RAG** is harness code inside the coordinator and workers (inject / `rag_query` / citation gate). There is no RAG microservice pod.

## Catalogs and host mounts (Jetson)

Git-synced files on the device are bind-mounted into pods so catalog updates do not require image rebuilds:

| Catalog | Host path (under repo unless noted) | Coordinator mount | Warm-pool mount |
|---------|--------------------------------------|-------------------|-----------------|
| RAG sources | `.../config/rag_sources` | `/app/tool/config/rag_sources` | `/app/config/rag_sources` |
| Agent skills (Jetson extras) | `.../config/agent_skills_jetson` | `/app/tool/config/agent_skills_jetson` | `/app/config/agent_skills_jetson` |
| MCP providers | `.../config/mcp_providers` | `/app/tool/config/mcp_providers` | `/app/config/mcp_providers` |
| MCP server packages | `.../mcp_servers` | `/app/tool/mcp_servers` | `/app/mcp_servers` |
| OpenClaw MCP | `~/.openclaw/agentic-orchestration/openclaw-mcp-providers` | `/openclaw/mcp-providers` | same |
| OpenClaw workspace | `~/.openclaw/workspace` | host path in pod | same |

Hotfix ConfigMaps also overlay selected Python modules onto coordinator/worker images (see `scripts/jetson-hotfix-web.sh`).

## Logical layers vs physical pods

```mermaid
flowchart LR
  classDef logical fill:#E0E7FF,stroke:#4F46E5,stroke-width:2px,color:#312E81
  classDef physical fill:#D1FAE5,stroke:#059669,stroke-width:2px,color:#064E3B

  subgraph Logical["Logical product layers"]
    L1["Web / API"]:::logical
    L2["Planner + harness - skills, MCP, RAG"]:::logical
    L3["Execution backends - inprocess / subprocess / k8s"]:::logical
    L4["Models + tools - Ollama + MCP servers"]:::logical
  end

  subgraph Physical["Physical on Jetson k3s"]
    P1["agentic-coordinator pod"]:::physical
    P2["warm-pool pods / Jobs"]:::physical
    P3["Host Ollama + hostPath catalogs"]:::physical
    P4["Optional MCP Deployments"]:::physical
  end

  L1 --> P1
  L2 --> P1
  L2 --> P2
  L3 --> P1
  L3 --> P2
  L4 --> P3
  L4 --> P4
```

Use this when explaining to stakeholders: **one edge node**, **few Deployments**, **shared PVC**, **host LLM**, **catalogs as volumes** — not one pod per agent or per RAG corpus.

## Related

- [Architecture]({{ '/architecture/' | relative_url }}) — conceptual product flow
- [Infrastructure]({{ '/infrastructure/' | relative_url }}) — deploy modes, GHCR, Jetson scripts
- [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) — warm pool / Jobs roadmap detail
- [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) — backend code seams
- [Web UI]({{ '/web-ui/' | relative_url }}) — Warpgate session headers
- Operator manifests: `agentic-orchestration-tool/deploy/k8s/`
