from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.run_trace import (
    append_run_event,
    events_to_mermaid,
    list_recent_trace_runs,
    read_run_events,
)


@pytest.mark.unit
def test_append_and_read_run_events(tmp_path: Path) -> None:
    append_run_event(tmp_path, "runabc", "request_start", actor="engine", message="hi")
    append_run_event(
        tmp_path,
        "runabc",
        "plan",
        actor="planner",
        message="two steps",
        detail={"agents": ["a1"], "mcps": ["m1"], "skills": ["s1"]},
    )
    append_run_event(tmp_path, "runabc", "run_end", actor="orchestrator", message="ok")
    events = read_run_events(tmp_path, "runabc")
    assert len(events) == 3
    assert events[0]["kind"] == "request_start"
    assert events[1]["detail"]["agents"] == ["a1"]
    mermaid = events_to_mermaid(events)
    assert "sequenceDiagram" in mermaid
    assert "planner" in mermaid
    listed = list_recent_trace_runs(tmp_path, limit=10)
    assert listed and listed[0]["runId"] == "runabc"
