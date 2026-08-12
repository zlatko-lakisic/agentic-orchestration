---
layout: single
title: "Ollama"
permalink: /ollama/
toc: true
toc_label: "On this page"
toc_icon: "list"
sidebar:
  nav: "docs"
---
# Ollama

Agentic Orchestration treats **Ollama as an HTTP service**. Who **owns** the process (and who may restart it) is controlled by `AGENTIC_OLLAMA_MODE`. You can:

1. **Reuse an existing Ollama** already running on the host or network (**external**)
2. Let AO run **`ollama serve` as a child process** on standalone (**managed_process**)
3. Run Ollama **inside Kubernetes / k3s** as Deployment `agentic-ollama` (**managed_k8s**)

Related: [Configuration]({{ '/configuration/' | relative_url }}#ollama-ownership), [Infrastructure]({{ '/infrastructure/' | relative_url }}), [System architecture]({{ '/system-architecture/' | relative_url }}), [Topology dashboard]({{ '/topology-dashboard/' | relative_url }}#models-ollama), Admin → Operate → **Control**.

---

## Modes at a glance

| Mode | Who starts Ollama | Typical `OLLAMA_API_BASE` | Admin Control restart | Best for |
|------|-------------------|---------------------------|------------------------|----------|
| **`external`** | You (systemd, Compose, remote box, …) | Your URL, e.g. `http://127.0.0.1:11434` or `http://host.k3s.internal:11434` | **No** | Bring-your-own / shared lab Ollama |
| **`managed_process`** | AO child `ollama serve` | Usually loopback after spawn | **Yes** (child) | Laptop / bare-metal standalone without k8s |
| **`managed_k8s`** | Deployment `agentic-ollama` | `http://agentic-ollama:11434` | **Yes** (Deployment) | Edge ARM / x86 k3s stacks |
| **`auto`** (default) | Resolves: healthy configured URL → **external**; else if Kubernetes → **managed_k8s**; else **managed_process** | Depends on resolution | Only when owned | Sensible default until you pin a mode |

Always set **`OLLAMA_API_BASE`** (preferred) for planner / LiteLLM / Topology probes. Keep **`OLLAMA_HOST`** in sync if both are used.

---

<a id="external"></a>
## 1. Reuse existing Ollama (`external`)

Use when Ollama is already installed and serving (host systemd, another machine, Compose `ollama` service, etc.). AO **never** spawns or restarts it.

```bash
# .env / config/env.host
AGENTIC_OLLAMA_MODE=external
OLLAMA_API_BASE=http://127.0.0.1:11434
# From k8s pods to a host daemon on the same node:
# OLLAMA_API_BASE=http://host.k3s.internal:11434
```

- Leave `AGENTIC_JETSON_ENABLE_OLLAMA=0` (do **not** apply `jetson-enable-ollama.sh`).
- Topology **Ollama** node is healthy when `GET {OLLAMA_API_BASE}/api/tags` succeeds.
- Admin Control shows Ollama as **not restartable** (“External Ollama at …”).

**Legacy edge path:** older edge installs used host `ollama.service` + `host.k3s.internal`. That remains a valid **external** setup; current `config/env.jetson` (edge profile env) defaults to **managed_k8s** instead.

---

<a id="managed-process"></a>
## 2. AO child process (`managed_process`)

Standalone AO (CLI / web without an in-cluster Ollama Deployment) can own a child **`ollama serve`**:

```bash
AGENTIC_OLLAMA_MODE=managed_process
# OLLAMA_API_BASE optional — defaults toward local serve after spawn
```

Behaviour:

- `runtime_bootstrap` / lifecycle registers the child and writes a pid under `var/agentic-ollama/` when applicable.
- Teardown on process exit (`atexit` / signals); Admin Control can restart the child.
- Model ensure / pull still uses the HTTP API once serve is up (`AGENTIC_AUTO_ENSURE_RUNTIME`, overlay ensure, etc.).
- Not the usual path on edge k3s (prefer `managed_k8s` or `external`).

Compose alternative: keep a Compose **`ollama`** service and point AO at it with **`external`** (AO does not own that container). See [Infrastructure]({{ '/infrastructure/' | relative_url }}).

---

<a id="managed-k8s"></a>
## 3. In-cluster Ollama (`managed_k8s`)

AO owns Deployment **`agentic-ollama`** in namespace `agentic-orchestration`, Service **`http://agentic-ollama:11434`**, optional NodePort **31134**.

```bash
# config/env.host or env.jetson
AGENTIC_OLLAMA_MODE=managed_k8s
AGENTIC_JETSON_ENABLE_OLLAMA=1
OLLAMA_API_BASE=http://agentic-ollama:11434
```

Enable / refresh on the device:

```bash
cd /var/projects/agentic-orchestration
git pull origin main
bash agentic-orchestration-tool/scripts/jetson-enable-ollama.sh
# or: jetson-deploy.sh (loads .env toggles and enables when mode/flag set)
```

| Host | How the pod runs | Model storage |
|------|------------------|---------------|
| **x86/x64** | `ollama/ollama` image | hostPath `var/ollama-models` |
| **ARM64 / aarch64** | Privileged **host-binary** pod (`nsenter` → `/usr/local/bin/ollama serve`) | NFS (e.g. `/nfs/omega-jetson/ollama/models`) — avoids pulling a multi‑GB dustynv image onto a small rootfs |

Migrate from host systemd (inventory → copy or NFS mount → enable → remove unit):

```bash
bash agentic-orchestration-tool/scripts/jetson-migrate-ollama-to-k8s.sh
# finish host unit removal if needed:
bash agentic-orchestration-tool/scripts/jetson-uninstall-host-ollama.sh
```

Topology: logical node [Topology dashboard]({{ '/topology-dashboard/' | relative_url }}#models-ollama) plus workload [Topology dashboard]({{ '/topology-dashboard/' | relative_url }}#k8s-ollama) when expanded under Kubernetes. Admin Control can restart the Deployment.

Manifests: `agentic-orchestration-tool/deploy/k8s/ollama/`.

---

## `auto` resolution

1. If `OLLAMA_API_BASE` / `OLLAMA_HOST` responds healthy → treat as **external**.
2. Else if running in Kubernetes → expect **managed_k8s** (`agentic-ollama`).
3. Else → **managed_process** (spawn child serve).

Pin an explicit mode in env when behaviour must not drift (recommended on shared edge boxes).

---

## Env cheat sheet

| Variable | Role |
|----------|------|
| `AGENTIC_OLLAMA_MODE` | `auto` \| `external` \| `managed_process` \| `managed_k8s` |
| `AGENTIC_JETSON_ENABLE_OLLAMA` | `1` → `jetson-deploy.sh` runs `jetson-enable-ollama.sh` |
| `OLLAMA_API_BASE` | HTTP base for AO (planner, keepalive, Topology, pulls) |
| `OLLAMA_HOST` | Alternate / legacy URL — keep aligned with `OLLAMA_API_BASE` |
| `AGENTIC_OLLAMA_MODELS_HOSTPATH` | Extra hostPath for models (edge NFS), used by enable script |
| `AGENTIC_OLLAMA_RUNTIME_CLASS` | Optional RuntimeClass; leave unset (k3s “nvidia” handler is often broken) |
| `AGENTIC_AUTO_ENSURE_RUNTIME` | Install/serve/pull for Ollama agents on standalone |
| `AGENTIC_AUTO_ENSURE_OLLAMA_IN_K8S` | Allow ensure inside k8s workers (usually off; use HTTP to shared Ollama) |
| `AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA` | Overlay registration may `POST /api/pull` on the configured base (never spawns a binary for overlays) |

Authoritative list: [Configuration]({{ '/configuration/' | relative_url }}), `agentic-orchestration-tool/.env.example`.

---

## Control plane and Topology

- **Operate → Control:** restarts Ollama only when mode is AO-owned (`managed_process` / `managed_k8s`). External instances stay disabled for restart.
- **Topology:** Ollama runtime node probes `/api/tags`. In-cluster ownership also shows the `agentic-ollama` workload under Kubernetes expand.

---

## Lab edge defaults (current)

| Host | Ownership | Notes |
|------|-----------|--------|
| ARM edge `172.16.90.20` | `managed_k8s` (host-binary + NFS models) | Host `ollama.service` removed after migrate |
| x86/x64 NVR `10.0.10.16` | `managed_k8s` (`ollama/ollama` + `var/ollama-models`) | Host binary removed |

Both use `OLLAMA_API_BASE=http://agentic-ollama:11434`.
