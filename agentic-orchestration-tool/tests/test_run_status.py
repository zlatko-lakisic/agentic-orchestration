"""Tests for user-facing run status mapping."""

from __future__ import annotations

from orchestration.run_status import (
    PHASE_GENERATING,
    PHASE_PLANNING,
    PHASE_PREEMPTED,
    PHASE_QUEUED,
    PHASE_TOOL,
    PHASE_WARMING_AGENT,
    build_status_event,
    default_message_for_phase,
    is_filtered_progress_line,
    map_progress_line,
)


def test_map_progress_planning_and_agent() -> None:
    assert map_progress_line("planning")["phase"] == PHASE_PLANNING
    warm = map_progress_line("ensuring runtime for gpt_research")
    assert warm["phase"] == PHASE_WARMING_AGENT
    assert warm["agentProviderId"] == "gpt_research"
    assert "gpt research" in warm["message"].lower()
    gen = map_progress_line("generating")
    assert gen["phase"] == PHASE_GENERATING


def test_map_progress_llm_consulting_and_continuing() -> None:
    first = map_progress_line("(llm) consulting qwen3.6:27b")
    assert first["phase"] == PHASE_GENERATING
    assert first["message"] == "Consulting qwen3.6:27b…"
    assert first["model"] == "qwen3.6:27b"
    again = map_progress_line("(llm) continuing qwen3.6:27b")
    assert again["message"] == "Still working with qwen3.6:27b…"


def test_map_progress_tool_lines() -> None:
    term = map_progress_line("(tool) run_terminal_command: git add package.json")
    assert term["phase"] == PHASE_TOOL
    assert term["message"] == "Running: git add package.json"
    read = map_progress_line("(tool) read_file: src/main.py")
    assert read["message"] == "Reading: src/main.py"
    write = map_progress_line("(tool) write_file: README.md")
    assert write["message"] == "Updating: README.md"
    generic = map_progress_line("(tool) search_web: irrigation sensors")
    assert generic["message"] == "Using search_web…"


def test_map_progress_agent_thought_and_action() -> None:
    thought = map_progress_line("(agent) Thought: re-staging after pre-commit hook")
    assert thought["message"].startswith("Thought:")
    assert "pre-commit" in thought["message"]
    action = map_progress_line("(agent) Action: run_terminal_command")
    assert action["message"].startswith("Action:")


def test_map_progress_filters_junk_lines() -> None:
    assert map_progress_line("Model input (qwen3.6:27b): Current Task: <system>…") is None
    assert map_progress_line("payload with <important_rules> inside") is None
    assert map_progress_line("Current Task: <system> you are an agent") is None
    assert is_filtered_progress_line("Model input (x): y") is True


def test_map_progress_ollama_pull_includes_model_and_percent() -> None:
    from orchestration.background_activity import reset_for_tests, observe_progress

    reset_for_tests()
    start = map_progress_line("ollama pull: starting qwen3.6:27b")
    assert start["phase"] == "preparing"
    assert "qwen3.6:27b" in start["message"]
    observe_progress("ollama pull: starting qwen3.6:27b")
    pct = map_progress_line("ollama pull: pulling 83c54730a5fe  84%")
    assert pct["percent"] == 84
    assert "84%" in pct["message"]
    assert "qwen3.6:27b" in pct["message"]
    done = map_progress_line("ollama pull: complete qwen3.6:27b")
    assert done["percent"] == 100
    reset_for_tests()


def test_map_progress_mcp_handshake() -> None:
    mapped = map_progress_line("stdio MCP handshake: filesystem_local")
    assert mapped["phase"] == "preparing"
    assert "filesystem_local" in mapped["message"]


def test_map_progress_plan_and_exec() -> None:
    planned = map_progress_line("plan: Research irrigation options")
    assert planned["phase"] == "planned"
    assert "irrigation" in planned["message"].lower()
    execing = map_progress_line("executing 3 step(s)")
    assert execing["phase"] == "executing"
    assert execing["stepCount"] == 3


def test_build_status_event_shape() -> None:
    ev = build_status_event(
        phase=PHASE_WARMING_AGENT,
        processing=True,
        agent_provider_id="gpt_research",
        question_id="q1",
        run_id="r1",
    )
    assert ev["type"] == "status"
    assert ev["processing"] is True
    assert ev["agentProviderId"] == "gpt_research"
    assert ev["question_id"] == "q1"
    assert ev["run_id"] == "r1"
    assert ev["message"]


def test_map_progress_llm_tool_agent_and_junk() -> None:
    from orchestration.run_status import PHASE_GENERATING, PHASE_TOOL

    assert map_progress_line("Model input (qwen): Current Task: <system>…") is None
    consult = map_progress_line("(llm) consulting qwen3.6:27b")
    assert consult["phase"] == PHASE_GENERATING
    assert consult["message"] == "Consulting qwen3.6:27b…"
    cont = map_progress_line("(llm) continuing qwen3.6:27b")
    assert "Still working with" in cont["message"]
    tool = map_progress_line("(tool) run_terminal_command: git add package.json")
    assert tool["phase"] == PHASE_TOOL
    assert "git add package.json" in tool["message"]
    thought = map_progress_line("(agent) Thought: re-staging package.json")
    assert thought["message"].startswith("Thought:")
    action = map_progress_line("(agent) Action: git commit -m fix")
    assert action["message"].startswith("Action:")


def test_phase_queued_message_interpolation() -> None:
    msg = default_message_for_phase(PHASE_QUEUED, queue_position=2, queue_length=5)
    assert "2" in msg and "5" in msg
    ev = build_status_event(
        phase=PHASE_QUEUED,
        processing=True,
        extra={"queuePhase": "planning", "queuePosition": 2, "queueLength": 5},
    )
    assert ev["phase"] == PHASE_QUEUED
    assert ev["queuePosition"] == 2
    preempt = build_status_event(phase=PHASE_PREEMPTED, processing=False)
    assert preempt["phase"] == PHASE_PREEMPTED
