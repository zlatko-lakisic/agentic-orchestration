"""K8s delegation RPC (K5.5): worker requests child steps; broker spawns Jobs."""

from __future__ import annotations

import json
import os
import socket
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from orchestration.backends.kubernetes_types import write_json_atomic
from orchestration.structured_logging import emit_log

# Claim files are touched this often while a request is being processed, and a
# claim untouched for the reclaim threshold belongs to a dead broker.
_CLAIM_HEARTBEAT_SECONDS = 10.0
_CLAIM_RECLAIM_SECONDS = 60.0


def _env_int(name: str, default: int, *, minimum: int = 0) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return max(minimum, int(raw))
    except ValueError:
        return default


def delegation_concurrency_from_env() -> int:
    """How many delegation requests the broker serves at once (default 4)."""
    return _env_int("AGENTIC_K8S_DELEGATION_CONCURRENCY", 4, minimum=1)


def delegation_response_ttl_seconds() -> int:
    """Age after which unread response files are garbage-collected (default 24h)."""
    return _env_int("AGENTIC_K8S_DELEGATION_RESPONSE_TTL_SECONDS", 86400, minimum=60)


def delegation_enabled_from_env() -> bool:
    raw = os.getenv("AGENTIC_K8S_DELEGATION_ENABLED", "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def delegation_inline_from_env() -> bool:
    """Run child steps in-process (unit tests) instead of spawning Jobs."""
    raw = os.getenv("AGENTIC_K8S_DELEGATION_INLINE", "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def delegation_queue_dir(run_store_mount: str) -> Path:
    return Path(run_store_mount.rstrip("/")) / "delegation" / "queue"


def delegation_response_dir(run_store_mount: str) -> Path:
    return Path(run_store_mount.rstrip("/")) / "delegation" / "responses"


def child_step_id_for_request(request_id: str) -> str:
    return f"delegate-{request_id[:12]}"


@dataclass(frozen=True)
class DelegationRequest:
    request_id: str
    parent_run_id: str
    parent_step_id: str
    agent_provider: dict[str, Any]
    task_description: str
    task_expected_output: str
    topic: str
    mcp_providers: list[dict[str, Any]]
    enqueued_at: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": "0.1",
            "request_id": self.request_id,
            "parent_run_id": self.parent_run_id,
            "parent_step_id": self.parent_step_id,
            "agent_provider": self.agent_provider,
            "task": {
                "description": self.task_description,
                "expected_output": self.task_expected_output,
            },
            "topic": self.topic,
            "mcp_providers": self.mcp_providers,
            "enqueued_at": self.enqueued_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DelegationRequest:
        task = data.get("task") or {}
        return cls(
            request_id=str(data["request_id"]),
            parent_run_id=str(data["parent_run_id"]),
            parent_step_id=str(data["parent_step_id"]),
            agent_provider=dict(data["agent_provider"]),
            task_description=str(task.get("description", "")),
            task_expected_output=str(task.get("expected_output", "")),
            topic=str(data.get("topic") or ""),
            mcp_providers=list(data.get("mcp_providers") or []),
            enqueued_at=float(data.get("enqueued_at") or 0.0),
        )


@dataclass(frozen=True)
class DelegationResponse:
    request_id: str
    succeeded: bool
    result_text: str | None
    error: str | None
    child_step_id: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": "0.1",
            "request_id": self.request_id,
            "succeeded": self.succeeded,
            "result_text": self.result_text,
            "error": self.error,
            "child_step_id": self.child_step_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DelegationResponse:
        return cls(
            request_id=str(data["request_id"]),
            succeeded=bool(data.get("succeeded")),
            result_text=data.get("result_text"),
            error=data.get("error"),
            child_step_id=str(data.get("child_step_id", "")),
        )


def _broker_identity() -> str:
    return os.getenv("HOSTNAME", socket.gethostname()).strip() or "delegation-broker"


def submit_delegation_request(
    *,
    run_store_mount: str,
    parent_run_id: str,
    parent_step_id: str,
    agent_provider: dict[str, Any],
    task_description: str,
    task_expected_output: str,
    topic: str,
    mcp_providers: list[dict[str, Any]] | None = None,
    timeout_seconds: int | None = None,
) -> DelegationResponse:
    """Enqueue a child step and block until the broker writes a response."""
    if timeout_seconds is None:
        timeout_seconds = _env_int("AGENTIC_K8S_DELEGATION_TIMEOUT_SECONDS", 3600, minimum=1)
    request_id = uuid.uuid4().hex
    mount = run_store_mount.rstrip("/")
    queue = delegation_queue_dir(mount)
    queue.mkdir(parents=True, exist_ok=True)
    responses = delegation_response_dir(mount)
    responses.mkdir(parents=True, exist_ok=True)

    req = DelegationRequest(
        request_id=request_id,
        parent_run_id=parent_run_id,
        parent_step_id=parent_step_id,
        agent_provider=agent_provider,
        task_description=task_description,
        task_expected_output=task_expected_output,
        topic=topic,
        mcp_providers=list(mcp_providers or []),
        enqueued_at=time.time(),
    )
    req_path = queue / f"{request_id}.json"
    write_json_atomic(req_path, req.to_dict())
    emit_log(
        f"delegation enqueued {request_id[:12]}",
        run_id=parent_run_id,
        step_id=parent_step_id,
        component="worker",
        extra={"delegate_agent": agent_provider.get("id")},
    )

    if delegation_inline_from_env():
        _process_delegation_request(mount, req_path, req)
        try:
            req_path.unlink(missing_ok=True)
        except OSError:
            pass
    else:
        deadline = time.time() + timeout_seconds
        resp_path = responses / f"{request_id}.json"
        while time.time() < deadline:
            response = _read_response_file(resp_path)
            if response is not None:
                _unlink_quietly(resp_path)
                return response
            time.sleep(0.5)
        # Nobody picked it up in time: withdraw it so it is not run after we gave up.
        _unlink_quietly(req_path)
        return DelegationResponse(
            request_id=request_id,
            succeeded=False,
            result_text=None,
            error=f"delegation timed out after {timeout_seconds}s",
            child_step_id=child_step_id_for_request(request_id),
        )

    resp_path = responses / f"{request_id}.json"
    response = _read_response_file(resp_path)
    if response is None:
        return DelegationResponse(
            request_id=request_id,
            succeeded=False,
            result_text=None,
            error="delegation inline processing failed",
            child_step_id=child_step_id_for_request(request_id),
        )
    _unlink_quietly(resp_path)
    return response


def _unlink_quietly(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def _read_response_file(path: Path) -> DelegationResponse | None:
    """Parse a response file; ``None`` when absent or not (yet) readable."""
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return DelegationResponse.from_dict(data)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None


def _write_child_step_spec(
    *,
    run_store_mount: str,
    request: DelegationRequest,
) -> tuple[Path, str]:
    child_step = child_step_id_for_request(request.request_id)
    mount = run_store_mount.rstrip("/")
    spec_path = Path(mount) / request.parent_run_id / f"{child_step}-spec.json"
    spec = {
        "schema_version": "0.1",
        "run_id": request.parent_run_id,
        "step_id": child_step,
        "step_index": 0,
        "workflow_name": f"delegation-{request.parent_step_id}",
        "topic": request.topic,
        "task": {
            "description": request.task_description,
            "expected_output": request.task_expected_output,
        },
        "agent_provider": request.agent_provider,
        "mcp_providers": request.mcp_providers,
        "prior_output": "",
        "inputs": {"topic": request.topic},
        "paths": {
            "run_store": mount,
            "artifacts_dir": f"{mount}/{request.parent_run_id}/artifacts",
        },
    }
    write_json_atomic(spec_path, spec)
    container_path = f"{mount}/{request.parent_run_id}/{child_step}-spec.json"
    return spec_path, container_path


def _spawn_child_job(
    *,
    request: DelegationRequest,
    spec_container_path: str,
) -> tuple[bool, str | None]:
    from orchestration.backends.kubernetes_jobs import KubernetesJobRunner

    runner = KubernetesJobRunner.from_env()
    child_step = child_step_id_for_request(request.request_id)
    provider_id = str(request.agent_provider.get("id") or "agent")
    # Always a dedicated Job: with the warm pool enabled the child would queue
    # behind the very worker that is blocked waiting for it (deadlock once every
    # replica runs a delegating parent).
    _record, wait = runner.run_step_job(
        run_id=request.parent_run_id,
        step_id=child_step,
        spec_container_path=spec_container_path,
        agent_provider_id=provider_id,
        sidecar_mcp_ids=None,
        use_warm_pool=False,
    )
    if wait.succeeded:
        return True, None
    return False, wait.message or f"child Job {child_step} failed"


def _read_child_result(run_store_mount: str, request: DelegationRequest) -> DelegationResponse:
    child_step = child_step_id_for_request(request.request_id)
    result_path = (
        Path(run_store_mount.rstrip("/"))
        / request.parent_run_id
        / child_step
        / "result.json"
    )
    if not result_path.is_file():
        return DelegationResponse(
            request_id=request.request_id,
            succeeded=False,
            result_text=None,
            error=f"missing child result at {result_path}",
            child_step_id=child_step,
        )
    try:
        data = json.loads(result_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("result is not a JSON object")
        exit_code = int(data.get("exit_code", 1))
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        return DelegationResponse(
            request_id=request.request_id,
            succeeded=False,
            result_text=None,
            error=f"unreadable child result at {result_path}: {exc}",
            child_step_id=child_step,
        )
    if exit_code != 0:
        return DelegationResponse(
            request_id=request.request_id,
            succeeded=False,
            result_text=data.get("result_text"),
            error=str(data.get("error") or f"child step exit {exit_code}"),
            child_step_id=child_step,
        )
    return DelegationResponse(
        request_id=request.request_id,
        succeeded=True,
        result_text=str(data.get("result_text") or ""),
        error=None,
        child_step_id=child_step,
    )


def _run_child_step_inline(spec_path: Path) -> int:
    from orchestration.execute_step import execute_step_from_spec_file

    return execute_step_from_spec_file(spec_path)


def _write_delegation_response(run_store_mount: str, response: DelegationResponse) -> None:
    path = delegation_response_dir(run_store_mount) / f"{response.request_id}.json"
    write_json_atomic(path, response.to_dict())


def _process_delegation_request(
    run_store_mount: str,
    claimed_path: Path,
    request: DelegationRequest,
) -> None:
    emit_log(
        f"processing delegation {request.request_id[:12]}",
        run_id=request.parent_run_id,
        step_id=request.parent_step_id,
        component="delegation-broker",
    )
    try:
        _spec_path, container_path = _write_child_step_spec(
            run_store_mount=run_store_mount,
            request=request,
        )
        if delegation_inline_from_env():
            exit_code = _run_child_step_inline(_spec_path)
            if exit_code != 0:
                response = DelegationResponse(
                    request_id=request.request_id,
                    succeeded=False,
                    result_text=None,
                    error=f"inline child step exit {exit_code}",
                    child_step_id=child_step_id_for_request(request.request_id),
                )
            else:
                response = _read_child_result(run_store_mount, request)
        else:
            ok, err = _spawn_child_job(request=request, spec_container_path=container_path)
            if not ok:
                response = DelegationResponse(
                    request_id=request.request_id,
                    succeeded=False,
                    result_text=None,
                    error=err,
                    child_step_id=child_step_id_for_request(request.request_id),
                )
            else:
                response = _read_child_result(run_store_mount, request)
    except Exception as exc:  # noqa: BLE001
        response = DelegationResponse(
            request_id=request.request_id,
            succeeded=False,
            result_text=None,
            error=str(exc),
            child_step_id=child_step_id_for_request(request.request_id),
        )
    _write_delegation_response(run_store_mount, response)
    emit_log(
        f"delegation complete success={response.succeeded}",
        run_id=request.parent_run_id,
        step_id=request.parent_step_id,
        component="delegation-broker",
        level="info" if response.succeeded else "error",
    )


def claim_next_delegation_request(
    run_store_mount: str,
) -> tuple[Path, DelegationRequest] | None:
    queue = delegation_queue_dir(run_store_mount)
    if not queue.is_dir():
        return None
    worker = _broker_identity().replace("/", "_")
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
            return claimed, DelegationRequest.from_dict(data)
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            # A broken request must not crash the broker. The file name is the
            # request id, so the waiting parent can still be told it failed.
            request_id = path.stem
            emit_log(
                f"rejecting unreadable delegation request {path.name}: {exc}",
                level="error",
                component="delegation-broker",
            )
            try:
                _write_delegation_response(
                    run_store_mount,
                    DelegationResponse(
                        request_id=request_id,
                        succeeded=False,
                        result_text=None,
                        error=f"unreadable delegation request: {exc}",
                        child_step_id=child_step_id_for_request(request_id),
                    ),
                )
            except OSError:
                pass
            _unlink_quietly(claimed)
            continue
    return None


def reclaim_stale_delegation_claims(run_store_mount: str, *, max_age_seconds: float) -> int:
    """Put ``*.json.claimed-<broker>`` files of a dead broker back in the queue.

    Claims carry the broker pod's hostname, so after a restart nothing ever looked
    at them again and the parent waited out its timeout. Live claims are kept
    fresh by a heartbeat; a claim whose response already exists is just removed.
    """
    queue = delegation_queue_dir(run_store_mount)
    if not queue.is_dir():
        return 0
    responses = delegation_response_dir(run_store_mount)
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
        base = name.split(".claimed-", 1)[0]
        dest = queue / base
        try:
            if dest.exists() or (responses / base).is_file():
                path.unlink(missing_ok=True)
            else:
                path.rename(dest)
                reclaimed += 1
        except OSError:
            continue
    return reclaimed


def gc_delegation_responses(run_store_mount: str, *, max_age_seconds: float) -> int:
    """Delete response files nobody collected (parent died or timed out)."""
    responses = delegation_response_dir(run_store_mount)
    if not responses.is_dir():
        return 0
    now = time.time()
    removed = 0
    try:
        candidates = list(responses.glob("*.json"))
    except OSError:
        return 0
    for path in candidates:
        try:
            if now - path.stat().st_mtime >= max_age_seconds:
                path.unlink()
                removed += 1
        except OSError:
            continue
    return removed


def _heartbeat_claim(path: Path, stop: threading.Event) -> None:
    while not stop.wait(_CLAIM_HEARTBEAT_SECONDS):
        try:
            os.utime(path, None)
        except OSError:
            return


def _serve_claimed_request(mount: str, path: Path, request: DelegationRequest) -> None:
    stop_hb = threading.Event()
    hb = threading.Thread(
        target=_heartbeat_claim,
        args=(path, stop_hb),
        name="delegation-claim-heartbeat",
        daemon=True,
    )
    hb.start()
    try:
        _process_delegation_request(mount, path, request)
    finally:
        stop_hb.set()
        hb.join(timeout=2.0)
        _unlink_quietly(path)


def run_delegation_broker_loop(
    *,
    run_store_mount: str,
    poll_interval: float = 0.5,
    stop: threading.Event | None = None,
) -> None:
    """Serve delegation requests concurrently until ``stop`` is set (or forever).

    Each request blocks on its child Job, so a serial loop made every other
    delegating parent wait behind the slowest child.
    """
    mount = run_store_mount.rstrip("/") or "/run/store"
    concurrency = delegation_concurrency_from_env()
    emit_log(
        f"delegation broker started (mount={mount}, concurrency={concurrency})",
        component="delegation-broker",
        extra={"broker": _broker_identity()},
    )
    in_flight = threading.BoundedSemaphore(concurrency)
    last_sweep = 0.0

    def _run(path: Path, request: DelegationRequest) -> None:
        try:
            _serve_claimed_request(mount, path, request)
        except Exception as exc:  # noqa: BLE001 - one bad request must not stop the broker
            emit_log(
                f"delegation request crashed: {exc}",
                level="error",
                run_id=request.parent_run_id,
                step_id=request.parent_step_id,
                component="delegation-broker",
            )
        finally:
            in_flight.release()

    with ThreadPoolExecutor(max_workers=concurrency, thread_name_prefix="delegation") as pool:
        while stop is None or not stop.is_set():
            now = time.time()
            if now - last_sweep >= 30.0:
                last_sweep = now
                try:
                    n = reclaim_stale_delegation_claims(
                        mount, max_age_seconds=_CLAIM_RECLAIM_SECONDS
                    )
                    if n:
                        emit_log(
                            f"reclaimed {n} stale delegation claim(s)",
                            component="delegation-broker",
                        )
                    gc_delegation_responses(
                        mount, max_age_seconds=float(delegation_response_ttl_seconds())
                    )
                except Exception:  # noqa: BLE001
                    pass
            # Only claim when a slot is free, so queued requests stay claimable
            # by another broker replica instead of sitting in our backlog.
            if not in_flight.acquire(timeout=poll_interval):
                continue
            claimed = claim_next_delegation_request(mount)
            if claimed is None:
                in_flight.release()
                time.sleep(poll_interval)
                continue
            path, request = claimed
            pool.submit(_run, path, request)
