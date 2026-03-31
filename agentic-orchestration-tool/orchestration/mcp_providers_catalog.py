from __future__ import annotations

import copy
import json
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


def _streamable_http_mcps_entry(item: dict[str, Any]) -> dict[str, Any] | None:
    """Build a CrewAI-style streamable HTTP MCP config (``url``, ``transport``, optional ``headers``)."""
    raw_sh = item.get("streamable_http")
    if not isinstance(raw_sh, dict) or not raw_sh:
        return None

    raw_url = str(raw_sh.get("url", "")).strip()
    if not raw_url:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r}: streamable_http.url is required when "
            f"streamable_http is set",
        )
    url = substitute_mcp_env_vars(raw_url).strip().rstrip("/")

    headers: dict[str, str] = {}
    headers_raw = raw_sh.get("headers")
    if isinstance(headers_raw, dict):
        for hk, hv in headers_raw.items():
            key = str(hk).strip()
            if not key:
                continue
            headers[key] = substitute_mcp_env_vars(str(hv))

    return {
        "url": url,
        "transport": "streamable-http",
        **({"headers": headers} if headers else {}),
    }


def _string_refs_from_mapping(item: dict[str, Any]) -> list[str]:
    ref = item.get("ref")
    refs = item.get("refs")
    out: list[str] = []
    if ref is not None and str(ref).strip():
        out.append(str(ref).strip())
    if isinstance(refs, list):
        out.extend(str(x).strip() for x in refs if x is not None and str(x).strip())
    if not out:
        raise ValueError(
            f"MCP provider {item.get('id', '?')!r} must define non-empty 'ref'/'refs', "
            f"or a 'streamable_http' block",
        )
    return out


def _mcps_entries_from_mapping(item: dict[str, Any]) -> list[Any]:
    sh = _streamable_http_mcps_entry(item)
    if sh is not None:
        return [sh]
    strings = _string_refs_from_mapping(item)
    return strings


def _mcps_dedupe_key(entry: Any) -> str:
    if isinstance(entry, str):
        return f"s:{entry}"
    if isinstance(entry, dict):
        return f"d:{json.dumps(entry, sort_keys=True)}"
    return f"o:{repr(entry)}"


def mcps_list_fingerprint(resolved_mcps: list[Any]) -> tuple[str, ...]:
    """Stable tuple identity for a resolved ``mcps`` list (order-preserving)."""
    return tuple(_mcps_dedupe_key(e) for e in resolved_mcps)


def resolve_workflow_mcp_refs(
    raw_items: list[Any],
    catalog_entries: list[dict[str, Any]],
) -> list[Any]:
    """Resolve workflow ``mcp_providers`` into CrewAI ``mcps`` entries (URL strings and/or transport dicts)."""
    if not raw_items:
        return []

    catalog_by_id = {str(p["id"]).strip(): p for p in catalog_entries}

    resolved: list[Any] = []
    seen: set[str] = set()

    for i, item in enumerate(raw_items):
        entries: list[Any]
        if isinstance(item, str):
            pid = item.strip()
            if not pid or pid not in catalog_by_id:
                known = ", ".join(sorted(catalog_by_id))
                raise ValueError(
                    f"workflow.mcp_providers[{i}] unknown catalog id {pid!r}. Known: {known}",
                )
            entries = _mcps_entries_from_mapping(catalog_by_id[pid])
        elif isinstance(item, dict):
            entries = _mcps_entries_from_mapping(item)
        else:
            raise ValueError(f"workflow.mcp_providers[{i}] must be a string id or a mapping")

        for ent in entries:
            if isinstance(ent, str):
                expanded = substitute_mcp_env_vars(ent)
                if not expanded:
                    continue
                key = _mcps_dedupe_key(expanded)
                if key not in seen:
                    seen.add(key)
                    resolved.append(expanded)
            else:
                key = _mcps_dedupe_key(ent)
                if key not in seen:
                    seen.add(key)
                    resolved.append(ent)

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
    sh = p.get("streamable_http")
    if isinstance(sh, dict) and sh:
        parts.append("  transport: streamable-http (+ optional headers from env)")
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
