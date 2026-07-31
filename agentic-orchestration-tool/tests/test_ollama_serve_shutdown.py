"""AO-spawned ``ollama serve`` processes are stopped when AO exits."""

from __future__ import annotations

import subprocess
import sys
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


def test_stop_all_terminates_registered_serves(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(life, "_windows_assign_kill_on_close_job", lambda _p: None)
    monkeypatch.setattr(life, "_windows_taskkill_tree", lambda _pid: None)

    alive = MagicMock()
    alive.poll.return_value = None
    alive.pid = 111
    dead = MagicMock()
    dead.poll.return_value = 0
    dead.pid = 222

    life.register_serve("http://127.0.0.1:11434", alive)
    life.register_serve("http://127.0.0.1:21434", dead)

    life.stop_all_serves()

    assert life.registered_hosts() == []
    if sys.platform == "win32":
        # Windows path uses taskkill tree when no job handle.
        pass
    else:
        alive.terminate.assert_called()


def test_stop_all_is_a_no_op_when_nothing_was_started() -> None:
    life.stop_all_serves()
    assert life.registered_hosts() == []


def test_stop_serve_by_host_only_affects_that_entry(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(life, "_windows_assign_kill_on_close_job", lambda _p: None)
    killed: list[int] = []
    monkeypatch.setattr(life, "_windows_taskkill_tree", lambda pid: killed.append(pid))

    a = MagicMock()
    a.poll.return_value = None
    a.pid = 10
    b = MagicMock()
    b.poll.return_value = None
    b.pid = 20
    life.register_serve("http://127.0.0.1:11434", a)
    life.register_serve("http://127.0.0.1:21434", b)

    life.stop_serve("http://127.0.0.1:11434")

    assert life.registered_hosts() == ["http://127.0.0.1:21434"]
    if sys.platform == "win32":
        assert killed == [10]
    else:
        a.terminate.assert_called_once()
        b.terminate.assert_not_called()


def test_register_installs_atexit_hook_once(monkeypatch: pytest.MonkeyPatch) -> None:
    registered: list[object] = []
    monkeypatch.setattr(life.atexit, "register", lambda fn: registered.append(fn))
    monkeypatch.setattr(life, "_windows_assign_kill_on_close_job", lambda _p: None)
    monkeypatch.setattr(life, "_install_windows_console_handler", lambda: None)

    proc = MagicMock()
    proc.poll.return_value = None
    life.register_serve("http://127.0.0.1:11434", proc)
    life.register_serve("http://127.0.0.1:21434", proc)

    assert registered == [life.stop_all_serves]
    assert life._shutdown_hooks_installed is True


def test_stop_kills_when_terminate_times_out(monkeypatch: pytest.MonkeyPatch) -> None:
    proc = MagicMock()
    proc.poll.return_value = None
    proc.pid = 99

    call_n = {"n": 0}

    def wait_side_effect(timeout=None):
        call_n["n"] += 1
        if call_n["n"] == 1:
            raise subprocess.TimeoutExpired(cmd="ollama", timeout=timeout or 5)
        return 0

    proc.wait.side_effect = wait_side_effect
    monkeypatch.setattr(life.sys, "platform", "linux")

    life._stop_proc_posix_or_simple(proc)

    proc.terminate.assert_called_once()


def test_windows_stop_uses_taskkill_tree(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(life.sys, "platform", "win32")
    monkeypatch.setattr(life, "_windows_assign_kill_on_close_job", lambda _p: None)
    monkeypatch.setattr(life, "_install_windows_console_handler", lambda: None)
    killed: list[int] = []
    monkeypatch.setattr(life, "_windows_taskkill_tree", lambda pid: killed.append(pid))

    proc = MagicMock()
    proc.poll.return_value = None
    proc.pid = 4242
    life.register_serve("http://127.0.0.1:11434", proc, job=None)
    life.stop_all_serves()
    assert killed == [4242]


def test_windows_job_close_preferred_over_taskkill(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(life.sys, "platform", "win32")
    monkeypatch.setattr(life, "_install_windows_console_handler", lambda: None)
    closed: list[object] = []
    monkeypatch.setattr(
        life,
        "_windows_close_job",
        lambda job, terminate=True: closed.append((job, terminate)),
    )
    killed: list[int] = []
    monkeypatch.setattr(life, "_windows_taskkill_tree", lambda pid: killed.append(pid))

    proc = MagicMock()
    proc.poll.return_value = None
    proc.pid = 7
    proc.wait.return_value = 0
    life.register_serve("http://127.0.0.1:11434", proc, job="fake-job")
    life.stop_all_serves()
    assert closed == [("fake-job", True)]
    assert killed == []
