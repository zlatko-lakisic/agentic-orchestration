# Edge local agent catalog

Ollama agents for single-node deployments (e.g. NVIDIA Jetson AGX Orin) where the
orchestrator should prefer local models over cloud OpenAI/Anthropic providers.

Agents use the **in-cluster** Ollama service (`OLLAMA_API_BASE=http://agentic-ollama:11434`
with `AGENTIC_OLLAMA_MODE=managed_k8s`), not per-workflow loopback servers
(`selfcontained: true` only works on a dev machine with Ollama installed locally).

## Enable

Tracked edge overrides live in **`config/env.jetson`**. On the device, apply them into `.env` (gitignored):

```bash
bash agentic-orchestration-tool/scripts/jetson-apply-env.sh
# or automatically via jetson-deploy.sh / jetson-k3s-deploy.sh
```

Key settings (also in `config/env.jetson`):

```bash
AGENTIC_EDGE_PLATFORM=jetson
AGENTIC_OLLAMA_RUNTIME=auto   # native upstream binary, or jetson-container if dustynv/ollama is running
AGENTIC_AGENT_PROVIDERS_CATALOG=config/agent_providers_jetson
AGENTIC_EXTRA_AGENT_SKILLS_PATH=config/agent_skills_jetson   # jetson_irrigation skill, etc.
AGENTIC_PLANNER_MODEL=ollama/llama3.2:3b
# Used only when Chat sends no agent chips (non-empty chips override this):
AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS=ollama_llama3_2_3b
OLLAMA_API_BASE=http://agentic-ollama:11434
AGENTIC_ASSUME_VRAM_GB=48
AGENTIC_ASSUME_GPU=1
```

### Chat chips vs env pin

Non-empty `selectedAgentProviderIds` from the Chat UI **override**
`AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS`. Stale chips that name agents
whose models are not pulled used to produce a one-step plan onto a missing
model. The planner now drops Ollama catalog entries whose `model` is absent from
`OLLAMA_API_BASE` `/api/tags` (log: `skipping '…': model '…' not pulled`).
Disable with `AGENTIC_DISABLE_OLLAMA_PULL_FILTER=1`.

Clear Chat agent chips to fall back to `ollama_llama3_2_3b`, or select only
agents whose models appear in `ollama list`.

The Chat "Select agent provider" dropdown now reads
`AGENTIC_AGENT_PROVIDERS_CATALOG`, so on Jetson it lists **only** this edge
catalog (not the full desktop `config/agent_providers`). Extend the edge
offering by adding a Jetson-tuned YAML here (with `selfcontained: false` and the
in-cluster host) plus its tag in `scripts/jetson-pull-ollama-models.sh`.

### Ollama on ARM edge

NVIDIA documents two approaches ([forum thread](https://forums.developer.nvidia.com/t/introducing-ollama-support-for-jetson-devices/289333)):

| Runtime | What it is | Our default |
|--------|------------|-------------|
| **native** | `curl -fsSL https://ollama.com/install.sh \| sh` — ARM64 binary with CUDA | **Yes** (host binary via managed_k8s nsenter pod) |
| **jetson-container** | `dustynv/ollama:r36.2.0` from [jetson-containers](https://github.com/dusty-nv/jetson-containers) | Optional |

Check what is running:

```bash
bash agentic-orchestration-tool/scripts/jetson-verify-ollama.sh
```

### Host metrics (jtop / GPU)

The web UI reads ARM edge GPU util from a host JSON writer (`jtop` when available, otherwise **tegrastats**).

```bash
bash agentic-orchestration-tool/scripts/jetson-install-jtop-metrics.sh
```

## Agents (NVMe-backed)

YAML ids match `scripts/jetson-pull-ollama-models.sh`. Only **pulled** models are
schedulable; keep the full catalog so Admin/Chat can advertise agents as pulls finish.

| Id | Model | Pull tier |
|----|--------|-----------|
| `ollama_llama3_2_3b` | `llama3.2:3b` | CORE (default planner) |
| `ollama_gemma4_e2b` | `gemma4:e2b` | CORE |
| `ollama_gemma4_e4b` | `gemma4:e4b` | CORE |
| `ollama_gemma4_26b` | `gemma4:26b` | CORE |
| `ollama_qwen3_5_4b` | `qwen3.5:4b` | CORE |
| `ollama_qwen3_5_9b` | `qwen3.5:9b` | CORE |
| `ollama_gemma4_12b` | `gemma4:12b` | optional |
| `ollama_qwen3_5_27b` | `qwen3.5:27b` | optional |
| `ollama_llama3_1_8b` | `llama3.1:8b` | optional |
| `ollama_muse_glimmer` | `muse-glimmer` | optional |
| `ollama_nemotron_3_5_lightning` | `nemotron-3.5-lightning` | optional |
| `ollama_qwen2_5_7b` | `qwen2.5:7b` | optional |
| `ollama_qwen2_5_14b_instruct` | `qwen2.5:14b-instruct` | optional |
| `ollama_mistral_nemo` | `mistral-nemo` | optional |
| `ollama_deepseek_r1_14b` | `deepseek-r1:14b` | optional |
| `ollama_glm4` | `glm4` | optional |
| `ollama_moondream` | `moondream` | optional |
| `ollama_lfm2_24b` | `lfm2:24b` | optional |
| `ollama_granite4_1_8b` | `granite4.1:8b` | optional |
| `ollama_phi4` | `phi4` | optional |
| `ollama_granite_code` | `granite-code` | optional |
| `ollama_lfm2_5_thinking` | `lfm2.5-thinking` | optional |
| `ollama_olmo2` | `olmo2` | optional |

Keep **one large (≤~20 GB) + optional 3B planner** resident; store the rest cold on NVMe.

Pre-pull (batch):

```bash
bash agentic-orchestration-tool/scripts/jetson-pull-ollama-models.sh
# CORE only: AGENTIC_JETSON_PULL_OPTIONAL_MODELS=0 bash …/jetson-pull-ollama-models.sh
```

Models dir: `/mnt/nvme/ollama/models` (`AGENTIC_OLLAMA_MODELS_HOSTPATH`).

To reclaim disk after switching models:

```bash
ollama rm <model-tag>
```
