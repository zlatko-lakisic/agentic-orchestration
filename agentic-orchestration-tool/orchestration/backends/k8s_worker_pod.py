"""Worker Job pod spec builder (K4 sidecars, K4.5 scheduling/resources)."""

from __future__ import annotations

import os
from typing import Any

from orchestration.backends.k8s_settings import (
    K8sSettings,
    withheld_worker_secret_names,
    worker_env_from_process,
    worker_env_literal_secrets_enabled,
)
from orchestration.k8s_mcp_compat import K8S_POD_SIDECAR_LOCAL_URL, sidecar_containers_for_mcps

_warned_no_env_secret = False


def worker_hardened_from_env() -> bool:
    """Opt-in strict container security context for worker Jobs.

    ``AGENTIC_K8S_WORKER_HARDENED=1`` drops all Linux capabilities and applies the
    runtime-default seccomp profile. Off by default: a root worker without
    ``CAP_DAC_OVERRIDE`` cannot write run-store directories owned by another uid,
    which this repo cannot verify for every run-store layout.
    """
    raw = os.getenv("AGENTIC_K8S_WORKER_HARDENED", "").strip().lower()
    return raw in ("1", "true", "yes", "on")


def _warn_secrets_withheld_without_secret(settings: K8sSettings) -> None:
    """Log once when credentials are withheld but no Secret is configured to supply them."""
    global _warned_no_env_secret
    if _warned_no_env_secret or settings.env_secret_name or worker_env_literal_secrets_enabled():
        return
    names = withheld_worker_secret_names()
    if not names:
        return
    _warned_no_env_secret = True
    try:
        from orchestration.structured_logging import emit_log

        emit_log(
            "worker Jobs will not receive secret-like env vars: AGENTIC_K8S_ENV_SECRET is unset. "
            "Create a Secret and set AGENTIC_K8S_ENV_SECRET, or set "
            "AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS=1 to copy them into Job specs as literals.",
            level="warning",
            component="coordinator",
            extra={"withheld": names},
        )
    except Exception:  # noqa: BLE001
        pass


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
    _warn_secrets_withheld_without_secret(settings)

    # The worker never needs to gain privileges (no setuid helpers in the image).
    container_security: dict[str, Any] = {"allowPrivilegeEscalation": False}
    if worker_hardened_from_env():
        container_security["capabilities"] = {"drop": ["ALL"]}
        container_security["seccompProfile"] = {"type": "RuntimeDefault"}
    worker["securityContext"] = container_security

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

    if settings.worker_run_as_user is not None:
        pod_security: dict[str, Any] = {"runAsUser": settings.worker_run_as_user}
        if settings.worker_run_as_user != 0:
            pod_security["runAsNonRoot"] = True
        pod_spec["securityContext"] = pod_security

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
