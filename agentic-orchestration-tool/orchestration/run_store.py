from __future__ import annotations

import json
import os
import shutil
import tempfile
import uuid
from abc import ABC, abstractmethod
from contextlib import contextmanager
from collections.abc import Iterator
from pathlib import Path

from orchestration.backends.base import StepResult

DEFAULT_RUN_STORE_MOUNT = "/run/store"


class RunStore(ABC):
    @abstractmethod
    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None: ...

    @abstractmethod
    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None: ...

    @abstractmethod
    def step_result_path(self, run_id: str, step_id: str) -> Path: ...


class FileSystemRunStore(RunStore):
    def __init__(self, root: Path) -> None:
        self._root = root

    def _run_dir(self, run_id: str) -> Path:
        return self._root / run_id

    def step_result_path(self, run_id: str, step_id: str) -> Path:
        return self._run_dir(run_id) / step_id / "result.json"

    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None:
        path = self.step_result_path(run_id, step_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")

    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None:
        path = self.step_result_path(run_id, step_id)
        if not path.is_file():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return StepResult(
            run_id=str(data.get("run_id", run_id)),
            step_id=str(data.get("step_id", step_id)),
            exit_code=int(data.get("exit_code", 1)),
            result_text=data.get("result_text"),
            error=data.get("error"),
            recoverable=bool(data.get("recoverable", False)),
            recovery_hint=data.get("recovery_hint"),
        )


def new_run_id() -> str:
    return uuid.uuid4().hex


def run_store_base_from_env() -> Path | None:
    """Return configured run store mount, or ``None`` to allocate a temp dir per run."""
    raw = os.getenv("AGENTIC_RUN_STORE_PATH", "").strip()
    if not raw:
        return None
    return Path(raw)


def allocate_run_store_root(*, run_id: str) -> tuple[Path, bool]:
    """Return ``(store_root, ephemeral)`` for one crew run.

    When ``AGENTIC_RUN_STORE_PATH`` is set, uses ``{base}/{run_id}/`` (PVC-friendly).
    Otherwise creates a temp directory that should be removed after the run.
    """
    base = run_store_base_from_env()
    if base is not None:
        root = base / run_id
        root.mkdir(parents=True, exist_ok=True)
        return root, False
    root = Path(tempfile.mkdtemp(prefix=f"agentic-run-{run_id}-"))
    return root, True


@contextmanager
def run_store_session(run_id: str) -> Iterator[tuple[FileSystemRunStore, Path]]:
    """Yield ``(store, workspace)``; remove ephemeral workspaces on exit.

    ``store._root`` is the mount base (``AGENTIC_RUN_STORE_PATH``) or an ephemeral
    run directory. ``workspace`` holds per-run spec files: ``{base}/{run_id}/`` when
    persistent, else the ephemeral directory.
    """
    base = run_store_base_from_env()
    if base is not None:
        store = FileSystemRunStore(base)
        workspace = base / run_id
        workspace.mkdir(parents=True, exist_ok=True)
        ephemeral = False
    else:
        workspace = Path(tempfile.mkdtemp(prefix=f"agentic-run-{run_id}-"))
        store = FileSystemRunStore(workspace)
        ephemeral = True
    try:
        yield store, workspace
    finally:
        if ephemeral:
            shutil.rmtree(workspace, ignore_errors=True)


def write_step_spec(spec_path: Path, spec_dict: dict[str, object]) -> None:
    """Write a worker ``StepSpec`` JSON file."""
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(json.dumps(spec_dict, indent=2), encoding="utf-8")
