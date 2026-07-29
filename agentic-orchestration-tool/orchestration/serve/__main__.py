"""``python -m orchestration.serve`` — run the API daemon."""

from __future__ import annotations

import argparse
import sys

from orchestration.serve import (
    SERVE_DEPS_HINT,
    engine_version,
    require_serve_deps,
    serve_host,
    serve_port,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m orchestration.serve",
        description=(
            "Warm, long-lived API daemon for the engine (FastAPI + WebSocket). "
            "Optional: the CLI and the Node web server work without it."
        ),
    )
    parser.add_argument(
        "--host",
        default=None,
        help=f"bind address (default AGENTIC_SERVE_HOST or {serve_host()})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help=f"bind port (default AGENTIC_SERVE_PORT or {serve_port()})",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify the optional serve dependencies and exit",
    )
    args = parser.parse_args(argv)

    try:
        require_serve_deps()
    except ImportError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.check:
        print(f"orchestration.serve ready (engine {engine_version()})")
        return 0

    host = args.host or serve_host()
    port = args.port if args.port is not None else serve_port()
    print(
        f"agentic-orchestration engine daemon http://{host}:{port}/  (engine {engine_version()})",
        file=sys.stderr,
    )
    if host not in ("127.0.0.1", "localhost", "::1"):
        print(
            "  warning: binding beyond loopback. Identity-by-header is only safe behind an "
            "identity-terminating proxy on a private interface.",
            file=sys.stderr,
        )
    print(f"  health GET http://{host}:{port}/health", file=sys.stderr)
    print(f"  websocket ws://{host}:{port}/ws", file=sys.stderr)

    from orchestration.serve import run

    run(host=host, port=port)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportError as exc:  # pragma: no cover - defensive
        print(f"error: {exc}\n{SERVE_DEPS_HINT}", file=sys.stderr)
        raise SystemExit(2) from exc
