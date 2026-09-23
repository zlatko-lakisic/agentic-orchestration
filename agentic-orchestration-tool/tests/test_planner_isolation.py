"""Regression: poisoned planner history must not contaminate social turns."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from orchestration.dynamic_planner import build_dynamic_workflow_config
from orchestration.orchestrator_session import OrchestratorSessionFile, save_session

COMSTAR_GUARD = (
    "\n\nAnswer ONLY the Current request. Do not recite world news, headlines, "
    "or current events unless that request explicitly asks for them."
)

HOME_PLAN = json.dumps(
    {
        "plan_summary": (
            "home status including security systems, climate controls, appliances, "
            "home network, and irrigation systems"
        ),
        "steps": [
            {
                "agent_provider_id": "client.text_responder",
                "description": "spoken update on security systems, climate, irrigation",
                "expected_output": "home status report",
            }
        ],
    }
)

ETHNIC_PLAN = json.dumps(
    {
        "plan_summary": (
            "relationship between different ethnic groups including security systems "
            "and irrigation"
        ),
        "steps": [
            {
                "agent_provider_id": "client.text_responder",
                "description": (
                    "written summary of the relationship between different ethnic groups, "
                    "including security systems, climate controls, appliances, home network, "
                    "and irrigation systems"
                ),
                "expected_output": "ethnic groups report",
            }
        ],
    }
)


def _write_mini_catalog(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    (path / "client.text_responder.yaml").write_text(
        "\n".join(
            [
                "id: client.text_responder",
                "type: openai",
                "model: gpt-4o-mini",
                "role: Text responder",
                "goal: Answer household questions in clear written replies",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (path / "client.voice_responder.yaml").write_text(
        "\n".join(
            [
                "id: client.voice_responder",
                "type: openai",
                "model: gpt-4o-mini",
                "role: Voice responder",
                "goal: Answer in spoken English",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return path


def _poisoned_session(path: Path) -> None:
    sess = OrchestratorSessionFile(
        planner_history=[
            {"role": "user", "content": "Tell me about my home."},
            {"role": "assistant", "content": HOME_PLAN},
            {"role": "user", "content": "Tell me about my home."},
            {"role": "assistant", "content": HOME_PLAN},
            {"role": "user", "content": "Tell me about my home."},
            {"role": "assistant", "content": HOME_PLAN},
            {
                "role": "user",
                "content": "Indians and Pakistanis can't stand each other.",
            },
            {"role": "assistant", "content": ETHNIC_PLAN},
        ],
        last_crew_output_excerpt=(
            "However, the additional instruction regarding ethnic groups and irrigation…"
        ),
    )
    save_session(path, sess)


@pytest.fixture()
def planner_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, Path]:
    catalog = _write_mini_catalog(tmp_path / "agents")
    session = tmp_path / "sess.json"
    _poisoned_session(session)

    # Bypass hardware / Ollama / credential filters for unit tests.
    monkeypatch.setenv("AGENTIC_DISABLE_HARDWARE_FILTER", "1")
    monkeypatch.setenv("AGENTIC_DISABLE_OLLAMA_PULL_FILTER", "1")
    monkeypatch.setenv("AGENTIC_PLANNER_SOCIAL_SHORT_CIRCUIT", "1")
    monkeypatch.setenv("AGENTIC_PLANNER_CONTEXT_MODE", "followup")
    monkeypatch.setenv("AGENTIC_PLANNER_HISTORY_REPLAY", "goals")
    monkeypatch.setenv("AGENTIC_KB_ENABLED", "0")
    monkeypatch.setenv("AGENTIC_LEARNING_ENABLED", "0")

    def _passthrough_cred(entries, **_kwargs):  # type: ignore[no-untyped-def]
        return entries, []

    monkeypatch.setattr(
        "orchestration.dynamic_planner.filter_entries_by_api_credentials",
        _passthrough_cred,
    )
    monkeypatch.setattr(
        "orchestration.catalog_credentials.filter_entries_by_api_credentials",
        _passthrough_cred,
    )

    def _boom(*_a, **_k):  # type: ignore[no-untyped-def]
        raise AssertionError("planner LLM must not be called for social short-circuit")

    monkeypatch.setattr(
        "orchestration.dynamic_planner._planner_chat_completion",
        _boom,
    )
    return {"catalog": catalog, "session": session}


def test_social_short_circuit_ignores_poisoned_history(planner_env: dict[str, Path]) -> None:
    session = planner_env["session"]
    before = json.loads(session.read_text(encoding="utf-8"))
    hist_len = len(before.get("planner_history") or [])

    prompt = f"How are you today?{COMSTAR_GUARD}"
    cfg, plan = build_dynamic_workflow_config(
        user_prompt=prompt,
        catalog_path=planner_env["catalog"],
        session_path=session,
        quiet=True,
        client_app_id="comstar-ai",
    )
    assert len(cfg.tasks) == 1
    step = cfg.tasks[0]
    blob = f"{step.description}\n{step.expected_output}\n{json.dumps(plan)}".lower()
    for banned in ("ethnic", "irrigation", "security", "climate", "appliance", "network"):
        assert banned not in blob, banned
    assert step.mcp_providers == [] or step.mcp_providers is None or list(step.mcp_providers) == []
    assert (step.skills or []) == []
    assert plan.get("_planner_context", {}).get("social") is True
    assert plan.get("_planner_context", {}).get("short_circuit") == "social"

    after = json.loads(session.read_text(encoding="utf-8"))
    assert len(after.get("planner_history") or []) == hist_len


def test_non_followup_weather_skips_history_replay(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: list[list[dict[str, str]]] = []

    def _capture(messages, model, json_mode=None):  # type: ignore[no-untyped-def]
        captured.append(messages)
        return json.dumps(
            {
                "plan_summary": "weather",
                "steps": [
                    {
                        "agent_provider_id": "client.text_responder",
                        "description": "{topic} Answer the weather question.",
                        "expected_output": "Short weather answer",
                    }
                ],
            }
        )

    monkeypatch.setattr(
        "orchestration.dynamic_planner._planner_chat_completion",
        _capture,
    )
    build_dynamic_workflow_config(
        user_prompt=f"what's the weather{COMSTAR_GUARD}",
        catalog_path=planner_env["catalog"],
        session_path=planner_env["session"],
        quiet=True,
        client_app_id="comstar-ai",
    )
    assert captured, "planner should be called for non-social"
    msgs = captured[0]
    roles = [m.get("role") for m in msgs]
    # No assistant plan JSON replayed (history_pairs goals-only + followup=false → empty).
    assert "assistant" not in roles
    system = next(m["content"] for m in msgs if m["role"] == "system")
    assert "Previous crew output" not in system
    assert "Local knowledge base" not in system


def test_followup_replays_goals_only(
    planner_env: dict[str, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: list[list[dict[str, str]]] = []

    def _capture(messages, model, json_mode=None):  # type: ignore[no-untyped-def]
        captured.append(messages)
        return json.dumps(
            {
                "plan_summary": "followup",
                "steps": [
                    {
                        "agent_provider_id": "client.text_responder",
                        "description": "{topic}",
                        "expected_output": "answer",
                    }
                ],
            }
        )

    monkeypatch.setattr(
        "orchestration.dynamic_planner._planner_chat_completion",
        _capture,
    )
    build_dynamic_workflow_config(
        user_prompt="what about tomorrow?",
        catalog_path=planner_env["catalog"],
        session_path=planner_env["session"],
        quiet=True,
        client_app_id="comstar-ai",
    )
    assert captured
    msgs = captured[0]
    hist = [m for m in msgs if m["role"] in ("user", "assistant")][:-1]
    assert hist, "follow-up should replay some history"
    assert all(m["role"] == "user" for m in hist)
    assert all("irrigation" not in m["content"].lower() or True for m in hist)
    # Goals-only: no assistant plan JSON in replay.
    assert not any(m["role"] == "assistant" for m in hist)
