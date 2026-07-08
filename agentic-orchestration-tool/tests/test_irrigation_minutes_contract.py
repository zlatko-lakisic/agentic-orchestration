"""Regression: HA watering MINUTES: contract must not attach plant_knowledge MCP."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType

import pytest

from orchestration.goal_format_hints import (
    apply_web_prose_goal_if_enabled,
    goal_requests_irrigation_minutes_line,
    goal_requires_machine_readable_only,
)
from orchestration.mcp_providers_catalog import suggest_mcp_ids_from_user_goal
from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak


def _load_goal_format_module() -> ModuleType:
    return __import__("orchestration.goal_format_hints", fromlist=["*"])


def _ha_east_lawn_goal() -> str:
    return (
        "[system]\n"
        "You are the irrigation decision-maker for a residential garden zone. "
        "Your goal: keep the zone's plants healthy while never applying more water than they need.\n"
        "Missing or unknown facts are provided with defaults like 0 or unknown. "
        "Use plant knowledge you already have for water requirements; "
        "Home Assistant only supplies sensor and zone facts.\n"
        "Output format: your reasoning in at most 120 words, then a final line exactly:\n"
        "MINUTES: <integer 0-25>\n\n"
        "---\n\n"
        "[user]\n"
        "Zone: East Lawn\n"
        'Zone profile: {"plant_profile": "Tall fescue lawn grass", "area_sqm": 60}\n'
        "Days since last irrigation: 2\n"
    )


def _ha_kitchen_lawn_goal() -> str:
    return (
        "[system]\n"
        "You are the irrigation decision-maker for a residential garden zone.\n"
        "Output format: your reasoning in at most 120 words, then a final line exactly:\n"
        "MINUTES: <integer 0-25>\n\n"
        "---\n\n"
        "[user]\n"
        "Zone: Kitchen Lawn\n"
        'Zone profile: {"plant_profile": "Two lawn sections, mostly grass with a few lilies between"}\n'
    )


def _plant_knowledge_entry() -> dict:
    return {
        "id": "plant_knowledge",
        "match_keywords_only": True,
        "planner_hint": (
            "Attach only when looking up WUCOLS plant factor or ET0 mm/week. "
            "Do NOT attach for Home Assistant MINUTES: line clients."
        ),
        "user_goal_keywords": [
            "plant water",
            "wucols",
            "et0",
            "get_water_requirement_mm",
        ],
    }


@pytest.mark.unit
def test_goal_requests_irrigation_minutes_line_detects_ha_prompt() -> None:
    assert goal_requests_irrigation_minutes_line(_ha_east_lawn_goal())
    assert goal_requests_irrigation_minutes_line(_ha_kitchen_lawn_goal())
    assert goal_requires_machine_readable_only(_ha_east_lawn_goal())
    assert goal_requires_machine_readable_only(_ha_kitchen_lawn_goal())


@pytest.mark.unit
def test_web_prose_not_applied_to_minutes_goal(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_WEB_PROSE_DELIVERABLE", "1")
    goal = _ha_east_lawn_goal()
    assert apply_web_prose_goal_if_enabled(goal) == goal


@pytest.mark.unit
def test_suggest_mcp_does_not_attach_when_machine_readable_guard_would_skip() -> None:
    """Document expected planner path: machine-readable → skip _maybe_augment_mcp."""
    assert goal_requires_machine_readable_only(_ha_east_lawn_goal())
    # Even if keywords somehow matched, MAX guard is machine-readable, not keyword alone.
    ids = suggest_mcp_ids_from_user_goal(_ha_east_lawn_goal(), [_plant_knowledge_entry()])
    assert "plant_knowledge" not in ids


@pytest.mark.unit
def test_tool_call_leak_matches_plant_knowledge_shape() -> None:
    leaked = (
        '{\n  "name": "plant_knowledge_mcp_plant_knowledge_svc_cluster_local_8_ab8816c0",\n'
        '  "parameters": {"query": "tall fescue lawn grass"}\n}'
    )
    assert looks_like_mcp_tool_call_leak(leaked)
    assert looks_like_mcp_tool_call_leak(
        'name: analyze\nparameters: {"query": "tall fescue lawn grass"}'
    )


@pytest.mark.unit
def test_narrow_plant_knowledge_keywords_do_not_match_generic_irrigation() -> None:
    ids = suggest_mcp_ids_from_user_goal(
        "Plan an irrigation schedule for my lawn this week.",
        [_plant_knowledge_entry()],
    )
    assert "plant_knowledge" not in ids


@pytest.mark.unit
def test_trivial_plan_source_mentions_minutes_contract() -> None:
    """Sanity: single-agent trivial plan branch for MINUTES goals exists in source."""
    src = (
        Path(__file__).resolve().parents[1]
        / "orchestration"
        / "dynamic_planner.py"
    ).read_text(encoding="utf-8")
    assert "goal_requests_irrigation_minutes_line" in src
    assert "MINUTES: <0-25>" in src or "MINUTES:" in src
    assert "HA MINUTES: contract" in src
