"""Tests for COMSTAR filesystem tunnel CrewAI shims."""

from __future__ import annotations

import json
from types import SimpleNamespace

from orchestration.filesystem_tunnel_tool import (
    attach_filesystem_tunnel_tools_to_agents,
    call_filesystem_mcp_tool,
    is_filesystem_tunnel_mcp_entry,
    partition_filesystem_tunnel_mcps,
)


def test_partition_filesystem_tunnel_mcps() -> None:
    tunnel = {
        "url": "http://localhost:43657/t/abc/filesystem",
        "transport": "streamable-http",
    }
    other = {"url": "https://example.com/mcp", "transport": "streamable-http"}
    rest, urls = partition_filesystem_tunnel_mcps([tunnel, other])
    assert rest == [other]
    assert urls == ["http://localhost:43657/t/abc/filesystem"]
    assert is_filesystem_tunnel_mcp_entry(tunnel)
    assert not is_filesystem_tunnel_mcp_entry(other)


def test_call_filesystem_mcp_tool_parses_text_content(monkeypatch) -> None:
    class _Resp:
        def read(self) -> bytes:
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {"content": [{"type": "text", "text": "live-contract\n"}]},
                }
            ).encode()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        "orchestration.filesystem_tunnel_tool.urlopen",
        lambda *_a, **_k: _Resp(),
    )
    assert (
        call_filesystem_mcp_tool(
            "http://localhost:9/t/x/filesystem",
            "read_file",
            {"path": "hello.txt"},
        )
        == "live-contract\n"
    )


def test_attach_filesystem_tunnel_tools_to_agents() -> None:
    agent = SimpleNamespace(tools=[])
    assert attach_filesystem_tunnel_tools_to_agents(
        [agent],
        ["http://localhost:9/t/x/filesystem"],
    )
    names = [t.name for t in agent.tools]
    assert names == ["list_allowed_directories", "list_directory", "read_file"]


def test_extract_filenames_from_topic() -> None:
    from orchestration.filesystem_tunnel_tool import extract_filenames_from_topic

    names = extract_filenames_from_topic(
        "Call the filesystem MCP read_file tool on hello.txt. Review buggy.py too."
    )
    assert names == ["hello.txt", "buggy.py"]
    assert extract_filenames_from_topic("Reply with exactly the single word pong") == []


def test_run_ollama_filesystem_tunnel_step_returns_raw_contents(monkeypatch) -> None:
    from orchestration.filesystem_tunnel_tool import run_ollama_filesystem_tunnel_step

    calls: list[str] = []

    def _fake_call(_url: str, name: str, arguments=None) -> str:
        calls.append(name)
        if name == "list_allowed_directories":
            return "/tmp/ws"
        return "live-contract\n"

    monkeypatch.setattr(
        "orchestration.filesystem_tunnel_tool.call_filesystem_mcp_tool",
        _fake_call,
    )
    out = run_ollama_filesystem_tunnel_step(
        built=None,
        topic="Call the filesystem MCP read_file tool on hello.txt. Reply with only the file contents.",
        mcp_url="http://localhost:9/t/x/filesystem",
        filenames=["hello.txt"],
    )
    assert out == "live-contract\n"
    assert calls == ["list_allowed_directories", "read_file"]


def test_run_ollama_filesystem_tunnel_step_reports_truncation(monkeypatch) -> None:
    from orchestration.filesystem_tunnel_tool import run_ollama_filesystem_tunnel_step

    def _fake_call(_url: str, name: str, arguments=None) -> str:
        if name == "list_allowed_directories":
            return "/tmp/ws"
        return "Z" * 100 + "\n… truncated"

    monkeypatch.setattr(
        "orchestration.filesystem_tunnel_tool.call_filesystem_mcp_tool",
        _fake_call,
    )
    out = run_ollama_filesystem_tunnel_step(
        built=None,
        topic="Call the filesystem MCP read_file tool on big.txt. Say whether the result looks truncated.",
        mcp_url="http://localhost:9/t/x/filesystem",
        filenames=["big.txt"],
    )
    assert "truncated" in out.lower()
