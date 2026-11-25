"""PVC queue warm pool for K8s worker steps (K5.1)."""

from __future__ import annotations

import json
import os
import signal
import socket
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

from orchestration.backends.kubernetes_types import (
    K8sJobRecord,
    K8sJobWaitResult,
    write_json_atomic,
)
from orchestration.structured_logging import emit_log

if TYPE_CHECKING:
    from orchestration.execution_queue_store import StoredTicket


def warm_pool_enabled_from_env() -> bool:
    raw = os.getenv("AGENTIC_K8S_WARM_POOL_ENABLED", "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def warm_pool_queue_dir(run_store_mount: str) -> Path:
    return Path(run_store_mount.rstrip("/")) / "warm-pool" / "queue"


def warm_pool_request_path(*, run_store_mount: str, run_id: str, step_id: str) -> Path:
    safe_run = run_id.replace("/", "_")
    safe_step = step_id.replace("/", "_")
    return warm_pool_queue_dir(run_store_mount) / f"{safe_run}__{safe_step}.json"


def warm_pool_result_path(*, run_store_mount: str, run_id: str, step_id: str) -> Path:
    return Path(run_store_mount.rstrip("/")) / run_id / step_id / "result.json"


# A claim's mtime is refreshed this often while its step runs.
CLAIM_HEARTBEAT_SECONDS = 10.0
# Claims older than this are taken back when a worker starts (dead-pod recovery).
CLAIM_RECLAIM_STARTUP_SECONDS = 30.0
# Claims older than this are taken back by the periodic sweep.
CLAIM_RECLAIM_PERIODIC_SECONDS = 120.0
# The heartbeat must beat the shortest reclaim threshold comfortably, otherwise a
# freshly started pod can take a live claim and run the step a second time.
assert CLAIM_HEARTBEAT_SECONDS * 3 <= min(
    CLAIM_RECLAIM_STARTUP_SECONDS, CLAIM_RECLAIM_PERIODIC_SECONDS
)

# How long an unparseable result.json is treated as "still being written".
_INVALID_RESULT_GRACE_SECONDS = 5.0

_TIMEOUT_MESSAGE_PREFIX = "warm pool timed out"


def _atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    """Write JSON via temp file + rename so readers never see a partial file."""
    write_json_atomic(path, payload)


class WarmPoolWorkerTerminated(SystemExit):
    """Raised in the worker's main thread when the pod receives SIGTERM."""


def invalidate_warm_pool_result(*, run_store_mount: str, run_id: str, step_id: str) -> bool:
    """Remove a previous attempt's ``result.json`` so a retry cannot short-circuit on it.

    Returns True if a file was removed.
    """
    result_path = warm_pool_result_path(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
    )
    if not result_path.is_file():
        return False
    try:
        result_path.unlink()
    except OSError:
        return False
    emit_log(
        "warm pool invalidated prior result",
        run_id=run_id,
        step_id=step_id,
        component="coordinator",
        extra={"result_path": str(result_path)},
    )
    return True


@dataclass(frozen=True)
class WarmPoolRequest:
    run_id: str
    step_id: str
    spec_container_path: str
    agent_provider_id: str
    enqueued_at: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "step_id": self.step_id,
            "spec_container_path": self.spec_container_path,
            "agent_provider_id": self.agent_provider_id,
            "enqueued_at": self.enqueued_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> WarmPoolRequest:
        return cls(
            run_id=str(data["run_id"]),
            step_id=str(data["step_id"]),
            spec_container_path=str(data["spec_container_path"]),
            agent_provider_id=str(data.get("agent_provider_id") or ""),
            enqueued_at=float(data.get("enqueued_at") or 0.0),
        )


def enqueue_warm_pool_request(
    *,
    run_store_mount: str,
    run_id: str,
    step_id: str,
    spec_container_path: str,
    agent_provider_id: str,
) -> Path:
    queue = warm_pool_queue_dir(run_store_mount)
    queue.mkdir(parents=True, exist_ok=True)
    path = warm_pool_request_path(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
    )
    req = WarmPoolRequest(
        run_id=run_id,
        step_id=step_id,
        spec_container_path=spec_container_path,
        agent_provider_id=agent_provider_id,
        enqueued_at=time.time(),
    )
    _atomic_write_json(path, req.to_dict())
    emit_log(
        f"warm pool enqueued {path.name}",
        run_id=run_id,
        step_id=step_id,
        component="coordinator",
        extra={"spec_path": spec_container_path},
    )
    return path


def wait_for_warm_pool_result(
    *,
    run_store_mount: str,
    run_id: str,
    step_id: str,
    timeout_seconds: int,
    poll_interval: float = 1.0,
    not_before: float = 0.0,
) -> K8sJobWaitResult:
    """Poll ``{run_store}/{run_id}/{step_id}/result.json`` until present or timeout.

    ``not_before`` is accepted for backward compatibility and ignored. It used to
    reject results whose mtime was older than the enqueue time, which turned a
    finished step into a timeout whenever the worker's (or NFS server's) clock
    lagged the coordinator's. Stale results are prevented where they arise:
    :func:`dispatch_step_via_warm_pool` deletes any prior result before enqueueing.
    """
    del not_before
    result_path = warm_pool_result_path(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
    )
    deadline = time.time() + timeout_seconds
    invalid_since: float | None = None
    while time.time() < deadline:
        if result_path.is_file():
            try:
                data = json.loads(result_path.read_text(encoding="utf-8"))
                if not isinstance(data, dict):
                    raise ValueError("result is not a JSON object")
                exit_code = int(data.get("exit_code", 1))
                err = data.get("error")
            except (OSError, json.JSONDecodeError, TypeError, ValueError):
                # Possibly a writer mid-write: give it a moment before calling it broken.
                now = time.time()
                if invalid_since is None:
                    invalid_since = now
                if now - invalid_since < _INVALID_RESULT_GRACE_SECONDS:
                    time.sleep(poll_interval)
                    continue
                exit_code = 1
                err = f"invalid result at {result_path}"
            if exit_code != 0:
                emit_log(
                    "warm pool step failed",
                    level="error",
                    run_id=run_id,
                    step_id=step_id,
                    component="coordinator",
                    extra={"exit_code": exit_code, "error": err},
                )
                return K8sJobWaitResult(
                    succeeded=False,
                    failed=True,
                    pod_name=None,
                    message=str(err or f"step exit {exit_code}"),
                )
            emit_log(
                "warm pool step completed",
                run_id=run_id,
                step_id=step_id,
                component="coordinator",
            )
            return K8sJobWaitResult(
                succeeded=True,
                failed=False,
                pod_name=None,
                message=None,
            )
        invalid_since = None
        time.sleep(poll_interval)
    return K8sJobWaitResult(
        succeeded=False,
        failed=True,
        pod_name=None,
        message=f"{_TIMEOUT_MESSAGE_PREFIX} after {timeout_seconds}s waiting for {result_path}",
    )


def _wait_timed_out(wait: K8sJobWaitResult) -> bool:
    return bool(wait.failed and (wait.message or "").startswith(_TIMEOUT_MESSAGE_PREFIX))


def _withdraw_unclaimed_request(path: Path | None, *, run_id: str, step_id: str) -> bool:
    """Remove a still-pending queue file after the coordinator gave up on it.

    Without this the request stays queued and a worker runs it later, after the
    run has already failed (wasted LLM/GPU time, late side effects). A request a
    worker already claimed has been renamed, so it is left alone.
    """
    if path is None:
        return False
    try:
        path.unlink()
    except OSError:
        return False
    emit_log(
        f"warm pool withdrew unclaimed request {path.name} after timeout",
        level="warning",
        run_id=run_id,
        step_id=step_id,
        component="coordinator",
    )
    return True


def dispatch_step_via_warm_pool(
    *,
    namespace: str,
    run_store_mount: str,
    run_id: str,
    step_id: str,
    spec_container_path: str,
    agent_provider_id: str,
    timeout_seconds: int,
    priority: int = 50,
) -> tuple[K8sJobRecord, K8sJobWaitResult]:
    from orchestration.execution_queue import (
        execution_queue_enabled,
        unify_warm_pool_enabled,
    )

    # Drop any prior attempt's result so retries cannot short-circuit on it.
    invalidate_warm_pool_result(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
    )
    started = time.time()
    queued_path: Path | None
    if execution_queue_enabled() and unify_warm_pool_enabled():
        queued_path = _enqueue_global_step(
            run_store_mount=run_store_mount,
            run_id=run_id,
            step_id=step_id,
            spec_container_path=spec_container_path,
            agent_provider_id=agent_provider_id,
            priority=priority,
            enqueued_at=started,
        )
    else:
        queued_path = enqueue_warm_pool_request(
            run_store_mount=run_store_mount,
            run_id=run_id,
            step_id=step_id,
            spec_container_path=spec_container_path,
            agent_provider_id=agent_provider_id,
        )
    wait = wait_for_warm_pool_result(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
        timeout_seconds=timeout_seconds,
    )
    if _wait_timed_out(wait):
        _withdraw_unclaimed_request(queued_path, run_id=run_id, step_id=step_id)
    record = K8sJobRecord(
        job_name="warm-pool",
        namespace=namespace,
        pod_name=None,
    )
    return record, wait


def _enqueue_global_step(
    *,
    run_store_mount: str,
    run_id: str,
    step_id: str,
    spec_container_path: str,
    agent_provider_id: str,
    priority: int,
    enqueued_at: float,
) -> Path:
    from orchestration.execution_queue_store import ExecutionQueueStore, StoredTicket, new_ticket_id

    store = ExecutionQueueStore(Path(run_store_mount.rstrip("/")) / "execution-queue")
    ticket = StoredTicket(
        ticket_id=new_ticket_id(),
        run_id=run_id,
        kind="step",
        phase="step",
        priority=priority,
        priority_label=None,
        enqueued_at=enqueued_at,
        client_id=None,
        tenant_id=None,
        step_id=step_id,
        requirements={
            "vram_gb": 0.5,
            "cpu_cores": 0.5,
            "gpu_slots": 0,
            "agent_provider_ids": [agent_provider_id] if agent_provider_id else [],
            "spec_container_path": spec_container_path,
        },
    )
    path = store.submit_ticket(ticket)
    emit_log(
        f"global queue step enqueued {path.name}",
        run_id=run_id,
        step_id=step_id,
        component="coordinator",
        extra={"spec_path": spec_container_path},
    )
    return path


def claim_next_global_step(run_store_mount: str) -> tuple[Path, StoredTicket] | None:
    """Worker pull: claim highest-priority pending step ticket.

    Skips tickets that lack ``spec_container_path`` (leave them for GC) and uses a
    worker-scoped ``.claimed-<id>`` suffix so dead workers can be reclaimed.
    """
    from orchestration.execution_queue_store import ExecutionQueueStore, StoredTicket

    store = ExecutionQueueStore(Path(run_store_mount.rstrip("/")) / "execution-queue")
    pending = store.list_pending("step")
    if not pending:
        return None
    worker = _worker_identity().replace("/", "_").replace("\\", "_")
    for path, ticket in pending:
        spec_raw = ticket.requirements.get("spec_container_path")
        if not spec_raw:
            # Bare tickets (legacy acquire_step double-enqueue) — drop with a log.
            emit_log(
                f"dropping step ticket without spec {path.name}",
                level="warning",
                run_id=ticket.run_id,
                step_id=ticket.step_id or "",
                component="warm-pool-worker",
            )
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
            continue
        claimed = path.with_name(f"{path.name}.claimed-{worker}")
        try:
            path.rename(claimed)
        except OSError:
            continue
        # Rename preserves enqueue mtime; refresh so reclaim_stale_claims ages
        # from claim time (and heartbeats), not enqueue time.
        try:
            os.utime(claimed, None)
        except OSError:
            pass
        try:
            data = json.loads(claimed.read_text(encoding="utf-8"))
            return claimed, StoredTicket.from_dict(data)
        except (OSError, json.JSONDecodeError, KeyError):
            try:
                claimed.rename(path)
            except OSError:
                pass
            return None
    return None


def _pending_ticket_base_name(claimed_path: Path) -> str:
    """Map ``foo.json.claimed-<worker>`` / ``foo.claimed`` back to the pending basename."""
    name = claimed_path.name
    if ".claimed-" in name:
        return name.split(".claimed-", 1)[0]
    if name.endswith(".claimed"):
        return name[: -len(".claimed")] + ".json"
    return name


def unlink_step_ticket_siblings(claimed_path: Path) -> None:
    """Remove the claimed path and any pending/sibling claim for the same ticket.

    After ``reclaim_stale_claims`` renames a claim back to ``foo.json``, the worker's
    ``finally: claimed.unlink`` is a no-op and the ticket loops forever. Always clear
    the base pending file and every ``foo.json.claimed-*`` sibling.
    """
    parent = claimed_path.parent
    base = _pending_ticket_base_name(claimed_path)
    candidates = {claimed_path, parent / base}
    try:
        for sibling in parent.glob(f"{base}.claimed*"):
            candidates.add(sibling)
    except OSError:
        pass
    for target in candidates:
        try:
            target.unlink(missing_ok=True)
        except OSError:
            pass


def _heartbeat_claim_path(path: Path, stop: threading.Event) -> None:
    """Touch claim mtime until ``stop`` is set so reclaim does not steal live work."""
    while not stop.wait(CLAIM_HEARTBEAT_SECONDS):
        try:
            os.utime(path, None)
        except OSError:
            return


def _write_warm_pool_failure_result(
    *,
    run_store_mount: str,
    run_id: str,
    step_id: str,
    error: str,
    exit_code: int = 1,
) -> None:
    """Ensure the coordinator waiter unblocks even when the worker crashes mid-step."""
    from orchestration.backends.base import StepResult

    path = warm_pool_result_path(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
    )
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = StepResult(
            run_id=run_id,
            step_id=step_id,
            exit_code=exit_code,
            error=error,
        ).to_dict()
        # Parent wait_for_warm_pool_result reads exit_code / error keys.
        payload["exit_code"] = exit_code
        _atomic_write_json(path, payload)
    except OSError:
        pass


def _worker_identity() -> str:
    return os.getenv("HOSTNAME", socket.gethostname()).strip() or "warm-worker"


def claim_next_warm_pool_request(run_store_mount: str) -> tuple[Path, WarmPoolRequest] | None:
    queue = warm_pool_queue_dir(run_store_mount)
    if not queue.is_dir():
        return None
    worker = _worker_identity().replace("/", "_").replace("\\", "_")
    for path in sorted(queue.glob("*.json")):
        claimed = path.with_suffix(path.suffix + f".claimed-{worker}")
        try:
            path.rename(claimed)
        except OSError:
            continue
        # Rename keeps the enqueue mtime; age the claim from now for reclaim.
        try:
            os.utime(claimed, None)
        except OSError:
            pass
        try:
            data = json.loads(claimed.read_text(encoding="utf-8"))
            return claimed, WarmPoolRequest.from_dict(data)
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            # A broken request must not kill the worker loop (it is PID 1) or be
            # re-claimed forever: set it aside and keep going.
            emit_log(
                f"setting aside unreadable warm pool request {path.name}: {exc}",
                level="error",
                component="warm-pool-worker",
            )
            try:
                claimed.rename(path.with_suffix(path.suffix + ".invalid"))
            except OSError:
                try:
                    claimed.unlink(missing_ok=True)
                except OSError:
                    pass
            continue
    return None


def reclaim_stale_warm_pool_claims(run_store_mount: str, *, max_age_seconds: float) -> int:
    """Return ``*.json.claimed-<worker>`` files of dead workers to the legacy queue.

    The legacy (non-unified) queue had no reclaim at all: a worker killed mid-step
    left its claim behind and the coordinator waited out the full timeout.
    Live claims are protected by the heartbeat (see ``CLAIM_HEARTBEAT_SECONDS``).
    """
    queue = warm_pool_queue_dir(run_store_mount)
    if not queue.is_dir():
        return 0
    now = time.time()
    reclaimed = 0
    try:
        candidates = list(queue.iterdir())
    except OSError:
        return 0
    for path in candidates:
        name = path.name
        if ".json.claimed-" not in name:
            continue
        try:
            if now - path.stat().st_mtime < max_age_seconds:
                continue
        except OSError:
            continue
        dest = queue / name.split(".claimed-", 1)[0]
        try:
            if dest.exists():
                path.unlink(missing_ok=True)
            else:
                path.rename(dest)
                reclaimed += 1
        except OSError:
            continue
    return reclaimed


def _install_sigterm_handler() -> bool:
    """Turn SIGTERM into :class:`WarmPoolWorkerTerminated` (main thread only).

    The worker is PID 1 in its container: with no handler SIGTERM is ignored, the
    pod is SIGKILLed after the grace period, and the coordinator learns nothing.
    """
    if threading.current_thread() is not threading.main_thread():
        return False

    def _on_sigterm(_signum: int, _frame: Any) -> None:
        raise WarmPoolWorkerTerminated(143)

    try:
        signal.signal(signal.SIGTERM, _on_sigterm)
    except (ValueError, OSError):
        return False
    return True


def _run_claimed_step(
    *,
    mount: str,
    claim_path: Path,
    run_id: str,
    step_id: str,
    spec_path: Path,
    release_claim: Any,
) -> None:
    """Execute one claimed step; always leave a result and release the claim.

    The claim's mtime is refreshed while the step runs so reclaim sweeps (this
    pod's or another's) never take back live work. On SIGTERM a failure result
    is written first, so the coordinator fails the step now instead of waiting
    out its timeout, and the claim is released so the step is not re-run later.
    """
    from orchestration.execute_step import execute_step_from_spec_file

    stop_hb = threading.Event()
    hb = threading.Thread(
        target=_heartbeat_claim_path,
        args=(claim_path, stop_hb),
        name="claim-heartbeat",
        daemon=True,
    )
    hb.start()
    try:
        exit_code = execute_step_from_spec_file(spec_path)
        if exit_code != 0:
            emit_log(
                f"step exited {exit_code}",
                level="error",
                run_id=run_id,
                step_id=step_id,
                component="warm-pool-worker",
            )
            # Parent waits on result.json — ensure a failure marker exists.
            result = warm_pool_result_path(
                run_store_mount=mount,
                run_id=run_id,
                step_id=step_id,
            )
            if not result.is_file():
                _write_warm_pool_failure_result(
                    run_store_mount=mount,
                    run_id=run_id,
                    step_id=step_id,
                    error=f"step exited {exit_code}",
                    exit_code=exit_code,
                )
    except WarmPoolWorkerTerminated:
        emit_log(
            "worker terminated (SIGTERM) while running step",
            level="error",
            run_id=run_id,
            step_id=step_id,
            component="warm-pool-worker",
        )
        _write_warm_pool_failure_result(
            run_store_mount=mount,
            run_id=run_id,
            step_id=step_id,
            error="warm-pool worker terminated (SIGTERM) while running this step",
        )
        raise
    except SystemExit as exc:
        # Step code that bails out with SystemExit (bad payload, argparse-style
        # exits) must fail this step, not take the whole worker loop down with
        # no result written.
        detail = exc.code if isinstance(exc.code, str) and exc.code else f"exit {exc.code!r}"
        emit_log(
            f"step exited via SystemExit: {detail}",
            level="error",
            run_id=run_id,
            step_id=step_id,
            component="warm-pool-worker",
        )
        _write_warm_pool_failure_result(
            run_store_mount=mount,
            run_id=run_id,
            step_id=step_id,
            error=f"step aborted: {detail}",
        )
    except Exception as exc:  # noqa: BLE001
        emit_log(
            f"step crashed: {exc}",
            level="error",
            run_id=run_id,
            step_id=step_id,
            component="warm-pool-worker",
        )
        _write_warm_pool_failure_result(
            run_store_mount=mount,
            run_id=run_id,
            step_id=step_id,
            error=str(exc),
        )
    finally:
        stop_hb.set()
        hb.join(timeout=2.0)
        release_claim(claim_path)


def _unlink_claim(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def run_warm_pool_worker_loop(*, run_store_mount: str, poll_interval: float = 0.5) -> None:
    """Long-running loop: claim queue requests and execute step specs."""
    from orchestration.execution_queue_store import reclaim_stale_claims
    from orchestration.ollama_keepalive import start_ollama_keepalive_loop

    mount = str(run_store_mount).rstrip("/") or "/run/store"
    _install_sigterm_handler()
    if os.getenv("AGENTIC_WARM_POOL_OLLAMA_PREWARM", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    ):
        start_ollama_keepalive_loop(log_prefix="(warm-pool) ollama keep-alive")
    # Recover work left claimed by previous worker pods before we poll.
    try:
        n = reclaim_stale_claims(
            "step",
            max_age_seconds=CLAIM_RECLAIM_STARTUP_SECONDS,
            run_store_mount=mount,
        )
        n += reclaim_stale_warm_pool_claims(mount, max_age_seconds=CLAIM_RECLAIM_STARTUP_SECONDS)
        if n:
            emit_log(
                f"reclaimed {n} stale step claim(s) on warm-pool start",
                component="warm-pool-worker",
            )
    except Exception:  # noqa: BLE001
        pass
    emit_log(
        f"warm pool worker started (mount={mount})",
        component="warm-pool-worker",
        extra={"worker": _worker_identity()},
    )
    queue_enabled = os.getenv("AGENTIC_EXECUTION_QUEUE_ENABLED", "0").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )
    unify_global = os.getenv("AGENTIC_EXEC_QUEUE_UNIFY_WARM_POOL", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )
    use_global_queue = queue_enabled and unify_global
    last_reclaim = 0.0

    try:
        while True:
            now = time.time()
            if now - last_reclaim >= 30.0:
                last_reclaim = now
                try:
                    if use_global_queue:
                        reclaim_stale_claims(
                            "step",
                            max_age_seconds=CLAIM_RECLAIM_PERIODIC_SECONDS,
                            run_store_mount=mount,
                        )
                    else:
                        reclaim_stale_warm_pool_claims(
                            mount,
                            max_age_seconds=CLAIM_RECLAIM_PERIODIC_SECONDS,
                        )
                except Exception:  # noqa: BLE001
                    pass
            if use_global_queue:
                claimed = claim_next_global_step(mount)
                if claimed is None:
                    time.sleep(poll_interval)
                    continue
                path, ticket = claimed
                emit_log(
                    f"claimed global step {path.name}",
                    run_id=ticket.run_id,
                    step_id=ticket.step_id or "",
                    component="warm-pool-worker",
                )
                _run_claimed_step(
                    mount=mount,
                    claim_path=path,
                    run_id=ticket.run_id,
                    step_id=str(ticket.step_id or "step"),
                    spec_path=Path(str(ticket.requirements.get("spec_container_path"))),
                    release_claim=unlink_step_ticket_siblings,
                )
                continue

            claimed_req = claim_next_warm_pool_request(mount)
            if claimed_req is None:
                time.sleep(poll_interval)
                continue
            req_path, req = claimed_req
            emit_log(
                f"claimed {req_path.name}",
                run_id=req.run_id,
                step_id=req.step_id,
                component="warm-pool-worker",
            )
            _run_claimed_step(
                mount=mount,
                claim_path=req_path,
                run_id=req.run_id,
                step_id=req.step_id,
                spec_path=Path(req.spec_container_path),
                release_claim=_unlink_claim,
            )
    except WarmPoolWorkerTerminated:
        emit_log("warm pool worker stopping (SIGTERM)", component="warm-pool-worker")
        raise
