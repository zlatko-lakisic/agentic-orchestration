"""Unit tests for type: video_generation (mocked ComfyUI)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from agent_providers.factory import agent_provider_from_dict
from orchestration.agent_providers_catalog import (
    catalog_for_planner_prompt,
    entries_for_planner,
    load_agent_providers_catalog,
)
from orchestration.answer_cache_policy import answer_cache_bypass_for_entries
from orchestration.cloud_anonymize import is_cloud_provider_type
from orchestration.client_files import save_client_file
from orchestration.user_context import Identity
from orchestration.video_generation_runtime import (
    VideoGenerationError,
    apply_workflow_bindings,
    is_video_generation_entry,
    run_video_generation,
    validate_ltx_geometry,
    video_generation_health,
    video_generation_runtime_health,
)

pytestmark = pytest.mark.unit

TOOL_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = TOOL_ROOT / "tests" / "fixtures" / "video_workflows"


def _ident(uid: str = "alice") -> Identity:
    return Identity(
        user_name=uid.title(),
        session_id=f"s-{uid}",
        user_id=uid,
        local=False,
        mtls=True,
    )


def test_is_not_cloud_type() -> None:
    assert is_cloud_provider_type("video_generation") is False


def test_validate_ltx_geometry() -> None:
    validate_ltx_geometry(width=544, height=960, frames=121)
    with pytest.raises(VideoGenerationError):
        validate_ltx_geometry(width=545, height=960, frames=121)
    with pytest.raises(VideoGenerationError):
        validate_ltx_geometry(width=544, height=960, frames=120)


def test_apply_bindings() -> None:
    graph = json.loads((FIXTURES / "t2v.json").read_text(encoding="utf-8"))
    bindings = {
        "prompt": {"node": "10", "field": "text"},
        "seed": {"node": "20", "field": "noise_seed"},
        "frames": {"node": "20", "field": "length"},
    }
    out = apply_workflow_bindings(
        graph, bindings, {"prompt": "hello", "seed": 42, "frames": 121}
    )
    assert out["10"]["inputs"]["text"] == "hello"
    assert out["20"]["inputs"]["noise_seed"] == 42
    assert out["20"]["inputs"]["length"] == 121


def test_shipped_workflows_bindings_resolve() -> None:
    """#115: shipped API graphs must match YAML bindings (no placeholder <id>)."""
    import yaml

    for catalog in (
        TOOL_ROOT / "config/agent_providers/video_ltx23_distilled.yaml",
        TOOL_ROOT / "config/agent_providers_jetson/video_ltx23_distilled.yaml",
        TOOL_ROOT / "config/agent_providers/video_wan22_i2v.yaml",
        TOOL_ROOT / "config/agent_providers_jetson/video_wan22_i2v.yaml",
    ):
        entry = yaml.safe_load(catalog.read_text(encoding="utf-8"))
        bindings = entry.get("bindings") or {}
        for key, bind in bindings.items():
            assert isinstance(bind, dict), key
            node = str(bind.get("node") or "")
            assert node and node != "<id>", f"{catalog.name} binding {key} still placeholder"
            also = bind.get("also") or []
            if isinstance(also, list):
                for item in also:
                    assert str(item.get("node") or "") not in ("", "<id>")
        workflows = entry.get("workflows") or {}
        for mode, rel in workflows.items():
            path = TOOL_ROOT / rel
            assert path.is_file(), path
            graph = json.loads(path.read_text(encoding="utf-8"))
            assert not str(graph.get("_comment", "")).lower().startswith("placeholder")
            values = {
                "prompt": "test prompt",
                "negative_prompt": "blurry",
                "seed": 7,
                "width": 544,
                "height": 960,
                "frames": 97,
            }
            if mode == "i2v":
                values["image"] = "start.png"
            out = apply_workflow_bindings(graph, bindings, values)
            for key, bind in bindings.items():
                if key == "image" and mode != "i2v":
                    continue
                if key not in values:
                    continue
                node_id = str(bind["node"])
                field = str(bind["field"])
                assert out[node_id]["inputs"][field] == values[key], (mode, key)


def test_factory_loads_yaml() -> None:
    raw = (TOOL_ROOT / "config/agent_providers/video_ltx23_distilled.yaml").read_text(
        encoding="utf-8"
    )
    import yaml

    data = yaml.safe_load(raw)
    provider = agent_provider_from_dict(data, default_model="")
    assert provider.config.provider_type == "video_generation"
    assert provider.config.model == "video_generation"
    assert "t2v" in provider.config.provider_options.get("workflows", {})


def test_planner_omits_video_generation() -> None:
    entries = load_agent_providers_catalog(TOOL_ROOT / "config/agent_providers")
    assert any(e.get("id") == "video_ltx23_distilled" for e in entries)
    assert any(e.get("id") == "video_wan22_i2v" for e in entries)
    planned = entries_for_planner(entries)
    assert all(
        e.get("id") not in ("video_ltx23_distilled", "video_wan22_i2v") for e in planned
    )
    assert "video_ltx23_distilled" not in catalog_for_planner_prompt(entries)


def test_wan_and_ltx_quality_speed_tiers() -> None:
    import yaml

    ltx = yaml.safe_load(
        (TOOL_ROOT / "config/agent_providers/video_ltx23_distilled.yaml").read_text(
            encoding="utf-8"
        )
    )
    wan = yaml.safe_load(
        (TOOL_ROOT / "config/agent_providers/video_wan22_i2v.yaml").read_text(
            encoding="utf-8"
        )
    )
    assert ltx.get("quality_tier") == "fast"
    assert ltx.get("speed_tier") == "fast"
    assert wan.get("quality_tier") == "high"
    assert wan.get("speed_tier") == "slow"
    assert (TOOL_ROOT / wan["workflows"]["i2v"]).is_file()
    provider = agent_provider_from_dict(wan, default_model="")
    assert provider.config.provider_type == "video_generation"
    assert provider.config.provider_options.get("geometry") == "wan"


def test_answer_cache_bypass() -> None:
    assert answer_cache_bypass_for_entries([{"type": "video_generation"}])
    assert answer_cache_bypass_for_entries([{"type": "object_detection"}])
    assert not answer_cache_bypass_for_entries([{"type": "ollama"}])


class _MockTransport(httpx.BaseTransport):
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.interrupted = False
        self.freed = False

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = request.method
        self.calls.append((method, path))
        if path == "/upload/image" and method == "POST":
            return httpx.Response(200, json={"name": "start.png"})
        if path == "/prompt" and method == "POST":
            return httpx.Response(200, json={"prompt_id": "p1"})
        if path == "/history/p1":
            return httpx.Response(
                200,
                json={
                    "p1": {
                        "outputs": {
                            "9": {
                                "gifs": [
                                    {
                                        "filename": "clip.mp4",
                                        "subfolder": "",
                                        "type": "output",
                                    }
                                ]
                            }
                        }
                    }
                },
            )
        if path == "/view":
            return httpx.Response(200, content=b"ftypfakevideobytes")
        if path == "/interrupt":
            self.interrupted = True
            return httpx.Response(200, json={})
        if path == "/free":
            self.freed = True
            return httpx.Response(200, json={})
        if path == "/system_stats":
            return httpx.Response(
                200,
                json={
                    "devices": [
                        {
                            "name": "MockGPU",
                            "vram_free": 20000000000,
                            "vram_total": 24000000000,
                        }
                    ]
                },
            )
        if path == "/object_info":
            return httpx.Response(
                200,
                json={
                    "UNETLoader": {},
                    "CLIPLoader": {},
                    "VAELoader": {},
                    "CLIPTextEncode": {},
                    "LoadImage": {},
                    "Wan22ImageToVideoLatent": {},
                    "ModelSamplingSD3": {},
                    "KSampler": {},
                    "VAEDecode": {},
                    "CreateVideo": {},
                    "SaveVideo": {},
                },
            )
        if path.startswith("/models/") or path.startswith("/api/models/"):
            folder = path.rsplit("/", 1)[-1]
            names = {
                "diffusion_models": ["wan2.2_ti2v_5B_fp16.safetensors"],
                "text_encoders": ["umt5_xxl_fp8_e4m3fn_scaled.safetensors"],
                "vae": ["wan2.2_vae.safetensors"],
            }.get(folder, [])
            return httpx.Response(200, json=names)
        return httpx.Response(404, json={"error": path})


def test_run_video_generation_mocked(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_VIDEO_COMFYUI_URL", "http://comfy.test")
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))
    monkeypatch.setenv("AGENTIC_VIDEO_OUTPUT_DIR", str(tmp_path / "out"))
    # Avoid real ffmpeg dependency: keep_audio true skips strip.
    transport = _MockTransport()
    client = httpx.Client(transport=transport)
    entry = {
        "id": "video_ltx23_distilled",
        "type": "video_generation",
        "workflows": {
            "t2v": str(FIXTURES / "t2v.json"),
            "i2v": str(FIXTURES / "i2v.json"),
        },
        "bindings": {
            "prompt": {"node": "10", "field": "text"},
            "seed": {"node": "20", "field": "noise_seed"},
            "width": {"node": "20", "field": "width"},
            "height": {"node": "20", "field": "height"},
            "frames": {"node": "20", "field": "length"},
            "image": {"node": "15", "field": "image"},
        },
        "defaults": {"width": 544, "height": 960, "fps": 24, "frames": 121, "keep_audio": True},
        "limits": {"max_frames": 241, "timeout_s": 30},
        "residency": "on_demand",
        "endpoint_env": "AGENTIC_VIDEO_COMFYUI_URL",
    }
    progress: list[str] = []
    result = run_video_generation(
        entry,
        text=json.dumps({"prompt": "gentle breeze", "seed": 7}),
        tool_root=TOOL_ROOT,
        user_id="alice",
        on_progress=progress.append,
        client=client,
    )
    assert result["ok"] is True
    assert result["synthetic_media"] is True
    assert result["file_id"]
    assert result["download_url"].startswith("/api/v1/files/")
    assert result["clips"][0]["seconds"] == pytest.approx(121 / 24)
    assert any(p.startswith("video_generation:") for p in progress)
    assert transport.freed is True

    # i2v path with uploaded file id
    meta = save_client_file(_ident(), b"\xff\xd8\xff", "s.jpg", "image/jpeg")
    result2 = run_video_generation(
        entry,
        text=json.dumps(
            {
                "prompt": "subtle motion",
                "start_image_file_id": meta["file_id"],
                "seed": 9,
            }
        ),
        tool_root=TOOL_ROOT,
        identity=_ident(),
        client=httpx.Client(transport=transport),
    )
    assert result2["ok"] is True
    assert result2["clips"][0]["mode"] == "i2v"
    assert ("POST", "/upload/image") in transport.calls


def test_video_health_configured_vs_ready(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("AGENTIC_VIDEO_COMFYUI_URL", raising=False)
    base = video_generation_runtime_health(TOOL_ROOT)
    assert base["configured"] is False
    assert base["ready"] is False
    assert base["missing"]

    monkeypatch.setenv("AGENTIC_VIDEO_COMFYUI_URL", "http://comfy.test")
    import yaml

    wan = yaml.safe_load(
        (TOOL_ROOT / "config/agent_providers/video_wan22_i2v.yaml").read_text(
            encoding="utf-8"
        )
    )
    transport = _MockTransport()
    # Patch httpx.Client used inside video_generation_health
    real_client = httpx.Client
    monkeypatch.setattr(
        "orchestration.video_generation_runtime.httpx.Client",
        lambda *a, **k: real_client(transport=transport, timeout=k.get("timeout", 5)),
    )
    snap = video_generation_health(wan)
    assert snap["reachable"] is True
    assert snap["ready"] is True
    assert snap["missing"] == []
    assert snap["providerId"] == "video_wan22_i2v"


def test_deletes_comfy_output_after_register(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AGENTIC_VIDEO_COMFYUI_URL", "http://comfy.test")
    monkeypatch.setenv("AGENTIC_FILES_DIR", str(tmp_path / "files"))
    monkeypatch.setenv("AGENTIC_VIDEO_OUTPUT_DIR", str(tmp_path / "out"))
    comfy_out = tmp_path / "comfy-out"
    comfy_out.mkdir()
    leftover = comfy_out / "clip.mp4"
    leftover.write_bytes(b"stale")
    monkeypatch.setenv("AGENTIC_COMFYUI_OUTPUT_HOSTPATH", str(comfy_out))
    transport = _MockTransport()
    entry = {
        "id": "video_ltx23_distilled",
        "type": "video_generation",
        "workflows": {"t2v": str(FIXTURES / "t2v.json")},
        "bindings": {
            "prompt": {"node": "10", "field": "text"},
            "seed": {"node": "20", "field": "noise_seed"},
            "width": {"node": "20", "field": "width"},
            "height": {"node": "20", "field": "height"},
            "frames": {"node": "20", "field": "length"},
        },
        "defaults": {
            "width": 544,
            "height": 960,
            "fps": 24,
            "frames": 121,
            "keep_audio": True,
        },
        "limits": {"max_frames": 241, "timeout_s": 30},
        "residency": "on_demand",
        "endpoint_env": "AGENTIC_VIDEO_COMFYUI_URL",
    }
    result = run_video_generation(
        entry,
        text=json.dumps({"prompt": "gentle breeze", "seed": 7}),
        tool_root=TOOL_ROOT,
        user_id="alice",
        client=httpx.Client(transport=transport),
    )
    assert result["ok"] is True
    assert not leftover.exists()


def test_rejects_bad_frames_before_http(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_VIDEO_COMFYUI_URL", "http://comfy.test")
    entry = {
        "id": "v",
        "type": "video_generation",
        "workflows": {"t2v": str(FIXTURES / "t2v.json")},
        "defaults": {"width": 544, "height": 960, "frames": 121},
    }
    with pytest.raises(VideoGenerationError, match="8n\\+1"):
        run_video_generation(
            entry,
            text=json.dumps({"prompt": "x", "frames": 100}),
            tool_root=TOOL_ROOT,
            client=httpx.Client(transport=_MockTransport()),
        )
