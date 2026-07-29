"""Host metrics Python port — parity with agentic-orchestration-web/host-metrics.mjs."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from orchestration.host_metrics import (
    host_metrics_push_ms,
    merge_jetson_into_metrics,
    metrics_scope,
    read_jetson_jtop_snapshot,
    reset_cpu_sample,
    sample_host_metrics,
    sample_memory,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_HOST_METRICS_PROC_ROOT", raising=False)
    monkeypatch.delenv("AGENTIC_JETSON_JTOP_METRICS_PATH", raising=False)
    monkeypatch.delenv("AGENTIC_WEB_HOST_METRICS_PUSH_MS", raising=False)
    reset_cpu_sample()


def test_sample_has_the_node_payload_shape() -> None:
    sample = sample_host_metrics()
    assert set(
        ["ts", "hostname", "platform", "arch", "scope", "uptimeSec", "loadAvg", "cpu", "memory"]
    ) <= set(sample)
    assert set(["percent", "cores"]) <= set(sample["cpu"])
    assert set(["totalBytes", "usedBytes", "availableBytes", "usedPercent"]) <= set(
        sample["memory"]
    )


def test_first_cpu_sample_has_no_percent_then_a_delta_appears() -> None:
    first = sample_host_metrics()
    assert first["cpu"]["percent"] is None
    second = sample_host_metrics()
    assert isinstance(second["cpu"]["percent"], (int, float))


def test_memory_used_percent_is_consistent() -> None:
    memory = sample_memory()
    if memory["totalBytes"] > 0:
        assert 0 <= memory["usedPercent"] <= 100
        assert memory["usedBytes"] == memory["totalBytes"] - memory["availableBytes"]


def test_scope_is_host_when_proc_root_is_mounted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_HOST_METRICS_PROC_ROOT", "/host/proc")
    assert metrics_scope() == "host"


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
