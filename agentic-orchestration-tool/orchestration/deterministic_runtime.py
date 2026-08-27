"""Run ``type: deterministic`` agent providers (fixed Python entrypoints, no LLM)."""

from __future__ import annotations

import importlib
import json
import re
from collections.abc import Callable
from typing import Any

ENTRYPOINT_RE = re.compile(
    r"^(?P<module>[a-zA-Z_][a-zA-Z0-9_.]*)"
    r":"
    r"(?P<callable>[a-zA-Z_][a-zA-Z0-9_]*)$"
)


class DeterministicAgentError(ValueError):
    """Invalid deterministic provider config or entrypoint failure."""


def resolve_entrypoint(spec: str) -> Callable[..., Any]:
    """Import ``module:callable`` and return the callable."""
    text = str(spec or "").strip()
    match = ENTRYPOINT_RE.match(text)
    if not match:
        raise DeterministicAgentError(
            f"entrypoint must be 'module:callable' (got {text!r})"
        )
    module_name = match.group("module")
    callable_name = match.group("callable")
    try:
        module = importlib.import_module(module_name)
    except ImportError as exc:
        raise DeterministicAgentError(
            f"cannot import entrypoint module {module_name!r}: {exc}"
        ) from exc
    fn = getattr(module, callable_name, None)
    if fn is None or not callable(fn):
        raise DeterministicAgentError(
            f"entrypoint {text!r}: {callable_name!r} is missing or not callable"
        )
    return fn


def entrypoint_from_entry(entry: dict[str, Any]) -> str:
    """Read ``entrypoint`` from a catalog dict (top-level or provider_options)."""
    raw = entry.get("entrypoint")
    if raw is None and isinstance(entry.get("provider_options"), dict):
        raw = entry["provider_options"].get("entrypoint")
    text = str(raw or "").strip()
    if not text:
        raise DeterministicAgentError(
            f"deterministic agent {entry.get('id')!r} is missing 'entrypoint'"
        )
    return text


def serialize_deterministic_result(value: Any) -> str:
    """Normalize callable return values to step output text."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    if isinstance(value, (int, float, bool)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def run_deterministic_step(
    entry: dict[str, Any],
    *,
    text: str,
    context: str = "",
    mcp_tool_results_or_handles: Any = None,
) -> str:
    """Invoke the catalog entrypoint and return serialized output."""
    spec = entrypoint_from_entry(entry)
    fn = resolve_entrypoint(spec)
    try:
        result = fn(
            text=str(text or ""),
            context=str(context or ""),
            mcp_tool_results_or_handles=mcp_tool_results_or_handles,
        )
    except TypeError:
        # Allow zero-arg / text-only callables used in simple fixtures.
        try:
            result = fn(str(text or ""))
        except TypeError:
            result = fn()
    except Exception as exc:  # noqa: BLE001 — surface as deterministic failure
        raise DeterministicAgentError(
            f"entrypoint {spec!r} failed: {exc}"
        ) from exc
    return serialize_deterministic_result(result)


def is_deterministic_entry(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    return str(entry.get("type") or entry.get("provider_type") or "").strip().lower() == (
        "deterministic"
    )
