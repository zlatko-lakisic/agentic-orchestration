from __future__ import annotations

import re
import time
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


def job_name_for_step(*, run_id: str, step_id: str) -> str:
    run_part = sanitize_k8s_name(run_id[:12], max_len=12)
    step_part = sanitize_k8s_name(step_id, max_len=40)
    return sanitize_k8s_name(f"agentic-{run_part}-{step_part}", max_len=63)


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
    ) -> tuple[K8sJobRecord, K8sJobWaitResult]:
        settings = self._settings
        from orchestration.backends.kubernetes_warm_pool import (
            dispatch_step_via_warm_pool,
            warm_pool_enabled_from_env,
        )

        if warm_pool_enabled_from_env() and not sidecar_mcp_ids:
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

        job_name = job_name_for_step(run_id=run_id, step_id=step_id)
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
                "template": {
                    "metadata": {"labels": labels},
                    "spec": pod_spec,
                },
            },
        }

        self._batch.create_namespaced_job(namespace=settings.namespace, body=job_body)
        emit_log(
            f"created Job {job_name}",
            run_id=run_id,
            step_id=step_id,
            component="coordinator",
            extra={"namespace": settings.namespace},
        )
        wait = self._wait_for_job(job_name=job_name)
        pod_name = wait.pod_name or self._find_pod_name(job_name=job_name)
        record = K8sJobRecord(job_name=job_name, namespace=settings.namespace, pod_name=pod_name)
        return record, wait

    def _wait_for_job(self, *, job_name: str) -> K8sJobWaitResult:
        deadline = time.time() + self._settings.job_timeout_seconds
        while time.time() < deadline:
            job = self._batch.read_namespaced_job_status(
                name=job_name,
                namespace=self._settings.namespace,
            )
            status = job.status
            if status and status.succeeded:
                emit_log(
                    f"Job {job_name} succeeded",
                    component="coordinator",
                )
                return K8sJobWaitResult(
                    succeeded=True,
                    failed=False,
                    pod_name=self._find_pod_name(job_name=job_name),
                    message=None,
                )
            if status and status.failed:
                return K8sJobWaitResult(
                    succeeded=False,
                    failed=True,
                    pod_name=self._find_pod_name(job_name=job_name),
                    message=f"Job {job_name} failed",
                )
            time.sleep(2)
        return K8sJobWaitResult(
            succeeded=False,
            failed=True,
            pod_name=self._find_pod_name(job_name=job_name),
            message=f"Job {job_name} timed out after {self._settings.job_timeout_seconds}s",
        )

    def _find_pod_name(self, *, job_name: str) -> str | None:
        pods = self._core.list_namespaced_pod(
            namespace=self._settings.namespace,
            label_selector=f"job-name={job_name}",
        )
        items = pods.items or []
        if not items:
            return None
        return items[0].metadata.name
