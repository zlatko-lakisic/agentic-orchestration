"""Overlay sessions must not inherit the full stock MCP catalog."""

from __future__ import annotations

from types import SimpleNamespace

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.dynamic_planner import (
    _prune_irrelevant_mcp_from_user_goal,
    apply_overlay_client_tool_cap,
    filter_client_agent_tool_ids,
    restrict_catalog_for_overlay_session,
)


def test_empty_overlay_pin_keeps_client_only() -> None:
    entries = [
        {"id": "fetch_url"},
        {"id": "filesystem_local"},
        {"id": "client.filesystem_local"},
        {"id": "search_tavily"},
    ]
    out = restrict_catalog_for_overlay_session(
        entries, overlay_active=True, allowed_ids=[]
    )
    assert [e["id"] for e in out] == ["client.filesystem_local"]


def test_no_overlay_keeps_stock() -> None:
    entries = [{"id": "fetch_url"}, {"id": "client.filesystem_local"}]
    out = restrict_catalog_for_overlay_session(
        entries, overlay_active=False, allowed_ids=[]
    )
    assert [e["id"] for e in out] == ["fetch_url", "client.filesystem_local"]


def test_overlay_pin_keeps_tavily_and_client() -> None:
    entries = [
        {"id": "fetch_url"},
        {"id": "search_tavily"},
        {"id": "client.filesystem_local"},
    ]
    out = restrict_catalog_for_overlay_session(
        entries, overlay_active=True, allowed_ids=["search_tavily"]
    )
    assert {e["id"] for e in out} == {"search_tavily", "client.filesystem_local"}


def test_client_agent_drops_stock_mcp_ids() -> None:
    kept = filter_client_agent_tool_ids(
        ["fetch_url", "filesystem_local", "client.filesystem_local"],
        agent_provider_id="client.code_reviewer",
        overlay_pin=[],
        declared=["client.filesystem_local"],
    )
    assert kept == ["client.filesystem_local"]


def test_stock_agent_keeps_planner_mcps() -> None:
    kept = filter_client_agent_tool_ids(
        ["fetch_url", "search_tavily"],
        agent_provider_id="gpt_research",
        overlay_pin=[],
        declared=None,
    )
    assert kept == ["fetch_url", "search_tavily"]


def test_apply_cap_on_review_plan() -> None:
    cfg = WorkflowConfig(
        name="dynamic-plan",
        process="sequential",
        topic="review",
        instance_key="k",
        agent_providers=[
            {
                "id": "client.code_reviewer",
                "mcp_providers": ["client.filesystem_local"],
            }
        ],
        mcp_providers=["fetch_url", "client.filesystem_local", "filesystem_local"],
        skills=["echo_skill", "pr_review"],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="client.code_reviewer",
                description="review {{topic}}",
                expected_output="notes",
                mcp_providers=[
                    "fetch_url",
                    "filesystem_local",
                    "client.filesystem_local",
                ],
                skills=["echo_skill"],
            )
        ],
        task_sequence=["t1"],
    )
    overlay = SimpleNamespace(allowed_mcp_provider_ids=[], allowed_skill_ids=[])
    out = apply_overlay_client_tool_cap(
        cfg,
        agent_entries=list(cfg.agent_providers),
        overlay=overlay,
    )
    assert out.tasks[0].mcp_providers == ["client.filesystem_local"]
    assert out.mcp_providers == ["client.filesystem_local"]
    assert out.tasks[0].skills == []
    assert out.skills == []


def test_prune_keeps_overlay_filesystem_without_keywords() -> None:
    cfg = WorkflowConfig(
        name="dynamic-plan",
        process="sequential",
        topic="read hello.txt",
        instance_key="k",
        agent_providers=[{"id": "client.code_reviewer"}],
        mcp_providers=["client.filesystem_local", "search_tavily"],
        skills=[],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="client.code_reviewer",
                description="read {{topic}}",
                expected_output="text",
                mcp_providers=["client.filesystem_local"],
            )
        ],
        task_sequence=["t1"],
    )
    out = _prune_irrelevant_mcp_from_user_goal(
        cfg,
        user_prompt="Use the filesystem tools to read hello.txt.",
        mcp_catalog=[{"id": "client.filesystem_local", "tags": []}],
        quiet=True,
    )
    assert out.mcp_providers == ["client.filesystem_local"]


def test_apply_cap_fills_empty_task_from_overlay_agent_yaml() -> None:
    cfg = WorkflowConfig(
        name="dynamic-plan",
        process="sequential",
        topic="read hello.txt",
        instance_key="k",
        agent_providers=[
            {
                "id": "client.code_reviewer",
                "mcp_providers": ["client.filesystem_local"],
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="client.code_reviewer",
                description="read {{topic}}",
                expected_output="text",
                mcp_providers=[],
            )
        ],
        task_sequence=["t1"],
    )
    overlay = SimpleNamespace(allowed_mcp_provider_ids=[], allowed_skill_ids=[])
    out = apply_overlay_client_tool_cap(
        cfg,
        agent_entries=list(cfg.agent_providers),
        overlay=overlay,
    )
    assert out.tasks[0].mcp_providers == ["client.filesystem_local"]
    assert out.mcp_providers == ["client.filesystem_local"]
