"""
Session-scoped env / secrets for Reach overlays (context-safe).

Reach may register ``env`` on ``session_overlay_register``. Values are bound on
``overlay_run_context`` via a ContextVar so concurrent WS runs do not race on
``os.environ``. Providers and credential filters should call :func:`getenv`
instead of ``os.getenv`` for cloud / MCP keys.
"""

from __future__ import annotations

import os
import re
from contextvars import ContextVar
from pathlib import Path
from typing import Any

# Built-in LLM / planner keys always allowed through the Reach overlay channel.
_STATIC_ALLOWED_ENV_KEYS = frozenset(
    {
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "OPENAI_API_BASE",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_API_URL",
        "HF_TOKEN",
        "HUGGINGFACE_API_KEY",
        "HUGGINGFACE_API_BASE",
        "VLLM_API_KEY",
        "VLLM_BASE_URL",
        "JETSTREAM_API_KEY",
        "JETSTREAM_BASE_URL",
        "OLLAMA_API_BASE",
        "OLLAMA_HOST",
        "AGENTIC_PLANNER_MODEL",
    }
)

_ENV_KEY_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")

_MAX_ENV_KEYS = 64
_MAX_ENV_VALUE_CHARS = 8192

_SESSION_ENV: ContextVar[dict[str, str] | None] = ContextVar(
    "agentic_session_overlay_env", default=None
)

SECRET_LABELS: dict[str, str] = {
    "OPENAI_API_KEY": "OpenAI API key",
    "OPENAI_BASE_URL": "OpenAI base URL",
    "OPENAI_API_BASE": "OpenAI API base (alias)",
    "ANTHROPIC_API_KEY": "Anthropic API key",
    "ANTHROPIC_BASE_URL": "Anthropic base URL",
    "ANTHROPIC_API_URL": "Anthropic API URL (alias)",
    "HF_TOKEN": "Hugging Face token",
    "HUGGINGFACE_API_KEY": "Hugging Face API key",
    "HUGGINGFACE_API_BASE": "Hugging Face API base",
    "VLLM_API_KEY": "vLLM API key",
    "VLLM_BASE_URL": "vLLM base URL",
    "JETSTREAM_API_KEY": "JetStream API key",
    "JETSTREAM_BASE_URL": "JetStream base URL",
    "OLLAMA_API_BASE": "Ollama API base",
    "OLLAMA_HOST": "Ollama host",
    "AGENTIC_PLANNER_MODEL": "Planner model override",
    "TAVILY_API_KEY": "Tavily API key",
    "BRAVE_API_KEY": "Brave Search API key",
    "EXA_API_KEY": "Exa API key",
    "HOME_ASSISTANT_TOKEN": "Home Assistant token",
    "HA_TOKEN": "Home Assistant token",
}


def _secret_field(
    name: str,
    *,
    required: bool,
    secret: bool = True,
    any_of_group: str | None = None,
) -> dict[str, Any]:
    key = str(name or "").strip()
    return {
        "name": key,
        "label": SECRET_LABELS.get(key) or key.replace("_", " ").title(),
        "secret": bool(secret),
        "required": bool(required),
        "anyOfGroup": any_of_group,
        "sessionEnvAllowed": True,
    }


def agent_type_required_secrets(provider_type: str) -> list[dict[str, Any]]:
    """Structured secret fields for a stock agent provider ``type``."""
    typ = str(provider_type or "").strip().lower()
    if typ == "openai":
        return [
            _secret_field(
                "OPENAI_API_KEY",
                required=False,
                any_of_group="openai_auth",
            ),
            _secret_field(
                "OPENAI_BASE_URL",
                required=False,
                secret=False,
                any_of_group="openai_auth",
            ),
            _secret_field(
                "OPENAI_API_BASE",
                required=False,
                secret=False,
                any_of_group="openai_auth",
            ),
        ]
    if typ == "anthropic":
        return [
            _secret_field("ANTHROPIC_API_KEY", required=True),
            _secret_field("ANTHROPIC_BASE_URL", required=False, secret=False),
            _secret_field("ANTHROPIC_API_URL", required=False, secret=False),
        ]
    if typ == "huggingface":
        return [
            _secret_field(
                "HF_TOKEN",
                required=False,
                any_of_group="hf_auth",
            ),
            _secret_field(
                "HUGGINGFACE_API_KEY",
                required=False,
                any_of_group="hf_auth",
            ),
            _secret_field("HUGGINGFACE_API_BASE", required=False, secret=False),
        ]
    if typ == "vllm":
        return [
            _secret_field("VLLM_API_KEY", required=False),
            _secret_field("VLLM_BASE_URL", required=False, secret=False),
        ]
    if typ == "jetstream":
        return [
            _secret_field("JETSTREAM_API_KEY", required=False),
            _secret_field("JETSTREAM_BASE_URL", required=False, secret=False),
        ]
    if typ in ("ollama", "local"):
        return [
            _secret_field("OLLAMA_HOST", required=False, secret=False),
            _secret_field("OLLAMA_API_BASE", required=False, secret=False),
        ]
    return []


def entry_required_secrets(entry: dict[str, Any]) -> list[dict[str, Any]]:
    """Build ``requiredSecrets`` from catalog ``required_env`` / ``required_env_any``."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    raw_all = entry.get("required_env")
    if isinstance(raw_all, list):
        for item in raw_all:
            key = str(item or "").strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(_secret_field(key, required=True))
    raw_any = entry.get("required_env_any")
    if isinstance(raw_any, list):
        keys = [str(k or "").strip() for k in raw_any if str(k or "").strip()]
        group = None
        if keys:
            eid = str(entry.get("id") or "").strip() or "entry"
            group = f"required_env_any:{eid}"
        for key in keys:
            if key in seen:
                continue
            seen.add(key)
            out.append(_secret_field(key, required=False, any_of_group=group))
    return out


def _catalog_declared_env_keys(tool_root: Path | None) -> frozenset[str]:
    """Env names declared on stock MCP / skill YAML (safe for Reach sessionEnv)."""
    keys: set[str] = set()
    try:
        from orchestration.dynamic_run import catalog_paths
        from orchestration.mcp_providers_catalog import load_mcp_providers_catalog
        from orchestration.agent_skills_catalog import load_agent_skills_catalog

        paths = catalog_paths(tool_root)
        # Load disk catalogs only (no session merge) to avoid recursion.
        for entry in load_mcp_providers_catalog(paths.mcp_providers):
            for field in entry_required_secrets(entry):
                name = str(field.get("name") or "").strip()
                if name:
                    keys.add(name)
        try:
            for entry in load_agent_skills_catalog(paths.agent_skills):
                for field in entry_required_secrets(entry):
                    name = str(field.get("name") or "").strip()
                    if name:
                        keys.add(name)
        except Exception:  # noqa: BLE001
            pass
    except Exception:  # noqa: BLE001
        pass
    return frozenset(keys)


def session_env_allowed_keys(tool_root: Path | None = None) -> frozenset[str]:
    """Union of static LLM keys and catalog-declared MCP/skill secret names."""
    return frozenset(_STATIC_ALLOWED_ENV_KEYS | _catalog_declared_env_keys(tool_root))


def allowed_session_env_key(name: str, *, tool_root: Path | None = None) -> bool:
    key = str(name or "").strip()
    if not key or not _ENV_KEY_RE.match(key):
        return False
    return key in session_env_allowed_keys(tool_root)


def normalize_session_env(
    raw: Any,
    *,
    tool_root: Path | None = None,
) -> dict[str, str]:
    """Validate and copy a Reach ``env`` map. Raises ``ValueError`` on bad input."""
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise ValueError("overlay env must be an object of string keys to string values")
    if len(raw) > _MAX_ENV_KEYS:
        raise ValueError(f"overlay env has {len(raw)} keys; max is {_MAX_ENV_KEYS}")
    allowed = session_env_allowed_keys(tool_root)
    out: dict[str, str] = {}
    for key, val in raw.items():
        name = str(key or "").strip()
        if not name:
            continue
        if name not in allowed:
            raise ValueError(
                f"overlay env key {name!r} is not allowed "
                "(only provider / catalog-declared MCP & skill secrets may be passed via Reach)"
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
