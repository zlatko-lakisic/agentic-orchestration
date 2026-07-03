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
) -> K8sJobWaitResult:
    """Poll ``{run_store}/{run_id}/{step_id}/result.json`` until present or timeout."""
    result_path = (
        Path(run_store_mount.rstrip("/")) / run_id / step_id / "result.json"
    )
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if result_path.is_file():
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
) -> tuple[K8sJobRecord, K8sJobWaitResult]:
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
    )
    record = K8sJobRecord(
        job_name="warm-pool",
        namespace=namespace,
        pod_name=None,
    )
    return record, wait


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

    mount = str(run_store_mount).rstrip("/") or "/run/store"
    emit_log(
        f"warm pool worker started (mount={mount})",
        component="warm-pool-worker",
        extra={"worker": _worker_identity()},
    )
    while True:
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
