"""
Session-scoped env / secrets for Reach overlays (context-safe).

Reach may register ``env`` on ``session_overlay_register``. Values are bound on
``overlay_run_context`` via a ContextVar so concurrent WS runs do not race on
``os.environ``. Providers and credential filters should call :func:`getenv`
instead of ``os.getenv`` for cloud keys.
"""

from __future__ import annotations

import os
import re
from contextvars import ContextVar
from typing import Any

# Only allow known provider / LLM keys through the Reach overlay channel.
_ALLOWED_ENV_KEY_RE = re.compile(
    r"^(OPENAI_API_KEY|OPENAI_BASE_URL|OPENAI_API_BASE|"
    r"ANTHROPIC_API_KEY|ANTHROPIC_BASE_URL|ANTHROPIC_API_URL|"
    r"HF_TOKEN|HUGGINGFACE_API_KEY|HUGGINGFACE_API_BASE|"
    r"VLLM_API_KEY|VLLM_BASE_URL|"
    r"JETSTREAM_API_KEY|JETSTREAM_BASE_URL|"
    r"OLLAMA_API_BASE|OLLAMA_HOST|"
    r"AGENTIC_PLANNER_MODEL)$"
)

_MAX_ENV_KEYS = 32
_MAX_ENV_VALUE_CHARS = 8192

_SESSION_ENV: ContextVar[dict[str, str] | None] = ContextVar(
    "agentic_session_overlay_env", default=None
)


def allowed_session_env_key(name: str) -> bool:
    return bool(_ALLOWED_ENV_KEY_RE.match(str(name or "").strip()))


def normalize_session_env(raw: Any) -> dict[str, str]:
    """Validate and copy a Reach ``env`` map. Raises ``ValueError`` on bad input."""
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise ValueError("overlay env must be an object of string keys to string values")
    if len(raw) > _MAX_ENV_KEYS:
        raise ValueError(f"overlay env has {len(raw)} keys; max is {_MAX_ENV_KEYS}")
    out: dict[str, str] = {}
    for key, val in raw.items():
        name = str(key or "").strip()
        if not name:
            continue
        if not allowed_session_env_key(name):
            raise ValueError(
                f"overlay env key {name!r} is not allowed "
                "(only provider API keys / base URLs may be passed via Reach)"
            )
        if val is None:
            continue
        text = str(val)
        if len(text) > _MAX_ENV_VALUE_CHARS:
            raise ValueError(
                f"overlay env {name!r} value exceeds {_MAX_ENV_VALUE_CHARS} characters"
            )
        if text.strip():
            out[name] = text
    return out


def set_session_env(env: dict[str, str] | None):
    """Return a ContextVar token for :meth:`ContextVar.reset`."""
    return _SESSION_ENV.set(dict(env) if env else None)


def reset_session_env(token) -> None:
    _SESSION_ENV.reset(token)


def current_session_env() -> dict[str, str]:
    cur = _SESSION_ENV.get()
    return dict(cur) if cur else {}


def getenv(name: str, default: str | None = None) -> str | None:
    """Prefer session overlay env, then process environment."""
    key = str(name or "").strip()
    session = _SESSION_ENV.get()
    if session and key in session:
        return session[key]
    return os.getenv(key, default)
