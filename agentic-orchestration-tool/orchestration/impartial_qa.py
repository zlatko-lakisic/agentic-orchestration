"""
Unified impartial QA gate (v1).

Scores a *finished* deliverable — the user goal plus the final output text — in one pass by
combining three mechanisms that already exist in the codebase:

* deterministic harness assertions (``agent_harness.run_assertions``),
* the LLM-as-judge score (``dynamic_planner.evaluate_run_quality``, with an optional rubric
  appended to the goal exactly like harness L3 capability scoring), and
* the faithfulness / hallucination review (``dynamic_planner.faithfulness_qa_review``), whose
  ``high`` risk verdict also fails the report unless
  ``AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL=0``.

Nothing is re-executed: this reads the deliverable that was already produced.

The gate is **on by default in advisory mode**: it runs after ``--dynamic``,
``--dynamic-iterative``, ``--society`` and routed static workflows, prints its report, and stores
it, but a failing report does *not* change the exit code unless ``AGENTIC_IMPARTIAL_QA_FAIL=1``.
Set ``AGENTIC_IMPARTIAL_QA=0`` to switch it off entirely. When neither a reviewer nor an assertion
can run (for example the Jetson env sets ``AGENTIC_LEARNING_EVAL=0`` and ``AGENTIC_FINAL_QA=0``),
the gate reports itself as skipped instead of failing.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SESSION_DIR_NAME = "__orchestrator_sessions__"
IMPARTIAL_QA_DIR_NAME = "impartial_qa"

DEFAULT_MIN_SCORE = 0.5

_TRUTHY = ("1", "true", "yes", "on")
_FALSY = ("0", "false", "no", "off")


@dataclass
class ImpartialQAReport:
    """Outcome of one impartial QA pass over a finished deliverable."""

    passed: bool = True
    skipped: bool = False
    score: float | None = None
    min_score: float = DEFAULT_MIN_SCORE
    assertion_results: list[dict[str, Any]] = field(default_factory=list)
    eval: dict[str, Any] | None = None
    faithfulness: dict[str, Any] | None = None
    verdict: str = ""
    reasons: list[str] = field(default_factory=list)
    timestamp: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _env_flag(name: str, *, default: bool) -> bool:
    raw = _env(name).lower()
    if raw in _TRUTHY:
        return True
    if raw in _FALSY:
        return False
    return default


def impartial_qa_enabled() -> bool:
    """True when the unified gate should run at all (``AGENTIC_IMPARTIAL_QA``, default on)."""
    return _env_flag("AGENTIC_IMPARTIAL_QA", default=True)


def impartial_qa_fail_enabled() -> bool:
    """
    True when a failed gate should make the run exit non-zero (``AGENTIC_IMPARTIAL_QA_FAIL``).

    Default off: the gate is advisory so a low score never breaks a production run on its own.
    """
    return _env_flag("AGENTIC_IMPARTIAL_QA_FAIL", default=False)


def _eval_enabled() -> bool:
    return _env_flag("AGENTIC_IMPARTIAL_QA_EVAL", default=True)


def _faithfulness_can_fail() -> bool:
    """A ``high`` hallucination risk marks the report failed (default on; ``=0`` opts out)."""
    return _env_flag("AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL", default=True)


def _min_score_from_env() -> float:
    raw = _env("AGENTIC_IMPARTIAL_QA_MIN_SCORE")
    if not raw:
        return DEFAULT_MIN_SCORE
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_MIN_SCORE
    return max(0.0, min(1.0, value))


def _rubric_from_env() -> str | None:
    inline = _env("AGENTIC_IMPARTIAL_QA_RUBRIC")
    if inline:
        return inline
    path_raw = _env("AGENTIC_IMPARTIAL_QA_RUBRIC_FILE")
    if not path_raw:
        return None
    try:
        text = Path(path_raw).expanduser().read_text(encoding="utf-8").strip()
    except OSError as exc:
        print(f"(impartial-qa) rubric file unreadable ({path_raw}): {exc}", file=sys.stderr, flush=True)
        return None
    return text or None


def _assertions_from_env() -> list[Any]:
    path_raw = _env("AGENTIC_IMPARTIAL_QA_ASSERTIONS_FILE")
    if not path_raw:
        return []
    try:
        raw = Path(path_raw).expanduser().read_text(encoding="utf-8")
        data = json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        print(
            f"(impartial-qa) assertions file unusable ({path_raw}): {exc}",
            file=sys.stderr,
            flush=True,
        )
        return []
    if isinstance(data, dict):
        data = data.get("assertions")
    if not isinstance(data, list):
        print(
            f"(impartial-qa) assertions file must hold a JSON list ({path_raw})",
            file=sys.stderr,
            flush=True,
        )
        return []
    return list(data)


def _model_from_env() -> str | None:
    # Empty means "let each reviewer resolve its own chain" (AGENTIC_EVAL_MODEL for the judge,
    # AGENTIC_QA_MODEL for faithfulness, then the planner default).
    return _env("AGENTIC_IMPARTIAL_QA_MODEL") or None


def load_impartial_qa_config_from_env() -> dict[str, Any]:
    """Keyword arguments for :func:`run_impartial_qa`, resolved from the environment."""
    return {
        "assertions": _assertions_from_env(),
        "rubric": _rubric_from_env(),
        "min_score": _min_score_from_env(),
        "include_faithfulness": _env_flag("AGENTIC_IMPARTIAL_QA_FAITHFULNESS", default=True),
        "model": _model_from_env(),
    }


def _goal_with_rubric(user_goal: str, rubric: str | None) -> str:
    goal = (user_goal or "").strip()
    text = (rubric or "").strip()
    if not text:
        return goal
    return f"{goal}\n\nRubric:\n{text}"


def run_impartial_qa(
    *,
    user_goal: str,
    output_text: str,
    assertions: list[Any] | None = None,
    rubric: str | None = None,
    min_score: float = DEFAULT_MIN_SCORE,
    include_faithfulness: bool = True,
    model: str | None = None,
) -> ImpartialQAReport:
    """
    Score a finished deliverable as one pass/fail gate.

    Never re-runs crews or tools — it only judges ``output_text`` against ``user_goal``.
    """
    from orchestration.agent_harness import run_assertions

    checks = list(assertions or [])
    eval_on = _eval_enabled()
    report = ImpartialQAReport(
        min_score=min_score,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    if not checks and not eval_on:
        report.skipped = True
        report.verdict = "skipped: no assertions configured and the LLM judge is disabled"
        return report

    text = (output_text or "").strip()
    if not text:
        report.passed = False
        report.verdict = "empty deliverable"
        report.reasons.append("final output is empty")
        return report

    if checks:
        ok, results = run_assertions(text, checks)
        report.assertion_results = results
        if not ok:
            report.passed = False
            for item in results:
                if item.get("pass"):
                    continue
                name = str(item.get("name") or item.get("type") or "assertion")
                detail = str(item.get("detail") or "").strip()
                report.reasons.append(f"assertion {name} failed" + (f" ({detail})" if detail else ""))

    if eval_on:
        data = _safe_evaluate(
            user_goal=_goal_with_rubric(user_goal, rubric),
            output_text=text,
            model=model,
        )
        report.eval = data
        raw_score = data.get("score") if isinstance(data, dict) else None
        if isinstance(raw_score, (int, float)) and not isinstance(raw_score, bool):
            report.score = float(raw_score)
            if report.score < min_score:
                report.passed = False
                report.reasons.append(f"score {report.score:.2f} below minimum {min_score:.2f}")
        else:
            # A disabled or malformed judge must not fail a run on its own.
            verdict = str(data.get("verdict", "")).strip() if isinstance(data, dict) else ""
            report.reasons.append(f"judge score unavailable ({verdict or 'no score'})")

    if include_faithfulness:
        data = _safe_faithfulness(user_goal=user_goal, output_text=text, model=model)
        if isinstance(data, dict) and not data.get("skipped"):
            report.faithfulness = data
            risk = str(data.get("hallucination_risk", "")).strip().lower()
            if risk == "high" and _faithfulness_can_fail():
                report.passed = False
                report.reasons.append("faithfulness review reported high hallucination risk")

    if _nothing_was_checked(report):
        # Every reviewer opted out at runtime (e.g. AGENTIC_LEARNING_EVAL=0 plus
        # AGENTIC_FINAL_QA=0 on the Jetson) and there are no assertions, so there is no
        # evidence to gate on. Soft-skip rather than claim a pass.
        report.skipped = True
        report.verdict = "skipped: no assertions and no reviewer produced a result"
        return report

    report.verdict = _compose_verdict(report)
    return report


def _nothing_was_checked(report: ImpartialQAReport) -> bool:
    return (
        report.passed
        and not report.assertion_results
        and report.score is None
        and report.faithfulness is None
    )


def _safe_evaluate(*, user_goal: str, output_text: str, model: str | None) -> dict[str, Any]:
    from orchestration.dynamic_planner import evaluate_run_quality

    try:
        data = evaluate_run_quality(user_goal=user_goal, output_text=output_text, model=model)
    except Exception as exc:  # noqa: BLE001
        return {"score": None, "verdict": f"judge failed: {exc}"}
    return data if isinstance(data, dict) else {"score": None, "verdict": "judge returned no object"}


def _safe_faithfulness(*, user_goal: str, output_text: str, model: str | None) -> dict[str, Any]:
    from orchestration.dynamic_planner import faithfulness_qa_review

    try:
        data = faithfulness_qa_review(user_goal=user_goal, output_text=output_text, model=model)
    except Exception as exc:  # noqa: BLE001
        return {"skipped": True, "error": str(exc)}
    return data if isinstance(data, dict) else {"skipped": True}


def _compose_verdict(report: ImpartialQAReport) -> str:
    judge_verdict = ""
    if isinstance(report.eval, dict):
        judge_verdict = str(report.eval.get("verdict", "")).strip()
    if report.passed:
        return judge_verdict or "deliverable meets the configured quality bar"
    head = report.reasons[0] if report.reasons else "quality bar not met"
    return f"{head}" if not judge_verdict else f"{head} — judge: {judge_verdict}"


def emit_impartial_qa_report(report: ImpartialQAReport) -> None:
    """Print a human-readable block to stderr (the web UI surfaces stderr in its activity log)."""
    if report.skipped:
        print(f"(impartial-qa) {report.verdict or 'skipped'}", file=sys.stderr, flush=True)
        return

    status = "PASS" if report.passed else "FAIL"
    if report.score is None:
        score_line = f"Score: n/a (minimum {report.min_score:.2f})"
    else:
        score_line = f"Score: {report.score:.2f} (minimum {report.min_score:.2f})"

    lines: list[str] = [
        "",
        "=== Impartial QA (unified gate) ===",
        f"Result: {status}",
        score_line,
        f"Verdict: {report.verdict or '(no verdict)'}",
    ]

    if report.assertion_results:
        lines.append("  Assertions:")
        for item in report.assertion_results:
            mark = "pass" if item.get("pass") else "FAIL"
            name = str(item.get("name") or item.get("type") or "assertion")
            detail = str(item.get("detail") or "").strip()
            lines.append(f"    - [{mark}] {name}" + (f": {detail}" if detail else ""))

    if report.reasons:
        lines.append("  Reasons:")
        for reason in report.reasons:
            lines.append(f"    - {reason}")

    if isinstance(report.faithfulness, dict):
        risk = str(report.faithfulness.get("hallucination_risk", "")).strip() or "unknown"
        fv = str(report.faithfulness.get("verdict", "")).strip()
        lines.append(f"  Faithfulness risk: {risk}" + (f" — {fv}" if fv else ""))
        for title, key in (
            ("Likely hallucinations or unverified:", "likely_hallucinations_or_unverified"),
            ("Unsupported factual claims:", "unsupported_claims"),
            ("User should verify:", "user_should_verify"),
        ):
            items = report.faithfulness.get(key)
            if not isinstance(items, list) or not items:
                continue
            lines.append(f"    {title}")
            for item in items:
                s = str(item).strip()
                if s:
                    lines.append(f"      - {s}")

    lines.extend(["=== End impartial QA ===", ""])
    print("\n".join(lines), file=sys.stderr, flush=True)


def finalize_impartial_qa(
    *,
    tool_root: Path,
    session_slug: str | None,
    user_goal: str,
    output_text: str | None,
) -> ImpartialQAReport | None:
    """
    Run the gate over a finished deliverable, print the report, and persist it.

    Returns ``None`` when the gate is disabled or could not run at all, so callers can fall back
    to whatever reporting they did before the gate existed. Never raises.
    """
    if not impartial_qa_enabled():
        return None

    try:
        report = run_impartial_qa(
            user_goal=user_goal,
            output_text=output_text or "",
            **load_impartial_qa_config_from_env(),
        )
    except Exception as exc:  # noqa: BLE001
        print(f"(impartial-qa) gate failed to run: {exc}", file=sys.stderr, flush=True)
        return None

    emit_impartial_qa_report(report)
    try:
        write_impartial_qa_json(tool_root, report, session_slug=session_slug)
    except Exception:  # noqa: BLE001
        pass
    return report


def impartial_qa_gate_failed(report: ImpartialQAReport | None) -> bool:
    """True when a report should make the caller exit non-zero (needs the hard gate armed)."""
    if report is None or report.skipped or report.passed:
        return False
    return impartial_qa_fail_enabled()


def impartial_qa_dir(tool_root: Path) -> Path:
    return (Path(tool_root) / SESSION_DIR_NAME / IMPARTIAL_QA_DIR_NAME).resolve()


def write_impartial_qa_json(
    tool_root: Path,
    report: ImpartialQAReport,
    session_slug: str | None = None,
) -> Path:
    """Persist the report under ``__orchestrator_sessions__/impartial_qa/`` and return the path."""
    directory = impartial_qa_dir(tool_root)
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    slug = (session_slug or "run").strip() or "run"
    # Dots are dropped along with separators so a slug can never escape the directory.
    safe_slug = "".join(ch if ch.isalnum() or ch in "_-" else "-" for ch in slug)[:120].strip("-_")
    path = directory / f"{safe_slug or 'run'}-{stamp}.json"
    path.write_text(
        json.dumps(report.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return path
