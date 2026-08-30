"""PVC queue warm pool for K8s worker steps (K5.1)."""

from __future__ import annotations

import json
import os
import socket
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from orchestration.backends.kubernetes_types import K8sJobRecord, K8sJobWaitResult
from orchestration.structured_logging import emit_log


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


# Clock slack when comparing result mtime against enqueue time (shared node clock).
_RESULT_MTIME_SLACK_SECONDS = 1.0


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
    path.write_text(json.dumps(req.to_dict(), indent=2), encoding="utf-8")
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

    When ``not_before`` is set (enqueue time), ignore results whose mtime is older
    than that timestamp (minus a small clock slack). This prevents provider-recovery
    retries from instantly returning the previous attempt's failure file.
    """
    result_path = warm_pool_result_path(
        run_store_mount=run_store_mount,
        run_id=run_id,
        step_id=step_id,
    )
    deadline = time.time() + timeout_seconds
    min_mtime = (not_before - _RESULT_MTIME_SLACK_SECONDS) if not_before > 0 else 0.0
    while time.time() < deadline:
        if result_path.is_file():
            try:
                mtime = result_path.stat().st_mtime
            except OSError:
                time.sleep(poll_interval)
                continue
            if min_mtime > 0 and mtime < min_mtime:
                emit_log(
                    "warm pool ignoring stale result",
                    level="debug",
                    run_id=run_id,
                    step_id=step_id,
                    component="coordinator",
                    extra={
                        "result_path": str(result_path),
                        "mtime": mtime,
                        "not_before": not_before,
                    },
                )
                time.sleep(poll_interval)
                continue
            try:
                data = json.loads(result_path.read_text(encoding="utf-8"))
                exit_code = int(data.get("exit_code", 1))
                err = data.get("error")
            except (OSError, json.JSONDecodeError, TypeError, ValueError):
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
        time.sleep(poll_interval)
    return K8sJobWaitResult(
        succeeded=False,
        failed=True,
        pod_name=None,
        message=f"warm pool timed out after {timeout_seconds}s waiting for {result_path}",
    )


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
    if execution_queue_enabled() and unify_warm_pool_enabled():
        _enqueue_global_step(
            run_store_mount=run_store_mount,
            run_id=run_id,
            step_id=step_id,
            spec_container_path=spec_container_path,
            agent_provider_id=agent_provider_id,
            priority=priority,
            enqueued_at=started,
        )
    else:
        enqueue_warm_pool_request(
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
        not_before=started,
    )
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
) -> None:
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


def claim_next_global_step(run_store_mount: str) -> tuple[Path, StoredTicket] | None:
    """Worker pull: claim highest-priority pending step ticket."""
    from orchestration.execution_queue_store import ExecutionQueueStore, StoredTicket

    store = ExecutionQueueStore(Path(run_store_mount.rstrip("/")) / "execution-queue")
    pending = store.list_pending("step")
    if not pending:
        return None
    path, ticket = pending[0]
    claimed = path.with_suffix(".claimed")
    try:
        path.rename(claimed)
    except OSError:
        return None
    try:
        data = json.loads(claimed.read_text(encoding="utf-8"))
        return claimed, StoredTicket.from_dict(data)
    except (OSError, json.JSONDecodeError, KeyError):
        return None


def _worker_identity() -> str:
    return os.getenv("HOSTNAME", socket.gethostname()).strip() or "warm-worker"


def claim_next_warm_pool_request(run_store_mount: str) -> tuple[Path, WarmPoolRequest] | None:
    queue = warm_pool_queue_dir(run_store_mount)
    if not queue.is_dir():
        return None
    worker = _worker_identity()
    for path in sorted(queue.glob("*.json")):
        claimed = path.with_suffix(path.suffix + f".claimed-{worker}")
        try:
            path.rename(claimed)
        except OSError:
            continue
        data = json.loads(claimed.read_text(encoding="utf-8"))
        return claimed, WarmPoolRequest.from_dict(data)
    return None


def run_warm_pool_worker_loop(*, run_store_mount: str, poll_interval: float = 0.5) -> None:
    """Long-running loop: claim queue requests and execute step specs."""
    from orchestration.execute_step import execute_step_from_spec_file
    from orchestration.ollama_keepalive import start_ollama_keepalive_loop

    mount = str(run_store_mount).rstrip("/") or "/run/store"
    if os.getenv("AGENTIC_WARM_POOL_OLLAMA_PREWARM", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    ):
        start_ollama_keepalive_loop(log_prefix="(warm-pool) ollama keep-alive")
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

    while True:
        if use_global_queue:
            claimed = claim_next_global_step(mount)
            if claimed is None:
                time.sleep(poll_interval)
                continue
            path, ticket = claimed
            spec_raw = ticket.requirements.get("spec_container_path")
            if not spec_raw:
                path.unlink(missing_ok=True)
                continue
            emit_log(
                f"claimed global step {path.name}",
                run_id=ticket.run_id,
                step_id=ticket.step_id or "",
                component="warm-pool-worker",
            )
            try:
                exit_code = execute_step_from_spec_file(Path(str(spec_raw)))
                if exit_code != 0:
                    emit_log(
                        f"step exited {exit_code}",
                        level="error",
                        run_id=ticket.run_id,
                        step_id=ticket.step_id or "",
                        component="warm-pool-worker",
                    )
            finally:
                path.unlink(missing_ok=True)
            continue

        claimed = claim_next_warm_pool_request(mount)
        if claimed is None:
            time.sleep(poll_interval)
            continue
        path, req = claimed
        emit_log(
            f"claimed {path.name}",
            run_id=req.run_id,
            step_id=req.step_id,
            component="warm-pool-worker",
        )
        try:
            exit_code = execute_step_from_spec_file(Path(req.spec_container_path))
            if exit_code != 0:
                emit_log(
                    f"step exited {exit_code}",
                    level="error",
                    run_id=req.run_id,
                    step_id=req.step_id,
                    component="warm-pool-worker",
                )
        finally:
            path.unlink(missing_ok=True)
