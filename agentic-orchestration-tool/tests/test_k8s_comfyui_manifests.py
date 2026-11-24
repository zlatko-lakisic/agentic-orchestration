"""ComfyUI k8s deployment defaults (ClusterIP, no hostPort)."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

_TOOL_ROOT = Path(__file__).resolve().parents[1]
_COMFY_DIR = _TOOL_ROOT / "deploy" / "k8s" / "comfyui"


def _load_yaml(name: str) -> dict:
    with (_COMFY_DIR / name).open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.mark.unit
def test_comfyui_service_is_clusterip_only() -> None:
    svc = _load_yaml("service.yaml")
    assert svc["metadata"]["name"] == "agentic-comfyui"
    assert svc["spec"]["type"] == "ClusterIP"
    assert svc["spec"]["ports"][0]["port"] == 8188
    assert not (_COMFY_DIR / "service-nodeport.yaml").exists()
    assert not (_COMFY_DIR / "ingress.yaml").exists()


@pytest.mark.unit
def test_comfyui_deployment_no_hostport_and_disable_smart_memory() -> None:
    doc = _load_yaml("deployment.yaml")
    assert doc["spec"]["strategy"]["type"] == "Recreate"
    container = doc["spec"]["template"]["spec"]["containers"][0]
    assert container["name"] == "comfyui"
    ports = container.get("ports") or []
    for p in ports:
        assert "hostPort" not in p
    args = "\n".join(container.get("args") or [])
    assert "--disable-smart-memory" in args
    exec_lines = [
        ln.strip()
        for ln in args.splitlines()
        if ln.strip().startswith("exec python main.py")
    ]
    assert exec_lines, "expected ComfyUI exec line"
    assert "--lowvram" not in exec_lines[0]
    limits = (container.get("resources") or {}).get("limits") or {}
    assert limits.get("memory") == "24Gi"
    vol_names = {v["name"] for v in doc["spec"]["template"]["spec"]["volumes"]}
    assert "comfyui-models" in vol_names
    assert "comfyui-output" in vol_names


@pytest.mark.unit
def test_enable_script_refuses_aarch64_docs() -> None:
    script = (_TOOL_ROOT / "scripts" / "jetson-enable-comfyui.sh").read_text(
        encoding="utf-8"
    )
    assert "aarch64" in script
    assert "AGENTIC_JETSON_ENABLE_COMFYUI" in script
    deploy = (_TOOL_ROOT / "scripts" / "jetson-deploy.sh").read_text(encoding="utf-8")
    assert "AGENTIC_JETSON_ENABLE_COMFYUI" in deploy
    assert "AGENTIC_COMFYUI_" in deploy
