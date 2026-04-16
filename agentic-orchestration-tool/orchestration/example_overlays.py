"""Built-in vertical overlays (no manual .env path editing)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _prepend_path_list_env(key: str, path: Path) -> None:
    """Prepend *path* to a ``;``/``:``-separated search-path env var (merge with existing)."""
    sep = ";" if os.name == "nt" else ":"
    resolved = str(path.resolve())
    cur = os.getenv(key, "").strip()
    if not cur:
        os.environ[key] = resolved
        return
    parts = [p.strip() for p in cur.split(sep) if p.strip()]
    if resolved in parts:
        os.environ[key] = cur
        return
    os.environ[key] = sep.join([resolved, cur])


def apply_example_overlay_env(tool_root: Path, example: str) -> None:
    """
    Point orchestrator context + extra catalogs at ``examples/verticals/<example>/``.

    Does **not** enable optional third-party MCP servers (e.g. npm ``healthcare-mcp``); set their
    ``*_ENABLED`` env vars separately if you want those tools.
    """
    ex = str(example or "").strip().lower()
    if ex != "healthcare":
        raise ValueError(f"Unknown --example {example!r} (supported: healthcare)")

    root = (tool_root / "examples" / "verticals" / "healthcare").resolve()
    ctx = root / "orchestrator-context.md"
    if not ctx.is_file():
        print(
            f"warning: healthcare example files missing under {root} (expected orchestrator-context.md)",
            file=sys.stderr,
        )
        return

    os.environ["AGENTIC_ORCHESTRATOR_CONTEXT_FILE"] = str(ctx)
    agents = root / "agent_providers"
    mcps = root / "mcp_providers"
    if agents.is_dir():
        _prepend_path_list_env("AGENTIC_EXTRA_AGENT_PROVIDERS_CATALOG_DIRS", agents)
    if mcps.is_dir():
        _prepend_path_list_env("AGENTIC_EXTRA_MCP_PROVIDERS_PATH", mcps)
