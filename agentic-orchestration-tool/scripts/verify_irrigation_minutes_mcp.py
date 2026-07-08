#!/usr/bin/env python3
"""One-shot verify: HA MINUTES prompt must clear plant_knowledge MCP on Jetson."""
from __future__ import annotations

import os
from pathlib import Path

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.dynamic_planner import (
    _maybe_augment_mcp_from_user_goal,
    _prune_irrelevant_mcp_from_user_goal,
    _single_agent_trivial_plan,
)
from orchestration.goal_format_hints import (
    apply_web_prose_goal_if_enabled,
    goal_requests_irrigation_minutes_line,
    goal_requires_machine_readable_only,
)
from orchestration.mcp_providers_catalog import (
    load_mcp_providers_catalog_merged,
    suggest_mcp_ids_from_user_goal,
)

PROMPT = """[system]
You are the irrigation decision-maker for a residential garden zone. Your goal: keep the zone's plants healthy while never applying more water than they need.
Missing or unknown facts are provided with defaults like 0 or unknown. Use plant knowledge you already have for water requirements; Home Assistant only supplies sensor and zone facts.
Output format: your reasoning in at most 120 words, then a final line exactly:
MINUTES: <integer 0-25>

---

[user]
Zone: East Lawn
Zone profile: {"label":"East Lawn","plant_profile":"Tall fescue lawn grass","area_sqm":60}
Days since last irrigation: 2
Last run duration minutes: 10
"""

os.environ.setdefault("AGENTIC_WEB_PROSE_DELIVERABLE", "1")
os.environ.setdefault(
    "AGENTIC_EXTRA_MCP_PROVIDERS_PATH",
    "/var/projects/agentic-orchestration/extras/plant-knowledge-mcp/config",
)
os.environ.setdefault(
    "PLANT_KNOWLEDGE_MCP_URL",
    "http://plant-knowledge-mcp.plant-knowledge.svc.cluster.local:8080/mcp",
)

assert goal_requests_irrigation_minutes_line(PROMPT)
assert goal_requires_machine_readable_only(PROMPT)
assert apply_web_prose_goal_if_enabled(PROMPT) == PROMPT

cat = load_mcp_providers_catalog_merged(Path("config/mcp_providers"))
ids = sorted(str(e.get("id")) for e in cat if e.get("id"))
print("catalog_has_plant_knowledge", "plant_knowledge" in ids)
print("suggest", suggest_mcp_ids_from_user_goal(PROMPT, cat))

plan = _single_agent_trivial_plan(PROMPT, "ollama_llama3_2_3b")
cfg = WorkflowConfig(
    name="t",
    process="sequential",
    topic=PROMPT,
    instance_key="t",
    agent_providers=[{"id": "ollama_llama3_2_3b", "type": "ollama"}],
    mcp_providers=["plant_knowledge"],
    skills=[],
    tasks=[
        TaskDefinition(
            id="step_1",
            agent_provider_id="ollama_llama3_2_3b",
            description=plan["steps"][0]["description"],
            expected_output=plan["steps"][0]["expected_output"],
            mcp_providers=["plant_knowledge"],
            skills=None,
        )
    ],
    task_sequence=["step_1"],
)
cfg2 = _maybe_augment_mcp_from_user_goal(cfg, user_prompt=PROMPT, mcp_catalog=cat, quiet=True)
cfg3 = _prune_irrelevant_mcp_from_user_goal(cfg2, user_prompt=PROMPT, mcp_catalog=cat, quiet=False)
assert cfg3.mcp_providers == [], cfg3.mcp_providers
assert cfg3.tasks[0].mcp_providers == [], cfg3.tasks[0].mcp_providers
print("OK after_prune", cfg3.mcp_providers)
print("expected_output", plan["steps"][0]["expected_output"])
print("SUCCESS")
