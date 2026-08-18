"""Tests for stdio MCP handshake, npx stdout wrap, and summarize tool/MCP detach."""

from __future__ import annotations

import sys
from types import SimpleNamespace
from typing import Any

import pytest

from orchestration.mcp_stdio_hygiene import (
    _handshake_cache,
    disable_agent_tools_and_mcps,
    drop_stdio_mcps_that_fail_handshake,
    prefer_preinstalled_filesystem,
    stdio_mcp_handshake,
    stdio_mcp_label,
    wrap_npx_stdio_for_jsonrpc,
)
from orchestration.mcp_stdio_jsonrpc_filter import looks_like_jsonrpc_line


@pytest.fixture(autouse=True)
def _clear_handshake_cache() -> None:
    _handshake_cache.clear()


def test_looks_like_jsonrpc_line() -> None:
    assert looks_like_jsonrpc_line(b'{"jsonrpc":"2.0","id":1}\n')
    assert looks_like_jsonrpc_line(b"Content-Length: 12\r\n")
    assert not looks_like_jsonrpc_line(b"added 40 packages in 3s\n")
    assert not looks_like_jsonrpc_line(b"Error [ERR_REQUIRE_ESM]: extractArticle.js\n")


def test_wrap_npx_stdio_for_jsonrpc(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("orchestration.mcp_stdio_hygiene.shutil.which", lambda _name: None)
    cmd, args, env = wrap_npx_stdio_for_jsonrpc(
        "npx",
        ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        {"FOO": "bar"},
    )
    assert cmd == sys.executable
    assert args[:3] == ["-u", "-m", "orchestration.mcp_stdio_jsonrpc_filter"]
    assert args[3] == "npx"
    assert "--silent" in args
    assert args[-1] == "/tmp"
    assert env is not None
    assert env["FOO"] == "bar"
    assert env["npm_config_loglevel"] == "silent"


def test_wrap_npx_is_idempotent(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("orchestration.mcp_stdio_hygiene.shutil.which", lambda _name: None)
    first = wrap_npx_stdio_for_jsonrpc("npx", ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], None)
    second = wrap_npx_stdio_for_jsonrpc(first[0], first[1], first[2])
    assert second[1].count("orchestration.mcp_stdio_jsonrpc_filter") == 1


def test_prefer_preinstalled_filesystem(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "orchestration.mcp_stdio_hygiene.shutil.which",
        lambda name: "/usr/local/bin/mcp-server-filesystem" if name == "mcp-server-filesystem" else None,
    )
    cmd, args = prefer_preinstalled_filesystem(
        "npx",
        ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
    )
    assert cmd == "/usr/local/bin/mcp-server-filesystem"
    assert args == ["/workspace"]


def test_wrap_leaves_python_stdio_alone() -> None:
    cmd, args, env = wrap_npx_stdio_for_jsonrpc("python", ["-m", "mcp_servers.media_understand"], None)
    assert cmd == "python"
    assert args == ["-m", "mcp_servers.media_understand"]
    assert env is None


def test_stdio_mcp_label_skips_filter_prefix() -> None:
    entry = SimpleNamespace(
        command=sys.executable,
        args=["-u", "-m", "orchestration.mcp_stdio_jsonrpc_filter", "npx", "-y", "pkg", "/tmp"],
        env=None,
    )
    label = stdio_mcp_label(entry)
    assert "mcp_stdio_jsonrpc_filter" not in label
    assert label.startswith("npx")


def test_handshake_ok(tmp_path: Any) -> None:
    script = tmp_path / "ok_mcp.py"
    script.write_text(
        "import sys\n"
        "sys.stdout.write('{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\\n')\n"
        "sys.stdout.flush()\n"
        "sys.stdin.read()\n",
        encoding="utf-8",
    )
    assert stdio_mcp_handshake(sys.executable, [str(script)], None, timeout=5) == "ok"


def test_handshake_fail_esm(tmp_path: Any) -> None:
    script = tmp_path / "bad_mcp.py"
    script.write_text(
        "import sys\n"
        "print('Error [ERR_REQUIRE_ESM]: Cannot require extractArticle.js', flush=True)\n"
        "sys.exit(1)\n",
        encoding="utf-8",
    )
    assert stdio_mcp_handshake(sys.executable, [str(script)], None, timeout=5) == "fail"


def test_drop_stdio_mcps_that_fail_handshake(tmp_path: Any, capsys: pytest.CaptureFixture[str]) -> None:
    bad = tmp_path / "bad_mcp.py"
    bad.write_text(
        "import sys\n"
        "print('Error [ERR_REQUIRE_ESM]: extractArticle.js', flush=True)\n"
        "sys.exit(1)\n",
        encoding="utf-8",
    )
    http = {"url": "http://localhost:8080/mcp", "transport": "streamable-http"}
    dead = {"command": sys.executable, "args": [str(bad)]}
    kept = drop_stdio_mcps_that_fail_handshake([http, dead])
    assert kept == [http]
    err = capsys.readouterr().err
    assert "failed handshake; tools disabled" in err


def test_drop_skips_handshake_for_npx(monkeypatch: pytest.MonkeyPatch) -> None:
    called: list[int] = []

    def _boom(*_a: Any, **_k: Any) -> str:
        called.append(1)
        return "fail"

    monkeypatch.setattr("orchestration.mcp_stdio_hygiene.stdio_mcp_handshake", _boom)
    monkeypatch.setattr("orchestration.mcp_stdio_hygiene.shutil.which", lambda _name: None)
    entry = {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    }
    wrapped_cmd, wrapped_args, wrapped_env = wrap_npx_stdio_for_jsonrpc(
        "npx",
        ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        None,
    )
    wrapped = {"command": wrapped_cmd, "args": wrapped_args, "env": wrapped_env}
    assert drop_stdio_mcps_that_fail_handshake([entry, wrapped]) == [entry, wrapped]
    assert called == []


def test_disable_agent_tools_and_mcps() -> None:
    agent = SimpleNamespace(tools=["t"], mcps=["m"])
    disable_agent_tools_and_mcps(agent)
    assert agent.tools == []
    assert agent.mcps in ([], None)
