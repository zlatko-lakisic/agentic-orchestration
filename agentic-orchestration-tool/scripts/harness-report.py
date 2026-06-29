#!/usr/bin/env python3
"""Aggregate harness_runs/*.json into a summary report."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize agent harness run reports.")
    parser.add_argument(
        "--dir",
        default="harness_runs",
        help="Harness runs directory (default: harness_runs under tool root).",
    )
    parser.add_argument(
        "--tool-root",
        default=".",
        help="Agentic orchestration tool root (default: cwd).",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON summary.")
    args = parser.parse_args()

    root = Path(args.tool_root).resolve()
    runs_dir = Path(args.dir)
    if not runs_dir.is_absolute():
        runs_dir = root / runs_dir

    if not runs_dir.is_dir():
        print(f"error: harness runs dir not found: {runs_dir}", file=sys.stderr)
        return 2

    batch_files = sorted(runs_dir.glob("batch_*.json"))
    if not batch_files:
        print(f"no batch reports under {runs_dir}", file=sys.stderr)
        return 1

    statuses: Counter[str] = Counter()
    agents: Counter[str] = Counter()
    latest_by_agent: dict[str, dict] = {}

    for path in batch_files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            continue
        for item in data.get("results") or []:
            if not isinstance(item, dict):
                continue
            pid = str(item.get("provider_id", ""))
            status = str(item.get("status", ""))
            statuses[status] += 1
            agents[pid] += 1
            latest_by_agent[pid] = item

    summary = {
        "batch_files": len(batch_files),
        "result_rows": sum(statuses.values()),
        "status_counts": dict(statuses),
        "unique_agents": len(agents),
        "latest_by_agent": latest_by_agent,
    }

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print(f"batches: {summary['batch_files']}")
        print(f"results: {summary['result_rows']} across {summary['unique_agents']} agents")
        for k, v in sorted(statuses.items()):
            print(f"  {k}: {v}")
        failing = [pid for pid, item in latest_by_agent.items() if item.get("status") == "fail"]
        if failing:
            print("latest failures:", ", ".join(sorted(failing)[:20]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
