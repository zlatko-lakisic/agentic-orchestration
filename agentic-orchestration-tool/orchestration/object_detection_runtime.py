"""Object detection runtime — ONNX Runtime inference with residency and typed results."""

from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Sequence

from orchestration.detection_artifacts import (
    DetectionUnavailableError,
    WeightsVerifyError,
    ensure_detection_weights,
    weights_spec_from_entry,
)

# Re-export for callers
__all__ = [
    "DetectionUnavailableError",
    "WeightsVerifyError",
    "is_object_detection_entry",
    "run_object_detection",
    "ensure_object_detection_ready",
    "unload_detection_session",
    "reset_detection_sessions_for_tests",
    "resolve_execution_providers",
]


@dataclass
class _ResidentSession:
    path_key: str
    session: Any
    execution_provider: str
    input_name: str
    input_width: int
    input_height: int
    class_names: list[str]
    confidence_min: float
    iou_threshold: float
    classes_allowlist: set[str] | None
    residency: str
    lock: threading.Lock = field(default_factory=threading.Lock)


_SESSIONS: dict[str, _ResidentSession] = {}
_SESSIONS_LOCK = threading.Lock()


def is_object_detection_entry(entry: dict[str, Any] | None) -> bool:
    if not isinstance(entry, dict):
        return False
    typ = str(entry.get("type") or entry.get("provider_type") or "").strip().lower()
    return typ == "object_detection"


def reset_detection_sessions_for_tests() -> None:
    with _SESSIONS_LOCK:
        _SESSIONS.clear()


def unload_detection_session(entry: dict[str, Any] | None = None) -> None:
    """Drop resident sessions (all, or keyed by entry weights sha256)."""
    with _SESSIONS_LOCK:
        if entry is None:
            _SESSIONS.clear()
            return
        try:
            digest = weights_spec_from_entry(entry)["sha256"]
        except Exception:  # noqa: BLE001
            return
        _SESSIONS.pop(digest, None)


def _entry_field(entry: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in entry and entry[key] is not None:
            return entry[key]
    opts = entry.get("provider_options")
    if isinstance(opts, dict):
        for key in keys:
            if key in opts and opts[key] is not None:
                return opts[key]
    return default


def _input_size(entry: dict[str, Any]) -> tuple[int, int]:
    raw = _entry_field(entry, "input", default={}) or {}
    if not isinstance(raw, dict):
        raw = {}
    w = int(raw.get("width") or 640)
    h = int(raw.get("height") or 640)
    return max(32, w), max(32, h)


def _class_names(entry: dict[str, Any]) -> list[str]:
    raw = _entry_field(entry, "class_names", default=None)
    if isinstance(raw, list) and raw:
        return [str(x) for x in raw]
    # COCO 80 as last-resort default for permissive YOLOX demos
    return list(_COCO_CLASSES)


def _allowlist(entry: dict[str, Any]) -> set[str] | None:
    raw = _entry_field(entry, "classes", default=None)
    if not isinstance(raw, list) or not raw:
        return None
    return {str(x) for x in raw}


def _residency(entry: dict[str, Any]) -> str:
    raw = str(_entry_field(entry, "residency", default="resident") or "resident").strip().lower()
    return "on_demand" if raw == "on_demand" else "resident"


def _confidence_min(entry: dict[str, Any]) -> float:
    try:
        return float(_entry_field(entry, "confidence_min", default=0.25) or 0.25)
    except (TypeError, ValueError):
        return 0.25


def _iou_threshold(entry: dict[str, Any]) -> float:
    try:
        return float(_entry_field(entry, "iou_threshold", default=0.45) or 0.45)
    except (TypeError, ValueError):
        return 0.45


def resolve_execution_providers(entry: dict[str, Any] | None = None) -> list[str]:
    """Return ORT provider names in preference order (TensorRT → CUDA → CPU)."""
    env = os.getenv("AGENTIC_DETECTION_ORT_PROVIDERS", "").strip()
    if env:
        tokens = [t.strip().lower() for t in env.split(",") if t.strip()]
    else:
        raw = None
        if isinstance(entry, dict):
            raw = _entry_field(entry, "execution_providers", default=None)
        if isinstance(raw, list) and raw:
            tokens = [str(t).strip().lower() for t in raw if str(t).strip()]
        else:
            tokens = ["tensorrt", "cuda", "cpu"]

    mapping = {
        "tensorrt": "TensorrtExecutionProvider",
        "trt": "TensorrtExecutionProvider",
        "cuda": "CUDAExecutionProvider",
        "cpu": "CPUExecutionProvider",
        "tensorrtexecutionprovider": "TensorrtExecutionProvider",
        "cudaexecutionprovider": "CUDAExecutionProvider",
        "cpuexecutionprovider": "CPUExecutionProvider",
    }
    out: list[str] = []
    for tok in tokens:
        name = mapping.get(tok, tok if tok.endswith("ExecutionProvider") else "")
        if name and name not in out:
            out.append(name)
    if "CPUExecutionProvider" not in out:
        out.append("CPUExecutionProvider")
    return out


def _available_providers() -> list[str]:
    try:
        import onnxruntime as ort  # type: ignore[import-untyped]
    except ImportError as exc:
        raise DetectionUnavailableError(
            "onnxruntime is not installed; pip install -r requirements-detection.txt "
            "(GPU: requirements-detection-gpu.txt)"
        ) from exc
    # Preload NVIDIA pip wheels (cuda/cudnn) so CUDA EP can find libcudnn.so.
    preload = getattr(ort, "preload_dlls", None)
    if callable(preload):
        try:
            preload()
        except Exception:  # noqa: BLE001
            pass
    return list(ort.get_available_providers())


def _create_session(model_path: Any, entry: dict[str, Any]) -> tuple[Any, str]:
    import onnxruntime as ort  # type: ignore[import-untyped]
    import numpy as np

    preferred = resolve_execution_providers(entry)
    available = set(_available_providers())
    iw, ih = _input_size(entry)
    last_err: Exception | None = None
    for provider in preferred:
        if provider not in available and provider != "CPUExecutionProvider":
            continue
        try:
            sess = ort.InferenceSession(
                str(model_path),
                providers=[provider],
            )
            inputs = sess.get_inputs()
            input_name = inputs[0].name if inputs else "images"
            # Probe inference — CUDA may list as available without cuDNN.
            dummy = np.zeros((1, 3, ih, iw), dtype=np.float32)
            sess.run(None, {input_name: dummy})
            used = sess.get_providers()[0] if sess.get_providers() else provider
            return sess, str(used)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    # Final fallback: let ORT pick
    try:
        sess = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        inputs = sess.get_inputs()
        input_name = inputs[0].name if inputs else "images"
        dummy = np.zeros((1, 3, ih, iw), dtype=np.float32)
        sess.run(None, {input_name: dummy})
        used = sess.get_providers()[0] if sess.get_providers() else "CPUExecutionProvider"
        return sess, str(used)
    except Exception as exc:
        raise DetectionUnavailableError(
            f"failed to load ONNX session: {exc}"
        ) from (last_err or exc)


def letterbox(
    image: Any,
    *,
    new_shape: tuple[int, int],
) -> tuple[Any, float, tuple[float, float]]:
    """YOLOX-style letterbox: top-left paste, gray 114 pad.

    Returns ``(padded_rgb_uint8, ratio, (pad_w, pad_h))`` where pads are (0, 0)
    for the YOLOX top-left layout (kept for API compatibility).
    """
    import numpy as np
    from PIL import Image

    if hasattr(image, "mode"):
        img = image.convert("RGB")
    else:
        img = Image.fromarray(np.asarray(image)).convert("RGB")
    ow, oh = img.size
    th, tw = int(new_shape[0]), int(new_shape[1])
    ratio = min(tw / ow, th / oh)
    nw, nh = int(img.size[0] * ratio), int(img.size[1] * ratio)
    resized = img.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new("RGB", (tw, th), (114, 114, 114))
    canvas.paste(resized, (0, 0))
    return canvas, float(ratio), (0.0, 0.0)


def preprocess_image(
    image_bytes: bytes,
    *,
    input_width: int,
    input_height: int,
) -> tuple[Any, int, int, float, tuple[float, float]]:
    """Decode bytes → NCHW float32 in 0–255 (YOLOX ONNX convention, not 0–1)."""
    import numpy as np
    from io import BytesIO
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    orig_w, orig_h = img.size
    padded, ratio, pads = letterbox(img, new_shape=(input_height, input_width))
    arr = np.asarray(padded, dtype=np.float32)  # YOLOX: do not /255
    chw = np.transpose(arr, (2, 0, 1))[None, ...]
    return chw, orig_w, orig_h, ratio, pads


def _nms_xyxy(boxes: Any, scores: Any, iou_thr: float) -> list[int]:
    import numpy as np

    if boxes.size == 0:
        return []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        rest = order[1:]
        xx1 = np.maximum(x1[i], x1[rest])
        yy1 = np.maximum(y1[i], y1[rest])
        xx2 = np.minimum(x2[i], x2[rest])
        yy2 = np.minimum(y2[i], y2[rest])
        inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
        iou = inter / (areas[i] + areas[rest] - inter + 1e-9)
        order = rest[iou <= iou_thr]
    return keep


def yolox_demo_postprocess(outputs: Any, *, input_height: int, input_width: int) -> Any:
    """Decode raw YOLOX ONNX strides (Apache-2.0 YOLOX ``demo_postprocess``)."""
    import numpy as np

    arr = np.asarray(outputs, dtype=np.float32)
    if arr.ndim == 2:
        arr = arr[None, ...]
    grids = []
    expanded_strides = []
    strides = [8, 16, 32]
    for stride in strides:
        hsize = input_height // stride
        wsize = input_width // stride
        xv, yv = np.meshgrid(np.arange(wsize), np.arange(hsize))
        grid = np.stack((xv, yv), 2).reshape(1, -1, 2)
        grids.append(grid)
        expanded_strides.append(np.full((1, grid.shape[1], 1), stride))
    grids_a = np.concatenate(grids, 1).astype(np.float32)
    strides_a = np.concatenate(expanded_strides, 1).astype(np.float32)
    out = arr.copy()
    out[..., :2] = (out[..., :2] + grids_a) * strides_a
    out[..., 2:4] = np.exp(out[..., 2:4]) * strides_a
    return out


def postprocess_yolox_like(
    output: Any,
    *,
    input_width: int,
    input_height: int,
    orig_w: int,
    orig_h: int,
    ratio: float,
    pads: tuple[float, float],
    class_names: Sequence[str],
    confidence_min: float,
    iou_threshold: float,
    classes_allowlist: set[str] | None,
) -> list[dict[str, Any]]:
    """Decode YOLOX ONNX outputs to boxes in submitted-image pixel space."""
    import numpy as np

    arr = np.asarray(output, dtype=np.float32)
    if arr.ndim == 3:
        arr = arr[0]
    if arr.ndim != 2 or arr.shape[1] < 6:
        return []
    expected_anchors = sum(
        (input_height // s) * (input_width // s) for s in (8, 16, 32)
    )
    # Official YOLOX ONNX heads emit raw grid logits; synthetic / already-decoded
    # tensors (tests, alternate exporters) keep length != sum of stride grids.
    if arr.shape[0] == expected_anchors:
        decoded = yolox_demo_postprocess(
            arr, input_height=input_height, input_width=input_width
        )
        arr = np.asarray(decoded, dtype=np.float32)
        if arr.ndim == 3:
            arr = arr[0]

    boxes_cxcywh = arr[:, :4]
    obj = arr[:, 4]
    cls_scores = arr[:, 5:]
    cls_ids = cls_scores.argmax(axis=1)
    cls_conf = cls_scores.max(axis=1)
    scores = (obj * cls_conf).astype(np.float32)

    cx, cy, w, h = boxes_cxcywh[:, 0], boxes_cxcywh[:, 1], boxes_cxcywh[:, 2], boxes_cxcywh[:, 3]
    x1 = cx - w / 2.0
    y1 = cy - h / 2.0
    x2 = cx + w / 2.0
    y2 = cy + h / 2.0
    boxes = np.stack([x1, y1, x2, y2], axis=1)

    mask = scores >= float(confidence_min)
    boxes, scores, cls_ids = boxes[mask], scores[mask], cls_ids[mask]
    if boxes.size == 0:
        return []

    keep = _nms_xyxy(boxes, scores, float(iou_threshold))
    boxes, scores, cls_ids = boxes[keep], scores[keep], cls_ids[keep]

    pad_w, pad_h = pads
    detections: list[dict[str, Any]] = []
    for box, score, cid in zip(boxes, scores, cls_ids, strict=False):
        # YOLOX top-left letterbox: divide by ratio only (pads are 0).
        x1 = (float(box[0]) - pad_w) / ratio
        y1 = (float(box[1]) - pad_h) / ratio
        x2 = (float(box[2]) - pad_w) / ratio
        y2 = (float(box[3]) - pad_h) / ratio
        x1 = max(0.0, min(float(orig_w), x1))
        y1 = max(0.0, min(float(orig_h), y1))
        x2 = max(0.0, min(float(orig_w), x2))
        y2 = max(0.0, min(float(orig_h), y2))
        idx = int(cid)
        label = class_names[idx] if 0 <= idx < len(class_names) else str(idx)
        if classes_allowlist is not None and label not in classes_allowlist:
            continue
        detections.append(
            {
                "label": label,
                "confidence": float(score),
                "box_xyxy": [int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))],
                "box_normalized": None,
            }
        )
    return detections


def _get_or_create_resident(
    entry: dict[str, Any],
    *,
    on_progress: Callable[[str], None] | None = None,
    on_lifecycle: Callable[[str, dict[str, Any]], None] | None = None,
) -> _ResidentSession:
    spec = weights_spec_from_entry(entry)
    digest = spec["sha256"]
    with _SESSIONS_LOCK:
        existing = _SESSIONS.get(digest)
        if existing is not None:
            return existing

    if on_lifecycle:
        on_lifecycle("pulling", {"sha256": digest, "reason": "weights_ensure"})
    path = ensure_detection_weights(entry, on_progress=on_progress)
    if on_lifecycle:
        on_lifecycle("loading", {"sha256": digest, "reason": "ort_load"})
    iw, ih = _input_size(entry)
    session, ep = _create_session(path, entry)
    inputs = session.get_inputs()
    input_name = inputs[0].name if inputs else "images"
    # Warmup already done inside _create_session probe.
    if on_lifecycle:
        on_lifecycle("ready", {"sha256": digest, "execution_provider": ep})

    resident = _ResidentSession(
        path_key=digest,
        session=session,
        execution_provider=ep,
        input_name=input_name,
        input_width=iw,
        input_height=ih,
        class_names=_class_names(entry),
        confidence_min=_confidence_min(entry),
        iou_threshold=_iou_threshold(entry),
        classes_allowlist=_allowlist(entry),
        residency=_residency(entry),
    )
    if resident.residency == "resident":
        with _SESSIONS_LOCK:
            _SESSIONS[digest] = resident
    return resident


def ensure_object_detection_ready(
    entry: dict[str, Any],
    *,
    on_progress: Callable[[str], None] | None = None,
    on_lifecycle: Callable[[str, dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """Fetch, verify, load, and warmup. Ready means resident + warmup done."""
    if not is_object_detection_entry(entry):
        raise DetectionUnavailableError("entry is not type object_detection")
    sess = _get_or_create_resident(entry, on_progress=on_progress, on_lifecycle=on_lifecycle)
    return {
        "sha256": sess.path_key,
        "execution_provider": sess.execution_provider,
        "weights_resident": sess.path_key in _SESSIONS,
        "input_width": sess.input_width,
        "input_height": sess.input_height,
    }


def run_object_detection(
    entry: dict[str, Any],
    *,
    images: Sequence[Any],
    on_progress: Callable[[str], None] | None = None,
) -> str:
    """Run detection on ReachImage-like objects; return JSON string."""
    if not is_object_detection_entry(entry):
        raise DetectionUnavailableError("entry is not type object_detection")
    if not images:
        raise DetectionUnavailableError("object_detection requires at least one image")

    # Use first image for v1 (per-frame sensing); still report image count in model meta.
    first = images[0]
    if hasattr(first, "data"):
        raw = bytes(first.data)
        name = str(getattr(first, "name", "") or "")
    elif isinstance(first, dict):
        raw = bytes(first.get("data") or b"")
        name = str(first.get("name") or "")
    else:
        raise DetectionUnavailableError("unsupported image payload")

    already_resident = False
    try:
        digest = weights_spec_from_entry(entry)["sha256"]
        with _SESSIONS_LOCK:
            already_resident = digest in _SESSIONS
    except Exception:  # noqa: BLE001
        already_resident = False

    sess = _get_or_create_resident(entry, on_progress=on_progress)
    tensor, orig_w, orig_h, ratio, pads = preprocess_image(
        raw, input_width=sess.input_width, input_height=sess.input_height
    )

    t0 = time.perf_counter()
    with sess.lock:
        outputs = sess.session.run(None, {sess.input_name: tensor})
    inference_ms = (time.perf_counter() - t0) * 1000.0

    detections = postprocess_yolox_like(
        outputs[0],
        input_width=sess.input_width,
        input_height=sess.input_height,
        orig_w=orig_w,
        orig_h=orig_h,
        ratio=ratio,
        pads=pads,
        class_names=sess.class_names,
        confidence_min=sess.confidence_min,
        iou_threshold=sess.iou_threshold,
        classes_allowlist=sess.classes_allowlist,
    )

    if sess.residency == "on_demand":
        unload_detection_session(entry)

    result = {
        "detections": detections,
        "image": {"width": orig_w, "height": orig_h, "name": name},
        "model": {
            "provider_id": str(entry.get("id") or ""),
            "input_width": sess.input_width,
            "input_height": sess.input_height,
            "weights_resident": already_resident or sess.residency == "resident",
            "inference_ms": round(inference_ms, 3),
            "execution_provider": sess.execution_provider,
            "image_count": len(images),
            "detection_count": len(detections),
        },
    }
    return json.dumps(result, sort_keys=True)


_COCO_CLASSES = [
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
]
