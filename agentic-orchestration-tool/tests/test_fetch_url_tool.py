"""Tests for fetch_url CrewAI tool shim."""

from orchestration.fetch_url_tool import (
    FetchUrlTool,
    is_fetch_stdio_mcp_entry,
    partition_fetch_stdio_mcps,
)


def test_is_fetch_stdio_mcp_entry() -> None:
    assert is_fetch_stdio_mcp_entry({"command": "python", "args": ["-m", "mcp_server_fetch"]})
    assert not is_fetch_stdio_mcp_entry({"command": "node", "args": ["server.js"]})


def test_partition_fetch_stdio_mcps() -> None:
    fetch = {"command": "python", "args": ["-m", "mcp_server_fetch"]}
    other = {"url": "http://127.0.0.1:8080/mcp", "transport": "streamable-http"}
    non_fetch, fetch_stdio = partition_fetch_stdio_mcps([fetch, other])
    assert fetch_stdio == [fetch]
    assert non_fetch == [other]


def test_fetch_url_tool_name() -> None:
    tool = FetchUrlTool()
    assert tool.name == "fetch"
