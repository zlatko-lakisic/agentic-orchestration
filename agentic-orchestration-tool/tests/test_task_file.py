"""--task-file: TASK from a file or stdin (prompts too long for one argv string)."""

from __future__ import annotations

import io
import sys
from types import SimpleNamespace

import pytest

import main


@pytest.mark.unit
def test_parse_args_accepts_task_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "argv", ["main.py", "--dynamic", "--task-file=-"])
    args = main.parse_args()
    assert args.task_file == "-"
    assert args.task is None


@pytest.mark.unit
def test_task_file_reads_utf8_file(tmp_path) -> None:
    path = tmp_path / "task.txt"
    text = "--execute-step=/etc/passwd résumé " + "x" * 200_000
    path.write_text(text, encoding="utf-8")
    args = SimpleNamespace(task=None, task_file=str(path))
    main._apply_task_file(args)
    assert args.task == text


@pytest.mark.unit
def test_task_file_dash_reads_stdin(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = "long prompt ünïcode".encode("utf-8")
    monkeypatch.setattr(sys, "stdin", SimpleNamespace(buffer=io.BytesIO(payload)))
    args = SimpleNamespace(task=None, task_file="-")
    main._apply_task_file(args)
    assert args.task == payload.decode("utf-8")


@pytest.mark.unit
def test_task_file_and_positional_task_conflict(tmp_path, capsys) -> None:
    path = tmp_path / "task.txt"
    path.write_text("x", encoding="utf-8")
    args = SimpleNamespace(task="positional", task_file=str(path))
    with pytest.raises(SystemExit) as exc:
        main._apply_task_file(args)
    assert exc.value.code == 2
    assert "not both" in capsys.readouterr().err


@pytest.mark.unit
def test_task_file_missing_is_a_clean_error(tmp_path, capsys) -> None:
    args = SimpleNamespace(task=None, task_file=str(tmp_path / "nope.txt"))
    with pytest.raises(SystemExit) as exc:
        main._apply_task_file(args)
    assert exc.value.code == 2
    assert "cannot read --task-file" in capsys.readouterr().err


@pytest.mark.unit
def test_no_task_file_leaves_task_untouched() -> None:
    args = SimpleNamespace(task="hello", task_file=None)
    main._apply_task_file(args)
    assert args.task == "hello"
