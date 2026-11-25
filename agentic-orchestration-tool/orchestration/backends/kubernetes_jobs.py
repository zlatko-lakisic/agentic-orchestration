from __future__ import annotations

import os
import re
import time
import uuid
from typing import Any

from orchestration.backends.k8s_settings import K8sSettings
from orchestration.backends.k8s_worker_pod import build_worker_job_pod_spec
from orchestration.backends.kubernetes_types import K8sJobRecord, K8sJobWaitResult
from orchestration.structured_logging import emit_log


def sanitize_k8s_name(raw: str, *, max_len: int = 63) -> str:
    text = re.sub(r"[^a-z0-9-]", "-", raw.lower())
    text = re.sub(r"-+", "-", text).strip("-")
    if not text:
        text = "step"
    return text[:max_len].strip("-")


def job_name_for_step(*, run_id: str, step_id: str, suffix: str = "") -> str:
    """Job name for a step; ``suffix`` (per-attempt id) is always preserved.

    Without a suffix the name is deterministic per ``(run_id, step_id)``, which
    collides (409 AlreadyExists) when a step is retried while the previous
    attempt's Job is still inside ``ttlSecondsAfterFinished``.
    """
    run_part = sanitize_k8s_name(run_id[:12], max_len=12)
    step_part = sanitize_k8s_name(step_id, max_len=40)
    base = f"agentic-{run_part}-{step_part}"
    suffix_part = sanitize_k8s_name(suffix, max_len=12) if suffix else ""
    if not suffix_part:
        return sanitize_k8s_name(base, max_len=63)
    head = sanitize_k8s_name(base, max_len=63 - len(suffix_part) - 1)
    return f"{head}-{suffix_part}"


def new_job_attempt_suffix() -> str:
    return uuid.uuid4().hex[:6]


# Container ``state.waiting.reason`` values that never resolve on their own.
_FATAL_WAITING_REASONS = frozenset({"InvalidImageName", "ErrImageNeverPull"})
# Reasons that usually mean the pod will not start, but can be transient.
_STUCK_WAITING_REASONS = frozenset(
    {
        "ImagePullBackOff",
        "ErrImagePull",
        "CreateContainerConfigError",
        "CreateContainerError",
        "RunContainerError",
    }
)


def job_start_timeout_seconds() -> int:
    """How long a pod may sit unschedulable / unable to start before the step fails.

    ``AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS`` (default 600; ``0`` disables the
    check and restores the old behaviour of waiting the full Job timeout).
    """
    raw = os.getenv("AGENTIC_K8S_JOB_START_TIMEOUT_SECONDS", "").strip()
    if not raw:
        return 600
    try:
        return max(0, int(raw))
    except ValueError:
        return 600


def _describe_api_error(exc: BaseException) -> str:
    status = getattr(exc, "status", None)
    reason = getattr(exc, "reason", None)
    if status or reason:
        return f"{status or ''} {reason or ''}".strip()
    return f"{type(exc).__name__}: {exc}"[:300]


def spec_path_in_container(*, mount: str, run_id: str, step_id: str) -> str:
    mount_clean = mount.rstrip("/")
    return f"{mount_clean}/{run_id}/{step_id}-spec.json"


class KubernetesJobRunner:
    """Create and wait for one-shot worker Jobs (K8s Phase 3)."""

    def __init__(
        self,
        batch_api: Any,
        core_api: Any,
        *,
        settings: K8sSettings,
    ) -> None:
        self._batch = batch_api
        self._core = core_api
        self._settings = settings
        self._poll_interval = 2.0

    @classmethod
    def from_env(cls) -> KubernetesJobRunner:
        from kubernetes import client, config

        try:
            config.load_incluster_config()
        except config.ConfigException:
            config.load_kube_config()
        settings = K8sSettings.from_env()
        return cls(client.BatchV1Api(), client.CoreV1Api(), settings=settings)

    def run_step_job(
        self,
        *,
        run_id: str,
        step_id: str,
        spec_container_path: str,
        agent_provider_id: str,
        sidecar_mcp_ids: list[str] | None = None,
        use_warm_pool: bool = True,
    ) -> tuple[K8sJobRecord, K8sJobWaitResult]:
        """Run one step as a Job (or via the warm pool when enabled).

        ``use_warm_pool=False`` forces a dedicated Job: delegation children must
        not queue behind the warm-pool worker that is blocked running their parent.
        """
        settings = self._settings
        from orchestration.backends.kubernetes_warm_pool import (
            dispatch_step_via_warm_pool,
            warm_pool_enabled_from_env,
        )

        if use_warm_pool and warm_pool_enabled_from_env() and not sidecar_mcp_ids:
            from orchestration.run_store import shared_run_store_mount_path

            return dispatch_step_via_warm_pool(
                namespace=settings.namespace,
                run_store_mount=shared_run_store_mount_path(),
                run_id=run_id,
                step_id=step_id,
                spec_container_path=spec_container_path,
                agent_provider_id=agent_provider_id,
                timeout_seconds=settings.job_timeout_seconds,
            )

        # Per-attempt suffix: a retry must not collide with the previous attempt's
        # Job, which stays around for ``ttlSecondsAfterFinished``.
        job_name = job_name_for_step(
            run_id=run_id,
            step_id=step_id,
            suffix=new_job_attempt_suffix(),
        )
        labels = {
            "app.kubernetes.io/name": "agentic-orchestrator-worker",
            "agentic.run_id": sanitize_k8s_name(run_id, max_len=63),
            "agentic.step_id": sanitize_k8s_name(step_id, max_len=63),
            "agentic.agent_provider_id": sanitize_k8s_name(agent_provider_id, max_len=63),
        }

        pod_spec = build_worker_job_pod_spec(
            settings=settings,
            spec_container_path=spec_container_path,
            sidecar_mcp_ids=sidecar_mcp_ids,
            agent_provider_id=agent_provider_id,
        )

        job_body = {
            "apiVersion": "batch/v1",
            "kind": "Job",
            "metadata": {
                "name": job_name,
                "namespace": settings.namespace,
                "labels": labels,
            },
            "spec": {
                "ttlSecondsAfterFinished": settings.job_ttl_seconds,
                "backoffLimit": 0,
                # Server-side stop: the worker must not outlive the coordinator's wait.
                "activeDeadlineSeconds": max(1, int(settings.job_timeout_seconds)),
                "template": {
                    "metadata": {"labels": labels},
                    "spec": pod_spec,
                },
            },
        }

        try:
            self._batch.create_namespaced_job(namespace=settings.namespace, body=job_body)
        except Exception as exc:  # noqa: BLE001 - ApiException and transport errors
            message = f"failed to create Job {job_name}: {_describe_api_error(exc)}"
            emit_log(
                message,
                level="error",
                run_id=run_id,
                step_id=step_id,
                component="coordinator",
                extra={"namespace": settings.namespace},
            )
            return (
                K8sJobRecord(job_name=job_name, namespace=settings.namespace, pod_name=None),
                K8sJobWaitResult(succeeded=False, failed=True, pod_name=None, message=message),
            )
        emit_log(
            f"created Job {job_name}",
            run_id=run_id,
            step_id=step_id,
            component="coordinator",
            extra={"namespace": settings.namespace},
        )
        wait = self._wait_for_job(job_name=job_name, run_id=run_id, step_id=step_id)
        pod_name = wait.pod_name or self._find_pod_name(job_name=job_name)
        record = K8sJobRecord(job_name=job_name, namespace=settings.namespace, pod_name=pod_name)
        return record, wait

    def _wait_for_job(
        self,
        *,
        job_name: str,
        run_id: str = "",
        step_id: str = "",
    ) -> K8sJobWaitResult:
        timeout = self._settings.job_timeout_seconds
        deadline = time.time() + timeout
        start_timeout = job_start_timeout_seconds()
        stuck_since: float | None = None
        api_errors = 0
        while time.time() < deadline:
            try:
                job = self._batch.read_namespaced_job_status(
                    name=job_name,
                    namespace=self._settings.namespace,
                )
            except Exception as exc:  # noqa: BLE001 - a transient API error must not abort the step
                api_errors += 1
                if api_errors == 1 or api_errors % 15 == 0:
                    emit_log(
                        f"Job {job_name} status read failed ({api_errors}x): "
                        f"{_describe_api_error(exc)}",
                        level="warning",
                        run_id=run_id,
                        step_id=step_id,
                        component="coordinator",
                    )
                time.sleep(self._poll_interval)
                continue
            api_errors = 0
            status = job.status
            if status and status.succeeded:
                emit_log(
                    f"Job {job_name} succeeded",
                    run_id=run_id,
                    step_id=step_id,
                    component="coordinator",
                )
                return K8sJobWaitResult(
                    succeeded=True,
                    failed=False,
                    pod_name=self._find_pod_name(job_name=job_name),
                    message=None,
                )
            if status and status.failed:
                emit_log(
                    f"Job {job_name} failed",
                    level="error",
                    run_id=run_id,
                    step_id=step_id,
                    component="coordinator",
                )
                return K8sJobWaitResult(
                    succeeded=False,
                    failed=True,
                    pod_name=self._find_pod_name(job_name=job_name),
                    message=f"Job {job_name} failed",
                )
            # Not finished yet: is the pod able to start at all?
            if start_timeout > 0:
                blocked = self._pod_start_blocker(job_name=job_name)
                if blocked is None:
                    stuck_since = None
                else:
                    reason, fatal = blocked
                    now = time.time()
                    if stuck_since is None:
                        stuck_since = now
                    if fatal or now - stuck_since >= start_timeout:
                        pod_name = self._find_pod_name(job_name=job_name)
                        message = (
                            f"Job {job_name} pod cannot start: {reason}"
                            if fatal
                            else f"Job {job_name} pod did not start within {start_timeout}s: {reason}"
                        )
                        emit_log(
                            message,
                            level="error",
                            run_id=run_id,
                            step_id=step_id,
                            component="coordinator",
                        )
                        self._delete_job(job_name=job_name, run_id=run_id, step_id=step_id)
                        return K8sJobWaitResult(
                            succeeded=False,
                            failed=True,
                            pod_name=pod_name,
                            message=message,
                        )
            time.sleep(self._poll_interval)
        emit_log(
            f"Job {job_name} timed out after {timeout}s",
            level="error",
            run_id=run_id,
            step_id=step_id,
            component="coordinator",
        )
        pod_name = self._find_pod_name(job_name=job_name)
        # Stop the worker: a timed-out step must not keep spending LLM/GPU time.
        self._delete_job(job_name=job_name, run_id=run_id, step_id=step_id)
        return K8sJobWaitResult(
            succeeded=False,
            failed=True,
            pod_name=pod_name,
            message=f"Job {job_name} timed out after {timeout}s",
        )

    def _delete_job(self, *, job_name: str, run_id: str = "", step_id: str = "") -> bool:
        """Delete the Job and its pods (foreground propagation). Never raises."""
        try:
            self._batch.delete_namespaced_job(
                name=job_name,
                namespace=self._settings.namespace,
                propagation_policy="Foreground",
            )
        except Exception as exc:  # noqa: BLE001
            emit_log(
                f"failed to delete Job {job_name}: {_describe_api_error(exc)}",
                level="warning",
                run_id=run_id,
                step_id=step_id,
                component="coordinator",
            )
            return False
        emit_log(
            f"deleted Job {job_name}",
            run_id=run_id,
            step_id=step_id,
            component="coordinator",
        )
        return True

    def _list_job_pods(self, *, job_name: str) -> list[Any]:
        try:
            pods = self._core.list_namespaced_pod(
                namespace=self._settings.namespace,
                label_selector=f"job-name={job_name}",
            )
        except Exception:  # noqa: BLE001
            return []
        items = getattr(pods, "items", None) or []
        return list(items) if isinstance(items, (list, tuple)) else []

    def _pod_start_blocker(self, *, job_name: str) -> tuple[str, bool] | None:
        """Return ``(reason, fatal)`` when the Job's pod cannot start, else ``None``."""
        for pod in self._list_job_pods(job_name=job_name):
            status = getattr(pod, "status", None)
            if status is None:
                continue
            statuses: list[Any] = []
            for attr in ("init_container_statuses", "container_statuses"):
                value = getattr(status, attr, None)
                if isinstance(value, (list, tuple)):
                    statuses.extend(value)
            for cs in statuses:
                waiting = getattr(getattr(cs, "state", None), "waiting", None)
                reason = getattr(waiting, "reason", None)
                if not isinstance(reason, str) or not reason:
                    continue
                detail = getattr(waiting, "message", None)
                text = f"{reason}: {detail}" if isinstance(detail, str) and detail else reason
                if reason in _FATAL_WAITING_REASONS:
                    return text[:300], True
                if reason in _STUCK_WAITING_REASONS:
                    return text[:300], False
            if getattr(status, "phase", None) == "Pending":
                conditions = getattr(status, "conditions", None)
                if isinstance(conditions, (list, tuple)):
                    for cond in conditions:
                        if (
                            getattr(cond, "type", None) == "PodScheduled"
                            and getattr(cond, "status", None) == "False"
                            and getattr(cond, "reason", None) == "Unschedulable"
                        ):
                            detail = getattr(cond, "message", None)
                            text = (
                                f"Unschedulable: {detail}"
                                if isinstance(detail, str) and detail
                                else "Unschedulable"
                            )
                            return text[:300], False
        return None

    def _find_pod_name(self, *, job_name: str) -> str | None:
        items = self._list_job_pods(job_name=job_name)
        if not items:
            return None
        name = getattr(getattr(items[0], "metadata", None), "name", None)
        return name if isinstance(name, str) else None
