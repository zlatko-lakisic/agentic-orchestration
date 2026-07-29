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
DEFAULT_RUN_STORE_BACKEND = "filesystem"
RUN_STORE_BACKENDS = ("filesystem", "s3", "redis")


class RunStore(ABC):
    @abstractmethod
    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None: ...

    @abstractmethod
    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None: ...

    @abstractmethod
    def step_result_path(self, run_id: str, step_id: str) -> Path:
        """Local result path for this step.

        Only the filesystem backend guarantees the file is the store of record;
        remote backends return the local mirror path that workers write to.
        """

    @property
    @abstractmethod
    def local_root(self) -> Path:
        """Local (or PVC-mounted) directory shared with subprocess/Job workers."""

    def has_step_result(self, run_id: str, step_id: str) -> bool:
        return self.read_step_result(run_id, step_id) is not None


class FileSystemRunStore(RunStore):
    def __init__(self, root: Path) -> None:
        self._root = root

    @property
    def local_root(self) -> Path:
        return self._root

    def _run_dir(self, run_id: str) -> Path:
        return self._root / run_id

    def step_result_path(self, run_id: str, step_id: str) -> Path:
        return self._run_dir(run_id) / step_id / "result.json"

    def has_step_result(self, run_id: str, step_id: str) -> bool:
        return self.step_result_path(run_id, step_id).is_file()

    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None:
        path = self.step_result_path(run_id, step_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")

    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None:
        path = self.step_result_path(run_id, step_id)
        if not path.is_file():
            return None
        return step_result_from_dict(
            json.loads(path.read_text(encoding="utf-8")),
            run_id=run_id,
            step_id=step_id,
        )


def step_result_from_dict(
    data: dict[str, object],
    *,
    run_id: str,
    step_id: str,
) -> StepResult:
    """Deserialize a ``result.json`` payload; ``run_id``/``step_id`` are fallbacks."""
    rag_audit = data.get("rag_audit")
    return StepResult(
        run_id=str(data.get("run_id", run_id)),
        step_id=str(data.get("step_id", step_id)),
        exit_code=int(data.get("exit_code", 1)),  # type: ignore[arg-type]
        result_text=data.get("result_text"),  # type: ignore[arg-type]
        error=data.get("error"),  # type: ignore[arg-type]
        recoverable=bool(data.get("recoverable", False)),
        recovery_hint=data.get("recovery_hint"),  # type: ignore[arg-type]
        rag_audit=rag_audit if isinstance(rag_audit, dict) else None,
    )


def step_result_from_json(payload: str, *, run_id: str, step_id: str) -> StepResult:
    return step_result_from_dict(json.loads(payload), run_id=run_id, step_id=step_id)


def step_result_to_json(result: StepResult) -> str:
    return json.dumps(result.to_dict(), indent=2)


def new_run_id() -> str:
    return uuid.uuid4().hex


def run_store_base_from_env() -> Path | None:
    """Return configured run store mount, or ``None`` to allocate a temp dir per run."""
    raw = os.getenv("AGENTIC_RUN_STORE_PATH", "").strip()
    if not raw:
        return None
    return Path(raw)


def shared_run_store_mount_path() -> str:
    """PVC root for queue/result file I/O from this process (host path or in-cluster mount)."""
    base = run_store_base_from_env()
    if base is not None:
        return str(base).rstrip("\\/")
    mount = os.getenv("AGENTIC_K8S_RUN_STORE_MOUNT", DEFAULT_RUN_STORE_MOUNT).strip()
    return mount.rstrip("/") or DEFAULT_RUN_STORE_MOUNT


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


def run_store_backend_from_env() -> str:
    """Return the configured backend name (``filesystem``, ``s3`` or ``redis``)."""
    raw = os.getenv("AGENTIC_RUN_STORE_BACKEND", "").strip().lower()
    if not raw:
        return DEFAULT_RUN_STORE_BACKEND
    if raw in ("fs", "file", "local"):
        return "filesystem"
    if raw in ("minio", "s3"):
        return "s3"
    if raw not in RUN_STORE_BACKENDS:
        raise ValueError(
            f"unknown AGENTIC_RUN_STORE_BACKEND={raw!r}; "
            f"expected one of {', '.join(RUN_STORE_BACKENDS)}"
        )
    return raw


def run_store_from_env(root: Path | None = None) -> RunStore:
    """Build the configured run store.

    ``root`` is the local/PVC directory shared with workers. Remote backends keep
    using it for step specs and as the mirror that workers write results into;
    only the result store of record moves off the filesystem.
    """
    local_root = root or run_store_base_from_env()
    if local_root is None:
        local_root = Path(tempfile.mkdtemp(prefix="agentic-run-store-"))
    backend = run_store_backend_from_env()
    if backend == "filesystem":
        return FileSystemRunStore(local_root)

    mirror = FileSystemRunStore(local_root)
    # Imported lazily so boto3/redis stay optional for filesystem users.
    from orchestration.run_store_backends import (
        redis_run_store_from_env,
        s3_run_store_from_env,
    )

    if backend == "s3":
        return s3_run_store_from_env(local_mirror=mirror)
    return redis_run_store_from_env(local_mirror=mirror)


@contextmanager
def run_store_session(run_id: str) -> Iterator[tuple[RunStore, Path]]:
    """Yield ``(store, workspace)``; remove ephemeral workspaces on exit.

    ``store.local_root`` is the mount base (``AGENTIC_RUN_STORE_PATH``) or an
    ephemeral run directory. ``workspace`` holds per-run spec files:
    ``{base}/{run_id}/`` when persistent, else the ephemeral directory. Step specs
    always live on this local/PVC path because workers are handed a file path;
    step results go wherever ``AGENTIC_RUN_STORE_BACKEND`` points.
    """
    base = run_store_base_from_env()
    if base is not None:
        local_root = base
        workspace = base / run_id
        workspace.mkdir(parents=True, exist_ok=True)
        ephemeral = False
    else:
        workspace = Path(tempfile.mkdtemp(prefix=f"agentic-run-{run_id}-"))
        local_root = workspace
        ephemeral = True
    store = run_store_from_env(local_root)
    try:
        yield store, workspace
    finally:
        if ephemeral:
            shutil.rmtree(workspace, ignore_errors=True)


def write_step_spec(spec_path: Path, spec_dict: dict[str, object]) -> None:
    """Write a worker ``StepSpec`` JSON file."""
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(json.dumps(spec_dict, indent=2), encoding="utf-8")
