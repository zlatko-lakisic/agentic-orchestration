"""AO-spawned ``ollama serve`` processes are stopped when AO exits."""

from __future__ import annotations

import subprocess
from unittest.mock import MagicMock

import pytest

import orchestration.ollama_serve_lifecycle as life

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def clear_registry(monkeypatch: pytest.MonkeyPatch) -> None:
    life.clear_registry()
    monkeypatch.setattr(life, "_shutdown_hooks_installed", False)
    yield
    life.clear_registry()
    monkeypatch.setattr(life, "_shutdown_hooks_installed", False)


def test_stop_all_terminates_registered_serves() -> None:
    alive = MagicMock()
    alive.poll.return_value = None
    dead = MagicMock()
    dead.poll.return_value = 0

    life.register_serve("http://127.0.0.1:11434", alive)
    life.register_serve("http://127.0.0.1:21434", dead)

    life.stop_all_serves()

    assert life.registered_hosts() == []
    alive.terminate.assert_called_once()
    alive.wait.assert_called()
    dead.terminate.assert_not_called()


def test_stop_all_is_a_no_op_when_nothing_was_started() -> None:
    life.stop_all_serves()
    assert life.registered_hosts() == []


def test_stop_serve_by_host_only_affects_that_entry() -> None:
    a = MagicMock()
    a.poll.return_value = None
    b = MagicMock()
    b.poll.return_value = None
    life.register_serve("http://127.0.0.1:11434", a)
    life.register_serve("http://127.0.0.1:21434", b)

    life.stop_serve("http://127.0.0.1:11434")

    assert life.registered_hosts() == ["http://127.0.0.1:21434"]
    a.terminate.assert_called_once()
    b.terminate.assert_not_called()


def test_register_installs_atexit_hook_once(monkeypatch: pytest.MonkeyPatch) -> None:
    registered: list[object] = []
    monkeypatch.setattr(life.atexit, "register", lambda fn: registered.append(fn))

    proc = MagicMock()
    proc.poll.return_value = None
    life.register_serve("http://127.0.0.1:11434", proc)
    life.register_serve("http://127.0.0.1:21434", proc)

    assert registered == [life.stop_all_serves]
    assert life._shutdown_hooks_installed is True


def test_stop_kills_when_terminate_times_out(monkeypatch: pytest.MonkeyPatch) -> None:
    proc = MagicMock()
    proc.poll.return_value = None

    call_n = {"n": 0}

    def wait_side_effect(timeout=None):
        call_n["n"] += 1
        if call_n["n"] == 1:
            raise subprocess.TimeoutExpired(cmd="ollama", timeout=timeout or 5)
        return 0

    proc.wait.side_effect = wait_side_effect
    monkeypatch.setattr(life.sys, "platform", "win32")

    life._stop_proc(proc)

    proc.terminate.assert_called_once()
    proc.kill.assert_called_once()
