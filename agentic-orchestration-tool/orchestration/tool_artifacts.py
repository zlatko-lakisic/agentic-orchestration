"""Artifact upload/register/list/activate registry for custom tool packages."""

from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import threading
import time
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from orchestration.custom_tool_contract import (
    CustomToolContractError,
    CustomToolManifest,
    app_id_from_tool_id,
    validate_zip_members,
)
from orchestration.tool_sandbox_runtime import (
    ToolSandboxError,
    get_runtime,
    remove_runtime,
    start_tool_sandbox,
    stop_all_runtimes_for_tests,
)

_lock = threading.RLock()
_artifacts: dict[str, "ToolArtifactRecord"] = {}
_activated: dict[str, str] = {}  # activation key -> artifact storage key

DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024


class ToolArtifactError(ValueError):
    """Artifact registry failure."""


class ToolArtifactDenied(ToolArtifactError):
    """Admission denied (permissions, size, disabled feature)."""


def custom_tool_sandbox_enabled() -> bool:
    return os.getenv("AGENTIC_CUSTOM_TOOL_SANDBOX", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def custom_tool_hello_flag() -> bool:
    """Advertise capability on WS hello when enabled."""
    return custom_tool_sandbox_enabled()


def max_upload_bytes() -> int:
    raw = os.getenv("AGENTIC_CUSTOM_TOOL_MAX_UPLOAD_BYTES", "").strip()
    try:
        value = int(raw) if raw else DEFAULT_MAX_UPLOAD_BYTES
    except ValueError:
        value = DEFAULT_MAX_UPLOAD_BYTES
    return max(64 * 1024, min(32 * 1024 * 1024, value))


def _storage_key(*, user_id: str, app_id: str, tool_id: str, tool_version: str) -> str:
    return f"{user_id}::{app_id}::{tool_id}@{tool_version}"


def _activation_key(*, user_id: str, app_id: str, client_id: str) -> str:
    return f"{user_id}::{app_id}::{client_id}"


def artifact_store_root(tool_root: Path) -> Path:
    return tool_root / "_tool_artifacts"


def _artifact_dir(tool_root: Path, *, user_id: str, app_id: str, record_key: str) -> Path:
    safe_user = user_id.replace("/", "_").replace("\\", "_") or "anonymous"
    safe_app = app_id.replace("/", "_").replace("\\", "_") or "default"
    return artifact_store_root(tool_root) / safe_user / safe_app / record_key.replace("::", "__")


@dataclass
class ToolArtifactRecord:
    user_id: str
    app_id: str
    manifest: CustomToolManifest
    bundle_dir: Path
    wheel_path: Path
    zip_sha256: str
    wheel_sha256: str
    registered_at: float
    activated: bool = False
    runtime_base_url: str | None = None
    storage_key: str = field(default="", repr=False)

    def to_json(self) -> dict[str, Any]:
        return {
            "id": self.storage_key,
            "toolId": self.manifest.tool_id,
            "toolVersion": self.manifest.tool_version,
            "clientId": self.manifest.client_id,
            "appId": self.app_id,
            "userId": self.user_id,
            "wheel": self.manifest.wheel,
            "zipSha256": self.zip_sha256,
            "wheelSha256": self.wheel_sha256,
            "registeredAt": self.registered_at,
            "activated": self.activated,
            "runtimeBaseUrl": self.runtime_base_url,
            "fallbackPolicy": self.manifest.fallback_policy,
        }


def _check_permissions(manifest: CustomToolManifest) -> None:
    perms = manifest.permissions
    if perms.network and not _truthy("AGENTIC_CUSTOM_TOOL_ALLOW_NETWORK"):
        raise ToolArtifactDenied(
            "manifest declares network permission but AGENTIC_CUSTOM_TOOL_ALLOW_NETWORK is off"
        )
    max_fs = int(os.getenv("AGENTIC_CUSTOM_TOOL_MAX_FS_ROOTS", "4") or "4")
    if len(perms.filesystem) > max_fs:
        raise ToolArtifactDenied(f"manifest declares too many filesystem roots (max {max_fs})")


def _truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def _parse_manifest_from_zip(zf: zipfile.ZipFile) -> CustomToolManifest:
    if "manifest.json" in zf.namelist():
        raw = json.loads(zf.read("manifest.json").decode("utf-8"))
    elif "manifest.yaml" in zf.namelist():
        import yaml

        raw = yaml.safe_load(zf.read("manifest.yaml").decode("utf-8"))
    else:
        raise CustomToolContractError("upload zip must include manifest.json")
    if not isinstance(raw, dict):
        raise CustomToolContractError("manifest must be a JSON object")
    manifest = CustomToolManifest.from_json(raw)
    validate_zip_members(manifest, set(zf.namelist()))
    return manifest


def ingest_upload(
    *,
    tool_root: Path,
    user_id: str,
    app_id: str,
    zip_bytes: bytes,
) -> ToolArtifactRecord:
    """Validate and persist an uploaded wheel+manifest zip."""
    if not custom_tool_sandbox_enabled():
        raise ToolArtifactDenied(
            "custom tool sandbox is disabled (set AGENTIC_CUSTOM_TOOL_SANDBOX=1)"
        )
    uid = str(user_id or "").strip()
    aid = str(app_id or "").strip()
    if not uid or not aid:
        raise ToolArtifactError("user_id and app_id are required")

    if len(zip_bytes) > max_upload_bytes():
        raise ToolArtifactDenied(
            f"upload exceeds max size ({len(zip_bytes)} > {max_upload_bytes()} bytes)"
        )

    zip_sha256 = hashlib.sha256(zip_bytes).hexdigest()
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        manifest = _parse_manifest_from_zip(zf)
        _check_permissions(manifest)
        expected_app = app_id_from_tool_id(manifest.tool_id)
        if expected_app != aid:
            raise ToolArtifactDenied(
                f"app_id {aid!r} does not match manifest toolId app segment {expected_app!r}"
            )
        wheel_bytes = zf.read(manifest.wheel)
    wheel_sha256 = hashlib.sha256(wheel_bytes).hexdigest()

    key = _storage_key(
        user_id=uid,
        app_id=aid,
        tool_id=manifest.tool_id,
        tool_version=manifest.tool_version,
    )
    bundle_dir = _artifact_dir(tool_root, user_id=uid, app_id=aid, record_key=key)
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir, ignore_errors=True)
    bundle_dir.mkdir(parents=True, exist_ok=True)
    (bundle_dir / "manifest.json").write_text(
        json.dumps(manifest.to_json(), indent=2) + "\n",
        encoding="utf-8",
    )
    wheel_path = bundle_dir / manifest.wheel
    wheel_path.write_bytes(wheel_bytes)
    (bundle_dir / "bundle.zip").write_bytes(zip_bytes)

    record = ToolArtifactRecord(
        user_id=uid,
        app_id=aid,
        manifest=manifest,
        bundle_dir=bundle_dir,
        wheel_path=wheel_path,
        zip_sha256=zip_sha256,
        wheel_sha256=wheel_sha256,
        registered_at=time.time(),
        storage_key=key,
    )
    with _lock:
        _artifacts[key] = record
    return record


def register_artifact(
    *,
    tool_root: Path,
    user_id: str,
    app_id: str,
    tool_id: str,
    tool_version: str,
) -> ToolArtifactRecord:
    """Mark an uploaded artifact as registered (idempotent)."""
    key = _storage_key(
        user_id=user_id,
        app_id=app_id,
        tool_id=tool_id,
        tool_version=tool_version,
    )
    with _lock:
        record = _artifacts.get(key)
    if record is None:
        bundle_dir = _artifact_dir(tool_root, user_id=user_id, app_id=app_id, record_key=key)
        manifest_path = bundle_dir / "manifest.json"
        if not manifest_path.is_file():
            raise ToolArtifactError(f"artifact not found: {tool_id}@{tool_version}")
        manifest = CustomToolManifest.from_json(json.loads(manifest_path.read_text(encoding="utf-8")))
        wheel_path = bundle_dir / manifest.wheel
        if not wheel_path.is_file():
            raise ToolArtifactError(f"wheel missing for {tool_id}@{tool_version}")
        zip_path = bundle_dir / "bundle.zip"
        zip_sha256 = (
            hashlib.sha256(zip_path.read_bytes()).hexdigest()
            if zip_path.is_file()
            else hashlib.sha256(b"").hexdigest()
        )
        record = ToolArtifactRecord(
            user_id=user_id,
            app_id=app_id,
            manifest=manifest,
            bundle_dir=bundle_dir,
            wheel_path=wheel_path,
            zip_sha256=zip_sha256,
            wheel_sha256=hashlib.sha256(wheel_path.read_bytes()).hexdigest(),
            registered_at=time.time(),
            storage_key=key,
        )
        with _lock:
            _artifacts[key] = record
    return record


def list_artifacts(
    *,
    user_id: str | None = None,
    app_id: str | None = None,
) -> list[ToolArtifactRecord]:
    with _lock:
        items = list(_artifacts.values())
    if user_id is not None:
        items = [r for r in items if r.user_id == user_id]
    if app_id is not None:
        items = [r for r in items if r.app_id == app_id]
    return sorted(items, key=lambda r: (r.manifest.tool_id, r.manifest.tool_version))


def activate_artifact(
    *,
    tool_root: Path,
    user_id: str,
    app_id: str,
    tool_id: str,
    tool_version: str,
    env: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Install wheel, start sandbox HTTP MCP, return overlay MCP entry."""
    if not custom_tool_sandbox_enabled():
        raise ToolArtifactDenied(
            "custom tool sandbox is disabled (set AGENTIC_CUSTOM_TOOL_SANDBOX=1)"
        )
    record = register_artifact(
        tool_root=tool_root,
        user_id=user_id,
        app_id=app_id,
        tool_id=tool_id,
        tool_version=tool_version,
    )
    for req in record.manifest.required_env:
        if req not in (env or {}) and req not in os.environ:
            raise ToolArtifactDenied(f"missing required env var {req!r}")

    existing = get_runtime(
        user_id=user_id,
        app_id=app_id,
        client_id=record.manifest.client_id,
    )
    if existing is not None and existing.process is not None and existing.process.poll() is None:
        entry = existing.mcp_entry()
        record.activated = True
        record.runtime_base_url = existing.base_url
        return {
            "ok": True,
            "activated": True,
            "reused": True,
            "mcp": entry,
            "runtime": existing.status(),
        }

    try:
        runtime = start_tool_sandbox(
            tool_root=tool_root,
            manifest=record.manifest,
            wheel_path=record.wheel_path,
            user_id=user_id,
            app_id=app_id,
            env=env,
        )
    except ToolSandboxError as exc:
        raise ToolArtifactError(str(exc)) from exc

    entry = runtime.mcp_entry()
    act_key = _activation_key(
        user_id=user_id,
        app_id=app_id,
        client_id=record.manifest.client_id,
    )
    with _lock:
        record.activated = True
        record.runtime_base_url = runtime.base_url
        _activated[act_key] = record.storage_key
    return {
        "ok": True,
        "activated": True,
        "reused": False,
        "mcp": entry,
        "runtime": runtime.status(),
    }


def deactivate_artifact(
    *,
    user_id: str,
    app_id: str,
    client_id: str,
) -> dict[str, Any]:
    runtime = remove_runtime(user_id=user_id, app_id=app_id, client_id=client_id)
    if runtime is not None:
        runtime.stop()
    act_key = _activation_key(user_id=user_id, app_id=app_id, client_id=client_id)
    with _lock:
        storage_key = _activated.pop(act_key, None)
        if storage_key and storage_key in _artifacts:
            rec = _artifacts[storage_key]
            rec.activated = False
            rec.runtime_base_url = None
    return {"ok": True, "deactivated": client_id, "wasRunning": runtime is not None}


def resolve_sandbox_mcp_entry(
    *,
    user_id: str,
    app_id: str,
    client_id: str,
) -> dict[str, Any] | None:
    """Return a running sandbox MCP catalog entry when activated."""
    runtime = get_runtime(user_id=user_id, app_id=app_id, client_id=client_id)
    if runtime is None or runtime.process is None or runtime.process.poll() is not None:
        return None
    try:
        return runtime.mcp_entry()
    except ToolSandboxError:
        return None


def active_sandbox_mcp_entries(
    tool_root: Path,
    *,
    user_id: str,
    app_id: str | None = None,
) -> list[dict[str, Any]]:
    """Return streamable_http MCP entries for activated sandbox tools."""
    if not custom_tool_sandbox_enabled():
        return []
    from orchestration.tool_sandbox_runtime import list_runtimes

    entries: list[dict[str, Any]] = []
    for runtime in list_runtimes(user_id=user_id, app_id=app_id):
        if runtime.process is None or runtime.process.poll() is not None:
            continue
        try:
            entries.append(runtime.mcp_entry())
        except ToolSandboxError:
            continue
    return entries


def _parse_storage_key(artifact_id: str) -> tuple[str, str, str, str]:
    """Parse ``user::app::toolId@version`` storage key."""
    key = str(artifact_id or "").strip()
    if "@" not in key or "::" not in key:
        raise ToolArtifactError(f"invalid artifact id: {artifact_id!r}")
    head, tool_version = key.rsplit("@", 1)
    parts = head.split("::", 2)
    if len(parts) != 3:
        raise ToolArtifactError(f"invalid artifact id: {artifact_id!r}")
    return parts[0], parts[1], parts[2], tool_version


def delete_artifact(
    *,
    tool_root: Path,
    user_id: str,
    artifact_id: str,
) -> bool:
    """Deactivate runtime and remove persisted bundle + registry entry."""
    if not custom_tool_sandbox_enabled():
        raise ToolArtifactDenied(
            "custom tool sandbox is disabled (set AGENTIC_CUSTOM_TOOL_SANDBOX=1)"
        )
    uid, app_id, tool_id, tool_version = _parse_storage_key(artifact_id)
    if uid != str(user_id or "").strip():
        raise ToolArtifactError("artifact belongs to another user")

    manifest = None
    with _lock:
        record = _artifacts.get(artifact_id)
        if record is not None:
            manifest = record.manifest
    if manifest is None:
        try:
            record = register_artifact(
                tool_root=tool_root,
                user_id=uid,
                app_id=app_id,
                tool_id=tool_id,
                tool_version=tool_version,
            )
            manifest = record.manifest
        except ToolArtifactError:
            return False

    deactivate_artifact(user_id=uid, app_id=app_id, client_id=manifest.client_id)

    bundle_dir = _artifact_dir(tool_root, user_id=uid, app_id=app_id, record_key=artifact_id)
    if bundle_dir.is_dir():
        shutil.rmtree(bundle_dir, ignore_errors=True)

    with _lock:
        _artifacts.pop(artifact_id, None)
        act_key = _activation_key(user_id=uid, app_id=app_id, client_id=manifest.client_id)
        _activated.pop(act_key, None)
    return True


def reset_artifacts_for_tests() -> None:
    with _lock:
        _artifacts.clear()
        _activated.clear()
    stop_all_runtimes_for_tests()
