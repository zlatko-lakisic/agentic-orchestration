# Fix: OpenAI-compatible vision replies for Home Assistant LLM Vision

## Goal

Make `POST https://ai-orchestrator.mostardesigns.com/v1/chat/completions` return a normal OpenAI chat completion whose `choices[0].message.content` is **plain text** when the request includes images.

Home Assistant’s **LLM Vision** custom component (and the gate-open blueprint) expects that. Today the orchestrator often returns **tool-call JSON / agent chatter as the final `content`**, which breaks gate people classification.

## Context / consumers

| Consumer | Endpoint | Auth | Notes |
|----------|----------|------|-------|
| Home Assistant LLM Vision provider “Custom OpenAI compatible” | `https://ai-orchestrator.mostardesigns.com/v1/chat/completions` | Bearer `fl!ntst0n3` (same key as watering LLM helper) | Entry id `01KR1YDS2H88N44EA4MJHW0PP8` |
| Gate automations | via `llmvision.image_analyzer` | same | Blueprint: `gate_open_llm_vision_people.yaml` |
| Agentic watering | same host `/v1/chat/completions` | same | Text-only prompts; less affected |

**Routing (infra):** Traefik host `ai-orchestrator.mostardesigns.com` → `http://10.0.10.16:3847`  
See: `docker-infrastructure/traefik/config/traefik/dynamic/ai-orchestrator.mostardesigns.com.yml`

**Repo layout:** this workspace is `agentic-orchestration` (`agentic-orchestration-web` + `agentic-orchestration-tool`). The checked-in web server (`server.mjs`) is currently **static + WebSocket only** and does **not** implement `/v1/chat/completions`. The live host on `:3847` clearly does (Warpgate-style UI at `/@warpgate`, OpenAI path works). Find and fix the **deployed** OpenAI-compat layer (may be uncommitted, another branch, or a sibling service on that host).

**Working alternate vision path (do not break):**  
`https://ai.mostardesigns.com/v1/chat/completions` → Kong → CodeProject.AI `describe-image` → OpenAI-shaped `content` string.  
See: `docker-infrastructure/traefik/config/kong/kong.yaml` and `ai.mostardesigns.com.yml`.

## Symptom (observed 2026-07-09)

HA `llmvision.image_analyzer` with gate JPEGs returns `response_text` like:

```json
{"name": "describe_image_file", "parameters": {"path": "/app/tool/_web_uploads/.../0_openai_image_0.jpg"}}
```

or:

```json
{"name": "python_m_mcp_servers_media_understand_analyzer", "parameters": {"path":"/app/east_gate_....jpg"}}
```

or multi-line agent prose that **mentions** tools / “List the person/pet…” instead of answering.

Models tried via HA (all bad for strict 3-line output): `gpt-4o-mini`, `moondream:latest`, `qwen2.5vl:latest`, `llava:latest`, `gemma4:26b`.

HA then either:

1. Crashed on template `.splitlines()` (fixed on HA side), or  
2. Misclassified `UNKNOWN` / false `PEOPLE`, or  
3. Fell back to Frigate occupancy (current HA workaround).

## Required behavior

For multimodal `chat/completions` requests from LLM Vision:

1. **Accept** OpenAI message content parts: `text` + `image_url` with `data:image/jpeg;base64,...` (LLM Vision sends this).
2. **Actually run** vision (native multimodal model **or** internal `describe_image*` / MCP media tools).
3. **Return only** the final assistant answer in:

```json
{
  "object": "chat.completion",
  "choices": [{
    "message": { "role": "assistant", "content": "<plain text answer>" },
    "finish_reason": "stop"
  }],
  "model": "<requested model>"
}
```

4. **Never** put tool-call JSON, MCP invoke stubs, or “I will call describe_image_file” in `message.content` as the final response.
5. Honor user instructions that say **do not call tools / no JSON / exactly N lines** — treat as a **direct vision completion**, not an agent planning turn.
6. Prefer supporting `tool_choice: "none"` (and/or omitting tools) for these clients.

### Gate prompt contract (what HA asks for)

Exactly 3 plain-text lines:

```text
PEOPLE|NOPEOPLE
<log description ≤240 chars>
<mobile alert ≤120 chars>
```

Success example:

```text
NOPEOPLE
East gate area clear; no person visible across frames.
No people at East gate
```

## Reproduction

From a machine that can reach the orchestrator (LAN / same network as HA):

```bash
# Use any recent gate snapshot on HA, or any JPEG as base64 data URL
IMG_B64=$(base64 < /path/to/gate.jpg | tr -d '\n')

curl -sS -m 120 \
  -H "Authorization: Bearer fl!ntst0n3" \
  -H "Content-Type: application/json" \
  https://ai-orchestrator.mostardesigns.com/v1/chat/completions \
  -d "{
    \"model\": \"gpt-4o-mini\",
    \"temperature\": 0.1,
    \"max_tokens\": 200,
    \"messages\": [{
      \"role\": \"user\",
      \"content\": [
        {\"type\": \"text\", \"text\": \"Do NOT call tools. Do NOT output JSON. Reply with exactly 3 lines:\\nNOPEOPLE or PEOPLE\\nshort description\\nshorter alert\"},
        {\"type\": \"image_url\", \"image_url\": {\"url\": \"data:image/jpeg;base64,${IMG_B64}\"}}
      ]
    }]
  }"
```

**Fail:** `content` is `{"name":"describe_image_file",...}` or tool/agent prose.  
**Pass:** `content` is three plain lines starting with `PEOPLE` or `NOPEOPLE`.

Also verify via HA:

```bash
# On HA API
POST /api/services/llmvision/image_analyzer?return_response
{
  "provider": "01KR1YDS2H88N44EA4MJHW0PP8",
  "model": "gpt-4o-mini",
  "image_file": "/config/www/tmp/<existing_gate>.jpg",
  "include_filename": false,
  "message": "Do NOT call tools. Exactly 3 lines: PEOPLE|NOPEOPLE / desc / alert",
  "max_tokens": 200,
  "temperature": 0.1,
  "generate_title": false,
  "target_width": 640
}
```

## Likely root cause

The OpenAI-compat gateway is running in **agent / tool mode** for vision:

- Images are staged under `/app/tool/_web_uploads/...`
- The model is steered (or defaults) to emit MCP/tool calls like `describe_image_file` / `python_m_mcp_servers_media_understand_*`
- The gateway returns that tool-call payload as the **final** `message.content` instead of executing tools and synthesizing the user-visible answer

Fix should be in the **request path that serves `/v1/chat/completions`**, not in the HA blueprint (HA already has Frigate fallback).

## Implementation guidance

1. Locate the live `/v1/chat/completions` handler behind `:3847` (search for `describe_image_file`, `_web_uploads`, `chat/completions`, Warpgate UI).
2. Add a **direct multimodal completion** mode when:
   - request contains `image_url` parts, and/or
   - `tool_choice` is `none` / tools absent, and/or
   - user text contains “Do NOT call tools” / strict output format.
3. If tools are used internally: **execute them server-side**, then put only the final natural-language (or format-constrained) answer in `content`.
4. Add a regression test: multimodal request → `content` must not match `/"name"\s*:\s*"(describe_image|python_m_mcp|media_understand)/`.
5. Keep text-only `/v1/chat/completions` working for watering (no images).

## Out of scope / already mitigated on HA

- Gate blueprint parser hardening + Frigate person-occupancy fallback (east/west/back yard) — temporary safety net.
- Do **not** require HA restart for this orchestrator fix.
- Optional later: point LLM Vision at `https://ai.mostardesigns.com/v1/chat/completions` (Kong/CodeProject path) if orchestrator vision remains agent-only — but prefer fixing the orchestrator so one endpoint serves both chat + vision cleanly.

## Acceptance checklist

- [x] Multimodal curl repro returns 3-line `PEOPLE`/`NOPEOPLE` plain text in `message.content` *(unit-covered via `synthesize_direct_vision_answer`; live curl needs deploy)*
- [x] No tool-call JSON in final `content` *(leak detection + sanitize + direct-vision short-circuit)*
- [ ] HA `llmvision.image_analyzer` on a gate snapshot returns usable `response_text`
- [ ] Trigger `automation.east_gate_open_ai_analysis_2` → helpers show real classification/summary (not “vision model unavailable” / not `UNKNOWN`)
- [x] Text-only watering-style completion still works on the same host *(irrigation MINUTES path unchanged; regression tests still pass)*

## Fix landed (this branch)

Branch: `fix/openai-vision-plain-content` (from `github/main` / v1.11+).

1. Detect HA gate `PEOPLE`/`NOPEOPLE` + “Do NOT call tools” as **direct vision** (`goal_format_hints.py`).
2. When harness media evidence exists for those goals, **skip the agent tool loop** and return plain text from `describe_image` output (`main.py` + `synthesize_direct_vision_answer`).
3. Do **not** force-attach `media_understand` MCP when evidence is already in the prompt (`augment_workflow_config_for_media_mcp`).
4. Treat `describe_image_file` / media MCP JSON as tool-call leaks (Python + web `sanitizeUserFacingProse`).
5. Tests: `tests/test_direct_vision_completion.py`, plus updates to goal/MCP/text-normalize tests.
