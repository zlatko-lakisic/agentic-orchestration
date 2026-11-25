"""Quiet kickoff must not corrupt process-global stdout/stderr across threads."""

from __future__ import annotations

import io
import sys
import threading
from types import SimpleNamespace

import pytest

from orchestration.quiet_streams import active_quiet_scopes, quiet_streams


@pytest.mark.unit
def test_overlapping_quiet_scopes_restore_real_streams(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run A enters first and exits first; run B exits later.

    With ``contextlib.redirect_stdout`` B's exit "restored" A's already-closed
    sink, so every later ``print(..., file=sys.stderr)`` raised
    ``ValueError: I/O operation on closed file``.
    """
    out, err = io.StringIO(), io.StringIO()
    monkeypatch.setattr(sys, "stdout", out)
    monkeypatch.setattr(sys, "stderr", err)

    a_in, b_in, a_out = threading.Event(), threading.Event(), threading.Event()
    errors: list[BaseException] = []

    def run_a() -> None:
        try:
            with quiet_streams():
                print("A noise")
                a_in.set()
                assert b_in.wait(5)
            a_out.set()
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    def run_b() -> None:
        try:
            assert a_in.wait(5)
            with quiet_streams():
                print("B noise", file=sys.stderr)
                b_in.set()
                assert a_out.wait(5)
                print("B noise 2")
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    threads = [threading.Thread(target=run_a), threading.Thread(target=run_b)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(10)
    assert not errors, errors
    assert active_quiet_scopes() == 0

    # Originals restored and usable; nothing from the quiet scopes leaked.
    assert sys.stdout is out
    assert sys.stderr is err
    print("after", file=sys.stderr)
    print("after-out")
    assert err.getvalue() == "after\n"
    assert out.getvalue() == "after-out\n"


@pytest.mark.unit
def test_other_threads_stay_audible_while_a_run_is_quiet(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    err = io.StringIO()
    monkeypatch.setattr(sys, "stderr", err)

    quiet_in, release = threading.Event(), threading.Event()
    go_other, other_done = threading.Event(), threading.Event()

    def quiet_run() -> None:
        with quiet_streams():
            print("muted", file=sys.stderr)
            quiet_in.set()
            release.wait(5)

    def other() -> None:
        # Existed before the quiet scope started: not part of the quiet run.
        go_other.wait(5)
        print("diagnostic from another run", file=sys.stderr)
        other_done.set()

    t_other = threading.Thread(target=other)
    t_other.start()
    t_quiet = threading.Thread(target=quiet_run)
    t_quiet.start()
    assert quiet_in.wait(5)
    go_other.set()
    assert other_done.wait(5)
    release.set()
    t_quiet.join(5)
    t_other.join(5)

    assert err.getvalue() == "diagnostic from another run\n"


@pytest.mark.unit
def test_helper_threads_started_inside_a_quiet_scope_are_muted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Single-run CLI behaviour: kickoff helper threads stay silent, as with the old redirect."""
    out = io.StringIO()
    monkeypatch.setattr(sys, "stdout", out)

    with quiet_streams():
        helper = threading.Thread(target=lambda: print("helper noise"))
        helper.start()
        helper.join(5)
    print("answer")
    assert out.getvalue() == "answer\n"


@pytest.mark.unit
def test_stderr_only_scope_keeps_stdout(monkeypatch: pytest.MonkeyPatch) -> None:
    out, err = io.StringIO(), io.StringIO()
    monkeypatch.setattr(sys, "stdout", out)
    monkeypatch.setattr(sys, "stderr", err)
    with quiet_streams(stdout=False, stderr=True):
        print("kept")
        print("dropped", file=sys.stderr)
    assert out.getvalue() == "kept\n"
    assert err.getvalue() == ""


@pytest.mark.unit
@pytest.mark.backend_inprocess
def test_inprocess_backend_quiet_kickoff_survives_overlap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Two overlapping quiet ``execute_built`` calls leave stderr usable."""
    from orchestration.backends import crewai as backend_mod
    from orchestration.backends.base import RunOptions

    err = io.StringIO()
    monkeypatch.setattr(sys, "stderr", err)

    first_in, second_in, first_out = threading.Event(), threading.Event(), threading.Event()
    order = iter(("first", "second"))
    order_lock = threading.Lock()

    def fake_kickoff(_crew, inputs=None):  # noqa: ANN001
        with order_lock:
            who = next(order)
        print(f"crew chatter {who}")
        if who == "first":
            first_in.set()
            assert second_in.wait(5)
        else:
            second_in.set()
            assert first_out.wait(5)
        return f"result-{who}"

    class _NullCtx:
        def __enter__(self):
            return None

        def __exit__(self, *exc):  # noqa: ANN002
            return False

    monkeypatch.setattr(backend_mod, "crew_kickoff", fake_kickoff)
    monkeypatch.setattr(backend_mod, "crew_kickoff_context", lambda built: _NullCtx())
    monkeypatch.setattr(
        backend_mod, "workflow_result_to_extractable_text", lambda result: str(result)
    )

    def built() -> SimpleNamespace:
        return SimpleNamespace(
            crew=object(),
            inputs={},
            agent_providers={},
            workflow_context={"workflow_name": "t"},
        )

    results: dict[str, object] = {}
    options = RunOptions(quiet=True, emit_stdout_summary=False, run_id="quiet-overlap")

    def run(name: str) -> None:
        if name == "second":
            assert first_in.wait(5)
        res = backend_mod.CrewAIExecutionBackend().execute_built(built(), options=options)
        results[name] = res
        if name == "first":
            first_out.set()

    threads = [threading.Thread(target=run, args=(n,)) for n in ("first", "second")]
    for t in threads:
        t.start()
    for t in threads:
        t.join(15)

    assert {r.exit_code for r in results.values()} == {0}  # type: ignore[attr-defined]
    assert sys.stderr is err
    # The line the planner prints regardless of ``quiet`` must not raise.
    print("(dynamic) hardware: ok", file=sys.stderr)
    assert "(dynamic) hardware: ok" in err.getvalue()
