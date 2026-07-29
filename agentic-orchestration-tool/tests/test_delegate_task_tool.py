from __future__ import annotations

from typing import Any

import pytest

from orchestration import delegate_task_tool
from orchestration.delegate_task_tool import (
    DelegateTaskTool,
    attach_delegate_task_tool,
    delegation_enabled_from_env,
)


class _FakeAgent:
    def __init__(self, tools: list[Any] | None = None) -> None:
        self.tools = list(tools or [])


class _FakeCrew:
    def __init__(self, agents: list[_FakeAgent]) -> None:
        self.agents = agents


class _FakeBuilt:
    def __init__(self, agents: list[_FakeAgent]) -> None:
        self.crew = _FakeCrew(agents)


CATALOG: list[dict[str, Any]] = [
    {"id": "a_expert", "type": "ollama", "model": "llama3.3", "society_capable": True},
    {"id": "a_coder", "type": "ollama", "model": "qwen2.5-coder", "society_capable": True},
]


@pytest.fixture
def fake_inline(monkeypatch: pytest.MonkeyPatch):
    """Replace the real crew kickoff with a recorder."""
    calls: list[dict[str, Any]] = []
    state: dict[str, Any] = {"result": "delegated answer"}

    def fake_run(**kwargs: Any) -> str:
        calls.append(kwargs)
        result = state["result"]
        if isinstance(result, BaseException):
            raise result
        return str(result)

    monkeypatch.setattr(delegate_task_tool, "run_inline_delegation", fake_run)
    return calls, state


def _tool(**kwargs: Any) -> DelegateTaskTool:
    kwargs.setdefault("agent_catalog", CATALOG)
    return DelegateTaskTool(**kwargs)


def test_tool_name_and_argument_surface_match_k8s_delegate_task() -> None:
    from orchestration.k8s_delegation_tool import K8sDelegateTaskTool

    tool = _tool()
    assert tool.name == "delegate_task"

    import inspect

    ours = list(inspect.signature(DelegateTaskTool._run).parameters)
    theirs = list(inspect.signature(K8sDelegateTaskTool._run).parameters)
    assert ours == theirs == ["self", "agent_provider_id", "task_description", "expected_output"]


def test_run_delegates_and_returns_child_answer(fake_inline) -> None:
    calls, _state = fake_inline
    tool = _tool(topic="Where should the index live?")

    out = tool._run("a_expert", "Estimate the cost of edge inference.", "A cost range.")

    assert out == "delegated answer"
    assert calls[0]["agent_provider"]["id"] == "a_expert"
    assert calls[0]["task_description"] == "Estimate the cost of edge inference."
    assert calls[0]["expected_output"] == "A cost range."
    assert calls[0]["topic"] == "Where should the index live?"


def test_default_expected_output_is_applied(fake_inline) -> None:
    calls, _state = fake_inline
    _tool()._run("a_expert", "Do the thing")
    assert calls[0]["expected_output"] == "A concise answer to the delegated sub-task."


def test_unknown_agent_is_refused_without_running(fake_inline) -> None:
    calls, _state = fake_inline
    out = _tool()._run("a_ghost", "Do the thing")
    assert out.startswith("Delegation refused:")
    assert "unknown agent_provider_id" in out
    assert calls == []


def test_empty_task_description_is_refused(fake_inline) -> None:
    calls, _state = fake_inline
    assert "task_description" in _tool()._run("a_expert", "   ")
    assert calls == []


def test_allowlist_restricts_targets(fake_inline) -> None:
    calls, _state = fake_inline
    tool = _tool(allowed_agent_provider_ids=["a_expert"])
    assert tool._run("a_expert", "ok") == "delegated answer"
    refused = tool._run("a_coder", "ok")
    assert "not delegable here" in refused
    assert len(calls) == 1


def test_budget_reservation_runs_before_the_child(fake_inline) -> None:
    calls, _state = fake_inline
    reserved: list[tuple[str, str]] = []

    def reserve(agent_provider_id: str, task_description: str) -> None:
        reserved.append((agent_provider_id, task_description))

    out = _tool(reserve_delegation=reserve)._run("a_coder", "Write the migration")
    assert out == "delegated answer"
    assert reserved == [("a_coder", "Write the migration")]
    assert len(calls) == 1


def test_exhausted_budget_refuses_and_skips_the_child(fake_inline) -> None:
    calls, _state = fake_inline

    def reserve(_agent_provider_id: str, _task_description: str) -> None:
        raise ValueError("delegation budget exhausted (2/2)")

    out = _tool(reserve_delegation=reserve)._run("a_expert", "one more thing")
    assert out == "Delegation refused: delegation budget exhausted (2/2)"
    assert calls == []


def test_child_failure_is_returned_as_text_not_raised(fake_inline) -> None:
    _calls, state = fake_inline
    state["result"] = RuntimeError("ollama connection refused")
    out = _tool()._run("a_expert", "do it")
    assert out == "Delegation failed: ollama connection refused"


def test_attach_requires_enabled_flag_or_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_SOCIETY_DELEGATE", raising=False)
    assert delegation_enabled_from_env() is False

    built = _FakeBuilt([_FakeAgent()])
    assert attach_delegate_task_tool(built, agent_catalog=CATALOG) is False
    assert built.crew.agents[0].tools == []

    monkeypatch.setenv("AGENTIC_SOCIETY_DELEGATE", "1")
    assert delegation_enabled_from_env() is True
    assert attach_delegate_task_tool(built, agent_catalog=CATALOG) is True
    assert [t.name for t in built.crew.agents[0].tools] == ["delegate_task"]


def test_attach_enabled_argument_overrides_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_DELEGATE", "1")
    built = _FakeBuilt([_FakeAgent()])
    assert attach_delegate_task_tool(built, agent_catalog=CATALOG, enabled=False) is False
    assert built.crew.agents[0].tools == []


def test_attach_preserves_existing_tools_on_every_agent() -> None:
    existing = object()
    built = _FakeBuilt([_FakeAgent([existing]), _FakeAgent()])
    assert attach_delegate_task_tool(built, agent_catalog=CATALOG, enabled=True) is True
    assert built.crew.agents[0].tools[0] is existing
    assert [t.name for t in built.crew.agents[0].tools[1:]] == ["delegate_task"]
    assert [t.name for t in built.crew.agents[1].tools] == ["delegate_task"]


def test_attach_is_a_noop_without_a_catalog() -> None:
    built = _FakeBuilt([_FakeAgent()])
    assert attach_delegate_task_tool(built, agent_catalog=[], enabled=True) is False
    assert built.crew.agents[0].tools == []


def test_attached_tool_carries_reservation_and_allowlist(fake_inline) -> None:
    calls, _state = fake_inline
    reserved: list[str] = []
    built = _FakeBuilt([_FakeAgent()])
    attach_delegate_task_tool(
        built,
        agent_catalog=CATALOG,
        topic="panel goal",
        reserve_delegation=lambda pid, _desc: reserved.append(pid),
        allowed_agent_provider_ids=["a_expert"],
        enabled=True,
    )
    tool = built.crew.agents[0].tools[0]

    assert "not delegable here" in tool._run("a_coder", "x")
    assert tool._run("a_expert", "x") == "delegated answer"
    assert reserved == ["a_expert"]
    assert calls[0]["topic"] == "panel goal"


def _patch_build_workflow(
    monkeypatch: pytest.MonkeyPatch,
    kickoff_result: Any,
) -> dict[str, Any]:
    """Stub ``build_workflow`` so run_inline_delegation never touches a real LLM."""
    captured: dict[str, Any] = {}

    def fake_build_workflow(cfg, **kwargs: Any):
        captured["cfg"] = cfg
        captured["kwargs"] = kwargs

        class _Built:
            crew = type("_C", (), {"kickoff": staticmethod(lambda inputs: kickoff_result)})()
            kickoff_callback_state = None

        return _Built()

    monkeypatch.setattr("orchestration.runner.build_workflow", fake_build_workflow)
    return captured


def test_inline_delegation_builds_a_single_task_workflow(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _patch_build_workflow(monkeypatch, "the child answer")

    out = delegate_task_tool.run_inline_delegation(
        agent_provider=CATALOG[0],
        task_description="summarize",
        expected_output="a summary",
        topic="topic",
    )
    assert out == "the child answer"

    cfg = captured["cfg"]
    assert cfg.process == "sequential"
    assert cfg.topic == "topic"
    assert cfg.agent_providers == [CATALOG[0]]
    assert len(cfg.tasks) == 1
    assert cfg.tasks[0].agent_provider_id == "a_expert"
    assert cfg.tasks[0].description == "summarize"
    assert cfg.tasks[0].expected_output == "a summary"
    assert cfg.task_sequence == [cfg.tasks[0].id]
    assert captured["kwargs"]["quiet"] is True
    assert captured["kwargs"]["crew_verbose"] is False


def test_inline_delegation_labels_empty_child_output(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_build_workflow(monkeypatch, "   ")
    out = delegate_task_tool.run_inline_delegation(
        agent_provider=CATALOG[0],
        task_description="summarize",
    )
    assert out == "(empty delegation result)"


def test_inline_delegation_result_is_truncated(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_SOCIETY_DELEGATE_RESULT_CHARS", "600")
    _patch_build_workflow(monkeypatch, "Y" * 5000)
    out = delegate_task_tool.run_inline_delegation(
        agent_provider=CATALOG[0],
        task_description="summarize",
    )
    assert len(out) == 600
