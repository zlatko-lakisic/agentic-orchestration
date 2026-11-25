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
    "probe_comfyui_idle_cuda",
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


def _required_nodes(entry: dict[str, Any]) -> list[str]:
    merged = _merged(entry)
    raw = merged.get("required_nodes")
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    # Fall back: unique class_type from workflow files when listed.
    return []


def _required_weights(entry: dict[str, Any]) -> list[dict[str, str]]:
    merged = _merged(entry)
    raw = merged.get("required_weights")
    out: list[dict[str, str]] = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            folder = str(item.get("folder") or "").strip()
            name = str(item.get("name") or "").strip()
            if folder and name:
                out.append({"folder": folder, "name": name})
    return out


def _comfy_model_names(
    client: httpx.Client,
    base: str,
    headers: dict[str, str],
    folder: str,
) -> set[str]:
    """List filenames ComfyUI sees under ``models/<folder>``."""
    names: set[str] = set()
    for path in (f"{base}/models/{folder}", f"{base}/api/models/{folder}"):
        try:
            resp = client.get(path, headers=headers)
        except Exception:  # noqa: BLE001
            continue
        if resp.status_code >= 400 or not resp.content:
            continue
        try:
            data = resp.json()
        except Exception:  # noqa: BLE001
            continue
        if isinstance(data, list):
            for item in data:
                if isinstance(item, str):
                    names.add(item)
                elif isinstance(item, dict):
                    n = item.get("name") or item.get("filename")
                    if n:
                        names.add(str(n))
        elif isinstance(data, dict):
            for key in ("files", "models", folder):
                arr = data.get(key)
                if isinstance(arr, list):
                    for item in arr:
                        if isinstance(item, str):
                            names.add(item)
        if names:
            break
    return names


def _weight_on_disk(folder: str, name: str) -> bool:
    """Optional hostPath check (engine mount / shared Ada path)."""
    root = (
        os.getenv("AGENTIC_COMFYUI_MODELS_HOSTPATH")
        or os.getenv("AGENTIC_COMFYUI_MODELS_DIR")
        or ""
    ).strip()
    if not root:
        return False
    path = Path(root) / folder / name
    if path.is_file():
        return True
    # Some loaders use nested names like loras/ltxv/...
    alt = Path(root) / name
    return alt.is_file()


def video_generation_health(entry: dict[str, Any]) -> dict[str, Any]:
    """Probe ComfyUI readiness (never include the URL in the payload).

    ``ready`` requires reachable ComfyUI, every ``required_nodes`` class in
    ``/object_info``, and every ``required_weights`` file visible via
    ``/models/<folder>`` or on the models hostPath.
    """
    pid = str(entry.get("id") or "")
    merged = _merged(entry)
    try:
        base = _endpoint(entry)
    except VideoGenerationError as exc:
        return {
            "ok": False,
            "ready": False,
            "reachable": False,
            "providerId": pid,
            "missing": [str(exc)],
            "error": str(exc),
            "qualityTier": merged.get("quality_tier"),
            "speedTier": merged.get("speed_tier"),
        }
    missing: list[str] = []
    try:
        with httpx.Client(timeout=12.0) as client:
            headers = _headers(entry)
            resp = client.get(f"{base}/system_stats", headers=headers)
            if resp.status_code >= 400:
                return {
                    "ok": False,
                    "ready": False,
                    "reachable": True,
                    "providerId": pid,
                    "missing": [f"system_stats HTTP {resp.status_code}"],
                    "error": f"HTTP {resp.status_code}",
                    "qualityTier": merged.get("quality_tier"),
                    "speedTier": merged.get("speed_tier"),
                }
            data = resp.json() if resp.content else {}
            devices = []
            if isinstance(data, dict):
                devices = data.get("devices") or data.get("gpus") or []
            gpu_name = None
            vram_free = None
            vram_total = None
            if isinstance(devices, list) and devices:
                first = devices[0] if isinstance(devices[0], dict) else {}
                gpu_name = first.get("name") or first.get("gpu_name")
                vram_free = first.get("vram_free") or first.get("free")
                vram_total = first.get("vram_total") or first.get("total")

            obj = client.get(f"{base}/object_info", headers=headers)
            object_info: dict[str, Any] = {}
            if obj.status_code < 400 and obj.content:
                body = obj.json()
                if isinstance(body, dict):
                    object_info = body
            for node_cls in _required_nodes(entry):
                if node_cls not in object_info:
                    missing.append(f"node:{node_cls}")

            for weight in _required_weights(entry):
                folder = weight["folder"]
                name = weight["name"]
                remote = _comfy_model_names(client, base, headers, folder)
                # Match basename or full relative path ComfyUI returns.
                basenames = {Path(n).name for n in remote} | set(remote)
                ok = name in basenames or Path(name).name in basenames
                if not ok:
                    ok = _weight_on_disk(folder, name)
                if not ok:
                    missing.append(f"weight:{folder}/{name}")

        ready = not missing
        return {
            "ok": ready,
            "ready": ready,
            "reachable": True,
            "gpuName": gpu_name,
            "vramFree": vram_free,
            "vramTotal": vram_total,
            "providerId": pid,
            "missing": missing,
            "qualityTier": merged.get("quality_tier"),
            "speedTier": merged.get("speed_tier"),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "ready": False,
            "reachable": False,
            "providerId": pid,
            "missing": [str(exc)],
            "error": str(exc),
            "qualityTier": merged.get("quality_tier"),
            "speedTier": merged.get("speed_tier"),
        }


def video_generation_runtime_health(tool_root: Path | None = None) -> dict[str, Any]:
    """Aggregate health for ``/health`` — never expose ComfyUI URL.

    ``configured`` — endpoint env set for at least one video provider.
    ``ready`` — Quill gate: configured and every video provider reports ``ready``
    (reachable + required nodes + required weights). ``missing`` lists gaps.
    """
    missing: list[str] = []
    providers: list[dict[str, Any]] = []
    configured = bool((os.getenv("AGENTIC_VIDEO_COMFYUI_URL") or "").strip())
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
            except VideoGenerationError as exc:
                missing.append(f"{entry.get('id')}:{exc}")
                continue
            h = video_generation_health(entry)
            providers.append(
                {
                    "id": entry.get("id"),
                    "ready": bool(h.get("ready")),
                    "missing": list(h.get("missing") or []),
                }
            )
            if not h.get("ready"):
                pid = str(entry.get("id") or "?")
                gaps = h.get("missing") or ["not ready"]
                missing.extend(f"{pid}:{g}" for g in gaps)
    except Exception as exc:  # noqa: BLE001
        if not configured:
            missing = ["AGENTIC_VIDEO_COMFYUI_URL unset"]
        else:
            missing.append(f"catalog:{exc}")
    ready = bool(configured and providers and all(p.get("ready") for p in providers))
    return {
        "configured": configured,
        "ready": ready,
        "missing": missing,
        "providers": providers,
        "ok": ready if configured else None,
    }


_COMFY_STATS_CACHE: dict[str, Any] | None = None
_COMFY_STATS_CACHE_AT = 0.0
_COMFY_STATS_CACHE_TTL_S = 2.0
_COMFY_STATS_TIMEOUT_S = 1.0


def probe_comfyui_idle_cuda(*, force: bool = False) -> dict[str, Any] | None:
    """Sample ComfyUI CUDA/RAM from ``/system_stats`` when URL is set.

    Cached (~2s) with a short HTTP timeout so ``/api/v1/gpu-residents`` does not
    stall Admin ``ao_resources`` mid-generation (#153).
    """
    global _COMFY_STATS_CACHE, _COMFY_STATS_CACHE_AT
    base = (os.getenv("AGENTIC_VIDEO_COMFYUI_URL") or "").strip().rstrip("/")
    if not base:
        return None
    now = time.time()
    if (
        not force
        and _COMFY_STATS_CACHE is not None
        and (now - _COMFY_STATS_CACHE_AT) < _COMFY_STATS_CACHE_TTL_S
    ):
        return dict(_COMFY_STATS_CACHE)
    token = (os.getenv("AGENTIC_VIDEO_COMFYUI_TOKEN") or "").strip()
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        with httpx.Client(timeout=_COMFY_STATS_TIMEOUT_S) as client:
            resp = client.get(f"{base}/system_stats", headers=headers)
        if resp.status_code >= 400 or not resp.content:
            result = {
                "providerId": "comfyui",
                "model": "ComfyUI",
                "kind": "video",
                "state": "unreachable",
                "vramBytes": None,
                "error": f"HTTP {resp.status_code}",
            }
            _COMFY_STATS_CACHE = result
            _COMFY_STATS_CACHE_AT = now
            return dict(result)
        data = resp.json() if resp.content else {}
        devices = (data.get("devices") or data.get("gpus") or []) if isinstance(data, dict) else []
        used = None
        if isinstance(devices, list) and devices and isinstance(devices[0], dict):
            total = devices[0].get("vram_total")
            free = devices[0].get("vram_free")
            if isinstance(total, (int, float)) and isinstance(free, (int, float)):
                used = int(max(0.0, float(total) - float(free)))
        ram_used = None
        system = data.get("system") if isinstance(data, dict) else None
        if isinstance(system, dict):
            ram_total = system.get("ram_total")
            ram_free = system.get("ram_free")
            if isinstance(ram_total, (int, float)) and isinstance(ram_free, (int, float)):
                ram_used = int(max(0.0, float(ram_total) - float(ram_free)))
        result = {
            "providerId": "comfyui",
            "model": "ComfyUI",
            "kind": "video",
            "state": "idle",
            "vramBytes": used,
            "ramBytes": ram_used,
            "loadedAt": None,
            "lastUsedAt": None,
            "expiresAt": None,
        }
        _COMFY_STATS_CACHE = result
        _COMFY_STATS_CACHE_AT = now
        return dict(result)
    except Exception as exc:  # noqa: BLE001
        result = {
            "providerId": "comfyui",
            "model": "ComfyUI",
            "kind": "video",
            "state": "unreachable",
            "vramBytes": None,
            "error": str(exc),
        }
        # Do not cache hard failures long — next poll may succeed.
        return result


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


def _comfy_interrupt_and_clear(
    *,
    base: str,
    headers: dict[str, str],
    client: httpx.Client,
    prompt_id: str | None = None,
) -> None:
    """Stop the running graph and drop its queue entry (#144)."""
    try:
        client.post(f"{base}/interrupt", headers=headers)
    except Exception:  # noqa: BLE001
        pass
    if not prompt_id:
        return
    try:
        client.post(
            f"{base}/queue",
            headers={**headers, "Content-Type": "application/json"},
            json={"delete": [prompt_id]},
        )
    except Exception:  # noqa: BLE001
        pass


def _raise_comfy_transport(exc: BaseException) -> None:
    """Map memcg/pod death during a clip to a clear clip failure (#143)."""
    msg = str(exc).lower()
    if isinstance(exc, (httpx.ConnectError, httpx.RemoteProtocolError, httpx.ReadError)):
        raise VideoGenerationError("out of memory") from exc
    if any(tok in msg for tok in ("connection reset", "connection refused", "eof", "broken pipe")):
        raise VideoGenerationError("out of memory") from exc
    raise VideoGenerationError(f"ComfyUI unreachable: {exc}") from exc


def _delete_comfy_output(
    *,
    filename: str,
    subfolder: str = "",
    ftype: str = "output",
) -> None:
    """Delete ComfyUI output after AO has stored the clip (shared hostPath)."""
    if ftype and ftype not in ("output", "temp"):
        return
    root = (
        os.getenv("AGENTIC_COMFYUI_OUTPUT_HOSTPATH")
        or os.getenv("AGENTIC_COMFYUI_OUTPUT_DIR")
        or ""
    ).strip()
    if not root or not filename:
        return
    # Reject path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        return
    if ".." in subfolder or subfolder.startswith(("/", "\\")):
        return
    base = Path(root)
    path = base / subfolder / filename if subfolder else base / filename
    try:
        resolved = path.resolve()
        if not str(resolved).startswith(str(base.resolve())):
            return
        if resolved.is_file():
            resolved.unlink()
    except OSError:
        return


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

    prompt_id: str | None = None
    try:
        if cancel_event is not None and getattr(cancel_event, "is_set", lambda: False)():
            raise VideoGenerationError("cancelled")
        if img_path is not None:
            _progress(5)
            try:
                with img_path.open("rb") as fh:
                    up = client.post(
                        f"{base}/upload/image",
                        headers=headers,
                        files={"image": (img_path.name, fh, "application/octet-stream")},
                    )
            except (httpx.HTTPError, OSError) as exc:
                _raise_comfy_transport(exc)
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

        if cancel_event is not None and getattr(cancel_event, "is_set", lambda: False)():
            raise VideoGenerationError("cancelled")
        _progress(10)
        try:
            queued = client.post(
                f"{base}/prompt",
                headers={**headers, "Content-Type": "application/json"},
                json={"prompt": graph, "client_id": uuid.uuid4().hex},
            )
        except (httpx.HTTPError, OSError) as exc:
            _raise_comfy_transport(exc)
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
                _comfy_interrupt_and_clear(
                    base=base, headers=headers, client=client, prompt_id=prompt_id
                )
                raise VideoGenerationError("cancelled")
            try:
                hist = client.get(f"{base}/history/{prompt_id}", headers=headers)
            except (httpx.HTTPError, OSError) as exc:
                _raise_comfy_transport(exc)
            if hist.status_code < 400 and hist.content:
                hbody = hist.json()
                item = hbody.get(prompt_id) if isinstance(hbody, dict) else None
                if isinstance(item, dict):
                    status = item.get("status") if isinstance(item.get("status"), dict) else {}
                    if str(status.get("status_str") or "") == "error":
                        msg = "ComfyUI execution error"
                        for entry in status.get("messages") or []:
                            if (
                                isinstance(entry, (list, tuple))
                                and len(entry) >= 2
                                and entry[0] == "execution_error"
                                and isinstance(entry[1], dict)
                            ):
                                detail = entry[1].get("exception_message") or entry[1].get(
                                    "node_type"
                                )
                                if detail:
                                    msg = f"ComfyUI execution error: {detail}"
                                break
                        raise VideoGenerationError(msg[:500])
                    if item.get("outputs"):
                        outputs = item["outputs"]
                        break
            _progress(40)
            time.sleep(0.5)
        else:
            _comfy_interrupt_and_clear(
                base=base, headers=headers, client=client, prompt_id=prompt_id
            )
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
        # Drop ComfyUI's copy once AO has the clip in client storage.
        _delete_comfy_output(filename=filename, subfolder=subfolder, ftype=ftype)
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
        # Always /free after success or failure so weights leave VRAM.
        try:
            _comfy_free(entry, client)
        except Exception:  # noqa: BLE001
            pass
        if lease is not None:
            get_gpu_residency_manager().release(lease)
        if owns_client:
            client.close()
