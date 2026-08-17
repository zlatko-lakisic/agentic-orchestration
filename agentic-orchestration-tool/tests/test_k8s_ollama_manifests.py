"""Ollama k8s deployment defaults."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

_OLLAMA_DIR = Path(__file__).resolve().parents[1] / "deploy" / "k8s" / "ollama"


def _load_yaml(name: str) -> dict:
    with (_OLLAMA_DIR / name).open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.mark.unit
def test_ollama_deployment_caps_context_length() -> None:
    """Daemon must set OLLAMA_CONTEXT_LENGTH so 128k models cannot OOM the host."""
    doc = _load_yaml("deployment.yaml")
    containers = doc["spec"]["template"]["spec"]["containers"]
    ollama = next(c for c in containers if c["name"] == "ollama")
    env = {e["name"]: e.get("value") for e in ollama["env"]}
    assert env["OLLAMA_HOST"] == "127.0.0.1:11435"
    assert env["OLLAMA_KEEP_ALIVE"] == "120"
    assert env["OLLAMA_CONTEXT_LENGTH"] == "16384"


@pytest.mark.unit
def test_ollama_deployment_has_resource_broker_sidecar() -> None:
    doc = _load_yaml("deployment.yaml")
    containers = doc["spec"]["template"]["spec"]["containers"]
    names = [c["name"] for c in containers]
    assert names == ["ollama", "resource-broker"]
    broker = next(c for c in containers if c["name"] == "resource-broker")
    env = {e["name"]: e.get("value") for e in broker["env"]}
    assert env["AGENTIC_OLLAMA_RESOURCE_SHARING"] == "1"
    assert env["AGENTIC_OLLAMA_UPSTREAM"] == "http://127.0.0.1:11435"
    assert env["AGENTIC_OLLAMA_BROKER_PORT"] == "11434"
    assert broker["ports"][0]["containerPort"] == 11434
    svc = _load_yaml("service.yaml")
    assert svc["spec"]["ports"][0]["port"] == 11434
    assert svc["spec"]["ports"][0]["targetPort"] == 11434
