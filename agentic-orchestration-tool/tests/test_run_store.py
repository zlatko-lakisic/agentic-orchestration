from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.backends.base import StepResult
from orchestration.run_store import (
    FileSystemRunStore,
    allocate_run_store_root,
    run_store_base_from_env,
    run_store_session,
    write_step_spec,
)


@pytest.mark.unit
def test_filesystem_run_store_roundtrip(tmp_path: Path) -> None:
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
    assert data["schema_version"] == "0.1"

    loaded = store.read_step_result("run1", "research_topic")
    assert loaded is not None
    assert loaded.result_text == "done"
    assert loaded.exit_code == 0


@pytest.mark.unit
def test_run_store_base_from_env_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_PATH", raising=False)
    assert run_store_base_from_env() is None


@pytest.mark.unit
def test_run_store_base_from_env_set(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", "/run/store")
    assert run_store_base_from_env() == Path("/run/store")


@pytest.mark.unit
def test_allocate_run_store_root_ephemeral(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_PATH", raising=False)
    root, ephemeral = allocate_run_store_root(run_id="abc")
    try:
        assert ephemeral is True
        assert root.is_dir()
        assert "agentic-run-abc-" in root.name
    finally:
        import shutil

        shutil.rmtree(root, ignore_errors=True)


@pytest.mark.unit
def test_allocate_run_store_root_persistent(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path))
    root, ephemeral = allocate_run_store_root(run_id="run42")
    assert ephemeral is False
    assert root == tmp_path / "run42"
    assert root.is_dir()


@pytest.mark.unit
def test_run_store_session_cleans_ephemeral(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_PATH", raising=False)
    captured: Path | None = None
    with run_store_session("sess1") as (_store, root):
        captured = root
        assert root.is_dir()
    assert captured is not None
    assert not captured.exists()


@pytest.mark.unit
def test_run_store_session_keeps_persistent(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path))
    with run_store_session("sess2") as (_store, root):
        marker = root / "kept.txt"
        marker.write_text("x", encoding="utf-8")
    assert (tmp_path / "sess2" / "kept.txt").is_file()


@pytest.mark.unit
def test_write_step_spec(tmp_path: Path) -> None:
    path = tmp_path / "nested" / "step-spec.json"
    write_step_spec(path, {"schema_version": "0.1", "step_id": "s1"})
    assert json.loads(path.read_text(encoding="utf-8"))["step_id"] == "s1"
