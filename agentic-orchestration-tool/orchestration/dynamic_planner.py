from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
from dataclasses import replace
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.config_loader import (
    TaskDefinition,
    WorkflowConfig,
    raw_mcp_spec_for_task,
    raw_skill_spec_for_task,
)
from orchestration.goal_format_hints import (
    goal_requests_irrigation_minutes_line,
    goal_requires_machine_readable_only,
    web_prose_deliverable_enabled,
    web_prose_planner_rules,
)
from orchestration.provider_goal_match import (
    maybe_remap_planner_provider_missing_from_catalog,
    suppress_general_providers_when_domains_align,
)
from orchestration.hardware_profile import filter_catalog_by_hardware
from orchestration.orchestrator_session import (
    OrchestratorSessionFile,
    load_session,
    save_session,
    stable_instance_key_for_session,
    trim_planner_history,
)
from orchestration.agent_providers_catalog import (
    catalog_for_planner_prompt,
    deepcopy_agent_provider,
    load_agent_providers_catalog_merged,
)
from agent_providers.ollama_provider import litellm_api_base_for_ollama


def _planner_llm_progress_log(*, resolved_model: str, messages: list[dict[str, str]]) -> None:
    """One stderr line before blocking on the planner LLM (Ollama can take tens of seconds to load)."""
    if os.getenv("AGENTIC_PLANNER_PROGRESS_LOG", "1").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    ):
        return
    n = len(messages)
    chars = sum(len(str(m.get("content", ""))) for m in messages)
    print(
        f"(dynamic) planner LLM: model={resolved_model} messages={n} prompt~chars={chars}",
        file=sys.stderr,
    )


def _planner_llm_done_log(*, resolved_model: str, elapsed_s: float, out_chars: int) -> None:
    """One stderr line after the planner returns (large prompts on Jetson can take many minutes)."""
    if os.getenv("AGENTIC_PLANNER_PROGRESS_LOG", "1").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    ):
        return
    print(
        f"(dynamic) planner LLM done: model={resolved_model} elapsed_s={elapsed_s:.2f} "
        f"response~chars={out_chars}",
        file=sys.stderr,
    )
from orchestration.mcp_providers_catalog import (
    filter_mcp_entries_by_api_credentials,
    load_mcp_providers_catalog_merged,
    mcp_catalog_for_planner_prompt,
    resolve_workflow_mcp_refs,
    suggest_mcp_ids_from_user_goal,
)
from orchestration.agent_skills_catalog import (
    filter_skill_entries_by_credentials,
    load_agent_skills_catalog_merged,
    skills_catalog_for_planner_prompt,
    resolve_workflow_skill_refs,
    suggest_skill_ids_from_user_goal,
)


def _dynamic_instance_key(user_prompt: str) -> str:
    digest = hashlib.sha256(user_prompt.encode("utf-8")).hexdigest()[:14]
    return f"dynamic-{digest}"


def orchestrator_vertical_context_section() -> str:
    """
    Optional domain / industry instructions merged into planner, iterative controller,
    learning evaluator, and faithfulness QA system prompts.

    Set either:
    - ``AGENTIC_ORCHESTRATOR_CONTEXT`` (inline text), or
    - ``AGENTIC_ORCHESTRATOR_CONTEXT_FILE`` (path to UTF-8 text/markdown).
    File wins when both are set and the file can be read.
    """
    file_path = (os.getenv("AGENTIC_ORCHESTRATOR_CONTEXT_FILE") or "").strip()
    if file_path:
        try:
            text = Path(file_path).expanduser().read_text(encoding="utf-8").strip()
            if text:
                return (
                    "\n\n## Operator-configured domain context\n"
                    f"(from AGENTIC_ORCHESTRATOR_CONTEXT_FILE)\n\n{text}\n"
                )
        except OSError:
            pass
    inline = (os.getenv("AGENTIC_ORCHESTRATOR_CONTEXT") or "").strip()
    if inline:
        return "\n\n## Operator-configured domain context\n" + inline + "\n"
    return ""


def _normalize_openai_api_base() -> str:
    raw = (
        os.getenv("OPENAI_BASE_URL", "").strip()
        or os.getenv("OPENAI_API_BASE", "").strip()
    )
    if not raw:
        return "https://api.openai.com/v1"
    u = raw.strip().rstrip("/")
    if not u.startswith("http://") and not u.startswith("https://"):
        u = f"http://{u}"
    if not u.endswith("/v1"):
        u = f"{u}/v1"
    return u


def _extract_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if fence:
        t = fence.group(1).strip()
    return json.loads(t)


def _planner_debug_enabled() -> bool:
    return os.getenv("AGENTIC_PLANNER_DEBUG", "").strip().lower() in ("1", "true", "yes", "on")


def _planner_debug_dump(
    phase: str,
    *,
    model: str,
    raw_content: str,
    plan: dict[str, Any] | None,
    exc: BaseException,
) -> None:
    """Emit planner LLM output when validation fails (set AGENTIC_PLANNER_DEBUG=1)."""
    if not _planner_debug_enabled():
        return
    try:
        lim = int(os.getenv("AGENTIC_PLANNER_DEBUG_CHARS", "6000"))
    except ValueError:
        lim = 6000
    lim = max(400, min(50000, lim))
    print(f"{phase} planner validation failed: {exc}", file=sys.stderr)
    print(f"{phase} planner LLM model string: {model!r}", file=sys.stderr)
    rc = raw_content if isinstance(raw_content, str) else ""
    print(f"{phase} planner raw content (trunc {lim} chars):\n{rc[:lim]!s}", file=sys.stderr)
    if isinstance(plan, dict):
        try:
            pj = json.dumps(plan, ensure_ascii=False, indent=2)
        except Exception:  # noqa: BLE001
            pj = repr(plan)
        print(f"{phase} planner parsed JSON (trunc {lim} chars):\n{pj[:lim]}", file=sys.stderr)


def _planner_chat_completion(
    *,
    messages: list[dict[str, str]],
    model: str,
    json_mode: bool | None = None,
) -> str:
    def _shrink_messages_for_tpm_limit(
        msgs: list[dict[str, str]],
        *,
        keep_last: int,
        per_message_chars: int,
    ) -> list[dict[str, str]]:
        if not msgs:
            return []
        keep_last = max(1, keep_last)
        per_message_chars = max(500, per_message_chars)
        # Preserve the first system prompt if present.
        head: list[dict[str, str]] = []
        tail = msgs
        if msgs and (msgs[0].get("role") == "system"):
            head = [dict(msgs[0])]
            tail = msgs[1:]
        tail = list(tail[-keep_last:])
        out: list[dict[str, str]] = head + tail
        for m in out:
            c = m.get("content")
            if isinstance(c, str) and len(c) > per_message_chars:
                m["content"] = c[: per_message_chars - 1] + "…"
        return out

    # Prefer a model-agnostic planner call through LiteLLM (Crews use it already).
    # This allows planner models like:
    # - openai/gpt-4o-mini
    # - anthropic/claude-3-5-sonnet-20241022
    # - huggingface/meta-llama/Llama-3.3-70B-Instruct
    # - ollama/llama3.2
    use_litellm = os.getenv("AGENTIC_PLANNER_USE_LITELLM", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )
    if use_litellm:
        try:
            import litellm  # type: ignore[import-not-found]
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(
                "Planner is configured to use LiteLLM but litellm is not importable. "
                "Install it (recommended): `pip install litellm` (or `pip install -r agentic-orchestration-tool/requirements.txt`), "
                "or set AGENTIC_PLANNER_USE_LITELLM=0 to use the legacy OpenAI-only planner call."
            ) from exc

        clean_model = model.strip()
        if "/" not in clean_model:
            clean_model = f"openai/{clean_model}"

        kwargs: dict[str, Any] = {
            "model": clean_model,
            "messages": messages,
            "temperature": 0.2,
        }
        if clean_model.lower().startswith("ollama/"):
            kwargs["api_base"] = litellm_api_base_for_ollama()
        if json_mode is None:
            json_mode = os.getenv("AGENTIC_PLANNER_JSON_MODE", "1").strip().lower() not in (
                "0",
                "false",
                "no",
                "off",
            )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        _timeout_raw = os.getenv("AGENTIC_PLANNER_TIMEOUT_SEC", "").strip()
        if _timeout_raw:
            try:
                kwargs["timeout"] = max(5.0, float(_timeout_raw))
            except ValueError:
                pass

        max_retries = 0
        try:
            max_retries = int(os.getenv("AGENTIC_PLANNER_429_RETRIES", "2"))
        except ValueError:
            max_retries = 2
        max_retries = max(0, min(8, max_retries))

        _planner_llm_progress_log(resolved_model=clean_model, messages=messages)
        _planner_t0 = time.perf_counter()

        attempt = 0
        while True:
            attempt += 1
            try:
                resp_raw = litellm.completion(**kwargs)
                # LiteLLM usually returns an OpenAI-shaped dict, but sometimes returns objects.
                if hasattr(resp_raw, "model_dump"):  # pydantic v2
                    resp = resp_raw.model_dump()  # type: ignore[no-any-return]
                elif hasattr(resp_raw, "dict"):  # pydantic v1
                    resp = resp_raw.dict()  # type: ignore[no-any-return]
                else:
                    resp = resp_raw
                if not isinstance(resp, dict):
                    raise RuntimeError(f"Planner LLM returned unexpected response type: {type(resp)!r}")

                choices = resp.get("choices") or []
                first = choices[0] if isinstance(choices, list) and choices else {}
                content: str | None = None
                if isinstance(first, dict):
                    msg = first.get("message")
                    if isinstance(msg, dict):
                        c = msg.get("content")
                        if isinstance(c, str) and c.strip():
                            content = c.strip()
                    if content is None:
                        t = first.get("text")
                        if isinstance(t, str) and t.strip():
                            content = t.strip()

                if not content:
                    # Include a tiny bit of structure for debugging without dumping secrets.
                    finish_reason = first.get("finish_reason") if isinstance(first, dict) else None
                    have = []
                    if isinstance(first, dict) and isinstance(first.get("message"), dict):
                        have = sorted([k for k in (first.get("message") or {}).keys()])  # type: ignore[union-attr]
                    raise RuntimeError(
                        f"Planner LLM returned empty content. finish_reason={finish_reason!r}, "
                        f"choice_keys={sorted(list(first.keys())) if isinstance(first, dict) else 'n/a'}, "
                        f"message_keys={have}"
                    )
                _planner_llm_done_log(
                    resolved_model=clean_model,
                    elapsed_s=time.perf_counter() - _planner_t0,
                    out_chars=len(content),
                )
                return content
            except Exception as exc:  # noqa: BLE001
                detail = str(exc)
                # Some backends don't support response_format; retry once without it.
                if json_mode and "response_format" in kwargs and (
                    "response_format" in detail.lower() or "unsupported" in detail.lower()
                ):
                    kwargs.pop("response_format", None)
                    json_mode = False
                    continue
                # Retry on rate-limit-ish errors.
                if attempt <= max_retries + 1 and ("429" in detail or "rate limit" in detail.lower()):
                    time.sleep(min(30.0, 2.0 * (2 ** (attempt - 1))))
                    continue
                raise RuntimeError(f"Planner LLM request failed: {detail}") from exc

    base = _normalize_openai_api_base()
    url = f"{base.rstrip('/')}/chat/completions"
    body: dict[str, Any] = {
        "model": model.removeprefix("openai/"),
        "messages": messages,
        "temperature": 0.2,
    }
    if json_mode is None:
        json_mode = os.getenv("AGENTIC_PLANNER_JSON_MODE", "1").strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    _planner_llm_progress_log(resolved_model=str(body["model"]), messages=messages)
    _planner_t0 = time.perf_counter()

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required for dynamic planning when AGENTIC_PLANNER_USE_LITELLM=0."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    max_retries = 0
    try:
        max_retries = int(os.getenv("AGENTIC_PLANNER_429_RETRIES", "2"))
    except ValueError:
        max_retries = 2
    max_retries = max(0, min(8, max_retries))

    _planner_http_timeout = 120.0
    _to_raw = os.getenv("AGENTIC_PLANNER_TIMEOUT_SEC", "").strip()
    if _to_raw:
        try:
            _planner_http_timeout = max(5.0, float(_to_raw))
        except ValueError:
            pass

    attempt = 0
    last_exc: Exception | None = None
    while True:
        attempt += 1
        try:
            with httpx.Client(timeout=_planner_http_timeout) as client:
                response = client.post(url, headers=headers, json=body)
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    status = response.status_code
                    detail = response.text[:2000] if response.text else ""
                    # If the request is too large for the org's TPM, waiting won't help.
                    if status == 429 and (
                        "Request too large" in detail
                        or "tokens per min" in detail
                        or "\"code\":\"rate_limit_exceeded\"" in detail
                    ):
                        try:
                            keep_last = int(os.getenv("AGENTIC_PLANNER_CONTEXT_TURNS", "6"))
                        except ValueError:
                            keep_last = 6
                        try:
                            per_msg = int(os.getenv("AGENTIC_PLANNER_MESSAGE_CHARS", "8000"))
                        except ValueError:
                            per_msg = 8000
                        shrunk = _shrink_messages_for_tpm_limit(
                            messages, keep_last=keep_last, per_message_chars=per_msg
                        )
                        # Only retry if we actually reduced something.
                        if shrunk != body.get("messages") and attempt <= max_retries + 1:
                            body["messages"] = shrunk
                            # Also reduce output to avoid inflating TPM usage.
                            body["temperature"] = 0.0
                            body.setdefault("max_tokens", 1200)
                            continue

                    # Normal retry-able 429: backoff and retry.
                    if status == 429 and attempt <= max_retries + 1:
                        sleep_s = min(30.0, 2.0 * (2 ** (attempt - 1)))
                        time.sleep(sleep_s)
                        continue

                    raise RuntimeError(
                        f"Planner LLM request failed ({status}): {detail[:500]}"
                    ) from exc
                data = response.json()
        except httpx.RequestError as exc:
            parsed = urlparse(base)
            host = parsed.netloc or base.strip() or "(invalid base URL)"
            msg = (
                f"Planner cannot reach the OpenAI-compatible API ({host!r}, request to {url!r}): {exc}. "
                "If you see 'getaddrinfo' or 'Name or service not known', DNS cannot resolve the host—"
                "check network/VPN, corporate firewall, proxies, and OPENAI_BASE_URL / OPENAI_API_BASE."
            )
            raise RuntimeError(msg) from exc
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            break
        else:
            choices = data.get("choices") or []
            if not choices:
                raise RuntimeError("Planner LLM returned no choices.")
            message = choices[0].get("message") or {}
            content = message.get("content")
            if not isinstance(content, str) or not content.strip():
                raise RuntimeError("Planner LLM returned empty content.")
            out = content.strip()
            _planner_llm_done_log(
                resolved_model=str(body["model"]),
                elapsed_s=time.perf_counter() - _planner_t0,
                out_chars=len(out),
            )
            return out

    if last_exc is not None:
        raise last_exc
    raise RuntimeError("Planner LLM request failed.")


def _single_agent_skip_planner_llm() -> bool:
    """When true, always call the planner LLM even if only one agent provider remains."""
    return os.getenv("AGENTIC_PLANNER_SINGLE_AGENT_LLM", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _single_agent_trivial_plan(user_prompt: str, agent_id: str) -> dict[str, Any]:
    """Deterministic 1-step plan when the filtered catalog has exactly one agent."""
    from orchestration.simple_chat import is_simple_chat_prompt

    if goal_requests_irrigation_minutes_line(user_prompt):
        description = (
            "{topic}\n\n"
            "Decide watering minutes for this zone from the provided facts only. "
            "Do not call tools, emit tool JSON, or invent MCP invocations. "
            "Write brief reasoning (≤120 words), then end with exactly one line: MINUTES: <0-25>."
        )
        expected_output = (
            "Brief reasoning ending with a final line exactly like MINUTES: 0 or MINUTES: 12 "
            "(integer 0-25). No tool-call JSON."
        )
    elif is_simple_chat_prompt(user_prompt):
        description = (
            "{topic}\n\n"
            "Reply in plain natural language only. Do not call tools, delegate tasks, "
            "or return JSON tool-call structures."
        )
        expected_output = "A short, direct natural-language answer."
    else:
        description = "{topic}\n\nAnswer the user's goal clearly, accurately, and concisely."
        if web_prose_deliverable_enabled():
            expected_output = (
                "A direct plain-language answer (one or two short paragraphs). "
                "No LaTeX, no $\\boxed{}$, and no commentary about instructions or format."
            )
        else:
            expected_output = "A clear, helpful response that satisfies the user's goal."
    return {
        "plan_summary": f"Single available agent `{agent_id}` answers the request in one step.",
        "mcp_provider_ids": [],
        "skill_ids": [],
        "steps": [
            {
                "agent_provider_id": agent_id,
                "description": description,
                "expected_output": expected_output,
            }
        ],
    }


def _planner_system_prompt(
    *,
    catalog_doc: str,
    max_steps: int,
    last_crew_excerpt: str | None = None,
    mcp_catalog_doc: str = "",
    skills_catalog_doc: str = "",
    learning_summary: str = "",
    kb_context: str = "",
) -> str:
    mcp_block = ""
    if mcp_catalog_doc.strip():
        mcp_block = f"""

Available **MCP providers** — pick ids **only** from this catalog (docs/API/tools the agents can call via CrewAI):
{mcp_catalog_doc}

- **Attach MCP only when relevant:** If the user's goal clearly matches an entry's scope (read each `id`, `description`, and `planner_hint`), include those ids in `mcp_provider_ids` (top-level default and/or per-step). If none match, use `[]` and omit per-step lists.
- **Avoid irrelevant MCPs:** Do not include MCP providers that are unrelated to the user's question just because they exist in the catalog.
- **Per-step MCP:** Prefer a **minimal** per-step `mcp_provider_ids` list for each step that needs tools; use the same top-level default only when every step needs the same set.
- **Default MCP:** Top-level `mcp_provider_ids` applies to steps that **omit** `mcp_provider_ids`.
- **No MCP for one step:** Set that step's `mcp_provider_ids` to `[]`.
"""
    skills_block = ""
    if skills_catalog_doc.strip():
        skills_block = f"""

Available **agent skills** — pick ids **only** from this catalog (procedural instructions injected into agent task text):
{skills_catalog_doc}

- **Attach skills only when relevant:** If the user's goal clearly matches an entry's scope (read each `id`, `description`, and `planner_hint`), include those ids in `skill_ids` (top-level default and/or per-step). If none match, use `[]` and omit per-step lists.
- **Per-step skills:** Prefer a **minimal** per-step `skill_ids` list for steps that need a specific playbook; use the top-level default only when every step needs the same skills.
- **Default skills:** Top-level `skill_ids` applies to steps that **omit** `skill_ids`.
- **No skills for one step:** Set that step's `skill_ids` to `[]`.
"""
    agi_traits = ""
    if os.getenv("AGENTIC_AGI_TRAITS", "1").strip().lower() not in ("0", "false", "no", "off"):
        agi_traits = """

Core operating traits (AGI-inspired, practical constraints apply):
- **Cross-domain transfer:** Reuse methods across domains (e.g., take debugging habits into doc research; take writing structure into planning).
- **Autonomous learning:** Actively identify unknowns, then use available tools (MCP) or decomposition to fill gaps before proceeding.
- **Common-sense reasoning:** Sanity-check outputs for obvious inconsistencies, missing steps, and real-world constraints.
- **Zero-shot problem solving:** When facing novelty, improvise a minimal viable approach from first principles, then validate/iterate.
"""

    system = f"""You are an expert orchestration planner for a multi-agent system.

Available **agent providers** (pick ONLY `agent_provider_id` values from this catalog; every id is valid):
{catalog_doc}
{mcp_block}
{skills_block}
{agi_traits}
Rules:
- Read the user's goal and produce a clear step-by-step plan.
- Common-sense check: when the user expects numeric calculations, ensure any equations are correctly labeled (LHS is the computed metric, not a raw expression), and avoid mismatched variable names.
- **Agent provider choice:** For each step, pick the **single best** `agent_provider_id`. Judge from the user's task and each entry's `planner_hint`, `role`, `goal`, `model`, and `type` (`ollama` = local host, `openai` = OpenAI-compatible cloud API, `anthropic` = Anthropic Claude API, `huggingface` = Hugging Face Hub inference). No default bias toward local vs cloud.
- **Domain specialists:** When the goal clearly concerns a topic covered by a narrower catalog entry (rich `planner_hint` / domain role), prefer that specialist over entries marked **general-purpose** / broad research assistants. The runtime may omit general-purpose providers from this list when lexical alignment with specialists is strong—so your plan should not assume they remain available in borderline cases.
- **Structured-only / API-style goals:** When the user demands **only** machine-readable output (e.g. exactly one JSON object, no markdown, no prose), treat all supplied tables/forecast JSON/soil valves as **self-contained**. Do **not** attach web-search or general research MCPs unless the user explicitly asks to fetch new external facts. Pick agent providers suited to deterministic reasoning over the pasted data while honoring the strict output schema.
- **Attached files:** If the user message includes `## Attached files`, use the listed categories (tabular, code, image, document, media, audio, …), MIME types, and absolute paths to route work—e.g. data-heavy files to analysis/integration agents, code to engineering agents, images (including JPEG frames extracted from videos) to multimodal agents when available; read any **Automated vision synopsis** text as a first-pass scene summary. For deeper media work, attach MCP `media_understand` (or audio/video aliases) and call its tools with the listed absolute paths.
- **Grounding / anti-fabrication:** Instruct agents never to present **illustrative or hypothetical** vendors, trials, or devices as if they were verified real-world facts. If the user asks for **archetypes**, **plausible positioning stories**, or a **council briefing** without naming real products, use neutral labels (e.g. Story A / Story B) and mark hypotheticals explicitly. **Do not invent** FDA submission identifiers, 510(k) numbers, PMA orders, NCT IDs, journal citations, effect sizes, or sample sizes unless they appear in the user prompt, attached files, or outputs from **actual** retrieval tools/MCPs the step will use. When the user asks *where* evidence would strengthen or weaken a story, answer with **types** of public sources (e.g. FDA databases, trial registries) and what to look for—plus what legal/regulatory counsel should verify—not fabricated specifics.
- **Council / executive briefings:** When the user is an **innovation council, C-suite, or procurement** audience, lead with **strategic intent**—why an organization would choose path A vs B, trade-offs (e.g. clinical-signal depth vs scale/cost/operational load), and **where risk actually sits**—not a SKU-style hardware list as the main narrative. Prefer compact **archetypes** (e.g. high-fidelity / physiologic-signal programs vs scalable engagement-first programs) unless the user or tools supply named vendors.
- **No fake vendor brands:** If the user did **not** name real companies, instruct agents to use **only neutral archetype labels** (e.g. "Story A — …", "Story B — …"). **Do not invent** plausible-sounding vendor names (e.g. "Comprehensive Health Solutions"); those read as real entities and undermine trust.
- **Medtech / regulated software wording:** Ban vague **"FDA approved"** as a catch-all. Use precise concepts where relevant: **510(k) cleared**, **PMA / class III**, **De Novo**, **registered / listed**, or **non-device wellness** positioning; use **SaMD** when software makes regulated clinical claims; use **CDS** framing only when appropriate and counsel must verify marketing vs cleared intent. When predictive analytics are in scope, flag **locked vs adaptive (learning)** algorithms if marketing implies learning in production. Do **not** invent billing codes, society guideline dates, or study statistics without retrieval-backed sources.
- **Mixing:** You may combine different `type` values in one plan when different steps call for different capabilities.
- **Local-only (explicit user request):** If the user asks for private, offline, local, or Ollama-only execution, use only `type: ollama` agent providers.
- Each step must assign exactly one `agent_provider_id` from the catalog (legacy key `provider_id` is also accepted if you output it by mistake).
- Steps run in order; later steps may build on earlier work (sequential crew).
- Every step "description" MUST include the literal substring "{{topic}}" at least once; runtime replaces it with the user's goal.
- Keep the plan concise: between 1 and {max_steps} steps.
- "expected_output" should be specific enough to judge success.
- In `plan_summary`, briefly justify **why** each `agent_provider_id` fits that step, and **list which MCP catalog id(s)** and **skill id(s)** each step uses (or state explicitly when none apply).
- If session or previous output context is present, treat new instructions as continuations when appropriate.

**Planner vs crew output:** Your reply is the **plan**, not the user's deliverable. If the user goal asks for a tiny JSON object (e.g. `{{"minutes": ...}}`) or strict machine-readable fields, that output must be produced **by agents in `steps`**, not by you here. Never reply with only those keys—always emit `plan_summary` and a non-empty `steps` array using catalog `agent_provider_id` values.

Respond with a single JSON object only (no markdown outside JSON if possible) with this shape:
{{
  "plan_summary": "short rationale for steps, agent providers, MCP choices, and skill choices",
  "mcp_provider_ids": ["optional default MCP ids for steps that omit their own list"],
  "skill_ids": ["optional default skill ids for steps that omit their own list"],
  "steps": [
    {{
      "agent_provider_id": "<id from catalog>",
      "mcp_provider_ids": ["optional; per-step MCP subset — omit key to use top-level default"],
      "skill_ids": ["optional; per-step skill subset — omit key to use top-level default"],
      "description": "Instructions for the agent. Must mention {{topic}}.",
      "expected_output": "What this step should produce",
      "rationale": "optional one-line: why this step now (helps users/logs when iterating)"
    }}
  ]
}}
If no MCP provider is relevant, set `"mcp_provider_ids": []` and omit per-step `mcp_provider_ids`.
If no agent skill is relevant, set `"skill_ids": []` and omit per-step `skill_ids`.
"""
    if last_crew_excerpt and str(last_crew_excerpt).strip():
        cap = int(os.getenv("AGENTIC_ORCHESTRATOR_EXCERPT_CHARS", "15000"))
        excerpt = str(last_crew_excerpt).strip()[:cap]
        system += (
            f"\n\n## Previous crew output (same session; excerpt)\n{excerpt}\n"
            "Use this when the user refers to prior results or asks for follow-up work.\n"
        )
    if learning_summary and learning_summary.strip():
        system += str(learning_summary)
    if kb_context and kb_context.strip():
        system += str(kb_context)
    system += orchestrator_vertical_context_section()
    if web_prose_deliverable_enabled():
        system += web_prose_planner_rules()
    system += _web_user_display_name_section()
    return system


def _web_user_display_name_section() -> str:
    name = os.getenv("AGENTIC_WEB_USER_DISPLAY_NAME", "").strip()
    if not name:
        return ""
    return (
        f"\n- **Web user:** The signed-in user's display name is {name!r}. "
        "Use it naturally when appropriate (greetings, addressing the user).\n"
    )


def _planner_user_turn(user_prompt: str) -> str:
    """Separate user-facing answer schemas from the planner's required plan JSON."""
    u = user_prompt.strip()
    return (
        "Below is the **USER GOAL**. Your job is to output an **orchestration plan JSON** "
        "(plan_summary + non-empty steps), not to answer the goal in the user's requested wire format.\n"
        "- If the goal demands a small JSON object (e.g. `{\"minutes\": ...}`), ignore that shape for "
        "**your** reply; agents in `steps` will satisfy it.\n"
        "- Your reply must include `steps` with `agent_provider_id`, `description` (mention {{topic}}), "
        "and `expected_output` for each step.\n\n"
        "--- USER GOAL START ---\n"
        f"{u}\n"
        "--- USER GOAL END ---"
    )


def _compose_planner_messages(
    *,
    system_text: str,
    planner_history: list[dict[str, str]],
    user_prompt: str,
) -> list[dict[str, str]]:
    msgs: list[dict[str, str]] = [{"role": "system", "content": system_text}]
    for turn in planner_history:
        role = str(turn.get("role", "")).strip()
        content = str(turn.get("content", ""))
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": _planner_user_turn(user_prompt)})
    return msgs


def _missing_steps_hint(plan: Any) -> str:
    if not isinstance(plan, dict):
        return ""
    keys = frozenset(plan.keys())
    suspicious = keys & {
        "minutes",
        "seconds",
        "duration",
        "irrigation",
        "water",
        "zones",
        "schedule",
        "valve",
        "runtime",
    }
    if suspicious and "steps" not in keys:
        return (
            " The model returned keys "
            f"{sorted(keys)!r} instead of a plan with `steps`—it likely answered the user task directly. "
            "If OPENAI_BASE_URL points at Ollama/your chat backend, set AGENTIC_PLANNER_MODEL to a model "
            "you actually pulled (`ollama list`), sized for your device — e.g. `ollama/qwen2.5:7b-instruct`, "
            "`ollama/qwen2.5:3b-instruct`, or `ollama/llama3.2:3b`. "
            "Or use a dedicated planner endpoint so the planner follows system instructions."
        )
    return ""


def _workflow_snapshot_for_planner_history(cfg: WorkflowConfig) -> str:
    """Rich context appended to the planner assistant turn: agent providers and tasks."""
    cap_desc = max(80, min(4000, int(os.getenv("AGENTIC_ORCHESTRATOR_TASK_DESC_CHARS", "500"))))
    cap_exp = max(60, min(2000, int(os.getenv("AGENTIC_ORCHESTRATOR_TASK_OUTPUT_CHARS", "320"))))

    def clip(text: str, n: int) -> str:
        s = text.strip().replace("\n", " ")
        if len(s) <= n:
            return s
        return s[: n - 1] + "…"

    prov_lines: list[str] = []
    for p in cfg.agent_providers:
        if not isinstance(p, dict):
            continue
        pid = str(p.get("id", "")).strip()
        if not pid:
            continue
        typ = str(p.get("type", "")).strip()
        model = str(p.get("model", "")).strip()
        role = str(p.get("role", "")).strip()
        meta = []
        if typ:
            meta.append(f"type={typ!r}")
        if model:
            meta.append(f"model={model!r}")
        if role:
            meta.append(f"role={role!r}")
        suffix = (" " + " ".join(meta)) if meta else ""
        prov_lines.append(f"- `{pid}`{suffix}")

    task_lines: list[str] = []
    for tid in cfg.task_sequence:
        match = next((t for t in cfg.tasks if t.id == tid), None)
        if match is None:
            continue
        mcp_note = ""
        if match.mcp_providers is not None:
            if not match.mcp_providers:
                mcp_note = "\n  - mcp_providers: (none)"
            else:
                parts = [str(x) for x in match.mcp_providers]
                mcp_note = f"\n  - mcp_providers: {', '.join(parts)}"
        else:
            mcp_note = "\n  - mcp_providers: (workflow default)"
        skill_note = ""
        if match.skills is not None:
            if not match.skills:
                skill_note = "\n  - skills: (none)"
            else:
                skill_note = f"\n  - skills: {', '.join(match.skills)}"
        else:
            skill_note = "\n  - skills: (workflow default)"
        task_lines.append(
            f"- `{match.id}` → agent_provider `{match.agent_provider_id}`{mcp_note}{skill_note}\n"
            f"  - description: {clip(match.description, cap_desc)}\n"
            f"  - expected_output: {clip(match.expected_output, cap_exp)}"
        )

    if not prov_lines and not task_lines and not cfg.mcp_providers and not cfg.skills:
        return ""

    mcp_line = ""
    if cfg.mcp_providers:
        mcp_line = (
            "\n\n### MCP providers (workflow)\n"
            + "\n".join(f"- `{str(x)}`" if not isinstance(x, dict) else f"- (inline) `{x!r}`" for x in cfg.mcp_providers)
        )
    skills_line = ""
    if cfg.skills:
        skills_line = "\n\n### Agent skills (workflow)\n" + "\n".join(
            f"- `{str(x)}`" for x in cfg.skills
        )

    return (
        "\n\n---\n"
        "## Workflow built from this plan (agent providers and tasks; use for continuity)\n\n"
        "### Agent providers\n"
        + ("\n".join(prov_lines) if prov_lines else "(none)")
        + "\n\n### Tasks (execution order)\n"
        + ("\n".join(task_lines) if task_lines else "(none)")
        + mcp_line
        + skills_line
    )


def plan_raw_from_llm(
    *,
    user_prompt: str,
    catalog_entries: list[dict[str, Any]],
    max_steps: int,
    model: str,
) -> dict[str, Any]:
    doc = catalog_for_planner_prompt(catalog_entries)
    system_text = _planner_system_prompt(
        catalog_doc=doc,
        max_steps=max_steps,
        last_crew_excerpt=None,
    )
    messages = _compose_planner_messages(
        system_text=system_text,
        planner_history=[],
        user_prompt=user_prompt,
    )
    content = _planner_chat_completion(messages=messages, model=model)
    return _extract_json_object(content)


def workflow_config_from_plan(
    *,
    user_prompt: str,
    plan: dict[str, Any],
    catalog_entries: list[dict[str, Any]],
    instance_key: str,
    max_steps: int,
    mcp_catalog_entries: list[dict[str, Any]] | None = None,
    skill_catalog_entries: list[dict[str, Any]] | None = None,
    quiet: bool = False,
) -> WorkflowConfig:
    def _user_wants_local_only(text: str) -> bool:
        t = text.strip().lower()
        return any(
            k in t
            for k in (
                "offline",
                "local-only",
                "local only",
                "locally",
                "on my machine",
                "no cloud",
                "private",
                "airgapped",
                "air-gapped",
                "ollama-only",
                "ollama only",
                "use ollama",
            )
        )

    catalog_by_id = {str(p["id"]).strip(): p for p in catalog_entries}
    steps_raw = plan.get("steps")
    if not isinstance(steps_raw, list) or not steps_raw:
        raise ValueError(
            "Planner JSON must contain a non-empty 'steps' array." + _missing_steps_hint(plan)
        )
    cap = max(1, min(32, max_steps))
    if len(steps_raw) > cap:
        steps_raw = steps_raw[:cap]

    task_definitions: list[TaskDefinition] = []
    used_provider_ids: list[str] = []
    seen_providers: set[str] = set()
    _mcp_step_sentinel: Any = object()
    _skill_step_sentinel: Any = object()

    mcp_raw = plan.get("mcp_provider_ids", [])
    if mcp_raw is None:
        mcp_raw = []
    if not isinstance(mcp_raw, list):
        raise ValueError("Planner JSON 'mcp_provider_ids' must be an array when present")
    mcp_plan_ids: list[str] = []
    for x in mcp_raw:
        s = str(x).strip()
        if s:
            mcp_plan_ids.append(s)

    skill_raw = plan.get("skill_ids", [])
    if skill_raw is None:
        skill_raw = []
    if not isinstance(skill_raw, list):
        raise ValueError("Planner JSON 'skill_ids' must be an array when present")
    skill_plan_ids: list[str] = []
    for x in skill_raw:
        s = str(x).strip()
        if s:
            skill_plan_ids.append(s)

    for i, step in enumerate(steps_raw):
        if not isinstance(step, dict):
            raise ValueError(f"steps[{i}] must be an object")
        pid = str(step.get("agent_provider_id") or step.get("provider_id", "")).strip()
        desc = str(step.get("description", "")).strip()
        expected = str(step.get("expected_output", "")).strip()
        if not pid:
            raise ValueError(f"Step {i} is missing agent_provider_id")
        mapped = maybe_remap_planner_provider_missing_from_catalog(
            pid,
            user_prompt=user_prompt,
            catalog_entries=list(catalog_by_id.values()),
            quiet=quiet,
        )
        if mapped:
            pid = mapped
        if pid not in catalog_by_id:
            known = ", ".join(sorted(catalog_by_id))
            raise ValueError(
                f"Unknown agent_provider_id {pid!r} in step {i}. Known: {known}",
            )
        if not desc:
            raise ValueError(f"Step {i} is missing description")
        if not expected:
            raise ValueError(f"Step {i} is missing expected_output")
        if "{topic}" not in desc:
            desc = f"{{topic}}\n\n{desc}"

        sm_raw = step.get("mcp_provider_ids", _mcp_step_sentinel)
        per_step_mcp: list[str] | None
        if sm_raw is _mcp_step_sentinel:
            per_step_mcp = None
        else:
            if not isinstance(sm_raw, list):
                raise ValueError(f"steps[{i}].mcp_provider_ids must be an array when present")
            per_step_mcp = [str(x).strip() for x in sm_raw if str(x).strip()]

        ss_raw = step.get("skill_ids", _skill_step_sentinel)
        per_step_skills: list[str] | None
        if ss_raw is _skill_step_sentinel:
            per_step_skills = None
        else:
            if not isinstance(ss_raw, list):
                raise ValueError(f"steps[{i}].skill_ids must be an array when present")
            per_step_skills = [str(x).strip() for x in ss_raw if str(x).strip()]

        # NOTE: We intentionally do not "prefer" a backend here.
        # The planner should choose the most relevant agent provider (including Ollama),
        # based on each entry's planner_hint/role/goal and the user's description.

        tid = f"step_{i + 1}"
        task_definitions.append(
            TaskDefinition(
                id=tid,
                agent_provider_id=pid,
                description=desc,
                expected_output=expected,
                mcp_providers=per_step_mcp,
                skills=per_step_skills,
            )
        )
        if pid not in seen_providers:
            seen_providers.add(pid)
            used_provider_ids.append(pid)

    provider_payloads = [deepcopy_agent_provider(catalog_by_id[pid]) for pid in used_provider_ids]

    if mcp_catalog_entries is not None:
        known_mcp = {
            str(p.get("id", "")).strip()
            for p in mcp_catalog_entries
            if str(p.get("id", "")).strip()
        }
        # Planner history may reference MCP ids that were removed from the catalog.
        # Default to pruning unknown ids (warn) instead of failing the entire run.
        strict = os.getenv("AGENTIC_STRICT_MCP_IDS", "").strip().lower() in (
            "1",
            "true",
            "yes",
            "on",
        )

        def _filter_known(xs: list[str]) -> tuple[list[str], list[str]]:
            kept: list[str] = []
            dropped: list[str] = []
            for x in xs:
                if x in known_mcp:
                    kept.append(x)
                else:
                    dropped.append(x)
            return kept, dropped

        mcp_plan_ids, dropped_default = _filter_known(mcp_plan_ids)
        if dropped_default and not quiet:
            msg = (
                f"(dynamic) warning: dropping unknown mcp_provider_id(s) from plan default: "
                f"{dropped_default!r}. Known: {', '.join(sorted(known_mcp))}"
            )
            if strict:
                raise ValueError(msg)
            print(msg, file=sys.stderr)

        new_task_defs: list[TaskDefinition] = []
        for t in task_definitions:
            if t.mcp_providers is None:
                new_task_defs.append(t)
                continue
            kept, dropped = _filter_known(list(t.mcp_providers))
            if dropped and not quiet:
                msg = (
                    f"(dynamic) warning: dropping unknown mcp_provider_id(s) from {t.id}: "
                    f"{dropped!r}. Known: {', '.join(sorted(known_mcp))}"
                )
                if strict:
                    raise ValueError(msg)
                print(msg, file=sys.stderr)
            new_task_defs.append(replace(t, mcp_providers=kept))
        task_definitions = new_task_defs

    if skill_catalog_entries is not None:
        known_skill = {
            str(p.get("id", "")).strip()
            for p in skill_catalog_entries
            if str(p.get("id", "")).strip()
        }
        strict_skill = os.getenv("AGENTIC_STRICT_SKILL_IDS", "").strip().lower() in (
            "1",
            "true",
            "yes",
            "on",
        )

        def _filter_known_skills(xs: list[str]) -> tuple[list[str], list[str]]:
            kept: list[str] = []
            dropped: list[str] = []
            for x in xs:
                if x in known_skill:
                    kept.append(x)
                else:
                    dropped.append(x)
            return kept, dropped

        skill_plan_ids, dropped_skill_default = _filter_known_skills(skill_plan_ids)
        if dropped_skill_default and not quiet:
            msg = (
                f"(dynamic) warning: dropping unknown skill_id(s) from plan default: "
                f"{dropped_skill_default!r}. Known: {', '.join(sorted(known_skill))}"
            )
            if strict_skill:
                raise ValueError(msg)
            print(msg, file=sys.stderr)

        new_task_defs_skill: list[TaskDefinition] = []
        for t in task_definitions:
            if t.skills is None:
                new_task_defs_skill.append(t)
                continue
            kept, dropped = _filter_known_skills(list(t.skills))
            if dropped and not quiet:
                msg = (
                    f"(dynamic) warning: dropping unknown skill_id(s) from {t.id}: "
                    f"{dropped!r}. Known: {', '.join(sorted(known_skill))}"
                )
                if strict_skill:
                    raise ValueError(msg)
                print(msg, file=sys.stderr)
            new_task_defs_skill.append(replace(t, skills=kept))
        task_definitions = new_task_defs_skill

    return WorkflowConfig(
        name="dynamic-plan",
        process="sequential",
        topic=user_prompt.strip(),
        instance_key=instance_key,
        agent_providers=provider_payloads,
        mcp_providers=mcp_plan_ids,
        skills=skill_plan_ids,
        tasks=task_definitions,
        task_sequence=[t.id for t in task_definitions],
    )


def _dynamic_plan_resolves_no_mcp(
    cfg: WorkflowConfig,
    mcp_catalog: list[dict[str, Any]],
) -> bool:
    if not mcp_catalog:
        return False
    for t in cfg.tasks:
        raw = raw_mcp_spec_for_task(t, cfg)
        if resolve_workflow_mcp_refs(raw, mcp_catalog):
            return False
    return True


def _maybe_augment_mcp_from_user_goal(
    cfg: WorkflowConfig,
    *,
    user_prompt: str,
    mcp_catalog: list[dict[str, Any]],
    quiet: bool,
) -> WorkflowConfig:
    if not mcp_catalog:
        return cfg
    if goal_requires_machine_readable_only(user_prompt):
        return cfg
    if os.getenv("AGENTIC_DISABLE_MCP_GOAL_MATCH", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return cfg
    if not _dynamic_plan_resolves_no_mcp(cfg, mcp_catalog):
        return cfg
    suggested = suggest_mcp_ids_from_user_goal(user_prompt, mcp_catalog)
    if not suggested:
        return cfg

    merged: list[Any] = []
    seen_ids: set[str] = set()
    for x in cfg.mcp_providers:
        if isinstance(x, str) and (sx := x.strip()):
            if sx not in seen_ids:
                seen_ids.add(sx)
                merged.append(sx)
        else:
            merged.append(x)
    for sid in suggested:
        if sid not in seen_ids:
            seen_ids.add(sid)
            merged.append(sid)

    if not quiet:
        print(
            f"(dynamic) mcp auto-match: default mcp_provider_ids {merged!r} "
            f"(planner resolved no MCP; user goal matched {suggested!r})",
            file=sys.stderr,
        )
    return replace(cfg, mcp_providers=merged)


def _prune_irrelevant_mcp_from_user_goal(
    cfg: WorkflowConfig,
    *,
    user_prompt: str,
    mcp_catalog: list[dict[str, Any]],
    quiet: bool,
) -> WorkflowConfig:
    """
    Guardrail: if the planner selected MCP provider ids that don't match the user goal,
    drop them instead of forcing irrelevant tool usage.
    """
    if not mcp_catalog:
        return cfg
    if not cfg.mcp_providers:
        return cfg
    if goal_requests_irrigation_minutes_line(user_prompt):
        if not quiet:
            print(
                f"(dynamic) mcp relevance: clearing mcp_provider_ids {cfg.mcp_providers!r} "
                "(HA MINUTES: contract — no tool loop on client)",
                file=sys.stderr,
            )
        return replace(cfg, mcp_providers=[], tasks=_tasks_without_mcp(cfg.tasks))

    suggested = set(suggest_mcp_ids_from_user_goal(user_prompt, mcp_catalog))
    if not suggested:
        # No MCP appears relevant by heuristic; drop planner-selected defaults.
        if not quiet:
            print(
                f"(dynamic) mcp relevance: dropping default mcp_provider_ids {cfg.mcp_providers!r} "
                f"(no MCP keywords matched goal)",
                file=sys.stderr,
            )
        return replace(cfg, mcp_providers=[])

    kept: list[Any] = []
    dropped: list[Any] = []
    for x in cfg.mcp_providers:
        if isinstance(x, str) and x.strip():
            if x.strip() in suggested:
                kept.append(x.strip())
            else:
                dropped.append(x.strip())
        else:
            # Inline MCP configs are assumed intentional; keep them.
            kept.append(x)

    if dropped and not quiet:
        print(
            f"(dynamic) mcp relevance: dropped {dropped!r}; kept {kept!r}",
            file=sys.stderr,
        )
    if not dropped:
        return cfg
    return replace(cfg, mcp_providers=kept)


def _tasks_without_mcp(tasks: list[Any]) -> list[Any]:
    out: list[Any] = []
    for t in tasks:
        if getattr(t, "mcp_providers", None):
            out.append(replace(t, mcp_providers=[]))
        else:
            out.append(t)
    return out


def _prune_irrelevant_skills_from_user_goal(
    cfg: WorkflowConfig,
    *,
    user_prompt: str,
    skill_catalog: list[dict[str, Any]],
    quiet: bool,
) -> WorkflowConfig:
    """
    Guardrail: if the planner selected skill ids that don't match the user goal,
    drop them instead of forcing irrelevant procedural instructions.
    Applies to workflow-default ``skills`` and per-task explicit ``skills`` lists.
    """
    if not skill_catalog:
        return cfg
    suggested = set(suggest_skill_ids_from_user_goal(user_prompt, skill_catalog))
    if not cfg.skills and not any(t.skills is not None for t in cfg.tasks):
        return cfg

    workflow_skills = list(cfg.skills)
    if workflow_skills:
        if not suggested:
            if not quiet:
                print(
                    f"(dynamic) skill relevance: dropping default skill_ids {workflow_skills!r} "
                    f"(no skill keywords matched goal)",
                    file=sys.stderr,
                )
            workflow_skills = []
        else:
            kept_wf: list[str] = []
            dropped_wf: list[str] = []
            for x in workflow_skills:
                sx = str(x).strip()
                if not sx:
                    continue
                if sx in suggested:
                    kept_wf.append(sx)
                else:
                    dropped_wf.append(sx)
            if dropped_wf and not quiet:
                print(
                    f"(dynamic) skill relevance: dropped default {dropped_wf!r}; kept {kept_wf!r}",
                    file=sys.stderr,
                )
            workflow_skills = kept_wf

    new_tasks: list[TaskDefinition] = []
    for tdef in cfg.tasks:
        if tdef.skills is None:
            new_tasks.append(tdef)
            continue
        if not suggested:
            if tdef.skills and not quiet:
                print(
                    f"(dynamic) skill relevance: dropping task {tdef.id!r} skill_ids {tdef.skills!r} "
                    f"(no skill keywords matched goal)",
                    file=sys.stderr,
                )
            new_tasks.append(replace(tdef, skills=[] if tdef.skills else tdef.skills))
            continue
        kept_task: list[str] = []
        dropped_task: list[str] = []
        for x in tdef.skills:
            sx = str(x).strip()
            if not sx:
                continue
            if sx in suggested:
                kept_task.append(sx)
            else:
                dropped_task.append(sx)
        if dropped_task and not quiet:
            print(
                f"(dynamic) skill relevance: task {tdef.id!r} dropped {dropped_task!r}; kept {kept_task!r}",
                file=sys.stderr,
            )
        new_tasks.append(replace(tdef, skills=kept_task))

    return replace(cfg, skills=workflow_skills, tasks=new_tasks)


def _dynamic_plan_resolves_no_skills(
    cfg: WorkflowConfig,
    skill_catalog: list[dict[str, Any]],
) -> bool:
    if not skill_catalog:
        return False
    for t in cfg.tasks:
        raw = raw_skill_spec_for_task(t, cfg)
        if resolve_workflow_skill_refs(raw, skill_catalog):
            return False
    return True


def _maybe_augment_skills_from_user_goal(
    cfg: WorkflowConfig,
    *,
    user_prompt: str,
    skill_catalog: list[dict[str, Any]],
    quiet: bool,
) -> WorkflowConfig:
    if not skill_catalog:
        return cfg
    if goal_requires_machine_readable_only(user_prompt):
        return cfg
    if os.getenv("AGENTIC_DISABLE_SKILL_GOAL_MATCH", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return cfg
    if not _dynamic_plan_resolves_no_skills(cfg, skill_catalog):
        return cfg
    suggested = suggest_skill_ids_from_user_goal(user_prompt, skill_catalog)
    if not suggested:
        return cfg

    merged: list[str] = []
    seen_ids: set[str] = set()
    for x in cfg.skills:
        sx = str(x).strip()
        if sx and sx not in seen_ids:
            seen_ids.add(sx)
            merged.append(sx)
    for sid in suggested:
        if sid not in seen_ids:
            seen_ids.add(sid)
            merged.append(sid)

    if not quiet:
        print(
            f"(dynamic) skill auto-match: default skill_ids {merged!r} "
            f"(planner resolved no skills; user goal matched {suggested!r})",
            file=sys.stderr,
        )
    return replace(cfg, skills=merged)


def build_dynamic_workflow_config(
    *,
    user_prompt: str,
    catalog_path: Path,
    allowed_agent_provider_ids: list[str] | None = None,
    mcp_catalog_path: Path | None = None,
    agent_skills_catalog_path: Path | None = None,
    instance_key: str | None = None,
    max_steps: int | None = None,
    planner_model: str | None = None,
    session_path: Path | None = None,
    tool_root: Path | None = None,
    quiet: bool = False,
) -> tuple[WorkflowConfig, dict[str, Any]]:
    entries = load_agent_providers_catalog_merged(catalog_path)
    entries, _skipped_cred = filter_entries_by_api_credentials(
        entries,
        verbose=not quiet,
        log_prefix="(dynamic) catalog",
    )
    if not entries:
        raise RuntimeError(
            "No agent providers left after API credential filtering. "
            "Set OPENAI_API_KEY / ANTHROPIC_API_KEY / HF_TOKEN (or OpenAI base URL) for cloud entries, "
            "or keep Ollama agent providers in the catalog for local-only runs."
        )
    entries, excluded_hw, vram_g, available_arch = filter_catalog_by_hardware(entries)
    if not entries:
        raise RuntimeError(
            "No agent providers left after hardware filtering (architecture/VRAM). "
            "Set provider `hardware.architecture` to match your machine (cpu/gpu/tpu), "
            "use a smaller Ollama model in catalog YAML (lower min_vram_gb), set "
            "AGENTIC_ASSUME_VRAM_GB to your real GPU size, set AGENTIC_VRAM_HEURISTICS=0, "
            "or disable filtering with AGENTIC_DISABLE_HARDWARE_FILTER=1."
        )
    if excluded_hw and os.getenv("AGENTIC_HARDWARE_FILTER_QUIET", "").strip().lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        cap = 24
        show = excluded_hw[:cap]
        more = len(excluded_hw) - cap
        suffix = f" (+{more} more)" if more > 0 else ""
        vram_txt = f"{vram_g:.1f} GiB" if isinstance(vram_g, (int, float)) else "unknown"
        print(
            f"(dynamic) hardware: available={sorted(available_arch)!r}; NVIDIA VRAM ~{vram_txt}; excluded "
            f"{len(excluded_hw)} provider(s) (architecture/min_vram_gb/heuristic): "
            f"{', '.join(show)}{suffix}",
            file=sys.stderr,
        )
    allowed_ids = [str(x).strip() for x in (allowed_agent_provider_ids or []) if str(x).strip()]
    if allowed_ids:
        allowed_set = set(allowed_ids)
        entries = [e for e in entries if str(e.get("id", "")).strip() in allowed_set]
        if not entries:
            raise RuntimeError(
                "No agent providers left after applying explicit agent selection. "
                "The selected IDs are either unknown or were removed by credential/hardware filtering."
            )
        if not quiet:
            print(
                f"(dynamic) agent selection: restricting planner catalog to {sorted(allowed_set)!r}",
                file=sys.stderr,
            )
    else:
        entries = suppress_general_providers_when_domains_align(
            entries,
            user_prompt,
            quiet=quiet,
        )

    limit = max_steps
    if limit is None:
        limit = int(os.getenv("AGENTIC_PLANNER_MAX_STEPS", "8"))
    limit = max(1, min(32, limit))

    model = (planner_model or "").strip() or os.getenv(
        "AGENTIC_PLANNER_MODEL", "gpt-4o-mini"
    ).strip()

    sess: OrchestratorSessionFile | None = None
    history: list[dict[str, str]] = []
    last_excerpt: str | None = None
    if session_path is not None:
        sess = load_session(session_path)
        history = trim_planner_history(sess.planner_history)
        last_excerpt = sess.last_crew_output_excerpt

    if instance_key:
        key = instance_key
    elif session_path is not None:
        assert sess is not None
        if sess.instance_key:
            key = sess.instance_key
        else:
            key = stable_instance_key_for_session(session_path.stem)
    else:
        key = _dynamic_instance_key(user_prompt)

    mcp_entries: list[dict[str, Any]] = []
    if mcp_catalog_path is not None:
        mcp_entries = load_mcp_providers_catalog_merged(mcp_catalog_path)
        mcp_entries, _skipped_mcp = filter_mcp_entries_by_api_credentials(
            mcp_entries,
            verbose=not quiet,
            log_prefix="(dynamic) mcp catalog",
        )
        from orchestration.k8s_mcp_compat import apply_kubernetes_mcp_catalog_policy

        mcp_entries, _k8s_excluded = apply_kubernetes_mcp_catalog_policy(
            mcp_entries,
            verbose=not quiet,
            log_prefix="(dynamic) mcp catalog",
        )
    mcp_doc = mcp_catalog_for_planner_prompt(mcp_entries)

    skill_entries: list[dict[str, Any]] = []
    if agent_skills_catalog_path is not None:
        skill_entries = load_agent_skills_catalog_merged(agent_skills_catalog_path)
        skill_entries, _skipped_skills = filter_skill_entries_by_credentials(
            skill_entries,
            verbose=not quiet,
            log_prefix="(dynamic) skills catalog",
        )
    skills_doc = skills_catalog_for_planner_prompt(skill_entries)

    doc = catalog_for_planner_prompt(entries)
    learning_summary = ""
    kb_context = ""
    try:
        from orchestration.learning_store import (
            consume_pending_ratings,
            harness_performance_summary,
            learning_enabled,
            load_stats,
            planner_performance_summary,
            save_stats,
            user_harness_performance_summary,
        )

        if tool_root is not None and learning_enabled():
            st = load_stats(tool_root)
            st = consume_pending_ratings(tool_root, st)
            save_stats(tool_root, st)
            learning_summary = planner_performance_summary(stats=st, user_prompt=user_prompt)
            learning_summary += harness_performance_summary(stats=st)
            learning_summary += user_harness_performance_summary(stats=st)
    except Exception:  # noqa: BLE001
        learning_summary = ""
    try:
        from orchestration.knowledge_base import kb_enabled, planner_kb_context

        if tool_root is not None and kb_enabled():
            kb_context = planner_kb_context(tool_root=tool_root, user_prompt=user_prompt)
    except Exception:  # noqa: BLE001
        kb_context = ""
    system_text = _planner_system_prompt(
        catalog_doc=doc,
        max_steps=limit,
        last_crew_excerpt=last_excerpt,
        mcp_catalog_doc=mcp_doc,
        skills_catalog_doc=skills_doc,
        learning_summary=learning_summary,
        kb_context=kb_context,
    )
    messages = _compose_planner_messages(
        system_text=system_text,
        planner_history=history,
        user_prompt=user_prompt,
    )
    known_agent_ids = ", ".join(
        sorted(str(e.get("id", "")).strip() for e in entries if str(e.get("id", "")).strip())
    )

    def _repair_and_retry(reason: str) -> tuple[str, dict[str, Any], WorkflowConfig]:
        repair_msgs = list(messages)
        repair_msgs.append(
            {
                "role": "user",
                "content": (
                    "Your previous response was invalid for this orchestrator.\n"
                    f"Problem: {reason}\n\n"
                    f"Valid agent_provider_id values (use ONLY these): {known_agent_ids}.\n"
                    "Return a corrected JSON object that strictly matches the schema: "
                    "`plan_summary`, non-empty `steps` with `agent_provider_id` / `description` / `expected_output`, "
                    "optional `mcp_provider_ids` and `skill_ids`. "
                    "Do NOT reply with only user-wire keys like `minutes`—that is not the planner schema."
                ),
            }
        )
        raw2 = _planner_chat_completion(messages=repair_msgs, model=model)
        plan2 = _extract_json_object(raw2)
        try:
            cfg2 = workflow_config_from_plan(
                user_prompt=user_prompt,
                plan=plan2,
                catalog_entries=entries,
                instance_key=key,
                max_steps=limit,
                mcp_catalog_entries=mcp_entries,
                skill_catalog_entries=skill_entries,
                quiet=quiet,
            )
        except Exception as exc:  # noqa: BLE001
            _planner_debug_dump(
                "(dynamic repair)",
                model=model,
                raw_content=raw2,
                plan=plan2,
                exc=exc,
            )
            raise
        return raw2, plan2, cfg2

    used_trivial_plan = False
    if len(entries) == 1 and not _single_agent_skip_planner_llm():
        sole_id = str(entries[0].get("id", "")).strip()
        if sole_id:
            used_trivial_plan = True
            if not quiet:
                print(
                    f"(dynamic) single-agent catalog: trivial 1-step plan for {sole_id!r} "
                    "(skip planner LLM; set AGENTIC_PLANNER_SINGLE_AGENT_LLM=1 to force planning)",
                    file=sys.stderr,
                )
            plan = _single_agent_trivial_plan(user_prompt, sole_id)
            raw_content = json.dumps(plan)
            cfg = workflow_config_from_plan(
                user_prompt=user_prompt,
                plan=plan,
                catalog_entries=entries,
                instance_key=key,
                max_steps=limit,
                mcp_catalog_entries=mcp_entries,
                skill_catalog_entries=skill_entries,
                quiet=quiet,
            )

    if not used_trivial_plan:
        raw_content = _planner_chat_completion(messages=messages, model=model)
        plan = _extract_json_object(raw_content)

        try:
            cfg = workflow_config_from_plan(
                user_prompt=user_prompt,
                plan=plan,
                catalog_entries=entries,
                instance_key=key,
                max_steps=limit,
                mcp_catalog_entries=mcp_entries,
                skill_catalog_entries=skill_entries,
                quiet=quiet,
            )
        except Exception as exc:  # noqa: BLE001
            _planner_debug_dump(
                "(dynamic)",
                model=model,
                raw_content=raw_content,
                plan=plan,
                exc=exc,
            )
            if os.getenv("AGENTIC_PLANNER_REPAIR_RETRY", "1").strip().lower() not in (
                "0",
                "false",
                "no",
                "off",
            ):
                raw_content, plan, cfg = _repair_and_retry(str(exc))
            else:
                raise
    cfg = _prune_irrelevant_mcp_from_user_goal(
        cfg,
        user_prompt=user_prompt,
        mcp_catalog=mcp_entries,
        quiet=quiet,
    )
    cfg = _maybe_augment_mcp_from_user_goal(
        cfg,
        user_prompt=user_prompt,
        mcp_catalog=mcp_entries,
        quiet=quiet,
    )
    cfg = _prune_irrelevant_skills_from_user_goal(
        cfg,
        user_prompt=user_prompt,
        skill_catalog=skill_entries,
        quiet=quiet,
    )
    cfg = _maybe_augment_skills_from_user_goal(
        cfg,
        user_prompt=user_prompt,
        skill_catalog=skill_entries,
        quiet=quiet,
    )

    if session_path is not None:
        assert sess is not None
        sess.instance_key = key
        assistant_content = raw_content.strip() + _workflow_snapshot_for_planner_history(cfg)
        merged = trim_planner_history(
            history
            + [
                {"role": "user", "content": user_prompt.strip()},
                {"role": "assistant", "content": assistant_content},
            ]
        )
        sess.planner_history = merged
        save_session(session_path, sess)

    return cfg, plan


def iterative_controller_decision(
    *,
    original_goal: str,
    latest_excerpt: str,
    round_index: int,
    max_rounds: int,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Decide whether iterative orchestration should stop early.

    Returns a dict with keys:
    - done: bool
    - reason: str
    - next_goal: optional str (refine the goal for the next round)
    - estimated_rounds_remaining: optional int (0..max_rounds-round_index)
    - estimate_confidence: optional str ("low"|"medium"|"high")
    """
    m = (model or "").strip() or os.getenv(
        "AGENTIC_ITERATIVE_CONTROLLER_MODEL",
        os.getenv("AGENTIC_PLANNER_MODEL", "gpt-4o-mini").strip(),
    ).strip()

    cap = int(os.getenv("AGENTIC_ITERATIVE_CONTROLLER_EXCERPT_CHARS", "12000"))
    excerpt = (latest_excerpt or "").strip()[:cap]

    system = f"""You are an iterative orchestration controller.

You decide whether we should stop running more rounds and proceed to final synthesis.

Rules:
- Prefer stopping early when the user's request is already satisfied.
- Continue when key information is missing, tool failures prevented verification, or the output quality is clearly insufficient.
- If you continue, you may refine the goal into a tighter next_goal that focuses on the biggest remaining gap.
- Keep it pragmatic: we can run at most {max_rounds} rounds total.
- In "reason", be concrete: name the gap (missing section, failed verification, contradiction, shallow answer, etc.); avoid vague phrases like "needs more work" alone.
- **Align with the original ask:** If the original goal is a **strategic / executive briefing** (e.g. compare archetypes, adoption prerequisites, where *categories* of evidence matter), prefer `done: true` once that structure is in place—even when specific trial identifiers or vendor dossiers were **not** produced (those require real retrieval, not more LLM rounds).
- **No goal-drift into fiction:** Do **not** set `next_goal` to chase **specific** FDA clearances, NCT numbers, or journal articles for **company names or products invented in a prior crew turn**. That path causes hallucinated citations. If the latest excerpt contains such fabrications, either set `done: true` and let synthesis correct tone, or set `next_goal` to explicitly **strip unverified specifics**, relabel stories as hypothetical, and list verification steps for counsel—**not** "gather trial IDs" unless the user explicitly required database-backed lookup **and** tools exist to do it.

Respond with a single JSON object only:
{{
  "done": true/false,
  "reason": "short justification",
  "next_goal": "optional refined goal for the next round",
  "estimated_rounds_remaining": 0,
  "estimate_confidence": "low|medium|high"
}}
"""
    system += orchestrator_vertical_context_section()

    user = (
        "## Original goal\n"
        f"{original_goal.strip()}\n\n"
        f"## Round\n{round_index}\n\n"
        "## Latest intermediate results (excerpt)\n"
        f"{excerpt}\n"
    )
    raw = _planner_chat_completion(
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=m,
    )
    data = _extract_json_object(raw)
    if not isinstance(data, dict):
        return {"done": False, "reason": "controller returned non-object", "next_goal": ""}
    # Clamp estimate if present; always provide a usable fallback estimate.
    remaining_max = max(0, int(max_rounds) - int(round_index))
    est_raw = data.get("estimated_rounds_remaining", None)
    try:
        est = int(est_raw) if est_raw is not None else None
    except Exception:  # noqa: BLE001
        est = None
    if est is None:
        # Default: assume we might need to go to the cap (pessimistic, but safe).
        est = remaining_max
        data.setdefault("estimate_confidence", "low")
    est = max(0, min(remaining_max, est))
    data["estimated_rounds_remaining"] = est
    conf = str(data.get("estimate_confidence", "")).strip().lower()
    if conf not in ("low", "medium", "high"):
        data["estimate_confidence"] = "low"
    return data


def evaluate_run_quality(
    *,
    user_goal: str,
    output_text: str,
    model: str | None = None,
) -> dict[str, Any]:
    """
    LLM-as-judge evaluator (local to this orchestrator).

    Returns JSON dict with:
      - score: float 0..1
      - verdict: short string
      - strengths: list[str]
      - weaknesses: list[str]
      - missing: list[str] (key missing info / next actions)
    """
    if os.getenv("AGENTIC_LEARNING_EVAL", "1").strip().lower() in ("0", "false", "no", "off"):
        return {"score": None, "verdict": "disabled", "strengths": [], "weaknesses": [], "missing": []}

    m = (model or "").strip() or os.getenv(
        "AGENTIC_EVAL_MODEL",
        os.getenv("AGENTIC_ITERATIVE_CONTROLLER_MODEL", os.getenv("AGENTIC_PLANNER_MODEL", "gpt-4o-mini")),
    ).strip()

    cap_goal = int(os.getenv("AGENTIC_EVAL_GOAL_CHARS", "2000"))
    cap_out = int(os.getenv("AGENTIC_EVAL_OUTPUT_CHARS", "12000"))
    goal = (user_goal or "").strip()[: max(200, cap_goal)]
    out = (output_text or "").strip()[: max(500, cap_out)]

    system = """You are a strict evaluator of an AI orchestration run.

Score the output ONLY on usefulness for the user goal, factuality, completeness, and whether it followed constraints.

Return JSON only:
{
  "score": 0.0,
  "verdict": "one-line verdict",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing": ["..."]
}
Rules:
- score must be a number between 0 and 1.
- If the output is empty or clearly unrelated, score <= 0.2.
- Do not invent achievements; judge only from the provided output text.
"""
    system += orchestrator_vertical_context_section()
    user = f"## User goal\n{goal}\n\n## Output\n{out}\n"
    raw = _planner_chat_completion(messages=[{"role": "system", "content": system}, {"role": "user", "content": user}], model=m)
    data = _extract_json_object(raw)
    if not isinstance(data, dict):
        return {"score": None, "verdict": "invalid", "strengths": [], "weaknesses": [], "missing": []}
    return data


def faithfulness_qa_review(
    *,
    user_goal: str,
    output_text: str,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Post-run QA pass: hallucinations, unverified claims, and what the user should double-check.

    Separate from ``evaluate_run_quality`` (learning loop). Controlled by ``AGENTIC_FINAL_QA``.
    """
    if os.getenv("AGENTIC_FINAL_QA", "1").strip().lower() in ("0", "false", "no", "off"):
        return {"skipped": True}

    m = (model or "").strip() or os.getenv(
        "AGENTIC_QA_MODEL",
        os.getenv(
            "AGENTIC_EVAL_MODEL",
            os.getenv(
                "AGENTIC_ITERATIVE_CONTROLLER_MODEL",
                os.getenv("AGENTIC_PLANNER_MODEL", "gpt-4o-mini"),
            ),
        ),
    ).strip()

    cap_goal = int(os.getenv("AGENTIC_QA_GOAL_CHARS", "2000"))
    cap_out = int(os.getenv("AGENTIC_QA_OUTPUT_CHARS", "16000"))
    goal = (user_goal or "").strip()[: max(200, cap_goal)]
    out = (output_text or "").strip()[: max(500, cap_out)]

    system = """You are a quality assurance reviewer for a multi-agent system's final answer.

Your job is to catch likely hallucinations, overconfident factual claims without support, and gaps
relative to the user's goal. You do NOT re-run tools; judge only from the text provided.

Return JSON only:
{
  "hallucination_risk": "low|medium|high",
  "verdict": "one sentence summary for the user",
  "likely_hallucinations_or_unverified": ["specific claim or sentence that may be invented or unverified"],
  "unsupported_claims": ["factual statements that need a source or tool confirmation"],
  "what_looks_solid": ["parts that are well grounded or clearly hedged"],
  "user_should_verify": ["concrete checks the user can do (URLs, docs, measurements, etc.)"]
}
Rules:
- hallucination_risk must be one of: low, medium, high.
- If the answer is empty or mostly boilerplate, set hallucination_risk to high and explain in verdict.
- Do not invent tool results or URLs that are not in the answer text.
- Prefer empty arrays over speculation; only list items you can point to in the answer.
"""
    system += orchestrator_vertical_context_section()

    user = f"## User goal\n{goal}\n\n## Final answer to review\n{out}\n"
    raw = _planner_chat_completion(
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=m,
    )
    data = _extract_json_object(raw)
    if not isinstance(data, dict):
        return {
            "hallucination_risk": "unknown",
            "verdict": "QA model returned invalid JSON",
            "likely_hallucinations_or_unverified": [],
            "unsupported_claims": [],
            "what_looks_solid": [],
            "user_should_verify": [],
        }
    return data


def emit_faithfulness_qa_report(
    *,
    user_goal: str,
    output_text: str | None,
    model: str | None = None,
) -> None:
    """Run ``faithfulness_qa_review`` and print a human-readable block to stderr (Web UI surfaces this)."""
    try:
        data = faithfulness_qa_review(user_goal=user_goal, output_text=output_text or "", model=model)
    except Exception as exc:  # noqa: BLE001
        print(f"(qa) faithfulness review failed: {exc}", file=sys.stderr, flush=True)
        return
    if data.get("skipped"):
        return

    risk = str(data.get("hallucination_risk", "")).strip() or "unknown"
    verdict = str(data.get("verdict", "")).strip() or "(no verdict)"

    def _bullets(title: str, key: str) -> list[str]:
        xs = data.get(key)
        if not isinstance(xs, list) or not xs:
            return []
        lines_out: list[str] = [f"  {title}"]
        for item in xs:
            s = str(item).strip()
            if s:
                lines_out.append(f"    - {s}")
        return lines_out if len(lines_out) > 1 else []

    block_lines: list[str] = [
        "",
        "=== Quality assurance (hallucinations & unverified claims) ===",
        f"Risk: {risk}",
        f"Verdict: {verdict}",
        *_bullets("Likely hallucinations or unverified:", "likely_hallucinations_or_unverified"),
        *_bullets("Unsupported factual claims:", "unsupported_claims"),
        *_bullets("What looks solid:", "what_looks_solid"),
        *_bullets("User should verify:", "user_should_verify"),
        "=== End QA ===",
        "",
    ]
    print("\n".join(block_lines), file=sys.stderr, flush=True)
