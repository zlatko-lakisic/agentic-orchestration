from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import yaml


def load_providers_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    if not catalog_path.exists():
        raise FileNotFoundError(f"Providers catalog not found: {catalog_path}")

    with catalog_path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("providers")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'providers' must be a non-empty list in {catalog_path}",
        )

    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"providers[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"providers[{i}] is missing non-empty 'id'")
        out.append(dict(item))

    ids = [str(p.get("id", "")).strip() for p in out]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate provider 'id' in providers catalog")

    return out


def catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for p in entries:
        pid = str(p.get("id", "")).strip()
        typ = str(p.get("type", "")).strip()
        hint = str(p.get("planner_hint", "")).strip()
        role = str(p.get("role", "")).strip()
        goal = str(p.get("goal", "")).strip()
        model = str(p.get("model", "")).strip()
        parts = [
            f"- id: {pid!r}",
            f"  type: {typ!r}",
            f"  model: {model!r}",
            f"  role: {role!r}",
            f"  goal: {goal!r}",
        ]
        if hint:
            parts.append(f"  planner_hint: {hint!r}")
        lines.append("\n".join(parts))
    return "\n".join(lines)


def deepcopy_provider(entry: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(entry)
