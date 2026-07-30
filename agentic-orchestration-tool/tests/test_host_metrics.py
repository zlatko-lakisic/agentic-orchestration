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
        "orchestration.host_metrics.sample_gpu",
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
    monkeypatch.setattr("orchestration.host_metrics.sample_gpu", lambda: None)
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
        "orchestration.host_metrics.sample_gpu",
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
    monkeypatch.setattr("orchestration.host_metrics.sample_gpu", lambda: None)
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


def test_parse_system_profiler_prefers_dedicated_amd() -> None:
    from orchestration.host_metrics import parse_system_profiler_gpus

    text = """
Graphics/Displays:

    Intel UHD Graphics 630:

      Chipset Model: Intel UHD Graphics 630
      Type: GPU
      Bus: Built-In
      VRAM (Dynamic, Max): 1536 MB
      Vendor: Intel

    AMD Radeon Pro 5500M:

      Chipset Model: AMD Radeon Pro 5500M
      Type: GPU
      Bus: PCIe
      VRAM (Total): 4 GB
      Vendor: AMD
"""
    gpus = parse_system_profiler_gpus(text)
    assert len(gpus) == 2
    amd = next(g for g in gpus if "Radeon" in g["name"])
    assert amd["vramTotalGb"] == 4.0
    assert amd["dedicated"] is True
    intel = next(g for g in gpus if "Intel" in g["name"])
    assert intel["vramTotalGb"] == pytest.approx(1536 / 1024, abs=0.001)
    assert intel["dedicated"] is False


def test_merge_macos_picks_amd_over_intel() -> None:
    from orchestration.host_metrics import _merge_macos_gpu_candidates

    profiler = [
        {"name": "Intel UHD Graphics 630", "vramTotalGb": 1.5, "dedicated": False, "dynamic": True},
        {"name": "AMD Radeon Pro 5500M", "vramTotalGb": 4.0, "dedicated": True, "dynamic": False},
    ]
    ioreg = [
        {
            "IOClass": "IntelAccelerator",
            "VRAM,totalMB": 1536,
            "PerformanceStatistics": {"Device Utilization %": 22, "inUseVidMemoryBytes": 0},
        },
        {
            "IOClass": "AMDRadeonX6000_AMDNavi14GraphicsAccelerator",
            "PerformanceStatistics": {"inUseVidMemoryBytes": 512 * 1024 * 1024},
        },
    ]
    merged = _merge_macos_gpu_candidates(profiler, ioreg)
    assert merged is not None
    assert "Radeon" in (merged["name"] or "")
    assert merged["vramTotalGb"] == 4.0
    assert merged["vramUsedGb"] == 0.5
    assert merged["vramSource"] in ("system_profiler", "system_profiler+ioreg")


def test_parse_ioreg_does_not_treat_gart_as_vram() -> None:
    from orchestration.host_metrics import parse_ioreg_accelerator_gpu

    entry = {
        "IOClass": "AMDRadeonX6000_AMDNavi14GraphicsAccelerator",
        "PerformanceStatistics": {
            "gartSizeBytes": 11811160064,  # aperture — must not become vramTotal
            "gartUsedBytes": 5931008,
            "inUseVidMemoryBytes": 0,
        },
    }
    parsed = parse_ioreg_accelerator_gpu(entry)
    assert parsed is not None
    assert parsed["vramTotalGb"] is None
    assert parsed["vramUsedGb"] == 0.0


def test_linux_amd_sysfs_gpu(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import orchestration.host_metrics as hm

    drm = tmp_path / "drm"
    card = drm / "card0"
    device = card / "device"
    device.mkdir(parents=True)
    (device / "vendor").write_text("0x1002\n", encoding="utf-8")
    (device / "mem_info_vram_total").write_text(str(4 * 1024**3) + "\n", encoding="utf-8")
    (device / "mem_info_vram_used").write_text(str(1 * 1024**3) + "\n", encoding="utf-8")
    (device / "gpu_busy_percent").write_text("37\n", encoding="utf-8")
    (device / "uevent").write_text("DRIVER=amdgpu\n", encoding="utf-8")

    real_path = hm.Path

    def path_factory(p: str | Path = "."):
        if str(p) == "/sys/class/drm":
            return drm
        return real_path(p)

    monkeypatch.setattr(hm, "Path", path_factory)
    monkeypatch.setattr(sys, "platform", "linux")
    hit = hm.sample_linux_amd_gpu()
    assert hit is not None
    assert hit["percent"] == 37.0
    assert hit["vramTotalGb"] == 4.0
    assert hit["vramUsedGb"] == 1.0
    assert hit["vramSource"] == "amdgpu-sysfs"


@pytest.mark.skipif(sys.platform != "darwin", reason="live macOS AMD/Intel GPU")
def test_macos_gpu_live_prefers_radeon() -> None:
    from orchestration.host_metrics import sample_macos_gpu

    # Bust cache
    import orchestration.host_metrics as hm

    hm._gpu_sample_cache = None
    hit = sample_macos_gpu()
    assert hit is not None
    assert hit["vramTotalGb"] == 4.0
    assert "Radeon" in (hit["name"] or "") or "AMD" in (hit["name"] or "")


def test_jetson_block_keeps_separate_gpu_from_portable_vram(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "orchestration.host_metrics.sample_gpu",
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


def test_non_linux_non_windows_non_darwin_cpu_returns_null(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "freebsd")
    reset_cpu_sample()
    assert sample_cpu_percent() is None


def test_macos_cpu_sampler_two_ticks(monkeypatch: pytest.MonkeyPatch) -> None:
    """Simulated Mach host_statistics deltas produce a percent in [0, 100]."""
    calls = {"n": 0}

    def fake_macos() -> float | None:
        calls["n"] += 1
        if calls["n"] == 1:
            return _percent_from(_CpuSample(idle=1000.0, total=1100.0))
        return _percent_from(_CpuSample(idle=1900.0, total=2100.0))

    monkeypatch.setattr("orchestration.host_metrics._sample_cpu_from_macos", fake_macos)
    monkeypatch.setattr(sys, "platform", "darwin")
    reset_cpu_sample()
    assert sample_cpu_percent() is None
    pct = sample_cpu_percent()
    assert pct is not None
    assert 0.0 <= pct <= 100.0
    assert pct < 50.0


@pytest.mark.skipif(sys.platform != "darwin", reason="live Darwin Mach sampler")
def test_macos_cpu_live_sampler() -> None:
    reset_cpu_sample()
    assert sample_cpu_percent() is None
    second = sample_cpu_percent()
    assert second is None or (0.0 <= float(second) <= 100.0)


def test_parse_vm_stat_page_size_4096() -> None:
    from orchestration.host_metrics import parse_vm_stat_available_bytes

    text = (
        "Mach Virtual Memory Statistics: (page size of 4096 bytes)\n"
        "Pages free:                               1100000.\n"
        "Pages active:                             2000000.\n"
        "Pages inactive:                           2500000.\n"
        "Pages speculative:                          43000.\n"
        "Pages wired down:                          500000.\n"
    )
    available = parse_vm_stat_available_bytes(text)
    assert available == (1100000 + 2500000 + 43000) * 4096


def test_parse_vm_stat_page_size_16384() -> None:
    from orchestration.host_metrics import parse_vm_stat_available_bytes

    text = (
        "Mach Virtual Memory Statistics: (page size of 16384 bytes)\n"
        "Pages free:                                100000.\n"
        "Pages inactive:                            200000.\n"
        "Pages speculative:                          10000.\n"
    )
    available = parse_vm_stat_available_bytes(text)
    assert available == (100000 + 200000 + 10000) * 16384


def test_macos_memory_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "darwin")

    def boom_proc():
        raise OSError("no /proc")

    monkeypatch.setattr("orchestration.host_metrics._mem_total_available_from_proc", boom_proc)
    monkeypatch.setattr(
        "orchestration.host_metrics._mem_total_available_from_macos",
        lambda: (32 * 1024**3, 12 * 1024**3),
    )
    memory = sample_memory()
    assert memory["totalBytes"] == 32 * 1024**3
    assert memory["availableBytes"] == 12 * 1024**3
    assert memory["usedBytes"] == 20 * 1024**3
    assert memory["usedPercent"] == 62.5


def test_macos_memory_unknown_available_does_not_lie_at_100(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setattr(
        "orchestration.host_metrics._mem_total_available_from_proc",
        lambda: (_ for _ in ()).throw(OSError("no")),
    )
    monkeypatch.setattr(
        "orchestration.host_metrics._mem_total_available_from_macos",
        lambda: (32 * 1024**3, None),
    )
    memory = sample_memory()
    assert memory["totalBytes"] == 32 * 1024**3
    assert memory["availableBytes"] == 0
    assert memory["usedPercent"] is None


def test_linux_meminfo_without_memavailable_does_not_lie_at_100(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    proc = tmp_path / "proc"
    proc.mkdir()
    (proc / "meminfo").write_text("MemTotal:       8000000 kB\n", encoding="utf-8")
    monkeypatch.setenv("AGENTIC_HOST_METRICS_PROC_ROOT", str(proc))
    memory = sample_memory()
    assert memory["totalBytes"] == 8000000 * 1024
    assert memory["usedPercent"] is None


@pytest.mark.skipif(sys.platform != "darwin", reason="live Darwin memory")
def test_macos_memory_live_not_stuck_at_100() -> None:
    memory = sample_memory()
    assert memory["totalBytes"] > 0
    assert memory["availableBytes"] > 0
    assert memory["usedPercent"] is not None
    assert 0.0 < float(memory["usedPercent"]) < 100.0


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
    monkeypatch.setattr("orchestration.host_metrics._mem_total_available_from_macos", lambda: None)
    memory = sample_memory()
    assert memory["totalBytes"] == 0
    assert memory["usedPercent"] is None


def test_first_cpu_sample_has_no_percent_then_a_delta_appears() -> None:
    first = sample_host_metrics()
    assert first["cpu"]["percent"] is None
    second = sample_host_metrics()
    # Linux (/proc), Windows (GetSystemTimes), Darwin (Mach host_statistics).
    if sys.platform.startswith("linux") or sys.platform in ("win32", "darwin"):
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
    monkeypatch.setattr("orchestration.host_metrics.sample_gpu", lambda: None)
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
    monkeypatch.setattr("orchestration.host_metrics.sample_gpu", lambda: None)
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
