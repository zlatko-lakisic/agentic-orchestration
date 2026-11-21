"""planner_exclude drops client-direct providers from dynamic planning."""

from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.agent_providers_catalog import (
    catalog_for_planner_prompt,
    entries_for_planner,
    load_agent_providers_catalog,
    planner_exclude_enabled,
)
from orchestration.dynamic_planner import _resolve_social_responder_id

pytestmark = pytest.mark.unit

TOOL_ROOT = Path(__file__).resolve().parents[1]


def test_planner_exclude_helpers() -> None:
    assert planner_exclude_enabled({"planner_exclude": True})
    assert planner_exclude_enabled({"planner_exclude": "1"})
    assert not planner_exclude_enabled({"planner_exclude": False})
    assert not planner_exclude_enabled({"id": "x"})


def test_catalog_for_planner_prompt_omits_excluded() -> None:
    text = catalog_for_planner_prompt(
        [
            {
                "id": "media_render_short",
                "type": "deterministic",
                "role": "r",
                "goal": "g",
                "backstory": "b",
                "planner_exclude": True,
                "planner_hint": "never",
            },
            {
                "id": "ollama_hermes3",
                "type": "ollama",
                "role": "chat",
                "goal": "g",
                "backstory": "b",
                "planner_hint": "chat",
            },
        ]
    )
    assert "media_render_short" not in text
    assert "ollama_hermes3" in text


def test_social_responder_skips_excluded() -> None:
    pid = _resolve_social_responder_id(
        [
            {
                "id": "media_render_short",
                "type": "deterministic",
                "planner_exclude": True,
            },
            {"id": "ollama_hermes3", "type": "ollama"},
        ]
    )
    assert pid == "ollama_hermes3"


def test_media_render_short_catalog_loads_and_is_excluded() -> None:
    for rel in (
        "config/agent_providers",
        "config/agent_providers_jetson",
    ):
        entries = load_agent_providers_catalog(TOOL_ROOT / rel)
        match = [e for e in entries if e.get("id") == "media_render_short"]
        assert match, f"missing media_render_short in {rel}"
        assert planner_exclude_enabled(match[0])
        assert match[0]["type"] == "deterministic"
        assert "media_render" in str(match[0].get("entrypoint") or "")
        planned = entries_for_planner(entries)
        assert all(e.get("id") != "media_render_short" for e in planned)
        prompt = catalog_for_planner_prompt(entries)
        assert "media_render_short" not in prompt
