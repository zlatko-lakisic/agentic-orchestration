"""YAML catalog of RAG sources (symmetric with MCP / agent skills).

Backends (honesty labels):
- ``sqlite-fts`` — **shipped** (wraps ``orchestration.knowledge_base``)
- ``embedding`` — **planned** (hard-fails at load; no silent FTS fallback)
- ``hybrid`` — **planned** (hard-fails at load)
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

_EXTRA_RAG_PATH_ENV = "AGENTIC_EXTRA_RAG_SOURCES_PATH"
_SKIP_STEMS = frozenset({"readme", "index"})

SHIPPED_BACKENDS = frozenset({"sqlite-fts"})
PLANNED_BACKENDS = frozenset({"embedding", "hybrid"})
KNOWN_BACKENDS = SHIPPED_BACKENDS | PLANNED_BACKENDS
KNOWN_MODES = frozenset({"inject", "tool"})


def _load_rag_bundle_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("rag_sources")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'rag_sources' must be a non-empty list in bundle catalog {path}",
        )
    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: rag_sources[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"{path}: rag_sources[{i}] is missing non-empty 'id'")
        entry = dict(item)
        entry["_source_path"] = str(path.resolve())
        out.append(entry)
    return out


def _load_rag_fragment_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping (one RAG source per file)")
    pid = str(raw.get("id", "")).strip()
    if not pid:
        raise ValueError(f"{path}: missing non-empty 'id' at file root")
    entry = dict(raw)
    entry["_source_path"] = str(path.resolve())
    return entry


def _rag_yaml_paths_in_dir(catalog_path: Path) -> list[Path]:
    paths = sorted(catalog_path.glob("*.yaml")) + sorted(catalog_path.glob("*.yml"))
    for sub in sorted(catalog_path.iterdir()):
        if not sub.is_dir() or sub.name.startswith("_"):
            continue
        paths.extend(sorted(sub.glob("*.yaml")))
        paths.extend(sorted(sub.glob("*.yml")))
    out: list[Path] = []
    for path in paths:
        if path.name.startswith("_"):
            continue
        if path.stem.lower() in _SKIP_STEMS:
            continue
        out.append(path)
    return out


def _resolve_entry_path(entry: dict[str, Any], file_ref: str) -> Path:
    rel = str(file_ref).strip()
    path = Path(rel).expanduser()
    if path.is_absolute():
        return path
    source = Path(str(entry.get("_source_path", ""))).resolve().parent
    return (source / path).resolve()


def validate_rag_source_entry(entry: dict[str, Any]) -> dict[str, Any]:
    """Validate one catalog entry; raise ValueError / NotImplementedError on failure."""
    eid = str(entry.get("id", "")).strip()
    if not eid:
        raise ValueError("RAG source entry missing non-empty 'id'")

    backend = str(entry.get("backend", "")).strip().lower()
    if backend not in KNOWN_BACKENDS:
        raise ValueError(
            f"RAG source {eid!r}: unknown backend {backend!r}. "
            f"Known: {', '.join(sorted(KNOWN_BACKENDS))}",
        )
    if backend in PLANNED_BACKENDS:
        raise NotImplementedError(
            f"RAG source {eid!r}: backend {backend!r} is **planned** (not shipped). "
            "Use backend 'sqlite-fts'. Embedding/hybrid will hard-fail at load — "
            "never silently fall back to FTS.",
        )

    mode = str(entry.get("mode", "inject")).strip().lower() or "inject"
    if mode not in KNOWN_MODES:
        raise ValueError(
            f"RAG source {eid!r}: unknown mode {mode!r}. "
            f"Known: {', '.join(sorted(KNOWN_MODES))}",
        )

    path_raw = entry.get("path")
    path_str = str(path_raw).strip() if path_raw is not None else ""
    # Empty path = default orchestrator KB resolved at query time (sqlite-fts only).
    if path_str:
        resolved = _resolve_entry_path(entry, path_str)
        if not resolved.exists() and not resolved.parent.is_dir():
            raise ValueError(
                f"RAG source {eid!r}: path {path_str!r} does not exist "
                f"(resolved {resolved}) and parent directory is missing",
            )
        entry = dict(entry)
        entry["_resolved_path"] = str(resolved)

    top_k = entry.get("top_k", 5)
    try:
        top_k_i = int(top_k)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"RAG source {eid!r}: top_k must be an int") from exc
    if top_k_i < 1 or top_k_i > 50:
        raise ValueError(f"RAG source {eid!r}: top_k must be between 1 and 50")

    max_tokens = entry.get("max_tokens", 2000)
    try:
        max_tokens_i = int(max_tokens)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"RAG source {eid!r}: max_tokens must be an int") from exc
    if max_tokens_i < 50 or max_tokens_i > 100_000:
        raise ValueError(f"RAG source {eid!r}: max_tokens must be between 50 and 100000")

    out = dict(entry)
    out["id"] = eid
    out["backend"] = backend
    out["mode"] = mode
    out["top_k"] = top_k_i
    out["max_tokens"] = max_tokens_i
    if not isinstance(out.get("filters"), dict):
        out["filters"] = {}
    return out


def _assert_unique_rag_ids(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ids = [str(p.get("id", "")).strip() for p in entries]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate rag source 'id' across rag catalog files")
    return entries


def load_rag_sources_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load RAG source templates from a directory or bundle file."""
    if not catalog_path.exists():
        return []

    raw_entries: list[dict[str, Any]]
    if catalog_path.is_dir():
        raw_entries = [_load_rag_fragment_file(path) for path in _rag_yaml_paths_in_dir(catalog_path)]
    else:
        raw_entries = _load_rag_bundle_file(catalog_path)

    validated = [validate_rag_source_entry(e) for e in raw_entries]
    return _assert_unique_rag_ids(validated)


def load_rag_sources_catalog_merged(primary: Path) -> list[dict[str, Any]]:
    """Load the primary catalog plus optional extra paths from env."""
    out = load_rag_sources_catalog(primary)
    extra_raw = os.getenv(_EXTRA_RAG_PATH_ENV, "").strip()
    if not extra_raw:
        return _assert_unique_rag_ids(out)

    sep = ";" if os.name == "nt" else ":"
    for part in extra_raw.split(sep):
        p = Path(part.strip()).expanduser()
        if not str(p) or not p.exists():
            continue
        out.extend(load_rag_sources_catalog(p))

    return _assert_unique_rag_ids(out)


def rag_catalog_by_id(entries: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(e.get("id", "")).strip(): e for e in entries if str(e.get("id", "")).strip()}


def resolve_rag_ids(
    rag_ids: list[str],
    catalog: list[dict[str, Any]],
    *,
    context: str = "plan",
) -> list[dict[str, Any]]:
    """Resolve catalog entries for ``rag_ids``. Unknown ids **hard-fail**."""
    by_id = rag_catalog_by_id(catalog)
    out: list[dict[str, Any]] = []
    unknown: list[str] = []
    for rid in rag_ids:
        sid = str(rid).strip()
        if not sid:
            continue
        if sid not in by_id:
            unknown.append(sid)
            continue
        out.append(dict(by_id[sid]))
    if unknown:
        known = ", ".join(sorted(by_id)) or "(empty catalog)"
        raise ValueError(
            f"Unknown rag_id(s) in {context}: {unknown!r}. Known: {known}",
        )
    return out


def _format_rag_catalog_entry(entry: dict[str, Any]) -> str:
    eid = str(entry.get("id", "")).strip()
    desc = str(entry.get("description") or entry.get("planner_hint") or "").strip()
    mode = str(entry.get("mode", "inject")).strip()
    backend = str(entry.get("backend", "")).strip()
    one_line = desc.split("\n", 1)[0].strip() if desc else "(no description)"
    if len(one_line) > 160:
        one_line = one_line[:157] + "…"
    return f"- id: {eid}  mode: {mode}  backend: {backend}  — {one_line}"


def rag_catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return ""
    ordered = sorted(entries, key=lambda p: str(p.get("id", "")).strip().lower())
    return "### RAG sources (retrieval corpora)\n" + "\n".join(
        _format_rag_catalog_entry(p) for p in ordered
    )

