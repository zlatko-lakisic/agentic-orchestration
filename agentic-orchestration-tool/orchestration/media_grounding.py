"""
Harness-level media grounding: extract deterministic evidence, gate unavailable paths,
and verify user-facing answers against extracted facts.

Honesty constraint: when media is attached but no evidence can be produced, emit a fixed
harness response — never let the model improvise from the filename alone.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from orchestration.attachments import (
    _category_for,
    _guess_mime,
    _validate_attachment_path,
    load_manifest,
)
from orchestration.mcp_providers_catalog import (
    filter_mcp_entries_by_api_credentials,
    mcp_entry_has_api_credentials,
)

MEDIA_MCP_IDS = frozenset(
    {"media_understand", "media_audio_transcribe", "media_video_analyze"}
)

MEDIA_CATEGORIES = frozenset({"image", "audio", "media"})

MEDIA_EVIDENCE_MARKER = "[agentic: media grounding evidence]"
MEDIA_GROUNDING_AUDIT_MARKER = "[agentic: media grounding audit]"

MEDIA_GATE_RESPONSE = (
    "Attached media cannot be processed in the current configuration. "
    "Enable media tools with AGENTIC_MCP_MEDIA_ENABLED=1, ensure ffmpeg/ffprobe are on PATH "
    "for video, and include a media_understand MCP in the plan. "
    "No visual or audio analysis was performed."
)

_SKILL_ECHO_RE = re.compile(r"(?m)^\s*SKILL_ECHO_[A-Z0-9_]+\s*$")

# Phrases that contradict near-silent / single-shot security footage.
_CONFAB_SCENE_CUT_RE = re.compile(
    r"\b(rapid cuts?|scene cuts?|action[- ]packed|movie or tv|tv show|"
    r"stunning visual effects?|intense sound design|dramatic soundtrack)\b",
    re.IGNORECASE,
)


@dataclass
class MediaFileEvidence:
    path: str
    name: str
    category: str
    mime: str
    facts: dict[str, Any] = field(default_factory=dict)
    tool_output: dict[str, Any] = field(default_factory=dict)
    excerpt: str = ""


@dataclass
class MediaGroundingBundle:
    files: list[MediaFileEvidence] = field(default_factory=list)
    tool_invoked: bool = False
    evidence_injected: bool = False
    gate: bool = False
    gate_reason: str = ""
    markdown_block: str = ""
    audit: dict[str, Any] = field(default_factory=dict)

    @property
    def has_media(self) -> bool:
        return bool(self.files)


def strip_skill_echo_tokens(text: str) -> str:
    """Remove skill verification canaries from user-facing deliverables."""
    t = str(text or "")
    if not t.strip():
        return t
    lines = [ln for ln in t.splitlines() if not _SKILL_ECHO_RE.match(ln.strip())]
    out = "\n".join(lines).strip()
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out


def _attachment_block_has_media_categories(user_prompt: str) -> bool:
    block = str(user_prompt or "")
    if "## Attached files" not in block:
        return False
    return bool(
        re.search(
            r"\*\*category:\*\*\s*\*\*(image|audio|media)\*\*",
            block,
            re.IGNORECASE,
        )
    )


def media_mcp_available(entries: list[dict[str, Any]]) -> bool:
    for entry in entries:
        eid = str(entry.get("id", "")).strip()
        if eid in MEDIA_MCP_IDS and mcp_entry_has_api_credentials(entry):
            return True
    return False


def pick_media_mcp_id(entries: list[dict[str, Any]], *, prefer_video: bool = False) -> str | None:
    enabled = [
        str(e.get("id", "")).strip()
        for e in entries
        if str(e.get("id", "")).strip() in MEDIA_MCP_IDS and mcp_entry_has_api_credentials(e)
    ]
    if not enabled:
        return None
    if prefer_video and "media_video_analyze" in enabled:
        return "media_video_analyze"
    if "media_understand" in enabled:
        return "media_understand"
    return enabled[0]


def _ffmpeg_bin() -> str:
    return (os.getenv("AGENTIC_VIDEO_FFMPEG") or "ffmpeg").strip() or "ffmpeg"


def _ffprobe_bin() -> str:
    return (os.getenv("AGENTIC_VIDEO_FFPROBE") or "ffprobe").strip() or "ffprobe"


def probe_video_technical_facts(path: Path) -> dict[str, Any]:
    """Deterministic ffprobe/ffmpeg facts for grounding checks (not model judgment)."""
    facts: dict[str, Any] = {
        "duration_seconds": None,
        "width": None,
        "height": None,
        "has_audio": False,
        "audio_max_db": None,
        "audio_near_silent": None,
        "scene_cut_count": None,
        "single_continuous_shot": None,
    }
    ffprobe = _ffprobe_bin()
    ffmpeg = _ffmpeg_bin()

    try:
        proc = subprocess.run(
            [
                ffprobe,
                "-hide_banner",
                "-loglevel",
                "error",
                "-show_entries",
                "format=duration:stream=codec_type,width,height",
                "-of",
                "json",
                str(path),
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout)
            fmt = data.get("format") or {}
            if fmt.get("duration") is not None:
                try:
                    facts["duration_seconds"] = round(float(fmt["duration"]), 2)
                except (TypeError, ValueError):
                    pass
            for stream in data.get("streams") or []:
                if not isinstance(stream, dict):
                    continue
                if stream.get("codec_type") == "video":
                    facts["width"] = stream.get("width")
                    facts["height"] = stream.get("height")
                if stream.get("codec_type") == "audio":
                    facts["has_audio"] = True
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError):
        pass

    # Scene-cut estimate via ffmpeg scene score (threshold 0.3 per failure report).
    try:
        proc = subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "info",
                "-i",
                str(path),
                "-filter:v",
                "select='gt(scene,0.3)',showinfo",
                "-f",
                "null",
                "-",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
        )
        log = (proc.stderr or "") + (proc.stdout or "")
        pts_matches = re.findall(r"pts_time:([0-9.]+)", log)
        facts["scene_cut_count"] = max(0, len(pts_matches) - 1) if pts_matches else 0
        facts["single_continuous_shot"] = facts["scene_cut_count"] == 0
    except (OSError, subprocess.TimeoutExpired):
        pass

    if facts["has_audio"]:
        try:
            proc = subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "info",
                    "-i",
                    str(path),
                    "-af",
                    "volumedetect",
                    "-f",
                    "null",
                    "-",
                ],
                check=False,
                capture_output=True,
                text=True,
                timeout=120,
            )
            log = (proc.stderr or "") + (proc.stdout or "")
            m = re.search(r"max_volume:\s*(-?[0-9.]+)\s*dB", log)
            if m:
                max_db = float(m.group(1))
                facts["audio_max_db"] = max_db
                facts["audio_near_silent"] = max_db < -35.0
        except (OSError, subprocess.TimeoutExpired, ValueError):
            pass

    return facts


def _collect_file_evidence(
    spec: dict[str, Any],
    *,
    tool_root: Path,
    user_goal: str,
) -> MediaFileEvidence | None:
    raw_path = Path(str(spec.get("path") or "").strip())
    try:
        validated = _validate_attachment_path(raw_path, tool_root=tool_root)
    except (FileNotFoundError, PermissionError):
        return None
    name = str(spec.get("name") or validated.name).strip() or validated.name
    mime = _guess_mime(validated, spec.get("mime") if isinstance(spec.get("mime"), str) else None)
    category, _route = _category_for(validated, mime)
    if category not in MEDIA_CATEGORIES:
        return None

    ev = MediaFileEvidence(path=str(validated), name=name, category=category, mime=mime)
    tool_output: dict[str, Any] = {"ok": False}

    if category in {"media", "image"} and validated.suffix.lower() in {
        ".mp4",
        ".webm",
        ".mov",
        ".mkv",
        ".avi",
        ".m4v",
    } or mime.startswith("video/"):
        ev.facts = probe_video_technical_facts(validated)
        try:
            from mcp_servers.media_understand.analyze import analyze_video

            tool_output = analyze_video(str(validated), question=user_goal, max_frames=4)
        except Exception as exc:  # noqa: BLE001
            tool_output = {"ok": False, "error": str(exc)}
    elif category == "image" or mime.startswith("image/"):
        try:
            from mcp_servers.media_understand.analyze import describe_image

            tool_output = describe_image(str(validated), question=user_goal)
        except Exception as exc:  # noqa: BLE001
            tool_output = {"ok": False, "error": str(exc)}
    elif category == "audio" or mime.startswith("audio/"):
        try:
            from mcp_servers.media_understand.analyze import transcribe_audio

            tool_output = transcribe_audio(str(validated))
            ev.facts["has_audio"] = True
        except Exception as exc:  # noqa: BLE001
            tool_output = {"ok": False, "error": str(exc)}

    ev.tool_output = tool_output
    # Build human-readable excerpt for planner + verifier.
    parts: list[str] = []
    if ev.facts:
        parts.append("technical_facts=" + json.dumps(ev.facts, sort_keys=True))
    if tool_output.get("synopsis"):
        parts.append("synopsis=" + str(tool_output["synopsis"])[:2000])
    elif tool_output.get("description"):
        parts.append("description=" + str(tool_output["description"])[:2000])
    elif tool_output.get("transcript"):
        parts.append("transcript=" + str(tool_output["transcript"])[:2000])
    elif tool_output.get("error"):
        parts.append("tool_error=" + str(tool_output["error"])[:500])
    ev.excerpt = "; ".join(parts)
    return ev


def prepare_media_grounding(
    *,
    manifest_path: Path | None,
    tool_root: Path,
    user_goal: str,
    mcp_catalog: list[dict[str, Any]] | None = None,
) -> MediaGroundingBundle | None:
    """
    Collect deterministic media evidence for a manifest. Returns None when no media files.
    Sets ``gate=True`` when media is present but no evidence path succeeded.
    """
    if manifest_path is None or not manifest_path.is_file():
        return None

    try:
        entries = load_manifest(manifest_path)
    except (OSError, ValueError, json.JSONDecodeError):
        return None

    bundle = MediaGroundingBundle()
    for spec in entries:
        ev = _collect_file_evidence(spec, tool_root=tool_root, user_goal=user_goal)
        if ev is not None:
            bundle.files.append(ev)

    if not bundle.files:
        return None

    mcp_ok = media_mcp_available(mcp_catalog or [])
    any_tool_ok = any(f.tool_output.get("ok") for f in bundle.files)
    any_facts = any(bool(f.facts) for f in bundle.files)
    bundle.tool_invoked = any_tool_ok or any_facts
    bundle.evidence_injected = bundle.tool_invoked

    if not bundle.tool_invoked:
        bundle.gate = True
        bundle.gate_reason = "no_media_evidence"
        bundle.audit = {
            "media_files": len(bundle.files),
            "mcp_available": mcp_ok,
            "tool_invoked": False,
            "evidence_injected": False,
            "verification": "gate",
        }
        return bundle

    lines = [
        MEDIA_EVIDENCE_MARKER,
        "",
        "## Media grounding evidence (harness-extracted; answers must follow these facts)",
        "",
        "The orchestrator ran deterministic media analysis before the answering step. "
        "Do not claim scene cuts, loud audio, or cinematic content unless supported below.",
        "",
    ]
    for i, ev in enumerate(bundle.files, start=1):
        lines.append(f"{i}. **{ev.name}** (`{ev.path}`) — category **{ev.category}**")
        if ev.facts:
            lines.append(f"   - **Technical facts:** `{json.dumps(ev.facts, sort_keys=True)}`")
        if ev.tool_output.get("ok"):
            lines.append(f"   - **Tool output (ok):** excerpt below")
            for key in ("synopsis", "description", "transcript"):
                if ev.tool_output.get(key):
                    lines.append("")
                    lines.append("```")
                    lines.append(str(ev.tool_output[key])[:4000])
                    lines.append("```")
                    break
        else:
            err = ev.tool_output.get("error") or "analysis failed"
            lines.append(f"   - **Tool output:** failed ({err})")
        lines.append("")

    bundle.markdown_block = "\n".join(lines).strip()
    bundle.audit = {
        "media_files": len(bundle.files),
        "mcp_available": mcp_ok,
        "tool_invoked": True,
        "evidence_injected": True,
        "verification": "pending",
        "files": [
            {
                "path": f.path,
                "category": f.category,
                "facts": f.facts,
                "tool_ok": bool(f.tool_output.get("ok")),
            }
            for f in bundle.files
        ],
    }
    return bundle


def emit_media_grounding_audit(bundle: MediaGroundingBundle | None, *, verification: str) -> None:
    if bundle is None:
        return
    audit = dict(bundle.audit)
    audit["verification"] = verification
    try:
        sys.stderr.write(
            f"{MEDIA_GROUNDING_AUDIT_MARKER} {json.dumps(audit, sort_keys=True)}\n"
        )
    except Exception:  # noqa: BLE001
        pass


def answer_contradicts_media_evidence(answer: str, bundle: MediaGroundingBundle) -> str | None:
    """Return a rejection reason when prose contradicts harness facts."""
    text = str(answer or "").strip()
    if not text or not bundle.files:
        return None

    for ev in bundle.files:
        facts = ev.facts or {}
        if facts.get("single_continuous_shot") is True and _CONFAB_SCENE_CUT_RE.search(text):
            return "answer_claims_cinematic_cuts_but_evidence_shows_single_shot"
        if facts.get("audio_near_silent") is True:
            if re.search(
                r"\b(intense sound|sound design|dialogue|loud audio|soundtrack|speech)\b",
                text,
                re.IGNORECASE,
            ):
                return "answer_claims_audio_content_but_evidence_near_silent"
        if facts.get("scene_cut_count") == 0 and re.search(
            r"\b(cut(s)?\s+between|multiple scenes|scene changes?)\b",
            text,
            re.IGNORECASE,
        ):
            return "answer_claims_scene_changes_but_evidence_zero_cuts"
    return None


def finalize_media_answer(
    answer: str,
    bundle: MediaGroundingBundle | None,
) -> tuple[str, bool]:
    """
    Strip skill echo tokens and verify media grounding.

    Returns ``(text, accepted)``. When not accepted, ``text`` is the gate/failure response.
    """
    cleaned = strip_skill_echo_tokens(answer)
    if bundle is None or not bundle.has_media:
        if _SKILL_ECHO_RE.search(str(answer or "")):
            emit_media_grounding_audit(None, verification="skill_echo_stripped_only")
        return cleaned, True

    if bundle.gate:
        emit_media_grounding_audit(bundle, verification="gate")
        return MEDIA_GATE_RESPONSE, False

    if MEDIA_EVIDENCE_MARKER not in (bundle.markdown_block or ""):
        emit_media_grounding_audit(bundle, verification="rejected_no_evidence_marker")
        return MEDIA_GATE_RESPONSE, False

    reject = answer_contradicts_media_evidence(cleaned, bundle)
    if reject:
        emit_media_grounding_audit(bundle, verification=f"rejected_{reject}")
        return (
            MEDIA_GATE_RESPONSE
            + f" (Verification failed: model answer contradicted extracted media facts: {reject}.)",
            False,
        )

    if _SKILL_ECHO_RE.search(str(answer or "")) and not _SKILL_ECHO_RE.search(cleaned):
        emit_media_grounding_audit(bundle, verification="skill_echo_stripped")
    else:
        emit_media_grounding_audit(bundle, verification="accepted")
    return cleaned, True


def media_evidence_already_in_prompt(user_prompt: str) -> bool:
    """True when harness already injected describe/transcribe evidence into the goal."""
    return MEDIA_EVIDENCE_MARKER in str(user_prompt or "")


def synthesize_direct_vision_answer(
    user_goal: str,
    bundle: MediaGroundingBundle | None,
    *,
    force: bool = False,
) -> str | None:
    """
    Build a plain-text answer from harness vision/audio evidence without an agent tool loop.

    Used for HA LLM Vision / gate PEOPLE contracts where tool-call JSON must never be
    returned as ``message.content``. When ``force`` is True (tool-leak recovery),
    return harness description even if the goal did not match the direct-vision heuristic.
    """
    from orchestration.goal_format_hints import (
        goal_requests_direct_vision_completion,
        goal_requests_gate_people_lines,
    )

    if bundle is None or not bundle.has_media or bundle.gate:
        return None
    if not force and not goal_requests_direct_vision_completion(user_goal):
        return None

    descriptions: list[str] = []
    for ev in bundle.files:
        out = ev.tool_output or {}
        if not out.get("ok"):
            continue
        for key in ("description", "synopsis", "transcript"):
            val = out.get(key)
            if isinstance(val, str) and val.strip():
                descriptions.append(val.strip())
                break
        if not descriptions and ev.excerpt:
            # Fall back to excerpt fields like description=...
            m = re.search(r"(?:description|synopsis|transcript)=(.+)$", ev.excerpt, re.DOTALL)
            if m:
                descriptions.append(m.group(1).strip()[:2000])

    if not descriptions:
        return None

    combined = " ".join(descriptions).strip()
    if not combined:
        return None

    if goal_requests_gate_people_lines(user_goal):
        return _format_gate_people_lines(combined)

    # Honor "exactly N lines" / free-form direct vision: return the vision text as-is.
    return combined


def _format_gate_people_lines(description: str) -> str:
    """Map a vision description into the HA gate 3-line PEOPLE/NOPEOPLE contract."""
    raw = str(description or "").strip()
    # Pass through when the vision model already obeyed the 3-line contract.
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if len(lines) >= 3 and lines[0].upper() in {"PEOPLE", "NOPEOPLE"}:
        label = lines[0].upper()
        log_line = lines[1][:240]
        alert = lines[2][:120]
        return f"{label}\n{log_line}\n{alert}"

    desc = re.sub(r"\s+", " ", raw).strip()
    lower = desc.lower()

    people_cues = (
        "person",
        "people",
        "human",
        "man",
        "woman",
        "boy",
        "girl",
        "child",
        "someone",
        "pedestrian",
        "visitor",
        "intruder",
        "figure standing",
        "individual",
    )
    no_people_cues = (
        "no person",
        "no people",
        "nobody",
        "no one",
        "empty",
        "clear",
        "unoccupied",
        "no human",
        "without people",
        "without a person",
    )

    has_no = any(c in lower for c in no_people_cues)
    has_yes = any(re.search(rf"\b{re.escape(c)}\b", lower) for c in people_cues)
    # Prefer explicit negatives when both appear (e.g. "no person visible").
    label = "NOPEOPLE" if has_no or not has_yes else "PEOPLE"

    log_line = desc[:240] if desc else (
        "East gate area clear; no person visible." if label == "NOPEOPLE" else "Person visible at gate."
    )
    if label == "NOPEOPLE":
        alert = "No people at gate"
    else:
        alert = "People at gate — check camera"
    alert = alert[:120]
    return f"{label}\n{log_line}\n{alert}"


def augment_workflow_config_for_media_mcp(
    cfg: Any,
    *,
    user_prompt: str,
    mcp_catalog: list[dict[str, Any]],
) -> Any:
    """Force media MCP ids onto the plan when attached files include media categories.

    Skip when harness evidence is already in the prompt or the goal forbids tools —
    otherwise models emit ``describe_image_file`` JSON as the final answer.
    """
    from dataclasses import replace

    from orchestration.goal_format_hints import goal_requests_direct_vision_completion

    if not _attachment_block_has_media_categories(user_prompt):
        return cfg
    if media_evidence_already_in_prompt(user_prompt):
        return cfg
    if goal_requests_direct_vision_completion(user_prompt):
        return cfg
    mid = pick_media_mcp_id(mcp_catalog)
    if not mid:
        return cfg

    merged: list[Any] = []
    seen: set[str] = set()
    for x in getattr(cfg, "mcp_providers", None) or []:
        if isinstance(x, str) and (sx := x.strip()):
            if sx not in seen:
                seen.add(sx)
                merged.append(sx)
        else:
            merged.append(x)
    if mid not in seen:
        merged.append(mid)

    tasks_out = []
    for t in cfg.tasks:
        task_mcps = list(getattr(t, "mcp_providers", None) or [])
        if mid not in task_mcps:
            task_mcps.append(mid)
        tasks_out.append(replace(t, mcp_providers=task_mcps))

    return replace(cfg, mcp_providers=merged, tasks=tasks_out)


def inject_media_evidence_into_description(description: str, bundle: MediaGroundingBundle) -> str:
    if not bundle.markdown_block or MEDIA_EVIDENCE_MARKER in description:
        return description
    return description.rstrip() + "\n\n" + bundle.markdown_block + "\n"
