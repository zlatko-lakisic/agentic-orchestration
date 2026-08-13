"""LLM token usage context + ledger (Admin Traces / Token Usage page).

Dual-writes ``model_call`` run-trace events and ``__orchestrator_llm_usage__/usage.jsonl``.
Identity is carried via contextvars set at run boundaries.
"""

from __future__ import annotations

import json
import re
import time
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Iterator

LLM_USAGE_DIR_NAME = "__orchestrator_llm_usage__"

_cv_tool_root: ContextVar[Path | None] = ContextVar("llm_usage_tool_root", default=None)
_cv_run_id: ContextVar[str] = ContextVar("llm_usage_run_id", default="")
_cv_user_id: ContextVar[str] = ContextVar("llm_usage_user_id", default="")
_cv_user_name: ContextVar[str] = ContextVar("llm_usage_user_name", default="")
_cv_app_id: ContextVar[str] = ContextVar("llm_usage_app_id", default="")
_cv_client_ip: ContextVar[str] = ContextVar("llm_usage_client_ip", default="")
_cv_token_id: ContextVar[str] = ContextVar("llm_usage_token_id", default="")


def llm_usage_dir(tool_root: Path) -> Path:
    return (tool_root / LLM_USAGE_DIR_NAME).resolve()


def llm_usage_path(tool_root: Path) -> Path:
    return llm_usage_dir(tool_root) / "usage.jsonl"


def bind_usage_context(
    *,
    tool_root: Path | None = None,
    run_id: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
    app_id: str | None = None,
    client_ip: str | None = None,
    token_id: str | None = None,
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
) -> Iterator[None]:
    tokens = bind_usage_context(
        tool_root=tool_root,
        run_id=run_id,
        user_id=user_id,
        user_name=user_name,
        app_id=app_id,
        client_ip=client_ip,
        token_id=token_id,
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
    }


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
            "source": str(source or "unknown"),
            "model": str(model or "").strip() or None,
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

        if rid:
            from orchestration.run_trace import append_run_event

            append_run_event(
                root,
                rid,
                "model_call",
                actor=str(source or "model"),
                message=str(model or source or "model")[:200],
                detail={
                    "source": source,
                    "model": model,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "latency_ms": latency_ms,
                    "ok": ok,
                    **(detail or {}),
                },
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
        "grandTotal": grand,
    }


def install_litellm_usage_callback() -> None:
    """Register a LiteLLM success logger that records usage (idempotent).

    Newer LiteLLM builds no longer reliably invoke bare callables on
    ``litellm.success_callback``; use ``CustomLogger`` via ``litellm.callbacks``
    (and the logging callback manager when available).
    """
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
