"""Unit tests for worker log prefixing (K8s Phase 2.2)."""

from __future__ import annotations

import io

import pytest

from orchestration.worker_logging import (
    _PrefixedTextIO,
    worker_log,
    worker_log_context,
    worker_log_prefix,
)


@pytest.mark.unit
def test_worker_log_prefix() -> None:
    assert worker_log_prefix(run_id="run1", step_id="step_a") == "[run1/step_a] "


@pytest.mark.unit
def test_prefixed_text_io_multiline() -> None:
    buf = io.StringIO()
    stream = _PrefixedTextIO(buf, "[r/s] ")
    stream.write("line one\nline two\npartial")
    stream.flush()
    assert buf.getvalue() == "[r/s] line one\n[r/s] line two\n[r/s] partial"


@pytest.mark.unit
def test_worker_log_context_prefixes_stderr(monkeypatch: pytest.MonkeyPatch) -> None:
    import sys

    raw = io.StringIO()
    monkeypatch.setattr(sys, "stderr", raw)
    monkeypatch.setattr(sys, "stdout", io.StringIO())
    with worker_log_context(run_id="abc", step_id="s1"):
        print("hello stderr", file=sys.stderr)
        print("hello stdout")
    assert raw.getvalue() == "[abc/s1] hello stderr\n"


@pytest.mark.unit
def test_worker_log_writes_prefixed_line() -> None:
    raw = io.StringIO()
    worker_log("started", run_id="r", step_id="s", file=raw)
    assert raw.getvalue() == "[r/s] started\n"
