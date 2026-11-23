#!/usr/bin/env python3
"""Ada / #128 smoke: Wan (and optional LTX) via run_video_generation + client file_id.

Run inside the engine pod (tool hostPath mounted at /app/tool):

  python /app/tool/scripts/ada-video-smoke.py
  python /app/tool/scripts/ada-video-smoke.py --providers video_wan22_i2v,video_ltx23_distilled
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# Minimal valid 1x1 JPEG
_JPEG = bytes(
    [
        0xFF,
        0xD8,
        0xFF,
        0xE0,
        0x00,
        0x10,
        0x4A,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        0x01,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x00,
        0xFF,
        0xDB,
        0x00,
        0x43,
        0x00,
        *([0x10] * 64),
        0xFF,
        0xC0,
        0x00,
        0x0B,
        0x08,
        0x00,
        0x01,
        0x00,
        0x01,
        0x01,
        0x01,
        0x11,
        0x00,
        0xFF,
        0xC4,
        0x00,
        0x14,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x08,
        0xFF,
        0xC4,
        0x00,
        0x14,
        0x10,
        0x01,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0xFF,
        0xDA,
        0x00,
        0x08,
        0x01,
        0x01,
        0x00,
        0x00,
        0x3F,
        0x00,
        0x7F,
        0xFF,
        0xD9,
    ]
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tool-root",
        default="/app/tool",
        help="AO tool root inside the engine pod",
    )
    parser.add_argument(
        "--providers",
        default="video_wan22_i2v",
        help="Comma-separated provider ids",
    )
    parser.add_argument("--frames", type=int, default=17)
    args = parser.parse_args()

    tool = Path(args.tool_root)
    sys.path.insert(0, str(tool))

    from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
    from orchestration.client_files import resolve_client_file, save_client_file
    from orchestration.dynamic_run import catalog_paths
    from orchestration.user_context import Identity
    from orchestration.video_generation_runtime import run_video_generation

    ident = Identity(
        user_name="AdaSmoke",
        session_id="s-ada-smoke",
        user_id="ada-smoke",
        local=True,
        mtls=False,
    )
    meta = save_client_file(ident, _JPEG, "smoke.jpg", "image/jpeg")
    print("uploaded_file_id", meta["file_id"], flush=True)

    paths = catalog_paths(tool)
    entries = {
        str(e.get("id")): e
        for e in load_agent_providers_catalog_merged(paths.agent_providers)
    }
    wanted = [p.strip() for p in args.providers.split(",") if p.strip()]
    results = []
    for pid in wanted:
        entry = entries.get(pid)
        if entry is None:
            print(f"MISSING_PROVIDER {pid}", flush=True)
            return 2
        payload = {
            "prompt": "gentle camera push-in, soft light, vertical clip",
            "negative_prompt": "blurry, static",
            "start_image_file_id": meta["file_id"],
            "width": 544,
            "height": 960,
            "frames": int(args.frames),
            "seed": 42,
            "keep_audio": False,
        }
        print(f"START {pid} frames={args.frames}", flush=True)
        t0 = time.time()
        out = run_video_generation(
            entry,
            text=json.dumps(payload),
            tool_root=tool,
            identity=ident,
        )
        elapsed = round(time.time() - t0, 1)
        clip = resolve_client_file(ident, out["file_id"])
        row = {
            "provider": pid,
            "ok": out.get("ok"),
            "file_id": out.get("file_id"),
            "download_url": out.get("download_url"),
            "bytes": clip.stat().st_size,
            "elapsed_s": elapsed,
            "timings": out.get("timings"),
            "clips": out.get("clips"),
        }
        results.append(row)
        print(json.dumps(row, indent=2), flush=True)
    print("SMOKE_OK", json.dumps([r["provider"] for r in results]), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
