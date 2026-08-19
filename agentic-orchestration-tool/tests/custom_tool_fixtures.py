"""Test helpers for custom-tool sandbox fixtures."""

from __future__ import annotations

import io
import json
import subprocess
import sys
import zipfile
from pathlib import Path

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "custom_tools" / "mock_echo_tool"


def build_mock_echo_wheel(dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [sys.executable, "-m", "pip", "wheel", str(FIXTURE_ROOT), "-w", str(dest_dir), "--no-deps"],
        check=True,
        capture_output=True,
        text=True,
    )
    wheels = sorted(dest_dir.glob("mock_echo_tool-*.whl"))
    if not wheels:
        raise RuntimeError("mock_echo_tool wheel build produced no output")
    return wheels[-1]


def build_mock_echo_upload_zip(tmp_path: Path) -> bytes:
    wheel_dir = tmp_path / "wheels"
    wheel_path = build_mock_echo_wheel(wheel_dir)
    manifest = json.loads((FIXTURE_ROOT / "manifest.json").read_text(encoding="utf-8"))
    manifest["wheel"] = wheel_path.name
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
        zf.write(wheel_path, arcname=wheel_path.name)
    return buf.getvalue()
