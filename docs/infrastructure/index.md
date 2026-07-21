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

![Deployment scalability and observability](assets/6.png)

## Deployment modes

| Mode | Notes |
|------|--------|
| **Bare metal / VM** | Install Python 3.12+ and Node 18+; run the web UI with `npm start` and point `AGENTIC_TOOL_ROOT` at the folder that contains `main.py`. |
| **Docker Compose** | Multi-container stack at the monorepo root (see below). **Keep this wiki section in sync** when you add, rename, or remove services in `docker-compose.yml`. |
| **Kubernetes / Jetson k3s** | Coordinator + warm pool + delegation broker on-device. Prefer **GHCR pulls** (`AGENTIC_USE_GHCR=1`) over building images on the edge device. |

## Docker Compose stack

When using containers, the repository defines a **`docker-compose.yml`** (or `compose.yaml`) at the **monorepo root**. The layout below reflects the **current** services.

### Services

| Service (Compose name) | Role | Typical image / build context | Ports (host → container) |
|------------------------|------|-------------------------------|----------------------------|
| **`orchestration`** | Runs the **web UI** and the **Python orchestration tool** together: Node serves HTTP/WebSocket and spawns `python main.py` against the mounted tool tree (`AGENTIC_TOOL_ROOT`). | Build from repo root or a multi-stage Dockerfile that includes `agentic-orchestration-web/` and `agentic-orchestration-tool/`. | **`3847`** → web listen port (`AGENTIC_WEB_PORT`). |
| **`ollama`** | Optional **local LLM** runtime used when workflows use Ollama-backed agent providers. | Official **`ollama/ollama`** image (or vendor-supported variant). | **`11434`** → Ollama API (only if you need host access; otherwise leave internal-only). |

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

Ollama on Jetson is typically **native systemd** on the host; pods reach it via `host.k3s.internal:11434` (CoreDNS NodeHosts). See `jetson-fix-ollama-k8s.sh` / deploy script logs.

## Kubernetes execution model

Distributed step execution (coordinator + workers, warm pool, run-store PVC) is documented in [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) and [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}). Jetson ships a working coordinator Deployment; Job-per-step remains on the K8s roadmap phases described there.

## Related

- [Architecture]({{ '/architecture/' | relative_url }}) — packages, runtime directories
- [Configuration]({{ '/configuration/' | relative_url }}) — environment variables
- [Web UI]({{ '/web-ui/' | relative_url }}) — `AGENTIC_*` web server settings
- [Kubernetes execution upgrade]({{ '/kubernetes-execution-upgrade/' | relative_url }}) — K8s execution roadmap
- [Dual execution framework]({{ '/dual-execution-framework/' | relative_url }}) — pluggable execution backends
- [Releases]({{ '/changelog/' | relative_url }}) — versioning and GHCR publish on tags
