"""LLM token usage context + ledger (Admin Traces / Token Usage page).

Dual-writes ``model_call`` run-trace events and ``__orchestrator_llm_usage__/usage.jsonl``.
Identity is carried via contextvars set at run boundaries.
"""

from __future__ import annotations

import json
import os
import re
import time
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

LLM_USAGE_DIR_NAME = "__orchestrator_llm_usage__"
API_TOKENS_DIR_NAME = "__orchestrator_api_tokens__"

_cv_tool_root: ContextVar[Path | None] = ContextVar("llm_usage_tool_root", default=None)
_cv_run_id: ContextVar[str] = ContextVar("llm_usage_run_id", default="")
_cv_user_id: ContextVar[str] = ContextVar("llm_usage_user_id", default="")
_cv_user_name: ContextVar[str] = ContextVar("llm_usage_user_name", default="")
_cv_app_id: ContextVar[str] = ContextVar("llm_usage_app_id", default="")
_cv_client_ip: ContextVar[str] = ContextVar("llm_usage_client_ip", default="")
_cv_token_id: ContextVar[str] = ContextVar("llm_usage_token_id", default="")
_cv_agent_provider_id: ContextVar[str] = ContextVar("llm_usage_agent_provider_id", default="")
_cv_last_prompt_tokens: ContextVar[int | None] = ContextVar(
    "llm_usage_last_prompt_tokens", default=None
)

EMPTY_LLM_MESSAGE = "model returned no text (context or thinking-only)"
_THINK_RE = re.compile(r"(?is)<think>(.*?)</think>")
_HEADROOM_TOKENS = 1024


class EmptyLlmResponseError(ValueError):
    """Model produced no user-visible text (thinking-only or truncated)."""


def last_prompt_tokens() -> int | None:
    return _cv_last_prompt_tokens.get()


def note_prompt_tokens(n: int | None) -> None:
    try:
        _cv_last_prompt_tokens.set(int(n) if n is not None else None)
    except (TypeError, ValueError):
        _cv_last_prompt_tokens.set(None)


def ollama_context_limit() -> int:
    for key in ("AGENTIC_OLLAMA_CONTEXT_LENGTH", "OLLAMA_CONTEXT_LENGTH"):
        raw = os.getenv(key, "").strip()
        if not raw:
            continue
        try:
            return max(1024, int(raw))
        except ValueError:
            continue
    return 16384


def near_context_limit(*, prompt_tokens: int | None = None, headroom: int = _HEADROOM_TOKENS) -> bool:
    n = prompt_tokens if prompt_tokens is not None else last_prompt_tokens()
    if n is None:
        return False
    return int(n) >= ollama_context_limit() - max(0, int(headroom))


def _choice_message(response: Any) -> Any:
    choices = getattr(response, "choices", None)
    if choices is None and isinstance(response, dict):
        choices = response.get("choices")
    if not choices:
        return None
    first = choices[0]
    if isinstance(first, dict):
        return first.get("message") or first.get("delta")
    return getattr(first, "message", None) or getattr(first, "delta", None)


def _msg_get(msg: Any, *names: str) -> Any:
    if msg is None:
        return None
    extra: Any = None
    if isinstance(msg, dict):
        for name in names:
            val = msg.get(name)
            if val:
                return val
        extra = msg.get("provider_specific_fields")
    else:
        for name in names:
            val = getattr(msg, name, None)
            if val:
                return val
        extra = getattr(msg, "provider_specific_fields", None)
    if isinstance(extra, dict):
        for name in names:
            val = extra.get(name)
            if val:
                return val
    return None


def _content_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get("text"):
                parts.append(str(part.get("text") or ""))
            else:
                text = getattr(part, "text", None)
                if text:
                    parts.append(str(text))
        return "".join(parts)
    return str(content)


def _set_msg_content(msg: Any, text: str) -> None:
    if isinstance(msg, dict):
        msg["content"] = text
        return
    try:
        msg.content = text
    except Exception:  # noqa: BLE001
        pass


def thinking_text_from_message(msg: Any) -> str:
    raw = _msg_get(msg, "reasoning_content", "thinking", "reasoning")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    content = _content_text(_msg_get(msg, "content"))
    match = _THINK_RE.search(content)
    if match and not _THINK_RE.sub("", content).strip():
        return str(match.group(1) or "").strip()
    return ""


def apply_thinking_coalesce(response: Any, *, raise_if_empty: bool = True) -> Any:
    """Copy thinking/reasoning into ``message.content`` when CrewAI would see empty text."""
    msg = _choice_message(response)
    if msg is None:
        if raise_if_empty:
            raise EmptyLlmResponseError(EMPTY_LLM_MESSAGE)
        return response
    if _msg_get(msg, "tool_calls"):
        return response
    content = _content_text(_msg_get(msg, "content")).strip()
    think_only = bool(content) and bool(_THINK_RE.search(content)) and not _THINK_RE.sub("", content).strip()
    if content and not think_only:
        return response
    thinking = thinking_text_from_message(msg)
    if thinking:
        _set_msg_content(msg, thinking)
        return response
    if raise_if_empty:
        raise EmptyLlmResponseError(EMPTY_LLM_MESSAGE)
    return response


def looks_like_empty_llm_error(error: BaseException | str) -> bool:
    text = str(error or "").lower()
    return (
        "none or empty" in text
        or EMPTY_LLM_MESSAGE in text
        or "invalid response from llm call" in text
    )


def looks_like_planning_speak(text: str) -> bool:
    body = str(text or "").strip().lower()
    if not body:
        return True
    needles = (
        "i should read",
        "let me call",
        "i will use the tool",
        "i'll use the tool",
        "need to call",
        "let me list",
        "i should list",
        "calling the tool",
    )
    return any(n in body for n in needles) and "def " not in body


def install_litellm_thinking_coalesce() -> None:
    """Wrap LiteLLM completion so CrewAI sees thinking as content (idempotent)."""
    try:
        import litellm
    except Exception:  # noqa: BLE001
        return
    flag = "_agentic_thinking_coalesce_v1"
    if getattr(litellm, flag, False):
        return
    orig = getattr(litellm, "completion", None)
    orig_async = getattr(litellm, "acompletion", None)
    if orig is None:
        return

    def _wrapped(*args: Any, **kwargs: Any) -> Any:
        resp = orig(*args, **kwargs)
        return apply_thinking_coalesce(resp)

    litellm.completion = _wrapped  # type: ignore[method-assign]
    if orig_async is not None:

        async def _awrapped(*args: Any, **kwargs: Any) -> Any:
            resp = await orig_async(*args, **kwargs)
            return apply_thinking_coalesce(resp)

        litellm.acompletion = _awrapped  # type: ignore[method-assign]
    setattr(litellm, flag, True)


def llm_usage_dir(tool_root: Path) -> Path:
    return (tool_root / LLM_USAGE_DIR_NAME).resolve()


def llm_usage_path(tool_root: Path) -> Path:
    return llm_usage_dir(tool_root) / "usage.jsonl"


def api_tokens_usage_path(tool_root: Path) -> Path:
    """Same ledger path as ``recordUsage`` in agentic-orchestration-web/lib/api-tokens.mjs."""
    import os

    override = os.getenv("AGENTIC_API_TOKENS_DIR", "").strip()
    if override:
        root = Path(override)
    else:
        root = tool_root / API_TOKENS_DIR_NAME
    return (root.resolve() / "usage.jsonl")


def _should_mirror_api_token_usage(app_id: str, user_name: str, user_id: str) -> bool:
    aid = str(app_id or "").strip().lower()
    if aid == "home-assistant":
        return True
    if aid == "agentic-watering":
        return True
    combined = f"{user_name} {user_id}".lower()
    return "watering" in combined or "irrigation" in combined


def _mirror_api_token_usage(
    tool_root: Path,
    *,
    app_id: str,
    token_id: str,
    client_ip: str,
    run_id: str,
    latency_ms: float | None,
    ok: bool,
) -> None:
    """Append a chat/completions-shaped row for Reach/orchestrate watering calls."""
    path = api_tokens_usage_path(tool_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "tokenId": token_id or None,
        "appId": app_id or "home-assistant",
        "ip": client_ip or "",
        "path": "/v1/chat/completions",
        "status": 200 if ok else 502,
        "latencyMs": round(latency_ms) if latency_ms is not None else None,
        "promptChars": None,
        "runId": run_id or None,
        "source": "llm_usage_mirror",
    }
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def bind_usage_context(
    *,
    tool_root: Path | None = None,
    run_id: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
    app_id: str | None = None,
    client_ip: str | None = None,
    token_id: str | None = None,
    agent_provider_id: str | None = None,
) -> list[Any]:
    """Set contextvars; returns tokens for :func:`reset_usage_context`."""
    tokens: list[Any] = []
    if tool_root is not None:
        tokens.append(_cv_tool_root.set(Path(tool_root)))
    if run_id is not None:
        tokens.append(_cv_run_id.set(str(run_id or "").strip()))
    if user_id is not None:
        tokens.append(_cv_user_id.set(str(user_id or "").strip()))
    if user_name is not None:
        tokens.append(_cv_user_name.set(str(user_name or "").strip()))
    if app_id is not None:
        tokens.append(_cv_app_id.set(str(app_id or "").strip()))
    if client_ip is not None:
        tokens.append(_cv_client_ip.set(str(client_ip or "").strip()))
    if token_id is not None:
        tokens.append(_cv_token_id.set(str(token_id or "").strip()))
    if agent_provider_id is not None:
        tokens.append(_cv_agent_provider_id.set(str(agent_provider_id or "").strip()))
    return tokens


def reset_usage_context(tokens: list[Any]) -> None:
    for t in reversed(tokens):
        try:
            t.var.reset(t)
        except Exception:  # noqa: BLE001
            pass


@contextmanager
def usage_context(
    *,
    tool_root: Path | None = None,
    run_id: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
    app_id: str | None = None,
    client_ip: str | None = None,
    token_id: str | None = None,
    agent_provider_id: str | None = None,
) -> Iterator[None]:
    tokens = bind_usage_context(
        tool_root=tool_root,
        run_id=run_id,
        user_id=user_id,
        user_name=user_name,
        app_id=app_id,
        client_ip=client_ip,
        token_id=token_id,
        agent_provider_id=agent_provider_id,
    )
    try:
        yield
    finally:
        reset_usage_context(tokens)


def current_tool_root() -> Path | None:
    return _cv_tool_root.get()


def current_usage_identity() -> dict[str, str]:
    return {
        "runId": _cv_run_id.get() or "",
        "userId": _cv_user_id.get() or "",
        "userName": _cv_user_name.get() or "",
        "appId": _cv_app_id.get() or "",
        "clientIp": _cv_client_ip.get() or "",
        "tokenId": _cv_token_id.get() or "",
        "agentProviderId": _cv_agent_provider_id.get() or "",
    }


def attach_usage_agent_to_crew_agent(agent: Any, agent_provider_id: str) -> None:
    """Tag a CrewAI agent LLM so LiteLLM usage rows carry ``agentProviderId``.

    Wraps ``call`` / ``acall`` to bind the agent provider id for the duration of
    each model invocation (covers sync and async LiteLLM success callbacks).
    """
    aid = str(agent_provider_id or "").strip()
    if not aid or agent is None:
        return
    llm = getattr(agent, "llm", None)
    if llm is None:
        return
    if getattr(llm, "_agentic_usage_agent_id", None) == aid:
        return

    def _wrap(meth_name: str) -> None:
        orig = getattr(llm, meth_name, None)
        if not callable(orig):
            return
        if getattr(orig, "_agentic_usage_wrapped", False):
            return

        def wrapped(*args: Any, **kwargs: Any) -> Any:
            tokens = bind_usage_context(agent_provider_id=aid)
            try:
                return orig(*args, **kwargs)
            finally:
                reset_usage_context(tokens)

        setattr(wrapped, "_agentic_usage_wrapped", True)
        setattr(llm, meth_name, wrapped)

    _wrap("call")
    _wrap("acall")
    try:
        setattr(llm, "_agentic_usage_agent_id", aid)
    except Exception:  # noqa: BLE001
        pass


def canonicalize_usage_model(model: Any) -> str | None:
    """Strip LiteLLM provider prefixes so shared backends share one ledger label.

    ``ollama/qwen2.5:14b-instruct`` and ``qwen2.5:14b-instruct`` both become
    ``qwen2.5:14b-instruct``.
    """
    s = str(model or "").strip()
    if not s:
        return None
    lower = s.lower()
    for prefix in ("ollama/", "openai/", "azure/", "anthropic/", "bedrock/"):
        if lower.startswith(prefix):
            s = s[len(prefix) :].strip()
            break
    return s or None


def looks_like_app_id(raw: Any) -> bool:
    """True when ``raw`` matches product appId shape (Reach / first-party UIs)."""
    s = str(raw or "").strip().lower()
    if not s or len(s) > 64:
        return False
    # Same shape as ReachConnectionConfig / minted API appIds (ao-chat, my-app, …).
    if not re.fullmatch(r"[a-z][a-z0-9_-]{1,63}", s):
        return False
    # Prefer slugs with separators; allow short bare product ids (knowbuddy).
    if "-" in s or "_" in s:
        return True
    return len(s) >= 4


def resolve_product_app_id(
    app_id: Any = None,
    user_name: Any = None,
    user_id: Any = None,
) -> str:
    """Pick the best product app id for rollups.

    Prefer a hyphenated identity slug (``comstar-ai``) when the explicit appId is a
    shorter brand prefix (``comstar``). Fall back to explicit appId, then any
    identity that looks like an app id.
    """
    app = str(app_id or "").strip()
    refined: list[str] = []
    for cand in (user_name, user_id):
        s = str(cand or "").strip()
        if not looks_like_app_id(s):
            continue
        if "-" in s or "_" in s:
            refined.append(s)
    app_l = app.lower()
    for s in refined:
        sl = s.lower()
        if not app_l or sl == app_l or sl.startswith(f"{app_l}-") or sl.startswith(f"{app_l}_"):
            return s
    if app:
        return app
    for cand in (user_name, user_id):
        s = str(cand or "").strip()
        if looks_like_app_id(s):
            return s
    return ""


def normalize_openai_usage(usage: Any) -> dict[str, int | None]:
    """Map OpenAI / LiteLLM usage object or dict to prompt/completion/total."""
    if usage is None:
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}
    if hasattr(usage, "model_dump"):
        try:
            usage = usage.model_dump()
        except Exception:  # noqa: BLE001
            pass
    if hasattr(usage, "dict") and not isinstance(usage, dict):
        try:
            usage = usage.dict()
        except Exception:  # noqa: BLE001
            pass
    if not isinstance(usage, dict):
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}

    def _int(key: str, *alts: str) -> int | None:
        for k in (key, *alts):
            v = usage.get(k)
            if v is None:
                continue
            try:
                return int(v)
            except (TypeError, ValueError):
                continue
        return None

    prompt = _int("prompt_tokens", "input_tokens", "prompt_eval_count")
    completion = _int("completion_tokens", "output_tokens", "eval_count")
    total = _int("total_tokens")
    if total is None and prompt is not None and completion is not None:
        total = prompt + completion
    return {"prompt_tokens": prompt, "completion_tokens": completion, "total_tokens": total}


def normalize_ollama_chat_payload(payload: dict[str, Any] | None) -> dict[str, int | None]:
    if not isinstance(payload, dict):
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}
    return normalize_openai_usage(
        {
            "prompt_tokens": payload.get("prompt_eval_count"),
            "completion_tokens": payload.get("eval_count"),
        }
    )


def record_llm_usage(
    *,
    source: str,
    model: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    total_tokens: int | None = None,
    latency_ms: float | None = None,
    ok: bool = True,
    detail: dict[str, Any] | None = None,
    tool_root: Path | None = None,
    run_id: str | None = None,
) -> None:
    """Append ledger row + ``model_call`` run-trace event (best-effort)."""
    try:
        import os

        root = tool_root or _cv_tool_root.get()
        if root is None:
            env_root = os.getenv("AGENTIC_TOOL_ROOT", "").strip()
            if env_root:
                root = Path(env_root)
            else:
                # orchestration/llm_usage.py → tool root is parents[1]
                root = Path(__file__).resolve().parents[1]
        rid = (run_id if run_id is not None else _cv_run_id.get()) or ""
        if not rid:
            rid = os.getenv("AGENTIC_RUN_ID", "").strip()
        root = Path(root)
        if total_tokens is None and prompt_tokens is not None and completion_tokens is not None:
            total_tokens = prompt_tokens + completion_tokens

        ident = current_usage_identity()
        if rid:
            ident["runId"] = rid
        if not ident.get("appId"):
            ident["appId"] = os.getenv("AGENTIC_APP_ID", "").strip()
        if not ident.get("clientIp"):
            ident["clientIp"] = os.getenv("AGENTIC_CLIENT_IP", "").strip()
        if not ident.get("userId"):
            ident["userId"] = os.getenv("AGENTIC_USER_ID", "").strip()
        if not ident.get("userName"):
            ident["userName"] = os.getenv("AGENTIC_USER_NAME", "").strip()
        if not ident.get("tokenId"):
            ident["tokenId"] = os.getenv("AGENTIC_API_TOKEN_ID", "").strip()
        # Older clients sometimes only stamped the product id on userName/userId.
        # Prefer refined slugs (comstar-ai) over a short brand appId (comstar).
        ident["appId"] = resolve_product_app_id(
            ident.get("appId"),
            ident.get("userName"),
            ident.get("userId"),
        )

        row: dict[str, Any] = {
            "ts": time.time(),
            "runId": ident["runId"] or None,
            "userId": ident["userId"] or None,
            "userName": ident["userName"] or None,
            "appId": ident["appId"] or None,
            "clientIp": ident["clientIp"] or None,
            "tokenId": ident["tokenId"] or None,
            "agentProviderId": ident.get("agentProviderId") or None,
            "source": str(source or "unknown"),
            "model": canonicalize_usage_model(model),
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "totalTokens": total_tokens,
            "latencyMs": latency_ms,
            "ok": bool(ok),
        }
        if detail:
            row["detail"] = detail

        path = llm_usage_path(root)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

        app_id = str(ident.get("appId") or "")
        if _should_mirror_api_token_usage(
            app_id,
            str(ident.get("userName") or ""),
            str(ident.get("userId") or ""),
        ):
            try:
                _mirror_api_token_usage(
                    root,
                    app_id=app_id or "home-assistant",
                    token_id=str(ident.get("tokenId") or ""),
                    client_ip=str(ident.get("clientIp") or ""),
                    run_id=str(ident.get("runId") or rid or ""),
                    latency_ms=latency_ms,
                    ok=ok,
                )
            except Exception:  # noqa: BLE001
                pass

        if rid:
            from orchestration.run_trace import append_run_event

            agent_id = str(ident.get("agentProviderId") or "").strip() or None
            detail_out: dict[str, Any] = {
                "source": source,
                "model": canonicalize_usage_model(model) or model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "latency_ms": latency_ms,
                "ok": ok,
                **(detail or {}),
            }
            if agent_id and "agent_provider_id" not in detail_out:
                detail_out["agent_provider_id"] = agent_id

            append_run_event(
                root,
                rid,
                "model_call",
                actor=str(source or "model"),
                message=str(model or source or "model")[:200],
                detail=detail_out,
            )
    except Exception:  # noqa: BLE001
        return


def read_llm_usage_rows(tool_root: Path, *, limit: int = 5000) -> list[dict[str, Any]]:
    path = llm_usage_path(tool_root)
    if not path.is_file():
        return []
    out: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:  # noqa: BLE001
                    continue
                if isinstance(obj, dict):
                    out.append(obj)
    except Exception:  # noqa: BLE001
        return []
    if limit > 0 and len(out) > limit:
        out = out[-limit:]
    return out


def _rollup_key(value: Any) -> str:
    s = str(value or "").strip()
    return s if s else "(unknown)"


def _add_tokens(
    bucket: dict[str, dict[str, Any]],
    key: str,
    *,
    prompt: int | None,
    completion: int | None,
    total: int | None,
) -> None:
    cur = bucket.setdefault(
        key,
        {
            "key": key,
            "calls": 0,
            "promptTokens": 0,
            "completionTokens": 0,
            "totalTokens": 0,
        },
    )
    cur["calls"] += 1
    if prompt is not None:
        cur["promptTokens"] += int(prompt)
    if completion is not None:
        cur["completionTokens"] += int(completion)
    if total is not None:
        cur["totalTokens"] += int(total)


def summarize_llm_usage(rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_user: dict[str, dict[str, Any]] = {}
    by_ip: dict[str, dict[str, Any]] = {}
    by_app: dict[str, dict[str, Any]] = {}
    by_token: dict[str, dict[str, Any]] = {}
    by_agent: dict[str, dict[str, Any]] = {}
    grand = {"calls": 0, "promptTokens": 0, "completionTokens": 0, "totalTokens": 0}

    for row in rows:
        prompt = row.get("promptTokens")
        completion = row.get("completionTokens")
        total = row.get("totalTokens")
        try:
            prompt_i = int(prompt) if prompt is not None else None
        except (TypeError, ValueError):
            prompt_i = None
        try:
            completion_i = int(completion) if completion is not None else None
        except (TypeError, ValueError):
            completion_i = None
        try:
            total_i = int(total) if total is not None else None
        except (TypeError, ValueError):
            total_i = None

        _add_tokens(by_user, _rollup_key(row.get("userId")), prompt=prompt_i, completion=completion_i, total=total_i)
        _add_tokens(by_ip, _rollup_key(row.get("clientIp")), prompt=prompt_i, completion=completion_i, total=total_i)
        _add_tokens(by_app, _rollup_key(row.get("appId")), prompt=prompt_i, completion=completion_i, total=total_i)
        _add_tokens(by_token, _rollup_key(row.get("tokenId")), prompt=prompt_i, completion=completion_i, total=total_i)
        agent_key = row.get("agentProviderId") or (
            (row.get("detail") or {}).get("agent_provider_id")
            if isinstance(row.get("detail"), dict)
            else None
        )
        _add_tokens(by_agent, _rollup_key(agent_key), prompt=prompt_i, completion=completion_i, total=total_i)

        grand["calls"] += 1
        if prompt_i is not None:
            grand["promptTokens"] += prompt_i
        if completion_i is not None:
            grand["completionTokens"] += completion_i
        if total_i is not None:
            grand["totalTokens"] += total_i

    def _sorted(d: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(d.values(), key=lambda x: (-int(x["totalTokens"]), -int(x["calls"]), str(x["key"])))

    return {
        "byUserId": _sorted(by_user),
        "byClientIp": _sorted(by_ip),
        "byAppId": _sorted(by_app),
        "byTokenId": _sorted(by_token),
        "byAgent": _sorted(by_agent),
        "grandTotal": grand,
    }


def install_litellm_usage_callback() -> None:
    """Register a LiteLLM success logger that records usage (idempotent).

    Newer LiteLLM builds no longer reliably invoke bare callables on
    ``litellm.success_callback``; use ``CustomLogger`` via ``litellm.callbacks``
    (and the logging callback manager when available).
    """
    install_litellm_thinking_coalesce()
    try:
        import litellm
        from litellm.integrations.custom_logger import CustomLogger
    except Exception:  # noqa: BLE001
        return

    flag = "_agentic_llm_usage_cb_v2"
    if getattr(litellm, flag, False):
        return

    class _AgenticUsageLogger(CustomLogger):
        def log_success_event(self, kwargs, response_obj, start_time, end_time):  # noqa: ANN001
            self._record(kwargs, response_obj, start_time, end_time)

        async def async_log_success_event(self, kwargs, response_obj, start_time, end_time):  # noqa: ANN001
            self._record(kwargs, response_obj, start_time, end_time)

        def _record(self, kwargs: Any, response_obj: Any, start_time: Any, end_time: Any) -> None:
            try:
                usage = None
                if response_obj is not None:
                    usage = getattr(response_obj, "usage", None)
                    if usage is None and isinstance(response_obj, dict):
                        usage = response_obj.get("usage")
                norm = normalize_openai_usage(usage)
                model = None
                if isinstance(kwargs, dict):
                    model = kwargs.get("model")
                if model is None and response_obj is not None:
                    model = getattr(response_obj, "model", None) or (
                        response_obj.get("model") if isinstance(response_obj, dict) else None
                    )
                latency_ms = None
                try:
                    if start_time is not None and end_time is not None:
                        latency_ms = round((end_time - start_time).total_seconds() * 1000.0, 1)
                except Exception:  # noqa: BLE001
                    pass
                note_prompt_tokens(norm.get("prompt_tokens"))
                record_llm_usage(
                    source="crew_litellm",
                    model=str(model) if model else None,
                    prompt_tokens=norm["prompt_tokens"],
                    completion_tokens=norm["completion_tokens"],
                    total_tokens=norm["total_tokens"],
                    latency_ms=latency_ms,
                    ok=True,
                )
            except Exception:  # noqa: BLE001
                return

    handler = _AgenticUsageLogger()
    try:
        manager = getattr(litellm, "logging_callback_manager", None)
        if manager is not None and hasattr(manager, "add_litellm_callback"):
            manager.add_litellm_callback(handler)
            if hasattr(manager, "add_litellm_success_callback"):
                manager.add_litellm_success_callback(handler)
        else:
            cbs = list(getattr(litellm, "callbacks", None) or [])
            if handler not in cbs:
                cbs.append(handler)
                litellm.callbacks = cbs
            success = list(getattr(litellm, "success_callback", None) or [])
            if handler not in success:
                success.append(handler)
                litellm.success_callback = success
        setattr(litellm, flag, True)
    except Exception:  # noqa: BLE001
        return


def extract_crew_token_usage(result: Any) -> dict[str, int | None]:
    """Best-effort prompt/completion/total from a CrewAI kickoff result."""
    if result is None:
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}
    usage: Any = getattr(result, "token_usage", None)
    if usage is None:
        usage = getattr(result, "usage_metrics", None)
    if usage is None and isinstance(result, dict):
        usage = result.get("token_usage") or result.get("usage_metrics")
    if usage is None:
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}
    if hasattr(usage, "model_dump"):
        try:
            usage = usage.model_dump()
        except Exception:  # noqa: BLE001
            pass
    elif hasattr(usage, "dict") and not isinstance(usage, dict):
        try:
            usage = usage.dict()
        except Exception:  # noqa: BLE001
            pass
    if not isinstance(usage, dict):
        usage = {
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "total_tokens": getattr(usage, "total_tokens", None),
            "successful_requests": getattr(usage, "successful_requests", None),
        }
    if not isinstance(usage, dict):
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}

    norm = normalize_openai_usage(usage)
    try:
        reqs = int(usage.get("successful_requests") or 0)
    except (TypeError, ValueError):
        reqs = 0

    def _pos(v: Any) -> int:
        try:
            return max(0, int(v))
        except (TypeError, ValueError):
            return 0

    total = _pos(norm.get("total_tokens"))
    prompt = _pos(norm.get("prompt_tokens"))
    completion = _pos(norm.get("completion_tokens"))
    # UsageMetrics defaults to zeros — ignore empty payloads.
    if reqs <= 0 and total <= 0 and prompt <= 0 and completion <= 0:
        return {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None}
    return {
        "prompt_tokens": norm.get("prompt_tokens"),
        "completion_tokens": norm.get("completion_tokens"),
        "total_tokens": norm.get("total_tokens"),
    }


def record_crew_result_usage(
    result: Any,
    *,
    source: str = "direct_crew",
    model: str | None = None,
    tool_root: Path | None = None,
) -> bool:
    """Record ledger + model_call from CrewAI kickoff ``token_usage`` when present.

    Skips when this run already has ``model_call`` events (e.g. LiteLLM callback
    already recorded per-completion usage) to avoid double-counting.
    """
    norm = extract_crew_token_usage(result)
    if (
        norm.get("prompt_tokens") is None
        and norm.get("completion_tokens") is None
        and norm.get("total_tokens") is None
    ):
        return False
    rid = (_cv_run_id.get() or "").strip()
    root = tool_root or _cv_tool_root.get()
    if rid and root is not None:
        try:
            from orchestration.run_trace import read_run_events

            if any(str(e.get("kind") or "") == "model_call" for e in read_run_events(Path(root), rid)):
                return False
        except Exception:  # noqa: BLE001
            pass
    record_llm_usage(
        source=source,
        model=model,
        prompt_tokens=norm["prompt_tokens"],
        completion_tokens=norm["completion_tokens"],
        total_tokens=norm["total_tokens"],
        ok=True,
    )
    return True
