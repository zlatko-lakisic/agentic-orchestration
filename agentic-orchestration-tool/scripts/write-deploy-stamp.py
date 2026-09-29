#!/usr/bin/env python3
"""Write Admin deploy-stamp.json from the git checkout.

The coordinator pod does not mount ``.git``. Jetson deploy writes this stamp
into the Admin hostPath so the dashboard can show VERSION plus branch, commit,
or pull request when the checkout is ahead of the published tag.

Usage:
  python3 write-deploy-stamp.py /var/projects/agentic-orchestration
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def git(repo: Path, args: list[str]) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return (result.stdout or "").strip()


def read_version(repo: Path) -> str | None:
    for candidate in (repo / "VERSION", repo / "agentic-orchestration-tool" / "VERSION"):
        try:
            text = candidate.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if text.lower().startswith("v"):
            text = text[1:]
        if text:
            return text
    return None


def ensure_version_tag(repo: Path, version: str | None) -> None:
    if not version:
        return
    tag = f"v{version}"
    if git(repo, ["rev-parse", "-q", "--verify", f"refs/tags/{tag}^{{commit}}"]):
        return
    subprocess.run(
        ["git", "-C", str(repo), "fetch", "origin", "tag", tag, "--no-tags"],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )


def main() -> int:
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not (repo / ".git").exists():
        print(f"error: {repo} is not a git checkout", file=sys.stderr)
        return 1
    sha = git(repo, ["rev-parse", "HEAD"])
    if not sha:
        print(f"error: git rev-parse failed in {repo}", file=sys.stderr)
        return 1
    version = read_version(repo)
    ensure_version_tag(repo, version)
    branch = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]) or "HEAD"
    subject = git(repo, ["log", "-1", "--format=%s"]) or ""
    decorations = git(repo, ["log", "-1", "--format=%D"]) or ""
    upstream = ""
    branch_config = ""
    if branch != "HEAD":
        upstream = (
            git(repo, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]) or ""
        )
        listed = git(repo, ["config", "--local", "--list"]) or ""
        prefix = f"branch.{branch}."
        branch_config = "\n".join(line for line in listed.splitlines() if line.startswith(prefix))
    pointing_raw = git(repo, ["for-each-ref", "--points-at", "HEAD", "--format=%(refname)"]) or ""
    pointing_refs = [line for line in pointing_raw.splitlines() if line.strip()]
    ahead = None
    if version:
        tag_sha = git(repo, ["rev-parse", "-q", "--verify", f"v{version}^{{commit}}"])
        if tag_sha:
            count = git(repo, ["rev-list", "--count", f"{tag_sha}..HEAD"])
            if count is not None and count.isdigit():
                ahead = int(count)
    stamp = {
        "version": version,
        "sha": sha,
        "branch": branch,
        "subject": subject,
        "decorations": decorations,
        "upstream": upstream,
        "branchConfig": branch_config,
        "pointingRefs": pointing_refs,
        "ahead": ahead,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    dest = repo / "agentic-orchestration-web" / "public" / "admin" / "deploy-stamp.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(stamp, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
