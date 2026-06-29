from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from orchestration.backends.kubernetes_delegation import (
    DelegationRequest,
    child_step_id_for_request,
    claim_next_delegation_request,
    delegation_enabled_from_env,
    run_delegation_broker_loop,
    submit_delegation_request,
)


@pytest.mark.unit
def test_delegation_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_K8S_DELEGATION_ENABLED", raising=False)
    assert delegation_enabled_from_env() is False


@pytest.mark.unit
def test_child_step_id_for_request() -> None:
    assert child_step_id_for_request("abcdef0123456789") == "delegate-abcdef012345"


@pytest.mark.unit
def test_delegation_inline_roundtrip(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_DELEGATION_INLINE", "1")

    def _fake_execute(spec_path: Path) -> int:
        data = json.loads(spec_path.read_text(encoding="utf-8"))
        result_path = (
            tmp_path / data["run_id"] / data["step_id"] / "result.json"
        )
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(
            json.dumps(
                {
                    "exit_code": 0,
                    "result_text": "delegated answer",
                    "error": None,
                }
            ),
            encoding="utf-8",
        )
        return 0

    with patch(
        "orchestration.backends.kubernetes_delegation._run_child_step_inline",
        side_effect=_fake_execute,
    ):
        response = submit_delegation_request(
            run_store_mount=str(tmp_path),
            parent_run_id="run-parent",
            parent_step_id="parent-step",
            agent_provider={"id": "gpt_write", "type": "openai", "model": "gpt-4o-mini"},
            task_description="Summarize topic",
            task_expected_output="One sentence",
            topic="test topic",
            timeout_seconds=10,
        )

    assert response.succeeded
    assert response.result_text == "delegated answer"


@pytest.mark.unit
def test_claim_next_delegation_request(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HOSTNAME", "broker-pod")
    mount = str(tmp_path)
    req = DelegationRequest(
        request_id="req123456789",
        parent_run_id="run1",
        parent_step_id="s1",
        agent_provider={"id": "a"},
        task_description="d",
        task_expected_output="o",
        topic="t",
        mcp_providers=[],
        enqueued_at=0.0,
    )
    queue = tmp_path / "delegation" / "queue"
    queue.mkdir(parents=True)
    path = queue / "req123456789.json"
    path.write_text(json.dumps(req.to_dict()), encoding="utf-8")

    claimed = claim_next_delegation_request(mount)
    assert claimed is not None
    claimed_path, parsed = claimed
    assert parsed.request_id == "req123456789"
    assert not path.is_file()
    claimed_path.unlink()


@pytest.mark.unit
def test_broker_loop_processes_one_request(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_K8S_DELEGATION_INLINE", "1")
    mount = str(tmp_path)
    req = DelegationRequest(
        request_id="brokerreq0001",
        parent_run_id="run-b",
        parent_step_id="step-b",
        agent_provider={"id": "gpt_write", "type": "openai", "model": "gpt-4o-mini"},
        task_description="do work",
        task_expected_output="done",
        topic="topic",
        mcp_providers=[],
        enqueued_at=0.0,
    )
    queue = tmp_path / "delegation" / "queue"
    queue.mkdir(parents=True)
    (queue / "brokerreq0001.json").write_text(json.dumps(req.to_dict()), encoding="utf-8")

    def _fake_execute(spec_path: Path) -> int:
        data = json.loads(spec_path.read_text(encoding="utf-8"))
        result_path = tmp_path / data["run_id"] / data["step_id"] / "result.json"
        result_path.parent.mkdir(parents=True, exist_ok=True)
        result_path.write_text(
            json.dumps({"exit_code": 0, "result_text": "from broker", "error": None}),
            encoding="utf-8",
        )
        return 0

    with patch(
        "orchestration.backends.kubernetes_delegation._run_child_step_inline",
        side_effect=_fake_execute,
    ):
        with patch(
            "orchestration.backends.kubernetes_delegation.time.sleep",
            side_effect=KeyboardInterrupt,
        ):
            with pytest.raises(KeyboardInterrupt):
                run_delegation_broker_loop(run_store_mount=mount, poll_interval=0.01)

    resp_path = tmp_path / "delegation" / "responses" / "brokerreq0001.json"
    assert resp_path.is_file()
    data = json.loads(resp_path.read_text(encoding="utf-8"))
    assert data["succeeded"] is True
    assert data["result_text"] == "from broker"
