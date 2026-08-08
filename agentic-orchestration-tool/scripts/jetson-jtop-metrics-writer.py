#!/usr/bin/env python3
"""
Write Jetson GPU / host metrics JSON for the web UI.

Primary source: jtop (jetson-stats) when the process can talk to jtop.service
(root or member of the jtop group). Fallback: tegrastats + sysfs (no special
group required).

  python3 jetson-jtop-metrics-writer.py --output /var/projects/agentic-orchestration/var/agentic-metrics/jtop-metrics.json

Typical deployment: systemd unit agentic-jtop-metrics.service (system or --user).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT = (
    "/var/projects/agentic-orchestration/var/agentic-metrics/jtop-metrics.json"
)


def _percent_from_text(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text or text in ("off", "none", "n/a"):
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    if not m:
        return None
    return round(float(m.group(1)), 1)


def _mhz_from_freq(freq: Any) -> float | None:
    if freq is None:
        return None
    if isinstance(freq, (int, float)):
        hz = float(freq)
        return round(hz / 1_000_000, 0) if hz > 10_000 else round(hz, 0)
    if isinstance(freq, dict):
        cur = freq.get("cur") or freq.get("gpu") or freq.get("val")
        return _mhz_from_freq(cur)
    m = re.search(r"(\d+)", str(freq))
    if not m:
        return None
    hz = float(m.group(1))
    return round(hz / 1_000_000, 0) if hz > 10_000 else hz


def _board_name() -> str:
    for path in (
        Path("/proc/device-tree/model"),
        Path("/sys/firmware/devicetree/base/model"),
    ):
        try:
            raw = path.read_bytes().split(b"\x00", 1)[0].decode("utf-8", "replace").strip()
            if raw:
                return raw
        except OSError:
            continue
    return "Jetson GPU"


def _sysfs_gpu_freq_mhz() -> float | None:
    candidates = [
        Path("/sys/class/devfreq/17000000.gpu/cur_freq"),
        Path("/sys/devices/platform/17000000.gpu/devfreq/17000000.gpu/cur_freq"),
        Path("/sys/devices/gpu.0/devfreq/17000000.gpu/cur_freq"),
    ]
    for path in candidates:
        try:
            raw = path.read_text(encoding="utf-8").strip()
            return _mhz_from_freq(float(raw))
        except (OSError, ValueError):
            continue
    return None


def _extract_gpu(jetson: Any, stats: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {"percent": None, "freqMhz": None, "name": _board_name()}
    out["percent"] = _percent_from_text(stats.get("GPU"))
    try:
        gpu = jetson.gpu
    except Exception:
        gpu = None
    if gpu is None:
        if out["freqMhz"] is None:
            out["freqMhz"] = _sysfs_gpu_freq_mhz()
        return out
    try:
        if hasattr(gpu, "items"):
            items = list(gpu.items())
        elif isinstance(gpu, dict):
            items = list(gpu.items())
        else:
            items = []
    except Exception:
        items = []
    for _key, block in items:
        if not isinstance(block, dict):
            continue
        status = block.get("status") if isinstance(block.get("status"), dict) else block
        if out["percent"] is None:
            for k in ("load", "gpu", "val", "utilization"):
                p = _percent_from_text(status.get(k) if isinstance(status, dict) else None)
                if p is not None:
                    out["percent"] = p
                    break
        freq = block.get("freq") if isinstance(block.get("freq"), dict) else status
        mhz = _mhz_from_freq(freq)
        if mhz is not None:
            out["freqMhz"] = mhz
    if out["freqMhz"] is None:
        out["freqMhz"] = _sysfs_gpu_freq_mhz()
    return out


def _extract_temperatures(jetson: Any) -> dict[str, float]:
    out: dict[str, float] = {}
    try:
        temp = jetson.temperature
    except Exception:
        return out
    if not isinstance(temp, dict):
        return out
    for key, val in temp.items():
        if isinstance(val, (int, float)):
            out[str(key)] = round(float(val), 1)
        elif isinstance(val, dict) and "temp" in val:
            try:
                out[str(key)] = round(float(val["temp"]), 1)
            except (TypeError, ValueError):
                pass
    return out


def _extract_power_watts(jetson: Any) -> float | None:
    try:
        power = jetson.power
    except Exception:
        return None
    if not isinstance(power, dict):
        return None
    total = power.get("tot") or power.get("total") or power.get("all")
    if isinstance(total, dict):
        for k in ("power", "avg", "cur", "val"):
            if k in total:
                try:
                    return round(float(total[k]) / 1000.0, 2)
                except (TypeError, ValueError):
                    pass
    if isinstance(total, (int, float)):
        v = float(total)
        return round(v / 1000.0, 2) if v > 500 else round(v, 2)
    return None


def sample_once_jtop(jetson: Any) -> dict[str, Any]:
    stats = dict(jetson.stats) if jetson.stats else {}
    cpu_vals = [
        _percent_from_text(stats.get(k))
        for k in stats
        if str(k).upper().startswith("CPU")
    ]
    cpu_vals = [v for v in cpu_vals if v is not None]
    cpu_avg = round(sum(cpu_vals) / len(cpu_vals), 1) if cpu_vals else None
    ram_text = stats.get("RAM") or stats.get("Mem")
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "jtop",
        "stats": stats,
        "cpu": {"percent": cpu_avg},
        "gpu": _extract_gpu(jetson, stats),
        "temperature": _extract_temperatures(jetson),
        "powerW": _extract_power_watts(jetson),
        "ramText": str(ram_text) if ram_text else None,
    }


def _parse_tegrastats_line(line: str) -> dict[str, Any]:
    """Parse one tegrastats line into the same shape as sample_once_jtop()."""
    cpu_vals = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)%", line.split("GR3D", 1)[0])]
    # Prefer per-core CPU[...] block values only (drop leading noise before CPU [).
    cpu_block = re.search(r"CPU\s*\[([^\]]+)\]", line)
    if cpu_block:
        cpu_vals = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)%", cpu_block.group(1))]
    cpu_avg = round(sum(cpu_vals) / len(cpu_vals), 1) if cpu_vals else None

    gpu_m = re.search(r"GR3D_FREQ\s+(\d+(?:\.\d+)?)%", line)
    gpu_percent = round(float(gpu_m.group(1)), 1) if gpu_m else None

    ram_m = re.search(r"RAM\s+(\d+)/(\d+)MB", line, re.I)
    ram_text = None
    if ram_m:
        used_gb = round(int(ram_m.group(1)) / 1024.0, 1)
        total_gb = round(int(ram_m.group(2)) / 1024.0, 1)
        ram_text = f"{used_gb}/{total_gb}GB"

    temps: dict[str, float] = {}
    for name, val in re.findall(r"([A-Za-z0-9_]+)@([\d.]+)C", line):
        temps[name] = round(float(val), 1)

    power_mw = 0.0
    power_n = 0
    for _rail, mw in re.findall(r"(VDD_[A-Z0-9_]+)\s+(\d+)mW", line):
        power_mw += float(mw)
        power_n += 1
    power_w = round(power_mw / 1000.0, 2) if power_n else None

    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "tegrastats",
        "stats": {"raw": line.strip()},
        "cpu": {"percent": cpu_avg},
        "gpu": {
            "percent": gpu_percent,
            "freqMhz": _sysfs_gpu_freq_mhz(),
            "name": _board_name(),
        },
        "temperature": temps,
        "powerW": power_w,
        "ramText": ram_text,
    }


def sample_once_tegrastats(timeout_sec: float = 3.0) -> dict[str, Any]:
    if not any(
        Path(p).is_file()
        for p in ("/usr/bin/tegrastats", "/usr/local/bin/tegrastats")
    ) and not _which("tegrastats"):
        raise RuntimeError("tegrastats not found on PATH")
    # One sample: run briefly and take the last complete line.
    try:
        proc = subprocess.run(
            ["tegrastats", "--interval", "500"],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        text = (proc.stdout or "") + (proc.stderr or "")
    except subprocess.TimeoutExpired as exc:
        text = (exc.stdout or "") + (exc.stderr or "")
        if isinstance(text, bytes):
            text = text.decode("utf-8", "replace")
    lines = [ln.strip() for ln in text.splitlines() if "GR3D" in ln or "RAM" in ln]
    if not lines:
        raise RuntimeError("tegrastats produced no usable output")
    return _parse_tegrastats_line(lines[-1])


def _which(cmd: str) -> str | None:
    for d in os.environ.get("PATH", "").split(os.pathsep):
        p = Path(d) / cmd
        if p.is_file() and os.access(p, os.X_OK):
            return str(p)
    return None


def write_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    tmp.replace(path)


def _run_jtop_loop(out_path: Path, interval: float, once: bool) -> int:
    from jtop import jtop

    with jtop() as jetson:
        if once:
            jetson.ok()
            write_snapshot(out_path, sample_once_jtop(jetson))
            return 0
        while True:
            if jetson.ok():
                write_snapshot(out_path, sample_once_jtop(jetson))
            time.sleep(max(0.5, interval))
    return 0


def _run_tegrastats_loop(out_path: Path, interval: float, once: bool) -> int:
    # Streaming mode: keep tegrastats open and parse lines.
    if once:
        write_snapshot(out_path, sample_once_tegrastats())
        return 0

    cmd = ["tegrastats", "--interval", str(max(500, int(interval * 1000)))]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    assert proc.stdout is not None
    try:
        for line in proc.stdout:
            if "RAM" not in line and "GR3D" not in line:
                continue
            write_snapshot(out_path, _parse_tegrastats_line(line))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Jetson metrics writer (jtop or tegrastats) for agentic web UI"
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"JSON file path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between samples")
    parser.add_argument("--once", action="store_true", help="Write one sample and exit")
    parser.add_argument(
        "--source",
        choices=("auto", "jtop", "tegrastats"),
        default="auto",
        help="Metrics backend (default: auto — jtop then tegrastats)",
    )
    args = parser.parse_args()
    out_path = Path(args.output)

    prefer = args.source
    errors: list[str] = []

    if prefer in ("auto", "jtop"):
        try:
            return _run_jtop_loop(out_path, args.interval, args.once)
        except ImportError as exc:
            errors.append(f"jtop import failed: {exc}")
            if prefer == "jtop":
                print(f"error: {errors[-1]}", file=sys.stderr)
                return 2
        except Exception as exc:
            errors.append(f"jtop failed: {exc}")
            if prefer == "jtop":
                print(f"error: jtop metrics writer failed: {exc}", file=sys.stderr)
                return 1

    if prefer in ("auto", "tegrastats"):
        try:
            return _run_tegrastats_loop(out_path, args.interval, args.once)
        except KeyboardInterrupt:
            return 0
        except Exception as exc:
            errors.append(f"tegrastats failed: {exc}")
            print(
                "error: metrics writer failed:\n  - " + "\n  - ".join(errors),
                file=sys.stderr,
            )
            return 1

    print("error: no metrics source available:\n  - " + "\n  - ".join(errors), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
