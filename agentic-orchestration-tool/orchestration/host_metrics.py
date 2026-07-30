"""
Host CPU / memory sampling for the daemon (Python port of
``agentic-orchestration-web/host-metrics.mjs``).

Reads ``/proc`` on Linux when available; set ``AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc``
when the coordinator mounts the node's ``/proc``. On Windows, uses ``GetSystemTimes`` /
``GlobalMemoryStatusEx``. On Jetson, a jtop writer snapshot
(``AGENTIC_JETSON_JTOP_METRICS_PATH``) supplies GPU / power / temperature.

Payload keys match the Node version so an existing frontend can point at either server.
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import socket
import subprocess
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
    """True when a non-default proc root is configured *and* readable."""
    root = proc_root()
    if str(root) == "/proc":
        return False
    try:
        return (root / "stat").is_file() or (root / "meminfo").is_file()
    except OSError:
        return False


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
        if dt > 0:
            raw = (1.0 - (di / dt)) * 100.0
            # Clamp: clock skew / suspend can theoretically push outside [0, 100].
            percent = round(max(0.0, min(100.0, raw)) * 10) / 10
        else:
            percent = 0.0
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


def _filetime_qword(low: int, high: int) -> int:
    return (int(high) << 32) | int(low)


def _sample_cpu_from_windows() -> float | None:
    """System-wide CPU via ``GetSystemTimes`` (idle / kernel / user FILETIMEs)."""
    import ctypes
    from ctypes import wintypes

    class FILETIME(ctypes.Structure):
        _fields_ = [
            ("dwLowDateTime", wintypes.DWORD),
            ("dwHighDateTime", wintypes.DWORD),
        ]

    idle = FILETIME()
    kernel = FILETIME()
    user = FILETIME()
    ok = ctypes.windll.kernel32.GetSystemTimes(
        ctypes.byref(idle),
        ctypes.byref(kernel),
        ctypes.byref(user),
    )
    if not ok:
        return None
    idle_t = _filetime_qword(idle.dwLowDateTime, idle.dwHighDateTime)
    # Kernel time includes idle time on Windows.
    kernel_t = _filetime_qword(kernel.dwLowDateTime, kernel.dwHighDateTime)
    user_t = _filetime_qword(user.dwLowDateTime, user.dwHighDateTime)
    busy = max(0, (kernel_t - idle_t) + user_t)
    total = busy + idle_t
    if total <= 0:
        return None
    return _percent_from(_CpuSample(idle=float(idle_t), total=float(total)))


def sample_cpu_percent() -> float | None:
    """
    System-wide CPU busy percent, or ``None`` when unknown / first tick.

    Never invents ``100.0`` from process-relative ``os.times()`` math.
    """
    if sys.platform.startswith("linux"):
        try:
            return _sample_cpu_from_proc()
        except OSError:
            return None
    if sys.platform == "win32":
        try:
            return _sample_cpu_from_windows()
        except Exception:  # noqa: BLE001
            return None
    return None


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


def _mem_total_available_from_windows() -> tuple[int, int] | None:
    """Physical RAM via ``GlobalMemoryStatusEx``."""
    import ctypes
    from ctypes import wintypes

    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", wintypes.DWORD),
            ("dwMemoryLoad", wintypes.DWORD),
            ("ullTotalPhys", ctypes.c_uint64),
            ("ullAvailPhys", ctypes.c_uint64),
            ("ullTotalPageFile", ctypes.c_uint64),
            ("ullAvailPageFile", ctypes.c_uint64),
            ("ullTotalVirtual", ctypes.c_uint64),
            ("ullAvailVirtual", ctypes.c_uint64),
            ("ullAvailExtendedVirtual", ctypes.c_uint64),
        ]

    stat = MEMORYSTATUSEX()
    stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
        return None
    total = int(stat.ullTotalPhys)
    available = int(stat.ullAvailPhys)
    if total <= 0:
        return None
    return total, max(0, available)


def _mem_total_available_from_sysconf() -> tuple[int, int] | None:
    try:
        page_size = os.sysconf("SC_PAGE_SIZE")
        total_bytes = int(page_size * os.sysconf("SC_PHYS_PAGES"))
        available_bytes = 0
        if hasattr(os, "sysconf") and "SC_AVPHYS_PAGES" in os.sysconf_names:
            available_bytes = int(page_size * os.sysconf("SC_AVPHYS_PAGES"))
        if total_bytes <= 0:
            return None
        return total_bytes, max(0, available_bytes)
    except (OSError, ValueError, AttributeError):
        return None


def sample_memory() -> dict[str, Any]:
    total_bytes = 0
    available_bytes = 0
    try:
        from_proc = _mem_total_available_from_proc()
    except OSError:
        from_proc = None
    if from_proc is not None:
        total_bytes, available_bytes = from_proc
    elif sys.platform == "win32":
        try:
            win = _mem_total_available_from_windows()
        except Exception:  # noqa: BLE001
            win = None
        if win is not None:
            total_bytes, available_bytes = win
    else:
        sysconf = _mem_total_available_from_sysconf()
        if sysconf is not None:
            total_bytes, available_bytes = sysconf

    used_bytes = max(0, total_bytes - available_bytes)
    used_percent: float | None
    if total_bytes > 0:
        used_percent = round((used_bytes / total_bytes) * 1000) / 10
    else:
        # Do not report 0% when we simply could not measure.
        used_percent = None
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


def _null_gpu_block() -> dict[str, Any]:
    return {
        "percent": None,
        "vramTotalGb": None,
        "vramUsedGb": None,
        "vramFreeGb": None,
        "vramSource": None,
        "name": None,
    }


def _mib_to_gb(mib: float) -> float:
    return round(float(mib) / 1024.0, 3)


def _parse_nvidia_smi_gpu_csv(stdout: str) -> dict[str, Any] | None:
    """
    Parse ``nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free``.

    Picks the GPU with the largest ``memory.total`` (same policy as VRAM detection).
    """
    best: dict[str, Any] | None = None
    best_total_mib = -1.0
    for raw_line in (stdout or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # name may contain commas — split from the right for the four numeric fields.
        parts = [p.strip() for p in line.rsplit(",", 4)]
        if len(parts) != 5:
            # Fallback: simple split when the name has no commas.
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 5:
                continue
            name = ",".join(parts[:-4]).strip()
            util_s, total_s, used_s, free_s = parts[-4:]
        else:
            name, util_s, total_s, used_s, free_s = parts
        try:
            total_mib = float(total_s)
        except ValueError:
            continue
        if total_mib <= best_total_mib:
            continue
        util: float | None
        try:
            util = float(util_s)
        except ValueError:
            util = None
        try:
            used_mib = float(used_s)
        except ValueError:
            used_mib = None
        try:
            free_mib = float(free_s)
        except ValueError:
            free_mib = None
        if used_mib is None and free_mib is not None:
            used_mib = max(0.0, total_mib - free_mib)
        if free_mib is None and used_mib is not None:
            free_mib = max(0.0, total_mib - used_mib)
        best_total_mib = total_mib
        best = {
            "percent": util,
            "vramTotalGb": _mib_to_gb(total_mib),
            "vramUsedGb": _mib_to_gb(used_mib) if used_mib is not None else None,
            "vramFreeGb": _mib_to_gb(free_mib) if free_mib is not None else None,
            "vramSource": "nvidia-smi",
            "name": name or None,
        }
    return best


def sample_nvidia_gpu() -> dict[str, Any] | None:
    """Live NVIDIA util + VRAM via nvidia-smi, or ``None`` if unavailable."""
    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=8,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0 or not (out.stdout or "").strip():
        return None
    return _parse_nvidia_smi_gpu_csv(out.stdout)


def _gpu_vram_block() -> dict[str, Any]:
    """
    Portable NVIDIA GPU summary for clients (util + VRAM + name).

    Distinct from Jetson ``jetson.gpu`` (jtop utilization). Honours
    ``AGENTIC_ASSUME_VRAM_GB`` for ``vramTotalGb``; util/used/free may still come
    from nvidia-smi when available, otherwise stay null under assume-only.
    """
    assume_raw = os.getenv("AGENTIC_ASSUME_VRAM_GB", "").strip()
    assume_gb: float | None = None
    if assume_raw:
        try:
            v = float(assume_raw)
            if v > 0:
                assume_gb = v
        except ValueError:
            assume_gb = None

    sampled = sample_nvidia_gpu()
    if sampled is None:
        if assume_gb is not None:
            out = _null_gpu_block()
            out["vramTotalGb"] = round(assume_gb, 3)
            out["vramSource"] = "assume"
            return out
        return _null_gpu_block()

    if assume_gb is not None:
        sampled = {
            **sampled,
            "vramTotalGb": round(assume_gb, 3),
            "vramSource": "assume",
        }
    return sampled


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
        "gpu": _gpu_vram_block(),
    }
    return merge_jetson_into_metrics(base, read_jetson_jtop_snapshot())
