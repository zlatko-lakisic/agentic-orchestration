"""Direct-agent fast path: one-task config, prompt shape, and mocked kickoff."""

from __future__ import annotations

from importlib.util import find_spec
from pathlib import Path
from unittest.mock import MagicMock

import pytest
import yaml

import orchestration.direct_agent as direct_agent
from orchestration.direct_agent import (
    build_direct_agent_config,
    build_direct_task_description,
    load_agent_entry,
    run_direct_agent,
)

pytestmark = pytest.mark.unit

#: Kickoff tests patch ``orchestration.runner``, which imports CrewAI. Config-building
#: and prompt-shape tests need neither, so they still run on the unit-test tier.
requires_crewai = pytest.mark.skipif(
    find_spec("crewai") is None,
    reason="crewai not installed (unit-test tier)",
)


@pytest.fixture
def catalog(tmp_path: Path) -> Path:
    path = tmp_path / "agent_providers.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "agent_providers": [
                    {
                        "id": "fake_local",
                        "type": "ollama",
                        "model": "llama3.2",
                        "role": "Analyst",
                        "goal": "Answer questions",
                        "backstory": "A test double.",
                    },
                    {
                        "id": "other_local",
                        "type": "ollama",
                        "model": "llama3.2:1b",
                        "role": "Helper",
                        "goal": "Help",
                        "backstory": "Another test double.",
                    },
                ]
            }
        ),
        encoding="utf-8",
    )
    return path


def test_load_agent_entry_resolves_by_id(catalog: Path) -> None:
    entry = load_agent_entry(agent_provider_id="fake_local", catalog_path=catalog)
    assert entry["id"] == "fake_local"
    assert entry["model"] == "llama3.2"


def test_load_agent_entry_rejects_unknown_and_empty_ids(catalog: Path) -> None:
    with pytest.raises(LookupError) as exc:
        load_agent_entry(agent_provider_id="missing", catalog_path=catalog)
    assert "missing" in str(exc.value)
    with pytest.raises(ValueError):
        load_agent_entry(agent_provider_id="  ", catalog_path=catalog)


def test_task_description_puts_context_before_the_question() -> None:
    text = build_direct_task_description(goal="What is the price?", context="Price is 12%")
    assert text.index("Provided context") < text.index("Question")
    assert "Price is 12%" in text
    assert "What is the price?" in text
    assert "answer now" in text


def test_task_description_omits_an_empty_context_block() -> None:
    text = build_direct_task_description(goal="Hello", context="   ")
    assert "Provided context" not in text


def test_task_description_caps_context(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_DIRECT_AGENT_CONTEXT_CHARS", "500")
    text = build_direct_task_description(goal="q", context="Z" * 5000)
    assert text.count("Z") == 500


def test_config_is_a_single_task_with_no_planner_involved(catalog: Path) -> None:
    config = build_direct_agent_config(
        agent_provider_id="fake_local",
        goal="Summarize this",
        context="ctx",
        catalog_path=catalog,
    )
    assert len(config.tasks) == 1
    assert config.task_sequence == ["direct-fake_local"]
    assert config.process == "sequential"
    assert [p["id"] for p in config.agent_providers] == ["fake_local"]
    assert config.tasks[0].agent_provider_id == "fake_local"
    # No MCP or skills unless the caller asks for them: this path is latency-first.
    assert config.tasks[0].mcp_providers == []
    assert config.tasks[0].skills == []


def test_config_passes_requested_mcp_ids(catalog: Path) -> None:
    config = build_direct_agent_config(
        agent_provider_id="other_local",
        goal="q",
        catalog_path=catalog,
        mcp_provider_ids=["fetch_url"],
    )
    assert config.tasks[0].mcp_providers == ["fetch_url"]


@requires_crewai
def test_run_direct_agent_kicks_off_once_and_returns_text(
    tmp_path: Path,
    catalog: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_KB", "0")

    kickoff = MagicMock(return_value="the direct answer")
    built = MagicMock(crew=MagicMock(kickoff=kickoff), kickoff_callback_state=None)
    monkeypatch.setattr("orchestration.runner.build_workflow", lambda *a, **kw: built)

    answer = run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="fake_local",
        goal="What changed?",
        context="Everything.",
    )
    assert answer == "the direct answer"
    kickoff.assert_called_once_with(inputs={"topic": "What changed?"})


@requires_crewai
def test_run_direct_agent_emits_progress_phases(
    tmp_path: Path,
    catalog: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_KB", "0")

    built = MagicMock(
        crew=MagicMock(kickoff=MagicMock(return_value="ok")),
        kickoff_callback_state=None,
    )
    seen_on_progress: list[str] = []

    def fake_build(*_a, **kw):
        cb = kw.get("on_progress")
        if cb:
            cb("Ensuring Ollama for agent 'fake_local' (llama3.2)…")
            seen_on_progress.append("build_forwarded")
        return built

    monkeypatch.setattr("orchestration.runner.build_workflow", fake_build)

    lines: list[str] = []
    run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="fake_local",
        goal="q",
        on_progress=lines.append,
    )
    assert "build_forwarded" in seen_on_progress
    assert any("ensuring runtime for fake_local" in line for line in lines)
    assert any("Ensuring Ollama" in line for line in lines)
    assert any(line == "starting fake_local" for line in lines)
    assert any(line == "generating" for line in lines)


@requires_crewai
def test_run_direct_agent_persists_to_the_knowledge_base(
    tmp_path: Path,
    catalog: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_KB", "1")
    monkeypatch.setenv("AGENTIC_ANONYMIZE_CLOUD", "0")

    built = MagicMock(
        crew=MagicMock(kickoff=MagicMock(return_value="persisted answer")),
        kickoff_callback_state=None,
    )
    monkeypatch.setattr("orchestration.runner.build_workflow", lambda *a, **kw: built)

    run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="fake_local",
        goal="remember this",
        session_slug="chat",
        user_id="ada",
    )
    from orchestration.knowledge_base import search

    hits = search(tool_root=tmp_path, query="persisted")
    assert len(hits) == 1
    assert hits[0].provider_id == "fake_local"
    assert hits[0].session_slug == "chat"


@requires_crewai
def test_run_direct_agent_can_skip_persistence(
    tmp_path: Path,
    catalog: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_KB", "1")
    built = MagicMock(
        crew=MagicMock(kickoff=MagicMock(return_value="ephemeral answer")),
        kickoff_callback_state=None,
    )
    monkeypatch.setattr("orchestration.runner.build_workflow", lambda *a, **kw: built)

    run_direct_agent(
        tool_root=tmp_path,
        agent_provider_id="fake_local",
        goal="do not store",
        persist=False,
    )
    from orchestration.knowledge_base import search

    assert search(tool_root=tmp_path, query="ephemeral") == []


def test_run_direct_agent_requires_a_goal(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        run_direct_agent(tool_root=tmp_path, agent_provider_id="fake_local", goal="  ")


def test_persist_failure_never_breaks_the_answer(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(**_kw):
        raise RuntimeError("kb down")

    monkeypatch.setattr("orchestration.knowledge_base.add_document", boom)
    direct_agent._persist_direct_answer(
        tool_root=tmp_path,
        session_slug="chat",
        goal="g",
        answer="a",
        provider_id="p",
        user_id=None,
    )
