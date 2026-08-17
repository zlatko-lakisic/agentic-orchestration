#!/usr/bin/env python3
"""Cluster home-assistant watering LLM calls from API-token + Reach usage ledgers."""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timedelta
from pathlib import Path

DEFAULT_API = Path("/mnt/nvme/projects/agentic-orchestration/var/agentic-api-tokens/usage.jsonl")
DEFAULT_LLM = Path(
    "/mnt/nvme/projects/agentic-orchestration/agentic-orchestration-tool"
    "/__orchestrator_llm_usage__/usage.jsonl"
)


def _load_jsonl(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def _iso_ts(raw: object) -> datetime:
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(float(raw))
    text = str(raw or "").replace("Z", "+00:00")
    return datetime.fromisoformat(text)


def _normalize_api_rows(rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for r in rows:
        if r.get("path") != "/v1/chat/completions":
            continue
        app = str(r.get("appId") or "")
        if app not in ("home-assistant", "agentic-watering"):
            continue
        out.append(
            {
                "ts": _iso_ts(r.get("ts")),
                "source": "api_tokens",
                "status": int(r.get("status") or 0),
                "latencyMs": r.get("latencyMs"),
                "runId": r.get("runId"),
                "mirror": r.get("source") == "llm_usage_mirror",
            }
        )
    return out


def _normalize_llm_rows(rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for r in rows:
        app = str(r.get("appId") or "")
        if app not in ("home-assistant", "agentic-watering") and "water" not in app.lower():
            continue
        out.append(
            {
                "ts": _iso_ts(r.get("ts")),
                "source": "llm_usage",
                "status": 200 if r.get("ok", True) else 502,
                "latencyMs": r.get("latencyMs"),
                "runId": r.get("runId"),
                "mirror": False,
            }
        )
    return out


def cluster_cycles(rows: list[dict], gap_minutes: int = 90) -> list[list[dict]]:
    if not rows:
        return []
    rows = sorted(rows, key=lambda r: r["ts"])
    cycles: list[list[dict]] = []
    cur: list[dict] = []
    last: datetime | None = None
    for r in rows:
        if last and (r["ts"] - last) > timedelta(minutes=gap_minutes):
            if cur:
                cycles.append(cur)
            cur = []
        cur.append(r)
        last = r["ts"]
    if cur:
        cycles.append(cur)
    return cycles


def _parse_ha_logbook(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("entries") if isinstance(data, dict) else data
    if not isinstance(entries, list):
        return []
    zone_re = re.compile(r"Zone (.+?) LLM full response \(HTTP (\d+)")
    out: list[dict] = []
    for e in entries:
        msg = e.get("message") or ""
        m = zone_re.search(msg)
        if not m:
            continue
        out.append(
            {
                "ts": _iso_ts(e.get("when")),
                "zone": m.group(1),
                "http": int(m.group(2)),
            }
        )
    return sorted(out, key=lambda r: r["ts"])


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--api-usage", type=Path, default=DEFAULT_API)
    p.add_argument("--llm-usage", type=Path, default=DEFAULT_LLM)
    p.add_argument("--ha-logbook", type=Path, default=None)
    p.add_argument("--last", type=int, default=10)
    args = p.parse_args()

    api_rows = _normalize_api_rows(_load_jsonl(args.api_usage))
    llm_rows = _normalize_llm_rows(_load_jsonl(args.llm_usage))
    merged = api_rows + llm_rows
    merged.sort(key=lambda r: r["ts"])

    cycles = cluster_cycles(merged)
    print(f"api_rows={len(api_rows)} llm_rows={len(llm_rows)} merged={len(merged)} cycles={len(cycles)}")
    print("--- last cycles ---")
    start_idx = max(1, len(cycles) - args.last + 1)
    for i, c in enumerate(cycles[-args.last :], start=start_idx):
        err = sum(1 for x in c if int(x.get("status") or 0) >= 400)
        lat = sorted(
            int(x["latencyMs"])
            for x in c
            if isinstance(x.get("latencyMs"), (int, float))
        )
        med = lat[len(lat) // 2] if lat else 0
        mirrors = sum(1 for x in c if x.get("mirror"))
        print(
            f"#{i} {c[0]['ts'].isoformat()} .. {c[-1]['ts'].isoformat()} "
            f"n={len(c)} err={err} med={med}ms mirrors={mirrors}"
        )

    if args.ha_logbook:
        zones = _parse_ha_logbook(args.ha_logbook)
        print(f"--- HA logbook zones ({len(zones)}) ---")
        for z in zones[-20:]:
            print(f"  {z['ts'].isoformat()} {z['zone']} HTTP{z['http']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
