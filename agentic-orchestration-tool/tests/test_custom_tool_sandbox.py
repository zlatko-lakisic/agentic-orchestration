"""Integration tests for custom tool artifact registry and sandbox runtime."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen

import pytest

from orchestration.custom_tool_contract import validate_manifest
from orchestration.session_overlay import (
    merge_session_mcps,
    overlay_run_context,
    register_overlay,
    reset_overlays_for_tests,
)
from orchestration.tool_artifacts import (
    ToolArtifactDenied,
    activate_artifact,
    custom_tool_sandbox_enabled,
    delete_artifact,
    ingest_upload,
    list_artifacts,
    reset_artifacts_for_tests,
)
from orchestration.tool_sandbox_runtime import stop_all_runtimes_for_tests
from tests.custom_tool_fixtures import FIXTURE_ROOT, build_mock_echo_upload_zip

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _sandbox_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "1")
    monkeypatch.setenv("AGENTIC_SERVE_SESSION_OVERLAY", "1")
    reset_artifacts_for_tests()
    reset_overlays_for_tests()
    stop_all_runtimes_for_tests()
    yield
    stop_all_runtimes_for_tests()
    reset_artifacts_for_tests()
    reset_overlays_for_tests()


def test_feature_flag_defaults_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_CUSTOM_TOOL_SANDBOX", raising=False)
    assert custom_tool_sandbox_enabled() is False


def test_upload_activate_and_healthcheck(tmp_path: Path) -> None:
    zip_bytes = build_mock_echo_upload_zip(tmp_path)
    record = ingest_upload(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        zip_bytes=zip_bytes,
    )
    assert record.manifest.tool_id == "client.mock_comstar.echo_tool"

    result = activate_artifact(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        tool_id=record.manifest.tool_id,
        tool_version=record.manifest.tool_version,
    )
    base_url = result["runtime"]["baseUrl"]
    assert base_url.startswith("http://127.0.0.1:")

    health_url = f"{base_url}/health"
    with urlopen(Request(health_url, method="GET"), timeout=3.0) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    assert body["ok"] is True

    listed = list_artifacts(user_id="ada", app_id="mock-comstar")
    assert len(listed) == 1
    assert listed[0].storage_key == record.storage_key


def test_merge_session_mcps_injects_sandbox_entry(tmp_path: Path) -> None:
    zip_bytes = build_mock_echo_upload_zip(tmp_path)
    record = ingest_upload(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        zip_bytes=zip_bytes,
    )
    activate_artifact(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        tool_id=record.manifest.tool_id,
        tool_version=record.manifest.tool_version,
    )

    register_overlay(
        user_id="ada",
        session_id="s1",
        connection_id="c1",
        app_id="mock-comstar",
        agents=[],
        mcps=[],
        stock_ids=set(),
    )
    with overlay_run_context(user_id="ada", session_id="s1", connection_id="c1"):
        merged = merge_session_mcps([])
    ids = [m["id"] for m in merged]
    assert "client.mock_comstar.echo_tool" in ids
    echo = next(m for m in merged if m["id"] == "client.mock_comstar.echo_tool")
    assert echo["streamable_http"]["url"].startswith("http://127.0.0.1:")
    assert "/mcp" in echo["streamable_http"]["url"]


def test_reject_duplicate_upload(tmp_path: Path) -> None:
    zip_bytes = build_mock_echo_upload_zip(tmp_path)
    ingest_upload(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        zip_bytes=zip_bytes,
    )
    with pytest.raises(ToolArtifactDenied, match="does not match"):
        ingest_upload(
            tool_root=tmp_path,
            user_id="ada",
            app_id="other-app",
            zip_bytes=zip_bytes,
        )


def test_delete_artifact_stops_runtime(tmp_path: Path) -> None:
    zip_bytes = build_mock_echo_upload_zip(tmp_path)
    record = ingest_upload(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        zip_bytes=zip_bytes,
    )
    activate_artifact(
        tool_root=tmp_path,
        user_id="ada",
        app_id="mock-comstar",
        tool_id=record.manifest.tool_id,
        tool_version=record.manifest.tool_version,
    )
    assert (
        delete_artifact(
            tool_root=tmp_path,
            user_id="ada",
            artifact_id=record.storage_key,
        )
        is True
    )
    assert list_artifacts(user_id="ada", app_id="mock-comstar") == []


def test_fixture_manifest_matches_contract() -> None:
    raw = json.loads((FIXTURE_ROOT / "manifest.json").read_text(encoding="utf-8"))
    manifest = validate_manifest(raw)
    assert manifest.http_module == "mock_echo_tool.server"
