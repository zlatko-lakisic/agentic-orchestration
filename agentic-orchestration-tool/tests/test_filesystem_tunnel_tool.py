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
    envelope = (
        "…[truncated earlier context]\n"
        "<system>\nOpened files: README.md package.json src/main.py\n"
        "<user>\nanalyze my workspace, tell me what you know about it"
    )
    assert extract_filenames_from_topic(envelope) == []


def test_run_ollama_filesystem_tunnel_step_ignores_truncated_context_header(
    monkeypatch,
) -> None:
    from orchestration.filesystem_tunnel_tool import run_ollama_filesystem_tunnel_step

    def _fake_call(_url: str, name: str, arguments=None) -> str:
        if name == "list_allowed_directories":
            return "/tmp/ws"
        return "Z" * 100 + "\n… truncated"

    monkeypatch.setattr(
        "orchestration.filesystem_tunnel_tool.call_filesystem_mcp_tool",
        _fake_call,
    )
    kicked = {"n": 0}

    class _Task:
        description = ""
        expected_output = ""

    class _Agent:
        llm = None

    built = SimpleNamespace(crew=SimpleNamespace(tasks=[_Task()], agents=[_Agent()]))
    monkeypatch.setattr(
        "orchestration.crewai_template.crew_kickoff",
        lambda *_a, **_k: kicked.__setitem__("n", kicked["n"] + 1) or "workspace overview",
    )
    monkeypatch.setattr(
        "orchestration.mcp_stdio_hygiene.disable_agent_tools_and_mcps",
        lambda *_a, **_k: None,
    )
    monkeypatch.setattr(
        "orchestration.runner.crew_kickoff_context",
        lambda *_a, **_k: __import__("contextlib").nullcontext(),
    )
    monkeypatch.setattr(
        "orchestration.output_artifacts.workflow_result_to_extractable_text",
        lambda text: text,
    )
    monkeypatch.setattr(
        "orchestration.text_normalize.sanitize_user_facing_prose",
        lambda text: text,
    )
    topic = (
        "…[truncated earlier context]\n<user>\n"
        "analyze my workspace, tell me what you know about it"
    )
    out = run_ollama_filesystem_tunnel_step(
        built=built,
        topic=topic,
        mcp_url="http://localhost:9/t/x/filesystem",
        filenames=["README.md"],
    )
    assert out == "workspace overview"
    assert "looks truncated" not in out.lower()
    assert kicked["n"] == 1


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


def test_run_ollama_filesystem_tunnel_step_names_add_bug(monkeypatch) -> None:
    from orchestration.filesystem_tunnel_tool import run_ollama_filesystem_tunnel_step

    def _fake_call(_url: str, name: str, arguments=None) -> str:
        if name == "list_allowed_directories":
            return "/tmp/ws"
        return "def add(a, b):\n    return a - b\n"

    monkeypatch.setattr(
        "orchestration.filesystem_tunnel_tool.call_filesystem_mcp_tool",
        _fake_call,
    )
    out = run_ollama_filesystem_tunnel_step(
        built=None,
        topic="Review buggy.py in this workspace. Name the bug in add().",
        mcp_url="http://localhost:9/t/x/filesystem",
        filenames=["buggy.py"],
    )
    assert "subtract" in out.lower()
