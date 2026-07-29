"""Optional remote run-store backends: S3/MinIO and Redis.

Selected with ``AGENTIC_RUN_STORE_BACKEND=s3|redis``; ``filesystem`` stays the
default. Both backends are result stores only:

* Step **specs** always stay on the local/PVC workspace (``AGENTIC_RUN_STORE_PATH``)
  because subprocess workers and Kubernetes Jobs are handed a file path for
  ``--execute-step``.
* Step **results** are written to the remote store. Workers still write
  ``result.json`` onto the shared volume, so a result found only on the local
  mirror is promoted to the remote store on first read.

``boto3`` / ``redis`` are soft dependencies (``requirements-run-store.txt``); they
are imported when a backend is constructed, never at module import.
"""

from __future__ import annotations

import os
import tempfile
from abc import abstractmethod
from pathlib import Path
from typing import Any

from orchestration.backends.base import StepResult
from orchestration.run_store import (
    FileSystemRunStore,
    RunStore,
    step_result_from_json,
    step_result_to_json,
)

DEFAULT_S3_PREFIX = "agentic-runs"
DEFAULT_REDIS_URL = "redis://127.0.0.1:6379/0"
DEFAULT_REDIS_PREFIX = "agentic"

# Only "object absent" codes: auth/bucket errors must surface, not read as a miss.
_MISSING_S3_CODES = {"NoSuchKey", "NotFound", "404"}


class RunStoreDependencyError(RuntimeError):
    """A remote backend was requested without its optional client library."""


def _env_first(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


class _RemoteRunStore(RunStore):
    """Remote result store with a local filesystem mirror for worker handoff."""

    def __init__(self, *, local_mirror: FileSystemRunStore | None = None) -> None:
        self._mirror = local_mirror or FileSystemRunStore(
            Path(tempfile.mkdtemp(prefix="agentic-run-store-cache-"))
        )

    @property
    def local_root(self) -> Path:
        return self._mirror.local_root

    def step_result_path(self, run_id: str, step_id: str) -> Path:
        return self._mirror.step_result_path(run_id, step_id)

    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None:
        self._remote_write(run_id, step_id, step_result_to_json(result))
        self._mirror.write_step_result(run_id, step_id, result)

    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None:
        payload = self._remote_read(run_id, step_id)
        if payload is not None:
            return step_result_from_json(payload, run_id=run_id, step_id=step_id)
        local = self._mirror.read_step_result(run_id, step_id)
        if local is not None:
            self._remote_write(run_id, step_id, step_result_to_json(local))
        return local

    def has_step_result(self, run_id: str, step_id: str) -> bool:
        return self._remote_has(run_id, step_id) or self._mirror.has_step_result(run_id, step_id)

    @abstractmethod
    def _remote_write(self, run_id: str, step_id: str, payload: str) -> None: ...

    @abstractmethod
    def _remote_read(self, run_id: str, step_id: str) -> str | None: ...

    @abstractmethod
    def _remote_has(self, run_id: str, step_id: str) -> bool: ...


def _load_boto3() -> Any:
    try:
        import boto3  # noqa: PLC0415
    except ImportError as exc:  # pragma: no cover - depends on install
        raise RunStoreDependencyError(
            "AGENTIC_RUN_STORE_BACKEND=s3 needs boto3: "
            "pip install -r requirements-run-store.txt"
        ) from exc
    return boto3


def _load_redis() -> Any:
    try:
        import redis  # noqa: PLC0415
    except ImportError as exc:  # pragma: no cover - depends on install
        raise RunStoreDependencyError(
            "AGENTIC_RUN_STORE_BACKEND=redis needs redis: "
            "pip install -r requirements-run-store.txt"
        ) from exc
    return redis


def _is_missing_object(exc: BaseException) -> bool:
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        error = response.get("Error") or {}
        if str(error.get("Code") or "") in _MISSING_S3_CODES:
            return True
        if (response.get("ResponseMetadata") or {}).get("HTTPStatusCode") == 404:
            return True
    return type(exc).__name__ in ("NoSuchKey", "404")


class S3RunStore(_RemoteRunStore):
    """Step results in an S3-compatible bucket (AWS S3, MinIO, Ceph RGW).

    Keys are ``{prefix}/{run_id}/{step_id}/result.json``.
    """

    def __init__(
        self,
        *,
        bucket: str,
        prefix: str = DEFAULT_S3_PREFIX,
        client: Any | None = None,
        endpoint_url: str | None = None,
        region_name: str | None = None,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        local_mirror: FileSystemRunStore | None = None,
    ) -> None:
        bucket = (bucket or "").strip()
        if not bucket:
            raise ValueError("S3RunStore requires a bucket (AGENTIC_RUN_STORE_S3_BUCKET)")
        super().__init__(local_mirror=local_mirror)
        self._bucket = bucket
        self._prefix = (prefix or DEFAULT_S3_PREFIX).strip().strip("/") or DEFAULT_S3_PREFIX
        self._client = client if client is not None else _build_s3_client(
            endpoint_url=endpoint_url,
            region_name=region_name,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
        )

    @property
    def bucket(self) -> str:
        return self._bucket

    def object_key(self, run_id: str, step_id: str) -> str:
        return f"{self._prefix}/{run_id}/{step_id}/result.json"

    def _remote_write(self, run_id: str, step_id: str, payload: str) -> None:
        self._client.put_object(
            Bucket=self._bucket,
            Key=self.object_key(run_id, step_id),
            Body=payload.encode("utf-8"),
            ContentType="application/json",
        )

    def _remote_read(self, run_id: str, step_id: str) -> str | None:
        try:
            response = self._client.get_object(
                Bucket=self._bucket,
                Key=self.object_key(run_id, step_id),
            )
        except Exception as exc:  # noqa: BLE001 - boto3 error classes are runtime-built
            if _is_missing_object(exc):
                return None
            raise
        body = response["Body"].read()
        return body.decode("utf-8") if isinstance(body, bytes) else str(body)

    def _remote_has(self, run_id: str, step_id: str) -> bool:
        try:
            self._client.head_object(
                Bucket=self._bucket,
                Key=self.object_key(run_id, step_id),
            )
        except Exception as exc:  # noqa: BLE001 - boto3 error classes are runtime-built
            if _is_missing_object(exc):
                return False
            raise
        return True


def _build_s3_client(
    *,
    endpoint_url: str | None,
    region_name: str | None,
    access_key_id: str | None,
    secret_access_key: str | None,
) -> Any:
    boto3 = _load_boto3()
    kwargs: dict[str, Any] = {}
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
    if region_name:
        kwargs["region_name"] = region_name
    if access_key_id and secret_access_key:
        kwargs["aws_access_key_id"] = access_key_id
        kwargs["aws_secret_access_key"] = secret_access_key
    return boto3.client("s3", **kwargs)


class RedisRunStore(_RemoteRunStore):
    """Step results in Redis under ``{prefix}:run:{run_id}:step:{step_id}:result``."""

    def __init__(
        self,
        *,
        url: str = DEFAULT_REDIS_URL,
        prefix: str = DEFAULT_REDIS_PREFIX,
        ttl_seconds: int | None = None,
        client: Any | None = None,
        local_mirror: FileSystemRunStore | None = None,
    ) -> None:
        super().__init__(local_mirror=local_mirror)
        self._prefix = (prefix or DEFAULT_REDIS_PREFIX).strip().strip(":") or DEFAULT_REDIS_PREFIX
        self._ttl_seconds = ttl_seconds if ttl_seconds and ttl_seconds > 0 else None
        if client is not None:
            self._client = client
        else:
            redis = _load_redis()
            self._client = redis.Redis.from_url((url or DEFAULT_REDIS_URL).strip())

    def result_key(self, run_id: str, step_id: str) -> str:
        return f"{self._prefix}:run:{run_id}:step:{step_id}:result"

    def _remote_write(self, run_id: str, step_id: str, payload: str) -> None:
        key = self.result_key(run_id, step_id)
        if self._ttl_seconds is not None:
            self._client.set(key, payload, ex=self._ttl_seconds)
        else:
            self._client.set(key, payload)

    def _remote_read(self, run_id: str, step_id: str) -> str | None:
        raw = self._client.get(self.result_key(run_id, step_id))
        if raw is None:
            return None
        return raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)

    def _remote_has(self, run_id: str, step_id: str) -> bool:
        return bool(self._client.exists(self.result_key(run_id, step_id)))


def s3_run_store_from_env(*, local_mirror: FileSystemRunStore | None = None) -> S3RunStore:
    bucket = _env_first("AGENTIC_RUN_STORE_S3_BUCKET")
    if not bucket:
        raise ValueError(
            "AGENTIC_RUN_STORE_BACKEND=s3 requires AGENTIC_RUN_STORE_S3_BUCKET"
        )
    return S3RunStore(
        bucket=bucket,
        prefix=_env_first("AGENTIC_RUN_STORE_S3_PREFIX") or DEFAULT_S3_PREFIX,
        endpoint_url=_env_first("AGENTIC_RUN_STORE_S3_ENDPOINT") or None,
        region_name=_env_first(
            "AGENTIC_RUN_STORE_S3_REGION",
            "AWS_REGION",
            "AWS_DEFAULT_REGION",
        )
        or None,
        access_key_id=_env_first(
            "AGENTIC_RUN_STORE_S3_ACCESS_KEY_ID",
            "AWS_ACCESS_KEY_ID",
        )
        or None,
        secret_access_key=_env_first(
            "AGENTIC_RUN_STORE_S3_SECRET_ACCESS_KEY",
            "AWS_SECRET_ACCESS_KEY",
        )
        or None,
        local_mirror=local_mirror,
    )


def redis_run_store_from_env(*, local_mirror: FileSystemRunStore | None = None) -> RedisRunStore:
    ttl_raw = _env_first("AGENTIC_RUN_STORE_REDIS_TTL_SECONDS")
    try:
        ttl_seconds = int(ttl_raw) if ttl_raw else None
    except ValueError as exc:
        raise ValueError(
            f"AGENTIC_RUN_STORE_REDIS_TTL_SECONDS must be an integer, got {ttl_raw!r}"
        ) from exc
    return RedisRunStore(
        url=_env_first("AGENTIC_RUN_STORE_REDIS_URL") or DEFAULT_REDIS_URL,
        prefix=_env_first("AGENTIC_RUN_STORE_REDIS_PREFIX") or DEFAULT_REDIS_PREFIX,
        ttl_seconds=ttl_seconds,
        local_mirror=local_mirror,
    )
