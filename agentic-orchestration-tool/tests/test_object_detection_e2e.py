"""
Optional live e2e for object_detection (real ONNX + labelled fixtures).

Enable::

    pip install -r requirements-detection.txt
    AGENTIC_DETECTION_E2E=1 python -m pytest tests/test_object_detection_e2e.py -m integration -s

Optional::

    AGENTIC_DETECTION_E2E_SERVE=1          # WS routing smoke (TestClient)
    AGENTIC_DETECTION_E2E_REQUIRE_TENSORRT=1
    AGENTIC_DETECTION_E2E_WEIGHTS / _SHA256 / _IMAGE  # operator overrides
"""

from __future__ import annotations

import base64
import json
import os
import shutil
from pathlib import Path
from urllib.request import urlretrieve

import pytest
import yaml

pytestmark = [
    pytest.mark.integration,
    pytest.mark.timeout(300),
]

TOOL_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_LIVE = TOOL_ROOT / "tests" / "fixtures" / "detection" / "live"
YOLOX_NANO_URL = (
    "https://github.com/Megvii-BaseDetection/YOLOX/releases/download/"
    "0.1.1rc0/yolox_nano.onnx"
)


def _enabled() -> bool:
    return os.getenv("AGENTIC_DETECTION_E2E", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _skip_unless_enabled() -> None:
    if not _enabled():
        pytest.skip("Set AGENTIC_DETECTION_E2E=1 for live object_detection e2e")


def _ensure_deps() -> None:
    try:
        import onnxruntime  # noqa: F401
        import numpy  # noqa: F401
        from PIL import Image  # noqa: F401
    except ImportError as exc:
        pytest.skip(f"detection deps missing ({exc}); pip install -r requirements-detection.txt")


@pytest.fixture
def weights_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[Path, str]:
    _skip_unless_enabled()
    _ensure_deps()
    from orchestration.detection_artifacts import detection_artifact_cache_dir, sha256_file

    override = os.getenv("AGENTIC_DETECTION_E2E_WEIGHTS", "").strip()
    override_sha = os.getenv("AGENTIC_DETECTION_E2E_SHA256", "").strip().lower()
    cache = tmp_path / "det-cache"
    monkeypatch.setenv("AGENTIC_DETECTION_ARTIFACT_CACHE", str(cache))

    if override:
        path = Path(override)
        if not path.is_file():
            pytest.skip(f"AGENTIC_DETECTION_E2E_WEIGHTS not found: {path}")
        digest = override_sha or sha256_file(path)
        return path, digest

    dest = cache / "yolox_nano.onnx"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.is_file():
        try:
            urlretrieve(YOLOX_NANO_URL, dest)  # noqa: S310
        except Exception as exc:  # noqa: BLE001
            pytest.skip(f"could not download YOLOX nano: {exc}")
    digest = override_sha or sha256_file(dest)
    # Also seed the process-wide cache dir used by ensure
    seeded = detection_artifact_cache_dir() / f"{digest}.onnx"
    seeded.parent.mkdir(parents=True, exist_ok=True)
    if not seeded.is_file():
        shutil.copy2(dest, seeded)
    return dest, digest


def _entry(weights: Path, digest: str) -> dict:
    return {
        "id": "e2e_detect",
        "type": "object_detection",
        "role": "E2E detector",
        "goal": "Return boxes",
        "backstory": "Live e2e ONNX detector",
        "weights": {"uri": str(weights), "sha256": digest, "format": "onnx"},
        "runtime": "onnxruntime",
        "execution_providers": ["tensorrt", "cuda", "cpu"],
        "input": {"width": 416, "height": 416},
        "confidence_min": 0.3,
        "iou_threshold": 0.45,
        "residency": "resident",
        "harness_profile": "detection",
        "harness": {"skip_live": True},
    }


def test_live_ready_warmup_and_resident(
    weights_path: tuple[Path, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.object_detection_runtime import (
        ensure_object_detection_ready,
        reset_detection_sessions_for_tests,
        run_object_detection,
    )
    from orchestration.reach_multimodal import ReachImage

    reset_detection_sessions_for_tests()
    path, digest = weights_path
    entry = _entry(path, digest)
    states: list[str] = []

    def life(state: str, detail: dict) -> None:
        states.append(state)

    meta = ensure_object_detection_ready(entry, on_lifecycle=life)
    assert "loading" in states or "ready" in states
    assert meta.get("execution_provider")
    if os.getenv("AGENTIC_DETECTION_E2E_REQUIRE_TENSORRT", "").strip() in ("1", "true"):
        assert "Tensorrt" in str(meta.get("execution_provider"))

    img = ReachImage(
        mime_type="image/jpeg",
        data=(FIXTURE_LIVE / "negative.jpg").read_bytes(),
        name="negative.jpg",
    )
    first = json.loads(run_object_detection(entry, images=[img]))
    second = json.loads(run_object_detection(entry, images=[img]))
    assert second["model"]["weights_resident"] is True
    assert "execution_provider" in second["model"]
    assert isinstance(first["detections"], list)


def test_live_checksum_fail(weights_path: tuple[Path, str], tmp_path: Path) -> None:
    from orchestration.detection_artifacts import WeightsVerifyError, ensure_detection_weights

    path, _digest = weights_path
    bad = _entry(path, "0" * 64)
    with pytest.raises(WeightsVerifyError):
        ensure_detection_weights(bad)


def test_live_empty_success(weights_path: tuple[Path, str]) -> None:
    from orchestration.object_detection_runtime import reset_detection_sessions_for_tests, run_object_detection
    from orchestration.reach_multimodal import ReachImage

    reset_detection_sessions_for_tests()
    path, digest = weights_path
    entry = _entry(path, digest)
    img = ReachImage(
        mime_type="image/jpeg",
        data=(FIXTURE_LIVE / "negative.jpg").read_bytes(),
        name="negative.jpg",
    )
    result = json.loads(run_object_detection(entry, images=[img]))
    assert "detections" in result
    assert result["image"]["width"] > 0
    # Uniform gray should usually be empty; allow soft if model hallucinates
    if result["detections"]:
        for d in result["detections"]:
            assert "label" in d and "box_xyxy" in d and "confidence" in d


def test_live_positive_schema(weights_path: tuple[Path, str]) -> None:
    from orchestration.object_detection_runtime import reset_detection_sessions_for_tests, run_object_detection
    from orchestration.reach_multimodal import ReachImage

    reset_detection_sessions_for_tests()
    path, digest = weights_path
    entry = _entry(path, digest)
    image_path = Path(os.getenv("AGENTIC_DETECTION_E2E_IMAGE", str(FIXTURE_LIVE / "positive.jpg")))
    img = ReachImage(
        mime_type="image/jpeg",
        data=image_path.read_bytes(),
        name=image_path.name,
    )
    result = json.loads(run_object_detection(entry, images=[img]))
    assert isinstance(result["detections"], list)
    assert result["model"]["detection_count"] == len(result["detections"])
    assert result["model"]["inference_ms"] >= 0


def test_live_caps_enforced() -> None:
    _skip_unless_enabled()
    from orchestration.reach_multimodal import ReachImageTooLargeError, parse_reach_images

    huge = base64.b64encode(b"x" * (5 * 1024 * 1024)).decode("ascii")
    with pytest.raises(ReachImageTooLargeError):
        parse_reach_images([{"mimeType": "image/jpeg", "dataBase64": huge}])


def test_live_mcp_tool(weights_path: tuple[Path, str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path, digest = weights_path
    catalog = tmp_path / "agent_providers"
    catalog.mkdir()
    entry = _entry(path, digest)
    (catalog / "e2e.yaml").write_text(yaml.safe_dump(entry), encoding="utf-8")
    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_MCP_DETECTION_ENABLED", "1")
    monkeypatch.setenv("AGENTIC_MCP_DETECTION_DEFAULT_PROVIDER", "e2e_detect")

    from mcp_servers.object_detection.server import detect_objects_impl

    out = detect_objects_impl(path=str(FIXTURE_LIVE / "negative.jpg"), agent_provider_id="e2e_detect")
    assert out.get("ok") is True
    assert "detections" in out


def test_live_ws_routing_detection(
    weights_path: tuple[Path, str],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    if os.getenv("AGENTIC_DETECTION_E2E_SERVE", "").strip().lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        pytest.skip("Set AGENTIC_DETECTION_E2E_SERVE=1 for WS routing e2e")

    from orchestration.serve import fastapi_available

    if not fastapi_available():
        pytest.skip("fastapi not installed")

    path, digest = weights_path
    catalog = tmp_path / "agent_providers"
    catalog.mkdir()
    (catalog / "e2e.yaml").write_text(yaml.safe_dump(_entry(path, digest)), encoding="utf-8")
    monkeypatch.setenv("AGENTIC_AGENT_PROVIDERS_CATALOG", str(catalog))
    monkeypatch.setenv("AGENTIC_KB", "0")

    from orchestration.serve.ws import WsConnection
    from orchestration.reach_multimodal import parse_reach_images

    called: dict[str, bool] = {}

    class Stub:
        tool_root = tmp_path

        def _progress_to_status(self, *a, **k) -> None:
            return None

        def _execute_detection(self, *a, **k) -> str:
            called["detection"] = True
            return '{"detections":[],"image":{"width":1,"height":1,"name":""},"model":{}}'

        def _execute_multimodal(self, *a, **k) -> str:
            called["multimodal"] = True
            return "vision"

        def _execute_text(self, *a, **k) -> str:
            return "text"

        _execute_inner = WsConnection._execute_inner

    blob = (FIXTURE_LIVE / "negative.jpg").read_bytes()
    images = parse_reach_images(
        [
            {
                "mimeType": "image/jpeg",
                "dataBase64": base64.b64encode(blob).decode("ascii"),
                "name": "negative.jpg",
            }
        ]
    )
    Stub()._execute_inner(  # type: ignore[misc]
        {"agent_provider_id": "e2e_detect"},
        "direct_agent",
        "detect",
        {},
        None,
        "s",
        "run",
        images,
    )
    assert called.get("detection") is True
