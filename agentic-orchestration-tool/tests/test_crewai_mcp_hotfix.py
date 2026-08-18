"""Tests for CrewAI native MCP resolver hotfixes."""

from __future__ import annotations

from types import SimpleNamespace

from orchestration.crewai_mcp_hotfix import shorten_mcp_native_tool_names


def test_shorten_mcp_native_tool_names_uses_original() -> None:
    hashed = (
        "localhost:43657_t_3102277e-ec3e-43e5-a76e-c368a499d191_filesystem_read_file"
    )
    tool = SimpleNamespace(
        name=hashed,
        original_tool_name="read_file",
        description=(
            "Tool Name: localhost_43657_t_3102277e_ec3e_43e5_a76e_c368a499d191_5745fa59\n"
            'Tool Arguments: {"properties": {"path": {"type": "string"}}}'
        ),
        args_schema=SimpleNamespace(model_config={"extra": "forbid"}),
    )
    out = shorten_mcp_native_tool_names([tool])
    assert out[0].name == "read_file"
    assert out[0].description.startswith("Tool Name: read_file\n")
    assert out[0].args_schema.model_config["extra"] == "allow"


def test_shorten_mcp_native_tool_names_disambiguates_collisions() -> None:
    tools = [
        SimpleNamespace(name="url_a_read_file", original_tool_name="read_file", description=""),
        SimpleNamespace(name="url_b_read_file", original_tool_name="read_file", description=""),
    ]
    shorten_mcp_native_tool_names(tools)
    assert tools[0].name == "read_file"
    assert tools[1].name == "read_file_2"
