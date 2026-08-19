"""ReachClientSimulator — WS overlay + custom-tool sandbox e2e against loopback AO."""

from __future__ import annotations

import json
import subprocess
import sys
import zipfile
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from orchestration.serve import fastapi_available

pytestmark = pytest.mark.unit

if not fastapi_available():  # pragma: no cover
    pytest.skip("fastapi not installed", allow_module_level=True)

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "custom_tools" / "mock_echo_tool"


@pytest.fixture
def kb_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.delenv("AGENTIC_REQUIRE_IDENTITY", raising=False)
    return tmp_path


def _build_echo_bundle(tmp_path: Path) -> tuple[bytes, dict]:
    out = tmp_path / "wheels"
    out.mkdir()
    proc = subprocess.run(
        [sys.executable, "-m", "pip", "wheel", str(FIXTURE_ROOT), "--no-deps", "-w", str(out)],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
    wheel = next(out.glob("*.whl"))
    manifest = json.loads((FIXTURE_ROOT / "manifest.json").read_text(encoding="utf-8"))
    manifest["wheel"] = wheel.name
    buf = BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        zf.write(wheel, arcname=wheel.name)
    return buf.getvalue(), manifest


def test_reach_client_simulator_sandbox_overlay_register(
    kb_root: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.session_overlay import merge_session_mcps, overlay_run_context
    from orchestration.serve.app import create_app
    from orchestration.tool_artifacts import reset_artifacts_for_tests

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA", "0")
    reset_artifacts_for_tests()

    bundle, manifest = _build_echo_bundle(tmp_path)
    headers = {"x-agentic-user-name": "sim", "x-agentic-session-id": "sim-1"}

    with TestClient(create_app(tool_root_path=kb_root)) as client:
        upload = client.post(
            "/api/v1/custom-tools/upload?appId=mock-comstar",
            content=bundle,
            headers={**headers, "Content-Type": "application/zip"},
        )
        assert upload.status_code == 200, upload.text
        artifact = upload.json()["artifact"]
        activate = client.post(
            "/api/v1/custom-tools/activate",
            json={
                "artifactId": artifact["id"],
                "appId": "mock-comstar",
                "toolId": manifest["toolId"],
                "toolVersion": manifest["toolVersion"],
            },
            headers=headers,
        )
        assert activate.status_code == 200, activate.text
        base_url = activate.json()["runtime"]["baseUrl"]
        assert base_url.startswith("http://127.0.0.1:")

        with client.websocket_connect("/ws", headers=headers) as ws:
            hello = ws.receive_json()
            assert hello.get("customToolSandbox") is True
            ws.send_json(
                {
                    "type": "session_overlay_register",
                    "appId": "mock-comstar",
                    "ttlSeconds": 120,
                    "agents": [
                        {
                            "id": "client.mock_comstar.agent",
                            "type": "ollama",
                            "role": "helper",
                            "goal": "help",
                            "backstory": "test",
                            "model": "qwen2.5:7b",
                        }
                    ],
                    "mcps": [],
                    "skills": [],
                }
            )
            ack = ws.receive_json()
            while ack.get("type") in ("status", "chunk"):
                ack = ws.receive_json()
            assert ack["type"] == "session_overlay_ack"

            with overlay_run_context(user_id="sim", session_id="sim-1", connection_id="ws"):
                merged = merge_session_mcps([])
            assert manifest["toolId"] in [m["id"] for m in merged]

        health = client.get(f"{base_url}/health")
        assert health.status_code == 200

    reset_artifacts_for_tests()


def test_legacy_tunnel_overlay_unchanged_when_sandbox_off(
    kb_root: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.serve.app import create_app
    from orchestration.session_overlay import get_overlay, reset_overlays_for_tests

    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    monkeypatch.setenv("AGENTIC_SERVE_MCP_TUNNEL", "1")
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "0")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY_ENSURE_OLLAMA", "0")
    reset_overlays_for_tests()
    headers = {"x-agentic-user-name": "legacy", "x-agentic-session-id": "legacy-1"}

    with TestClient(create_app(tool_root_path=kb_root)) as client:
        with client.websocket_connect("/ws", headers=headers) as ws:
            hello = ws.receive_json()
            assert hello.get("customToolSandbox") is False
            ws.send_json(
                {
                    "type": "session_overlay_register",
                    "appId": "mock-comstar",
                    "ttlSeconds": 120,
                    "agents": [
                        {
                            "id": "client.mock_comstar.agent",
                            "type": "ollama",
                            "role": "helper",
                            "goal": "help",
                            "backstory": "test",
                            "model": "qwen2.5:7b",
                        }
                    ],
                    "mcps": [
                        {
                            "id": "client.mock_comstar.tunnel_tool",
                            "streamable_http": {
                                "url": "tunnel://session-mcp/tunnel_tool",
                            },
                        }
                    ],
                    "skills": [],
                }
            )
            ack = ws.receive_json()
            while ack.get("type") in ("status", "chunk"):
                ack = ws.receive_json()
            assert ack["type"] == "session_overlay_ack"
            overlay = get_overlay("legacy", "legacy-1")
            assert overlay is not None
            assert overlay.mcps[0]["streamable_http"]["url"].startswith("tunnel://")

    reset_overlays_for_tests()
