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
import logging
import os
import socket
import threading
import time
from pathlib import Path
from typing import Any, Callable

DEFAULT_EXPECTED_OUTPUT = (
    "A direct, complete answer in plain prose. No preamble, no restatement of the question."
)

JSON_EXPECTED_OUTPUT = (
    "Return a single JSON object only. No markdown fences, no preamble, no trailing prose."
)

_DEFAULT_OLLAMA_CHAT_TIMEOUT_SEC = 600.0
_MIN_OLLAMA_CHAT_TIMEOUT_SEC = 30.0
_MAX_OLLAMA_CHAT_TIMEOUT_SEC = 7200.0
logger = logging.getLogger(__name__)


def _parse_positive_float(raw: Any) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        value = float(text)
    except (TypeError, ValueError):
        return None
    if value <= 0:
        return None
    return value


def ollama_chat_timeout_sec(entry: dict[str, Any] | None = None) -> float:
    """Resolve non-streaming Ollama ``/api/chat`` wall timeout.

    Order: agent YAML ``chat_timeout_sec`` (or ``options.chat_timeout_sec``) →
    ``AGENTIC_OLLAMA_CHAT_TIMEOUT_SEC`` → 600. Missing / blank / unparseable / ≤0
    values fall through. Result is clamped to ``[30, 7200]``.
    """
    raw: Any = None
    if isinstance(entry, dict):
        raw = entry.get("chat_timeout_sec")
        if raw is None and isinstance(entry.get("options"), dict):
            raw = entry["options"].get("chat_timeout_sec")
    value = _parse_positive_float(raw)
    if value is None:
        value = _parse_positive_float(os.getenv("AGENTIC_OLLAMA_CHAT_TIMEOUT_SEC"))
    if value is None:
        value = _DEFAULT_OLLAMA_CHAT_TIMEOUT_SEC
    return max(_MIN_OLLAMA_CHAT_TIMEOUT_SEC, min(_MAX_OLLAMA_CHAT_TIMEOUT_SEC, float(value)))


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


def _ollama_json_think_value(entry: dict[str, Any]) -> Any:
    """Resolve Ollama JSON-mode thinking, defaulting to disabled."""
    if "think" in entry:
        return entry["think"]
    options = entry.get("options")
    if isinstance(options, dict) and "think" in options:
        return options["think"]
    return False


def _looks_like_ollama_model_load_failure(detail: str) -> bool:
    text = str(detail or "").casefold()
    return any(
        marker in text
        for marker in (
            "cudamalloc",
            "nvmap",
            "runner process has terminated",
            "runner terminated",
            "unable to create llama context",
            "failed to allocate buffer for kv cache",
            "alloc_tensor_range",
        )
    )


def _httpx_response_body_text(response: Any) -> str:
    """Return HTTP body text even when the response was opened via ``stream()``.

    httpx streaming responses raise ``ResponseNotRead`` on ``.text`` / ``.content``
    until ``read()`` (or ``iter_bytes`` consumption). Callers that catch
    ``HTTPStatusError`` after ``raise_for_status()`` must use this helper — otherwise
    Ollama's real 500 body is replaced by ``ResponseNotRead`` and model-load
    classification / format fallback never run.
    """
    import httpx

    try:
        return response.text
    except httpx.ResponseNotRead:
        pass
    try:
        response.read()
    except Exception as exc:  # noqa: BLE001
        return str(exc)
    try:
        return response.text
    except Exception as exc:  # noqa: BLE001
        return str(exc)


def _ollama_load_retry_delay_sec() -> float:
    """Brief pause before retrying a transient GPU/NvMap load failure (default 2s)."""
    parsed = _parse_positive_float(os.getenv("AGENTIC_OLLAMA_LOAD_RETRY_DELAY_SEC"))
    if parsed is None:
        return 2.0
    return min(60.0, max(0.0, parsed))


def _raise_ollama_http_error(exc: BaseException, detail: str) -> None:
    status = getattr(exc, "code", None)
    response = getattr(exc, "response", None)
    if status is None and response is not None:
        status = getattr(response, "status_code", None)
    if status == 500 and _looks_like_ollama_model_load_failure(detail):
        raise RuntimeError(
            "Ollama could not load the model into GPU memory "
            f"(HTTP 500): {detail}"
        ) from exc
    raise RuntimeError(f"Ollama /api/chat failed ({status}): {detail}") from exc


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


def _context_chars_cap() -> int:
    from orchestration.env_values import env_int

    return env_int("AGENTIC_DIRECT_AGENT_CONTEXT_CHARS", 20000, lo=500, hi=200000)


def build_direct_task_description(*, goal: str, context: str = "") -> str:
    """Prompt for a single-shot answer: caller context first, then the question."""
    parts: list[str] = []
    ctx = str(context or "").strip()
    if ctx:
        cap = _context_chars_cap()
        parts.append("## Provided context\n" + ctx[:cap])
    parts.append("## Question\n" + str(goal or "").strip())
    parts.append(
        "Answer using the provided context when it is relevant. "
        "Say what you do not know instead of inventing it. Do not plan, delegate, or ask "
        "clarifying questions — answer now."
    )
    return "\n\n".join(parts)


def build_raw_user_prompt(*, goal: str, context: str = "") -> str:
    """Return only caller-provided content, with context before the requested text."""
    parts: list[str] = []
    ctx = str(context or "").strip()
    if ctx:
        cap = _context_chars_cap()
        parts.append(ctx[:cap])
    parts.append(str(goal or "").strip())
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
    cancel_event: threading.Event | None = None,
    raw_prompt: bool = False,
    force_json: bool = True,
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
        "messages": (
            [{"role": "user", "content": prompt}]
            if raw_prompt
            else [
                {"role": "system", "content": JSON_EXPECTED_OUTPUT},
                {"role": "user", "content": prompt},
            ]
        ),
        "stream": False,
        "think": _ollama_json_think_value(entry),
    }
    if force_json:
        body["format"] = fmt
    # Overlay agents may pin sampling / context (e.g. campaign_director
    # temperature: 0, num_ctx: 8192). Without this, Ollama uses defaults
    # (temperature 0.8) and silent front-truncation can drop ROLE/OBJECTIVES.
    options: dict[str, Any] = {}
    if entry.get("temperature") is not None:
        try:
            options["temperature"] = float(entry["temperature"])
        except (TypeError, ValueError):
            pass
    raw_num_ctx = entry.get("num_ctx")
    if raw_num_ctx is None and isinstance(entry.get("options"), dict):
        raw_num_ctx = entry["options"].get("num_ctx")
        if entry.get("temperature") is None and entry["options"].get("temperature") is not None:
            try:
                options["temperature"] = float(entry["options"]["temperature"])
            except (TypeError, ValueError):
                pass
    if raw_num_ctx is not None and str(raw_num_ctx).strip() != "":
        try:
            options["num_ctx"] = int(raw_num_ctx)
        except (TypeError, ValueError):
            pass
    if options:
        body["options"] = options
    timeout_s = ollama_chat_timeout_sec(entry)
    if on_progress:
        on_progress(f"generating (timeout_s={timeout_s:g})")
    started = time.monotonic()

    def _raise_chat_timeout(exc: BaseException) -> None:
        elapsed = time.monotonic() - started
        raise TimeoutError(
            f"Ollama /api/chat timed out after {timeout_s:g}s (elapsed={elapsed:.1f}s)"
        ) from exc

    def _is_timeout(exc: BaseException) -> bool:
        if isinstance(exc, (TimeoutError, socket.timeout)):
            return True
        name = exc.__class__.__name__.casefold()
        if "timeout" in name:
            return True
        return "timed out" in str(exc).casefold()

    def _request(request_body: dict[str, Any]) -> dict[str, Any]:
        import httpx

        if cancel_event is not None and cancel_event.is_set():
            raise RuntimeError("Ollama /api/chat cancelled")

        client = httpx.Client(timeout=timeout_s)
        response_holder: list[httpx.Response] = []
        request_done = threading.Event()

        def _close_on_cancel() -> None:
            if cancel_event is None:
                return
            while not request_done.is_set():
                if cancel_event.wait(timeout=0.1):
                    break
            else:
                return
            try:
                if response_holder:
                    response_holder[0].close()
                client.close()
            except Exception as close_exc:  # noqa: BLE001
                logger.error(
                    "orphaned Ollama request: failed to close /api/chat after cancel: %s",
                    close_exc,
                )
                return
            if not request_done.wait(timeout=1.0):
                logger.error(
                    "orphaned Ollama request: /api/chat remained open after cancel close"
                )

        if cancel_event is not None:
            threading.Thread(
                target=_close_on_cancel,
                name="ollama-chat-cancel",
                daemon=True,
            ).start()
        try:
            with client.stream(
                "POST",
                f"{host}/api/chat",
                json=request_body,
                headers={"Content-Type": "application/json"},
            ) as response:
                response_holder.append(response)
                # Materialize the body before raise_for_status so HTTPStatusError
                # handlers can read exc.response.text (streamed responses otherwise
                # raise httpx.ResponseNotRead and hide Ollama's real error).
                if response.is_error:
                    response.read()
                response.raise_for_status()
                raw = b"".join(response.iter_bytes())
            if cancel_event is not None and cancel_event.is_set():
                raise RuntimeError("Ollama /api/chat cancelled")
            parsed = json.loads(raw.decode("utf-8"))
            if not isinstance(parsed, dict):
                raise RuntimeError("Ollama /api/chat returned a non-object response")
            return parsed
        finally:
            request_done.set()
            client.close()

    def _detail_for(exc: BaseException) -> str:
        import httpx

        if isinstance(exc, httpx.HTTPStatusError):
            return _httpx_response_body_text(exc.response)
        return str(exc)

    def _wait_load_retry() -> None:
        delay = _ollama_load_retry_delay_sec()
        if delay <= 0:
            return
        if on_progress:
            on_progress(
                f"Ollama GPU/model load failed; retrying once after {delay:g}s"
            )
        if cancel_event is not None:
            if cancel_event.wait(timeout=delay):
                raise RuntimeError("Ollama /api/chat cancelled")
            return
        time.sleep(delay)

    def _request_with_recovery(request_body: dict[str, Any]) -> dict[str, Any]:
        """Run /api/chat; recover from transient GPU load failures and format rejects."""
        import httpx

        load_retried = False
        format_fallback_done = False
        pending = request_body
        while True:
            try:
                return _request(pending)
            except Exception as exc:
                detail = _detail_for(exc)
                is_http = isinstance(exc, httpx.HTTPStatusError)
                is_load = (
                    is_http
                    and exc.response.status_code == 500
                    and _looks_like_ollama_model_load_failure(detail)
                )
                # Jetson NvMap / cudaMalloc load failures are often transient
                # (fragmentation with GiBs "free"). Retry once after a short pause.
                if is_load and not load_retried:
                    load_retried = True
                    _wait_load_retry()
                    continue
                if is_load:
                    _raise_ollama_http_error(exc, detail)
                # Schema-as-format may be unsupported; retry with plain "json".
                if (
                    force_json
                    and is_http
                    and not format_fallback_done
                    and pending.get("format") != "json"
                ):
                    format_fallback_done = True
                    pending = dict(pending)
                    pending["format"] = "json"
                    continue
                if _is_timeout(exc):
                    _raise_chat_timeout(exc)
                if is_http:
                    _raise_ollama_http_error(exc, detail)
                raise RuntimeError(f"Ollama /api/chat failed: {detail}") from exc

    payload = _request_with_recovery(body)

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
        "timeout": ollama_chat_timeout_sec(entry),
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
    cancel_event: threading.Event | None = None,
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
            cancel_event=cancel_event,
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
    images: list[Any] | None = None,
    cancel_event: threading.Event | None = None,
) -> str:
    """Ask one catalog agent one question and return its answer text.

    ``on_progress`` receives short status lines (ensure/pull/start/generating) so a
    daemon WebSocket can stream them as ``chunk`` frames with ``stream: stderr``.

    When ``response_format`` is ``{"type": "json_object"}``, uses native JSON mode
    (no CrewAI, no prose sanitize, no KB persist). Invalid JSON raises
    ``DirectAgentFormatError``.

    When ``images`` is non-empty and the agent is ``type: object_detection``, runs the
    detection fast path and returns typed detection JSON.

    Agent entries with ``prompt_mode: raw`` bypass CrewAI and tools. Ollama receives
    caller context and text as its sole user message, without generated instructions.
    """
    text = str(goal or "").strip()
    if not text:
        raise ValueError("goal is required")

    root = tool_root or _tool_root_default()
    from orchestration.dynamic_run import catalog_paths

    paths = catalog_paths(root)
    pid = str(agent_provider_id or "").strip()
    entry = load_agent_entry(agent_provider_id=pid, catalog_path=paths.agent_providers)

    if str(entry.get("prompt_mode") or "").strip().casefold() == "raw":
        ptype = str(entry.get("type") or "").strip().lower()
        if ptype != "ollama" and not str(entry.get("model") or "").lower().startswith(
            "ollama/"
        ):
            raise ValueError("prompt_mode: raw currently requires an Ollama agent")

        if on_progress is not None:
            on_progress(f"starting {pid}")
        json_mode = wants_json_object(response_format)
        schema = json_schema if json_mode and isinstance(json_schema, dict) else None
        answer = _ollama_chat_json(
            entry=entry,
            prompt=build_raw_user_prompt(goal=text, context=context),
            json_schema=schema,
            on_progress=on_progress,
            cancel_event=cancel_event,
            raw_prompt=True,
            force_json=json_mode,
        )
        if json_mode:
            answer = _finalize_json_text(answer, json_schema=schema)
        if not str(answer or "").strip():
            raise DirectAgentEmptyAnswerError(
                "raw direct_agent produced an empty answer",
                raw=answer or None,
            )
        if persist:
            _persist_direct_answer(
                tool_root=root,
                session_slug=session_slug,
                goal=text,
                answer=answer,
                provider_id=pid,
                user_id=user_id,
            )
        return answer

    if wants_json_object(response_format):
        return run_direct_agent_json(
            tool_root=root,
            agent_provider_id=pid,
            goal=text,
            context=context,
            json_schema=json_schema if isinstance(json_schema, dict) else None,
            on_progress=on_progress,
            cancel_event=cancel_event,
        )

    if images:
        from orchestration.object_detection_runtime import (
            is_object_detection_entry,
            run_object_detection,
        )

        if is_object_detection_entry(entry):
            if on_progress is not None:
                on_progress(f"object_detection:{pid}")
            answer = run_object_detection(entry, images=images, on_progress=on_progress)
            try:
                from orchestration.detection_preview import persist_detection_run_artifacts
                from orchestration.llm_usage import current_run_id
                from orchestration.run_store import new_run_id

                # ContextVar first: ``AGENTIC_RUN_ID`` in the shared process env
                # may belong to another concurrent run.
                rid = current_run_id() or new_run_id()
                persist_detection_run_artifacts(
                    root, rid, answer=answer, images=images
                )
            except Exception:  # noqa: BLE001
                pass
            return answer

    from orchestration.progress_sink import progress_callback

    # Fast path: deterministic providers skip CrewAI entirely.
    from orchestration.deterministic_runtime import (
        is_deterministic_entry,
        run_deterministic_step,
    )

    if is_deterministic_entry(entry):
        if on_progress is not None:
            on_progress(f"deterministic:{pid}")
        return run_deterministic_step(
            entry,
            text=text,
            context=str(context or ""),
            mcp_tool_results_or_handles=mcp_provider_ids,
            user_id=user_id,
        )

    from orchestration.object_detection_runtime import is_object_detection_entry
    from orchestration.stt_runtime import SttError, is_stt_entry, run_stt
    from orchestration.tts_runtime import TtsError, is_tts_entry, run_tts
    from orchestration.video_generation_runtime import (
        VideoGenerationError,
        is_video_generation_entry,
        run_video_generation,
    )

    if is_video_generation_entry(entry):
        if on_progress is not None:
            on_progress(f"video_generation:{pid}")
        try:
            result = run_video_generation(
                entry,
                text=text,
                tool_root=root,
                user_id=user_id,
                on_progress=on_progress,
                cancel_event=cancel_event,
            )
        except VideoGenerationError as exc:
            raise ValueError(str(exc)) from exc
        import json as _json

        return _json.dumps(result, ensure_ascii=False, sort_keys=True)

    if is_tts_entry(entry):
        if on_progress is not None:
            on_progress(f"tts:{pid}")
        try:
            result = run_tts(
                entry,
                text=text,
                tool_root=root,
                user_id=user_id,
            )
        except TtsError as exc:
            raise ValueError(str(exc)) from exc
        import json as _json

        return _json.dumps(result, ensure_ascii=False, sort_keys=True)

    if is_stt_entry(entry):
        if on_progress is not None:
            on_progress(f"stt:{pid}")
        try:
            result = run_stt(
                entry,
                text=text,
                tool_root=root,
                user_id=user_id,
            )
        except SttError as exc:
            raise ValueError(str(exc)) from exc
        import json as _json

        return _json.dumps(result, ensure_ascii=False, sort_keys=True)

    if is_object_detection_entry(entry):
        raise ValueError(
            "object_detection providers require images; use WS/direct_agent with an images payload"
        )

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
    from orchestration.crewai_template import crew_kickoff
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
            emit_progress_lines=bool(on_progress),
            mcp_catalog_path=paths.mcp_providers,
            agent_skills_catalog_path=paths.agent_skills,
            on_progress=on_progress,
        )
        progress(f"starting {pid}")
        with crew_kickoff_context(built):
            progress("generating")
            result = crew_kickoff(built.crew, inputs={"topic": text})
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
