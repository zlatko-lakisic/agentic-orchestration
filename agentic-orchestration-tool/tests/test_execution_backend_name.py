from __future__ import annotations

import pytest

from orchestration.backends.factory import execution_backend_name_from_env


@pytest.mark.unit
@pytest.mark.parametrize(
    ("env", "expected"),
    [
        (None, "inprocess"),
        ("", "inprocess"),
        ("crewai", "inprocess"),
        ("subprocess", "subprocess"),
        ("k8s", "kubernetes"),
    ],
)
def test_execution_backend_name_from_env(
    monkeypatch: pytest.MonkeyPatch,
    env: str | None,
    expected: str,
) -> None:
    if env is None:
        monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    else:
        monkeypatch.setenv("AGENTIC_EXECUTION_BACKEND", env)
    assert execution_backend_name_from_env() == expected
