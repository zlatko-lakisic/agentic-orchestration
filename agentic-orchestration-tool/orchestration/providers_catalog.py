from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import yaml


def _load_single_catalog_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("providers")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'providers' must be a non-empty list in {path}",
        )

    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: providers[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"{path}: providers[{i}] is missing non-empty 'id'")
        out.append(dict(item))
    return out


def _load_provider_fragment_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping (one provider per file)")
    pid = str(raw.get("id", "")).strip()
    if not pid:
        raise ValueError(f"{path}: missing non-empty 'id' at file root")
    return dict(raw)


def load_providers_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load provider templates from a directory (one ``*.yaml`` per provider) or a legacy bundle file."""
    if not catalog_path.exists():
        raise FileNotFoundError(f"Providers catalog not found: {catalog_path}")

    if catalog_path.is_dir():
        out: list[dict[str, Any]] = []
        paths = sorted(catalog_path.glob("*.yaml")) + sorted(catalog_path.glob("*.yml"))
        for path in paths:
            if path.name.startswith("_"):
                continue
            stem = path.stem.lower()
            if stem in frozenset({"readme", "index"}):
                continue
            out.append(_load_provider_fragment_file(path))
    else:
        out = _load_single_catalog_file(catalog_path)

    ids = [str(p.get("id", "")).strip() for p in out]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate provider 'id' across catalog files")

    return out


def _format_provider_entry(p: dict[str, Any]) -> str:
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
    return "\n".join(parts)


def catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    """Build planner-facing catalog text, grouped by backend so all providers get equal consideration."""

    def _id_key(p: dict[str, Any]) -> str:
        return str(p.get("id", "")).strip().lower()

    ollama = sorted(
        (p for p in entries if str(p.get("type", "")).strip().lower() == "ollama"),
        key=_id_key,
    )
    openai_list = sorted(
        (p for p in entries if str(p.get("type", "")).strip().lower() == "openai"),
        key=_id_key,
    )
    other = sorted(
        (
            p
            for p in entries
            if str(p.get("type", "")).strip().lower() not in frozenset({"ollama", "openai"})
        ),
        key=_id_key,
    )

    sections: list[str] = []

    if ollama:
        sections.append(
            "### Local — Ollama (`type: ollama`)\n"
            "Models below run on the workflow Ollama host. Treat every `id` as a first-class option: "
            "match **planner_hint**, **role**, and **goal** to the user's task (code, vision, chat, reasoning, etc.).\n"
            + "\n".join(_format_provider_entry(p) for p in ollama)
        )
    if openai_list:
        sections.append(
            "### Cloud — OpenAI-compatible API (`type: openai`)\n"
            "Use when **planner_hint** / task clearly fits these roles (e.g. broad research synthesis). "
            "Do not pick these only because the list is shorter — prefer Ollama when the task fits a local specialist.\n"
            + "\n".join(_format_provider_entry(p) for p in openai_list)
        )
    if other:
        sections.append(
            "### Other provider types\n"
            + "\n".join(_format_provider_entry(p) for p in other)
        )

    return "\n\n".join(sections) if sections else ""


def deepcopy_provider(entry: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(entry)
