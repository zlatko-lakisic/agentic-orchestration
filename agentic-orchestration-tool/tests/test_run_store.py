from __future__ import annotations

import json

import pytest

from orchestration.run_store import FileSystemRunStore
from orchestration.backends.base import StepResult


@pytest.mark.unit
def test_filesystem_run_store_roundtrip(tmp_path) -> None:
    store = FileSystemRunStore(tmp_path)
    result = StepResult(
        run_id="run1",
        step_id="research_topic",
        exit_code=0,
        result_text="done",
    )
    store.write_step_result("run1", "research_topic", result)
    path = store.step_result_path("run1", "research_topic")
    assert path.is_file()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["result_text"] == "done"

    loaded = store.read_step_result("run1", "research_topic")
    assert loaded is not None
    assert loaded.result_text == "done"
    assert loaded.exit_code == 0
