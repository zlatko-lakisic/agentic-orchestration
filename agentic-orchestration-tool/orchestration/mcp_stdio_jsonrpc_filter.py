"""Run an MCP stdio subprocess with stdout reserved for JSON-RPC.

npx/npm print install progress on stdout; CrewAI parses every line as JSON-RPC.
This wrapper forwards only JSON-RPC (and Content-Length framed MCP) to stdout
and sends the rest to stderr.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys


def looks_like_jsonrpc_line(line: bytes) -> bool:
    s = line.lstrip()
    if not s:
        return False
    if s.startswith(b"{") or s.startswith(b"["):
        return True
    if s.startswith(b"\x1e"):
        return True
    lower = s.lower()
    return lower.startswith(b"content-length:") or lower.startswith(b"content-type:")


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args:
        print(
            "usage: python -m orchestration.mcp_stdio_jsonrpc_filter COMMAND [ARGS...]",
            file=sys.stderr,
        )
        return 2
    resolved = shutil.which(args[0]) or args[0]
    proc = subprocess.Popen(
        [resolved, *args[1:]],
        stdin=sys.stdin,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        env=os.environ,
        bufsize=0,
    )
    assert proc.stdout is not None
    try:
        while True:
            line = proc.stdout.readline()
            if not line:
                break
            dest = sys.stdout.buffer if looks_like_jsonrpc_line(line) else sys.stderr.buffer
            dest.write(line)
            dest.flush()
    except BrokenPipeError:
        pass
    finally:
        if proc.poll() is None:
            proc.kill()
    return int(proc.wait() or 0)


if __name__ == "__main__":
    raise SystemExit(main())
