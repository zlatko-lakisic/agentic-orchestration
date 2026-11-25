"""Provider env isolation, per-request identity, dispatch/recovery wiring and cancellation."""

from __future__ import annotations

import asyncio
import os
import subprocess
import threading
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from orchestration.backends.base import RunOptions, StepResult, StepSpec, WorkflowExecutionResult
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.session_env import reset_session_env, set_session_env


def _provider(type_: str, **extra: Any):  # noqa: ANN202
    from agent_providers.factory import agent_provider_from_dict

    data = {
        "id": extra.pop("id", f"{type_}_agent"),
        "type": type_,
        "role": "r",
        "goal": "g",
        "backstory": "b",
        "model": extra.pop("model", "gpt-4o-mini"),
        **extra,
    }
    return agent_provider_from_dict(data, default_model="gpt-4o-mini")


# ------------------------------------------------------------- finding 2: providers


@pytest.mark.unit
def test_openai_provider_does_not_export_session_base_url_to_the_process(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Tenant A's session base URL used to stay in ``os.environ`` and receive
    tenant B's prompts together with the server's own API key."""
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_BASE", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-server-key")

    token = set_session_env({"OPENAI_BASE_URL": "https://a.example/v1"})
    try:
        tenant_a = _provider("openai")
        tenant_a.initialize()
        assert tenant_a._base_url == "https://a.example/v1"
    finally:
        reset_session_env(token)

    assert "OPENAI_BASE_URL" not in os.environ

    tenant_b = _provider("openai")
    tenant_b.initialize()
    assert tenant_b._base_url is None  # cloud OpenAI, not tenant A's host


@pytest.mark.unit
def test_openai_provider_does_not_export_agent_base_url_or_placeholder_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.delenv("OPENAI_API_BASE", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    local = _provider("openai", id="client.local", openai_base_url="http://127.0.0.1:1234")
    local.initialize()
    assert local._base_url == "http://127.0.0.1:1234/v1"
    assert "OPENAI_BASE_URL" not in os.environ
    assert "OPENAI_API_KEY" not in os.environ  # placeholder stays on the instance

    captured: dict[str, Any] = {}
    import agent_providers.openai_provider as mod

    monkeypatch.setattr(mod, "LLM", lambda **kw: captured.update(kw) or SimpleNamespace(**kw))
    monkeypatch.setattr(mod, "Agent", lambda **kw: SimpleNamespace(**kw))
    local.build_agent()
    assert captured["base_url"] == "http://127.0.0.1:1234/v1"
    assert captured["api_key"] == "local"


@pytest.mark.unit
def test_anthropic_provider_does_not_export_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_URL", raising=False)
    monkeypatch.delenv("ANTHROPIC_BASE_URL", raising=False)
    token = set_session_env({"ANTHROPIC_BASE_URL": "https://proxy.tenant-a.example"})
    try:
        provider = _provider("anthropic", model="claude-sonnet-4-5")
        provider.initialize()
        assert provider._base_url == "https://proxy.tenant-a.example"
    finally:
        reset_session_env(token)
    assert "ANTHROPIC_API_URL" not in os.environ


@pytest.mark.unit
def test_vllm_provider_keeps_placeholder_key_off_the_process_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("VLLM_API_KEY", raising=False)
    monkeypatch.setenv("VLLM_BASE_URL", "http://127.0.0.1:8000")
    provider = _provider("vllm")
    provider.initialize()
    assert provider._base_url == "http://127.0.0.1:8000/v1"
    assert "OPENAI_API_KEY" not in os.environ

    captured: dict[str, Any] = {}
    import agent_providers.vllm_provider as mod

    monkeypatch.setattr(mod, "LLM", lambda **kw: captured.update(kw) or SimpleNamespace(**kw))
    monkeypatch.setattr(mod, "Agent", lambda **kw: SimpleNamespace(**kw))
    provider.build_agent()
    assert captured["api_key"] == "local"


@pytest.mark.unit
def test_client_ollama_agent_host_is_not_exported(monkeypatch: pytest.MonkeyPatch) -> None:
    import orchestration.session_overlay_runtime as overlay_runtime

    monkeypatch.setenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    monkeypatch.delenv("OLLAMA_API_BASE", raising=False)
    monkeypatch.setattr(overlay_runtime, "ensure_client_agent_ollama_runtime", lambda entry: None)

    provider = _provider(
        "ollama", id="client.llm", model="ollama/qwen2.5:3b", ollama_host="http://10.9.9.9:11434"
    )
    provider.initialize()
    # Process default untouched: other tenants' Ollama calls are not redirected.
    assert os.environ["OLLAMA_HOST"] == "http://127.0.0.1:11434"
    # This agent still talks to the host its runtime was ensured on.
    assert provider._inference_api_base() == "http://10.9.9.9:11434"

    other = _provider("ollama", id="ollama_default", model="ollama/qwen2.5:3b")
    assert other._inference_api_base() == "http://127.0.0.1:11434"


# ------------------------------------------------------- contract 4: identity readers


@pytest.mark.unit
def test_identity_readers_prefer_the_bound_context_over_process_env(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from orchestration.llm_usage import (
        bind_usage_context,
        current_app_id,
        current_run_id,
        current_user_id,
        reset_usage_context,
    )
    from orchestration.run_store import resolve_run_id

    # Whatever the last concurrent run wrote to the shared process env.
    monkeypatch.setenv("AGENTIC_RUN_ID", "env-run-of-someone-else")
    monkeypatch.setenv("AGENTIC_USER_ID", "env-user")
    monkeypatch.setenv("AGENTIC_APP_ID", "env-app")

    seen: dict[str, tuple[str, str, str, str]] = {}

    def run(name: str) -> None:
        tokens = bind_usage_context(
            tool_root=tmp_path, run_id=f"run-{name}", user_id=f"user-{name}", app_id=f"app-{name}"
        )
        try:
            seen[name] = (current_run_id(), current_user_id(), current_app_id(), resolve_run_id())
        finally:
            reset_usage_context(tokens)

    threads = [threading.Thread(target=run, args=(n,)) for n in ("a", "b")]
    for t in threads:
        t.start()
    for t in threads:
        t.join(5)
    assert seen["a"] == ("run-a", "user-a", "app-a", "run-a")
    assert seen["b"] == ("run-b", "user-b", "app-b", "run-b")

    # Unbound context (CLI / worker process): env fallback still works.
    assert current_run_id() == "env-run-of-someone-else"
    assert resolve_run_id() == "env-run-of-someone-else"
    assert resolve_run_id("explicit") == "explicit"


@pytest.mark.unit
def test_planner_trace_uses_the_context_run_id(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from orchestration import dynamic_planner, run_trace
    from orchestration.llm_usage import bind_usage_context, reset_usage_context

    monkeypatch.setenv("AGENTIC_RUN_ID", "env-run-of-someone-else")
    events: list[str] = []
    monkeypatch.setattr(
        run_trace, "append_run_event", lambda root, rid, kind, **kw: events.append(rid)
    )
    tokens = bind_usage_context(tool_root=tmp_path, run_id="my-run")
    try:
        dynamic_planner._emit_planner_trace(tool_root=tmp_path, kind="planner_context")
    finally:
        reset_usage_context(tokens)
    assert events == ["my-run"]


# ---------------------------------------------------------------- finding 8: RAG path


def _config() -> WorkflowConfig:
    return WorkflowConfig(
        name="t",
        process="sequential",
        topic="x",
        instance_key="k",
        agent_providers=[{"id": "p", "type": "ollama", "model": "m"}],
        mcp_providers=[],
        skills=[],
        tasks=[TaskDefinition(id="s", agent_provider_id="p", description="d", expected_output="o")],
        task_sequence=["s"],
    )


@pytest.mark.unit
def test_inprocess_dispatch_passes_the_rag_sources_catalog(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """The default path built the workflow with an empty RAG catalog, silently
    dropping the planner's ``rag_ids`` (no context, no RAG tool)."""
    from orchestration import execution_dispatch

    seen: dict[str, Any] = {}

    class FakeBackend:
        name = "inprocess"
        supports_distributed_steps = False

        def execute_built(self, built, *, options) -> WorkflowExecutionResult:  # noqa: ANN001
            return WorkflowExecutionResult(exit_code=0, result_text="ok")

    def fake_build_workflow(config, **kwargs):  # noqa: ANN001, ANN003
        seen.update(kwargs)
        return SimpleNamespace(crew=SimpleNamespace(verbose=False))

    monkeypatch.delenv("AGENTIC_EXECUTION_BACKEND", raising=False)
    monkeypatch.setattr(execution_dispatch, "execution_backend_from_env", lambda: FakeBackend())
    monkeypatch.setattr(execution_dispatch, "build_workflow", fake_build_workflow)

    rag_path = tmp_path / "rag_sources"
    execution_dispatch.execute_workflow_config_resolved(
        _config(),
        options=RunOptions(quiet=True, rag_sources_catalog_path=rag_path),
    )
    assert seen["rag_sources_catalog_path"] == rag_path


# ---------------------------------------------------------- finding 9: recovery catalog


def _spec() -> StepSpec:
    return StepSpec(
        schema_version="0.1",
        run_id="r",
        step_id="s",
        step_index=0,
        workflow_name="t",
        topic="t",
        task_description="d",
        task_expected_output="o",
        agent_provider={"id": "hf_agent", "type": "huggingface"},
        mcp_providers=[],
        skills=[],
        prior_output="",
        inputs={},
    )


@pytest.mark.unit
def test_step_recovery_uses_the_agent_providers_catalog(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from orchestration import step_recovery
    from orchestration.backends import subprocess_runner

    used: list[Path] = []

    def fake_fallback(config, error, *, catalog_path, quiet):  # noqa: ANN001
        used.append(Path(catalog_path))
        return config

    monkeypatch.setattr(step_recovery, "workflow_config_after_hf_litellm_fallback", fake_fallback)
    failed = StepResult(
        run_id="r",
        step_id="s",
        exit_code=1,
        error="hf boom",
        recoverable=True,
        recovery_hint=step_recovery.RECOVERY_HF_LITELLM,
    )

    # Explicit agent-providers catalog is honoured …
    agents = tmp_path / "agents"
    attempt = step_recovery.attempt_step_recovery(
        _config(), spec=_spec(), result=failed, catalog_path=agents, quiet=True
    )
    assert attempt.should_retry is True
    assert used[-1] == agents

    # … and the default resolves against the tool root, not the process cwd.
    monkeypatch.chdir(tmp_path)
    step_recovery.attempt_step_recovery(
        _config(), spec=_spec(), result=failed, catalog_path=None, quiet=True
    )
    assert used[-1].is_absolute()
    assert used[-1] == Path(step_recovery.__file__).resolve().parents[1] / "config" / "agent_providers"

    # The subprocess runner hands recovery the *agent* catalog, not the MCP catalog.
    seen: dict[str, Any] = {}

    def fake_make_callback(config_box, *, catalog_path, quiet):  # noqa: ANN001
        seen["catalog_path"] = catalog_path
        return lambda spec, result: False

    monkeypatch.setattr(subprocess_runner, "make_step_recovery_callback", fake_make_callback)
    monkeypatch.setattr(
        subprocess_runner.subprocess,
        "run",
        lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, stdout="out", stderr=""),
    )
    monkeypatch.setattr(
        subprocess_runner,
        "build_step_specs",
        lambda config, **kw: [_spec()],
    )
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path / "store"))
    monkeypatch.delenv("AGENTIC_EXECUTION_QUEUE_ENABLED", raising=False)
    subprocess_runner.run_config_via_subprocess(
        _config(),
        options=RunOptions(
            quiet=True,
            emit_stdout_summary=False,
            mcp_catalog_path=tmp_path / "mcp_providers",
            agent_providers_catalog_path=agents,
        ),
    )
    assert seen["catalog_path"] == agents


# ------------------------------------------------------------ contract 2: cancellation


@pytest.fixture()
def dynamic_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> dict[str, Any]:
    import orchestration.dynamic_planner as dynamic_planner
    import orchestration.dynamic_run as dynamic_run
    import orchestration.execution_dispatch as execution_dispatch

    monkeypatch.delenv("AGENTIC_EXECUTION_QUEUE_ENABLED", raising=False)
    monkeypatch.setenv("AGENTIC_KB_ENABLED", "0")
    calls: dict[str, Any] = {"plan": 0, "execute": 0, "plan_kwargs": None, "options": None}

    def fake_plan(**kwargs: Any):  # noqa: ANN202
        calls["plan"] += 1
        calls["plan_kwargs"] = kwargs
        hook = calls.get("during_plan")
        if hook:
            hook()
        return _config(), {"plan_summary": "s", "steps": []}

    def fake_execute(config, *, options):  # noqa: ANN001, ANN202
        calls["execute"] += 1
        calls["options"] = options
        hook = calls.get("during_execute")
        if hook:
            hook()
        return WorkflowExecutionResult(exit_code=0, result_text="answer")

    monkeypatch.setattr(dynamic_planner, "build_dynamic_workflow_config", fake_plan)
    monkeypatch.setattr(execution_dispatch, "execute_workflow_config_resolved", fake_execute)
    monkeypatch.setattr(dynamic_run, "_record_dynamic_run_state", lambda **kw: calls.update(recorded=kw))
    calls["root"] = tmp_path
    return calls


@pytest.mark.unit
def test_run_dynamic_goal_stops_before_planning_when_cancelled(dynamic_env: dict[str, Any]) -> None:
    from orchestration.dynamic_run import RunCancelled, run_dynamic_goal

    cancel = threading.Event()
    cancel.set()
    with pytest.raises(RunCancelled):
        run_dynamic_goal(tool_root=dynamic_env["root"], goal="hello", cancel_event=cancel)
    assert dynamic_env["plan"] == 0
    assert dynamic_env["execute"] == 0


@pytest.mark.unit
def test_run_dynamic_goal_stops_between_planning_and_execution(
    dynamic_env: dict[str, Any],
) -> None:
    from orchestration.dynamic_run import RunCancelled, run_dynamic_goal

    cancel = threading.Event()
    dynamic_env["during_plan"] = cancel.set  # client cancels while the planner LLM runs
    with pytest.raises(RunCancelled):
        run_dynamic_goal(tool_root=dynamic_env["root"], goal="hello", cancel_event=cancel)
    assert dynamic_env["plan"] == 1
    assert dynamic_env["execute"] == 0


@pytest.mark.unit
def test_run_dynamic_goal_discards_a_result_that_was_cancelled_mid_execution(
    dynamic_env: dict[str, Any],
) -> None:
    from orchestration.dynamic_run import RunCancelled, run_dynamic_goal

    cancel = threading.Event()
    dynamic_env["during_execute"] = cancel.set
    with pytest.raises(RunCancelled):
        run_dynamic_goal(tool_root=dynamic_env["root"], goal="hello", cancel_event=cancel)
    assert dynamic_env["execute"] == 1
    assert "recorded" not in dynamic_env  # not persisted as a session answer


@pytest.mark.unit
def test_run_dynamic_goal_without_cancel_event_is_unchanged(dynamic_env: dict[str, Any]) -> None:
    from orchestration.dynamic_run import run_dynamic_goal

    out = run_dynamic_goal(tool_root=dynamic_env["root"], goal="hello", user_id="alice")
    assert out == "answer"
    # Caller identity reaches the planner (KB scoping) and step recovery gets
    # the agent-providers catalog; the cancel event rides on RunOptions.
    assert dynamic_env["plan_kwargs"]["user_id"] == "alice"
    options = dynamic_env["options"]
    assert options.agent_providers_catalog_path is not None
    assert options.agent_providers_catalog_path.name == "agent_providers"
    assert options.cancel_event is None


@pytest.mark.unit
def test_session_bookkeeping_failure_does_not_fail_a_finished_run(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    import orchestration.dynamic_run as dynamic_run
    import orchestration.orchestrator_session as orchestrator_session

    def boom(*args: Any, **kwargs: Any) -> None:
        raise OSError("read-only file system")

    monkeypatch.setattr(orchestrator_session, "update_session_after_crew", boom)
    monkeypatch.setenv("AGENTIC_KB_ENABLED", "0")
    dynamic_run._record_dynamic_run_state(
        tool_root=tmp_path,
        session_path=tmp_path / "s.json",
        session_slug="s",
        goal="g",
        result_text="done",
        provider_id="p",
        user_id=None,
    )


# -------------------------------------------------------------- finding 13: broker


@pytest.mark.unit
def test_broker_releases_leases_off_the_event_loop(monkeypatch: pytest.MonkeyPatch) -> None:
    """``release`` drains the queue with synchronous upstream HTTP; on the loop it
    stalled every proxied stream and ``/health``."""
    import httpx
    from fastapi.testclient import TestClient

    from orchestration import ollama_resource_broker as broker

    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_UPSTREAM", "http://upstream.test")

    release_threads: list[bool] = []

    class FakeManager:
        def start_idle_reconciler(self) -> None:
            return None

        def stop_idle_reconciler(self) -> None:
            return None

        def acquire(self, model: str) -> object:
            return SimpleNamespace(model=model)

        def release(self, lease: object) -> None:
            try:
                asyncio.get_running_loop()
                on_loop = True
            except RuntimeError:
                on_loop = False
            release_threads.append(on_loop)

    def upstream(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/chat":
            return httpx.Response(200, json={"message": {"content": "ok"}, "done": True})
        raise httpx.ConnectError("down", request=request)

    transport = httpx.MockTransport(upstream)
    app = broker.create_broker_app(manager=FakeManager())
    with TestClient(app) as client:
        app.state.http = httpx.AsyncClient(transport=transport)
        ok = client.post("/api/chat", json={"model": "a:1b", "messages": [], "stream": False})
        assert ok.status_code == 200
        streamed = client.post("/api/chat", json={"model": "a:1b", "messages": [], "stream": True})
        assert streamed.status_code == 200
        failed = client.post("/api/generate", json={"model": "a:1b", "prompt": "x"})
        assert failed.status_code == 502

    assert release_threads == [False, False, False]


@pytest.mark.unit
def test_broker_upstream_client_has_a_read_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration import ollama_resource_broker as broker

    monkeypatch.delenv("AGENTIC_OLLAMA_BROKER_READ_TIMEOUT_SECONDS", raising=False)
    assert broker._upstream_timeout().read == 1800.0
    monkeypatch.setenv("AGENTIC_OLLAMA_BROKER_READ_TIMEOUT_SECONDS", "30")
    assert broker._upstream_timeout().read == 30.0
    monkeypatch.setenv("AGENTIC_OLLAMA_BROKER_READ_TIMEOUT_SECONDS", "0")
    assert broker._upstream_timeout().read is None


# ------------------------------------------------------------ finding 17: installer


@pytest.mark.unit
def test_ollama_installer_is_bounded_pinnable_and_can_be_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import agent_providers.ollama_provider as mod

    calls: list[dict[str, Any]] = []

    def fake_run(cmd, **kwargs):  # noqa: ANN001, ANN003, ANN202
        calls.append({"cmd": cmd, **kwargs})
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(mod.subprocess, "run", fake_run)
    monkeypatch.delenv("AGENTIC_OLLAMA_AUTO_INSTALL", raising=False)
    monkeypatch.setenv("AGENTIC_OLLAMA_INSTALL_VERSION", "0.5.7")
    monkeypatch.setenv("AGENTIC_OLLAMA_INSTALL_TIMEOUT_SECONDS", "120")

    mod.install_ollama_native_linux()
    assert calls[-1]["timeout"] == 120.0
    assert calls[-1]["env"]["OLLAMA_VERSION"] == "0.5.7"

    monkeypatch.setenv("AGENTIC_OLLAMA_AUTO_INSTALL", "0")
    before = len(calls)
    with pytest.raises(RuntimeError, match="AGENTIC_OLLAMA_AUTO_INSTALL"):
        mod.install_ollama_native_linux()
    with pytest.raises(RuntimeError, match="AGENTIC_OLLAMA_AUTO_INSTALL"):
        mod.install_ollama()
    assert len(calls) == before
