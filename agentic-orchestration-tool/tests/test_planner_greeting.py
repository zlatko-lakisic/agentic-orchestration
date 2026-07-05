"""Tests for planner greeting prompt helpers."""

from orchestration.planner_greeting import (
    _greeting_system_prompt,
    planner_greet_enabled,
)


def test_planner_greet_enabled_default_on(monkeypatch) -> None:
    monkeypatch.delenv("AGENTIC_WEB_PLANNER_GREET", raising=False)
    assert planner_greet_enabled() is True


def test_planner_greet_can_disable(monkeypatch) -> None:
    monkeypatch.setenv("AGENTIC_WEB_PLANNER_GREET", "0")
    assert planner_greet_enabled() is False


def test_greeting_system_prompt_includes_catalog(monkeypatch) -> None:
    monkeypatch.setenv("AGENTIC_EDGE_PLATFORM", "jetson")
    text = _greeting_system_prompt(catalog_doc="- id: test_agent\n  role: helper")
    assert "jetson" in text
    assert "test_agent" in text
    assert "no JSON" in text


def test_greeting_system_prompt_includes_user_name(monkeypatch) -> None:
    monkeypatch.setenv("AGENTIC_WEB_USER_DISPLAY_NAME", "Zlatko")
    text = _greeting_system_prompt(catalog_doc="")
    assert "Zlatko" in text
