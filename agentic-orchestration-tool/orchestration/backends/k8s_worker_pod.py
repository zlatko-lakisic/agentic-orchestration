"""Worker Job pod spec builder (K4 sidecars, K4.5 scheduling/resources)."""

from __future__ import annotations

from typing import Any

from orchestration.backends.k8s_settings import K8sSettings, worker_env_from_process
from orchestration.k8s_mcp_compat import K8S_POD_SIDECAR_LOCAL_URL, sidecar_containers_for_mcps


def build_worker_job_pod_spec(
    *,
    settings: K8sSettings,
    spec_container_path: str,
    sidecar_mcp_ids: list[str] | None = None,
    agent_provider_id: str | None = None,
) -> dict[str, Any]:
    sidecar_mcp_ids = sidecar_mcp_ids or []
    sidecars = sidecar_containers_for_mcps(sidecar_mcp_ids)

    worker: dict[str, Any] = {
        "name": "worker",
        "image": settings.worker_image,
        "args": [spec_container_path],
        "volumeMounts": [{"name": "run-store", "mountPath": settings.run_store_mount}],
    }

    if settings.worker_resources:
        worker["resources"] = settings.worker_resources

    env_vars = worker_env_from_process()
    env_vars = [e for e in env_vars if e.get("name") != "AGENTIC_RUN_STORE_PATH"]
    env_vars.append({"name": "AGENTIC_RUN_STORE_PATH", "value": settings.run_store_mount})
    if env_vars:
        worker["env"] = env_vars
    if settings.env_secret_name:
        worker["envFrom"] = [{"secretRef": {"name": settings.env_secret_name}}]

    if sidecars:
        probe_port = min(
            int(K8S_POD_SIDECAR_LOCAL_URL[mid].split(":")[2].split("/")[0])
            for mid in sidecar_mcp_ids
            if mid in K8S_POD_SIDECAR_LOCAL_URL
        )
        worker["startupProbe"] = {
            "tcpSocket": {"port": probe_port},
            "periodSeconds": 2,
            "failureThreshold": 90,
        }

    pod_spec: dict[str, Any] = {
        "restartPolicy": "Never",
        "containers": [worker],
        "volumes": [
            {
                "name": "run-store",
                "persistentVolumeClaim": {"claimName": settings.run_store_pvc},
            }
        ],
    }

    if sidecars:
        pod_spec["initContainers"] = [
            {**container, "restartPolicy": "Always"} for container in sidecars
        ]

    node_selector = _node_selector_for_job(
        settings=settings,
        agent_provider_id=agent_provider_id,
    )
    if node_selector:
        pod_spec["nodeSelector"] = node_selector

    return pod_spec


def _node_selector_for_job(
    *,
    settings: K8sSettings,
    agent_provider_id: str | None,
) -> dict[str, str] | None:
    if not settings.gpu_node_selector:
        return None
    gpu_providers = settings.gpu_provider_ids
    if gpu_providers and agent_provider_id and agent_provider_id not in gpu_providers:
        return None
    return dict(settings.gpu_node_selector)
