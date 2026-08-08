#!/usr/bin/env python3
"""
Write host NVIDIA GPU metrics to a JSON file for the engine / web UI.

Runs on the node (outside k8s) where ``nvidia-smi`` can see the GPU. Pods mount
``var/agentic-metrics`` and read via ``AGENTIC_NVIDIA_HOST_METRICS_PATH``
(see ``orchestration.host_metrics``).

  python3 nvidia-host-metrics-writer.py --output /var/projects/agentic-orchestration/var/agentic-metrics/nvidia-metrics.json

Typical deployment: systemd unit ``agentic-nvidia-metrics.service``.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _mib_to_gb(mib: float) -> float:
    return round(float(mib) / 1024.0, 3)


def _as_temp_c(value: Any) -> float | None:
    try:
        c = float(value)
    except (TypeError, ValueError):
        return None
    if -100.0 < c < 200.0:
        return round(c, 1)
    return None


def sample_cpu_temp_c() -> float | None:
    thermal = Path("/sys/class/thermal")
    if not thermal.is_dir():
        return None
    preferred = (
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
    for pref in preferred:
        if pref in by_type:
            return round(by_type[pref], 1)
        for ztype, val in by_type.items():
            if pref in ztype:
                return round(val, 1)
    return round(first, 1) if first is not None else None


def _parse_nvidia_smi_csv(stdout: str) -> dict[str, Any] | None:
    """
    Parse ``nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free,temperature.gpu``.

    Picks the GPU with the largest ``memory.total``. Temperature is optional.
    """
    best: dict[str, Any] | None = None
    best_total_mib = -1.0
    for raw_line in (stdout or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # Prefer 6 fields (…,free,temp) when the trailing token looks like °C.
        parts6 = [p.strip() for p in line.rsplit(",", 5)]
        temp_s = None
        name = util_s = total_s = used_s = free_s = ""
        used_six = False
        if len(parts6) == 6:
            try:
                temp_candidate = float(parts6[-1])
                total_candidate = float(parts6[2])
            except ValueError:
                temp_candidate = None
                total_candidate = None
            if (
                temp_candidate is not None
                and total_candidate is not None
                and -40.0 <= temp_candidate <= 150.0
                and total_candidate > temp_candidate
            ):
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
        temp_c = None
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


def sample_once() -> dict[str, Any]:
    if shutil.which("nvidia-smi") is None:
        raise RuntimeError("nvidia-smi not found on PATH")
    proc = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free,temperature.gpu",
            "--format=csv,noheader,nounits",
        ],
        capture_output=True,
        text=True,
        timeout=8,
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
        raise RuntimeError(f"nvidia-smi failed: {err}")
    gpu = _parse_nvidia_smi_csv(proc.stdout)
    if gpu is None:
        raise RuntimeError("nvidia-smi returned no parseable GPU rows")
    payload: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "nvidia-smi",
        "gpu": gpu,
    }
    cpu_temp = sample_cpu_temp_c()
    if cpu_temp is not None:
        payload["cpu"] = {"tempC": cpu_temp}
    return payload


def write_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    tmp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Host NVIDIA GPU metrics writer")
    parser.add_argument(
        "--output",
        default="/var/projects/agentic-orchestration/var/agentic-metrics/nvidia-metrics.json",
    )
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    out_path = Path(args.output)
    try:
        if args.once:
            write_snapshot(out_path, sample_once())
            return 0
        while True:
            write_snapshot(out_path, sample_once())
            time.sleep(max(0.5, args.interval))
    except KeyboardInterrupt:
        return 0
    except Exception as exc:
        print(f"error: nvidia host metrics writer failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
