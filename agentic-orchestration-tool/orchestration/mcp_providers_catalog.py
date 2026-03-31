from __future__ import annotations

import copy
import os
import re
from pathlib import Path
from typing import Any

import yaml

_EXTRA_MCP_PATH_ENV = "AGENTIC_EXTRA_MCP_PROVIDERS_PATH"


def substitute_mcp_env_vars(text: str) -> str:
    """Replace ``${VAR}`` placeholders with ``os.environ[VAR]`` (empty string if unset)."""

    def _repl(match: re.Match[str]) -> str:
        return os.getenv(match.group(1).strip(), "")

    return re.sub(r"\$\{([^}]+)\}", _repl, text)


def _load_mcp_bundle_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("mcp_providers")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'mcp_providers' must be a non-empty list in bundle catalog {path}",
        )
    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: mcp_providers[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"{path}: mcp_providers[{i}] is missing non-empty 'id'")
        out.append(dict(item))
    return out


def _load_mcp_fragment_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping (one MCP provider per file)")
    pid = str(raw.get("id", "")).strip()
    if not pid:
        raise ValueError(f"{path}: missing non-empty 'id' at file root")
    return dict(raw)


def load_mcp_providers_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load MCP provider templates from a directory (one ``*.yaml`` per entry) or a legacy bundle file."""
    if not catalog_path.exists():
        return []

    if catalog_path.is_dir():
        out: list[dict[str, Any]] = []
        paths = sorted(catalog_path.glob("*.yaml")) + sorted(catalog_path.glob("*.yml"))
        for path in paths:
            if path.name.startswith("_"):
                continue
            stem = path.stem.lower()
            if stem in frozenset({"readme", "index"}):
                continue
            out.append(_load_mcp_fragment_file(path))
        return out

    return _load_mcp_bundle_file(catalog_path)


def load_mcp_providers_catalog_merged(primary: Path) -> list[dict[str, Any]]:
    """Load the primary catalog plus optional extra directories from ``AGENTIC_EXTRA_MCP_PROVIDERS_PATH``."""

    out = load_mcp_providers_catalog(primary)
    extra_raw = os.getenv(_EXTRA_MCP_PATH_ENV, "").strip()
    if not extra_raw:
        return _assert_unique_mcp_ids(out)

    sep = ";" if os.name == "nt" else ":"
    for part in extra_raw.split(sep):
        p = Path(part.strip()).expanduser()
        if not str(p) or not p.exists():
            continue
        out.extend(load_mcp_providers_catalog(p))

    return _assert_unique_mcp_ids(out)


def _assert_unique_mcp_ids(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ids = [str(p.get("id", "")).strip() for p in entries]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate MCP provider 'id' across MCP catalog files")
    return entries


def _refs_from_mapping(item: dict[str, Any]) -> list[str]:
    ref = item.get("ref")
    refs = item.get("refs")
    out: list[str] = []
    if ref is not None and str(ref).strip():
        out.append(str(ref).strip())
    if isinstance(refs, list):
        out.extend(str(x).strip() for x in refs if x is not None and str(x).strip())
    if not out:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r} must define non-empty 'ref' or 'refs'",
        )
    return out


def resolve_workflow_mcp_refs(
    raw_items: list[Any],
    catalog_entries: list[dict[str, Any]],
) -> list[str]:
    """Turn workflow ``mcp_providers`` entries into CrewAI ``mcps`` URL/slug strings (order preserved, de-duped)."""
    if not raw_items:
        return []

    catalog_by_id = {str(p["id"]).strip(): p for p in catalog_entries}

    resolved: list[str] = []
    seen: set[str] = set()
    for i, item in enumerate(raw_items):
        refs: list[str]
        if isinstance(item, str):
            pid = item.strip()
            if not pid or pid not in catalog_by_id:
                known = ", ".join(sorted(catalog_by_id))
                raise ValueError(
                    f"workflow.mcp_providers[{i}] unknown catalog id {pid!r}. Known: {known}",
                )
            refs = _refs_from_mapping(catalog_by_id[pid])
        elif isinstance(item, dict):
            refs = _refs_from_mapping(item)
        else:
            raise ValueError(f"workflow.mcp_providers[{i}] must be a string id or a mapping")

        for r in refs:
            expanded = substitute_mcp_env_vars(r)
            if expanded and expanded not in seen:
                seen.add(expanded)
                resolved.append(expanded)
    return resolved


def _format_mcp_catalog_entry(p: dict[str, Any]) -> str:
    pid = str(p.get("id", "")).strip()
    desc = str(p.get("description", "")).strip()
    hint = str(p.get("planner_hint", "")).strip()
    parts = [f"- id: {pid!r}"]
    if desc:
        parts.append(f"  description: {desc!r}")
    if hint:
        parts.append(f"  planner_hint: {hint!r}")
    return "\n".join(parts)


def mcp_catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return ""
    ordered = sorted(entries, key=lambda p: str(p.get("id", "")).strip().lower())
    return "### MCP providers (tools via CrewAI `mcps`)\n" + "\n".join(
        _format_mcp_catalog_entry(p) for p in ordered
    )


def deepcopy_mcp_catalog_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(entry)
