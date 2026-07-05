# Jetson / edge local agent catalog

Single small Ollama model for single-node deployments (e.g. Jetson AGX Orin) where the
orchestrator should not pick cloud OpenAI/Anthropic providers.

Agents use the **host** Ollama service (`http://host.k3s.internal:11434` from k8s pods),
not per-workflow loopback servers (`selfcontained: true` only works on a dev machine with
Ollama installed locally).

## Enable

Tracked edge overrides live in **`config/env.jetson`**. On the device, apply them into `.env` (gitignored):

```bash
bash agentic-orchestration-tool/scripts/jetson-apply-env.sh
# or automatically via jetson-local-llm-deploy.sh / jetson-k3s-deploy.sh
```

Key settings (also in `config/env.jetson`):

```bash
AGENTIC_EDGE_PLATFORM=jetson
AGENTIC_OLLAMA_RUNTIME=auto   # native upstream binary, or jetson-container if dustynv/ollama is running
AGENTIC_AGENT_PROVIDERS_CATALOG=config/agent_providers_jetson
```

### Ollama on Jetson

NVIDIA documents two approaches ([forum thread](https://forums.developer.nvidia.com/t/introducing-ollama-support-for-jetson-devices/289333)):

| Runtime | What it is | Our default |
|--------|------------|-------------|
| **native** | `curl -fsSL https://ollama.com/install.sh \| sh` — ARM64 binary with CUDA | **Yes** (current box) |
| **jetson-container** | `dustynv/ollama:r36.2.0` from [jetson-containers](https://github.com/dusty-nv/jetson-containers) | Optional upgrade |

Check what is running:

```bash
bash agentic-orchestration-tool/scripts/jetson-verify-ollama.sh
```

Switch runtime (stops native service when using container):

```bash
sudo bash agentic-orchestration-tool/scripts/jetson-install-ollama.sh native
sudo bash agentic-orchestration-tool/scripts/jetson-install-ollama.sh jetson-containers
```

Orchestrator logs `(agentic) platform=jetson; ollama_runtime=...` on startup and exposes `edgeRuntime` in the web UI hello message.

### Host metrics (jtop / GPU)

The web UI header sparkline reads **jtop** (jetson-stats) on Jetson for CPU, RAM, **GPU %**, temperature, and power — not btop (btop is a terminal UI with no API).

One-time on the Jetson host (requires sudo):

```bash
sudo bash agentic-orchestration-tool/scripts/jetson-install-jtop-metrics.sh
bash agentic-orchestration-tool/scripts/jetson-hotfix-web.sh   # mounts /var/run/agentic into coordinator
```

This runs `agentic-jtop-metrics.service`, which writes `/var/run/agentic/jtop-metrics.json` every second via the jtop Python API.

```bash
AGENTIC_PLANNER_MODEL=ollama/llama3.2:3b
AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS=ollama_llama3_2_3b
# Edge chat defaults: single-pass Dynamic, low iterative caps
AGENTIC_WEB_DEFAULT_RUN_MODE=dynamic
AGENTIC_WEB_DEFAULT_AUTO_ITER=0
AGENTIC_DYNAMIC_ITERATIVE_MAX_ROUNDS=3
OLLAMA_HOST=http://127.0.0.1:11434   # host; k8s: http://host.k3s.internal:11434
AGENTIC_ASSUME_VRAM_GB=48
AGENTIC_ASSUME_GPU=1
```

Pre-pull on the Ollama host before first run:

```bash
ollama pull llama3.2:3b
```

To reclaim disk after switching models:

```bash
ollama rm qwen2.5 sike_aditya/AgriLlama
```
