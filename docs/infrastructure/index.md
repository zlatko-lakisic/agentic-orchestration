---
layout: single
title: "Infrastructure"
permalink: /infrastructure/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Infrastructure

This page describes how **Agentic Orchestration** is deployed in production-style setups. For day-to-day local development, start with the root **`README.md`** and package READMEs (`agentic-orchestration-tool/`, `agentic-orchestration-web/`).

**Deployed topology (Jetson / k3s):** see [System architecture]({{ '/system-architecture/' | relative_url }}) for the component map (coordinator, warm pool, NodePort, Ollama — in-cluster or external — catalogs). Ollama ownership guide: [Ollama]({{ '/ollama/' | relative_url }}).

![Deployment scalability and observability]({{ '/assets/6.png' | relative_url }})

## Deployment modes

| Mode | Notes |
|------|--------|
| **Bare metal / VM** | Install Python 3.12+ and Node 18+; run the web UI with `npm start` and point `AGENTIC_TOOL_ROOT` at the folder that contains `main.py`. |
| **Docker Compose** | Multi-container stack at the monorepo root (see below). **Keep this wiki section in sync** when you add, rename, or remove services in `docker-compose.yml`. |
| **Kubernetes / Jetson k3s** | Coordinator + warm pool + delegation broker + **agentic-engine** on-device. Prefer **GHCR pulls** (`AGENTIC_USE_GHCR=1`) over building images on the edge device. |

## Edge engine + mTLS (v1.29+)

After `jetson-deploy.sh`, the engine listens on hostPort **8765** (NodePort **30765**). With TLS enabled:

| Host | Engine | Web UI |
|------|--------|--------|
| Jetson Ada `172.16.90.20` | `https://172.16.90.20:8765` | `http://172.16.90.20:30487` |
| NVR `10.0.10.16` | `https://10.0.10.16:8765` | `http://10.0.10.16:30487` |

Reach clients use the **engine** URL with client certificates — not Warpgate, not `:30487`. Operator guide: [Reach and mTLS]({{ '/reach-and-mtls/' | relative_url }}). Per-host overrides: `config/env.host` (gitignored) over `config/env.jetson`.

## Docker Compose stack

When using containers, the repository defines a **`docker-compose.yml`** (or `compose.yaml`) at the **monorepo root**. The layout below reflects the **current** services.

### Services

| Service (Compose name) | Role | Typical image / build context | Ports (host → container) |
|------------------------|------|-------------------------------|----------------------------|
| **`orchestration`** | Runs the **web UI** and the **Python orchestration tool** together: Node serves HTTP/WebSocket and spawns `python main.py` against the mounted tool tree (`AGENTIC_TOOL_ROOT`). | Build from repo root or a multi-stage Dockerfile that includes `agentic-orchestration-web/` and `agentic-orchestration-tool/`. | **`3847`** → web listen port (`AGENTIC_WEB_PORT`). |
| **`ollama`** | Optional **local LLM** when using Compose. Prefer pointing AO at this service with `AGENTIC_OLLAMA_MODE=external` and `OLLAMA_API_BASE=http://ollama:11434`. For non-Compose ownership modes (AO child process or k8s Deployment), see [Ollama]({{ '/ollama/' | relative_url }}). | Official **`ollama/ollama`** image (or vendor-supported variant). | **`11434`** → Ollama API (only if you need host access; otherwise leave internal-only). |

**Networking:** From inside Compose, the tool and web should use service DNS names, e.g. set **`OLLAMA_HOST=http://ollama:11434`** for the orchestration container so pulls and chat hit the **same** Ollama process (see tool `.env` / [Configuration]({{ '/configuration/' | relative_url }})).

**Volumes (persistence):**

- Mount a named or bind volume for **Ollama model blobs** if you do not want images re-pulled after every recreate (often mapped to the host path your distro uses, e.g. Linux `ollama` service under `/usr/share/ollama/.ollama`, or `OLLAMA_MODELS` as documented by Ollama).
- Mount host directories for **`__orchestrator_sessions__/`**, **`__orchestrator_kb__/`**, **`__orchestrator_learning__/`**, and **`__output__/`** if you need sessions, KB, and artifacts to survive container replacement (see [Architecture]({{ '/architecture/' | relative_url }}) — *Gitignored runtime paths*).

**Environment:** Combine variables from **`agentic-orchestration-web/.env`** and **`agentic-orchestration-tool/.env`** (or inject the same keys via Compose `environment:` / `env_file:`). Authoritative variable list: **`agentic-orchestration-tool/.env.example`** and [Configuration]({{ '/configuration/' | relative_url }}).

### Security

- The web stack **executes local Python** with user-supplied chat text. Do not expose **`AGENTIC_WEB_HOST`** to untrusted networks without authentication and hardening (see [Web UI]({{ '/web-ui/' | relative_url }})).
- Restrict Ollama’s published port if only the orchestration container should call it.

## GHCR container images

On each `v*` release tag, [`.github/workflows/publish-images.yml`](https://github.com/zlatko-lakisic/agentic-orchestration/blob/main/.github/workflows/publish-images.yml) builds **linux/amd64** and **linux/arm64** and pushes:

| Image | Example tag |
|-------|-------------|
| `ghcr.io/zlatko-lakisic/agentic-orchestrator-coordinator` | `v1.14.0`, `latest` |
| `ghcr.io/zlatko-lakisic/agentic-orchestrator-worker` | `v1.14.0`, `latest` |

Manual publish (without cutting a release): GitHub → Actions → **Publish container images** → Run workflow.

Local builds (when not using GHCR):

```bash
# coordinator (repo root as context)
docker build -f agentic-orchestration-tool/docker/Dockerfile.coordinator \
  -t agentic-orchestrator-coordinator:local .

# worker
docker build -f agentic-orchestration-tool/docker/Dockerfile.worker \
  -t agentic-orchestrator-worker:local agentic-orchestration-tool/
```

See `agentic-orchestration-tool/docker/README.coordinator.md` and `README.worker.md`.

## Jetson / k3s deploy

Repo on device: `/var/projects/agentic-orchestration`. **Git-only** deploys — pull `main`, then run scripts (never `scp` tracked files). Device remote is usually `origin` → GitHub; push from a laptop with `git push github main`.

### Routine update (ConfigMap / env hotfix)

```bash
cd /var/projects/agentic-orchestration
git pull origin main
bash agentic-orchestration-tool/scripts/jetson-deploy.sh
```

### Full stack (images + manifests)

Prefer GHCR pulls (fast on Orin):

```bash
export AGENTIC_USE_GHCR=1
export AGENTIC_IMAGE_TAG=v1.14.0   # or omit to use VERSION / latest
sudo -E bash agentic-orchestration-tool/scripts/jetson-k3s-deploy.sh
```

Private packages: set `GITHUB_TOKEN` (or `GHCR_TOKEN`) and optional `GITHUB_USER` before deploy.

**Web UI:** NodePort **`30487`** (`http://<jetson>:30487`). Traefik / Warpgate should target that port. Coordinator uses **`Recreate`** (no `hostPort: 80`) to avoid single-node rollout deadlocks.

### Ollama on edge (k3s)

Three supported ownership modes — full detail on [Ollama]({{ '/ollama/' | relative_url }}):

| Mode | Edge usage |
|------|------------|
| **`managed_k8s`** (current lab default) | Deployment `agentic-ollama`; `OLLAMA_API_BASE=http://agentic-ollama:11434`. Enable via `AGENTIC_JETSON_ENABLE_OLLAMA=1` / `jetson-enable-ollama.sh` (also applied by `jetson-deploy.sh` when mode/flag set). |
| **`external`** | Reuse host systemd or another server; pods often use `http://host.k3s.internal:11434`. AO does not restart it. |
| **`managed_process`** | AO child `ollama serve` — standalone / non-k8s; uncommon on these edge boxes. |

Migrate host systemd → in-cluster: `scripts/jetson-migrate-ollama-to-k8s.sh`. Jetson keeps models on NFS; Ada copies into `var/ollama-models`.

## Kubernetes execution model

Distributed step execution (coordinator + workers, warm pool, run-store PVC) is documented in [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) and [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}). Jetson ships a working coordinator Deployment; Job-per-step remains on the K8s roadmap phases described there.

## Related

- [Architecture]({{ '/architecture/' | relative_url }}) — packages, runtime directories
- [Configuration]({{ '/configuration/' | relative_url }}) — environment variables
- [Ollama]({{ '/ollama/' | relative_url }}) — external / managed_process / managed_k8s ownership
- [Web UI]({{ '/web-ui/' | relative_url }}) — `AGENTIC_*` web server settings
- [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) — K8s execution roadmap
- [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) — pluggable execution backends
- [Releases]({{ '/changelog/' | relative_url }}) — versioning and GHCR publish on tags
