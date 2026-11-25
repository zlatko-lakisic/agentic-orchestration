"""MCP ``${VAR}`` substitution: client isolation and secrets kept out of step specs."""

from __future__ import annotations

import json
import os
import stat
import sys
import textwrap
from pathlib import Path

import pytest

from orchestration.backends.base import RunOptions
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.mcp_providers_catalog import (
    defer_process_env_substitution,
    resolve_deferred_mcp_env,
    resolve_workflow_mcp_refs,
    substitute_mcp_env_vars,
    unresolved_env_placeholders,
)
from orchestration.session_env import reset_session_env, set_session_env


def _client_entry(headers: dict[str, str], url: str = "http://127.0.0.1:9000/mcp") -> dict:
    return {"id": "client.x", "streamable_http": {"url": url, "headers": headers}}


@pytest.mark.unit
def test_client_overlay_headers_never_read_process_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """A client-registered MCP must not be able to pull engine secrets into its headers."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-engine-secret")
    monkeypatch.setenv("SECRET_THING", "s3cr3t")

    resolved = resolve_workflow_mcp_refs(
        [_client_entry({"X-Leak": "${OPENAI_API_KEY}", "X-Other": "pre-${SECRET_THING}-post"})],
        [],
    )
    headers = resolved[0]["headers"]
    assert headers["X-Leak"] == ""
    assert headers["X-Other"] == "pre--post"
    assert "sk-engine-secret" not in json.dumps(resolved)
    assert "s3cr3t" not in json.dumps(resolved)


@pytest.mark.unit
def test_client_overlay_headers_use_the_sessions_own_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "process-value")
    token = set_session_env({"TAVILY_API_KEY": "session-value"})
    try:
        resolved = resolve_workflow_mcp_refs(
            [_client_entry({"Authorization": "Bearer ${TAVILY_API_KEY}"})], []
        )
    finally:
        reset_session_env(token)
    assert resolved[0]["headers"]["Authorization"] == "Bearer session-value"


@pytest.mark.unit
def test_client_overlay_url_placeholders_are_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_THING", "s3cr3t")
    with pytest.raises(ValueError, match="placeholders are not allowed"):
        resolve_workflow_mcp_refs(
            [_client_entry({}, url="http://localhost.evil.example/${SECRET_THING}/mcp")], []
        )


@pytest.mark.unit
def test_operator_catalog_entries_still_substitute_process_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HOME_ASSISTANT_TOKEN", "ha-token")
    monkeypatch.setenv("HOME_ASSISTANT_URL", "http://ha.local:8123/")
    resolved = resolve_workflow_mcp_refs(
        [
            {
                "id": "home_assistant",
                "streamable_http": {
                    "url": "${HOME_ASSISTANT_URL}",
                    "headers": {"Authorization": "Bearer ${HOME_ASSISTANT_TOKEN}"},
                },
            }
        ],
        [],
    )
    assert resolved[0]["url"] == "http://ha.local:8123"
    assert resolved[0]["headers"]["Authorization"] == "Bearer ha-token"


@pytest.mark.unit
def test_deferred_resolution_keeps_process_secrets_out_and_worker_resolves(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HOME_ASSISTANT_TOKEN", "ha-token")
    item = {
        "id": "home_assistant",
        "streamable_http": {
            "url": "http://ha.local:8123/mcp/",
            "headers": {"Authorization": "Bearer ${HOME_ASSISTANT_TOKEN}"},
        },
    }
    with defer_process_env_substitution():
        deferred = resolve_workflow_mcp_refs([item], [])
        # Session-supplied values cannot be re-resolved in a worker, so they
        # are still substituted on the coordinator.
        token = set_session_env({"TAVILY_API_KEY": "session-value"})
        try:
            assert substitute_mcp_env_vars("${TAVILY_API_KEY}") == "session-value"
        finally:
            reset_session_env(token)

    assert "ha-token" not in json.dumps(deferred)
    assert deferred[0]["headers"]["Authorization"] == "Bearer ${HOME_ASSISTANT_TOKEN}"

    worker_side = resolve_deferred_mcp_env(deferred[0])
    assert worker_side["headers"]["Authorization"] == "Bearer ha-token"
    assert worker_side["url"] == "http://ha.local:8123/mcp"
    assert unresolved_env_placeholders(deferred[0]) == []

    monkeypatch.delenv("HOME_ASSISTANT_TOKEN")
    assert unresolved_env_placeholders(deferred[0]) == ["HOME_ASSISTANT_TOKEN"]


@pytest.mark.unit
def test_deferred_string_ref_that_resolves_empty_is_dropped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("NOT_SET_ANYWHERE", raising=False)
    assert resolve_deferred_mcp_env("${NOT_SET_ANYWHERE}") is None
    assert resolve_deferred_mcp_env("https://mcp.example/sse") == "https://mcp.example/sse"


_ECHO_MODULE = """
def echo(*, text, context="", mcp_tool_results_or_handles=None):
    return {"text": text, "context": context, "mcp": mcp_tool_results_or_handles}
"""


def _write_echo_module(tmp_path: Path) -> Path:
    mod_dir = tmp_path / "pymods"
    mod_dir.mkdir()
    (mod_dir / "b_e2e_echo_mod.py").write_text(textwrap.dedent(_ECHO_MODULE), encoding="utf-8")
    return mod_dir


def _echo_config(topic: str, mcp_item: dict | None) -> WorkflowConfig:
    return WorkflowConfig(
        name="b-e2e",
        process="sequential",
        topic=topic,
        instance_key="b-e2e",
        agent_providers=[
            {
                "id": "det_echo",
                "type": "deterministic",
                "role": "Echo",
                "goal": "Echo the task",
                "backstory": "Deterministic echo",
                "entrypoint": "b_e2e_echo_mod:echo",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="step_1",
                agent_provider_id="det_echo",
                description="{topic}\n\nEcho it back.",
                expected_output="echo",
                mcp_providers=[mcp_item] if mcp_item else None,
            )
        ],
        task_sequence=["step_1"],
    )


@pytest.mark.unit
@pytest.mark.backend_subprocess
@pytest.mark.timeout(180)
def test_subprocess_backend_end_to_end_without_secrets_in_spec(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Real ``main.py --execute-step`` worker: secret stays out of the spec file,
    the worker resolves it from its own env, and ``{topic}`` is substituted."""
    from orchestration.backends.subprocess_runner import run_config_via_subprocess

    store = tmp_path / "store"
    mod_dir = _write_echo_module(tmp_path)
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(store))
    monkeypatch.setenv("B_E2E_TOKEN", "s3cr3t-e2e-token")
    monkeypatch.setenv(
        "PYTHONPATH",
        os.pathsep.join([str(mod_dir), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
    )
    monkeypatch.delenv("AGENTIC_EXECUTION_QUEUE_ENABLED", raising=False)
    monkeypatch.delenv("AGENTIC_STEP_SPEC_RESOLVE_ENV", raising=False)

    mcp_item = {
        "id": "b_e2e_mcp",
        "streamable_http": {
            "url": "http://127.0.0.1:9/mcp",
            "headers": {"Authorization": "Bearer ${B_E2E_TOKEN}"},
        },
    }
    result = run_config_via_subprocess(
        _echo_config("the quick brown fox", mcp_item),
        options=RunOptions(quiet=True, emit_stdout_summary=False, run_id="b-e2e-run"),
    )
    assert result.exit_code == 0, result.error
    payload = json.loads(result.result_text or "{}")

    # Worker-side: placeholder resolved from the worker's environment.
    assert payload["mcp"][0]["headers"]["Authorization"] == "Bearer s3cr3t-e2e-token"
    # Finding 15: the fast path substitutes the single-brace ``{topic}``.
    assert "the quick brown fox" in payload["text"]
    assert "{topic}" not in payload["text"]

    spec_path = store / "b-e2e-run" / "step_1-spec.json"
    spec_text = spec_path.read_text(encoding="utf-8")
    assert "s3cr3t-e2e-token" not in spec_text
    assert "${B_E2E_TOKEN}" in spec_text

    if sys.platform != "win32":
        assert stat.S_IMODE(spec_path.stat().st_mode) == 0o600
        assert stat.S_IMODE(spec_path.parent.stat().st_mode) == 0o700
        result_path = store / "b-e2e-run" / "step_1" / "result.json"
        assert stat.S_IMODE(result_path.stat().st_mode) == 0o600


@pytest.mark.unit
def test_step_spec_env_escape_hatch_restores_coordinator_resolution(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.workflow_materializer import build_step_specs

    monkeypatch.setenv("B_E2E_TOKEN", "s3cr3t-e2e-token")
    mcp_item = {
        "id": "b_e2e_mcp",
        "streamable_http": {
            "url": "http://127.0.0.1:9/mcp",
            "headers": {"Authorization": "Bearer ${B_E2E_TOKEN}"},
        },
    }
    cfg = _echo_config("t", mcp_item)

    monkeypatch.delenv("AGENTIC_STEP_SPEC_RESOLVE_ENV", raising=False)
    default_spec = build_step_specs(cfg, run_id="r", quiet=True)[0].to_dict()
    assert "s3cr3t-e2e-token" not in json.dumps(default_spec)

    monkeypatch.setenv("AGENTIC_STEP_SPEC_RESOLVE_ENV", "1")
    legacy_spec = build_step_specs(cfg, run_id="r", quiet=True)[0].to_dict()
    assert "s3cr3t-e2e-token" in json.dumps(legacy_spec)
