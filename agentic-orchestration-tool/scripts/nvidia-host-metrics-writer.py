#!/usr/bin/env python3
"""
Write host NVIDIA GPU metrics to a JSON file for the engine / web UI.

Runs on the node (outside k8s) where ``nvidia-smi`` can see the GPU. The engine
pod mounts ``/var/run/agentic`` and reads the snapshot via
``AGENTIC_NVIDIA_HOST_METRICS_PATH`` (see ``orchestration.host_metrics``).

  python3 nvidia-host-metrics-writer.py --output /var/run/agentic/nvidia-metrics.json

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


def _parse_nvidia_smi_csv(stdout: str) -> dict[str, Any] | None:
    """
    Parse ``nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free``.

    Picks the GPU with the largest ``memory.total``.
    """
    best: dict[str, Any] | None = None
    best_total_mib = -1.0
    for raw_line in (stdout or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.rsplit(",", 4)]
        if len(parts) != 5:
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


def sample_once() -> dict[str, Any]:
    if shutil.which("nvidia-smi") is None:
        raise RuntimeError("nvidia-smi not found on PATH")
    proc = subprocess.run(
        [
            "nvidia-smi",
            "--query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free",
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
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": "nvidia-smi",
        "gpu": gpu,
    }


def write_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    tmp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Host NVIDIA metrics writer for agentic engine / KnowBuddy monitor"
    )
    parser.add_argument(
        "--output",
        default="/var/run/agentic/nvidia-metrics.json",
        help="JSON file path (default: /var/run/agentic/nvidia-metrics.json)",
    )
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between samples")
    parser.add_argument("--once", action="store_true", help="Write one sample and exit")
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
