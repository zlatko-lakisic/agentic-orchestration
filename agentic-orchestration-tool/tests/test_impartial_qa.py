from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from orchestration.impartial_qa import (
    ImpartialQAReport,
    emit_impartial_qa_report,
    finalize_impartial_qa,
    impartial_qa_enabled,
    impartial_qa_fail_enabled,
    impartial_qa_gate_failed,
    load_impartial_qa_config_from_env,
    run_impartial_qa,
    write_impartial_qa_json,
)

_GOOD_OUTPUT = (
    "Recommendation: run the index on the edge device.\n"
    "- Latency stays under 50 ms for local queries.\n"
    "- The cluster keeps a nightly replica for durability.\n"
)


def _stub_eval(monkeypatch: pytest.MonkeyPatch, payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Replace the LLM judge with a recorder; returns the list of captured call kwargs."""
    calls: list[dict[str, Any]] = []

    def fake(*, user_goal: str, output_text: str, model: str | None = None) -> dict[str, Any]:
        calls.append({"user_goal": user_goal, "output_text": output_text, "model": model})
        return dict(payload)

    monkeypatch.setattr("orchestration.dynamic_planner.evaluate_run_quality", fake)
    return calls


def _stub_faithfulness(
    monkeypatch: pytest.MonkeyPatch,
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []

    def fake(*, user_goal: str, output_text: str, model: str | None = None) -> dict[str, Any]:
        calls.append({"user_goal": user_goal, "output_text": output_text, "model": model})
        return dict(payload)

    monkeypatch.setattr("orchestration.dynamic_planner.faithfulness_qa_review", fake)
    return calls


def test_passes_when_assertions_and_score_are_good(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_eval(monkeypatch, {"score": 0.82, "verdict": "solid answer"})

    report = run_impartial_qa(
        user_goal="Where should the RAG index live?",
        output_text=_GOOD_OUTPUT,
        assertions=[{"type": "min_chars", "value": 20}, {"type": "bullet_count", "min": 2}],
        min_score=0.5,
        include_faithfulness=False,
    )

    assert report.passed is True
    assert report.skipped is False
    assert report.score == pytest.approx(0.82)
    assert report.verdict == "solid answer"
    assert [a["pass"] for a in report.assertion_results] == [True, True]
    assert report.reasons == []
    assert report.faithfulness is None


def test_fails_on_assertion_even_with_high_score(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_eval(monkeypatch, {"score": 0.95, "verdict": "great"})

    report = run_impartial_qa(
        user_goal="Where should the RAG index live?",
        output_text=_GOOD_OUTPUT,
        assertions=[{"type": "min_chars", "value": 100000}],
        min_score=0.5,
        include_faithfulness=False,
    )

    assert report.passed is False
    assert report.score == pytest.approx(0.95)
    assert any("min_chars" in r for r in report.reasons)


def test_fails_when_score_below_min(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_eval(monkeypatch, {"score": 0.2, "verdict": "thin"})

    report = run_impartial_qa(
        user_goal="Where should the RAG index live?",
        output_text=_GOOD_OUTPUT,
        assertions=[{"type": "min_chars", "value": 10}],
        min_score=0.6,
        include_faithfulness=False,
    )

    assert report.passed is False
    assert any("below minimum" in r for r in report.reasons)
    assert "thin" in report.verdict


def test_missing_judge_score_does_not_fail_the_gate(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_eval(monkeypatch, {"score": None, "verdict": "disabled"})

    report = run_impartial_qa(
        user_goal="goal",
        output_text=_GOOD_OUTPUT,
        assertions=[{"type": "min_chars", "value": 10}],
        min_score=0.5,
        include_faithfulness=False,
    )

    assert report.passed is True
    assert report.skipped is False
    assert report.score is None
    assert any("unavailable" in r for r in report.reasons)


def test_soft_skips_when_no_reviewer_produced_a_result(monkeypatch: pytest.MonkeyPatch) -> None:
    """The Jetson case: AGENTIC_LEARNING_EVAL=0 + AGENTIC_FINAL_QA=0 and no assertions."""
    _stub_eval(monkeypatch, {"score": None, "verdict": "disabled"})
    _stub_faithfulness(monkeypatch, {"skipped": True})

    report = run_impartial_qa(user_goal="goal", output_text=_GOOD_OUTPUT)

    assert report.skipped is True
    assert report.passed is True
    assert "no reviewer" in report.verdict


def test_judge_exception_is_contained(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(**_kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("model down")

    monkeypatch.setattr("orchestration.dynamic_planner.evaluate_run_quality", boom)

    report = run_impartial_qa(
        user_goal="goal",
        output_text=_GOOD_OUTPUT,
        min_score=0.5,
        include_faithfulness=False,
    )

    assert report.passed is True
    assert "model down" in json.dumps(report.eval)
    assert report.skipped is True


def test_skipped_when_eval_off_and_no_assertions(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_EVAL", "0")

    def boom(**_kwargs: Any) -> dict[str, Any]:
        raise AssertionError("judge must not be called when the gate is skipped")

    monkeypatch.setattr("orchestration.dynamic_planner.evaluate_run_quality", boom)
    monkeypatch.setattr("orchestration.dynamic_planner.faithfulness_qa_review", boom)

    report = run_impartial_qa(user_goal="goal", output_text=_GOOD_OUTPUT)

    assert report.skipped is True
    assert report.passed is True
    assert report.eval is None


def test_assertions_only_when_eval_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_EVAL", "0")

    def boom(**_kwargs: Any) -> dict[str, Any]:
        raise AssertionError("judge must not be called with AGENTIC_IMPARTIAL_QA_EVAL=0")

    monkeypatch.setattr("orchestration.dynamic_planner.evaluate_run_quality", boom)

    report = run_impartial_qa(
        user_goal="goal",
        output_text=_GOOD_OUTPUT,
        assertions=[{"type": "contains_any", "values": ["latency"]}],
        include_faithfulness=False,
    )

    assert report.skipped is False
    assert report.passed is True
    assert report.eval is None
    assert report.score is None


def test_empty_output_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(**_kwargs: Any) -> dict[str, Any]:
        raise AssertionError("judge must not be called for an empty deliverable")

    monkeypatch.setattr("orchestration.dynamic_planner.evaluate_run_quality", boom)

    report = run_impartial_qa(user_goal="goal", output_text="   ")

    assert report.passed is False
    assert report.reasons == ["final output is empty"]


def test_rubric_is_appended_to_the_goal(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _stub_eval(monkeypatch, {"score": 0.9, "verdict": "ok"})

    run_impartial_qa(
        user_goal="Pick a database",
        output_text=_GOOD_OUTPUT,
        rubric="Must name a concrete product.",
        include_faithfulness=False,
    )

    assert calls[0]["user_goal"] == "Pick a database\n\nRubric:\nMust name a concrete product."


def test_high_hallucination_risk_fails_the_gate_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL", raising=False)
    _stub_eval(monkeypatch, {"score": 0.9, "verdict": "ok"})
    _stub_faithfulness(monkeypatch, {"hallucination_risk": "high", "verdict": "invented numbers"})

    report = run_impartial_qa(
        user_goal="goal",
        output_text=_GOOD_OUTPUT,
        include_faithfulness=True,
    )

    assert report.passed is False
    assert any("hallucination" in r for r in report.reasons)
    assert report.faithfulness is not None
    assert report.faithfulness["hallucination_risk"] == "high"


def test_faithfulness_fail_can_be_opted_out(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL", "0")
    _stub_eval(monkeypatch, {"score": 0.9, "verdict": "ok"})
    _stub_faithfulness(monkeypatch, {"hallucination_risk": "high", "verdict": "invented numbers"})

    report = run_impartial_qa(
        user_goal="goal",
        output_text=_GOOD_OUTPUT,
        include_faithfulness=True,
    )

    assert report.passed is True
    assert report.faithfulness is not None
    assert report.reasons == []


def test_medium_hallucination_risk_never_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_eval(monkeypatch, {"score": 0.9, "verdict": "ok"})
    _stub_faithfulness(monkeypatch, {"hallucination_risk": "medium", "verdict": "verify the numbers"})

    report = run_impartial_qa(user_goal="goal", output_text=_GOOD_OUTPUT)

    assert report.passed is True
    assert report.reasons == []


def test_skipped_faithfulness_is_not_stored(monkeypatch: pytest.MonkeyPatch) -> None:
    _stub_eval(monkeypatch, {"score": 0.9, "verdict": "ok"})
    _stub_faithfulness(monkeypatch, {"skipped": True})

    report = run_impartial_qa(user_goal="goal", output_text=_GOOD_OUTPUT)

    assert report.faithfulness is None
    assert report.passed is True


def test_gate_is_on_but_advisory_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_IMPARTIAL_QA", raising=False)
    monkeypatch.delenv("AGENTIC_IMPARTIAL_QA_FAIL", raising=False)

    assert impartial_qa_enabled() is True
    assert impartial_qa_fail_enabled() is False

    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA", "0")
    assert impartial_qa_enabled() is False
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA", "off")
    assert impartial_qa_enabled() is False
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA", "1")
    assert impartial_qa_enabled() is True

    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_FAIL", "1")
    assert impartial_qa_fail_enabled() is True


def test_gate_failed_helper_respects_the_fail_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    failing = ImpartialQAReport(passed=False, reasons=["too thin"])

    monkeypatch.delenv("AGENTIC_IMPARTIAL_QA_FAIL", raising=False)
    assert impartial_qa_gate_failed(failing) is False
    assert impartial_qa_gate_failed(None) is False

    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_FAIL", "1")
    assert impartial_qa_gate_failed(failing) is True
    assert impartial_qa_gate_failed(None) is False
    assert impartial_qa_gate_failed(ImpartialQAReport(passed=True)) is False
    assert impartial_qa_gate_failed(ImpartialQAReport(passed=False, skipped=True)) is False


def test_finalize_runs_reports_and_persists(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.delenv("AGENTIC_IMPARTIAL_QA", raising=False)
    _stub_eval(monkeypatch, {"score": 0.77, "verdict": "solid"})
    _stub_faithfulness(monkeypatch, {"hallucination_risk": "low", "verdict": "grounded"})

    report = finalize_impartial_qa(
        tool_root=tmp_path,
        session_slug="society-panel",
        user_goal="Where should the RAG index live?",
        output_text=_GOOD_OUTPUT,
    )

    assert report is not None and report.passed is True
    assert "=== Impartial QA (unified gate) ===" in capsys.readouterr().err
    written = list((tmp_path / "__orchestrator_sessions__" / "impartial_qa").glob("*.json"))
    assert len(written) == 1
    assert written[0].name.startswith("society-panel-")


def test_finalize_returns_none_when_disabled(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA", "0")

    def boom(**_kwargs: Any) -> dict[str, Any]:
        raise AssertionError("no reviewer may run with AGENTIC_IMPARTIAL_QA=0")

    monkeypatch.setattr("orchestration.dynamic_planner.evaluate_run_quality", boom)

    assert (
        finalize_impartial_qa(
            tool_root=tmp_path,
            session_slug="run",
            user_goal="goal",
            output_text=_GOOD_OUTPUT,
        )
        is None
    )
    assert not (tmp_path / "__orchestrator_sessions__").exists()


def test_config_from_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    rubric_file = tmp_path / "rubric.md"
    rubric_file.write_text("Be concrete.", encoding="utf-8")
    assertions_file = tmp_path / "assertions.json"
    assertions_file.write_text(json.dumps([{"type": "min_chars", "value": 40}]), encoding="utf-8")

    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_RUBRIC_FILE", str(rubric_file))
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE", str(assertions_file))
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_MIN_SCORE", "0.75")
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_MODEL", "openai/gpt-4o-mini")
    monkeypatch.setenv("AGENTIC_REPLY_LOCALE", "auto")

    cfg = load_impartial_qa_config_from_env()

    assert cfg["rubric"] == "Be concrete."
    assert cfg["assertions"] == [{"type": "min_chars", "value": 40}]
    assert cfg["min_score"] == pytest.approx(0.75)
    assert cfg["include_faithfulness"] is True
    assert cfg["model"] == "openai/gpt-4o-mini"


def test_config_defaults_are_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "AGENTIC_IMPARTIAL_QA_RUBRIC",
        "AGENTIC_IMPARTIAL_QA_RUBRIC_FILE",
        "AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE",
        "AGENTIC_IMPARTIAL_QA_MIN_SCORE",
        "AGENTIC_IMPARTIAL_QA_MODEL",
        "AGENTIC_IMPARTIAL_QA_FAITHFULNESS",
        "AGENTIC_REPLY_LOCALE",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("AGENTIC_REPLY_LOCALE", "auto")

    cfg = load_impartial_qa_config_from_env()

    assert cfg == {
        "assertions": [],
        "rubric": None,
        "min_score": 0.5,
        "include_faithfulness": True,
        "model": None,
    }


def test_config_merges_default_cjk_assertion(monkeypatch: pytest.MonkeyPatch) -> None:
    from orchestration.language_policy import FORBIDDEN_CJK_ASSERTION

    for name in (
        "AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE",
        "AGENTIC_REPLY_LOCALE",
    ):
        monkeypatch.delenv(name, raising=False)

    cfg = load_impartial_qa_config_from_env()
    assert FORBIDDEN_CJK_ASSERTION in cfg["assertions"]


def test_config_survives_a_bad_assertions_file(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE", str(bad))
    monkeypatch.setenv("AGENTIC_IMPARTIAL_QA_MIN_SCORE", "not-a-number")
    monkeypatch.setenv("AGENTIC_REPLY_LOCALE", "auto")

    cfg = load_impartial_qa_config_from_env()

    assert cfg["assertions"] == []
    assert cfg["min_score"] == pytest.approx(0.5)


def test_write_report_json(tmp_path: Path) -> None:
    report = ImpartialQAReport(passed=False, score=0.3, min_score=0.5, reasons=["too thin"])

    path = write_impartial_qa_json(tmp_path, report, session_slug="web/../weird slug")

    assert path.parent == (tmp_path / "__orchestrator_sessions__" / "impartial_qa").resolve()
    assert ".." not in path.name
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["passed"] is False
    assert data["score"] == pytest.approx(0.3)
    assert data["reasons"] == ["too thin"]


def test_emit_report_block(capsys: pytest.CaptureFixture[str]) -> None:
    report = ImpartialQAReport(
        passed=False,
        score=0.31,
        min_score=0.5,
        assertion_results=[{"name": "min_chars", "pass": False, "detail": "len=3 need>=100"}],
        faithfulness={"hallucination_risk": "medium", "verdict": "check the numbers"},
        verdict="quality bar not met",
        reasons=["score 0.31 below minimum 0.50"],
    )

    emit_impartial_qa_report(report)
    err = capsys.readouterr().err

    assert "=== Impartial QA (unified gate) ===" in err
    assert "Result: FAIL" in err
    assert "Score: 0.31 (minimum 0.50)" in err
    assert "[FAIL] min_chars" in err
    assert "Faithfulness risk: medium" in err
    assert "=== End impartial QA ===" in err


def test_emit_skipped_report_is_one_line(capsys: pytest.CaptureFixture[str]) -> None:
    emit_impartial_qa_report(ImpartialQAReport(skipped=True, verdict="skipped: nothing to check"))
    err = capsys.readouterr().err

    assert err.strip() == "(impartial-qa) skipped: nothing to check"
    assert "Impartial QA (unified gate)" not in err
