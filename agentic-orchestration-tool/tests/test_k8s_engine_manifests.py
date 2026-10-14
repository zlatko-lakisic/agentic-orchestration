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


_OTEL_134_PINS = (
    "opentelemetry-api==1.34.1",
    "opentelemetry-sdk==1.34.1",
    "opentelemetry-exporter-otlp-proto-common==1.34.1",
    "opentelemetry-exporter-otlp-proto-grpc==1.34.1",
    "opentelemetry-exporter-otlp-proto-http==1.34.1",
    "opentelemetry-proto==1.34.1",
    "opentelemetry-semantic-conventions==0.55b1",
)


@pytest.mark.unit
def test_engine_and_image_pin_the_same_opentelemetry_set() -> None:
    """CrewAI 1.12.2's OTLP exporter and opentelemetry-api must stay on 1.34.1."""
    root = Path(__file__).resolve().parents[1]
    requirements = (root / "requirements.txt").read_text(encoding="utf-8")
    serve = (root / "requirements-serve.txt").read_text(encoding="utf-8")
    for pin in _OTEL_134_PINS:
        assert pin in requirements
        assert pin in serve


@pytest.mark.unit
def test_engine_startup_realigns_drifted_opentelemetry() -> None:
    doc = _load_yaml("deployment.yaml")
    script = doc["spec"]["template"]["spec"]["containers"][0]["args"][0]
    assert "_ExtendedAttributes" in script
    assert "requirements-serve.txt" in script
    assert "(0, 142)" in script
