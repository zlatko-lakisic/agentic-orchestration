"""Unit tests for object_detection provider, artifacts, runtime helpers, routing."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import yaml

from agent_providers.factory import AGENT_PROVIDER_TYPE_REGISTRY, agent_provider_from_dict
from orchestration.detection_artifacts import (
    WeightsVerifyError,
    ensure_detection_weights,
    sha256_file,
    weights_spec_from_entry,
)
from orchestration.object_detection_runtime import (
    is_object_detection_entry,
    letterbox,
    postprocess_yolox_like,
    reset_detection_sessions_for_tests,
    resolve_execution_providers,
)
from orchestration.reach_multimodal import ReachImage, parse_reach_images

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "detection"


@pytest.fixture(autouse=True)
def _reset_sessions() -> None:
    reset_detection_sessions_for_tests()
    yield
    reset_detection_sessions_for_tests()


def _sample_entry(weights_path: Path, digest: str, **extra: Any) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": "detect_test",
        "type": "object_detection",
        "role": "Detector",
        "goal": "Detect",
        "backstory": "Test detector",
        "weights": {
            "uri": str(weights_path),
            "sha256": digest,
            "format": "onnx",
        },
        "input": {"width": 64, "height": 64},
        "confidence_min": 0.1,
        "iou_threshold": 0.5,
        "class_names": ["person", "car"],
        "residency": "resident",
        "harness_profile": "detection",
        "harness": {"skip_live": True},
    }
    entry.update(extra)
    return entry


def test_registry_has_object_detection() -> None:
    assert "object_detection" in AGENT_PROVIDER_TYPE_REGISTRY


def test_factory_parses_object_detection(tmp_path: Path) -> None:
    blob = b"fake-onnx-bytes"
    path = tmp_path / "w.onnx"
    path.write_bytes(blob)
    digest = sha256_file(path)
    entry = _sample_entry(path, digest)
    ap = agent_provider_from_dict(entry, default_model="x")
    assert ap.config.provider_type == "object_detection"
    ap.validate_config()


def test_factory_requires_weights_sha256(tmp_path: Path) -> None:
    entry = {
        "id": "bad",
        "type": "object_detection",
        "role": "r",
        "goal": "g",
        "backstory": "b",
        "weights": {"uri": str(tmp_path / "x.onnx")},
    }
    with pytest.raises(ValueError, match="sha256"):
        agent_provider_from_dict(entry, default_model="x")


def test_checksum_mismatch(tmp_path: Path) -> None:
    path = tmp_path / "w.onnx"
    path.write_bytes(b"abc")
    entry = _sample_entry(path, "0" * 64)
    with pytest.raises(WeightsVerifyError):
        ensure_detection_weights(entry)


def test_checksum_ok_copies_to_cache(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "w.onnx"
    path.write_bytes(b"abc123")
    digest = sha256_file(path)
    cache = tmp_path / "cache"
    monkeypatch.setenv("AGENTIC_DETECTION_ARTIFACT_CACHE", str(cache))
    entry = _sample_entry(path, digest)
    out = ensure_detection_weights(entry)
    assert out.is_file()
    assert sha256_file(out) == digest


def test_letterbox_preserves_aspect() -> None:
    from PIL import Image

    img = Image.new("RGB", (200, 100), (1, 2, 3))
    padded, ratio, pads = letterbox(img, new_shape=(64, 64))
    assert padded.size == (64, 64)
    assert ratio == pytest.approx(64 / 200)
    assert pads[0] == pytest.approx(0.0)


def test_postprocess_empty_and_boxes() -> None:
    # No detections below threshold
    out = np.zeros((10, 7), dtype=np.float32)
    dets = postprocess_yolox_like(
        out,
        input_width=64,
        input_height=64,
        orig_w=64,
        orig_h=64,
        ratio=1.0,
        pads=(0.0, 0.0),
        class_names=["person", "car"],
        confidence_min=0.5,
        iou_threshold=0.45,
        classes_allowlist=None,
    )
    assert dets == []

    # One confident person (cx,cy,w,h,obj,cls0,cls1)
    row = np.array([[32, 32, 20, 20, 0.9, 0.95, 0.05]], dtype=np.float32)
    dets = postprocess_yolox_like(
        row,
        input_width=64,
        input_height=64,
        orig_w=64,
        orig_h=64,
        ratio=1.0,
        pads=(0.0, 0.0),
        class_names=["person", "car"],
        confidence_min=0.25,
        iou_threshold=0.45,
        classes_allowlist=None,
    )
    assert len(dets) == 1
    assert dets[0]["label"] == "person"
    assert dets[0]["box_xyxy"][0] <= dets[0]["box_xyxy"][2]


def test_execution_provider_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_DETECTION_ORT_PROVIDERS", raising=False)
    eps = resolve_execution_providers({"execution_providers": ["tensorrt", "cuda", "cpu"]})
    assert eps[0] == "TensorrtExecutionProvider"
    assert eps[-1] == "CPUExecutionProvider"
    monkeypatch.setenv("AGENTIC_DETECTION_ORT_PROVIDERS", "cpu")
    assert resolve_execution_providers({}) == ["CPUExecutionProvider"]


def test_is_object_detection_entry() -> None:
    assert is_object_detection_entry({"type": "object_detection"})
    assert not is_object_detection_entry({"type": "ollama"})


def test_catalog_planner_section_includes_detection() -> None:
    from orchestration.agent_providers_catalog import catalog_for_planner_prompt

    text = catalog_for_planner_prompt(
        [
            {
                "id": "d1",
                "type": "object_detection",
                "role": "Det",
                "goal": "g",
                "backstory": "b",
                "planner_hint": "boxes",
            }
        ]
    )
    assert "object_detection" in text
    assert "d1" in text


def test_answer_cache_bypass_helper() -> None:
    from orchestration.answer_cache_policy import answer_cache_bypass_for_entries

    assert answer_cache_bypass_for_entries([{"type": "object_detection"}])
    assert not answer_cache_bypass_for_entries([{"type": "ollama"}])


def test_infer_harness_profile_detection() -> None:
    from orchestration.agent_harness import infer_harness_profile

    assert infer_harness_profile({"type": "object_detection", "id": "x", "role": "r"}) == "detection"


def test_ws_routes_detection_vs_multimodal(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """_execute_inner chooses detection when catalog type matches."""
    blob = (FIXTURE_ROOT / "tiny.png").read_bytes()

    catalog = tmp_path / "agent_providers"
    catalog.mkdir()
    det = {
        "id": "det_route",
        "type": "object_detection",
        "role": "Det",
        "goal": "g",
        "backstory": "b",
        "weights": {
            "uri": str(tmp_path / "missing.onnx"),
            "sha256": "a" * 64,
            "format": "onnx",
        },
    }
    (catalog / "det.yaml").write_text(yaml.safe_dump(det), encoding="utf-8")
    vision = {
        "id": "vision_route",
        "type": "openai",
        "model": "gpt-4o-mini",
        "role": "Vision",
        "goal": "g",
        "backstory": "b",
    }
    (catalog / "vis.yaml").write_text(yaml.safe_dump(vision), encoding="utf-8")

    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_KB", "0")

    from orchestration.serve.ws import WsConnection

    called: dict[str, Any] = {}

    class Stub:
        tool_root = tmp_path

        def _progress_to_status(self, *a: Any, **k: Any) -> None:
            return None

        def _execute_detection(self, *a: Any, **k: Any) -> str:
            called["detection"] = True
            return '{"detections":[]}'

        def _execute_multimodal(self, *a: Any, **k: Any) -> str:
            called["multimodal"] = True
            return "vision"

        def _execute_text(self, *a: Any, **k: Any) -> str:
            called["text"] = True
            return "text"

        _execute_inner = WsConnection._execute_inner

    images = parse_reach_images(
        [
            {
                "mimeType": "image/png",
                "dataBase64": base64.b64encode(blob).decode("ascii"),
                "name": "tiny.png",
            }
        ]
    )
    stub = Stub()
    out = stub._execute_inner(  # type: ignore[misc]
        {"agent_provider_id": "det_route"},
        "direct_agent",
        "find",
        {},
        None,
        "s",
        "run1",
        images,
    )
    assert called.get("detection") is True
    assert "detections" in out

    called.clear()
    stub._execute_inner(  # type: ignore[misc]
        {"agent_provider_id": "vision_route"},
        "direct_agent",
        "describe",
        {},
        None,
        "s",
        "run2",
        images,
    )
    assert called.get("multimodal") is True


def test_mcp_detect_objects_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_MCP_DETECTION_ENABLED", raising=False)
    from mcp_servers.object_detection.server import detect_objects_impl

    out = detect_objects_impl(path=str(FIXTURE_ROOT / "tiny.png"))
    assert out["ok"] is False
    assert out["code"] == "detection_unavailable"


def test_weights_spec_from_entry() -> None:
    spec = weights_spec_from_entry(
        {
            "id": "x",
            "weights": {
                "uri": "https://example/x.onnx",
                "sha256": "ab" * 32,
            },
        }
    )
    assert spec["uri"].startswith("https://")
    assert len(spec["sha256"]) == 64
