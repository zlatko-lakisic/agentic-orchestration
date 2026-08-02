"""CrewAI must not block daemon paths on interactive tracing prompts."""

from __future__ import annotations

import orchestration.crewai_noninteractive as ni


def test_configure_sets_crewai_testing_env(monkeypatch) -> None:
    monkeypatch.delenv("CREWAI_TESTING", raising=False)
    monkeypatch.delenv("CREWAI_TRACING_ENABLED", raising=False)
    ni._CONFIGURED = False

    result = ni.configure_crewai_noninteractive(force=True)

    assert result["configured"] is True
    assert result["crewai_testing"] is True
    assert ni.os.environ["CREWAI_TESTING"] == "true"
    assert ni.os.environ["CREWAI_TRACING_ENABLED"] == "false"


def test_configure_is_idempotent(monkeypatch) -> None:
    monkeypatch.setenv("CREWAI_TESTING", "true")
    ni._CONFIGURED = False
    first = ni.configure_crewai_noninteractive(force=True)
    second = ni.configure_crewai_noninteractive()
    assert first["configured"] is True
    assert second.get("idempotent") is True


def test_configure_does_not_override_explicit_tracing_flag(monkeypatch) -> None:
    monkeypatch.setenv("CREWAI_TRACING_ENABLED", "true")
    ni._CONFIGURED = False
    ni.configure_crewai_noninteractive(force=True)
    assert ni.os.environ["CREWAI_TRACING_ENABLED"] == "true"
