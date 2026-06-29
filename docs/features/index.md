---
title: "Features"
layout: single
sidebar:
  nav: "docs"
toc: true
toc_sticky: true
---

Agentic Orchestration is a YAML-driven multi-agent engine on CrewAI. This page groups capabilities by how you use them.

## Orchestration modes

### Static workflows

Run a fixed sequence of agents defined in `config/workflows/*.yaml`. Best when the crew structure is known upfront.

```bash
python main.py --batch --config config/workflows/workflow_brainstorm.yaml
```

### Router mode

Pass a natural-language task; Ollama selects the best workflow from the catalog and runs it with your topic.

```bash
python main.py "Draft release notes for a CLI tool"
```

### Dynamic (`--dynamic`)

The planner (LiteLLM) reads your goal, agent catalog, and MCP catalog, then emits a JSON plan and executes steps sequentially.

```bash
python main.py --dynamic "Compare three observability stacks for Kubernetes"
```

### Dynamic iterative (`--dynamic-iterative`)

One step per round with re-planning between rounds. Optional auto-controller stops early or continues up to a cap.

```bash
python main.py --dynamic-iterative --dynamic-iterative-auto \
  "Investigate market entry options for a medtech device"
```

---

## Model support

| Type | Description |
|---|---|
| `ollama` | Local inference via Ollama. Optional bootstrap mode installs Ollama and pulls the model automatically. |
| `openai` | OpenAI-compatible APIs including Azure (`OPENAI_BASE_URL`). |
| `anthropic` | Anthropic Claude models. |
| `huggingface` | Hugging Face Inference API with runtime fallback support. |
| `vllm` | vLLM OpenAI-compatible endpoint (GPU/TPU). |
| `jetstream` | JetStream TPU serving endpoint. |

Add custom provider classes via `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` without modifying the repo.

---

## Hardware-aware routing

Agent provider YAML can declare hardware constraints. The dynamic planner filters the catalog before planning.

```yaml
hardware:
  architecture: [cpu, gpu]
min_vram_gb: 8
```

Detection uses `nvidia-smi` when available. Override manually:

| Variable | Purpose |
|---|---|
| `AGENTIC_AVAILABLE_ARCHITECTURES` | Comma-separated `cpu,gpu,tpu` |
| `AGENTIC_ASSUME_GPU` | Force GPU as available |
| `AGENTIC_ASSUME_TPU` | Force TPU as available |
| `AGENTIC_ASSUME_VRAM_GB` | Override detected VRAM |
| `AGENTIC_DISABLE_HARDWARE_FILTER` | Never drop catalog entries by VRAM |

---

## MCP tool integration

- **Transports:** `streamable_http` (remote MCP servers) and `stdio` (subprocess MCP servers).
- **Credential gating:** Catalog entries hide until required env vars are set.
- **Planner hints:** `planner_hint`, `good_for`, and `user_goal_keywords` steer attachment.
- **Per-step assignment:** Each planned step gets the MCP subset it needs.

See the full [MCP Catalog](/mcp-catalog/).

---

## Execution backends

| Backend | Selection | How steps run |
|---|---|---|
| CrewAI in-process | `AGENTIC_EXECUTION_BACKEND=inprocess` (default) | Whole crew in one Python process |
| Subprocess | `AGENTIC_SUBPROCESS_WORKERS=1` | `python main.py --execute-step` per step |
| Kubernetes | `AGENTIC_EXECUTION_BACKEND=kubernetes` | One K8s Job per step, shared PVC run store |

Details: [Execution Backends](/execution-backends/).

---

## Memory, learning, and knowledge base

| Feature | Storage | Purpose |
|---|---|---|
| **Sessions** | `__orchestrator_sessions__/*.json` | Planner history + crew excerpts per session slug |
| **Learning loop** | `__orchestrator_learning__/` | Traces, per-provider stats, web UI ratings |
| **Knowledge base** | `__orchestrator_kb__/kb.sqlite3` | FTS index of finalized answers for planner context |
| **Answer cache** | Session JSON | Same goal in same session returns cached answer |

Enable with `AGENTIC_KB=1`, `AGENTIC_LEARNING=1`, `AGENTIC_ANSWER_CACHE=1`.

---

## Quality assurance

After `--dynamic` or iterative synthesis, an optional faithfulness pass checks for hallucinations and unsupported claims. Output goes to stderr (visible in the web UI activity log).

| Variable | Default |
|---|---|
| `AGENTIC_FINAL_QA` | off |
| `AGENTIC_QA_MODEL` | falls back to planner / eval model |

---

## Web UI

The Node.js WebSocket server (`agentic-orchestration-web`) provides:

- Real-time chat and progress streaming
- File upload support (`--dynamic-attachments`)
- Run ratings that feed the learning loop

```bash
cd agentic-orchestration-web && npm install && npm start
```

Default URL: `http://127.0.0.1:3847`
