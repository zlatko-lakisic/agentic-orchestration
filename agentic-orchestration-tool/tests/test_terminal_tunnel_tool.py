from __future__ import annotations

import json
from types import SimpleNamespace

from orchestration.terminal_tunnel_tool import (
    attach_terminal_tunnel_tools_to_agents,
    call_terminal_mcp_tool,
    is_terminal_tunnel_mcp_entry,
    partition_terminal_tunnel_mcps,
)


def test_partition_terminal_tunnel_mcps() -> None:
    tunnel = {
        "url": "http://localhost:43657/t/abc/terminal",
        "transport": "streamable-http",
    }
    other = {"url": "https://example.com/mcp", "transport": "streamable-http"}
    rest, urls = partition_terminal_tunnel_mcps([tunnel, other])
    assert rest == [other]
    assert urls == ["http://localhost:43657/t/abc/terminal"]
    assert is_terminal_tunnel_mcp_entry(tunnel)
    assert not is_terminal_tunnel_mcp_entry(other)


def test_call_terminal_mcp_tool_parses_text_content(monkeypatch) -> None:
    class _Resp:
        def read(self) -> bytes:
            return json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {"content": [{"type": "text", "text": "pong\n"}]},
                }
            ).encode()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(
        "orchestration.terminal_tunnel_tool.urlopen",
        lambda *_a, **_k: _Resp(),
    )

    assert (
        call_terminal_mcp_tool(
            "http://localhost:9/t/x/terminal",
            "run_terminal_command",
            {"command": "echo pong"},
        )
        == "pong\n"
    )


def test_attach_terminal_tunnel_tools_to_agents() -> None:
    agent = SimpleNamespace(tools=[])
    assert attach_terminal_tunnel_tools_to_agents(
        [agent],
        ["http://localhost:9/t/x/terminal"],
    )
    names = [t.name for t in agent.tools]
    assert names == ["run_terminal_command"]

