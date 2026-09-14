"""Object-detection MCP server — detect_objects tool wrapping object_detection_runtime.

Transport: stdio (default) via FastMCP.
Opt-in: AGENTIC_MCP_DETECTION_ENABLED=1
"""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path
from typing import Any


def _enabled() -> bool:
    return os.getenv("AGENTIC_MCP_DETECTION_ENABLED", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _default_detector_id() -> str:
    return (
        os.getenv("AGENTIC_MCP_DETECTION_DEFAULT_PROVIDER", "").strip()
        or os.getenv("AGENTIC_DETECTION_DEFAULT_PROVIDER", "").strip()
    )


def _load_entry(agent_provider_id: str) -> dict[str, Any]:
    from orchestration.direct_agent import load_agent_entry
    from orchestration.dynamic_run import catalog_paths

    tool_root = Path(__file__).resolve().parents[2]
    paths = catalog_paths(tool_root)
    return load_agent_entry(
        agent_provider_id=agent_provider_id,
        catalog_path=paths.agent_providers,
    )


def detect_objects_impl(
    *,
    path: str = "",
    data_base64: str = "",
    mime_type: str = "image/jpeg",
    agent_provider_id: str = "",
    name: str = "",
) -> dict[str, Any]:
    """Run detection; returns typed result dict (or error envelope)."""
    if not _enabled():
        return {
            "ok": False,
            "error": "detection MCP disabled; set AGENTIC_MCP_DETECTION_ENABLED=1",
            "code": "detection_unavailable",
        }
    pid = str(agent_provider_id or "").strip() or _default_detector_id()
    if not pid:
        return {
            "ok": False,
            "error": "agent_provider_id required (or set AGENTIC_MCP_DETECTION_DEFAULT_PROVIDER)",
            "code": "detection_unavailable",
        }
    try:
        entry = _load_entry(pid)
    except LookupError as exc:
        return {"ok": False, "error": str(exc), "code": "detection_unavailable"}

    from orchestration.object_detection_runtime import (
        DetectionUnavailableError,
        WeightsVerifyError,
        is_object_detection_entry,
        run_object_detection,
    )
    from orchestration.reach_multimodal import ReachImage

    if not is_object_detection_entry(entry):
        return {
            "ok": False,
            "error": f"provider {pid!r} is not type object_detection",
            "code": "detection_unavailable",
        }

    raw: bytes
    img_name = str(name or "").strip()
    if path:
        p = Path(path)
        if not p.is_file():
            return {"ok": False, "error": f"image not found: {path}", "code": "invalid_images"}
        raw = p.read_bytes()
        if not img_name:
            img_name = p.name
        suffix = p.suffix.lower()
        mime = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }.get(suffix, mime_type or "image/jpeg")
    elif data_base64:
        try:
            raw = base64.b64decode(data_base64, validate=True)
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": f"invalid base64: {exc}", "code": "invalid_images"}
        mime = mime_type or "image/jpeg"
    else:
        return {
            "ok": False,
            "error": "provide path or data_base64",
            "code": "invalid_images",
        }

    image = ReachImage(mime_type=mime, data=raw, name=img_name)
    try:
        text = run_object_detection(entry, images=[image])
        payload = json.loads(text)
        payload["ok"] = True
        return payload
    except WeightsVerifyError as exc:
        return {"ok": False, "error": str(exc), "code": getattr(exc, "code", "weights_verify_failed")}
    except DetectionUnavailableError as exc:
        return {"ok": False, "error": str(exc), "code": getattr(exc, "code", "detection_unavailable")}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc), "code": "detection_unavailable"}


def create_mcp_server():
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        sys.stderr.write(
            "object-detection MCP: install the official Python SDK: pip install 'mcp>=1.2.0'\n"
        )
        raise

    mcp = FastMCP(
        "object-detection",
        instructions=(
            "Detect objects in an image and return typed pixel boxes with labels and "
            "confidences. Prefer detect_objects with a local absolute path or base64. "
            "Empty detections is a valid success (class not present)."
        ),
    )

    @mcp.tool()
    def detect_objects(
        path: str = "",
        data_base64: str = "",
        mime_type: str = "image/jpeg",
        agent_provider_id: str = "",
        name: str = "",
    ) -> dict[str, Any]:
        """Detect objects; returns JSON with detections[], image{}, model{}.

        Args:
            path: Absolute path to a local image file.
            data_base64: Alternative to path — raw image bytes as base64.
            mime_type: MIME for data_base64 (image/jpeg, image/png, …).
            agent_provider_id: Catalog object_detection provider id.
            name: Optional image name for the result payload.
        """
        return detect_objects_impl(
            path=path,
            data_base64=data_base64,
            mime_type=mime_type,
            agent_provider_id=agent_provider_id,
            name=name,
        )

    return mcp


def main() -> None:
    create_mcp_server().run(transport="stdio")


if __name__ == "__main__":
    main()
