"""Filter agent catalog entries by models actually present on Ollama ``/api/tags``."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def normalize_ollama_host(raw_host: str) -> str:
    host = (raw_host or "").strip() or "http://127.0.0.1:11434"
    if host.startswith("http://") or host.startswith("https://"):
        return host.rstrip("/")
    return f"http://{host.rstrip('/')}"


def litellm_api_base_for_ollama() -> str:
    raw = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    return normalize_ollama_host(raw)


def ollama_model_name_aliases(name: str) -> set[str]:
    """Normalize a tags entry so bare tags and ``:latest`` match interchangeably."""
    out: set[str] = set()
    cleaned = str(name or "").removeprefix("ollama/").strip()
    if not cleaned:
        return out
    out.add(cleaned)
    if ":" in cleaned:
        out.add(cleaned.split(":", 1)[0])
    else:
        out.add(f"{cleaned}:latest")
    return out


def list_ollama_pulled_model_names(
    host: str,
    *,
    timeout: float = 10,
) -> set[str] | None:
    """Return alias set from ``GET /api/tags``, or ``None`` if the API is unreachable."""
    base = normalize_ollama_host(host)
    try:
        with urllib.request.urlopen(f"{base}/api/tags", timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError):
        return None
    models = payload.get("models") if isinstance(payload, dict) else None
    if not isinstance(models, list):
        return set()
    names: set[str] = set()
    for item in models:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("model") or "").strip()
        names.update(ollama_model_name_aliases(name))
    return names


def ollama_model_pulled(names: set[str], model: str) -> bool:
    """True when ``model`` matches an alias in a ``list_ollama_pulled_model_names`` set."""
    wanted = str(model or "").removeprefix("ollama/").strip()
    if not wanted:
        return False
    return bool(ollama_model_name_aliases(wanted) & names)


def filter_catalog_by_pulled_ollama_models(
    entries: list[dict[str, Any]],
    *,
    host: str | None = None,
    verbose: bool = True,
    log_prefix: str = "(dynamic) catalog",
) -> list[dict[str, Any]]:
    """Drop stock Ollama catalog entries whose ``model`` is not listed in ``/api/tags``.

    Queries ``OLLAMA_API_BASE`` (or ``host``). Non-Ollama providers and ``client.*``
    session overlays are kept. When tags are unreachable, keeps entries unchanged
    (does not brick planning). Disable with ``AGENTIC_DISABLE_OLLAMA_PULL_FILTER=1``.
    """
    if _env_flag("AGENTIC_DISABLE_OLLAMA_PULL_FILTER"):
        return list(entries)

    base = normalize_ollama_host(host) if host else litellm_api_base_for_ollama()
    names = list_ollama_pulled_model_names(base)
    if names is None:
        if verbose:
            print(
                f"{log_prefix}: Ollama /api/tags unreachable at {base}; "
                "not filtering unpulled models",
                file=sys.stderr,
            )
        return list(entries)

    kept: list[dict[str, Any]] = []
    for entry in entries:
        typ = str(entry.get("type") or "").strip().lower()
        eid = str(entry.get("id") or "").strip()
        if typ != "ollama" or eid.startswith("client."):
            kept.append(entry)
            continue
        model = str(entry.get("model") or "").strip()
        if ollama_model_pulled(names, model):
            kept.append(entry)
            continue
        if verbose:
            print(
                f"{log_prefix}: skipping {eid!r}: model {(model or '(missing)')!r} not pulled",
                file=sys.stderr,
            )
    return kept
