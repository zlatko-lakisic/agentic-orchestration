"""
Host CPU / memory sampling for the daemon (Python port of
``agentic-orchestration-web/host-metrics.mjs``).

- Linux: ``/proc/stat`` + ``/proc/meminfo`` (set ``AGENTIC_HOST_METRICS_PROC_ROOT=/host/proc``
  when the coordinator mounts the node's ``/proc``).
- Windows: ``GetSystemTimes`` / ``GlobalMemoryStatusEx``.
- Darwin (Intel + Apple Silicon): Mach ``host_statistics`` CPU + ``sysctl hw.memsize`` /
  ``vm_stat`` memory. Same path under Rosetta; do not fork on ``platform.machine()``.
- Jetson: optional jtop writer snapshot (``AGENTIC_JETSON_JTOP_METRICS_PATH``) for GPU /
  power / temperature (additive overlay).
- Discrete NVIDIA (k8s engine without GPU devices): optional host writer snapshot
  (``AGENTIC_NVIDIA_HOST_METRICS_PATH``, typically written by
  ``nvidia-host-metrics-writer.py`` on the node) for portable ``gpu.*`` fields.

Payload keys match the Node version so an existing frontend can point at either server.
Apple Silicon: ``gpu.percent`` may come from IORegistry ``Device Utilization %``;
VRAM fields stay null unless ``AGENTIC_ASSUME_VRAM_GB`` (unified memory is not
discrete VRAM — do not invent totals from GART aperture / system RAM).
"""

from __future__ import annotations

import json
import os
import platform
import re
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


def nvidia_host_metrics_path() -> Path | None:
    """Path to host-written NVIDIA snapshot (shared ``var/agentic-metrics`` mount)."""
    raw = os.getenv("AGENTIC_NVIDIA_HOST_METRICS_PATH", "").strip()
    if raw:
        return Path(raw)
    # Sibling of jtop path when only Jetson env is set.
    jtop = jtop_metrics_path()
    if jtop is not None:
        return jtop.parent / "nvidia-metrics.json"
    return None


def amd_host_metrics_path() -> Path | None:
    """Path to host-written AMD snapshot (``amd-host-metrics-writer.py``)."""
    raw = os.getenv("AGENTIC_AMD_HOST_METRICS_PATH", "").strip()
    if raw:
        return Path(raw)
    jtop = jtop_metrics_path()
    if jtop is not None:
        return jtop.parent / "amd-metrics.json"
    nvidia = os.getenv("AGENTIC_NVIDIA_HOST_METRICS_PATH", "").strip()
    if nvidia:
        return Path(nvidia).parent / "amd-metrics.json"
    return None


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


def _sample_cpu_from_macos() -> float | None:
    """
    System-wide CPU via Mach ``host_statistics`` / ``HOST_CPU_LOAD_INFO``.

    Tick order: USER=0, SYSTEM=1, IDLE=2, NICE=3. Arch-agnostic (x86_64 + arm64).
    """
    import ctypes
    import ctypes.util

    HOST_CPU_LOAD_INFO = 3
    HOST_CPU_LOAD_INFO_COUNT = 4

    class host_cpu_load_info_data_t(ctypes.Structure):
        _fields_ = [("cpu_ticks", ctypes.c_uint32 * HOST_CPU_LOAD_INFO_COUNT)]

    lib_name = ctypes.util.find_library("c")
    libc = ctypes.CDLL(lib_name or "/usr/lib/libSystem.B.dylib", use_errno=True)
    mach_host_self = libc.mach_host_self
    mach_host_self.restype = ctypes.c_uint
    host_statistics = libc.host_statistics
    host_statistics.argtypes = [
        ctypes.c_uint,
        ctypes.c_int,
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_uint),
    ]
    host_statistics.restype = ctypes.c_int

    info = host_cpu_load_info_data_t()
    count = ctypes.c_uint(HOST_CPU_LOAD_INFO_COUNT)
    kr = host_statistics(
        mach_host_self(),
        HOST_CPU_LOAD_INFO,
        ctypes.cast(ctypes.byref(info), ctypes.POINTER(ctypes.c_int)),
        ctypes.byref(count),
    )
    if kr != 0:
        return None
    ticks = info.cpu_ticks
    idle = float(ticks[2])
    total = float(ticks[0] + ticks[1] + ticks[2] + ticks[3])
    if total <= 0:
        return None
    return _percent_from(_CpuSample(idle=idle, total=total))


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
    if sys.platform == "darwin":
        try:
            return _sample_cpu_from_macos()
        except Exception:  # noqa: BLE001
            return None
    return None


def _mem_total_available_from_proc() -> tuple[int, int | None] | None:
    """
    Linux ``/proc/meminfo``.

    Returns ``(total, available)``. ``available`` is ``None`` when ``MemAvailable`` is
    absent so callers can leave ``usedPercent`` null instead of lying at 100%.
    """
    total = 0
    available = 0
    saw_available = False
    for line in (proc_root() / "meminfo").read_text(encoding="utf-8").splitlines():
        if line.startswith("MemTotal:"):
            total = int(line.split()[1]) * 1024
        elif line.startswith("MemAvailable:"):
            available = int(line.split()[1]) * 1024
            saw_available = True
        if total and saw_available:
            break
    if not total:
        return None
    return total, available if saw_available else None


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


def _mem_total_available_from_sysconf() -> tuple[int, int | None] | None:
    try:
        page_size = os.sysconf("SC_PAGE_SIZE")
        total_bytes = int(page_size * os.sysconf("SC_PHYS_PAGES"))
        if total_bytes <= 0:
            return None
        if hasattr(os, "sysconf") and "SC_AVPHYS_PAGES" in os.sysconf_names:
            available_bytes = int(page_size * os.sysconf("SC_AVPHYS_PAGES"))
            return total_bytes, max(0, available_bytes)
        # Total without a real available counter — do not pretend available=0.
        return total_bytes, None
    except (OSError, ValueError, AttributeError):
        return None


def parse_vm_stat_available_bytes(text: str, *, default_page_size: int = 4096) -> int | None:
    """
    Parse Darwin ``vm_stat`` output into an approximate available-bytes figure.

    Uses ``Pages free`` + ``Pages inactive`` + ``Pages speculative`` (Node ``os.freemem``
    spirit). Page size is taken from the header (``page size of N bytes``) — Apple Silicon
    often reports 16384; do not hardcode 4096.
    """
    page_size = default_page_size
    counts: dict[str, int] = {}
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line:
            continue
        lower = line.lower()
        if "page size of" in lower and "bytes" in lower:
            # e.g. "Mach Virtual Memory Statistics: (page size of 16384 bytes)"
            try:
                after = lower.split("page size of", 1)[1]
                page_size = int(after.split("bytes", 1)[0].strip())
            except (IndexError, ValueError):
                pass
            continue
        if ":" not in line:
            continue
        key, _, rest = line.partition(":")
        key = key.strip()
        num = rest.strip().rstrip(".").replace(",", "")
        try:
            counts[key] = int(num)
        except ValueError:
            continue
    if page_size <= 0:
        return None
    free = counts.get("Pages free", 0)
    inactive = counts.get("Pages inactive", 0)
    speculative = counts.get("Pages speculative", 0)
    if free == 0 and inactive == 0 and speculative == 0 and not any(
        k.startswith("Pages ") for k in counts
    ):
        return None
    return int((free + inactive + speculative) * page_size)


def _macos_hw_memsize() -> int | None:
    try:
        out = subprocess.run(
            ["sysctl", "-n", "hw.memsize"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0:
        return None
    try:
        value = int((out.stdout or "").strip())
    except ValueError:
        return None
    return value if value > 0 else None


def _macos_vm_stat_text() -> str | None:
    try:
        out = subprocess.run(
            ["vm_stat"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0:
        return None
    text = out.stdout or ""
    return text if text.strip() else None


def _mem_total_available_from_macos() -> tuple[int, int | None] | None:
    """Darwin RAM: ``hw.memsize`` total + ``vm_stat`` available (Intel + Apple Silicon)."""
    total = _macos_hw_memsize()
    if total is None:
        # Fall back to SC_PHYS_PAGES when sysctl is unavailable (tests / restricted env).
        try:
            page_size = os.sysconf("SC_PAGE_SIZE")
            total = int(page_size * os.sysconf("SC_PHYS_PAGES"))
        except (OSError, ValueError, AttributeError):
            return None
    if total <= 0:
        return None
    default_page = 4096
    try:
        default_page = int(os.sysconf("SC_PAGE_SIZE")) or 4096
    except (OSError, ValueError, AttributeError):
        default_page = 4096
    text = _macos_vm_stat_text()
    if text is None:
        return total, None
    available = parse_vm_stat_available_bytes(text, default_page_size=default_page)
    if available is None:
        return total, None
    return total, max(0, min(total, available))


def sample_memory() -> dict[str, Any]:
    total_bytes = 0
    available_bytes = 0
    available_known = False
    try:
        from_proc = _mem_total_available_from_proc()
    except OSError:
        from_proc = None
    if from_proc is not None:
        total_bytes, avail = from_proc
        if avail is not None:
            available_bytes = avail
            available_known = True
    elif sys.platform == "win32":
        try:
            win = _mem_total_available_from_windows()
        except Exception:  # noqa: BLE001
            win = None
        if win is not None:
            total_bytes, available_bytes = win
            available_known = True
    elif sys.platform == "darwin":
        try:
            mac = _mem_total_available_from_macos()
        except Exception:  # noqa: BLE001
            mac = None
        if mac is not None:
            total_bytes, avail = mac
            if avail is not None:
                available_bytes = avail
                available_known = True
    else:
        sysconf = _mem_total_available_from_sysconf()
        if sysconf is not None:
            total_bytes, avail = sysconf
            if avail is not None:
                available_bytes = avail
                available_known = True

    used_bytes = max(0, total_bytes - available_bytes) if available_known else 0
    used_percent: float | None
    if total_bytes > 0 and available_known:
        used_percent = round((used_bytes / total_bytes) * 1000) / 10
    else:
        # Do not report 0% or 100% when we simply could not measure available.
        used_percent = None
    return {
        "totalBytes": total_bytes,
        "usedBytes": used_bytes if available_known else 0,
        "availableBytes": available_bytes if available_known else 0,
        "usedPercent": used_percent,
    }


def metrics_scope() -> str:
    jtop_path = jtop_metrics_path()
    if jtop_path is not None and jtop_path.is_file():
        return "jetson"
    if nvidia_host_metrics_path() is not None:
        return "host"
    if amd_host_metrics_path() is not None:
        return "host"
    if host_scope_mounted():
        return "host"
    if sys.platform.startswith("linux") and Path("/.dockerenv").exists():
        return "container"
    return "runtime"


def _snapshot_age_ms(raw: dict[str, Any]) -> float | None:
    ts_raw = raw.get("ts")
    if not ts_raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - parsed).total_seconds() * 1000.0
    except ValueError:
        return None


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
    return {**raw, "ageMs": _snapshot_age_ms(raw)}


_HOST_SNAPSHOT_MAX_AGE_MS = 15_000.0


def _read_host_gpu_snapshot(path: Path | None) -> dict[str, Any] | None:
    """Read a host-written GPU metrics JSON; ignore stale files (>15s)."""
    if path is None:
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(raw, dict):
        return None
    age_ms = _snapshot_age_ms(raw)
    if age_ms is not None and age_ms > _HOST_SNAPSHOT_MAX_AGE_MS:
        return None
    return {**raw, "ageMs": age_ms}


def read_nvidia_host_snapshot() -> dict[str, Any] | None:
    """Read host-written NVIDIA metrics JSON (``nvidia-host-metrics-writer.py``)."""
    return _read_host_gpu_snapshot(nvidia_host_metrics_path())


def read_amd_host_snapshot() -> dict[str, Any] | None:
    """Read host-written AMD metrics JSON (``amd-host-metrics-writer.py``)."""
    return _read_host_gpu_snapshot(amd_host_metrics_path())


def _normalize_host_file_gpu(
    snap: dict[str, Any] | None,
    *,
    default_source: str,
    vendor: str,
    backend: str,
) -> dict[str, Any] | None:
    if not snap:
        return None
    gpu = snap.get("gpu") if isinstance(snap.get("gpu"), dict) else None
    if not gpu:
        return None
    percent = gpu.get("percent")
    if percent is not None and not isinstance(percent, (int, float)):
        percent = None
    total = gpu.get("vramTotalGb")
    used = gpu.get("vramUsedGb")
    free = gpu.get("vramFreeGb")
    if total is not None and not isinstance(total, (int, float)):
        total = None
    if used is not None and not isinstance(used, (int, float)):
        used = None
    if free is not None and not isinstance(free, (int, float)):
        free = None
    name = gpu.get("name")
    name_s = str(name).strip() if name else None
    source = gpu.get("vramSource") or snap.get("source") or default_source
    temp_c = _as_temp_c(gpu.get("tempC"))
    if total is None and percent is None and used is None and free is None and not name_s:
        return None
    return {
        "percent": float(percent) if percent is not None else None,
        "vramTotalGb": float(total) if total is not None else None,
        "vramUsedGb": float(used) if used is not None else None,
        "vramFreeGb": float(free) if free is not None else None,
        "vramSource": str(source),
        "vendor": str(gpu.get("vendor") or vendor),
        "backend": str(gpu.get("backend") or backend),
        "name": name_s or None,
        "tempC": temp_c,
    }


def sample_nvidia_host_file_gpu() -> dict[str, Any] | None:
    """Portable ``gpu.*`` block from the host NVIDIA writer snapshot."""
    return _normalize_host_file_gpu(
        read_nvidia_host_snapshot(),
        default_source="nvidia-smi",
        vendor="nvidia",
        backend="nvidia-host-file",
    )


def sample_amd_host_file_gpu() -> dict[str, Any] | None:
    """Portable ``gpu.*`` block from the host AMD writer snapshot."""
    return _normalize_host_file_gpu(
        read_amd_host_snapshot(),
        default_source="amdgpu-sysfs",
        vendor="amd",
        backend="amd-host-file",
    )


def sample_jetson_host_file_gpu() -> dict[str, Any] | None:
    """
    Portable ``gpu.*`` from the Jetson jtop/tegrastats host writer.

    Used by ``sample_gpu()`` so catalog VRAM / hardware snapshots see Tegra
    stats when live ``nvidia-smi`` is unavailable inside the pod.
    """
    snap = read_jetson_jtop_snapshot()
    if not snap:
        return None
    gpu = snap.get("gpu") if isinstance(snap.get("gpu"), dict) else {}
    source = str(snap.get("source") or "jtop")
    percent = gpu.get("percent") if isinstance(gpu.get("percent"), (int, float)) else None
    freq = gpu.get("freqMhz") if isinstance(gpu.get("freqMhz"), (int, float)) else None
    name = str(gpu.get("name") or "").strip() or "Jetson GPU"
    vram_total = gpu.get("vramTotalGb") if isinstance(gpu.get("vramTotalGb"), (int, float)) else None
    vram_used = gpu.get("vramUsedGb") if isinstance(gpu.get("vramUsedGb"), (int, float)) else None
    vram_free = gpu.get("vramFreeGb") if isinstance(gpu.get("vramFreeGb"), (int, float)) else None
    ram_text = snap.get("ramText")
    if vram_total is None and ram_text:
        m = re.search(
            r"([\d.]+)\s*(?:[GM]i?B?)?\s*/\s*([\d.]+)\s*(?:[GM]i?B?)?",
            str(ram_text),
            re.I,
        )
        if m:
            used = float(m.group(1))
            total = float(m.group(2))
            if total > 0:
                vram_used = used
                vram_total = total
                vram_free = round(max(0.0, total - used), 3)
    if percent is None and vram_total is None and freq is None:
        return None
    temps = snap.get("temperature") if isinstance(snap.get("temperature"), dict) else None
    temp_c = _as_temp_c(gpu.get("tempC")) or _temp_from_map(
        temps, ("gpu", "GPU", "tj", "Tj", "cpu")
    )
    return {
        "percent": float(percent) if percent is not None else None,
        "vramTotalGb": float(vram_total) if vram_total is not None else None,
        "vramUsedGb": float(vram_used) if vram_used is not None else None,
        "vramFreeGb": float(vram_free) if vram_free is not None else None,
        "vramSource": source,
        "vendor": "nvidia",
        "backend": source,
        "name": name,
        "freqMhz": float(freq) if freq is not None else None,
        "tempC": temp_c,
    }


def merge_jetson_into_metrics(
    base: dict[str, Any],
    jtop: dict[str, Any] | None,
) -> dict[str, Any]:
    """Overlay a jtop/tegrastats snapshot onto a base sample (parity with Node)."""
    if not jtop:
        return base
    gpu = jtop.get("gpu") if isinstance(jtop.get("gpu"), dict) else {}
    temperature = jtop.get("temperature") if isinstance(jtop.get("temperature"), dict) else {}
    source = str(jtop.get("source") or "jtop")
    jetson = {
        "source": source,
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
    cpu_out = {**out.get("cpu", {})}
    if isinstance(cpu_percent, (int, float)) and cpu_percent >= 0:
        cpu_out["percent"] = cpu_percent
        cpu_out["source"] = source
    cpu_temp = (
        _as_temp_c(cpu.get("tempC"))
        or _temp_from_map(temperature, ("cpu", "CPU", "tj", "Tj"))
    )
    if cpu_temp is not None:
        cpu_out["tempC"] = cpu_temp
    if cpu_out:
        out["cpu"] = cpu_out

    gpu_temp = (
        _as_temp_c(gpu.get("tempC"))
        or _temp_from_map(temperature, ("gpu", "GPU", "tj", "Tj", "cpu"))
    )

    # Promote Jetson GPU into top-level gpu when NVIDIA/AMD file is absent (Node parity).
    if not out.get("gpu") or (
        isinstance(out.get("gpu"), dict)
        and out["gpu"].get("percent") is None
        and out["gpu"].get("vramTotalGb") is None
        and not out["gpu"].get("name")
    ):
        gpu_name = str(gpu.get("name") or "").strip() or "Jetson GPU"
        promoted: dict[str, Any] = {
            "percent": jetson["gpu"]["percent"],
            "freqMhz": jetson["gpu"]["freqMhz"],
            "vramTotalGb": None,
            "vramUsedGb": None,
            "vramFreeGb": None,
            "vramSource": source,
            "vendor": "nvidia",
            "backend": source,
            "name": gpu_name,
            "tempC": gpu_temp,
        }
        ram_text = jtop.get("ramText")
        if ram_text:
            m = re.search(
                r"([\d.]+)\s*(?:[GM]i?B?)?\s*/\s*([\d.]+)\s*(?:[GM]i?B?)?",
                str(ram_text),
                re.I,
            )
            if m:
                used = float(m.group(1))
                total = float(m.group(2))
                if total > 0:
                    promoted["vramUsedGb"] = used
                    promoted["vramTotalGb"] = total
                    promoted["vramFreeGb"] = round(max(0.0, total - used), 3)
        # Only replace empty/null gpu blocks.
        existing = out.get("gpu")
        if not isinstance(existing, dict) or (
            existing.get("percent") is None
            and existing.get("vramTotalGb") is None
            and not existing.get("name")
        ):
            out["gpu"] = promoted
    elif gpu_temp is not None and isinstance(out.get("gpu"), dict):
        if out["gpu"].get("tempC") is None:
            out["gpu"] = {**out["gpu"], "tempC": gpu_temp}
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
        "tempC": None,
    }


def _as_temp_c(value: Any) -> float | None:
    if isinstance(value, (int, float)) and -100.0 < float(value) < 200.0:
        return round(float(value), 1)
    return None


def _temp_from_map(temps: dict[str, Any] | None, preferred: tuple[str, ...]) -> float | None:
    """Pick a Celsius reading from a jtop/tegrastats temperature map."""
    if not isinstance(temps, dict) or not temps:
        return None
    lowered = {str(k).lower(): v for k, v in temps.items()}
    for key in preferred:
        raw = lowered.get(key.lower())
        hit = _as_temp_c(raw)
        if hit is not None:
            return hit
        if isinstance(raw, dict):
            hit = _as_temp_c(raw.get("temp") if "temp" in raw else raw.get("tempC"))
            if hit is not None:
                return hit
    for raw in temps.values():
        hit = _as_temp_c(raw)
        if hit is not None:
            return hit
        if isinstance(raw, dict):
            hit = _as_temp_c(raw.get("temp") if "temp" in raw else raw.get("tempC"))
            if hit is not None:
                return hit
    return None


def sample_cpu_temp_c() -> float | None:
    """
    Host CPU package temperature in Celsius when sysfs thermal zones are visible.

    Prefers ``x86_pkg_temp`` / ``cpu-thermal`` / ``soc_thermal``; falls back to the
    first sensible zone. In k8s without host ``/sys``, rely on host writers or
    Jetson jtop temperature overlays instead.
    """
    if not sys.platform.startswith("linux"):
        return None
    thermal = Path("/sys/class/thermal")
    if not thermal.is_dir():
        return None
    preferred_types = (
        "x86_pkg_temp",
        "cpu-thermal",
        "cpu_thermal",
        "soc_thermal",
        "cpu-therm",
        "cpu",
    )
    by_type: dict[str, float] = {}
    first: float | None = None
    try:
        zones = sorted(thermal.glob("thermal_zone*"))
    except OSError:
        return None
    for zone in zones:
        try:
            ztype = (zone / "type").read_text(encoding="utf-8").strip().lower()
            milli = int((zone / "temp").read_text(encoding="utf-8").strip().split()[0])
        except (OSError, ValueError, IndexError):
            continue
        celsius = milli / 1000.0
        if celsius <= 0 or celsius >= 150:
            continue
        by_type[ztype] = celsius
        if first is None:
            first = celsius
    for pref in preferred_types:
        if pref in by_type:
            return round(by_type[pref], 1)
        for ztype, val in by_type.items():
            if pref in ztype:
                return round(val, 1)
    return round(first, 1) if first is not None else None


def _cpu_temp_from_host_snapshots() -> float | None:
    """CPU °C from host-written metrics JSON (NVIDIA/AMD writers or Jetson file)."""
    for snap in (
        read_nvidia_host_snapshot(),
        read_amd_host_snapshot(),
        read_jetson_jtop_snapshot(),
    ):
        if not snap:
            continue
        cpu = snap.get("cpu") if isinstance(snap.get("cpu"), dict) else {}
        hit = _as_temp_c(cpu.get("tempC"))
        if hit is not None:
            return hit
        temps = snap.get("temperature") if isinstance(snap.get("temperature"), dict) else None
        hit = _temp_from_map(temps, ("cpu", "CPU", "tj", "Tj"))
        if hit is not None:
            return hit
    return None


def _mib_to_gb(mib: float) -> float:
    return round(float(mib) / 1024.0, 3)


def _parse_nvidia_smi_gpu_csv(stdout: str) -> dict[str, Any] | None:
    """
    Parse ``nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free[,temperature.gpu]``.

    Picks the GPU with the largest ``memory.total`` (same policy as VRAM detection).
    Temperature is optional for backward-compatible 5-field rows.
    """
    best: dict[str, Any] | None = None
    best_total_mib = -1.0
    for raw_line in (stdout or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # Prefer 6 fields (…,free,temp) when the trailing token looks like °C.
        # Otherwise keep legacy 5-field rows (…,used,free) so names with commas still parse.
        parts6 = [p.strip() for p in line.rsplit(",", 5)]
        temp_s: str | None = None
        name = util_s = total_s = used_s = free_s = ""
        used_six = False
        if len(parts6) == 6:
            maybe_temp = parts6[-1]
            try:
                temp_candidate = float(maybe_temp)
            except ValueError:
                temp_candidate = None
            if temp_candidate is not None and -40.0 <= temp_candidate <= 150.0:
                try:
                    total_candidate = float(parts6[2])
                except ValueError:
                    total_candidate = None
                # Memory totals are MiB and almost always larger than a Celsius reading.
                if total_candidate is not None and total_candidate > temp_candidate:
                    name, util_s, total_s, used_s, free_s, temp_s = parts6
                    used_six = True
        if not used_six:
            parts = [p.strip() for p in line.rsplit(",", 4)]
            if len(parts) != 5:
                parts = [p.strip() for p in line.split(",")]
                if len(parts) < 5:
                    continue
                name = ",".join(parts[:-4]).strip()
                util_s, total_s, used_s, free_s = parts[-4:]
            else:
                name, util_s, total_s, used_s, free_s = parts
            temp_s = None
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
        temp_c: float | None = None
        if temp_s not in (None, ""):
            try:
                temp_c = _as_temp_c(float(temp_s))
            except ValueError:
                temp_c = None
        best_total_mib = total_mib
        best = {
            "percent": util,
            "vramTotalGb": _mib_to_gb(total_mib),
            "vramUsedGb": _mib_to_gb(used_mib) if used_mib is not None else None,
            "vramFreeGb": _mib_to_gb(free_mib) if free_mib is not None else None,
            "vramSource": "nvidia-smi",
            "vendor": "nvidia",
            "backend": "nvidia-smi",
            "name": name or None,
            "tempC": temp_c,
        }
    return best


def sample_nvidia_gpu() -> dict[str, Any] | None:
    """Live NVIDIA util + VRAM + temp via nvidia-smi, or ``None`` if unavailable."""
    if shutil.which("nvidia-smi") is None:
        return None
    try:
        out = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free,temperature.gpu",
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


def _bytes_to_gb(num: float) -> float:
    return round(float(num) / (1024.0**3), 3)


def _parse_vram_size_token(raw: str) -> float | None:
    """Parse ``4 GB``, ``1536 MB``, ``8192`` (MiB) into GiB."""
    text = " ".join(str(raw or "").strip().split())
    if not text:
        return None
    m = re.match(r"^([\d.]+)\s*(gb|giB|g|mb|mib|m)?$", text, re.IGNORECASE)
    if not m:
        return None
    try:
        value = float(m.group(1))
    except ValueError:
        return None
    unit = (m.group(2) or "mb").lower()
    if unit in ("gb", "gib", "g"):
        return value if value > 0 else None
    # MB / MiB / bare number treated as MiB (system_profiler / nvidia-smi style).
    return _mib_to_gb(value) if value > 0 else None


def parse_system_profiler_gpus(text: str) -> list[dict[str, Any]]:
    """
    Parse ``system_profiler SPDisplaysDataType`` text into GPU candidates.

    Dedicated ``VRAM (Total)`` wins over ``VRAM (Dynamic, Max)`` when ranking.
    """
    gpus: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def flush() -> None:
        nonlocal current
        if current and current.get("name"):
            gpus.append(current)
        current = None

    for raw in (text or "").splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        # Chipset lines are indented under Graphics/Displays.
        chip = re.match(r"^(\s+)Chipset Model:\s*(.+)\s*$", line)
        if chip:
            flush()
            current = {
                "name": chip.group(2).strip(),
                "vramTotalGb": None,
                "dedicated": False,
                "dynamic": False,
            }
            continue
        if current is None:
            continue
        total = re.match(r"^\s+VRAM \(Total\):\s*(.+)\s*$", line)
        if total:
            gb = _parse_vram_size_token(total.group(1))
            if gb is not None:
                current["vramTotalGb"] = gb
                current["dedicated"] = True
            continue
        dynamic = re.match(r"^\s+VRAM \(Dynamic, Max\):\s*(.+)\s*$", line)
        if dynamic and current.get("vramTotalGb") is None:
            gb = _parse_vram_size_token(dynamic.group(1))
            if gb is not None:
                current["vramTotalGb"] = gb
                current["dynamic"] = True
            continue
    flush()
    return gpus


def _macos_system_profiler_gpus() -> list[dict[str, Any]]:
    if sys.platform != "darwin" or shutil.which("system_profiler") is None:
        return []
    try:
        out = subprocess.run(
            ["system_profiler", "SPDisplaysDataType"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return []
    if out.returncode != 0:
        return []
    return parse_system_profiler_gpus(out.stdout or "")


def _ioreg_accelerator_dicts() -> list[dict[str, Any]]:
    if sys.platform != "darwin" or shutil.which("ioreg") is None:
        return []
    try:
        out = subprocess.run(
            ["ioreg", "-r", "-c", "IOAccelerator", "-a"],
            capture_output=True,
            timeout=12,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return []
    if out.returncode != 0 or not out.stdout:
        return []
    try:
        import plistlib

        data = plistlib.loads(out.stdout)
    except Exception:  # noqa: BLE001
        return []
    if isinstance(data, list):
        return [d for d in data if isinstance(d, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def _accelerator_vendor_hint(entry: dict[str, Any]) -> str:
    blob = " ".join(
        str(entry.get(k) or "")
        for k in (
            "IOClass",
            "IOObjectClass",
            "IORegistryEntryName",
            "CFBundleIdentifier",
            "MetalPluginName",
        )
    ).lower()
    if "amd" in blob or "radeon" in blob or "aty," in blob:
        return "amd"
    if "intel" in blob or "kbl" in blob or "icl" in blob or "tgl" in blob:
        return "intel"
    if "agx" in blob or "apple" in blob:
        return "apple"
    return "unknown"


def _accelerator_display_name(entry: dict[str, Any], vendor: str) -> str:
    for key in ("IORegistryEntryName", "IOClass", "IOObjectClass", "MetalPluginName"):
        raw = str(entry.get(key) or "").strip()
        if raw:
            return raw
    return f"{vendor}-gpu"


def parse_ioreg_accelerator_gpu(entry: dict[str, Any]) -> dict[str, Any] | None:
    """
    Build a gpu-block candidate from one IOAccelerator plist dict.

    Never treats ``gartSizeBytes`` as discrete VRAM (GART aperture ≠ board VRAM).
    """
    if not isinstance(entry, dict):
        return None
    vendor = _accelerator_vendor_hint(entry)
    stats = entry.get("PerformanceStatistics")
    if not isinstance(stats, dict):
        stats = {}

    util: float | None = None
    for key in ("Device Utilization %", "Renderer Utilization %", "Tiler Utilization %"):
        raw = stats.get(key)
        if isinstance(raw, (int, float)) and raw >= 0:
            util = float(raw)
            break

    total_gb: float | None = None
    dedicated = False
    for key in ("VRAM,totalMB", "VRAMTotalMB", "vramTotalMB"):
        raw = entry.get(key)
        if isinstance(raw, (int, float)) and raw > 0:
            total_gb = _mib_to_gb(float(raw))
            # Intel "Dynamic, Max" style totals are still useful but not discrete.
            dedicated = vendor == "amd"
            break

    used_bytes: float | None = None
    for key in ("inUseVidMemoryBytes", "In use video memory"):
        raw = stats.get(key)
        if isinstance(raw, (int, float)) and raw >= 0:
            used_bytes = float(raw)
            break
    if used_bytes is None and vendor != "apple":
        # Fallback: GART used is an approximation of GPU-mapped memory, not perfect VRAM.
        raw = stats.get("gartUsedBytes")
        if isinstance(raw, (int, float)) and raw >= 0:
            used_bytes = float(raw)

    # Apple Silicon: util OK; do not invent VRAM from unified / GART pools.
    if vendor == "apple":
        if util is None:
            return None
        return {
            "percent": util,
            "vramTotalGb": None,
            "vramUsedGb": None,
            "vramFreeGb": None,
            "vramSource": "ioreg",
            "name": _accelerator_display_name(entry, vendor),
            "_vendor": vendor,
            "_dedicated": False,
            "_rank_total": 0.0,
        }

    used_gb = _bytes_to_gb(used_bytes) if used_bytes is not None else None
    free_gb: float | None = None
    if total_gb is not None and used_gb is not None:
        free_gb = round(max(0.0, total_gb - used_gb), 3)

    if util is None and total_gb is None and used_gb is None:
        return None

    return {
        "percent": util,
        "vramTotalGb": total_gb,
        "vramUsedGb": used_gb,
        "vramFreeGb": free_gb,
        "vramSource": "ioreg",
        "name": _accelerator_display_name(entry, vendor),
        "_vendor": vendor,
        "_dedicated": dedicated,
        "_rank_total": float(total_gb or 0.0) + (1000.0 if dedicated else 0.0),
    }


def _merge_macos_gpu_candidates(
    profiler: list[dict[str, Any]],
    ioreg: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Pick the best macOS GPU: prefer dedicated VRAM (AMD), then largest total, then util."""
    candidates: list[dict[str, Any]] = []

    for p in profiler:
        name = str(p.get("name") or "").strip()
        total = p.get("vramTotalGb")
        if not name:
            continue
        dedicated = bool(p.get("dedicated"))
        vendor = "amd" if "radeon" in name.lower() or "amd" in name.lower() else (
            "intel" if "intel" in name.lower() else "unknown"
        )
        if vendor == "unknown" and not dedicated:
            # Dynamic-only Intel-style pool — still usable as a name/total hint.
            vendor = "intel" if p.get("dynamic") else "unknown"
        candidates.append(
            {
                "percent": None,
                "vramTotalGb": total,
                "vramUsedGb": None,
                "vramFreeGb": None,
                "vramSource": "system_profiler",
                "name": name,
                "_vendor": vendor,
                "_dedicated": dedicated,
                "_rank_total": float(total or 0.0) + (1000.0 if dedicated else 0.0),
            }
        )

    for entry in ioreg:
        parsed = parse_ioreg_accelerator_gpu(entry)
        if parsed is None:
            continue
        # Merge util/used into a matching profiler row when possible.
        merged = False
        for c in candidates:
            same_vendor = c.get("_vendor") == parsed.get("_vendor")
            name_hit = (
                ("radeon" in (c.get("name") or "").lower() and parsed.get("_vendor") == "amd")
                or ("intel" in (c.get("name") or "").lower() and parsed.get("_vendor") == "intel")
            )
            if same_vendor or name_hit:
                if parsed.get("percent") is not None:
                    c["percent"] = parsed["percent"]
                if c.get("vramTotalGb") is None and parsed.get("vramTotalGb") is not None:
                    c["vramTotalGb"] = parsed["vramTotalGb"]
                if parsed.get("vramUsedGb") is not None:
                    c["vramUsedGb"] = parsed["vramUsedGb"]
                    if c.get("vramTotalGb") is not None:
                        c["vramFreeGb"] = round(
                            max(0.0, float(c["vramTotalGb"]) - float(parsed["vramUsedGb"])),
                            3,
                        )
                if parsed.get("percent") is not None or parsed.get("vramUsedGb") is not None:
                    if str(c.get("vramSource") or "").startswith("system_profiler"):
                        c["vramSource"] = "system_profiler+ioreg"
                    elif not c.get("vramSource"):
                        c["vramSource"] = parsed.get("vramSource")
                merged = True
                break
        if not merged:
            candidates.append(parsed)

    if not candidates:
        return None

    candidates.sort(
        key=lambda c: (
            1 if c.get("_dedicated") else 0,
            float(c.get("_rank_total") or 0.0),
            1 if c.get("percent") is not None else 0,
            float(c.get("vramTotalGb") or 0.0),
        ),
        reverse=True,
    )
    best = candidates[0]
    out = {
        "percent": best.get("percent"),
        "vramTotalGb": best.get("vramTotalGb"),
        "vramUsedGb": best.get("vramUsedGb"),
        "vramFreeGb": best.get("vramFreeGb"),
        "vramSource": best.get("vramSource"),
        "name": best.get("name"),
    }
    # Drop empty blocks (Apple util-only is still useful).
    if (
        out["percent"] is None
        and out["vramTotalGb"] is None
        and out["vramUsedGb"] is None
    ):
        return None
    return out


def sample_macos_gpu() -> dict[str, Any] | None:
    """AMD / Intel / Apple GPU summary via system_profiler + IORegistry (no sudo)."""
    if sys.platform != "darwin":
        return None
    return _merge_macos_gpu_candidates(
        _macos_system_profiler_gpus(),
        _ioreg_accelerator_dicts(),
    )


def _read_sysfs_int(path: Path) -> int | None:
    try:
        return int(path.read_text(encoding="utf-8").strip().split()[0])
    except (OSError, ValueError, IndexError):
        return None


def sample_linux_amd_gpu() -> dict[str, Any] | None:
    """
    Linux AMD GPU via sysfs (``mem_info_vram_*``, ``gpu_busy_percent``).

    Prefers the card with the largest ``mem_info_vram_total``. ``rocm-smi`` is not
    required — the amdgpu sysfs nodes are enough when present.
    """
    if not sys.platform.startswith("linux"):
        return None
    drm = Path("/sys/class/drm")
    if not drm.is_dir():
        return None
    best: dict[str, Any] | None = None
    best_total = -1
    for card in sorted(drm.glob("card[0-9]*")):
        if "-" in card.name:  # skip card0-HDMI-A-1 style connectors
            continue
        device = card / "device"
        total = _read_sysfs_int(device / "mem_info_vram_total")
        if total is None or total <= 0:
            continue
        used = _read_sysfs_int(device / "mem_info_vram_used")
        busy = _read_sysfs_int(device / "gpu_busy_percent")
        vendor = (device / "vendor").read_text(encoding="utf-8").strip() if (device / "vendor").is_file() else ""
        # AMD PCI vendor 0x1002
        if vendor and vendor.lower() not in ("0x1002", "1002"):
            # Still accept if vram nodes exist (some stacks omit vendor file).
            if vendor.lower().startswith("0x") and vendor.lower() != "0x1002":
                continue
        name = f"amd-{card.name}"
        uevent = device / "uevent"
        if uevent.is_file():
            try:
                for line in uevent.read_text(encoding="utf-8").splitlines():
                    if line.startswith("DRIVER="):
                        name = f"{line.split('=', 1)[1].strip()}-{card.name}"
                        break
            except OSError:
                pass
        if total <= best_total:
            continue
        best_total = total
        used_gb = _bytes_to_gb(used) if used is not None else None
        total_gb = _bytes_to_gb(total)
        free_gb = (
            round(max(0.0, total_gb - used_gb), 3) if used_gb is not None else None
        )
        temp_c: float | None = None
        hwmon_root = device / "hwmon"
        if hwmon_root.is_dir():
            for hwmon in sorted(hwmon_root.glob("hwmon*")):
                milli = _read_sysfs_int(hwmon / "temp1_input")
                if milli is not None and milli > 0:
                    temp_c = _as_temp_c(milli / 1000.0)
                    if temp_c is not None:
                        break
        best = {
            "percent": float(busy) if busy is not None and busy >= 0 else None,
            "vramTotalGb": total_gb,
            "vramUsedGb": used_gb,
            "vramFreeGb": free_gb,
            "vramSource": "amdgpu-sysfs",
            "vendor": "amd",
            "backend": "amdgpu-sysfs",
            "name": name,
            "tempC": temp_c,
        }
    return best


def sample_linux_intel_gpu() -> dict[str, Any] | None:
    """
    Linux Intel iGPU — util from ``i915`` busy stats when present; VRAM usually shared.

    Does not invent discrete VRAM totals for integrated graphics.
    """
    if not sys.platform.startswith("linux"):
        return None
    drm = Path("/sys/class/drm")
    if not drm.is_dir():
        return None
    for card in sorted(drm.glob("card[0-9]*")):
        if "-" in card.name:
            continue
        device = card / "device"
        vendor = ""
        try:
            vendor = (device / "vendor").read_text(encoding="utf-8").strip().lower()
        except OSError:
            continue
        if vendor not in ("0x8086", "8086"):
            continue
        # Optional: gt busy from intel_gpu_frequency / actmon — often absent.
        busy = _read_sysfs_int(device / "gt_act_freq_mhz")  # presence probe only
        _ = busy
        # Without a real util counter, still identify the GPU name for clients.
        name = f"intel-{card.name}"
        return {
            "percent": None,
            "vramTotalGb": None,
            "vramUsedGb": None,
            "vramFreeGb": None,
            "vramSource": "i915-sysfs",
            "vendor": "intel",
            "backend": "i915-sysfs",
            "name": name,
        }
    return None


_gpu_sample_cache: tuple[float, dict[str, Any] | None] | None = None
_GPU_SAMPLE_TTL_SEC = 2.0


def sample_gpu() -> dict[str, Any] | None:
    """
    Best available portable GPU sample.

    Priority: Jetson host file → live nvidia-smi → NVIDIA host file → AMD host
    file → macOS (AMD/Intel/Apple IORegistry) → Linux AMD sysfs → Linux Intel
    identity stub. Cached briefly so catalog filters don't re-spawn
    ``system_profiler`` on every call.
    """
    global _gpu_sample_cache
    now = time.monotonic()
    if _gpu_sample_cache is not None:
        ts, cached = _gpu_sample_cache
        if (now - ts) < _GPU_SAMPLE_TTL_SEC:
            return dict(cached) if cached is not None else None

    hit: dict[str, Any] | None = None
    for sampler in (
        sample_jetson_host_file_gpu,
        sample_nvidia_gpu,
        sample_nvidia_host_file_gpu,
        sample_amd_host_file_gpu,
        sample_macos_gpu,
        sample_linux_amd_gpu,
        sample_linux_intel_gpu,
    ):
        try:
            hit = sampler()
        except Exception:  # noqa: BLE001
            hit = None
        if hit is not None:
            break
    _gpu_sample_cache = (now, dict(hit) if hit is not None else None)
    return dict(hit) if hit is not None else None


def _gpu_vram_block() -> dict[str, Any]:
    """
    Portable GPU summary for clients (util + VRAM + name).

    Distinct from Jetson ``jetson.gpu`` (jtop utilization). Honours
    ``AGENTIC_ASSUME_VRAM_GB`` for ``vramTotalGb``; util/used/free may still come
    from a live sampler when available, otherwise stay null under assume-only.
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

    sampled = sample_gpu()
    if sampled is None:
        if assume_gb is not None:
            out = _null_gpu_block()
            out["vramTotalGb"] = round(assume_gb, 3)
            out["vramSource"] = "assume"
            return out
        return _null_gpu_block()

    # Strip internal ranking keys if any leaked.
    sampled = {
        "percent": sampled.get("percent"),
        "vramTotalGb": sampled.get("vramTotalGb"),
        "vramUsedGb": sampled.get("vramUsedGb"),
        "vramFreeGb": sampled.get("vramFreeGb"),
        "vramSource": sampled.get("vramSource"),
        "vendor": sampled.get("vendor"),
        "backend": sampled.get("backend"),
        "name": sampled.get("name"),
        "freqMhz": sampled.get("freqMhz"),
        "tempC": _as_temp_c(sampled.get("tempC")),
    }

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
    cpu_temp = sample_cpu_temp_c() or _cpu_temp_from_host_snapshots()
    cpu_block: dict[str, Any] = {
        "percent": cpu_percent,
        "cores": os.cpu_count() or 0,
    }
    if cpu_temp is not None:
        cpu_block["tempC"] = cpu_temp
    base: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "hostname": socket.gethostname(),
        "platform": sys.platform,
        "arch": platform.machine(),
        "scope": metrics_scope(),
        "uptimeSec": _uptime_sec(),
        "loadAvg": _load_avg(),
        "cpu": cpu_block,
        "memory": sample_memory(),
        "gpu": _gpu_vram_block(),
    }
    return merge_jetson_into_metrics(base, read_jetson_jtop_snapshot())
