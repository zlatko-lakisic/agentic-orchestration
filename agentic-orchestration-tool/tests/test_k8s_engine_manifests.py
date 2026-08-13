from __future__ import annotations

from pathlib import Path

import pytest
import yaml

_ENGINE_DIR = Path(__file__).resolve().parents[1] / "deploy" / "k8s" / "engine"


def _load_yaml(name: str) -> dict:
    with (_ENGINE_DIR / name).open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.mark.unit
def test_engine_deployment_shares_run_store_with_warm_pool() -> None:
    """Engine must enqueue warm-pool jobs on the shared PVC, not pod-local disk."""
    doc = _load_yaml("deployment.yaml")
    spec = doc["spec"]["template"]["spec"]
    container = spec["containers"][0]
    mounts = {m["mountPath"]: m for m in container["volumeMounts"]}
    assert "/run/store" in mounts
    assert mounts["/run/store"]["name"] == "run-store"
    volumes = {v["name"]: v for v in spec["volumes"]}
    assert volumes["run-store"]["persistentVolumeClaim"]["claimName"] == "agentic-run-store"
    env = {e["name"]: e.get("value") for e in container["env"]}
    assert env["AGENTIC_RUN_STORE_PATH"] == "/run/store"
    assert env["AGENTIC_K8S_RUN_STORE_MOUNT"] == "/run/store"
    assert env["AGENTIC_K8S_RUN_STORE_PVC"] == "agentic-run-store"
    assert env["AGENTIC_EXECUTION_BACKEND"] == "kubernetes"
