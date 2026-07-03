# Jetson / edge local agent catalog

Single small Ollama model for single-node deployments (e.g. Jetson AGX Orin) where the
orchestrator should not pick cloud OpenAI/Anthropic providers.

Agents use the **host** Ollama service (`http://host.k3s.internal:11434` from k8s pods),
not per-workflow loopback servers (`selfcontained: true` only works on a dev machine with
Ollama installed locally).

## Enable

```bash
AGENTIC_AGENT_PROVIDERS_CATALOG=config/agent_providers_jetson
AGENTIC_PLANNER_MODEL=ollama/llama3.2:3b
AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS=ollama_llama3_2_3b
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
