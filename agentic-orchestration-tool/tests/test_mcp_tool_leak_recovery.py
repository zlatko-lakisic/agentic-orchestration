"""Tests for MCP tool-call leak detection and filesystem list harness."""

from __future__ import annotations

from pathlib import Path

from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak
from orchestration.mcp_tool_leak_recovery import list_workspace_absolute_paths
from orchestration.text_normalize import sanitize_user_facing_prose


def test_looks_like_mcp_tool_call_leak_npx_filesystem_stub() -> None:
    leaked = (
        '{"name": "npx_y_modelcontextprotocol_server_filesystem_home_zlatk_81db3643", '
        '"parameters": {"pattern":"^.txt$"}}'
    )
    assert looks_like_mcp_tool_call_leak(leaked)
    assert sanitize_user_facing_prose(leaked) == ""


def test_looks_like_mcp_tool_call_leak_keeps_deliverable_json() -> None:
    good = '{"minutes": 10}'
    assert not looks_like_mcp_tool_call_leak(good)
    files = '{"files": ["/tmp/a.txt", "/tmp/b.txt"]}'
    assert not looks_like_mcp_tool_call_leak(files)


def test_list_workspace_absolute_paths(tmp_path: Path) -> None:
    (tmp_path / "AO_MCP_SMOKE.txt").write_text("hi", encoding="utf-8")
    (tmp_path / "subdir").mkdir()
    out = list_workspace_absolute_paths(tmp_path)
    assert "AO_MCP_SMOKE.txt" in out
    assert str(tmp_path / "AO_MCP_SMOKE.txt") in out
    assert "subdir" in out
