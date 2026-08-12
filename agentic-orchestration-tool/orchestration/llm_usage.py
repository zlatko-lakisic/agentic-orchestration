"""LLM token usage context + ledger (Admin Traces / Token Usage page).

Dual-writes ``model_call`` run-trace events and ``__orchestrator_llm_usage__/usage.jsonl``.
Identity is carried via contextvars set at run boundaries.
"""

from __future__ import annotations

import json
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
        root = tool_root or _cv_tool_root.get()
        rid = (run_id if run_id is not None else _cv_run_id.get()) or ""
        if root is None:
            return
        root = Path(root)
        if prompt_tokens is None and completion_tokens is None and total_tokens is None:
            # still record the call
            pass
        if total_tokens is None and prompt_tokens is not None and completion_tokens is not None:
            total_tokens = prompt_tokens + completion_tokens

        ident = current_usage_identity()
        if rid:
            ident["runId"] = rid

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
    """Register a LiteLLM success callback that records usage (idempotent)."""
    try:
        import litellm
    except Exception:  # noqa: BLE001
        return

    flag = "_agentic_llm_usage_cb"
    if getattr(litellm, flag, False):
        return

    def _cb(kwargs: dict[str, Any], completion_response: Any, start_time: Any, end_time: Any) -> None:  # noqa: ANN401
        try:
            usage = None
            if completion_response is not None:
                usage = getattr(completion_response, "usage", None)
                if usage is None and isinstance(completion_response, dict):
                    usage = completion_response.get("usage")
            norm = normalize_openai_usage(usage)
            model = None
            if isinstance(kwargs, dict):
                model = kwargs.get("model")
            if model is None and completion_response is not None:
                model = getattr(completion_response, "model", None) or (
                    completion_response.get("model") if isinstance(completion_response, dict) else None
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

    try:
        cbs = list(getattr(litellm, "success_callback", None) or [])
        if _cb not in cbs:
            cbs.append(_cb)
            litellm.success_callback = cbs
        setattr(litellm, flag, True)
    except Exception:  # noqa: BLE001
        return
