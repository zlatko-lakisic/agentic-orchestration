#!/usr/bin/env python3
"""
Write Jetson jtop (jetson-stats) metrics to a JSON file for the web UI.

Requires jtop.service (jetson-stats package). Run as root or a user in the jtop group.

  python3 jetson-jtop-metrics-writer.py --output /var/run/agentic/jtop-metrics.json

Typical deployment: systemd unit agentic-jtop-metrics.service (see deploy/systemd/).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


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


def _extract_gpu(jetson: Any, stats: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {"percent": None, "freqMhz": None}
    out["percent"] = _percent_from_text(stats.get("GPU"))
    try:
        gpu = jetson.gpu
    except Exception:
        gpu = None
    if gpu is None:
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


def sample_once(jetson: Any) -> dict[str, Any]:
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


def write_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Jetson jtop metrics writer for agentic web UI")
    parser.add_argument(
        "--output",
        default="/var/run/agentic/jtop-metrics.json",
        help="JSON file path (default: /var/run/agentic/jtop-metrics.json)",
    )
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between samples")
    parser.add_argument("--once", action="store_true", help="Write one sample and exit")
    args = parser.parse_args()
    out_path = Path(args.output)

    try:
        from jtop import jtop
    except ImportError:
        print("error: install jetson-stats (pip install jetson-stats)", file=sys.stderr)
        return 2

    try:
        with jtop() as jetson:
            if args.once:
                jetson.ok()
                write_snapshot(out_path, sample_once(jetson))
                return 0
            while True:
                if jetson.ok():
                    write_snapshot(out_path, sample_once(jetson))
                time.sleep(max(0.5, args.interval))
    except KeyboardInterrupt:
        return 0
    except Exception as exc:
        print(f"error: jtop metrics writer failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
