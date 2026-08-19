"""Preemption hook tests."""

from __future__ import annotations

import pytest

from orchestration.execution_queue_preempt import (
    invoke_preempt_hook,
    register_preempt_hook,
    reset_preempt_hooks_for_tests,
    unregister_preempt_hook,
)


@pytest.fixture(autouse=True)
def _reset() -> None:
    reset_preempt_hooks_for_tests()
    yield
    reset_preempt_hooks_for_tests()


@pytest.mark.unit
def test_preempt_hook_invoked() -> None:
    hits: list[str] = []

    def cb(run_id: str) -> None:
        hits.append(run_id)

    register_preempt_hook("run-1", cb)
    assert invoke_preempt_hook("run-1")
    assert hits == ["run-1"]
    unregister_preempt_hook("run-1")
    assert not invoke_preempt_hook("run-1")
