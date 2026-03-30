"""Run real npm checks on saved artifact trees (after files are on disk)."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


def _load_scripts(package_json: Path) -> dict[str, str]:
    try:
        data = json.loads(package_json.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return {}
    scripts = data.get("scripts")
    if not isinstance(scripts, dict):
        return {}
    out: dict[str, str] = {}
    for k, v in scripts.items():
        if isinstance(k, str) and isinstance(v, str):
            out[k] = v
    return out


def _run(cmd: list[str], cwd: Path, *, timeout: int) -> int:
    print(f"(verify) cwd={cwd} {' '.join(cmd)}", file=sys.stderr)
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
    except subprocess.TimeoutExpired:
        print(f"(verify) timeout after {timeout}s: {' '.join(cmd)}", file=sys.stderr)
        return 124
    if proc.stdout:
        sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    return int(proc.returncode)


def verify_saved_npm_projects(
    output_base: Path,
    *,
    timeout_install: int = 600,
    timeout_run: int = 300,
) -> None:
    base = output_base.resolve()
    if not base.is_dir():
        print(f"(verify) Not a directory: {base}", file=sys.stderr)
        return

    npm = shutil.which("npm")
    if not npm:
        print("(verify) npm not on PATH; skipped npm checks.", file=sys.stderr)
        return

    roots: list[Path] = []
    for p in sorted(base.rglob("package.json")):
        if not p.is_file():
            continue
        if "node_modules" in p.parts:
            continue
        roots.append(p.parent)

    if not roots:
        print(
            "(verify) No package.json under saved output; nothing to verify with npm.",
            file=sys.stderr,
        )
        return

    for proj in roots:
        print(f"\n=== (verify) project: {proj} ===\n", file=sys.stderr)
        scripts = _load_scripts(proj / "package.json")
        rc = _run(
            [npm, "ci"] if (proj / "package-lock.json").is_file() else [npm, "install", "--no-fund", "--no-audit"],
            proj,
            timeout=timeout_install,
        )
        if rc != 0:
            print(f"(verify) dependency install failed ({rc}) in {proj}", file=sys.stderr)
            continue

        ran = False
        test_script = scripts.get("test", "").strip()
        if test_script:
            rc = _run([npm, "test"], proj, timeout=timeout_run)
            ran = True
            if rc != 0:
                print(f"(verify) npm test failed ({rc}) in {proj}", file=sys.stderr)

        build_script = scripts.get("build", "").strip()
        if not ran and build_script:
            rc = _run([npm, "run", "build"], proj, timeout=timeout_run)
            if rc != 0:
                print(f"(verify) npm run build failed ({rc}) in {proj}", file=sys.stderr)
            ran = True

        if not ran:
            print(
                "(verify) No scripts.test or scripts.build; ran install only.",
                file=sys.stderr,
            )
