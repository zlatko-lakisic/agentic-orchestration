"""Unit tests for jetson-jtop-metrics-writer tegrastats parse + kill hygiene."""

from __future__ import annotations

import importlib.util
import signal
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

WRITER_PATH = (
    Path(__file__).resolve().parents[1] / "scripts" / "jetson-jtop-metrics-writer.py"
)


def _load_writer():
    spec = importlib.util.spec_from_file_location("jetson_jtop_metrics_writer", WRITER_PATH)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


writer = _load_writer()


def test_sample_once_sysfs_uses_meminfo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    meminfo = tmp_path / "meminfo"
    meminfo.write_text(
        "MemTotal:       62840320 kB\nMemAvailable:   42000000 kB\n",
        encoding="utf-8",
    )
    real_path = writer.Path

    class FakePath(real_path):  # type: ignore[misc,valid-type]
        def read_text(self, *args, **kwargs):
            if self.as_posix() == "/proc/meminfo":
                return meminfo.read_text(encoding="utf-8")
            return super().read_text(*args, **kwargs)

    monkeypatch.setattr(writer, "Path", FakePath)
    monkeypatch.setattr(writer, "_sysfs_gpu_freq_mhz", lambda: 600.0)
    monkeypatch.setattr(writer, "_board_name", lambda: "Orin")
    hit = writer.sample_once_sysfs()
    assert hit["source"] == "sysfs"
    assert hit["ramText"] == "19.9/59.9GB"
    assert hit["gpu"]["freqMhz"] == 600.0
    assert "vramUsedGb" not in hit["gpu"]


def test_parse_tegrastats_line_keeps_ram_as_ram_text_only() -> None:
    line = (
        "RAM 61276/62840MB (lfb 1x4MB) SWAP 100/1000MB "
        "CPU [10%@100,20%@100] GR3D_FREQ 0% gpu@45C"
    )
    parsed = writer._parse_tegrastats_line(line)
    assert parsed["source"] == "tegrastats"
    assert parsed["ramText"] == "59.8/61.4GB"
    assert parsed["gpu"]["percent"] == 0.0
    assert "vramUsedGb" not in parsed["gpu"]
    assert "vramTotalGb" not in parsed["gpu"]


def test_kill_process_group_uses_killpg(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[int, int]] = []

    def fake_killpg(pid: int, sig: int) -> None:
        calls.append((pid, sig))

    proc = SimpleNamespace(pid=4242, poll=lambda: None, kill=lambda: None, wait=lambda timeout=None: 0)
    monkeypatch.setattr(writer.os, "killpg", fake_killpg, raising=False)
    writer._kill_process_group(proc)  # type: ignore[arg-type]
    expected = getattr(signal, "SIGKILL", getattr(signal, "SIGTERM", 9))
    assert calls == [(4242, expected)]


def test_sample_once_tegrastats_kills_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(writer, "_which", lambda _cmd: "/usr/bin/tegrastats")

    killed: list[object] = []

    class FakeProc:
        def __init__(self, *args, **kwargs):
            self.pid = 99
            self._dead = False

        def poll(self):
            return 0 if self._dead else None

        def communicate(self, timeout=None):
            if not self._dead and timeout is not None:
                raise subprocess.TimeoutExpired(cmd="tegrastats", timeout=timeout)
            return (
                "RAM 1024/2048MB CPU [1%@100] GR3D_FREQ 5%\n",
                None,
            )

        def kill(self):
            self._dead = True

        def wait(self, timeout=None):
            self._dead = True
            return 0

    def fake_popen(*args, **kwargs):
        assert kwargs.get("start_new_session") is True
        return FakeProc()

    def fake_kill(proc):
        killed.append(proc)
        proc._dead = True

    monkeypatch.setattr(writer.subprocess, "Popen", fake_popen)
    monkeypatch.setattr(writer, "_kill_process_group", fake_kill)

    hit = writer.sample_once_tegrastats(timeout_sec=0.1)
    assert killed, "timeout must hard-kill the tegrastats process group"
    assert hit["ramText"] == "1.0/2.0GB"
    assert hit["gpu"]["percent"] == 5.0
