"""Tests for MCP tool-call leak detection and filesystem list harness."""

from __future__ import annotations

from pathlib import Path

from orchestration.mcp_task_hints import looks_like_mcp_tool_call_leak
from orchestration.mcp_tool_leak_recovery import (
    goal_requests_filesystem_listing,
    list_workspace_absolute_paths,
    looks_like_unusable_crew_answer,
)
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


def test_looks_like_unusable_crew_answer_past_results_echo() -> None:
    assert looks_like_unusable_crew_answer("(Don't use past results here.)")
    assert looks_like_unusable_crew_answer("Don't use past results here.")
    assert not looks_like_unusable_crew_answer(
        "/home/zlatko/.openclaw/workspace/AO_MCP_SMOKE.txt"
    )


def test_goal_requests_filesystem_listing() -> None:
    assert goal_requests_filesystem_listing(
        "List everything in your filesystem workspace with absolute paths."
    )
    assert not goal_requests_filesystem_listing("What is the capital of France?")


def test_list_workspace_absolute_paths(tmp_path: Path) -> None:
    (tmp_path / "AO_MCP_SMOKE.txt").write_text("hi", encoding="utf-8")
    (tmp_path / "subdir").mkdir()
    out = list_workspace_absolute_paths(tmp_path)
    assert "AO_MCP_SMOKE.txt" in out
    assert str(tmp_path / "AO_MCP_SMOKE.txt") in out
    assert "subdir" in out
