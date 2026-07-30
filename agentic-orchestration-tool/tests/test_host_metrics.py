"""Host metrics Python port — parity with agentic-orchestration-web/host-metrics.mjs."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from orchestration.host_metrics import (
    _parse_nvidia_smi_gpu_csv,
    _percent_from,
    _CpuSample,
    host_metrics_push_ms,
    merge_jetson_into_metrics,
    metrics_scope,
    read_jetson_jtop_snapshot,
    reset_cpu_sample,
    sample_cpu_percent,
    sample_host_metrics,
    sample_memory,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_HOST_METRICS_PROC_ROOT", raising=False)
    monkeypatch.delenv("AGENTIC_JETSON_JTOP_METRICS_PATH", raising=False)
    monkeypatch.delenv("AGENTIC_WEB_HOST_METRICS_PUSH_MS", raising=False)
    monkeypatch.delenv("AGENTIC_ASSUME_VRAM_GB", raising=False)
    reset_cpu_sample()


def test_sample_has_the_node_payload_shape() -> None:
    sample = sample_host_metrics()
    assert set(
        [
            "ts",
            "hostname",
            "platform",
            "arch",
            "scope",
            "uptimeSec",
            "loadAvg",
            "cpu",
            "memory",
            "gpu",
        ]
    ) <= set(sample)
    assert set(["percent", "cores"]) <= set(sample["cpu"])
    assert set(["totalBytes", "usedBytes", "availableBytes", "usedPercent"]) <= set(
        sample["memory"]
    )
    assert set(
        ["percent", "vramTotalGb", "vramUsedGb", "vramFreeGb", "vramSource", "name"]
    ) <= set(sample["gpu"])


def test_gpu_block_from_nvidia_smi_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "orchestration.host_metrics.sample_nvidia_gpu",
        lambda: {
            "percent": 23.5,
            "vramTotalGb": 8.0,
            "vramUsedGb": 3.125,
            "vramFreeGb": 4.785,
            "vramSource": "nvidia-smi",
            "name": "NVIDIA GeForce RTX 2070 SUPER",
        },
    )
    sample = sample_host_metrics()
    assert sample["gpu"]["percent"] == 23.5
    assert sample["gpu"]["vramTotalGb"] == 8.0
    assert sample["gpu"]["vramUsedGb"] == 3.125
    assert sample["gpu"]["vramFreeGb"] == 4.785
    assert sample["gpu"]["vramSource"] == "nvidia-smi"
    assert "2070" in (sample["gpu"]["name"] or "")


def test_gpu_block_null_when_no_nvidia(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("orchestration.host_metrics.sample_nvidia_gpu", lambda: None)
    sample = sample_host_metrics()
    assert sample["gpu"] == {
        "percent": None,
        "vramTotalGb": None,
        "vramUsedGb": None,
        "vramFreeGb": None,
        "vramSource": None,
        "name": None,
    }


def test_gpu_block_assume_overrides_total_keeps_util(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ASSUME_VRAM_GB", "12")
    monkeypatch.setattr(
        "orchestration.host_metrics.sample_nvidia_gpu",
        lambda: {
            "percent": 10.0,
            "vramTotalGb": 8.0,
            "vramUsedGb": 1.0,
            "vramFreeGb": 7.0,
            "vramSource": "nvidia-smi",
            "name": "GPU",
        },
    )
    sample = sample_host_metrics()
    assert sample["gpu"]["vramTotalGb"] == 12.0
    assert sample["gpu"]["vramSource"] == "assume"
    assert sample["gpu"]["percent"] == 10.0
    assert sample["gpu"]["vramUsedGb"] == 1.0


def test_gpu_block_assume_only_when_no_smi(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_ASSUME_VRAM_GB", "12")
    monkeypatch.setattr("orchestration.host_metrics.sample_nvidia_gpu", lambda: None)
    sample = sample_host_metrics()
    assert sample["gpu"]["vramTotalGb"] == 12.0
    assert sample["gpu"]["vramSource"] == "assume"
    assert sample["gpu"]["percent"] is None
    assert sample["gpu"]["vramUsedGb"] is None


def test_parse_nvidia_smi_picks_largest_vram() -> None:
    csv = (
        "NVIDIA GeForce GTX 1050, 5, 2048, 100, 1948\n"
        "NVIDIA GeForce RTX 2070 SUPER, 23, 8192, 3200, 4992\n"
    )
    parsed = _parse_nvidia_smi_gpu_csv(csv)
    assert parsed is not None
    assert parsed["vramTotalGb"] == 8.0
    assert parsed["percent"] == 23.0
    assert parsed["vramUsedGb"] == pytest.approx(3200 / 1024, abs=0.001)
    assert "2070" in (parsed["name"] or "")


def test_parse_nvidia_smi_name_with_commas() -> None:
    csv = "Foo, Bar GPU, 1, 4096, 1024, 3072\n"
    parsed = _parse_nvidia_smi_gpu_csv(csv)
    assert parsed is not None
    assert parsed["name"] == "Foo, Bar GPU"
    assert parsed["vramTotalGb"] == 4.0


def test_jetson_block_keeps_separate_gpu_from_portable_vram(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "orchestration.host_metrics.sample_nvidia_gpu",
        lambda: {
            "percent": 12.0,
            "vramTotalGb": 8.0,
            "vramUsedGb": 1.0,
            "vramFreeGb": 7.0,
            "vramSource": "nvidia-smi",
            "name": "GPU",
        },
    )
    snapshot = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "gpu": {"percent": 50.0, "freqMhz": 900},
    }
    path = tmp_path / "jtop.json"
    path.write_text(json.dumps(snapshot), encoding="utf-8")
    monkeypatch.setenv("AGENTIC_JETSON_JTOP_METRICS_PATH", str(path))

    sample = sample_host_metrics()
    assert sample["gpu"]["vramTotalGb"] == 8.0
    assert sample["gpu"]["percent"] == 12.0
    assert sample["jetson"]["gpu"] == {"percent": 50.0, "freqMhz": 900}


def test_cpu_percent_from_delta_is_clamped() -> None:
    reset_cpu_sample()
    assert _percent_from(_CpuSample(idle=100, total=100)) is None
    # 50 idle of 100 total delta → 50% busy
    pct = _percent_from(_CpuSample(idle=150, total=200))
    assert pct == 50.0


def test_windows_cpu_sampler_uses_get_system_times(monkeypatch: pytest.MonkeyPatch) -> None:
    if sys.platform != "win32":
        pytest.skip("Windows-only sampler")
    reset_cpu_sample()
    first = sample_cpu_percent()
    assert first is None
    second = sample_cpu_percent()
    assert second is None or (0.0 <= float(second) <= 100.0)


def test_windows_cpu_mock_idle_machine(monkeypatch: pytest.MonkeyPatch) -> None:
    """Simulated GetSystemTimes deltas must not invent ~100% on an idle machine."""
    calls = {"n": 0}

    def fake_windows() -> float | None:
        calls["n"] += 1
        # Tick 1: seed. Tick 2: mostly idle (90 idle of 100 total).
        if calls["n"] == 1:
            return _percent_from(_CpuSample(idle=1000.0, total=1100.0))
        return _percent_from(_CpuSample(idle=1900.0, total=2100.0))

    monkeypatch.setattr("orchestration.host_metrics._sample_cpu_from_windows", fake_windows)
    monkeypatch.setattr(sys, "platform", "win32")
    reset_cpu_sample()
    assert sample_cpu_percent() is None
    pct = sample_cpu_percent()
    assert pct is not None
    assert 0.0 <= pct <= 100.0
    assert pct < 50.0  # ~10% busy, not stuck at 100


def test_non_linux_non_windows_cpu_returns_null(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "darwin")
    reset_cpu_sample()
    assert sample_cpu_percent() is None


def test_windows_memory_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "win32")

    def boom_proc():
        raise OSError("no /proc")

    monkeypatch.setattr("orchestration.host_metrics._mem_total_available_from_proc", boom_proc)
    monkeypatch.setattr(
        "orchestration.host_metrics._mem_total_available_from_windows",
        lambda: (16 * 1024**3, 8 * 1024**3),
    )
    memory = sample_memory()
    assert memory["totalBytes"] == 16 * 1024**3
    assert memory["availableBytes"] == 8 * 1024**3
    assert memory["usedBytes"] == 8 * 1024**3
    assert memory["usedPercent"] == 50.0


def test_memory_used_percent_is_null_when_total_unknown(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "orchestration.host_metrics._mem_total_available_from_proc",
        lambda: (_ for _ in ()).throw(OSError("no")),
    )
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setattr("orchestration.host_metrics._mem_total_available_from_sysconf", lambda: None)
    memory = sample_memory()
    assert memory["totalBytes"] == 0
    assert memory["usedPercent"] is None


def test_first_cpu_sample_has_no_percent_then_a_delta_appears() -> None:
    first = sample_host_metrics()
    assert first["cpu"]["percent"] is None
    second = sample_host_metrics()
    # Linux (/proc) and Windows (GetSystemTimes) produce a delta; others stay null.
    if sys.platform.startswith("linux") or sys.platform == "win32":
        assert isinstance(second["cpu"]["percent"], (int, float))
        assert 0.0 <= float(second["cpu"]["percent"]) <= 100.0
    else:
        assert second["cpu"]["percent"] is None


def test_memory_used_percent_is_consistent() -> None:
    memory = sample_memory()
    if memory["totalBytes"] > 0:
        assert memory["usedPercent"] is not None
        assert 0 <= memory["usedPercent"] <= 100
        assert memory["usedBytes"] == memory["totalBytes"] - memory["availableBytes"]


def test_scope_is_host_when_proc_root_is_mounted(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    proc = tmp_path / "host_proc"
    proc.mkdir()
    (proc / "meminfo").write_text("MemTotal: 1 kB\n", encoding="utf-8")
    monkeypatch.setenv("AGENTIC_HOST_METRICS_PROC_ROOT", str(proc))
    assert metrics_scope() == "host"


def test_scope_is_runtime_when_proc_root_unreadable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_HOST_METRICS_PROC_ROOT", "/host/proc/does-not-exist")
    assert metrics_scope() == "runtime"


def test_scope_is_jetson_when_a_jtop_path_is_set(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_JETSON_JTOP_METRICS_PATH", str(tmp_path / "jtop.json"))
    assert metrics_scope() == "jetson"


def test_proc_stat_is_used_when_available(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    proc = tmp_path / "proc"
    proc.mkdir()
    (proc / "meminfo").write_text(
        "MemTotal:       8000000 kB\nMemAvailable:   2000000 kB\n", encoding="utf-8"
    )
    (proc / "uptime").write_text("1234.56 9999.00\n", encoding="utf-8")
    monkeypatch.setenv("AGENTIC_HOST_METRICS_PROC_ROOT", str(proc))

    memory = sample_memory()
    assert memory["totalBytes"] == 8000000 * 1024
    assert memory["availableBytes"] == 2000000 * 1024
    assert memory["usedPercent"] == 75.0
    assert sample_host_metrics()["uptimeSec"] == 1235


def test_jtop_snapshot_is_merged_with_age(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("orchestration.host_metrics.sample_nvidia_gpu", lambda: None)
    snapshot = {
        "ts": (datetime.now(timezone.utc) - timedelta(seconds=3)).isoformat(),
        "cpu": {"percent": 42.5},
        "gpu": {"percent": 88.0, "freqMhz": 918},
        "temperature": {"cpu": 51.2},
        "powerW": 12.5,
        "ramText": "3.1G/7.4G",
    }
    path = tmp_path / "jtop.json"
    path.write_text(json.dumps(snapshot), encoding="utf-8")
    monkeypatch.setenv("AGENTIC_JETSON_JTOP_METRICS_PATH", str(path))

    read = read_jetson_jtop_snapshot()
    assert read is not None
    assert 2000 <= read["ageMs"] <= 5000

    merged = sample_host_metrics()
    assert merged["scope"] == "jetson"
    assert merged["cpu"]["percent"] == 42.5
    assert merged["cpu"]["source"] == "jtop"
    assert merged["jetson"]["gpu"] == {"percent": 88.0, "freqMhz": 918}
    assert merged["jetson"]["powerW"] == 12.5
    assert merged["jetson"]["ramText"] == "3.1G/7.4G"


def test_missing_or_corrupt_jtop_file_is_ignored(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("orchestration.host_metrics.sample_nvidia_gpu", lambda: None)
    missing = tmp_path / "absent.json"
    monkeypatch.setenv("AGENTIC_JETSON_JTOP_METRICS_PATH", str(missing))
    assert read_jetson_jtop_snapshot() is None

    corrupt = tmp_path / "corrupt.json"
    corrupt.write_text("{not json", encoding="utf-8")
    monkeypatch.setenv("AGENTIC_JETSON_JTOP_METRICS_PATH", str(corrupt))
    assert read_jetson_jtop_snapshot() is None
    # The base sample still comes back, just without the jetson block.
    assert "jetson" not in sample_host_metrics()


def test_merge_ignores_a_negative_jtop_cpu_percent() -> None:
    base = {"cpu": {"percent": 11.0, "cores": 4}, "scope": "runtime"}
    merged = merge_jetson_into_metrics(base, {"cpu": {"percent": -1}, "ageMs": 10})
    assert merged["cpu"]["percent"] == 11.0
    assert merged["scope"] == "jetson"


def test_merge_without_a_snapshot_returns_the_base() -> None:
    base = {"cpu": {"percent": 5.0}}
    assert merge_jetson_into_metrics(base, None) is base


def test_push_interval_defaults_and_clamps(monkeypatch: pytest.MonkeyPatch) -> None:
    assert host_metrics_push_ms() == 2000
    monkeypatch.setenv("AGENTIC_WEB_HOST_METRICS_PUSH_MS", "5000")
    assert host_metrics_push_ms() == 5000
    monkeypatch.setenv("AGENTIC_WEB_HOST_METRICS_PUSH_MS", "10")
    assert host_metrics_push_ms() == 1000
    monkeypatch.setenv("AGENTIC_WEB_HOST_METRICS_PUSH_MS", "not-a-number")
    assert host_metrics_push_ms() == 2000
