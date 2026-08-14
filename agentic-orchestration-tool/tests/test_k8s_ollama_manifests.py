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
    container = doc["spec"]["template"]["spec"]["containers"][0]
    env = {e["name"]: e.get("value") for e in container["env"]}
    assert env["OLLAMA_HOST"] == "0.0.0.0:11434"
    assert env["OLLAMA_KEEP_ALIVE"] == "-1"
    assert env["OLLAMA_CONTEXT_LENGTH"] == "16384"
