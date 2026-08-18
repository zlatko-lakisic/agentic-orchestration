"""Work around CrewAI native MCP resolver bugs (tools_list UnboundLocalError; hashed tunnel names)."""

from __future__ import annotations

import os
import re
from typing import Any, cast

_APPLIED = False
_TOOL_NAME_LINE = re.compile(r"(?m)^Tool Name:\s*.+$")


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


def _allow_extra_tool_args(tool: Any) -> None:
    schema = getattr(tool, "args_schema", None)
    if schema is None:
        return
    cfg = getattr(schema, "model_config", None)
    if isinstance(cfg, dict):
        cfg["extra"] = "allow"
        return
    extra = getattr(schema, "model_extra", None)
    if extra is not None:
        try:
            schema.model_config = {**dict(getattr(schema, "model_config", {}) or {}), "extra": "allow"}
        except Exception:  # noqa: BLE001
            pass


def shorten_mcp_native_tool_names(tools: list[Any] | None) -> list[Any]:
    """Expose MCP tools as ``read_file`` instead of ``localhost:port_t_<uuid>_filesystem_read_file``.

    CrewAI prefixes the full tunnel URL into ``MCPNativeTool.name``. Those names exceed the
    OpenAI 64-char limit, get hashed, and the LLM then fails pydantic validation trying to
    call ``read_file`` (the name in the overlay prompt). ``original_tool_name`` is what the
    MCP server actually implements, so renaming is safe.
    """
    if not tools:
        return []
    seen: dict[str, int] = {}
    for tool in tools:
        original = (
            getattr(tool, "original_tool_name", None)
            or getattr(tool, "original_name", None)
            or ""
        )
        short = str(original).strip()
        if not short:
            continue
        count = seen.get(short, 0)
        seen[short] = count + 1
        if count:
            short = f"{short}_{count + 1}"
        try:
            tool.name = short
        except Exception:  # noqa: BLE001
            continue
        desc = str(getattr(tool, "description", "") or "")
        if _TOOL_NAME_LINE.search(desc):
            try:
                tool.description = _TOOL_NAME_LINE.sub(f"Tool Name: {short}", desc, count=1)
            except Exception:  # noqa: BLE001
                pass
        _allow_extra_tool_args(tool)
    return tools


def apply_crewai_mcp_native_resolver_hotfix() -> None:
    """
    When native MCP discovery hits the tools_list UnboundLocalError path, return no tools instead of crashing.
    Always shorten native MCP tool names so tunnel URLs are not hashed into the LLM-facing name.

    Disable with AGENTIC_CREWAI_MCP_TOOLS_LIST_HOTFIX=0.
    """
    global _APPLIED
    if _APPLIED:
        return
    skip_unbound = os.getenv("AGENTIC_CREWAI_MCP_TOOLS_LIST_HOTFIX", "1").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    )
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
            tools, clients = orig(self, mcp_config)
        except Exception as e:
            if skip_unbound or not _is_crewai_mcp_tools_list_unbound_bug(e):
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
        return shorten_mcp_native_tool_names(list(tools or [])), clients

    setattr(_wrapped, "_agentic_mcp_hotfix", True)
    MCPToolResolver._resolve_native = _wrapped  # type: ignore[method-assign]
    _APPLIED = True
