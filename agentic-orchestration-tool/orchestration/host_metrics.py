"""
Host CPU / memory sampling for the daemon (Python port of
``agentic-orchestration-web/host-metrics.mjs``).

Reads ``/proc`` on Linux when available; set ``AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc``
when the coordinator mounts the node's ``/proc``. On Jetson, a jtop writer snapshot
(``AGENTIC_JETSON_JTOP_METRICS_PATH``) supplies GPU / power / temperature.

Payload keys match the Node version so an existing frontend can point at either server.
"""

from __future__ import annotations

import json
import os
import platform
import socket
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def proc_root() -> Path:
    raw = os.getenv("AGENTIC_HOST_METRICS_PROC_ROOT", "/proc").strip() or "/proc"
    return Path(raw)


def host_scope_mounted() -> bool:
    return str(proc_root()) != "/proc"


def jtop_metrics_path() -> Path | None:
    raw = os.getenv("AGENTIC_JETSON_JTOP_METRICS_PATH", "").strip()
    return Path(raw) if raw else None


def host_metrics_push_ms() -> int:
    """Push interval for ``host_metrics_subscribe`` (Node env name kept for parity)."""
    raw = os.getenv("AGENTIC_WEB_HOST_METRICS_PUSH_MS", "").strip()
    try:
        value = int(raw) if raw else 2000
    except ValueError:
        value = 2000
    return max(1000, min(60000, value))


@dataclass
class _CpuSample:
    idle: float
    total: float


#: Percent is a delta between calls, so the previous sample lives at module scope
#: (same shape as the Node module's `_prevCpu`).
_prev_cpu: _CpuSample | None = None


def reset_cpu_sample() -> None:
    """Drop the previous CPU sample (tests; also used when a subscriber reconnects)."""
    global _prev_cpu
    _prev_cpu = None


def _percent_from(sample: _CpuSample) -> float | None:
    global _prev_cpu
    percent: float | None = None
    if _prev_cpu is not None:
        dt = sample.total - _prev_cpu.total
        di = sample.idle - _prev_cpu.idle
        percent = round((1 - di / dt) * 1000) / 10 if dt > 0 else 0.0
    _prev_cpu = sample
    return percent


def _sample_cpu_from_proc() -> float | None:
    raw = (proc_root() / "stat").read_text(encoding="utf-8")
    line = next((l for l in raw.splitlines() if l.startswith("cpu ")), None)
    if not line:
        return None
    parts = [float(p) for p in line.split()[1:]]
    if len(parts) < 4:
        return None
    idle = parts[3] + (parts[4] if len(parts) > 4 else 0.0)
    return _percent_from(_CpuSample(idle=idle, total=sum(parts)))


def _sample_cpu_from_times() -> float | None:
    times = os.times()
    idle = float(times.elapsed) if times.elapsed else 0.0
    total = float(times.user + times.system + times.children_user + times.children_system)
    if total <= 0 and idle <= 0:
        return None
    # Without /proc there is no system-wide idle counter; report process-relative busy
    # time so the field is populated rather than absent (Node falls back to os.cpus()).
    return _percent_from(_CpuSample(idle=idle, total=idle + total))


def sample_cpu_percent() -> float | None:
    if sys.platform.startswith("linux"):
        try:
            return _sample_cpu_from_proc()
        except OSError:
            pass
    return _sample_cpu_from_times()


def _mem_total_available_from_proc() -> tuple[int, int] | None:
    total = 0
    available = 0
    for line in (proc_root() / "meminfo").read_text(encoding="utf-8").splitlines():
        if line.startswith("MemTotal:"):
            total = int(line.split()[1]) * 1024
        elif line.startswith("MemAvailable:"):
            available = int(line.split()[1]) * 1024
        if total and available:
            break
    if not total:
        return None
    return total, available


def sample_memory() -> dict[str, Any]:
    total_bytes = 0
    available_bytes = 0
    try:
        from_proc = _mem_total_available_from_proc()
    except OSError:
        from_proc = None
    if from_proc is not None:
        total_bytes, available_bytes = from_proc
    else:
        try:
            page_size = os.sysconf("SC_PAGE_SIZE")
            total_bytes = int(page_size * os.sysconf("SC_PHYS_PAGES"))
            if hasattr(os, "sysconf") and "SC_AVPHYS_PAGES" in os.sysconf_names:
                available_bytes = int(page_size * os.sysconf("SC_AVPHYS_PAGES"))
        except (OSError, ValueError, AttributeError):
            total_bytes = 0
            available_bytes = 0
    used_bytes = max(0, total_bytes - available_bytes)
    used_percent = round((used_bytes / total_bytes) * 1000) / 10 if total_bytes > 0 else 0.0
    return {
        "totalBytes": total_bytes,
        "usedBytes": used_bytes,
        "availableBytes": available_bytes,
        "usedPercent": used_percent,
    }


def metrics_scope() -> str:
    if jtop_metrics_path() is not None:
        return "jetson"
    if host_scope_mounted():
        return "host"
    if sys.platform.startswith("linux") and Path("/.dockerenv").exists():
        return "container"
    return "runtime"


def read_jetson_jtop_snapshot() -> dict[str, Any] | None:
    path = jtop_metrics_path()
    if path is None:
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(raw, dict):
        return None
    age_ms: float | None = None
    ts_raw = raw.get("ts")
    if ts_raw:
        try:
            parsed = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            age_ms = (datetime.now(timezone.utc) - parsed).total_seconds() * 1000.0
        except ValueError:
            age_ms = None
    return {**raw, "ageMs": age_ms}


def merge_jetson_into_metrics(
    base: dict[str, Any],
    jtop: dict[str, Any] | None,
) -> dict[str, Any]:
    """Overlay a jtop snapshot onto a base sample (parity with the Node helper)."""
    if not jtop:
        return base
    gpu = jtop.get("gpu") if isinstance(jtop.get("gpu"), dict) else {}
    temperature = jtop.get("temperature") if isinstance(jtop.get("temperature"), dict) else {}
    jetson = {
        "source": "jtop",
        "ageMs": jtop.get("ageMs"),
        "gpu": {
            "percent": gpu.get("percent") if isinstance(gpu.get("percent"), (int, float)) else None,
            "freqMhz": gpu.get("freqMhz") if isinstance(gpu.get("freqMhz"), (int, float)) else None,
        },
        "temperature": temperature,
        "powerW": jtop.get("powerW") if isinstance(jtop.get("powerW"), (int, float)) else None,
        "ramText": jtop.get("ramText") or None,
    }
    out = {**base, "jetson": jetson, "scope": "jetson"}
    cpu = jtop.get("cpu") if isinstance(jtop.get("cpu"), dict) else {}
    cpu_percent = cpu.get("percent")
    if isinstance(cpu_percent, (int, float)) and cpu_percent >= 0:
        out["cpu"] = {**out.get("cpu", {}), "percent": cpu_percent, "source": "jtop"}
    return out


def _load_avg() -> list[float]:
    try:
        return [round(v * 100) / 100 for v in os.getloadavg()]
    except (OSError, AttributeError):
        return []


def _uptime_sec() -> int:
    try:
        raw = (proc_root() / "uptime").read_text(encoding="utf-8")
        return int(round(float(raw.split()[0])))
    except (OSError, ValueError, IndexError):
        return int(round(time.monotonic()))


def sample_host_metrics() -> dict[str, Any]:
    """One metrics sample; keys mirror the Node ``sampleHostMetrics()`` payload."""
    cpu_percent = sample_cpu_percent()
    base: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "hostname": socket.gethostname(),
        "platform": sys.platform,
        "arch": platform.machine(),
        "scope": metrics_scope(),
        "uptimeSec": _uptime_sec(),
        "loadAvg": _load_avg(),
        "cpu": {"percent": cpu_percent, "cores": os.cpu_count() or 0},
        "memory": sample_memory(),
    }
    return merge_jetson_into_metrics(base, read_jetson_jtop_snapshot())
