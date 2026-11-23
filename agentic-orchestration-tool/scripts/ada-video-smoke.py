#!/usr/bin/env python3
"""Ada / #128 smoke: Wan (and optional LTX) via run_video_generation + client file_id.

Run inside the engine pod (tool hostPath mounted at /app/tool):

  python /app/tool/scripts/ada-video-smoke.py
  python /app/tool/scripts/ada-video-smoke.py --providers video_wan22_i2v,video_ltx23_distilled
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import time
from pathlib import Path


def _make_start_image(*, width: int = 544, height: int = 960) -> tuple[bytes, str, str]:
    """Real vertical still — tiny JPEGs break ComfyUI LoadImage (fillborders)."""
    from PIL import Image

    img = Image.new("RGB", (width, height), color=(40, 90, 140))
    for y in range(0, height, 64):
        for x in range(0, width, 64):
            if ((x // 64) + (y // 64)) % 2 == 0:
                for dy in range(min(32, height - y)):
                    for dx in range(min(32, width - x)):
                        img.putpixel((x + dx, y + dy), (200, 160, 80))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "smoke.jpg", "image/jpeg"


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
    img_bytes, img_name, img_mime = _make_start_image()
    meta = save_client_file(ident, img_bytes, img_name, img_mime)
    print("uploaded_file_id", meta["file_id"], "bytes", len(img_bytes), flush=True)

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
