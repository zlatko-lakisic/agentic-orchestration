"""
Optional API daemon for the engine — ``python -m orchestration.serve``.

Additive by design: the CLI (``main.py``) and the Node web server keep working exactly
as before and neither imports this package. FastAPI / uvicorn live in
``requirements-serve.txt`` so a CLI-only or Jetson install never needs them.

Importing this package is cheap and dependency-free; FastAPI is only imported when
:func:`create_app` (or the ``__main__`` entry point) actually runs.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765

SERVE_DEPS_HINT = (
    "The API daemon needs FastAPI and uvicorn, which are optional extras:\n"
    "  pip install -r requirements-serve.txt\n"
    "The CLI (python main.py) and the Node web server do not require them."
)


def tool_root() -> Path:
    return Path(__file__).resolve().parents[2]


def serve_host() -> str:
    """Bind address. Defaults to loopback — network binding is an explicit opt-in."""
    return os.getenv("AGENTIC_SERVE_HOST", "").strip() or DEFAULT_HOST


def serve_port() -> int:
    raw = os.getenv("AGENTIC_SERVE_PORT", "").strip()
    try:
        port = int(raw) if raw else DEFAULT_PORT
    except ValueError:
        port = DEFAULT_PORT
    return port if 1 <= port <= 65535 else DEFAULT_PORT


def engine_version() -> str:
    """Repo ``VERSION`` contents, or ``dev`` for a working tree without one."""
    for candidate in (tool_root().parent / "VERSION", tool_root() / "VERSION"):
        try:
            text = candidate.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if text:
            return text
    return "dev"


def fastapi_available() -> bool:
    """True when the optional serve extras are installed."""
    from importlib.util import find_spec

    return find_spec("fastapi") is not None


def require_serve_deps() -> None:
    """Raise a clear, actionable error when the optional extras are missing."""
    missing = [name for name in ("fastapi", "uvicorn") if _missing(name)]
    if missing:
        raise ImportError(f"missing optional dependency: {', '.join(missing)}\n{SERVE_DEPS_HINT}")


def _missing(module: str) -> bool:
    from importlib.util import find_spec

    try:
        return find_spec(module) is None
    except (ImportError, ValueError):
        return True


def create_app(**kwargs: Any):
    """Build the FastAPI application (imports the optional extras)."""
    require_serve_deps()
    from orchestration.serve.app import create_app as _create_app

    return _create_app(**kwargs)


def run(host: str | None = None, port: int | None = None) -> None:
    """Run the daemon with uvicorn (the ``python -m orchestration.serve`` behavior)."""
    require_serve_deps()
    import uvicorn

    from orchestration.serve.mtls_tls import install_peercert_hooks, tls_configured, uvicorn_ssl_kwargs

    install_peercert_hooks()
    ssl_kwargs = uvicorn_ssl_kwargs()
    uvicorn.run(
        create_app(),
        host=host or serve_host(),
        port=port if port is not None else serve_port(),
        log_level=os.getenv("AGENTIC_SERVE_LOG_LEVEL", "info").strip() or "info",
        **ssl_kwargs,
    )


# Keep tls_configured importable for __main__ banners without a circular import at module load.
def serve_tls_enabled() -> bool:
    from orchestration.serve.mtls_tls import tls_configured

    return tls_configured()



__all__ = [
    "DEFAULT_HOST",
    "DEFAULT_PORT",
    "SERVE_DEPS_HINT",
    "create_app",
    "engine_version",
    "fastapi_available",
    "require_serve_deps",
    "run",
    "serve_host",
    "serve_port",
    "serve_tls_enabled",
    "tool_root",
]
