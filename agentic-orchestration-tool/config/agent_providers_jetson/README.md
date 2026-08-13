# Edge local agent catalog

Single small Ollama model for single-node deployments (e.g. NVIDIA Jetson AGX Orin) where the
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
AGENTIC_EXTRA_AGENT_SKILLS_PATH=config/agent_skills_jetson   # jetson_irrigation skill, etc.
```

### Ollama on ARM edge

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

The web UI reads ARM edge GPU util from a host JSON writer (`jtop` when the process can use `jtop.service`, otherwise **tegrastats** — no jtop group required).

```bash
# Non-root (systemd --user + tegrastats). Also runs from jetson-deploy.sh.
bash agentic-orchestration-tool/scripts/jetson-install-jtop-metrics.sh

# Or with sudo for a system unit (same output path):
sudo bash agentic-orchestration-tool/scripts/jetson-install-jtop-metrics.sh
```

Writes `/var/projects/agentic-orchestration/var/agentic-metrics/jtop-metrics.json`; coordinator/engine mount that directory as `/host/agentic-metrics`.

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

## Agents (NVMe-backed)

| Id | Model | Notes |
|----|--------|--------|
| `ollama_llama3_2_3b` | `llama3.2:3b` | Default planner |
| `ollama_qwen2_5_7b` | `qwen2.5:7b` | Fast Qwen |
| `ollama_qwen2_5_14b_instruct` | `qwen2.5:14b-instruct` | Stronger Qwen |
| `ollama_qwen3_5_4b` | `qwen3.5:4b` | Fast multimodal |
| `ollama_qwen3_5_9b` | `qwen3.5:9b` | Balanced multimodal |
| `ollama_qwen3_5_27b` | `qwen3.5:27b` | Solo hot model |
| `ollama_llama3_1_8b` | `llama3.1:8b` | Meta generalist |
| `ollama_gemma4_e2b` | `gemma4:e2b` | Edge Gemma 4 |
| `ollama_gemma4_e4b` | `gemma4:e4b` | Edge Gemma 4+ |
| `ollama_gemma4_12b` | `gemma4:12b` | Mid Gemma 4 |
| `ollama_gemma4_26b` | `gemma4:26b` | Solo MoE Gemma 4 |
| `ollama_muse_glimmer` | `muse-glimmer` | Meta agent 30B |
| `ollama_nemotron_3_5_lightning` | `nemotron-3.5-lightning` | NVIDIA agent MoE |
| `ollama_mistral_nemo` | `mistral-nemo` | Mistral long-ctx |
| `ollama_deepseek_r1_14b` | `deepseek-r1:14b` | Reasoning distill |
| `ollama_glm4` | `glm4` | Zhipu GLM-4 |
| `ollama_moondream` | `moondream` | Tiny vision |
| `ollama_lfm2_24b` | `lfm2:24b` | Efficient on-device MoE |
| `ollama_granite4_1_8b` | `granite4.1:8b` | IBM Granite |
| `ollama_phi4` | `phi4` | Microsoft Phi-4 |

Keep **one large (≤~20 GB) + optional 3B planner** resident; store the rest cold on NVMe.

Pre-pull (batch):

```bash
bash agentic-orchestration-tool/scripts/jetson-pull-ollama-models.sh
# or: ollama pull llama3.2:3b
```

Models dir: `/mnt/nvme/ollama/models` (`AGENTIC_OLLAMA_MODELS_HOSTPATH`).

To reclaim disk after switching models:

```bash
ollama rm qwen2.5 sike_aditya/AgriLlama
```
