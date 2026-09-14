"""Engine-side detection weight artifacts: cache, download, sha256 verify."""

from __future__ import annotations

import hashlib
import os
import threading
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

_CACHE_LOCK = threading.Lock()


class WeightsVerifyError(RuntimeError):
    """Checksum mismatch or missing digest — never load unverified weights."""

    code = "weights_verify_failed"


class DetectionUnavailableError(RuntimeError):
    code = "detection_unavailable"


def detection_artifact_cache_dir() -> Path:
    raw = os.getenv("AGENTIC_DETECTION_ARTIFACT_CACHE", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    home = Path.home() / ".cache" / "agentic-orchestration" / "detection-artifacts"
    return home.resolve()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def normalize_sha256(raw: Any) -> str:
    text = str(raw or "").strip().lower()
    if text.startswith("sha256:"):
        text = text[7:].strip()
    return text


def weights_spec_from_entry(entry: dict[str, Any]) -> dict[str, str]:
    """Extract ``uri`` / ``sha256`` / ``format`` from a catalog entry."""
    weights = entry.get("weights")
    if not isinstance(weights, dict):
        opts = entry.get("provider_options")
        if isinstance(opts, dict) and isinstance(opts.get("weights"), dict):
            weights = opts["weights"]
        else:
            weights = {}
    uri = str(weights.get("uri") or entry.get("weights_uri") or "").strip()
    digest = normalize_sha256(weights.get("sha256") or entry.get("weights_sha256"))
    fmt = str(weights.get("format") or "onnx").strip().lower() or "onnx"
    if not uri:
        raise DetectionUnavailableError(
            f"object_detection provider '{entry.get('id')}' is missing weights.uri"
        )
    if not digest or len(digest) != 64:
        raise WeightsVerifyError(
            f"object_detection provider '{entry.get('id')}' requires weights.sha256 (64 hex chars)"
        )
    return {"uri": uri, "sha256": digest, "format": fmt}


def cache_path_for_weights(digest: str, fmt: str = "onnx") -> Path:
    """Public path for a verified artifact in the detection cache."""
    return _cache_path_for(digest, fmt)


def _cache_path_for(digest: str, fmt: str) -> Path:
    safe_fmt = "".join(c for c in fmt if c.isalnum()) or "bin"
    return detection_artifact_cache_dir() / f"{digest}.{safe_fmt}"


def weights_cached(entry: dict[str, Any]) -> tuple[bool, str, Path | None]:
    """Return ``(cached, sha256, path)`` without downloading."""
    try:
        spec = weights_spec_from_entry(entry)
    except Exception:  # noqa: BLE001
        return False, "", None
    digest = spec["sha256"]
    path = _cache_path_for(digest, spec["format"])
    return path.is_file(), digest, path


def _is_local_uri(uri: str) -> bool:
    parsed = urlparse(uri)
    if parsed.scheme in ("", "file"):
        return True
    if parsed.scheme == "artifact":
        return False
    # Windows drive letter (C:\...) is parsed as scheme "c"
    if os.name == "nt" and len(parsed.scheme) == 1 and parsed.scheme.isalpha():
        return True
    # Absolute POSIX path
    if uri.startswith("/") or uri.startswith("\\"):
        return True
    return False


def _local_path_from_uri(uri: str) -> Path:
    parsed = urlparse(uri)
    if parsed.scheme == "file":
        # file:///C:/path or file:///path
        if os.name == "nt" and parsed.path.startswith("/") and len(parsed.path) > 2 and parsed.path[2] == ":":
            return Path(parsed.path[1:]).resolve()
        if parsed.netloc and os.name == "nt":
            return Path(f"{parsed.netloc}:{parsed.path}").resolve()
        return Path(parsed.path).resolve()
    if os.name == "nt" and len(parsed.scheme) == 1 and parsed.scheme.isalpha():
        return Path(uri).expanduser().resolve()
    return Path(uri).expanduser().resolve()


def ensure_detection_weights(
    entry: dict[str, Any],
    *,
    on_progress: Any | None = None,
) -> Path:
    """Resolve weights to a local verified file (download if needed)."""
    spec = weights_spec_from_entry(entry)
    uri = spec["uri"]
    digest = spec["sha256"]
    fmt = spec["format"]
    cache_path = _cache_path_for(digest, fmt)

    def progress(msg: str) -> None:
        if on_progress is not None:
            on_progress(msg)

    with _CACHE_LOCK:
        if cache_path.is_file():
            actual = sha256_file(cache_path)
            if actual != digest:
                cache_path.unlink(missing_ok=True)
                raise WeightsVerifyError(
                    f"cached weights checksum mismatch for {entry.get('id')}: "
                    f"expected {digest}, got {actual}"
                )
            progress(f"detection weights ready: {cache_path.name}")
            return cache_path

        if _is_local_uri(uri) and not uri.startswith("artifact:"):
            src = _local_path_from_uri(uri)
            if not src.is_file():
                raise DetectionUnavailableError(f"weights file not found: {src}")
            actual = sha256_file(src)
            if actual != digest:
                raise WeightsVerifyError(
                    f"weights checksum mismatch for {entry.get('id')}: "
                    f"expected {digest}, got {actual}"
                )
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_bytes(src.read_bytes())
            progress(f"detection weights copied: {cache_path.name}")
            return cache_path

        if uri.startswith("artifact:"):
            # Logical id — look for pre-seeded cache only.
            raise DetectionUnavailableError(
                f"artifact {uri!r} not present in cache "
                f"({cache_path}); seed the cache or provide an https/file uri"
            )

        progress(f"detection weights downloading: {uri}")
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = cache_path.with_suffix(cache_path.suffix + ".partial")
        req = Request(uri, headers={"User-Agent": "agentic-orchestration-detection/1.0"})
        with urlopen(req, timeout=120) as resp:  # noqa: S310 — operator-configured URI
            tmp.write_bytes(resp.read())
        actual = sha256_file(tmp)
        if actual != digest:
            tmp.unlink(missing_ok=True)
            raise WeightsVerifyError(
                f"downloaded weights checksum mismatch for {entry.get('id')}: "
                f"expected {digest}, got {actual}"
            )
        tmp.replace(cache_path)
        progress(f"detection weights ready: {cache_path.name}")
        return cache_path
