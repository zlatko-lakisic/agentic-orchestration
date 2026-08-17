from __future__ import annotations

from pathlib import Path

import pytest
import yaml

_WARM_POOL = Path(__file__).resolve().parents[1] / "deploy" / "k8s" / "warm-pool.yaml"
_BOOTSTRAP_PATCH = (
    Path(__file__).resolve().parents[1]
    / "deploy"
    / "k8s"
    / "warm-pool-fastapi-bootstrap-patch.yaml"
)


@pytest.mark.unit
def test_warm_pool_bootstraps_fastapi_before_worker_loop() -> None:
    """CrewAI + MCP in warm-pool imports litellm → fastapi; stale images need a startup install."""
    doc = yaml.safe_load(_WARM_POOL.read_text(encoding="utf-8"))
    container = doc["spec"]["template"]["spec"]["containers"][0]
    assert container["name"] == "worker"
    script = "\n".join(container.get("args") or [])
    assert "import fastapi" in script
    assert "pip install" in script
    assert "--warm-pool-worker" in script
    assert container["command"] == ["/bin/bash", "-c"]
    assert "resolve_python" in script
    assert "fastapi_ok" in script
    assert "/app/tool/.venv/bin/python" in script


@pytest.mark.unit
def test_warm_pool_tool_venv_hostpath_patch() -> None:
    path = (
        Path(__file__).resolve().parents[1]
        / "deploy"
        / "k8s"
        / "warm-pool-jetson-tool-venv-hostpath-patch.yaml"
    )
    doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    container = doc["spec"]["template"]["spec"]["containers"][0]
    env = {e["name"]: e["value"] for e in container.get("env") or []}
    assert env["AGENTIC_PYTHON"] == "/app/tool/.venv/bin/python"
    mounts = {m["name"]: m["mountPath"] for m in container.get("volumeMounts") or []}
    assert mounts["jetson-tool-venv"] == "/app/tool/.venv"


@pytest.mark.unit
def test_warm_pool_fastapi_bootstrap_patch_matches_manifest() -> None:
    """jetson-sync-warm-pool.sh patches command/args/env — must stay in sync with warm-pool.yaml."""
    base = yaml.safe_load(_WARM_POOL.read_text(encoding="utf-8"))["spec"]["template"]["spec"]["containers"][0]
    patch = yaml.safe_load(_BOOTSTRAP_PATCH.read_text(encoding="utf-8"))["spec"]["template"]["spec"]["containers"][0]
    assert patch["command"] == base["command"]
    assert patch["args"] == base["args"]


@pytest.mark.unit
def test_warm_pool_edge_rollout_uses_recreate() -> None:
    path = Path(__file__).resolve().parents[1] / "deploy" / "k8s" / "warm-pool-edge-rollout-patch.yaml"
    doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert doc["spec"]["strategy"]["type"] == "Recreate"
    assert doc["spec"]["progressDeadlineSeconds"] >= 900
