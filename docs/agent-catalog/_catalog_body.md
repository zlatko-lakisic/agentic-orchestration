### openai (3 providers)

| ID | Model | Role | Good for | Hardware | Env | GP | Harness |
|---|---|---|---|---|---|---|---|
| `gpt_reason` | gpt-4o | Staff Engineer | OpenAI API—trade-offs, architecture choices, structured reasoning, and | min_vram 0 GiB | OPENAI_API_KEY |  | reason |
| `gpt_research` | gpt-4o-mini | Research Analyst | OpenAI API—research, comparisons, grounded summaries, and structured f | min_vram 0 GiB | OPENAI_API_KEY | ✓ | research |
| `gpt_write` | gpt-4o-mini | Technical Writer | OpenAI API—polish prose, briefings, executive summaries, and clear tec | min_vram 0 GiB | OPENAI_API_KEY |  | write |

### anthropic (3 providers)

| ID | Model | Role | Good for | Hardware | Env | GP | Harness |
|---|---|---|---|---|---|---|---|
| `claude_reason` | claude-3-5-sonnet-20241022 | Staff Engineer | Anthropic Claude—trade-offs, architecture choices, structured reasonin | cpu, gpu, tpu | ANTHROPIC_API_KEY |  | reason |
| `claude_research` | claude-3-5-haiku-20241022 | Research Analyst | Anthropic Claude—research, comparisons, grounded summaries, and struct | min_vram 0 GiB | ANTHROPIC_API_KEY | ✓ | research |
| `claude_write` | claude-3-5-haiku-20241022 | Technical Writer | Anthropic Claude—polish prose, briefings, executive summaries, and cle | min_vram 0 GiB | ANTHROPIC_API_KEY |  | write |

### ollama (85 providers)

| ID | Model | Role | Good for | Hardware | Env | GP | Harness |
|---|---|---|---|---|---|---|---|
| `ollama_agribot` | ayansh03/agribot | Local Crop-Care Assistant | Agriculture chatbot for crop-care, plant disease triage, and irrigatio | min_vram 6 GiB | OLLAMA_HOST |  | general |
| `ollama_agrillama` | sike_aditya/AgriLlama | Local Agriculture Assistant | Agriculture-tuned Ollama model for crop, soil, and irrigation support. | min_vram 4 GiB | OLLAMA_HOST |  | general |
| `ollama_codegemma` | codegemma | Software Engineer | CodeGemma — Google code-specialized Gemma. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_codellama` | codellama | Software Engineer | Code Llama — Meta code completion and generation. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_codeqwen` | codeqwen | Software Engineer | CodeQwen — Qwen code variant. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_codestral` | codestral | Software Engineer | Codestral — Mistral code model. | min_vram 12 GiB | OLLAMA_HOST |  | reason |
| `ollama_cogito` | cogito | Reasoning Assistant | Cogito — reasoning-oriented general model line. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_command_r` | command-r | Research-Oriented Assistant | Cohere Command R — long-context, RAG-friendly general assistant. | min_vram 8 GiB | OLLAMA_HOST |  | research |
| `ollama_deepcoder` | deepcoder | Software Engineer | DeepCoder — code-specialized line on Ollama library. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_deepscaler` | deepscaler | Math Assistant | DeepScaler — math/reasoning-tuned line. | min_vram 14 GiB | OLLAMA_HOST |  | general |
| `ollama_deepseek_coder` | deepseek-coder | Software Engineer | DeepSeek Coder — strong competitive coding and repo-style tasks. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_deepseek_coder_v2` | deepseek-coder-v2 | Senior Software Engineer | DeepSeek Coder V2 — larger coding model for complex patches. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_deepseek_llm` | deepseek-llm | General Assistant | DeepSeek LLM — earlier DeepSeek general base. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_deepseek_r1` | deepseek-r1 | Reasoning Specialist | DeepSeek R1 — chain-of-thought style reasoning; math, logic, proofs sk | min_vram 14 GiB | OLLAMA_HOST |  | general |
| `ollama_deepseek_v2` | deepseek-v2 | Analyst | DeepSeek V2 — prior DeepSeek generation for general chat. | min_vram 16 GiB | OLLAMA_HOST |  | general |
| `ollama_deepseek_v3` | deepseek-v3 | Senior Analyst | DeepSeek V3 — large general+reasoning; heavy but capable. | min_vram 16 GiB | OLLAMA_HOST |  | general |
| `ollama_devstral` | devstral | Developer Tools Engineer | Devstral — dev-focused Mistral line for tooling workflows. | min_vram 12 GiB | OLLAMA_HOST |  | reason |
| `ollama_dolphin3` | dolphin3 | Unrestricted Assistant | Dolphin 3 — uncensored-tuned line; use only where policy allows. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_falcon` | falcon | General Assistant | Falcon — earlier TII general line. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_falcon3` | falcon3 | General Assistant | Falcon 3 — TII general instruct family. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_gemma` | gemma | General Assistant | Original Gemma — smaller/older; simple tasks and classification-style  | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_gemma2` | gemma2 | General Assistant | Gemma 2 — prior Gemma generation; stable general chat. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_gemma3` | gemma3 | General Assistant | Gemma 3 — Google open general model; good instruction following. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_gemma3n` | gemma3n | General Assistant | Gemma 3n — efficient Gemma variant for lighter devices. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_glm4` | glm4 | Multilingual Analyst | GLM-4 — general multilingual (strong Chinese/English) chat. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_glm_4_7_flash` | glm-4.7-flash | Fast Analyst | GLM 4.7 Flash — fast GLM line for interactive use. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_gpt_oss` | gpt-oss | General Assistant | gpt-oss — open-weight models in OpenAI-style families on Ollama. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_granite3_1_moe` | granite3.1-moe | Efficient Analyst | Granite 3.1 MoE — efficient MoE general model. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_granite3_2_vision` | granite3.2-vision | Vision Analyst | Granite 3.2 Vision — IBM multimodal for enterprise visuals. | min_vram 10 GiB | OLLAMA_HOST |  | vision |
| `ollama_granite3_3` | granite3.3 | Enterprise Assistant | IBM Granite 3.3 — enterprise-leaning general instruct. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_granite4` | granite4 | Enterprise Assistant | Granite 4 — newer IBM Granite general line. | min_vram 16 GiB | OLLAMA_HOST |  | general |
| `ollama_granite_code` | granite-code | Software Engineer | Granite Code — IBM code models for enterprise patterns. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_hermes3` | hermes3 | General Assistant | Hermes 3 — Nous general instruct; tool-use friendly style. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_lfm2` | lfm2 | Efficient Assistant | LFM2 — Liquid AI efficient foundation model. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_lfm2_5_thinking` | lfm2.5-thinking | Reasoning Assistant | LFM2.5 Thinking — thinking-augmented efficient model. | min_vram 14 GiB | OLLAMA_HOST |  | general |
| `ollama_llama2` | llama2 | General Assistant | Legacy Llama 2 — lighter hardware; ok for simple Q&A and drafts. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_llama3` | llama3 | General Assistant | Llama 3 base family — general-purpose local assistant. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_llama3_1` | llama3.1 | General Assistant | Llama 3.1 family — general chat, longer context than 3.2 for many tags | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_llama3_2` | llama3.2 | General Assistant | Default local generalist; planning, Q&A, summaries, light analysis. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_llama3_2_1b` | llama3.2:1b | General Assistant | Smallest fast local generalist (1B) — short Q&A, summaries, light plan | min_vram 2 GiB | OLLAMA_HOST |  | general |
| `ollama_llama3_2_vision` | llama3.2-vision | Vision Analyst | Llama 3.2 Vision — Meta multimodal; images + instructions. | min_vram 10 GiB | OLLAMA_HOST |  | vision |
| `ollama_llama3_3` | llama3.3 | Senior Generalist | Stronger Llama 3.3 for harder general reasoning and longer outputs. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_llama4` | llama4 | Senior Generalist | Llama 4 when available — frontier-class local general model (large dow | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_llava` | llava | Vision Analyst | LLaVA — image+text; describe screenshots, diagrams, UI. | min_vram 10 GiB | OLLAMA_HOST |  | general |
| `ollama_llava_llama3` | llava-llama3 | Vision Analyst | LLaVA Llama 3 — stronger LLaVA backbone for vision QA. | min_vram 10 GiB | OLLAMA_HOST |  | general |
| `ollama_magistral` | magistral | Reasoning Specialist | Magistral — Mistral reasoning line. | min_vram 16 GiB | OLLAMA_HOST |  | general |
| `ollama_minicpm_v` | minicpm-v | Efficient Vision Assistant | MiniCPM-V — efficient vision-language for edge. | min_vram 10 GiB | OLLAMA_HOST |  | general |
| `ollama_ministral_3` | ministral-3 | General Assistant | Ministral 3 — efficient Mistral line for edge and fast iteration. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_mistral` | mistral | General Assistant | Mistral 7B-class general instruct; fast, good default for many subject | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_mistral_large` | mistral-large | Senior Generalist | Mistral Large — demanding analysis, writing, and reasoning locally. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_mistral_nemo` | mistral-nemo | General Assistant | Mistral Nemo — strong multilingual and general instruct mid-size. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_mistral_small` | mistral-small | General Assistant | Mistral Small — balanced speed/quality for everyday tasks. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_mixtral` | mixtral | Senior Generalist | Mixtral MoE — stronger general quality when you have RAM/VRAM. | min_vram 16 GiB | OLLAMA_HOST |  | general |
| `ollama_moondream` | moondream | Lightweight Vision Assistant | Moondream — tiny VLM for quick image Q&A. | min_vram 10 GiB | OLLAMA_HOST |  | general |
| `ollama_nous_hermes` | nous-hermes | General Assistant | Nous Hermes — earlier Nous instruct line. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_olmo2` | olmo2 | Research Assistant | OLMo 2 — open research LM; general knowledge tasks. | min_vram 8 GiB | OLLAMA_HOST |  | research |
| `ollama_openchat` | openchat | Conversational Assistant | OpenChat — conversational, assistant-style dialogue. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_openhermes` | openhermes | General Assistant | OpenHermes — Mistral-based instruct tuning. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_openthinker` | openthinker | Reasoning Specialist | OpenThinker — open reasoning-style assistant. | min_vram 14 GiB | OLLAMA_HOST |  | general |
| `ollama_orca_mini` | orca-mini | Lightweight Assistant | Orca Mini — tiny model for demos and smoke tests. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_phi` | phi | Lightweight Assistant | Legacy Phi — very small; trivial classification and micro-tasks. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_phi3` | phi3 | Efficient Assistant | Phi-3 — Microsoft small model; fast reasoning on modest hardware. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_phi4` | phi4 | Analyst | Phi-4 — stronger small Microsoft model for reasoning and instruction. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_phi4_mini` | phi4-mini | Efficient Assistant | Phi-4 mini — smallest Phi-4 line for edge and high throughput. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_phi4_reasoning` | phi4-reasoning | Reasoning Assistant | Phi-4 reasoning — Microsoft small reasoning specialist. | min_vram 14 GiB | OLLAMA_HOST |  | general |
| `ollama_qwen` | qwen | General Assistant | Qwen base — legacy general Qwen family. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_qwen2` | qwen2 | General Analyst | Qwen 2 — earlier Qwen general; still useful for many languages. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_qwen2_5` | qwen2.5 | General Analyst | Qwen 2.5 general — strong multilingual and STEM-friendly chat. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_qwen2_5_coder` | qwen2.5-coder | Software Engineer | Primary code model — implementation, refactors, scripts, APIs. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_qwen2_5vl` | qwen2.5vl | Vision Analyst | Qwen2.5-VL — strong document and scene understanding. | min_vram 10 GiB | OLLAMA_HOST |  | general |
| `ollama_qwen3` | qwen3 | General Analyst | Qwen 3 — newer general Qwen for harder questions and coding-adjacent c | cpu, gpu | OLLAMA_HOST |  | general |
| `ollama_qwen3_5` | qwen3.5 | Senior Analyst | Qwen 3.5 — upgraded Qwen line for demanding general tasks. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_qwen3_coder` | qwen3-coder | Software Engineer | Qwen3 Coder — newer coding-focused Qwen. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_qwen3_coder_next` | qwen3-coder-next | Senior Software Engineer | Qwen3 Coder Next — latest Qwen coding line when available. | min_vram 12 GiB | OLLAMA_HOST |  | reason |
| `ollama_qwen3_vl` | qwen3-vl | Vision Analyst | Qwen3-VL — newer Qwen vision-language line. | min_vram 10 GiB | OLLAMA_HOST |  | general |
| `ollama_qwq` | qwq | Reasoning Specialist | QwQ — Qwen reasoning model for hard puzzles and math. | min_vram 16 GiB | OLLAMA_HOST |  | general |
| `ollama_smollm` | smollm | Lightweight Assistant | SmolLM — first-gen small LM line. | min_vram 4 GiB | OLLAMA_HOST |  | general |
| `ollama_smollm2` | smollm2 | Efficient Assistant | SmolLM2 — Hugging Face small LM for edge. | min_vram 4 GiB | OLLAMA_HOST |  | general |
| `ollama_starcoder` | starcoder | Software Engineer | StarCoder — first-gen BigCode model. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_starcoder2` | starcoder2 | Software Engineer | StarCoder2 — BigCode family for code generation. | min_vram 8 GiB | OLLAMA_HOST |  | reason |
| `ollama_tinyllama` | tinyllama | Micro Assistant | TinyLlama — very small; prototyping only. | min_vram 4 GiB | OLLAMA_HOST |  | general |
| `ollama_translategemma` | translategemma | Translator | TranslateGemma — translation-focused Gemma; parallel text, localizatio | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_wizardlm2` | wizardlm2 | General Assistant | WizardLM 2 — complex instruction following. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_yi` | yi | Multilingual Assistant | Yi — bilingual EN/ZH capable general models. | min_vram 8 GiB | OLLAMA_HOST |  | general |
| `ollama_zephyr` | zephyr | General Assistant | Zephyr — alignment-tuned small chat model. | min_vram 8 GiB | OLLAMA_HOST |  | general |

### huggingface (62 providers)

| ID | Model | Role | Good for | Hardware | Env | GP | Harness |
|---|---|---|---|---|---|---|---|
| `hf_codellama_7b` | codellama/CodeLlama-7b-Instruct-hf | Code Specialist | HF Hub—Code Llama 7B instruct. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_cohere_aya_8b` | CohereForAI/aya-expanse-8b | Multilingual Specialist | HF Hub—Cohere Aya 8B multilingual. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_cohere_command_r` | CohereLabs/c4ai-command-r7b-12-2024 | RAG-Friendly Assistant | HF Hub—Cohere Command R (7B Dec’24 route via Inference Providers); RAG | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_deepseek_coder_6_7b` | deepseek-ai/deepseek-coder-6.7b-instruct | Coder | HF Hub—DeepSeek Coder 6.7B for code-heavy tasks. | min_vram 0 GiB | HF_TOKEN |  | coding |
| `hf_deepseek_r1_distill_llama_8b` | deepseek-ai/DeepSeek-R1-Distill-Llama-8B | Reasoning Assistant | HF Hub—R1-distilled Llama; good for math-like steps. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_deepseek_r1_distill_qwen_7b` | deepseek-ai/DeepSeek-R1-Distill-Qwen-7B | Reasoning Assistant | HF Hub—R1-distilled Qwen; concise chain-of-thought style. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_deepseek_v25` | deepseek-ai/DeepSeek-V2.5 | General Assistant | HF Hub—DeepSeek V2.5 general/chat; larger context tasks. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_falcon_7b` | tiiuae/falcon-7b-instruct | General Chat | HF Hub—Falcon 7B instruct baseline. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_agri_chat_multilingual` | mesabo/agri-chat-multilingual | Multilingual Extension-Style Gardening Advisor | Agriculture-focused multilingual chat model for extension-like guidanc | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_agriassist_llm` | sikeaditya/AgriAssist_LLM | Applied Agronomy Advisor | Domain-oriented agriculture/gardening fine-tune intended for crop-care | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_agriculture_advisory_8b` | Navinaa21/Agriculture-Advisory-LLM-8B | Crop and Vegetation Advisory Specialist | Agriculture advisory LLM for medium-depth guidance on crop management, | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_agriparam` | bharatgenai/AgriParam | Agriculture Decision-Support Advisor | Agriculture decision-support assistant tuned for agronomy and farm adv | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_diagnostics_qwen2_vl_7b` | Qwen/Qwen2-VL-7B-Instruct | Plant Health Diagnostics Specialist | Vision-capable gardening diagnostics model for leaf/stem/fruit image a | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_fast_triage_gemma3_4b` | google/gemma-3-4b-it | Rapid Garden Triage Assistant | Fast first-pass gardening triage for quick follow-up questions, checkl | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_generalist_qwen25_14b` | Qwen/Qwen2.5-14B-Instruct | Gardening Planning Advisor | Gardening generalist for practical home-garden guidance (plant selecti | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_irrigation_phi3_mini` | YuvrajSingh9886/phi3-mini-fine-tuned-agr | Irrigation Optimization Advisor | Irrigation-focused agriculture Q&A. Use for turf/zone watering **minut | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_leaf_disease_vlm` | YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Dise | Leaf Disease Visual Analyst | Plant leaf disease vision-language specialist fine-tuned for symptom r | min_vram 0 GiB | HF_TOKEN |  | vision |
| `hf_garden_multilingual_aya_8b` | CohereForAI/aya-expanse-8b | Multilingual Gardening Support Agent | Multilingual gardening advisor for non-English or mixed-language suppo | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_reasoning_r1_qwen7b` | deepseek-ai/DeepSeek-R1-Distill-Qwen-7B | Garden Root-Cause Analyst | Deep troubleshooting model for complex gardening failures with multipl | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_garden_soil_water_command_r` | CohereLabs/c4ai-command-r7b-12-2024 | Soil and Irrigation Planner | Primary pick for turf/lawn watering decisions—including zone watering  | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_gemma2_27b` | google/gemma-2-27b-it | Reasoning Assistant | HF Hub—Gemma 2 27B; stronger reasoning than 9B line. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_gemma2_9b` | google/gemma-2-9b-it | Research Assistant | HF Hub—Gemma 2 9B instruct; Google Gemma chat. | min_vram 0 GiB | HF_TOKEN |  | research |
| `hf_gemma3_4b` | google/gemma-3-4b-it | Compact Assistant | HF Hub—compact Gemma 3 4B for edge-like cloud calls. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_hermes_llama31_8b` | NousResearch/Hermes-3-Llama-3.1-8B | Tool-Aware Assistant | HF Hub—Hermes 3 on Llama 3.1 8B; tool-friendly tendencies. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_ibm_granite_8b` | ibm-granite/granite-3.1-8b-instruct | Enterprise Coder-Analyst | HF Hub—IBM Granite 3.1 8B instruct. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_internlm25_7b` | internlm/internlm2_5-7b-chat | Research Chat | HF Hub—InternLM2.5 7B chat. | min_vram 0 GiB | HF_TOKEN |  | research |
| `hf_llama_3_2_11b_vision` | meta-llama/Llama-3.2-11B-Vision-Instruct | Vision-Language Assistant | HF Hub—vision+language; describe images and charts when the crew passe | min_vram 0 GiB | HF_TOKEN |  | vision |
| `hf_llama_3_2_3b` | meta-llama/Llama-3.2-3B-Instruct | Lightweight Assistant | HF Hub—small fast Llama 3.2 for quick drafts and classification. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_llama_3_3_70b` | meta-llama/Llama-3.3-70B-Instruct | Senior Analyst | HF Hub—Llama 3.3 70B; heavier reasoning and long-context tasks. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_magistral_small` | mistralai/Magistral-Small-2509 | Reasoning Assistant | HF Hub—Mistral Magistral Small reasoning-oriented line. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_meta_llama_3_1_70b` | meta-llama/Meta-Llama-3.1-70B-Instruct | Lead Assistant | HF Hub—Llama 3.1 70B instruct flagship tier. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_meta_llama_3_1_8b` | meta-llama/Meta-Llama-3.1-8B-Instruct | Instruction-Following Assistant | HF Hub—Llama 3.1 8B; strong instruction following. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_meta_llama_3_8b` | meta-llama/Meta-Llama-3-8B-Instruct | General Assistant | HF Hub—Llama 3 8B instruct; balanced chat and reasoning. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_mistral_7b_v3` | mistralai/Mistral-7B-Instruct-v0.3 | Chat Specialist | HF Hub—Mistral 7B v0.3 general instruct chat. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_mistral_small_24b` | mistralai/Mistral-Small-24B-Instruct-250 | Technical Generalist | HF Hub—Mistral Small 24B instruct; good mid-size workhorse. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_mixtral_8x7b` | mistralai/Mixtral-8x7B-Instruct-v0.1 | MoE Generalist | HF Hub—Mixtral MoE 8x7B; stronger quality at medium cost. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_nemotron_70b` | nvidia/Llama-3.1-Nemotron-70B-Instruct-H | Technical Advisor | HF Hub—Nemotron 70B instruct; NVIDIA-tuned Llama family. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_olmo2_7b` | allenai/OLMo-2-1124-7B-Instruct | Open Science Assistant | HF Hub—OLMo 2 7B instruct (Allen AI). | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_openchat_35` | openchat/openchat-3.5-0106 | Conversational Assistant | HF Hub—OpenChat 3.5 conversation model. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_openhermes_25_7b` | teknium/OpenHermes-2.5-Mistral-7B | General Instruct | HF Hub—OpenHermes 2.5 on Mistral 7B. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_phi3_medium` | microsoft/Phi-3-medium-4k-instruct | Explainer | HF Hub—Phi-3 medium instruct for longer explanations. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_phi3_mini` | microsoft/Phi-3-mini-4k-instruct | Analyst | HF Hub—Phi-3 mini; strong small model for reasoning snippets. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_phi4_mini` | microsoft/Phi-4-mini-instruct | Assistant | HF Hub—Phi-4 mini; Microsoft small instruct model. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_qwen25_14b` | Qwen/Qwen2.5-14B-Instruct | Generalist | HF Hub—Qwen2.5 14B; stronger general instruct. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_qwen25_72b` | Qwen/Qwen2.5-72B-Instruct | Research Lead | HF Hub—Qwen2.5 72B; heavy lifting for research-grade answers. | min_vram 0 GiB | HF_TOKEN |  | research |
| `hf_qwen25_7b` | Qwen/Qwen2.5-7B-Instruct | Multilingual Assistant | HF Hub—Qwen2.5 7B instruct; multilingual general tasks. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_qwen25_coder_32b` | Qwen/Qwen2.5-Coder-32B-Instruct | Staff Engineer | HF Hub—Qwen2.5 Coder 32B; larger coding model. | min_vram 0 GiB | HF_TOKEN |  | reason |
| `hf_qwen25_coder_7b` | Qwen/Qwen2.5-Coder-7B-Instruct | Code Assistant | HF Hub—Qwen2.5 Coder 7B; code completion and refactoring hints. | min_vram 0 GiB | HF_TOKEN |  | coding |
| `hf_qwen2_vl_7b` | Qwen/Qwen2-VL-7B-Instruct | Vision Assistant | HF Hub—Qwen2-VL multimodal text+image understanding. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_qwen3_8b` | Qwen/Qwen3-8B | Assistant | HF Hub—Qwen3 8B family; modern Qwen chat/reasoning. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_sambanova_qwen25_72b` | sambanova/Qwen/Qwen2.5-72B-Instruct | Heavyweight Generalist | HF Hub via Sambanova—Qwen2.5 72B instruct. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_smollm2_1_7b` | HuggingFaceTB/SmolLM2-1.7B-Instruct | Light Assistant | HF Hub—SmolLM2 tiny instruct for cheap passes. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_snowflake_arctic` | snowflake/snowflake-arctic-instruct | Enterprise Assistant | HF Hub—Snowflake Arctic instruct for enterprise-flavored QA. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_solar_10b` | upstage/SOLAR-10.7B-Instruct-v1.0 | Instruct Model | HF Hub—SOLAR 10.7B instruct (Upstage). | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_starchat2_15b` | HuggingFaceH4/starchat2-15b-v0.1 | Code Chat | HF Hub—StarChat2 code conversation. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_starcoder2_15b` | bigcode/starcoder2-15b | Code Generator | HF Hub—StarCoder2 15B for code generation. | min_vram 0 GiB | HF_TOKEN |  | coding |
| `hf_tinyllama_1b` | TinyLlama/TinyLlama-1.1B-Chat-v1.0 | Micro Assistant | HF Hub—TinyLlama 1.1B for ultra-cheap generations. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_together_deepseek_r1` | together/deepseek-ai/DeepSeek-R1 | Reasoning Model | HF Hub via Together provider route—DeepSeek R1 class reasoning. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_together_llama3_70b` | together/meta-llama/Meta-Llama-3-70B-Ins | Large Chat Model | HF Hub via Together—Llama 3 70B instruct. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_vicuna_7b` | lmsys/vicuna-7b-v1.5 | Chat Model | HF Hub—Vicuna v1.5 7B chat baseline. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_yi_15_9b` | 01-ai/Yi-1.5-9B-Chat-16K | Bilingual Assistant | HF Hub—Yi 1.5 9B chat with 16k flavor. | min_vram 0 GiB | HF_TOKEN |  | general |
| `hf_zephyr_7b` | HuggingFaceH4/zephyr-7b-beta | Helpful Assistant | HF Hub—Zephyr 7B aligned chat. | min_vram 0 GiB | HF_TOKEN |  | general |

### vllm (8 providers)

| ID | Model | Role | Good for | Hardware | Env | GP | Harness |
|---|---|---|---|---|---|---|---|
| `vllm_tpu_google_gemma_3_27b_it` | google/gemma-3-27b-it | TPU Inference Specialist | vLLM TPU recommended model: google/gemma-3-27b-it. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_meta_llama_llama_3_1_8b_instruct` | meta-llama/Llama-3.1-8B-Instruct | TPU Inference Specialist | vLLM TPU recommended model: meta-llama/Llama-3.1-8B-Instruct. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_meta_llama_llama_3_3_70b_instruct` | meta-llama/Llama-3.3-70B-Instruct | TPU Inference Specialist | vLLM TPU recommended model: meta-llama/Llama-3.3-70B-Instruct. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_meta_llama_llama_guard_4_12b` | meta-llama/Llama-Guard-4-12B | TPU Inference Specialist | vLLM TPU recommended model: meta-llama/Llama-Guard-4-12B. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_qwen_qwen2_5_vl_7b_instruct` | Qwen/Qwen2.5-VL-7B-Instruct | TPU Inference Specialist | vLLM TPU recommended model: Qwen/Qwen2.5-VL-7B-Instruct. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_qwen_qwen3_30b_a3b` | Qwen/Qwen3-30B-A3B | TPU Inference Specialist | vLLM TPU recommended model: Qwen/Qwen3-30B-A3B. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_qwen_qwen3_32b` | Qwen/Qwen3-32B | TPU Inference Specialist | vLLM TPU recommended model: Qwen/Qwen3-32B. | tpu | VLLM_BASE_URL |  | general |
| `vllm_tpu_qwen_qwen3_4b` | Qwen/Qwen3-4B | TPU Inference Specialist | vLLM TPU recommended model: Qwen/Qwen3-4B. | tpu | VLLM_BASE_URL |  | general |

### jetstream (22 providers)

| ID | Model | Role | Good for | Hardware | Env | GP | Harness |
|---|---|---|---|---|---|---|---|
| `jetstream_tpu_google_gemma_2b` | google/gemma-2b | TPU Inference Specialist | JetStream PyTorch listed model: google/gemma-2b. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_google_gemma_2b_it` | google/gemma-2b-it | TPU Inference Specialist | JetStream PyTorch listed model: google/gemma-2b-it. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_google_gemma_7b` | google/gemma-7b | TPU Inference Specialist | JetStream PyTorch listed model: google/gemma-7b. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_google_gemma_7b_it` | google/gemma-7b-it | TPU Inference Specialist | JetStream PyTorch listed model: google/gemma-7b-it. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_2_13b_chat_hf` | meta-llama/Llama-2-13b-chat-hf | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-2-13b-chat-hf. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_2_13b_hf` | meta-llama/Llama-2-13b-hf | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-2-13b-hf. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_2_70b_chat_hf` | meta-llama/Llama-2-70b-chat-hf | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-2-70b-chat-hf. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_2_70b_hf` | meta-llama/Llama-2-70b-hf | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-2-70b-hf. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_2_7b_chat_hf` | meta-llama/Llama-2-7b-chat-hf | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-2-7b-chat-hf. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_2_7b_hf` | meta-llama/Llama-2-7b-hf | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-2-7b-hf. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_3_1_8b` | meta-llama/Llama-3.1-8B | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-3.1-8B. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_3_1_8b_instruct` | meta-llama/Llama-3.1-8B-Instruct | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-3.1-8B-Instruct. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_3_2_1b` | meta-llama/Llama-3.2-1B | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-3.2-1B. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_3_2_1b_instruct` | meta-llama/Llama-3.2-1B-Instruct | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-3.2-1B-Instruct. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_3_3_70b` | meta-llama/Llama-3.3-70B | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-3.3-70B. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_llama_3_3_70b_instruct` | meta-llama/Llama-3.3-70B-Instruct | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Llama-3.3-70B-Instruct. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_meta_llama_3_70b` | meta-llama/Meta-Llama-3-70B | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Meta-Llama-3-70B. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_meta_llama_3_70b_instruct` | meta-llama/Meta-Llama-3-70B-Instruct | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Meta-Llama-3-70B-Instruct. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_meta_llama_3_8b` | meta-llama/Meta-Llama-3-8B | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Meta-Llama-3-8B. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_meta_llama_meta_llama_3_8b_instruct` | meta-llama/Meta-Llama-3-8B-Instruct | TPU Inference Specialist | JetStream PyTorch listed model: meta-llama/Meta-Llama-3-8B-Instruct. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_mistralai_mixtral_8x7b_instruct_v0_1` | mistralai/Mixtral-8x7B-Instruct-v0.1 | TPU Inference Specialist | JetStream PyTorch listed model: mistralai/Mixtral-8x7B-Instruct-v0.1. | tpu | JETSTREAM_BASE_URL |  | general |
| `jetstream_tpu_mistralai_mixtral_8x7b_v0_1` | mistralai/Mixtral-8x7B-v0.1 | TPU Inference Specialist | JetStream PyTorch listed model: mistralai/Mixtral-8x7B-v0.1. | tpu | JETSTREAM_BASE_URL |  | general |
