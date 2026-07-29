#!/usr/bin/env python3
"""
Jetson / edge smoke: unified impartial QA gate (v1).

The gate is on by default in advisory mode (``AGENTIC_IMPARTIAL_QA_FAIL`` off), so this smoke
also asserts that an unset environment cannot break a run.

Offline by default — unit tests plus an assertions-only fixture that exercises pass, fail, and
skip paths without a single LLM call. Opt in to a live judge pass explicitly::

  python3 scripts/smoke_impartial_qa.py
  AGENTIC_SMOKE_IMPARTIAL_LIVE=1 python3 scripts/smoke_impartial_qa.py
  SMOKE_ROUNDS=3 python3 scripts/smoke_impartial_qa.py --until-pass
  ./scripts/smoke_impartial_qa.sh

Env:
  SMOKE_ROUNDS                 max rounds when --until-pass (default 3)
  SMOKE_SKIP_UNIT              1 to skip pytest
  AGENTIC_SMOKE_IMPARTIAL_LIVE 1 to score a fixed deliverable with the real judge model
  SMOKE_IMPARTIAL_MIN_SCORE    minimum score for the live check (default 0.3)
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

_TOOL_ROOT = Path(__file__).resolve().parent.parent

if str(_TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(_TOOL_ROOT))

_FIXTURE_GOAL = "Recommend where a small RAG index should live and justify it in bullets."
_FIXTURE_OUTPUT = (
    "Recommendation: keep the index on the edge device.\n"
    "- Local queries stay under 50 ms because nothing crosses the network.\n"
    "- The cluster holds a nightly replica, so a device failure loses at most one day.\n"
    "- Index size today is 40 MB, well inside the device's disk budget.\n"
)


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _truthy(name: str) -> bool:
    return _env(name).lower() in ("1", "true", "yes", "on")


def _ok(msg: str) -> None:
    print(f"  OK  {msg}")


def _fail(msg: str) -> None:
    print(f" FAIL {msg}", file=sys.stderr)


def _python() -> Path:
    candidate = _TOOL_ROOT / ".venv" / "bin" / "python"
    return candidate if candidate.is_file() else Path(sys.executable)


def run_unit_tests() -> tuple[bool, str]:
    if _truthy("SMOKE_SKIP_UNIT"):
        return True, "unit skipped"
    cmd = [str(_python()), "-m", "pytest", "tests/test_impartial_qa.py", "-q", "--tb=line"]
    proc = subprocess.run(cmd, cwd=str(_TOOL_ROOT), capture_output=True, text=True)
    tail = (proc.stdout or proc.stderr or "").strip().splitlines()[-3:]
    if proc.returncode != 0:
        return False, "pytest failed: " + " | ".join(tail)
    return True, "unit tests passed: " + (tail[-1] if tail else "ok")


def check_default_on_advisory() -> tuple[bool, str]:
    """The gate runs by default, but only AGENTIC_IMPARTIAL_QA_FAIL=1 may break a run."""
    from orchestration.impartial_qa import impartial_qa_enabled, impartial_qa_fail_enabled

    prior_enabled = os.environ.pop("AGENTIC_IMPARTIAL_QA", None)
    prior_fail = os.environ.pop("AGENTIC_IMPARTIAL_QA_FAIL", None)
    try:
        if not impartial_qa_enabled():
            return False, "gate reports disabled with AGENTIC_IMPARTIAL_QA unset"
        if impartial_qa_fail_enabled():
            return False, "gate would exit non-zero with AGENTIC_IMPARTIAL_QA_FAIL unset"
        os.environ["AGENTIC_IMPARTIAL_QA"] = "0"
        if impartial_qa_enabled():
            return False, "AGENTIC_IMPARTIAL_QA=0 did not disable the gate"
        os.environ["AGENTIC_IMPARTIAL_QA_FAIL"] = "1"
        if not impartial_qa_fail_enabled():
            return False, "AGENTIC_IMPARTIAL_QA_FAIL=1 did not arm the hard gate"
    finally:
        for name, prior in (
            ("AGENTIC_IMPARTIAL_QA", prior_enabled),
            ("AGENTIC_IMPARTIAL_QA_FAIL", prior_fail),
        ):
            if prior is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = prior
    return True, "gate on by default, advisory until AGENTIC_IMPARTIAL_QA_FAIL=1"


def check_soft_skip_without_reviewers() -> tuple[bool, str]:
    """The Jetson shape: no assertions, judge off, faithfulness off — must skip, never fail."""
    from orchestration.impartial_qa import run_impartial_qa

    prior = {
        name: os.environ.get(name)
        for name in ("AGENTIC_LEARNING_EVAL", "AGENTIC_FINAL_QA", "AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL")
    }
    os.environ["AGENTIC_LEARNING_EVAL"] = "0"
    os.environ["AGENTIC_FINAL_QA"] = "0"
    os.environ.pop("AGENTIC_IMPARTIAL_QA_FAITHFULNESS_FAIL", None)
    try:
        report = run_impartial_qa(user_goal=_FIXTURE_GOAL, output_text=_FIXTURE_OUTPUT)
        if not report.skipped or not report.passed:
            return False, f"expected a soft skip, got passed={report.passed} verdict={report.verdict!r}"
    finally:
        for name, value in prior.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value
    return True, "soft skip when no reviewer can run (Jetson latency profile)"


def check_assertions_only_offline() -> tuple[bool, str]:
    """Pass / fail / skip paths with the LLM judge disabled — no network, no model."""
    from orchestration.impartial_qa import run_impartial_qa

    prior = os.environ.get("AGENTIC_IMPARTIAL_QA_EVAL")
    os.environ["AGENTIC_IMPARTIAL_QA_EVAL"] = "0"
    try:
        good = run_impartial_qa(
            user_goal=_FIXTURE_GOAL,
            output_text=_FIXTURE_OUTPUT,
            assertions=[
                {"type": "min_chars", "value": 80},
                {"type": "bullet_count", "min": 3},
                {"type": "contains_any", "values": ["edge device"]},
            ],
            include_faithfulness=False,
        )
        if not good.passed or good.skipped or good.eval is not None:
            return False, f"expected an offline pass, got {good.verdict!r} reasons={good.reasons}"

        bad = run_impartial_qa(
            user_goal=_FIXTURE_GOAL,
            output_text="Sure, I can help with that.",
            assertions=[{"type": "bullet_count", "min": 3}],
            include_faithfulness=False,
        )
        if bad.passed:
            return False, "expected a failing gate for a boilerplate answer"

        skipped = run_impartial_qa(user_goal=_FIXTURE_GOAL, output_text=_FIXTURE_OUTPUT)
        if not skipped.skipped or not skipped.passed:
            return False, "expected skip when no assertions and the judge is disabled"
    finally:
        if prior is None:
            os.environ.pop("AGENTIC_IMPARTIAL_QA_EVAL", None)
        else:
            os.environ["AGENTIC_IMPARTIAL_QA_EVAL"] = prior
    return True, "offline assertions fixture: pass / fail / skip all behave"


def check_report_json_roundtrip() -> tuple[bool, str]:
    from orchestration.impartial_qa import ImpartialQAReport, write_impartial_qa_json

    report = ImpartialQAReport(passed=True, score=0.71, min_score=0.5, verdict="smoke")
    with tempfile.TemporaryDirectory(prefix="impartial-qa-smoke-") as tmp:
        path = write_impartial_qa_json(Path(tmp), report, session_slug="smoke")
        if not path.is_file():
            return False, f"report not written: {path}"
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("score") != 0.71 or data.get("verdict") != "smoke":
            return False, f"unexpected report payload: {data}"
        if path.parent.name != "impartial_qa":
            return False, f"unexpected report directory: {path.parent}"
    return True, "report JSON round-trips under __orchestrator_sessions__/impartial_qa/"


def run_optional_live_gate() -> tuple[bool, str]:
    if not _truthy("AGENTIC_SMOKE_IMPARTIAL_LIVE"):
        return True, "live judge skipped (set AGENTIC_SMOKE_IMPARTIAL_LIVE=1)"

    from orchestration.impartial_qa import emit_impartial_qa_report, run_impartial_qa

    min_score = float(_env("SMOKE_IMPARTIAL_MIN_SCORE", "0.3") or "0.3")
    # The judge honours AGENTIC_LEARNING_EVAL; the Jetson env turns it off for latency.
    prior = os.environ.get("AGENTIC_LEARNING_EVAL")
    os.environ["AGENTIC_LEARNING_EVAL"] = "1"
    try:
        report = run_impartial_qa(
            user_goal=_FIXTURE_GOAL,
            output_text=_FIXTURE_OUTPUT,
            assertions=[{"type": "bullet_count", "min": 3}],
            min_score=min_score,
            include_faithfulness=False,
        )
    except Exception as exc:  # noqa: BLE001
        return False, f"live judge raised: {exc}"
    finally:
        if prior is None:
            os.environ.pop("AGENTIC_LEARNING_EVAL", None)
        else:
            os.environ["AGENTIC_LEARNING_EVAL"] = prior

    emit_impartial_qa_report(report)
    if report.score is None:
        return False, f"live judge returned no score: {report.eval}"
    if not report.passed:
        return False, f"live gate failed on a known-good fixture: {report.reasons}"
    return True, f"live gate ok: score={report.score:.2f} (min {min_score:.2f})"


def one_round() -> bool:
    print("=== impartial QA smoke (v1) ===")
    checks = [
        ("unit tests", run_unit_tests),
        ("default on, advisory", check_default_on_advisory),
        ("soft skip without reviewers", check_soft_skip_without_reviewers),
        ("offline assertions fixture", check_assertions_only_offline),
        ("report JSON", check_report_json_roundtrip),
        ("live judge optional", run_optional_live_gate),
    ]
    all_ok = True
    for name, fn in checks:
        print(f"-- {name}")
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, f"exception: {exc}"
        if ok:
            _ok(detail)
        else:
            _fail(detail)
            all_ok = False
    return all_ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--until-pass", action="store_true")
    args = ap.parse_args()
    rounds = max(1, int(_env("SMOKE_ROUNDS", "3") or "3"))
    if not args.until_pass:
        return 0 if one_round() else 1
    for i in range(1, rounds + 1):
        print(f"\n######## round {i}/{rounds} ########")
        if one_round():
            print(f"\nSMOKE PASS on round {i}")
            return 0
        if i < rounds:
            time.sleep(min(30, 5 * i))
    print("\nSMOKE FAIL after all rounds", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
