"""Drop agent-provider catalog / workflow entries when required API keys are missing."""

from __future__ import annotations

import os
import sys
from typing import Any, Callable


def _openai_base_raw_from_entry(entry: dict[str, Any]) -> str:
    return str(entry.get("openai_base_url", "")).strip()


def _openai_catalog_entry_has_credentials(entry: dict[str, Any]) -> bool:
    """
    Match OpenAIProvider health rules without mutating the environment.

    If a base URL is set (YAML or env), the provider does not require OPENAI_API_KEY
    for inclusion (reachability is checked later at health_check).
    """
    raw = _openai_base_raw_from_entry(entry)
    if not raw:
        raw = os.getenv("OPENAI_BASE_URL", "").strip() or os.getenv("OPENAI_API_BASE", "").strip()
    if raw:
        return True
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def _anthropic_catalog_entry_has_credentials(entry: dict[str, Any]) -> bool:
    _ = entry
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def _huggingface_catalog_entry_has_credentials(entry: dict[str, Any]) -> bool:
    _ = entry
    return bool(
        os.getenv("HF_TOKEN", "").strip() or os.getenv("HUGGINGFACE_API_KEY", "").strip()
    )


# Extend when adding cloud providers that need an API key for catalog / workflow use.
_CREDENTIAL_CHECKERS: dict[str, Callable[[dict[str, Any]], bool]] = {
    "openai": _openai_catalog_entry_has_credentials,
    "anthropic": _anthropic_catalog_entry_has_credentials,
    "huggingface": _huggingface_catalog_entry_has_credentials,
}


def catalog_entry_has_api_credentials(entry: dict[str, Any]) -> bool:
    typ = str(entry.get("type", "")).strip().lower()
    checker = _CREDENTIAL_CHECKERS.get(typ)
    if checker is None:
        return True
    return checker(entry)


def credential_skip_reason(entry: dict[str, Any]) -> str:
    typ = str(entry.get("type", "")).strip().lower()
    if typ == "openai":
        return "set OPENAI_API_KEY or openai_base_url / OPENAI_BASE_URL for a reachable server"
    if typ == "anthropic":
        return "set ANTHROPIC_API_KEY"
    if typ == "huggingface":
        return "set HF_TOKEN or HUGGINGFACE_API_KEY"
    return "set the provider's required API credentials"


def filter_entries_by_api_credentials(
    entries: list[dict[str, Any]],
    *,
    verbose: bool,
    log_prefix: str = "",
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Keep entries that pass ``catalog_entry_has_api_credentials``.

    When ``verbose`` is True, print a stderr line per skipped provider id.
    Returns ``(kept, skipped_ids)``.
    """
    kept: list[dict[str, Any]] = []
    skipped_ids: list[str] = []
    prefix = f"{log_prefix}: " if log_prefix else ""
    for entry in entries:
        if catalog_entry_has_api_credentials(entry):
            kept.append(entry)
            continue
        pid = str(entry.get("id", "")).strip() or "(missing id)"
        skipped_ids.append(pid)
        if verbose:
            typ = str(entry.get("type", "")).strip().lower()
            hint = credential_skip_reason(entry)
            print(
                f"{prefix}skipping agent provider {pid!r} (type={typ!r}): missing credentials; {hint}.",
                file=sys.stderr,
            )
    return kept, skipped_ids
