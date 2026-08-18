"""Tests for fetch_url CrewAI tool shim."""

from types import SimpleNamespace

from orchestration.fetch_url_tool import (
    FetchUrlTool,
    _html_to_plain_text,
    extract_http_urls_from_text,
    extract_url_from_leak_or_topic,
    is_fetch_stdio_mcp_entry,
    partition_fetch_stdio_mcps,
)


def test_is_fetch_stdio_mcp_entry() -> None:
    assert is_fetch_stdio_mcp_entry({"command": "python", "args": ["-m", "mcp_server_fetch"]})
    assert not is_fetch_stdio_mcp_entry({"command": "node", "args": ["server.js"]})


def test_is_fetch_stdio_mcp_entry_stdio_object() -> None:
    entry = SimpleNamespace(command="python", args=["-m", "mcp_server_fetch"])
    assert is_fetch_stdio_mcp_entry(entry)
    other = SimpleNamespace(command="npx", args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"])
    assert not is_fetch_stdio_mcp_entry(other)


def test_is_fetch_stdio_mcp_entry_uvx() -> None:
    assert is_fetch_stdio_mcp_entry({"command": "uvx", "args": ["mcp-server-fetch"]})
    uvx_obj = SimpleNamespace(command="uvx", args=["mcp-server-fetch"])
    assert is_fetch_stdio_mcp_entry(uvx_obj)
    assert not is_fetch_stdio_mcp_entry({"command": "uvx", "args": ["some-other-mcp"]})


def test_is_fetch_stdio_mcp_entry_wrapped_filter() -> None:
    entry = SimpleNamespace(
        command="python",
        args=["-u", "-m", "orchestration.mcp_stdio_jsonrpc_filter", "python", "-m", "mcp_server_fetch"],
    )
    assert is_fetch_stdio_mcp_entry(entry)


def test_partition_fetch_stdio_mcps() -> None:
    fetch = {"command": "python", "args": ["-m", "mcp_server_fetch"]}
    other = {"url": "http://127.0.0.1:8080/mcp", "transport": "streamable-http"}
    non_fetch, fetch_stdio = partition_fetch_stdio_mcps([fetch, other])
    assert fetch_stdio == [fetch]
    assert non_fetch == [other]


def test_partition_fetch_stdio_mcps_objects() -> None:
    fetch = SimpleNamespace(command="uvx", args=["mcp-server-fetch"])
    other = SimpleNamespace(command="npx", args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"])
    non_fetch, fetch_stdio = partition_fetch_stdio_mcps([fetch, other])
    assert fetch_stdio == [fetch]
    assert non_fetch == [other]


def test_fetch_url_tool_name() -> None:
    tool = FetchUrlTool()
    assert tool.name == "fetch"


def test_html_to_plain_text_strips_forgiving_script_close() -> None:
    html = '<p>hi</p><script>alert(1)</script foo="bar"><b>ok</b>'
    out = _html_to_plain_text(html, max_chars=200)
    assert "alert" not in out
    assert "hi" in out
    assert "ok" in out


def test_extract_http_urls_from_text() -> None:
    urls = extract_http_urls_from_text(
        "what is https://github.com/zlatko-lakisic/agentic-orchestration about?"
    )
    assert urls == ["https://github.com/zlatko-lakisic/agentic-orchestration"]


def test_extract_url_from_leak_or_topic() -> None:
    leaked = (
        'name: analyze\nparameters: {"max_length":5000,'
        '"url":"https://github.com/zlatko-lakisic/agentic-orchestration"}'
    )
    url = extract_url_from_leak_or_topic(leaked, "summarize the repo")
    assert url == "https://github.com/zlatko-lakisic/agentic-orchestration"
