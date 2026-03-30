from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class WorkflowCatalogEntry:
    """Metadata for one workflow file, used by the router LLM."""

    id: str
    path: Path
    summary: str
    description: str
    good_for: tuple[str, ...]


def _workflow_yaml_paths(config_dir: Path) -> list[Path]:
    if not config_dir.is_dir():
        raise NotADirectoryError(f"Config directory does not exist: {config_dir}")
    seen: set[Path] = set()
    paths: list[Path] = []
    for pattern in ("*.yaml", "*.yml"):
        for path in sorted(config_dir.glob(pattern)):
            resolved = path.resolve()
            if resolved not in seen:
                seen.add(resolved)
                paths.append(path)
    return paths


def _parse_router_entry(path: Path) -> WorkflowCatalogEntry | None:
    """Return a catalog entry if the file defines meta + workflow; else None."""
    with path.open("r", encoding="utf-8") as file:
        raw: dict[str, Any] = yaml.safe_load(file) or {}

    if not isinstance(raw, dict):
        return None

    meta = raw.get("meta")
    workflow = raw.get("workflow")
    if not isinstance(meta, dict) or not isinstance(workflow, dict):
        return None

    if meta.get("router_include") is False:
        return None

    wid = str(meta.get("id", "")).strip()
    summary = str(meta.get("summary", "")).strip()
    description = str(meta.get("description", "")).strip()
    good_for = meta.get("good_for", [])

    if not wid:
        raise ValueError(f"Workflow file {path} has 'meta' but missing non-empty 'meta.id'.")
    if not summary:
        raise ValueError(f"Workflow file {path} (meta.id={wid!r}) needs non-empty 'meta.summary'.")
    if not isinstance(good_for, list) or not good_for:
        raise ValueError(
            f"Workflow file {path} (meta.id={wid!r}) needs a non-empty 'meta.good_for' list."
        )

    good_for_t = tuple(str(x).strip() for x in good_for if str(x).strip())
    if not good_for_t:
        raise ValueError(
            f"Workflow file {path} (meta.id={wid!r}) needs at least one non-empty good_for entry."
        )

    return WorkflowCatalogEntry(
        id=wid,
        path=path.resolve(),
        summary=summary,
        description=description.strip() or summary,
        good_for=good_for_t,
    )


def discover_workflow_catalog(config_dir: Path) -> list[WorkflowCatalogEntry]:
    """Scan a directory for workflow YAML files that include a ``meta`` block.

    Files must define both top-level ``meta`` and ``workflow`` to be routable.
    Omit ``meta`` (or set ``meta.router_include: false``) for files only used with ``--config``.
    """
    entries: list[WorkflowCatalogEntry] = []
    for path in _workflow_yaml_paths(config_dir):
        try:
            entry = _parse_router_entry(path)
        except yaml.YAMLError as exc:
            raise ValueError(f"Invalid YAML in workflow file: {path}") from exc
        if entry is not None:
            entries.append(entry)

    if not entries:
        raise ValueError(
            f"No routable workflows found under {config_dir}. "
            "Add a top-level 'meta:' block (id, summary, good_for) next to 'workflow:'."
        )

    seen_ids: set[str] = set()
    for e in entries:
        if e.id in seen_ids:
            raise ValueError(f"Duplicate router workflow id {e.id!r} in catalog scan.")
        seen_ids.add(e.id)

    return entries


def get_catalog_entry_by_id(
    entries: list[WorkflowCatalogEntry], workflow_id: str
) -> WorkflowCatalogEntry | None:
    wid = workflow_id.strip()
    for entry in entries:
        if entry.id == wid:
            return entry
    return None
