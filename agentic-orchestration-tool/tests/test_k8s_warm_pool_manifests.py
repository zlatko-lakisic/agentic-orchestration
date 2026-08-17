from __future__ import annotations

from pathlib import Path

import pytest
import yaml

_WARM_POOL = Path(__file__).resolve().parents[1] / "deploy" / "k8s" / "warm-pool.yaml"


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
