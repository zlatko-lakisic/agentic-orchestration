"""Keep CrewAI stdio MCP stdout JSON-RPC-clean and drop servers that never handshake."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import threading
from typing import Any, Literal

from orchestration.mcp_stdio_jsonrpc_filter import looks_like_jsonrpc_line

_JSONRPC_FILTER_MOD = "orchestration.mcp_stdio_jsonrpc_filter"
_FS_PKG = "@modelcontextprotocol/server-filesystem"
_Handshake = Literal["ok", "fail", "timeout"]

_handshake_cache: dict[tuple[str, tuple[str, ...]], _Handshake] = {}


def stdio_command_args_env(entry: Any) -> tuple[str, list[str], dict[str, str] | None]:
    """Extract (command, args, env) from a dict or MCPServerStdio-like object."""
    if isinstance(entry, dict):
        command = str(entry.get("command") or "")
        args = [str(a) for a in (entry.get("args") or [])]
        raw_env = entry.get("env")
    else:
        command = str(getattr(entry, "command", "") or "")
        raw_args = getattr(entry, "args", None) or []
        try:
            args = [str(a) for a in raw_args]
        except TypeError:
            args = []
        raw_env = getattr(entry, "env", None)
    env: dict[str, str] | None
    if isinstance(raw_env, dict):
        env = {str(k): str(v) for k, v in raw_env.items()}
    else:
        env = None
    return command, args, env


def is_stdio_mcp_entry(entry: Any) -> bool:
    if isinstance(entry, str):
        return False
    command, _, _ = stdio_command_args_env(entry)
    return bool(command.strip())


def stdio_mcp_label(entry: Any) -> str:
    command, args, _ = stdio_command_args_env(entry)
    parts = [command, *args]
    if _JSONRPC_FILTER_MOD in parts:
        idx = parts.index(_JSONRPC_FILTER_MOD)
        parts = parts[idx + 1 :]
    return " ".join(parts[:4]).strip() or command or "stdio"


def _is_filter_wrapped(command: str, args: list[str]) -> bool:
    return _JSONRPC_FILTER_MOD in [command, *args]


def _npx_silent_env(env: dict[str, str] | None) -> dict[str, str]:
    merged = dict(env or {})
    merged.setdefault("npm_config_loglevel", "silent")
    merged.setdefault("npm_config_progress", "false")
    merged.setdefault("npm_config_fund", "false")
    merged.setdefault("NPM_CONFIG_UPDATE_NOTIFIER", "false")
    merged.setdefault("NO_UPDATE_NOTIFIER", "1")
    return merged


def _filesystem_root_args(args: list[str]) -> list[str]:
    rest: list[str] = []
    seen_pkg = False
    skip = {"-y", "--yes", "-q", "--quiet", "--silent", "-s"}
    for arg in args:
        if not seen_pkg and arg in skip:
            continue
        if not seen_pkg and _FS_PKG in arg:
            seen_pkg = True
            continue
        if seen_pkg:
            rest.append(arg)
    return rest


def prefer_preinstalled_filesystem(
    command: str, args: list[str]
) -> tuple[str, list[str]]:
    """Use a global mcp-server-filesystem binary when npx would otherwise download it."""
    if command.strip().lower() != "npx":
        return command, args
    if not any(_FS_PKG in a for a in args):
        return command, args
    found = shutil.which("mcp-server-filesystem") or shutil.which("server-filesystem")
    if not found:
        return command, args
    return found, _filesystem_root_args(args)


def wrap_npx_stdio_for_jsonrpc(
    command: str, args: list[str], env: dict[str, str] | None
) -> tuple[str, list[str], dict[str, str] | None]:
    """Prefer a preinstalled filesystem binary; otherwise wrap npx so npm logs leave stdout."""
    command, args = prefer_preinstalled_filesystem(command, args)
    if _is_filter_wrapped(command, args):
        return command, args, env
    if command.strip().lower() not in ("npx", "npm"):
        return command, args, env
    env = _npx_silent_env(env)
    npx_args = list(args)
    if command.strip().lower() == "npx" and "--silent" not in npx_args and "-s" not in npx_args:
        npx_args = ["--silent", *npx_args]
    wrapped_args = ["-u", "-m", _JSONRPC_FILTER_MOD, command, *npx_args]
    return sys.executable, wrapped_args, env


def prepare_stdio_mcp_entry(entry: Any) -> Any:
    """Return a stdio MCP entry whose command will not leak npm logs onto JSON-RPC stdout."""
    if not is_stdio_mcp_entry(entry):
        return entry
    command, args, env = stdio_command_args_env(entry)
    new_cmd, new_args, new_env = wrap_npx_stdio_for_jsonrpc(command, args, env)
    if (new_cmd, new_args, new_env) == (command, args, env):
        return entry
    if isinstance(entry, dict):
        out = dict(entry)
        out["command"] = new_cmd
        out["args"] = new_args
        out["env"] = new_env
        return out
    try:
        from crewai.mcp import MCPServerStdio

        if isinstance(entry, MCPServerStdio):
            return MCPServerStdio(command=new_cmd, args=new_args, env=new_env)
    except ImportError:
        pass
    try:
        entry.command = new_cmd
        entry.args = new_args
        entry.env = new_env
    except (AttributeError, TypeError):
        pass
    return entry


def prepare_stdio_mcps(mcps: list[Any] | None) -> list[Any]:
    if not mcps:
        return []
    return [prepare_stdio_mcp_entry(entry) for entry in mcps]


def disable_agent_tools_and_mcps(agent: Any) -> None:
    """Detach CrewAI tools and stdio MCP servers before a summarize-only kickoff."""
    agent.tools = []
    if not hasattr(agent, "mcps"):
        return
    for value in ([], None):
        try:
            agent.mcps = value
            return
        except (TypeError, ValueError, AttributeError):
            continue


def _underlying_stdio_command(command: str, args: list[str]) -> str:
    parts = [command, *args]
    if _JSONRPC_FILTER_MOD in parts:
        idx = parts.index(_JSONRPC_FILTER_MOD)
        parts = parts[idx + 1 :]
    return (parts[0] if parts else command).strip().lower()


def _skip_handshake_for_npx(command: str, args: list[str]) -> bool:
    """npx install can exceed the probe window; wrap already keeps npm logs off stdout."""
    return _underlying_stdio_command(command, args) in ("npx", "npm")


def _handshake_enabled() -> bool:
    return os.getenv("AGENTIC_MCP_STDIO_HANDSHAKE", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _handshake_timeout() -> float:
    try:
        return max(2.0, min(60.0, float(os.getenv("AGENTIC_MCP_STDIO_HANDSHAKE_TIMEOUT", "12"))))
    except ValueError:
        return 12.0


def _output_looks_like_crash(blob: bytes) -> bool:
    lower = blob.lower()
    return (
        b"err_require_esm" in lower
        or b"failed to parse jsonrpc" in lower
        or b"extractarticle.js" in lower
    )


def _read_until_jsonrpc(proc: subprocess.Popen[bytes], bucket: list[bytes], stop: threading.Event) -> None:
    stdout = proc.stdout
    if stdout is None:
        return
    try:
        while not stop.is_set():
            line = stdout.readline()
            if not line:
                break
            bucket.append(line)
            if looks_like_jsonrpc_line(line):
                break
    except (OSError, ValueError):
        pass


def _read_stderr(proc: subprocess.Popen[bytes], bucket: list[bytes], stop: threading.Event) -> None:
    stderr = proc.stderr
    if stderr is None:
        return
    try:
        while not stop.is_set():
            chunk = stderr.read(4096)
            if not chunk:
                break
            bucket.append(chunk)
            if _output_looks_like_crash(b"".join(bucket)):
                break
    except (OSError, ValueError):
        pass


_INIT_MSG = (
    b'{"jsonrpc":"2.0","id":1,"method":"initialize","params":'
    b'{"protocolVersion":"2024-11-05","capabilities":{},'
    b'"clientInfo":{"name":"agentic-orchestration","version":"0"}}}\n'
)


def stdio_mcp_handshake(
    command: str,
    args: list[str],
    env: dict[str, str] | None,
    *,
    timeout: float | None = None,
) -> _Handshake:
    """Probe MCP initialize. ``timeout`` keeps a slow-but-alive npx install."""
    key = (command, tuple(args))
    cached = _handshake_cache.get(key)
    if cached is not None:
        return cached
    wait = timeout if timeout is not None else _handshake_timeout()
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    resolved = shutil.which(command) or command
    try:
        proc = subprocess.Popen(
            [resolved, *args],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=full_env,
            bufsize=0,
        )
    except OSError:
        _handshake_cache[key] = "fail"
        return "fail"

    lines: list[bytes] = []
    err_chunks: list[bytes] = []
    stop = threading.Event()
    reader = threading.Thread(target=_read_until_jsonrpc, args=(proc, lines, stop), daemon=True)
    err_reader = threading.Thread(target=_read_stderr, args=(proc, err_chunks, stop), daemon=True)
    reader.start()
    err_reader.start()
    try:
        if proc.stdin is not None:
            proc.stdin.write(_INIT_MSG)
            proc.stdin.flush()
        reader.join(wait)
        out = b"".join(lines)
        err = b"".join(err_chunks)
        combined = out + err
        rc = proc.poll()
        if any(looks_like_jsonrpc_line(line) for line in lines) or looks_like_jsonrpc_line(out):
            result: _Handshake = "ok"
        elif _output_looks_like_crash(combined):
            result = "fail"
        elif rc is not None:
            result = "fail" if (rc != 0 or not out.strip()) else "ok"
        else:
            result = "timeout"
    except OSError:
        result = "fail"
    finally:
        stop.set()
        if proc.poll() is None:
            proc.kill()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            pass
        err_reader.join(1)
    _handshake_cache[key] = result
    return result


def drop_stdio_mcps_that_fail_handshake(mcps: list[Any] | None) -> list[Any]:
    """Drop stdio MCPs that exit/crash before a JSON-RPC initialize reply. Timeouts are kept."""
    if not mcps:
        return []
    if not _handshake_enabled():
        return list(mcps)
    kept: list[Any] = []
    for entry in mcps:
        if not is_stdio_mcp_entry(entry):
            kept.append(entry)
            continue
        command, args, env = stdio_command_args_env(entry)
        label = stdio_mcp_label(entry)
        if _skip_handshake_for_npx(command, args):
            kept.append(entry)
            continue
        try:
            from orchestration.progress_sink import emit_progress

            emit_progress(f"stdio MCP handshake: {label}")
        except Exception:  # noqa: BLE001
            pass
        outcome = stdio_mcp_handshake(command, args, env)
        if outcome == "fail":
            print(f"stdio MCP {label} failed handshake; tools disabled", file=sys.stderr)
            try:
                from orchestration.progress_sink import emit_progress

                emit_progress(f"stdio MCP {label} failed handshake; tools disabled")
            except Exception:  # noqa: BLE001
                pass
            continue
        kept.append(entry)
    return kept


def drop_failed_stdio_mcps_on_agent(agent: Any) -> None:
    """After Agent construction, drop stdio MCPs that failed handshake."""
    mcps = getattr(agent, "mcps", None)
    if not isinstance(mcps, (list, tuple)) or not mcps:
        return
    original = list(mcps)
    kept = drop_stdio_mcps_that_fail_handshake(original)
    if kept != original:
        try:
            agent.mcps = kept or None
        except (TypeError, ValueError, AttributeError):
            pass
