from __future__ import annotations

import pytest

from orchestration.backends.k8s_settings import K8sSettings
from orchestration.backends.k8s_worker_pod import build_worker_job_pod_spec
from orchestration.k8s_mcp_compat import sidecar_containers_for_mcps


@pytest.mark.unit
def test_build_worker_pod_with_fetch_sidecar() -> None:
    settings = K8sSettings(
        namespace="ns",
        worker_image="worker:tag",
        run_store_pvc="pvc",
        run_store_mount="/run/store",
        job_ttl_seconds=3600,
        job_timeout_seconds=60,
        env_secret_name=None,
    )
    pod = build_worker_job_pod_spec(
        settings=settings,
        spec_container_path="/run/store/run/step-spec.json",
        sidecar_mcp_ids=["fetch_url"],
        agent_provider_id="openai_gpt4o_mini",
    )
    worker_names = [c["name"] for c in pod["containers"]]
    sidecar_names = [c["name"] for c in pod.get("initContainers", [])]
    assert worker_names == ["worker"]
    assert sidecar_names == ["mcp-fetch-gateway"]


@pytest.mark.unit
def test_sidecar_fetch_uses_supergateway() -> None:
    containers = sidecar_containers_for_mcps(["fetch_url"])
    assert len(containers) == 1
    assert "supergateway" in containers[0]["image"]
    assert "8080" in containers[0]["args"]
