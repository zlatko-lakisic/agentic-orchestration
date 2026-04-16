from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import yaml

from orchestration.hardware_profile import provider_required_architectures


def _load_single_catalog_file(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f) or {}

    entries = raw.get("agent_providers")
    if entries is None:
        entries = raw.get("providers")
    if not isinstance(entries, list) or not entries:
        raise ValueError(
            f"'agent_providers' (or legacy 'providers') must be a non-empty list in {path}",
        )

    out: list[dict[str, Any]] = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: agent_providers[{i}] must be a mapping")
        pid = str(item.get("id", "")).strip()
        if not pid:
            raise ValueError(f"{path}: agent_providers[{i}] is missing non-empty 'id'")
        out.append(dict(item))
    return out


def _load_agent_provider_fragment_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"{path}: root must be a mapping (one agent provider per file)")
    pid = str(raw.get("id", "")).strip()
    if not pid:
        raise ValueError(f"{path}: missing non-empty 'id' at file root")
    return dict(raw)


def load_agent_providers_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load agent-provider templates from a directory (one ``*.yaml`` per entry) or a legacy bundle file."""
    if not catalog_path.exists():
        raise FileNotFoundError(f"Agent providers catalog not found: {catalog_path}")

    if catalog_path.is_dir():
        out: list[dict[str, Any]] = []
        paths = sorted(catalog_path.glob("*.yaml")) + sorted(catalog_path.glob("*.yml"))
        for path in paths:
            if path.name.startswith("_"):
                continue
            stem = path.stem.lower()
            if stem in frozenset({"readme", "index"}):
                continue
            out.append(_load_agent_provider_fragment_file(path))
    else:
        out = _load_single_catalog_file(catalog_path)

    ids = [str(p.get("id", "")).strip() for p in out]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate agent provider 'id' across catalog files")

    return out


def _format_agent_provider_entry(p: dict[str, Any]) -> str:
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
        f"  architecture: {sorted(provider_required_architectures(p))!r}",
        f"  role: {role!r}",
        f"  goal: {goal!r}",
    ]
    if hint:
        parts.append(f"  planner_hint: {hint!r}")
    return "\n".join(parts)


def catalog_for_planner_prompt(entries: list[dict[str, Any]]) -> str:
    """Build planner-facing catalog text, grouped by backend."""

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
    anthropic_list = sorted(
        (p for p in entries if str(p.get("type", "")).strip().lower() == "anthropic"),
        key=_id_key,
    )
    huggingface_list = sorted(
        (p for p in entries if str(p.get("type", "")).strip().lower() == "huggingface"),
        key=_id_key,
    )
    vllm_list = sorted(
        (p for p in entries if str(p.get("type", "")).strip().lower() == "vllm"),
        key=_id_key,
    )
    jetstream_list = sorted(
        (p for p in entries if str(p.get("type", "")).strip().lower() == "jetstream"),
        key=_id_key,
    )
    other = sorted(
        (
            p
            for p in entries
            if str(p.get("type", "")).strip().lower()
            not in frozenset({"ollama", "openai", "anthropic", "huggingface", "vllm", "jetstream"})
        ),
        key=_id_key,
    )

    sections: list[str] = []

    if ollama:
        sections.append(
            "### Local — Ollama (`type: ollama`)\n"
            "Models below run on the workflow Ollama host. Treat every `id` as a first-class option: "
            "match **planner_hint**, **role**, and **goal** to the user's task (code, vision, chat, reasoning, etc.).\n"
            + "\n".join(_format_agent_provider_entry(p) for p in ollama)
        )
    if openai_list:
        sections.append(
            "### Cloud — OpenAI-compatible API (`type: openai`)\n"
            "Remote models via API; choose when the task aligns with these entries' hints and roles, same as for local.\n"
            + "\n".join(_format_agent_provider_entry(p) for p in openai_list)
        )
    if anthropic_list:
        sections.append(
            "### Cloud — Anthropic Claude (`type: anthropic`)\n"
            "Claude via the Anthropic API; choose when hints and roles fit the user's task, same as other cloud entries.\n"
            + "\n".join(_format_agent_provider_entry(p) for p in anthropic_list)
        )
    if huggingface_list:
        sections.append(
            "### Cloud — Hugging Face Hub (`type: huggingface`)\n"
            "Hub-hosted models via HF inference (LiteLLM); match **planner_hint** to task (chat, code, vision, MoE, etc.).\n"
            + "\n".join(_format_agent_provider_entry(p) for p in huggingface_list)
        )
    if vllm_list:
        sections.append(
            "### TPU/GPU endpoint — vLLM (`type: vllm`)\n"
            "OpenAI-compatible vLLM serving endpoints; picks should align with planner_hint and model size/latency needs.\n"
            + "\n".join(_format_agent_provider_entry(p) for p in vllm_list)
        )
    if jetstream_list:
        sections.append(
            "### TPU endpoint — JetStream (`type: jetstream`)\n"
            "OpenAI-compatible JetStream endpoints on TPU; use for low-latency TPU inference where available.\n"
            + "\n".join(_format_agent_provider_entry(p) for p in jetstream_list)
        )
    if other:
        sections.append(
            "### Other agent provider types\n"
            + "\n".join(_format_agent_provider_entry(p) for p in other)
        )

    return "\n\n".join(sections) if sections else ""


def deepcopy_agent_provider(entry: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(entry)


# Backward-compatible names (deprecated).
load_providers_catalog = load_agent_providers_catalog
deepcopy_provider = deepcopy_agent_provider
