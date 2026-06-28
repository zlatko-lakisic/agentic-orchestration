#!/usr/bin/env python3
"""Bump VERSION and finalize CHANGELOG for a release."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "VERSION"
CHANGELOG_FILE = ROOT / "CHANGELOG.md"

_UNRELEASED_HEADER = "## [Unreleased]"
_VERSION_HEADER_RE = re.compile(r"^## \[(?P<ver>\d+\.\d+\.\d+)\]", re.MULTILINE)


def read_version() -> tuple[int, int, int]:
    raw = VERSION_FILE.read_text(encoding="utf-8").strip()
    parts = raw.split(".")
    if len(parts) != 3:
        raise SystemExit(f"Invalid VERSION (expected X.Y.Z): {raw!r}")
    return int(parts[0]), int(parts[1]), int(parts[2])


def write_version(major: int, minor: int, patch: int) -> str:
    ver = f"{major}.{minor}.{patch}"
    VERSION_FILE.write_text(ver + "\n", encoding="utf-8")
    return ver


def bump(current: tuple[int, int, int], kind: str) -> tuple[int, int, int]:
    major, minor, patch = current
    if kind == "major":
        return major + 1, 0, 0
    if kind == "minor":
        return major, minor + 1, 0
    if kind == "patch":
        return major, minor, patch + 1
    raise SystemExit(f"Unknown bump kind: {kind!r}")


def finalize_changelog(new_version: str, release_date: str, *, dry_run: bool) -> None:
    text = CHANGELOG_FILE.read_text(encoding="utf-8")
    if _UNRELEASED_HEADER not in text:
        raise SystemExit(f"{CHANGELOG_FILE.name} missing {_UNRELEASED_HEADER!r}")

    start = text.index(_UNRELEASED_HEADER)
    rest = text[start + len(_UNRELEASED_HEADER) :]
    next_hdr = rest.find("\n## [")
    if next_hdr == -1:
        unreleased_body = rest.strip()
        tail = ""
    else:
        unreleased_body = rest[:next_hdr].strip()
        tail = rest[next_hdr:]

    unreleased_body = re.sub(r"<!--.*?-->", "", unreleased_body, flags=re.DOTALL).strip()

    if not unreleased_body or unreleased_body == "### Added":
        print(
            "Warning: [Unreleased] section looks empty; add notes before releasing.",
            file=sys.stderr,
        )

    new_section = (
        f"{_UNRELEASED_HEADER}\n\n"
        f"## [{new_version}] - {release_date}\n\n"
        f"{unreleased_body}\n"
    )
    new_text = text[:start] + new_section + tail
    if dry_run:
        print("--- CHANGELOG preview ---")
        print(new_section)
        print("--- end preview ---")
        return
    CHANGELOG_FILE.write_text(new_text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a semver release.")
    parser.add_argument(
        "bump",
        choices=("major", "minor", "patch"),
        help="Semver bump kind",
    )
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Release date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print new version and changelog preview only",
    )
    args = parser.parse_args()

    current = read_version()
    new_tuple = bump(current, args.bump)
    new_version = ".".join(str(n) for n in new_tuple)
    tag = f"v{new_version}"

    print(f"Current: {'.'.join(map(str, current))}")
    print(f"New:     {new_version}  (tag {tag})")

    finalize_changelog(new_version, args.date, dry_run=args.dry_run)

    if args.dry_run:
        print(f"Would write VERSION={new_version}")
        return

    write_version(*new_tuple)
    print(f"Updated {VERSION_FILE.name} and {CHANGELOG_FILE.name}")
    print()
    print("Next steps:")
    print(f"  git add VERSION CHANGELOG.md")
    print(f'  git commit -m "Release {tag}"')
    print(f'  git tag -a {tag} -m "Release {tag}"')
    print(f"  git push github main")
    print(f"  git push github {tag}")


if __name__ == "__main__":
    main()
