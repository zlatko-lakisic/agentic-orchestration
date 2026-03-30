from __future__ import annotations

import re
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import Any

HEADER_PATH = re.compile(
    r"^#{2,6}\s+(?:(?:Path|File|Filename)\s*:\s*)?(?:`([^`]+)`|([^\s`][^\s`]*\.[a-zA-Z0-9]{1,20}))\s*$",
    re.IGNORECASE,
)
# e.g. **src/App.tsx** or **`components/Nav.tsx`**
STARS_PATH = re.compile(r"^\*\*(.+?)\*\*\s*$")
# e.g. File: index.php  |  Filename: foo/bar.ts
FILE_LABEL = re.compile(
    r"^(?:File|Path|Filename)\s*:\s*`?([^\s`]+)`?\s*$",
    re.IGNORECASE,
)

# Characters illegal in Windows file names (and signs of JSON/code pasted as a “path”).
_WIN_BAD_IN_PATH = re.compile(r'[<>:"|?*\x00-\x1f]')


def _looks_like_llm_refusal(text: str) -> bool:
    """Detect when the final agent returned an apology/JSON error instead of file artifacts."""
    t = text.strip().lower()
    if not t:
        return False
    phrases = (
        "i'm sorry",
        "i am sorry",
        "i cannot ",
        "i can't ",
        "can't complete",
        "cannot complete",
        "don't have enough",
        "do not have enough",
        "unable to generate",
        "unable to assist",
        "can't assist",
        "cannot assist",
        "if you have a more specific",
        "don't have the capability",
    )
    if any(p in t for p in phrases):
        return True
    if '"error"' in t and ("sorry" in t or "can't" in t or "cannot" in t):
        return True
    return False


def _normalize_artifact_path_label(path_str: str) -> str | None:
    """Strip markdown/JSON debris so we don't create paths like '\"bundle.js\",'."""
    s = path_str.strip()
    for _ in range(8):
        t = s.strip().strip('"').strip("'").strip()
        if t.endswith(","):
            t = t[:-1].strip()
        if t == s:
            break
        s = t
    if not s or s.startswith("http"):
        return None
    if any(c in s for c in "\n\r\t"):
        return None
    if '"' in s or "'" in s:
        return None
    if _WIN_BAD_IN_PATH.search(s):
        return None
    return s


def workflow_result_to_extractable_text(result: Any) -> str:
    """Text suitable for path+fence extraction.

    CrewOutput.__str__ prefers pydantic/json over raw, so str(result) often omits markdown.
    """
    try:
        from crewai.crews.crew_output import CrewOutput
    except ImportError:
        CrewOutput = None

    if CrewOutput is not None and isinstance(result, CrewOutput):
        if getattr(result, "raw", None) and str(result.raw).strip():
            return str(result.raw)
        chunks: list[str] = []
        for t in getattr(result, "tasks_output", None) or []:
            r = getattr(t, "raw", None)
            if r and str(r).strip():
                chunks.append(str(r))
        if chunks:
            return "\n\n".join(chunks)
    return "" if result is None else str(result)


def slugify_topic(topic: str, max_len: int = 48) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", topic.lower()).strip("-")
    return (s[:max_len] if s else "run").rstrip("-") or "run"


def sanitize_relative_path(path_str: str) -> Path | None:
    normalized = _normalize_artifact_path_label(path_str)
    if not normalized:
        return None
    raw = normalized.replace("\\", "/")
    if not raw or raw.startswith("/") or re.match(r"^[a-zA-Z]:", raw):
        return None
    parts: list[str] = []
    for part in Path(raw).parts:
        if part in (".", ""):
            continue
        if part == "..":
            return None
        if _WIN_BAD_IN_PATH.search(part):
            return None
        parts.append(part)
    if not parts:
        return None
    return Path(*parts)


def extract_markdown_artifacts(text: str) -> OrderedDict[str, str]:
    """Map relative paths (as emitted before fenced blocks) to file bodies."""
    lines = text.splitlines()
    out: OrderedDict[str, str] = OrderedDict()
    i = 0
    pending: str | None = None

    while i < len(lines):
        stripped = lines[i].strip()
        hm = HEADER_PATH.match(stripped)
        if hm:
            candidate = (hm.group(1) or hm.group(2) or "").strip()
            norm = _normalize_artifact_path_label(candidate)
            if norm:
                pending = norm
            i += 1
            continue

        fl = FILE_LABEL.match(stripped)
        if fl:
            norm = _normalize_artifact_path_label(fl.group(1))
            if norm:
                pending = norm
            i += 1
            continue

        sm = STARS_PATH.match(stripped)
        if sm:
            candidate = sm.group(1).strip().strip("`")
            norm = _normalize_artifact_path_label(candidate)
            if norm and "." in norm:
                pending = norm
            i += 1
            continue

        if stripped.startswith("```"):
            i += 1
            if pending is None:
                while i < len(lines) and not lines[i].strip().startswith("```"):
                    i += 1
                if i < len(lines):
                    i += 1
                continue
            chunk: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                chunk.append(lines[i])
                i += 1
            body = "\n".join(chunk)
            if body.strip():
                out[pending] = body
            pending = None
            if i < len(lines) and lines[i].strip().startswith("```"):
                i += 1
            continue

        i += 1

    return out


def write_artifacts(base: Path, files: OrderedDict[str, str]) -> list[Path]:
    base_resolved = base.resolve()
    written: list[Path] = []
    for rel_raw, body in files.items():
        rel = sanitize_relative_path(rel_raw)
        if rel is None:
            continue
        target = (base_resolved / rel).resolve()
        try:
            target.relative_to(base_resolved)
        except ValueError:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        text = body.rstrip("\n") + "\n" if body.strip() else body
        try:
            target.write_text(text, encoding="utf-8")
        except OSError as exc:
            print(
                f"(artifacts) skipped {rel_raw!r} ({rel}): {exc}",
                file=sys.stderr,
            )
            continue
        written.append(target)
    return written


def _is_skip_save(response: str) -> bool:
    return response.strip().lower() in frozenset({"n", "no", "skip", "-"})


def offer_save_extracted_files(
    *,
    tool_root: Path,
    user_task: str | None,
    result_text: str | None,
    output_dir: Path | None,
    no_save: bool,
    prompt_save: bool = False,
) -> Path | None:
    if no_save or not result_text:
        return None
    files = extract_markdown_artifacts(result_text)
    if not files:
        if _looks_like_llm_refusal(result_text):
            print(
                "(artifacts) The coding agent refused or errored (no real files in the output). "
                "Nothing saved. Try a smaller scope, a different/capable model, or run the task again.",
                file=sys.stderr,
            )
            return None
        if "```" in result_text and len(result_text) > 200:
            print(
                "(artifacts) Found code fences but no recognizable path lines before them "
                "(use headings like #### `path/file.ext`, ## Path: `path/file.ext`, or **path/file.ext**). "
                "Nothing saved.",
                file=sys.stderr,
            )
        return None

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    slug = slugify_topic(user_task or "output")
    default_dir = (tool_root / "__output__" / f"{stamp}-{slug}").resolve()

    if output_dir is not None:
        base = output_dir.expanduser().resolve()
        base.mkdir(parents=True, exist_ok=True)
        written = write_artifacts(base, files)
        if not written and files:
            print(
                "(artifacts) Parsed paths were skipped (only relative paths are allowed). "
                "Nothing saved.",
                file=sys.stderr,
            )
            return None
        print(f"Saved {len(written)} file(s) under {base}", file=sys.stderr)
        return base

    if prompt_save and sys.stdin.isatty():
        print(
            f"\nDetected {len(files)} file-like artifact(s) in the workflow output.",
            file=sys.stderr,
        )
        print(
            "Save extracted files? Default folder (gitignored __output__):",
            file=sys.stderr,
        )
        print(f"  {default_dir}", file=sys.stderr)
        try:
            raw = input("Output directory [Enter=yes, path=use that, n=skip]: ")
        except EOFError:
            print("(EOF) skip save.", file=sys.stderr)
            return None

        resp = raw.strip()
        if _is_skip_save(resp):
            return None
        base = Path(resp).expanduser().resolve() if resp else default_dir
        base.mkdir(parents=True, exist_ok=True)
        written = write_artifacts(base, files)
        if not written and files:
            print("(artifacts) No writable relative paths after parse. Nothing saved.", file=sys.stderr)
            return None
        print(f"Saved {len(written)} file(s) under {base}", file=sys.stderr)
        return base

    default_dir.mkdir(parents=True, exist_ok=True)
    written = write_artifacts(default_dir, files)
    if not written and files:
        print(
            "(artifacts) Parsed paths were skipped (only relative paths like src/a.ts are written; "
            "no absolute paths or '..'). Nothing saved.",
            file=sys.stderr,
        )
        return None
    print(
        f"Saved {len(written)} file(s) under {default_dir}",
        file=sys.stderr,
    )
    return default_dir
