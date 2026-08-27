"""Unit tests for type: deterministic agent providers."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from agent_providers.factory import agent_provider_from_dict
from orchestration.agent_providers_catalog import catalog_for_planner_prompt
from orchestration.deterministic_runtime import (
    DeterministicAgentError,
    resolve_entrypoint,
    run_deterministic_step,
    serialize_deterministic_result,
)


def _echo_score(*, text: str, context: str = "", mcp_tool_results_or_handles=None):
    return {
        "ok": True,
        "text": text,
        "context": context,
        "mcp": mcp_tool_results_or_handles,
        "p_up": 0.61,
    }


def test_resolve_entrypoint_ok() -> None:
    fn = resolve_entrypoint(
        "orchestration.deterministic_runtime:serialize_deterministic_result"
    )
    assert callable(fn)
    assert fn({"a": 1}) == '{"a": 1}'


def test_resolve_entrypoint_rejects_bad_spec() -> None:
    with pytest.raises(DeterministicAgentError):
        resolve_entrypoint("not-a-spec")


def test_serialize_dict_is_stable() -> None:
    assert serialize_deterministic_result({"b": 2, "a": 1}) == '{"a": 1, "b": 2}'


def test_run_deterministic_step_with_local_callable(monkeypatch: pytest.MonkeyPatch) -> None:
    import sys
    import types

    mod = types.ModuleType("det_fixture_mod")
    mod.score = _echo_score  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "det_fixture_mod", mod)

    entry = {
        "id": "det_score",
        "type": "deterministic",
        "entrypoint": "det_fixture_mod:score",
    }
    out = run_deterministic_step(entry, text="hello", context="ctx", mcp_tool_results_or_handles=["m1"])
    data = json.loads(out)
    assert data["ok"] is True
    assert data["text"] == "hello"
    assert data["context"] == "ctx"
    assert data["p_up"] == 0.61


def test_agent_provider_from_dict_requires_entrypoint() -> None:
    with pytest.raises(ValueError, match="entrypoint"):
        agent_provider_from_dict(
            {
                "id": "bad_det",
                "type": "deterministic",
                "role": "Scorer",
                "goal": "Score",
                "backstory": "Fixed scorer",
            },
            default_model="",
        )


def test_agent_provider_from_dict_accepts_deterministic(monkeypatch: pytest.MonkeyPatch) -> None:
    import sys
    import types

    mod = types.ModuleType("det_fixture_mod2")
    mod.score = _echo_score  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "det_fixture_mod2", mod)

    provider = agent_provider_from_dict(
        {
            "id": "good_det",
            "type": "deterministic",
            "role": "Scorer",
            "goal": "Score symbols",
            "backstory": "Fixed callable",
            "entrypoint": "det_fixture_mod2:score",
            "planner_hint": "Use for numeric scoring",
        },
        default_model="",
    )
    assert provider.config.provider_type == "deterministic"
    provider.validate_config()
    agent = provider.build_agent()
    assert agent is not None
    # LLM shim returns structured JSON for a message string
    result = agent.llm.call("NVDA score")
    parsed = json.loads(result)
    assert parsed["p_up"] == 0.61


def test_catalog_for_planner_prompt_includes_deterministic_section() -> None:
    text = catalog_for_planner_prompt(
        [
            {
                "id": "market_direction_5d",
                "type": "deterministic",
                "role": "Direction scorer",
                "goal": "P(up)",
                "model": "deterministic",
                "planner_hint": "Calibrated direction probability",
            }
        ]
    )
    assert "### Deterministic" in text
    assert "market_direction_5d" in text


def test_run_direct_agent_deterministic_fast_path(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import sys
    import types

    mod = types.ModuleType("det_direct_mod")
    mod.score = _echo_score  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "det_direct_mod", mod)

    catalog = tmp_path / "agents"
    catalog.mkdir()
    (catalog / "det.yaml").write_text(
        "\n".join(
            [
                "id: det_direct",
                "type: deterministic",
                "role: Scorer",
                "goal: Score",
                "backstory: Fixed",
                "entrypoint: det_direct_mod:score",
                "planner_hint: scoring",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    # Point catalog_paths at our temp catalog.
    from orchestration import dynamic_run

    class _Paths:
        agent_providers = catalog

    monkeypatch.setattr(dynamic_run, "catalog_paths", lambda root: _Paths())

    from orchestration.direct_agent import run_direct_agent

    out = run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="det_direct",
        goal="score me",
        context="c",
        persist=False,
    )
    data = json.loads(out)
    assert data["text"] == "score me"
    assert data["ok"] is True
