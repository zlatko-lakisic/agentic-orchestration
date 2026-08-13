"""
Direct-agent fast path: "ask agent X, with this provided context, now."

Bypasses the planner → JSON plan → sequential crew cycle. The caller supplies the
agent id and pre-retrieved context, so there is no plan decomposition and no second
LLM round trip before the answer starts. The dynamic planner path
(``orchestration.dynamic_run``) stays the default for deep multi-step goals.

This is not a second agent runtime: it builds a one-task ``WorkflowConfig`` and kicks
it off through ``orchestration.runner.build_workflow``, exactly like a society turn.

Optional ``response_format={"type": "json_object"}`` skips CrewAI and calls Ollama
``/api/chat`` (or LiteLLM) with native JSON mode, then validates with ``json.loads``
(no fence stripping) and optional ``json_schema``.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

DEFAULT_EXPECTED_OUTPUT = (
    "A direct, complete answer in plain prose. No preamble, no restatement of the question."
)

JSON_EXPECTED_OUTPUT = (
    "Return a single JSON object only. No markdown fences, no preamble, no trailing prose."
)


class DirectAgentFormatError(Exception):
    """Model output failed ``json.loads`` or schema validation (JSON mode)."""

    def __init__(self, message: str, *, raw: str | None = None) -> None:
        super().__init__(message)
        self.raw = raw
        self.message = message


class DirectAgentEmptyAnswerError(Exception):
    """Crew kickoff produced no usable user-facing prose after sanitize/recovery."""

    def __init__(self, message: str, *, raw: str | None = None) -> None:
        super().__init__(message)
        self.raw = raw
        self.message = message


def _tool_root_default() -> Path:
    return Path(__file__).resolve().parents[1]


def _skill_ids_from_agent_entry(entry: dict[str, Any]) -> list[str]:
    return [str(x).strip() for x in (entry.get("skills") or []) if str(x).strip()]


def _mcp_ids_from_agent_entry(entry: dict[str, Any]) -> list[str]:
    """Normalize agent YAML ``mcp_providers`` (string ids and/or ``{id: …}`` maps)."""
    out: list[str] = []
    for item in entry.get("mcp_providers") or []:
        if isinstance(item, str):
            mid = item.strip()
            if mid:
                out.append(mid)
            continue
        if isinstance(item, dict):
            mid = str(item.get("id") or "").strip()
            if mid:
                out.append(mid)
    return out


def load_agent_entry(
    *,
    agent_provider_id: str,
    catalog_path: Path,
) -> dict[str, Any]:
    """Resolve one catalog entry by id, or raise with the reason it is unavailable."""
    from orchestration.agent_providers_catalog import (
        deepcopy_agent_provider,
        load_agent_providers_catalog_merged,
    )

    wanted = str(agent_provider_id or "").strip()
    if not wanted:
        raise ValueError("agent_provider_id is required")
    entries = load_agent_providers_catalog_merged(catalog_path)
    for entry in entries:
        if str(entry.get("id", "")).strip() == wanted:
            return deepcopy_agent_provider(entry)
    raise LookupError(
        f"unknown agent_provider_id {wanted!r}; not in {catalog_path}. "
        "Add it to the catalog or an AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS overlay."
    )


def build_direct_task_description(*, goal: str, context: str = "") -> str:
    """Prompt for a single-shot answer: caller context first, then the question."""
    parts: list[str] = []
    ctx = str(context or "").strip()
    if ctx:
        cap = int(os.getenv("AGENTIC_DIRECT_AGENT_CONTEXT_CHARS", "20000"))
        cap = max(500, min(200000, cap))
        parts.append("## Provided context\n" + ctx[:cap])
    parts.append("## Question\n" + str(goal or "").strip())
    parts.append(
        "Answer using the provided context when it is relevant. "
        "Say what you do not know instead of inventing it. Do not plan, delegate, or ask "
        "clarifying questions — answer now."
    )
    return "\n\n".join(parts)


def build_direct_agent_config(
    *,
    agent_provider_id: str,
    goal: str,
    context: str = "",
    catalog_path: Path,
    mcp_provider_ids: list[str] | None = None,
    expected_output: str | None = None,
):
    """One-task ``WorkflowConfig`` for the direct path (no planner involved).

    Honors agent-entry ``skills`` and, when ``mcp_provider_ids`` is omitted (``None``),
    agent-entry ``mcp_providers``. An explicit ``mcp_provider_ids`` list (including
    ``[]``) wins so callers can narrow tools (e.g. voice HA-only).
    """
    from copy import deepcopy

    from orchestration.agent_skills_context import strip_client_baked_skill_backstory
    from orchestration.config_loader import TaskDefinition, WorkflowConfig

    entry = load_agent_entry(agent_provider_id=agent_provider_id, catalog_path=catalog_path)
    skill_ids = _skill_ids_from_agent_entry(entry)
    if skill_ids:
        entry = deepcopy(entry)
        entry["backstory"] = strip_client_baked_skill_backstory(
            str(entry.get("backstory") or "")
        )
    agent_mcps = _mcp_ids_from_agent_entry(entry)
    task_mcps = list(mcp_provider_ids) if mcp_provider_ids is not None else agent_mcps
    pid = str(entry.get("id") or "").strip()
    step_id = f"direct-{pid}"
    return WorkflowConfig(
        name=f"direct-{pid}",
        process="sequential",
        topic=str(goal or "").strip(),
        instance_key=f"direct-{pid}",
        agent_providers=[entry],
        mcp_providers=[],
        skills=list(skill_ids),
        tasks=[
            TaskDefinition(
                id=step_id,
                agent_provider_id=pid,
                description=build_direct_task_description(goal=goal, context=context),
                expected_output=(expected_output or DEFAULT_EXPECTED_OUTPUT),
                mcp_providers=task_mcps,
                skills=list(skill_ids),
            )
        ],
        task_sequence=[step_id],
    )


def wants_json_object(response_format: dict[str, Any] | None) -> bool:
    if not isinstance(response_format, dict):
        return False
    return str(response_format.get("type") or "").strip().lower() == "json_object"


def parse_json_object_strict(raw: str) -> Any:
    """``json.loads`` only — no markdown fence stripping (acceptance requirement)."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DirectAgentFormatError(
            f"response is not valid JSON: {exc}",
            raw=raw,
        ) from exc


def validate_against_json_schema(data: Any, schema: dict[str, Any]) -> None:
    """Validate ``data`` against ``schema``; raise ``DirectAgentFormatError`` on failure."""
    try:
        import jsonschema  # type: ignore[import-untyped]

        jsonschema.validate(instance=data, schema=schema)
        return
    except ImportError:
        pass
    except Exception as exc:  # noqa: BLE001 — jsonschema.ValidationError etc.
        raise DirectAgentFormatError(
            f"response failed jsonSchema validation: {exc}",
            raw=json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data,
        ) from exc

    _lightweight_schema_check(data, schema)


def _lightweight_schema_check(data: Any, schema: dict[str, Any]) -> None:
    """Minimal fallback when ``jsonschema`` is not installed."""
    stype = schema.get("type")
    types = stype if isinstance(stype, list) else ([stype] if stype else [])
    if "object" in types or stype == "object" or (not types and "properties" in schema):
        if not isinstance(data, dict):
            raise DirectAgentFormatError(
                f"response must be a JSON object, got {type(data).__name__}",
                raw=json.dumps(data, ensure_ascii=False),
            )
        required = schema.get("required") or []
        if isinstance(required, list):
            missing = [k for k in required if k not in data]
            if missing:
                raise DirectAgentFormatError(
                    f"response missing required properties: {', '.join(str(m) for m in missing)}",
                    raw=json.dumps(data, ensure_ascii=False),
                )
        props = schema.get("properties")
        if isinstance(props, dict):
            for key, prop_schema in props.items():
                if key not in data or not isinstance(prop_schema, dict):
                    continue
                _check_prop_type(key, data[key], prop_schema)
        return
    if types and not _value_matches_types(data, types):
        raise DirectAgentFormatError(
            f"response type mismatch: expected {types!r}, got {type(data).__name__}",
            raw=json.dumps(data, ensure_ascii=False),
        )


def _check_prop_type(key: str, value: Any, prop_schema: dict[str, Any]) -> None:
    stype = prop_schema.get("type")
    if stype is None:
        return
    types = stype if isinstance(stype, list) else [stype]
    if not _value_matches_types(value, [str(t) for t in types]):
        raise DirectAgentFormatError(
            f"property {key!r} type mismatch: expected {types!r}, got {type(value).__name__}",
            raw=json.dumps({key: value}, ensure_ascii=False),
        )


def _value_matches_types(value: Any, types: list[Any]) -> bool:
    for t in types:
        name = str(t).lower()
        if name == "null" and value is None:
            return True
        if name == "string" and isinstance(value, str):
            return True
        if name == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
            return True
        if name == "integer" and isinstance(value, int) and not isinstance(value, bool):
            return True
        if name == "boolean" and isinstance(value, bool):
            return True
        if name == "object" and isinstance(value, dict):
            return True
        if name == "array" and isinstance(value, list):
            return True
    return False


def _json_mode_user_prompt(*, goal: str, context: str, json_schema: dict[str, Any] | None) -> str:
    parts = [build_direct_task_description(goal=goal, context=context), JSON_EXPECTED_OUTPUT]
    if json_schema:
        parts.append(
            "## JSON schema\n"
            "Your JSON must conform to this schema:\n"
            + json.dumps(json_schema, ensure_ascii=False)
        )
    return "\n\n".join(parts)


def _finalize_json_text(raw: str, *, json_schema: dict[str, Any] | None) -> str:
    text = str(raw or "")
    # Preserve exact body for the client; only strip outer whitespace that would
    # still leave a valid JSON document after loads of the trimmed form — we
    # validate the trimmed form but return the stripped string so loads succeeds.
    stripped = text.strip()
    data = parse_json_object_strict(stripped)
    if json_schema:
        validate_against_json_schema(data, json_schema)
    return stripped


def _ollama_chat_json(
    *,
    entry: dict[str, Any],
    prompt: str,
    json_schema: dict[str, Any] | None,
    on_progress: Callable[[str], None] | None,
) -> str:
    from agent_providers.ollama_provider import (
        ensure_ollama_runtime,
        normalize_ollama_host,
    )
    from orchestration.runtime_bootstrap import should_ensure_ollama
    from orchestration.session_overlay_runtime import (
        ensure_client_agent_ollama_runtime,
        resolve_overlay_ollama_host,
    )

    model = str(entry.get("model") or "").strip().removeprefix("ollama/")
    if not model:
        raise ValueError("ollama agent entry requires model")
    pid = str(entry.get("id") or "").strip()
    if pid.startswith("client."):
        host = resolve_overlay_ollama_host(entry)
        ensure_client_agent_ollama_runtime(entry, on_progress=on_progress)
    else:
        host = normalize_ollama_host(
            str(entry.get("ollama_host") or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434"))
        )
        if str(entry.get("ollama_host") or "").strip().casefold() == "workflow":
            from agent_providers.ollama_provider import litellm_api_base_for_ollama

            host = litellm_api_base_for_ollama()
        selfcontained = bool(entry.get("selfcontained", False))
        if should_ensure_ollama(selfcontained=selfcontained):
            if on_progress:
                on_progress(f"ensuring runtime for {entry.get('id')}")
            ensure_ollama_runtime(model=model, host=host)

    fmt: Any = "json"
    if isinstance(json_schema, dict) and json_schema:
        fmt = json_schema

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": JSON_EXPECTED_OUTPUT},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "format": fmt,
    }
    if on_progress:
        on_progress("generating")
    raw_http = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{host}/api/chat",
        data=raw_http,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace") if exc.fp else str(exc)
        # Schema-as-format may be unsupported; retry with plain "json".
        if fmt != "json":
            body["format"] = "json"
            req2 = urllib.request.Request(
                f"{host}/api/chat",
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req2, timeout=120) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
            except Exception as exc2:  # noqa: BLE001
                raise RuntimeError(f"Ollama /api/chat failed: {exc2}") from exc2
        else:
            raise RuntimeError(f"Ollama /api/chat failed ({exc.code}): {detail}") from exc
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Ollama /api/chat failed: {exc}") from exc

    message = payload.get("message") if isinstance(payload, dict) else None
    content = ""
    if isinstance(message, dict):
        content = str(message.get("content") or "")
    if not content.strip():
        raise DirectAgentFormatError("Ollama returned empty content", raw=content or None)
    try:
        from orchestration.llm_usage import normalize_ollama_chat_payload, record_llm_usage

        norm = normalize_ollama_chat_payload(payload if isinstance(payload, dict) else None)
        record_llm_usage(
            source="direct_ollama",
            model=model,
            prompt_tokens=norm["prompt_tokens"],
            completion_tokens=norm["completion_tokens"],
            total_tokens=norm["total_tokens"],
            ok=True,
        )
    except Exception:  # noqa: BLE001
        pass
    return content


def _litellm_chat_json(
    *,
    entry: dict[str, Any],
    prompt: str,
    on_progress: Callable[[str], None] | None,
) -> str:
    import litellm

    from agent_providers.ollama_provider import litellm_api_base_for_ollama

    raw_model = str(entry.get("model") or "").strip()
    ptype = str(entry.get("type") or "").strip().lower()
    if ptype == "ollama" and not raw_model.startswith("ollama/"):
        clean_model = f"ollama/{raw_model.removeprefix('ollama/')}"
    elif "/" not in raw_model:
        # Best-effort: assume OpenAI-compatible unless type maps better.
        prefix = {
            "openai": "openai",
            "anthropic": "anthropic",
            "huggingface": "huggingface",
            "vllm": "openai",
            "jetstream": "openai",
        }.get(ptype, "openai")
        clean_model = f"{prefix}/{raw_model}"
    else:
        clean_model = raw_model

    kwargs: dict[str, Any] = {
        "model": clean_model,
        "messages": [
            {"role": "system", "content": JSON_EXPECTED_OUTPUT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    if clean_model.lower().startswith("ollama/"):
        kwargs["api_base"] = litellm_api_base_for_ollama()

    if on_progress:
        on_progress("generating")

    def _content_from(resp_raw: Any) -> tuple[str, Any]:
        usage = None
        if hasattr(resp_raw, "model_dump"):
            resp = resp_raw.model_dump()
        elif hasattr(resp_raw, "dict"):
            resp = resp_raw.dict()
        else:
            resp = resp_raw
        if not isinstance(resp, dict):
            return "", getattr(resp_raw, "usage", None)
        usage = resp.get("usage")
        choices = resp.get("choices") or []
        first = choices[0] if isinstance(choices, list) and choices else {}
        if isinstance(first, dict):
            msg = first.get("message")
            if isinstance(msg, dict):
                c = msg.get("content")
                if isinstance(c, str):
                    return c, usage
            t = first.get("text")
            if isinstance(t, str):
                return t, usage
        return "", usage

    try:
        content, usage = _content_from(litellm.completion(**kwargs))
    except Exception as exc:  # noqa: BLE001
        detail = str(exc)
        if "response_format" in detail.lower() or "unsupported" in detail.lower():
            kwargs.pop("response_format", None)
            content, usage = _content_from(litellm.completion(**kwargs))
        else:
            raise

    if not str(content or "").strip():
        raise DirectAgentFormatError("LLM returned empty content", raw=content or None)
    try:
        from orchestration.llm_usage import normalize_openai_usage, record_llm_usage

        norm = normalize_openai_usage(usage)
        record_llm_usage(
            source="direct_litellm",
            model=clean_model,
            prompt_tokens=norm["prompt_tokens"],
            completion_tokens=norm["completion_tokens"],
            total_tokens=norm["total_tokens"],
            ok=True,
        )
    except Exception:  # noqa: BLE001
        pass
    return str(content)


def run_direct_agent_json(
    *,
    tool_root: Path | None = None,
    agent_provider_id: str,
    goal: str,
    context: str = "",
    json_schema: dict[str, Any] | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> str:
    """JSON-mode direct agent: native format + strict ``json.loads`` (+ optional schema)."""
    text = str(goal or "").strip()
    if not text:
        raise ValueError("goal is required")

    from orchestration.dynamic_run import catalog_paths

    root = tool_root or _tool_root_default()
    paths = catalog_paths(root)
    pid = str(agent_provider_id or "").strip()
    entry = load_agent_entry(agent_provider_id=pid, catalog_path=paths.agent_providers)
    prompt = _json_mode_user_prompt(goal=text, context=context, json_schema=json_schema)

    def progress(message: str) -> None:
        if on_progress is not None:
            on_progress(message)

    progress(f"starting {pid}")
    ptype = str(entry.get("type") or "").strip().lower()
    if ptype == "ollama" or str(entry.get("model") or "").lower().startswith("ollama/"):
        raw = _ollama_chat_json(
            entry=entry,
            prompt=prompt,
            json_schema=json_schema if isinstance(json_schema, dict) else None,
            on_progress=on_progress,
        )
    else:
        raw = _litellm_chat_json(entry=entry, prompt=prompt, on_progress=on_progress)

    return _finalize_json_text(
        raw,
        json_schema=json_schema if isinstance(json_schema, dict) else None,
    )


def run_direct_agent(
    *,
    tool_root: Path | None = None,
    agent_provider_id: str,
    goal: str,
    context: str = "",
    session_slug: str | None = None,
    mcp_provider_ids: list[str] | None = None,
    user_id: str | None = None,
    quiet: bool = True,
    persist: bool = True,
    on_progress: Callable[[str], None] | None = None,
    response_format: dict[str, Any] | None = None,
    json_schema: dict[str, Any] | None = None,
) -> str:
    """Ask one catalog agent one question and return its answer text.

    ``on_progress`` receives short status lines (ensure/pull/start/generating) so a
    daemon WebSocket can stream them as ``chunk`` frames with ``stream: stderr``.

    When ``response_format`` is ``{"type": "json_object"}``, uses native JSON mode
    (no CrewAI, no prose sanitize, no KB persist). Invalid JSON raises
    ``DirectAgentFormatError``.
    """
    if wants_json_object(response_format):
        return run_direct_agent_json(
            tool_root=tool_root,
            agent_provider_id=agent_provider_id,
            goal=goal,
            context=context,
            json_schema=json_schema if isinstance(json_schema, dict) else None,
            on_progress=on_progress,
        )

    text = str(goal or "").strip()
    if not text:
        raise ValueError("goal is required")

    from orchestration.dynamic_run import catalog_paths
    from orchestration.progress_sink import progress_callback

    root = tool_root or _tool_root_default()
    paths = catalog_paths(root)
    pid = str(agent_provider_id or "").strip()

    # Resolve the catalog entry before importing the CrewAI runner so unknown ids
    # surface as LookupError (HTTP 400) even when crewai is not installed.
    config = build_direct_agent_config(
        agent_provider_id=pid,
        goal=text,
        context=context,
        catalog_path=paths.agent_providers,
        mcp_provider_ids=mcp_provider_ids,
    )

    from orchestration.fetch_url_tool import recover_fetch_url_after_tool_leak
    from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak
    from orchestration.mcp_tool_leak_recovery import (
        looks_like_unusable_crew_answer,
        needs_filesystem_recovery,
        recover_after_mcp_tool_leak,
    )
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.runner import build_workflow, crew_kickoff_context
    from orchestration.text_normalize import sanitize_user_facing_prose

    try:
        from orchestration.llm_usage import install_litellm_usage_callback

        install_litellm_usage_callback()
    except Exception:  # noqa: BLE001
        pass

    def progress(message: str) -> None:
        if on_progress is not None:
            on_progress(message)

    mcp_ids = [
        str(x).strip()
        for x in (config.tasks[0].mcp_providers or [])
        if str(x).strip()
    ]
    task_description = config.tasks[0].description

    with progress_callback(on_progress):
        progress(f"ensuring runtime for {pid}")
        built = build_workflow(
            config,
            crew_verbose=not quiet,
            quiet=quiet,
            emit_progress_lines=False,
            mcp_catalog_path=paths.mcp_providers,
            agent_skills_catalog_path=paths.agent_skills,
            on_progress=on_progress,
        )
        progress(f"starting {pid}")
        with crew_kickoff_context(built):
            progress("generating")
            result = built.crew.kickoff(inputs={"topic": text})
    try:
        from orchestration.llm_usage import record_crew_result_usage

        model_guess = ""
        try:
            providers = getattr(config, "agent_providers", None) or []
            if providers and isinstance(providers[0], dict):
                model_guess = str(providers[0].get("model") or "")
        except Exception:  # noqa: BLE001
            model_guess = ""
        record_crew_result_usage(
            result,
            source="direct_crew",
            model=model_guess or pid,
        )
    except Exception:  # noqa: BLE001
        pass
    raw_text = workflow_result_to_extractable_text(result)
    answer = sanitize_user_facing_prose(raw_text)
    progress(
        f"sanitize prose raw_len={len(raw_text or '')} answer_len={len(answer or '')}"
    )

    needs_recovery = bool(mcp_ids) and (
        looks_like_mcp_tool_call_leak(raw_text)
        or looks_like_unusable_crew_answer(raw_text)
        or looks_like_unusable_crew_answer(answer or "")
        or needs_filesystem_recovery(
            text=answer or "",
            raw_text=raw_text,
            topic=text,
            mcp_ids=mcp_ids,
        )
    )
    if needs_recovery:
        progress("recovering unusable MCP answer")
        if "fetch_url" in mcp_ids:
            recovered = recover_fetch_url_after_tool_leak(
                built=built,
                topic=text,
                task_description=task_description,
                leaked_text=raw_text,
            )
            if recovered and not looks_like_unusable_crew_answer(recovered):
                answer = recovered
        if looks_like_unusable_crew_answer(answer or "") or needs_filesystem_recovery(
            text=answer or "",
            raw_text=raw_text,
            topic=text,
            mcp_ids=mcp_ids,
        ):
            recovered = recover_after_mcp_tool_leak(
                built=built,
                topic=text,
                task_description=task_description,
                mcp_ids=mcp_ids,
                leaked_text=raw_text,
            )
            if recovered:
                answer = recovered

    if looks_like_unusable_crew_answer(answer or ""):
        # Recovery failed or non-MCP path still produced meta/tool-stall prose.
        answer = ""

    if not str(answer or "").strip():
        preview = (raw_text or "").strip()[:240]
        raise DirectAgentEmptyAnswerError(
            "direct_agent produced an empty user-facing answer"
            + (f" (raw preview: {preview!r})" if preview else ""),
            raw=raw_text or None,
        )

    if persist and answer:
        _persist_direct_answer(
            tool_root=root,
            session_slug=session_slug,
            goal=text,
            answer=answer,
            provider_id=str(config.agent_providers[0].get("id") or ""),
            user_id=user_id,
        )
    return answer


def _persist_direct_answer(
    *,
    tool_root: Path,
    session_slug: str | None,
    goal: str,
    answer: str,
    provider_id: str,
    user_id: str | None,
) -> None:
    """Store the answer in the KB (best-effort; a direct call must never fail on this)."""
    try:
        from orchestration.knowledge_base import add_document

        add_document(
            tool_root=tool_root,
            session_slug=session_slug,
            user_goal=goal,
            content=answer,
            provider_id=provider_id,
            user_id=user_id,
        )
    except Exception:  # noqa: BLE001
        pass
