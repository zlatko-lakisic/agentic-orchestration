from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.llm_usage import (
    normalize_ollama_chat_payload,
    normalize_openai_usage,
    record_llm_usage,
    read_llm_usage_rows,
    summarize_llm_usage,
    usage_context,
)
from orchestration.run_trace import (
    append_run_event,
    build_run_trace_payload,
    events_to_mermaid,
    list_recent_trace_runs,
    read_run_events,
    trace_duration_ms,
    trace_instrumentation,
)


@pytest.mark.unit
def test_append_and_read_run_events(tmp_path: Path) -> None:
    append_run_event(tmp_path, "runabc", "request_start", actor="engine", message="hi")
    append_run_event(
        tmp_path,
        "runabc",
        "plan",
        actor="planner",
        message="two steps",
        detail={"agents": ["a1"], "mcps": ["m1"], "skills": ["s1"]},
    )
    append_run_event(tmp_path, "runabc", "run_end", actor="orchestrator", message="ok")
    events = read_run_events(tmp_path, "runabc")
    assert len(events) == 3
    assert events[0]["kind"] == "request_start"
    assert events[1]["detail"]["agents"] == ["a1"]
    mermaid = events_to_mermaid(events)
    assert "sequenceDiagram" in mermaid
    assert "planner" in mermaid
    assert "orchestrator" in mermaid  # touched via run_end
    assert "->>" in mermaid
    assert "-->>" in mermaid  # synthesized select/plan returns + run_end
    assert "select" in mermaid
    listed = list_recent_trace_runs(tmp_path, limit=10)
    assert listed and listed[0]["runId"] == "runabc"
    assert listed[0]["durationMs"] is not None


@pytest.mark.unit
def test_mermaid_omits_unused_orchestrator_and_truncates_labels(tmp_path: Path) -> None:
    append_run_event(
        tmp_path,
        "r2",
        "request_start",
        actor="engine",
        message="direct_agent",
        detail={"mode": "direct_agent", "preview": "x" * 200},
    )
    append_run_event(tmp_path, "r2", "run_end", actor="engine", message="ok")
    mermaid = events_to_mermaid(read_run_events(tmp_path, "r2"))
    assert "participant orchestrator" not in mermaid
    assert "direct_agent" in mermaid
    assert "x" * 50 not in mermaid
    info = trace_instrumentation(read_run_events(tmp_path, "r2"))
    assert info["present"]["runBoundary"] is True
    assert info["present"]["planner"] is False
    assert "planner" in info["missing"]
    assert trace_duration_ms(read_run_events(tmp_path, "r2")) is not None


@pytest.mark.unit
def test_identity_filter_and_token_sum(tmp_path: Path) -> None:
    append_run_event(
        tmp_path,
        "id1",
        "request_start",
        actor="engine",
        detail={
            "mode": "chat",
            "client_ip": "10.0.0.9",
            "app_id": "ao-web",
            "user_name": "Ada",
            "user_id": "ada",
        },
    )
    append_run_event(
        tmp_path,
        "id1",
        "model_call",
        actor="planner",
        detail={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
    )
    append_run_event(tmp_path, "id1", "run_end", actor="engine", message="ok")
    append_run_event(
        tmp_path,
        "other",
        "request_start",
        actor="engine",
        detail={"client_ip": "10.0.0.1", "app_id": "other"},
    )
    hits = list_recent_trace_runs(tmp_path, limit=10, client="Ada", client_ip="10.0.0.9")
    assert len(hits) == 1
    assert hits[0]["runId"] == "id1"
    assert hits[0]["totalTokens"] == 15
    assert hits[0]["appId"] == "ao-web"
    miss = list_recent_trace_runs(tmp_path, limit=10, client="Ada", client_ip="9.9.9.9")
    assert miss == []


@pytest.mark.unit
def test_decision_and_depth_payload(tmp_path: Path) -> None:
    append_run_event(tmp_path, "d1", "request_start", actor="engine", detail={"mode": "chat"})
    append_run_event(tmp_path, "d1", "plan", actor="planner", message="plan")
    append_run_event(
        tmp_path,
        "d1",
        "decision",
        actor="orchestrator",
        message="choose agents",
        detail={"reason": "choose agents", "agents": ["a"]},
    )
    append_run_event(tmp_path, "d1", "step_start", actor="inprocess")
    append_run_event(tmp_path, "d1", "tool_call", actor="tool", detail={"name": "fetch", "phase": "start"})
    append_run_event(tmp_path, "d1", "run_end", actor="engine", message="ok")
    all_payload = build_run_trace_payload(tmp_path, "d1", depth="all")
    assert all_payload and all_payload["eventCount"] == 6
    assert "decision" in all_payload["mermaid"]
    decisions = build_run_trace_payload(tmp_path, "d1", depth="decisions")
    assert decisions and all(e["kind"] in {"request_start", "run_end", "run_error", "plan", "decision"} for e in decisions["events"])
    tools = build_run_trace_payload(tmp_path, "d1", depth="tools")
    assert tools and any(e["kind"] == "tool_call" for e in tools["events"])


@pytest.mark.unit
def test_llm_usage_normalize_and_ledger(tmp_path: Path) -> None:
    assert normalize_openai_usage({"prompt_tokens": 3, "completion_tokens": 2})["total_tokens"] == 5
    assert normalize_ollama_chat_payload({"prompt_eval_count": 7, "eval_count": 4})["total_tokens"] == 11
    with usage_context(tool_root=tmp_path, run_id="u1", app_id="app", client_ip="1.2.3.4", user_id="u"):
        record_llm_usage(
            source="planner",
            model="ollama/x",
            prompt_tokens=7,
            completion_tokens=4,
            total_tokens=11,
            ok=True,
        )
    rows = read_llm_usage_rows(tmp_path)
    assert len(rows) == 1
    assert rows[0]["appId"] == "app"
    summary = summarize_llm_usage(rows)
    assert summary["grandTotal"]["totalTokens"] == 11
    assert summary["byAppId"][0]["key"] == "app"
    events = read_run_events(tmp_path, "u1")
    assert any(e.get("kind") == "model_call" for e in events)


@pytest.mark.unit
def test_resolve_product_app_id_prefers_refined_identity() -> None:
    from orchestration.llm_usage import resolve_product_app_id

    assert resolve_product_app_id("comstar", "comstar-ai", "comstar-ai") == "comstar-ai"
    assert resolve_product_app_id("comstar-ha", "comstar-ha", "comstar-ha") == "comstar-ha"
    assert resolve_product_app_id("ao-chat", "None Administrator", "x") == "ao-chat"
    assert resolve_product_app_id("", "knowbuddy", "knowbuddy") == "knowbuddy"


@pytest.mark.unit
def test_extract_crew_token_usage_ignores_empty_metrics() -> None:
    from types import SimpleNamespace

    from orchestration.llm_usage import extract_crew_token_usage, record_crew_result_usage

    empty = SimpleNamespace(
        token_usage=SimpleNamespace(
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            successful_requests=0,
        )
    )
    assert extract_crew_token_usage(empty)["total_tokens"] is None
    assert record_crew_result_usage(empty) is False

    filled = SimpleNamespace(
        token_usage={
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "total_tokens": 15,
            "successful_requests": 1,
        }
    )
    assert extract_crew_token_usage(filled)["total_tokens"] == 15


@pytest.mark.unit
def test_crew_log_and_dynamic_planning_flags(tmp_path: Path) -> None:
    append_run_event(
        tmp_path,
        "dyn1",
        "request_start",
        actor="engine",
        message="chat",
        detail={
            "mode": "chat",
            "runMode": "dynamic",
            "dynamicPlanning": True,
            "app_id": "comstar",
        },
    )
    append_run_event(
        tmp_path,
        "dyn1",
        "decision",
        actor="orchestrator",
        message="one step",
        detail={
            "dynamicPlanning": True,
            "steps": [
                {
                    "id": "step_1",
                    "agent_provider_id": "gpt_research",
                    "mcps": ["web_search"],
                    "skills": ["cite"],
                    "rag": [],
                    "harness": "research",
                }
            ],
        },
    )
    append_run_event(tmp_path, "dyn1", "run_end", actor="engine", message="ok")
    payload = build_run_trace_payload(tmp_path, "dyn1")
    assert payload is not None
    assert payload["dynamicPlanning"] is True
    assert payload["runMode"] == "dynamic"
    assert payload["crewLog"][0]["agentProviderId"] == "gpt_research"
    assert payload["crewLog"][0]["mcps"] == ["web_search"]
    assert payload["crewLog"][0]["harness"] == "research"
    mermaid = payload["mermaid"]
    assert "gpt_research" in mermaid
    assert "harness" in mermaid
    listed = list_recent_trace_runs(tmp_path, limit=5)
    assert listed[0]["dynamicPlanning"] is True
    assert listed[0]["runMode"] == "dynamic"
