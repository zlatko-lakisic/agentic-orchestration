"""Video generation runtime — ComfyUI workflows for ``type: video_generation``."""

from __future__ import annotations

import copy
import json
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Callable

import httpx

from orchestration.client_files import (
    ClientFileError,
    ClientFileNotFound,
    register_output_file,
    resolve_client_file,
)
from orchestration.user_context import Identity

__all__ = [
    "VideoGenerationError",
    "is_video_generation_entry",
    "validate_ltx_geometry",
    "apply_workflow_bindings",
    "run_video_generation",
    "video_generation_health",
    "video_generation_runtime_health",
]


class VideoGenerationError(ValueError):
    """Invalid request or ComfyUI failure."""


def is_video_generation_entry(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    typ = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
    return typ == "video_generation"


def _opts(entry: dict[str, Any]) -> dict[str, Any]:
    opts = entry.get("provider_options")
    return dict(opts) if isinstance(opts, dict) else {}


def _merged(entry: dict[str, Any]) -> dict[str, Any]:
    """Flatten catalog entry + provider_options for runtime reads."""
    out = dict(entry)
    out.update(_opts(entry))
    return out


def _endpoint(entry: dict[str, Any]) -> str:
    merged = _merged(entry)
    env_name = str(merged.get("endpoint_env") or "AGENTIC_VIDEO_COMFYUI_URL").strip()
    url = (os.getenv(env_name) or "").strip().rstrip("/")
    if not url:
        raise VideoGenerationError(f"{env_name} is not set")
    return url


def _token(entry: dict[str, Any]) -> str | None:
    merged = _merged(entry)
    env_name = str(merged.get("token_env") or "AGENTIC_VIDEO_COMFYUI_TOKEN").strip()
    raw = (os.getenv(env_name) or "").strip()
    return raw or None


def _headers(entry: dict[str, Any]) -> dict[str, str]:
    token = _token(entry)
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def _defaults(entry: dict[str, Any]) -> dict[str, Any]:
    raw = _merged(entry).get("defaults")
    return dict(raw) if isinstance(raw, dict) else {}


def _limits(entry: dict[str, Any]) -> dict[str, Any]:
    raw = _merged(entry).get("limits")
    return dict(raw) if isinstance(raw, dict) else {}


def validate_ltx_geometry(*, width: int, height: int, frames: int) -> None:
    """LTX-2.3: width/height divisible by 32; frames = 8n+1."""
    if width % 32 != 0 or height % 32 != 0:
        raise VideoGenerationError(
            f"width/height must be divisible by 32 (got {width}x{height})"
        )
    if frames < 1 or (frames - 1) % 8 != 0:
        raise VideoGenerationError(
            f"frames must be 8n+1 (got {frames})"
        )


def _binding_targets(bind: dict[str, Any]) -> list[tuple[str, str]]:
    """Return ``(node_id, field)`` pairs from a binding (supports optional ``also``)."""
    targets: list[tuple[str, str]] = []
    node_id = str(bind.get("node") or "").strip()
    field = str(bind.get("field") or "").strip()
    if node_id and field and node_id != "<id>":
        targets.append((node_id, field))
    also = bind.get("also")
    if isinstance(also, list):
        for item in also:
            if not isinstance(item, dict):
                continue
            nid = str(item.get("node") or "").strip()
            fld = str(item.get("field") or "").strip()
            if nid and fld and nid != "<id>":
                targets.append((nid, fld))
    return targets


def apply_workflow_bindings(
    workflow: dict[str, Any],
    bindings: dict[str, Any],
    values: dict[str, Any],
) -> dict[str, Any]:
    """Deep-copy workflow and set ``bindings[key] = {node, field}`` from ``values``."""
    out = copy.deepcopy(workflow)
    # Drop non-node metadata keys ComfyUI would reject.
    for key in list(out.keys()):
        if key.startswith("_") or not isinstance(out.get(key), dict):
            out.pop(key, None)
            continue
        if "class_type" not in out[key]:
            out.pop(key, None)
    for key, value in values.items():
        if value is None:
            continue
        bind = bindings.get(key)
        if not isinstance(bind, dict):
            continue
        targets = _binding_targets(bind)
        if not targets:
            continue
        for node_id, field in targets:
            node = out.get(node_id)
            if not isinstance(node, dict):
                raise VideoGenerationError(f"workflow missing node {node_id!r} for {key}")
            inputs = node.setdefault("inputs", {})
            if not isinstance(inputs, dict):
                raise VideoGenerationError(f"node {node_id!r} inputs must be an object")
            inputs[field] = value
    return out


def _load_workflow(tool_root: Path, rel: str) -> dict[str, Any]:
    path = Path(rel)
    if not path.is_absolute():
        path = tool_root / rel
    if not path.is_file():
        raise VideoGenerationError(f"workflow file missing: {rel}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise VideoGenerationError(f"workflow {rel} must be a JSON object")
    return data


def _ffmpeg() -> str:
    from orchestration.ffmpeg_bins import ffmpeg_bin

    return ffmpeg_bin()


def _strip_audio(src: Path, dest: Path) -> None:
    cmd = [
        _ffmpeg(),
        "-y",
        "-i",
        str(src),
        "-an",
        "-c:v",
        "copy",
        str(dest),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120, check=False)
    except FileNotFoundError as exc:
        raise VideoGenerationError("ffmpeg not found (AGENTIC_VIDEO_FFMPEG)") from exc
    if proc.returncode != 0:
        # Fallback: copy as-is if stream copy fails.
        shutil.copy2(src, dest)


def _output_dir(tool_root: Path) -> Path:
    raw = (os.getenv("AGENTIC_VIDEO_OUTPUT_DIR") or "").strip()
    if raw:
        path = Path(raw)
    else:
        path = tool_root / "__orchestrator_video_out__"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _parse_request(text: str, entry: dict[str, Any]) -> dict[str, Any]:
    raw = str(text or "").strip()
    if not raw:
        raise VideoGenerationError("prompt payload is empty")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise VideoGenerationError(f"prompt payload must be JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise VideoGenerationError("prompt payload must be a JSON object")
    prompt = str(data.get("prompt") or "").strip()
    if not prompt:
        raise VideoGenerationError("prompt is required")
    defaults = _defaults(entry)
    limits = _limits(entry)
    width = int(data.get("width") or defaults.get("width") or 544)
    height = int(data.get("height") or defaults.get("height") or 960)
    frames = int(data.get("frames") or defaults.get("frames") or 121)
    fps = int(data.get("fps") or defaults.get("fps") or 24)
    max_frames = int(limits.get("max_frames") or 241)
    if frames > max_frames:
        raise VideoGenerationError(f"frames exceeds max_frames ({max_frames})")
    geometry = str(
        data.get("geometry")
        or _merged(entry).get("geometry")
        or "ltx"
    ).strip().lower()
    if geometry in ("ltx", "ltx23", "ltx-2.3"):
        validate_ltx_geometry(width=width, height=height, frames=frames)
    elif geometry in ("wan", "wan22", "none", "any"):
        if width < 64 or height < 64:
            raise VideoGenerationError(f"width/height too small ({width}x{height})")
        if frames < 1:
            raise VideoGenerationError("frames must be >= 1")
    else:
        validate_ltx_geometry(width=width, height=height, frames=frames)
    seed = data.get("seed")
    if seed is None:
        seed = int(time.time()) % 2_147_483_647
    else:
        seed = int(seed)
    start_image_file_id = data.get("start_image_file_id")
    if start_image_file_id is not None:
        start_image_file_id = str(start_image_file_id).strip() or None
        if start_image_file_id and (
            "/" in start_image_file_id
            or "\\" in start_image_file_id
            or ".." in start_image_file_id
        ):
            raise VideoGenerationError("start_image_file_id must be a file_id, not a path")
    return {
        "prompt": prompt,
        "negative_prompt": str(data.get("negative_prompt") or ""),
        "start_image_file_id": start_image_file_id,
        "seed": seed,
        "width": width,
        "height": height,
        "frames": frames,
        "fps": fps,
        "keep_audio": bool(defaults.get("keep_audio", False))
        if data.get("keep_audio") is None
        else bool(data.get("keep_audio")),
    }


def video_generation_health(entry: dict[str, Any]) -> dict[str, Any]:
    """Probe ComfyUI ``GET /system_stats`` (never include the URL in the payload)."""
    try:
        base = _endpoint(entry)
    except VideoGenerationError as exc:
        return {"ok": False, "reachable": False, "error": str(exc)}
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(f"{base}/system_stats", headers=_headers(entry))
        if resp.status_code >= 400:
            return {
                "ok": False,
                "reachable": True,
                "error": f"HTTP {resp.status_code}",
            }
        data = resp.json() if resp.content else {}
        devices = []
        if isinstance(data, dict):
            devices = data.get("devices") or data.get("gpus") or []
        gpu_name = None
        vram_free = None
        if isinstance(devices, list) and devices:
            first = devices[0] if isinstance(devices[0], dict) else {}
            gpu_name = first.get("name") or first.get("gpu_name")
            vram_free = first.get("vram_free") or first.get("free")
        merged = _merged(entry)
        return {
            "ok": True,
            "reachable": True,
            "gpuName": gpu_name,
            "vramFree": vram_free,
            "providerId": str(entry.get("id") or ""),
            "qualityTier": merged.get("quality_tier"),
            "speedTier": merged.get("speed_tier"),
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reachable": False, "error": str(exc)}


def video_generation_runtime_health(tool_root: Path | None = None) -> dict[str, Any]:
    """Aggregate health for ``/health`` — never expose ComfyUI URL.

    ``configured`` is true when any catalog ``video_generation`` entry has its
    own ``endpoint_env`` set (not only the default ``AGENTIC_VIDEO_COMFYUI_URL``).
    """
    configured = False
    try:
        from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
        from orchestration.dynamic_run import catalog_paths

        paths = catalog_paths(tool_root)
        entries = load_agent_providers_catalog_merged(paths.agent_providers)
        for entry in entries:
            if not is_video_generation_entry(entry):
                continue
            try:
                _endpoint(entry)
                configured = True
                break
            except VideoGenerationError:
                continue
    except Exception:  # noqa: BLE001
        configured = bool((os.getenv("AGENTIC_VIDEO_COMFYUI_URL") or "").strip())
    return {
        "configured": configured,
        "ok": None,
    }


def _comfy_free(entry: dict[str, Any], client: httpx.Client | None = None) -> None:
    try:
        base = _endpoint(entry)
    except VideoGenerationError:
        return
    headers = {**_headers(entry), "Content-Type": "application/json"}
    body = {"unload_models": True, "free_memory": True}
    owns = client is None
    http = client or httpx.Client(timeout=15.0)
    try:
        http.post(f"{base}/free", headers=headers, json=body)
    except Exception:  # noqa: BLE001
        return
    finally:
        if owns:
            http.close()


def run_video_generation(
    entry: dict[str, Any],
    *,
    text: str,
    tool_root: Path,
    identity: Identity | str | None = None,
    user_id: str | None = None,
    on_progress: Callable[[str], None] | None = None,
    client: httpx.Client | None = None,
    cancel_event: Any = None,
) -> dict[str, Any]:
    """Queue a ComfyUI workflow and return clip metadata + registered file_id."""
    from orchestration.gpu_residency import (
        GpuResidencyError,
        get_gpu_residency_manager,
        residency_lease_for_entry,
    )

    t0 = time.time()
    pid = str(entry.get("id") or "video_generation")
    req = _parse_request(text, entry)
    merged = _merged(entry)
    lease = None
    try:
        lease = residency_lease_for_entry(
            entry,
            kind="video",
            unload=lambda: _comfy_free(entry),
        )
    except GpuResidencyError as exc:
        raise VideoGenerationError(str(exc)) from exc
    workflows = merged.get("workflows") or {}
    mode = "i2v" if req["start_image_file_id"] else "t2v"
    rel = workflows.get(mode)
    if not rel:
        raise VideoGenerationError(f"entry missing workflows.{mode}")
    workflow = _load_workflow(tool_root, str(rel))
    bindings = merged.get("bindings") if isinstance(merged.get("bindings"), dict) else {}

    owner: Identity | str
    if isinstance(identity, Identity):
        owner = identity
    elif identity is not None and str(identity).strip():
        owner = str(identity).strip()
    elif user_id:
        owner = str(user_id).strip()
    else:
        owner = "local"

    uploaded_name = None
    if req["start_image_file_id"]:
        try:
            img_path = resolve_client_file(owner, req["start_image_file_id"])
        except (ClientFileNotFound, ClientFileError) as exc:
            raise VideoGenerationError(str(exc)) from exc
    else:
        img_path = None

    values = {
        "prompt": req["prompt"],
        "negative_prompt": req["negative_prompt"],
        "seed": req["seed"],
        "width": req["width"],
        "height": req["height"],
        "frames": req["frames"],
    }
    graph = apply_workflow_bindings(workflow, bindings, values)

    base = _endpoint(entry)
    headers = _headers(entry)
    owns_client = client is None
    client = client or httpx.Client(timeout=60.0)
    timings: dict[str, Any] = {}

    def _progress(pct: int) -> None:
        if on_progress is not None:
            on_progress(f"video_generation:{pid}:{pct}")

    try:
        if img_path is not None:
            _progress(5)
            with img_path.open("rb") as fh:
                up = client.post(
                    f"{base}/upload/image",
                    headers=headers,
                    files={"image": (img_path.name, fh, "application/octet-stream")},
                )
            if up.status_code >= 400:
                raise VideoGenerationError(f"image upload failed: HTTP {up.status_code}")
            up_body = up.json() if up.content else {}
            uploaded_name = str(
                (up_body.get("name") if isinstance(up_body, dict) else None)
                or img_path.name
            )
            # Apply image binding after upload when node id is real.
            graph = apply_workflow_bindings(
                graph, bindings, {"image": uploaded_name}
            )

        _progress(10)
        queued = client.post(
            f"{base}/prompt",
            headers={**headers, "Content-Type": "application/json"},
            json={"prompt": graph, "client_id": uuid.uuid4().hex},
        )
        if queued.status_code >= 400:
            raise VideoGenerationError(f"queue failed: HTTP {queued.status_code} {queued.text[:200]}")
        qbody = queued.json() if queued.content else {}
        prompt_id = str((qbody.get("prompt_id") if isinstance(qbody, dict) else "") or "")
        if not prompt_id:
            raise VideoGenerationError("ComfyUI did not return prompt_id")
        timings["queued_ms"] = int((time.time() - t0) * 1000)

        timeout_s = float(
            os.getenv("AGENTIC_VIDEO_TIMEOUT_S")
            or _limits(entry).get("timeout_s")
            or 1800
        )
        deadline = time.time() + timeout_s
        outputs: dict[str, Any] | None = None
        while time.time() < deadline:
            if cancel_event is not None and getattr(cancel_event, "is_set", lambda: False)():
                client.post(f"{base}/interrupt", headers=headers)
                raise VideoGenerationError("cancelled")
            hist = client.get(f"{base}/history/{prompt_id}", headers=headers)
            if hist.status_code < 400 and hist.content:
                hbody = hist.json()
                item = hbody.get(prompt_id) if isinstance(hbody, dict) else None
                if isinstance(item, dict) and item.get("outputs"):
                    outputs = item["outputs"]
                    break
            _progress(40)
            time.sleep(0.5)
        else:
            client.post(f"{base}/interrupt", headers=headers)
            raise VideoGenerationError(f"timed out after {timeout_s:.0f}s")

        _progress(80)
        # Find first viewable file in outputs.
        file_meta = None
        if isinstance(outputs, dict):
            for _nid, node_out in outputs.items():
                if not isinstance(node_out, dict):
                    continue
                for key in ("gifs", "videos", "images"):
                    arr = node_out.get(key)
                    if isinstance(arr, list) and arr:
                        file_meta = arr[0]
                        break
                if file_meta:
                    break
        if not isinstance(file_meta, dict):
            raise VideoGenerationError("ComfyUI history has no downloadable outputs")
        filename = str(file_meta.get("filename") or "")
        subfolder = str(file_meta.get("subfolder") or "")
        ftype = str(file_meta.get("type") or "output")
        if not filename:
            raise VideoGenerationError("output missing filename")
        view = client.get(
            f"{base}/view",
            headers=headers,
            params={"filename": filename, "subfolder": subfolder, "type": ftype},
        )
        if view.status_code >= 400:
            raise VideoGenerationError(f"view failed: HTTP {view.status_code}")

        out_dir = _output_dir(tool_root)
        raw_path = out_dir / f"{prompt_id}_{filename}"
        raw_path.write_bytes(view.content)
        final_path = raw_path
        if not req["keep_audio"]:
            stripped = out_dir / f"{prompt_id}_silent{raw_path.suffix or '.mp4'}"
            _strip_audio(raw_path, stripped)
            final_path = stripped

        meta = register_output_file(
            owner,
            final_path,
            "video/mp4",
            name=final_path.name,
            move=False,
        )
        seconds = float(req["frames"]) / float(req["fps"] or 24)
        # Peak VRAM from ComfyUI system_stats when available (for trace + residency).
        peak_vram_gb = None
        try:
            stats = client.get(f"{base}/system_stats", headers=headers)
            if stats.status_code < 400 and stats.content:
                sbody = stats.json()
                devices = (sbody.get("devices") or []) if isinstance(sbody, dict) else []
                if isinstance(devices, list) and devices and isinstance(devices[0], dict):
                    # Comfy often reports vram_total / vram_free in bytes.
                    total = devices[0].get("vram_total")
                    free = devices[0].get("vram_free")
                    if isinstance(total, (int, float)) and isinstance(free, (int, float)):
                        used = max(0.0, float(total) - float(free))
                        peak_vram_gb = used / float(1024**3)
                        get_gpu_residency_manager().note_measured_vram(pid, peak_vram_gb)
        except Exception:  # noqa: BLE001
            pass
        residency = str(merged.get("residency") or "").strip().lower()
        if residency == "on_demand":
            # Drop weights now so the next admit sees free VRAM; idle report
            # still tracks the lease until timeout / eviction.
            _comfy_free(entry, client)
        _progress(100)
        timings["total_ms"] = int((time.time() - t0) * 1000)
        if peak_vram_gb is not None:
            timings["peak_vram_gb"] = round(peak_vram_gb, 3)
        return {
            "ok": True,
            "provider": pid,
            "synthetic_media": True,
            "file_id": meta["file_id"],
            "download_url": meta.get("download_url")
            or f"/api/v1/files/{meta['file_id']}",
            "quality": merged.get("quality_tier") or merged.get("quality"),
            "speed": merged.get("speed_tier") or merged.get("speed"),
            "clips": [
                {
                    "file_id": meta["file_id"],
                    "width": req["width"],
                    "height": req["height"],
                    "fps": req["fps"],
                    "seconds": seconds,
                    "has_audio": bool(req["keep_audio"]),
                    "seed": req["seed"],
                    "mode": mode,
                }
            ],
            "timings": timings,
        }
    finally:
        if lease is not None:
            get_gpu_residency_manager().release(lease)
        if owns_client:
            client.close()
