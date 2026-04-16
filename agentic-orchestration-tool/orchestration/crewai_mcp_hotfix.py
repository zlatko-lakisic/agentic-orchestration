"""Work around CrewAI native MCP resolver bug (tools_list UnboundLocalError; see crewAIInc/crewAI#5116)."""

from __future__ import annotations

import os
from typing import Any, cast

_APPLIED = False


def _exception_chain_text(exc: BaseException) -> str:
    parts: list[str] = []
    seen: set[int] = set()
    e: BaseException | None = exc
    while e is not None and id(e) not in seen:
        seen.add(id(e))
        parts.append(str(e))
        e = e.__cause__ or e.__context__
    return " ".join(parts).lower()


def _is_crewai_mcp_tools_list_unbound_bug(exc: BaseException) -> bool:
    blob = _exception_chain_text(exc)
    if "tools_list" not in blob:
        return False
    return (
        "referenced before assignment" in blob
        or "not associated with a value" in blob
        or "where it is not associated with a value" in blob
    )


def apply_crewai_mcp_native_resolver_hotfix() -> None:
    """
    When native MCP discovery hits the tools_list UnboundLocalError path, return no tools instead of crashing.

    Disable with AGENTIC_CREWAI_MCP_TOOLS_LIST_HOTFIX=0.
    """
    global _APPLIED
    if _APPLIED:
        return
    if os.getenv("AGENTIC_CREWAI_MCP_TOOLS_LIST_HOTFIX", "1").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    ):
        _APPLIED = True
        return
    try:
        from crewai.mcp.tool_resolver import MCPToolResolver
        from crewai.tools.base_tool import BaseTool
    except ImportError:
        _APPLIED = True
        return

    orig = MCPToolResolver._resolve_native
    if getattr(orig, "_agentic_mcp_hotfix", False):
        _APPLIED = True
        return

    def _wrapped(self: Any, mcp_config: Any) -> tuple[list[Any], list[Any]]:
        try:
            return orig(self, mcp_config)
        except Exception as e:
            if not _is_crewai_mcp_tools_list_unbound_bug(e):
                raise
            try:
                self._logger.log(
                    "warning",
                    "Native MCP returned no usable tools (CrewAI tools_list resolver bug or empty discovery); "
                    "skipping tools from this MCP server. Fix the MCP server (e.g. missing Node deps) or upgrade crewai.",
                )
            except Exception:  # noqa: BLE001
                pass
            return cast(list[BaseTool], []), []

    setattr(_wrapped, "_agentic_mcp_hotfix", True)
    MCPToolResolver._resolve_native = _wrapped  # type: ignore[method-assign]
    _APPLIED = True
