"""Progress sink: context-bound callbacks for daemon clients."""

from __future__ import annotations

from orchestration.progress_sink import emit_progress, progress_callback

import pytest

pytestmark = pytest.mark.unit


def test_emit_progress_is_a_no_op_without_a_callback() -> None:
    emit_progress("ignored")


def test_progress_callback_receives_lines() -> None:
    lines: list[str] = []
    with progress_callback(lines.append):
        emit_progress("  hello  ")
        emit_progress("")
        emit_progress("world")
    emit_progress("after")
    assert lines == ["hello", "world"]


def test_progress_callback_swallows_sink_errors() -> None:
    def boom(_msg: str) -> None:
        raise RuntimeError("sink down")

    with progress_callback(boom):
        emit_progress("still ok")
