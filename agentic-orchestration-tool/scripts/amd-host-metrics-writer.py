#!/usr/bin/env python3
"""
Write host AMD GPU metrics to a JSON file for the engine / web UI.

Runs on the node (outside k8s) where amdgpu sysfs is visible. Pods mount
``var/agentic-metrics`` and read via ``AGENTIC_AMD_HOST_METRICS_PATH``.

  python3 amd-host-metrics-writer.py --output /var/projects/agentic-orchestration/var/agentic-metrics/amd-metrics.json
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT = (
    "/var/projects/agentic-orchestration/var/agentic-metrics/amd-metrics.json"
)


def _read_int(path: Path) -> int | None:
    try:
        return int(path.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None


def _bytes_to_gb(n: int) -> float:
    return round(float(n) / (1024.0**3), 3)


def sample_once() -> dict[str, Any]:
    drm = Path("/sys/class/drm")
    if not drm.is_dir():
        raise RuntimeError("no /sys/class/drm")
    best: dict[str, Any] | None = None
    best_total = -1
    for card in sorted(drm.glob("card[0-9]*")):
        if "-" in card.name:
            continue
        device = card / "device"
        total = _read_int(device / "mem_info_vram_total")
        if total is None or total <= 0:
            continue
        vendor = ""
        try:
            vendor = (device / "vendor").read_text(encoding="utf-8").strip().lower()
        except OSError:
            vendor = ""
        if vendor and vendor not in ("0x1002", "1002"):
            if vendor.startswith("0x") and vendor != "0x1002":
                continue
        used = _read_int(device / "mem_info_vram_used")
        busy = _read_int(device / "gpu_busy_percent")
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
        total_gb = _bytes_to_gb(total)
        used_gb = _bytes_to_gb(used) if used is not None else None
        free_gb = (
            round(max(0.0, total_gb - used_gb), 3) if used_gb is not None else None
        )
        temp_c = None
        hwmon_root = device / "hwmon"
        if hwmon_root.is_dir():
            for hwmon in sorted(hwmon_root.glob("hwmon*")):
                milli = _read_int(hwmon / "temp1_input")
                if milli is not None and milli > 0:
                    temp_c = round(milli / 1000.0, 1)
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
    if best is None:
        raise RuntimeError("no amdgpu VRAM nodes found")
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "amdgpu-sysfs",
        "gpu": best,
    }


def write_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    tmp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Host AMD GPU metrics writer")
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
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
        print(f"error: amd host metrics writer failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
