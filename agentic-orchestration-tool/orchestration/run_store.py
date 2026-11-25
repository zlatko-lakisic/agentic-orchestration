from __future__ import annotations

import json
import os
import re
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

    def clear_step_result(self, run_id: str, step_id: str) -> None:
        """Drop any stored result before a (re-)run of the step.

        Results are keyed by ``(run_id, step_id)`` only; without this a retry,
        a recovery attempt, or an iterative round that reuses the ids would
        read the previous attempt's result. Default: no-op.
        """
        return None


def run_store_private_enabled() -> bool:
    """Owner-only run-store dirs/files (``AGENTIC_RUN_STORE_PRIVATE``, default on).

    Set ``AGENTIC_RUN_STORE_PRIVATE=0`` when coordinator and workers share the
    volume under different uids.
    """
    return os.getenv("AGENTIC_RUN_STORE_PRIVATE", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def make_private_dir(path: Path) -> None:
    """``mkdir -p`` and (when private mode is on) tighten the leaf to 0700."""
    path.mkdir(parents=True, exist_ok=True)
    if run_store_private_enabled():
        try:
            os.chmod(path, 0o700)
        except OSError:
            pass


def write_private_json(path: Path, payload: object) -> None:
    """Atomically write JSON (temp file + ``os.replace``), mode 0600 when private.

    Readers polling the shared volume never observe a partial file.
    """
    make_private_dir(path.parent)
    private = run_store_private_enabled()
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
            fh.flush()
        # mkstemp creates 0600; relax to the umask default when not private.
        if not private:
            umask = os.umask(0)
            os.umask(umask)
            try:
                os.chmod(tmp, 0o666 & ~umask)
            except OSError:
                pass
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


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
        write_private_json(self.step_result_path(run_id, step_id), result.to_dict())

    def clear_step_result(self, run_id: str, step_id: str) -> None:
        try:
            self.step_result_path(run_id, step_id).unlink()
        except FileNotFoundError:
            pass

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


def resolve_run_id(explicit: str | None = None) -> str:
    """Prefer an explicit id, then the current context's run id, else mint a new hex uuid.

    The context id is the usage ContextVar when bound (concurrent daemon runs),
    falling back to ``AGENTIC_RUN_ID`` (CLI / worker processes).
    """
    try:
        from orchestration.llm_usage import current_run_id

        ambient = current_run_id()
    except Exception:  # noqa: BLE001
        ambient = os.getenv("AGENTIC_RUN_ID", "")
    for candidate in (explicit, ambient):
        text = str(candidate or "").strip()
        if text:
            return text
    return new_run_id()


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


def run_store_user_namespace_enabled() -> bool:
    """``AGENTIC_RUN_STORE_USER_NAMESPACE=1`` prefixes run roots with the caller's user id."""
    return os.getenv("AGENTIC_RUN_STORE_USER_NAMESPACE", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _safe_user_prefix(user_id: str | None) -> str:
    raw = str(user_id or "").strip().lower()
    if not raw:
        return ""
    cleaned = re.sub(r"[^a-z0-9._-]+", "-", raw).strip("-._")
    return cleaned[:64].rstrip("-._")


def allocate_run_store_root(*, run_id: str, user_id: str | None = None) -> tuple[Path, bool]:
    """Return ``(store_root, ephemeral)`` for one crew run.

    When ``AGENTIC_RUN_STORE_PATH`` is set, uses ``{base}/{run_id}/`` (PVC-friendly).
    Otherwise creates a temp directory that should be removed after the run.
    With ``AGENTIC_RUN_STORE_USER_NAMESPACE=1`` and a ``user_id``, the shared path
    becomes ``{base}/users/{user_id}/{run_id}/`` so multi-tenant deployments do not
    interleave run directories. Unset (the default) keeps the legacy layout.
    """
    base = run_store_base_from_env()
    if base is not None:
        prefix = _safe_user_prefix(user_id) if run_store_user_namespace_enabled() else ""
        root = (base / "users" / prefix / run_id) if prefix else (base / run_id)
        make_private_dir(root)
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
        make_private_dir(workspace)
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
    write_private_json(spec_path, spec_dict)
