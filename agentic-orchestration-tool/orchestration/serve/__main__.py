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
    serve_tls_enabled,
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
    tls = serve_tls_enabled()
    scheme = "https" if tls else "http"
    ws_scheme = "wss" if tls else "ws"
    print(
        f"agentic-orchestration engine daemon {scheme}://{host}:{port}/  "
        f"(engine {engine_version()})",
        file=sys.stderr,
    )
    if host not in ("127.0.0.1", "localhost", "::1"):
        if tls:
            print(
                "  note: TLS enabled. Prefer AGENTIC_SERVE_TLS_CA_FILE + client certs "
                "(mTLS) for Reach; identity headers alone are spoofable on a shared LAN.",
                file=sys.stderr,
            )
        else:
            print(
                "  warning: binding beyond loopback without TLS. Enable "
                "AGENTIC_SERVE_TLS_* or restrict the network.",
                file=sys.stderr,
            )
    print(f"  health GET {scheme}://{host}:{port}/health", file=sys.stderr)
    print(f"  websocket {ws_scheme}://{host}:{port}/ws", file=sys.stderr)
    if tls:
        print(f"  mtls enroll POST {scheme}://{host}:{port}/api/v1/mtls/enroll", file=sys.stderr)

    from orchestration.serve import run

    run(host=host, port=port)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportError as exc:  # pragma: no cover - defensive
        print(f"error: {exc}\n{SERVE_DEPS_HINT}", file=sys.stderr)
        raise SystemExit(2) from exc
