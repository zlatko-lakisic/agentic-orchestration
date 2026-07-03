# Jetson / edge local agent catalog

Ollama-only templates for single-node deployments (e.g. Jetson AGX Orin) where the
orchestrator should not pick cloud OpenAI/Anthropic providers.

## Enable

```bash
AGENTIC_AGENT_PROVIDERS_CATALOG=config/agent_providers_jetson
AGENTIC_PLANNER_MODEL=ollama/qwen2.5
AGENTIC_OPENAI_PROXY_DYNAMIC_AGENT_PROVIDER_IDS=ollama_qwen2_5,ollama_qwen2_5_coder,ollama_agrillama
OLLAMA_HOST=http://127.0.0.1:11434   # host; k8s: http://host.k3s.internal:11434
AGENTIC_ASSUME_VRAM_GB=48
AGENTIC_ASSUME_GPU=1
```

Pre-pull models on the Ollama host before first run:

```bash
ollama pull qwen2.5
ollama pull qwen2.5-coder
ollama pull llava
# optional domain model: ollama pull sike_aditya/AgriLlama
```
