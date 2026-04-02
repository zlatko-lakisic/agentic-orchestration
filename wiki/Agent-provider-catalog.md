# Agent provider catalog

Shipped templates live in **`agentic-orchestration-tool/config/agent_providers/`**: one **`*.yaml`** file per entry (or a legacy bundle YAML with a top-level `agent_providers` list). The dynamic planner picks **`id`** values from this catalog (subject to credentials, VRAM heuristics, and filters).

## YAML shape (typical)

| Field | Meaning |
|-------|---------|
| `id` | Stable id used in plans and workflow refs. |
| `type` | `ollama`, `openai`, `anthropic`, `huggingface`, or a custom `PROVIDER_TYPE`. |
| `model` | Model name / API model id. |
| `role`, `goal`, `backstory` | CrewAI agent fields. |
| `planner_hint` | Short hint for the planner when choosing providers. |
| `min_vram_gb` | Optional GPU memory hint for filtering local-capable models. |
| `verbose`, `allow_delegation` | CrewAI toggles. |
| Ollama-only | `ollama_host`, `selfcontained` |
| Custom | `provider_class`, `provider_options` — see tool README. |

Extra directories: set `AGENTIC_EXTRA_AGENT_PROVIDERS_PATH` (preferred) or `AGENTIC_EXTRA_PROVIDERS_PATH`.

## Counts by family

| Prefix | Count | Backends |
|--------|------:|----------|
| `ollama_` | 82 | Local Ollama |
| `hf_` | 50 | Hugging Face Inference / API |
| `gpt_` | 3 | OpenAI-compatible (`type: openai`) |
| `claude_` | 3 | Anthropic (`type: anthropic`) |
| **Total** | **138** | |

---

## Anthropic (`claude_*`) — 3 files

- `claude_reason.yaml`
- `claude_research.yaml`
- `claude_write.yaml`

## OpenAI (`gpt_*`) — 3 files

- `gpt_reason.yaml`
- `gpt_research.yaml`
- `gpt_write.yaml`

## Hugging Face (`hf_*`) — 50 files

- `hf_codellama_7b.yaml`
- `hf_cohere_aya_8b.yaml`
- `hf_cohere_command_r.yaml`
- `hf_deepseek_coder_6_7b.yaml`
- `hf_deepseek_r1_distill_llama_8b.yaml`
- `hf_deepseek_r1_distill_qwen_7b.yaml`
- `hf_deepseek_v25.yaml`
- `hf_falcon_7b.yaml`
- `hf_gemma2_27b.yaml`
- `hf_gemma2_9b.yaml`
- `hf_gemma3_4b.yaml`
- `hf_hermes_llama31_8b.yaml`
- `hf_ibm_granite_8b.yaml`
- `hf_internlm25_7b.yaml`
- `hf_llama_3_2_11b_vision.yaml`
- `hf_llama_3_2_3b.yaml`
- `hf_llama_3_3_70b.yaml`
- `hf_magistral_small.yaml`
- `hf_meta_llama_3_1_70b.yaml`
- `hf_meta_llama_3_1_8b.yaml`
- `hf_meta_llama_3_8b.yaml`
- `hf_mistral_7b_v3.yaml`
- `hf_mistral_small_24b.yaml`
- `hf_mixtral_8x7b.yaml`
- `hf_nemotron_70b.yaml`
- `hf_olmo2_7b.yaml`
- `hf_openchat_35.yaml`
- `hf_openhermes_25_7b.yaml`
- `hf_phi3_medium.yaml`
- `hf_phi3_mini.yaml`
- `hf_phi4_mini.yaml`
- `hf_qwen2_vl_7b.yaml`
- `hf_qwen25_14b.yaml`
- `hf_qwen25_72b.yaml`
- `hf_qwen25_7b.yaml`
- `hf_qwen25_coder_32b.yaml`
- `hf_qwen25_coder_7b.yaml`
- `hf_qwen3_8b.yaml`
- `hf_sambanova_qwen25_72b.yaml`
- `hf_smollm2_1_7b.yaml`
- `hf_snowflake_arctic.yaml`
- `hf_solar_10b.yaml`
- `hf_starchat2_15b.yaml`
- `hf_starcoder2_15b.yaml`
- `hf_tinyllama_1b.yaml`
- `hf_together_deepseek_r1.yaml`
- `hf_together_llama3_70b.yaml`
- `hf_vicuna_7b.yaml`
- `hf_yi_15_9b.yaml`
- `hf_zephyr_7b.yaml`

## Ollama (`ollama_*`) — 82 files

- `ollama_codegemma.yaml`
- `ollama_codellama.yaml`
- `ollama_codeqwen.yaml`
- `ollama_codestral.yaml`
- `ollama_cogito.yaml`
- `ollama_command_r.yaml`
- `ollama_deepcoder.yaml`
- `ollama_deepscaler.yaml`
- `ollama_deepseek_coder.yaml`
- `ollama_deepseek_coder_v2.yaml`
- `ollama_deepseek_llm.yaml`
- `ollama_deepseek_r1.yaml`
- `ollama_deepseek_v2.yaml`
- `ollama_deepseek_v3.yaml`
- `ollama_devstral.yaml`
- `ollama_dolphin3.yaml`
- `ollama_falcon.yaml`
- `ollama_falcon3.yaml`
- `ollama_gemma.yaml`
- `ollama_gemma2.yaml`
- `ollama_gemma3.yaml`
- `ollama_gemma3n.yaml`
- `ollama_glm_4_7_flash.yaml`
- `ollama_glm4.yaml`
- `ollama_gpt_oss.yaml`
- `ollama_granite_code.yaml`
- `ollama_granite3_1_moe.yaml`
- `ollama_granite3_2_vision.yaml`
- `ollama_granite3_3.yaml`
- `ollama_granite4.yaml`
- `ollama_hermes3.yaml`
- `ollama_lfm2.yaml`
- `ollama_lfm2_5_thinking.yaml`
- `ollama_llama2.yaml`
- `ollama_llama3.yaml`
- `ollama_llama3_1.yaml`
- `ollama_llama3_2.yaml`
- `ollama_llama3_2_vision.yaml`
- `ollama_llama3_3.yaml`
- `ollama_llama4.yaml`
- `ollama_llava.yaml`
- `ollama_llava_llama3.yaml`
- `ollama_magistral.yaml`
- `ollama_minicpm_v.yaml`
- `ollama_ministral_3.yaml`
- `ollama_mistral.yaml`
- `ollama_mistral_large.yaml`
- `ollama_mistral_nemo.yaml`
- `ollama_mistral_small.yaml`
- `ollama_mixtral.yaml`
- `ollama_moondream.yaml`
- `ollama_nous_hermes.yaml`
- `ollama_olmo2.yaml`
- `ollama_openchat.yaml`
- `ollama_openhermes.yaml`
- `ollama_openthinker.yaml`
- `ollama_orca_mini.yaml`
- `ollama_phi.yaml`
- `ollama_phi3.yaml`
- `ollama_phi4.yaml`
- `ollama_phi4_mini.yaml`
- `ollama_phi4_reasoning.yaml`
- `ollama_qwen.yaml`
- `ollama_qwen2.yaml`
- `ollama_qwen2_5.yaml`
- `ollama_qwen2_5_coder.yaml`
- `ollama_qwen2_5vl.yaml`
- `ollama_qwen3.yaml`
- `ollama_qwen3_5.yaml`
- `ollama_qwen3_coder.yaml`
- `ollama_qwen3_coder_next.yaml`
- `ollama_qwen3_vl.yaml`
- `ollama_qwq.yaml`
- `ollama_smollm.yaml`
- `ollama_smollm2.yaml`
- `ollama_starcoder.yaml`
- `ollama_starcoder2.yaml`
- `ollama_tinyllama.yaml`
- `ollama_translategemma.yaml`
- `ollama_wizardlm2.yaml`
- `ollama_yi.yaml`
- `ollama_zephyr.yaml`

---

## Maintaining this page

When you add or remove YAML files under `config/agent_providers/`, update the lists above (or regenerate from `Get-ChildItem … | Sort-Object` / `find`).

## See also

- [Architecture](Architecture)
- [Dynamic-planning](Dynamic-planning)
- [Configuration](Configuration) — VRAM and provider filters
- Tool README: `agentic-orchestration-tool/README.md` — lifecycle hooks, `provider_class`
