from __future__ import annotations

from pathlib import Path

import pytest
import yaml

_COORDINATOR_DIR = (
    Path(__file__).resolve().parents[1] / "deploy" / "k8s" / "coordinator"
)


def _load_yaml(name: str) -> dict:
    with (_COORDINATOR_DIR / name).open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.mark.unit
def test_coordinator_deployment_uses_service_account_and_run_store() -> None:
    doc = _load_yaml("deployment.yaml")
    spec = doc["spec"]["template"]["spec"]
    assert spec["serviceAccountName"] == "agentic-coordinator"
    mounts = {m["mountPath"] for m in spec["containers"][0]["volumeMounts"]}
    assert "/run/store" in mounts
    env = {e["name"]: e.get("value") for e in spec["containers"][0]["env"]}
    assert env["AGENTIC_EXECUTION_BACKEND"] == "kubernetes"
    assert env["AGENTIC_RUN_STORE_PATH"] == "/run/store"


@pytest.mark.unit
def test_coordinator_role_can_manage_jobs() -> None:
    doc = _load_yaml("role.yaml")
    rules = doc["rules"]
    job_rule = next(r for r in rules if r["resources"] == ["jobs"])
    assert "create" in job_rule["verbs"]
    assert "get" in job_rule["verbs"]


@pytest.mark.unit
def test_coordinator_kustomization_lists_core_resources() -> None:
    doc = _load_yaml("kustomization.yaml")
    resources = set(doc["resources"])
    assert "deployment.yaml" in resources
    assert "role.yaml" in resources
    assert "service.yaml" in resources
