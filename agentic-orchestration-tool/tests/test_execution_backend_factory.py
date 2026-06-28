from __future__ import annotations

import pytest

from orchestration.backends.factory import execution_backend_from_env


@pytest.mark.unit
def test_execution_backend_default_is_inprocess(monkeypatch: pytest.MonkeyPatch) -> None:
    pytest.importorskip("crewai")
    monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    backend = execution_backend_from_env()
    assert backend.name == "inprocess"
    assert backend.supports_distributed_steps is False


@pytest.mark.unit
@pytest.mark.parametrize(
    ("value", "expected_name", "distributed"),
    [
        ("crewai", "inprocess", False),
        ("subprocess", "subprocess", True),
    ],
)
def test_execution_backend_aliases(
    monkeypatch: pytest.MonkeyPatch,
    value: str,
    expected_name: str,
    distributed: bool,
) -> None:
    pytest.importorskip("crewai")
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", value)
    backend = execution_backend_from_env()
    assert backend.name == expected_name
    assert backend.supports_distributed_steps is distributed


@pytest.mark.unit
def test_execution_backend_unknown_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", "not-a-backend")
    with pytest.raises(ValueError, match="Unknown AGENTIC_EXECUTION_BACKEND"):
        execution_backend_from_env()
