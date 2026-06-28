from __future__ import annotations

import pytest

from orchestration.step_context import STEP_CONTEXT_MARKER, prepare_step_description


@pytest.mark.unit
def test_prepare_step_description_no_prior() -> None:
    desc = "Research the topic."
    assert prepare_step_description(desc, "") == desc


@pytest.mark.unit
def test_prepare_step_description_appends_prior() -> None:
    desc = "Write a brief."
    prior = "Key finding: agents orchestrate tasks."
    out = prepare_step_description(desc, prior)
    assert out.startswith(desc)
    assert STEP_CONTEXT_MARKER in out
    assert "Key finding" in out


@pytest.mark.unit
def test_prepare_step_description_skips_when_marker_present() -> None:
    desc = f"Task{STEP_CONTEXT_MARKER}already injected"
    prior = "new output"
    assert prepare_step_description(desc, prior) == desc
