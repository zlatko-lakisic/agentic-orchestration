"""Remote run-store backends (S3/MinIO, Redis) plus env-driven factory selection.

Runs offline: in-process fakes stand in for boto3 / redis clients. When ``moto`` or
``fakeredis`` are installed the extra tests below exercise the real client APIs.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any

import pytest

from orchestration.backends.base import StepResult
from orchestration.run_store import (
    FileSystemRunStore,
    run_store_backend_from_env,
    run_store_from_env,
    run_store_session,
)
from orchestration.run_store_backends import (
    DEFAULT_REDIS_PREFIX,
    DEFAULT_S3_PREFIX,
    RedisRunStore,
    S3RunStore,
)

def _installed(module: str) -> bool:
    return importlib.util.find_spec(module) is not None


_HAS_MOTO = _installed("moto") and _installed("boto3")
_HAS_FAKEREDIS = _installed("fakeredis")


class _MissingKey(Exception):
    def __init__(self) -> None:
        super().__init__("NoSuchKey")
        self.response = {"Error": {"Code": "NoSuchKey"}}


class _Body:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return self._payload


class FakeS3Client:
    """Minimal put/get/head_object stand-in for ``boto3.client("s3")``."""

    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, **_: Any) -> dict[str, Any]:
        self.objects[(Bucket, Key)] = Body
        return {}

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        try:
            payload = self.objects[(Bucket, Key)]
        except KeyError:
            raise _MissingKey() from None
        return {"Body": _Body(payload)}

    def head_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        if (Bucket, Key) not in self.objects:
            raise _MissingKey()
        return {"ContentLength": len(self.objects[(Bucket, Key)])}


class FakeRedisClient:
    def __init__(self) -> None:
        self.values: dict[str, bytes] = {}
        self.expirations: dict[str, int] = {}

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self.values[key] = value.encode("utf-8")
        if ex is not None:
            self.expirations[key] = ex
        return True

    def get(self, key: str) -> bytes | None:
        return self.values.get(key)

    def exists(self, key: str) -> int:
        return 1 if key in self.values else 0


def _result(text: str = "done", *, exit_code: int = 0) -> StepResult:
    return StepResult(
        run_id="run1",
        step_id="research_topic",
        exit_code=exit_code,
        result_text=text,
        recoverable=exit_code != 0,
        rag_audit={"granted_rag_ids": ["kb"]},
    )


@pytest.mark.unit
def test_s3_run_store_roundtrip(tmp_path: Path) -> None:
    client = FakeS3Client()
    store = S3RunStore(
        bucket="runs",
        client=client,
        local_mirror=FileSystemRunStore(tmp_path),
    )
    assert store.read_step_result("run1", "research_topic") is None
    assert store.has_step_result("run1", "research_topic") is False

    store.write_step_result("run1", "research_topic", _result())

    key = f"{DEFAULT_S3_PREFIX}/run1/research_topic/result.json"
    assert ("runs", key) in client.objects
    payload = json.loads(client.objects[("runs", key)].decode("utf-8"))
    assert payload["result_text"] == "done"
    assert payload["schema_version"] == "0.1"

    loaded = store.read_step_result("run1", "research_topic")
    assert loaded is not None
    assert loaded.result_text == "done"
    assert loaded.exit_code == 0
    assert loaded.rag_audit == {"granted_rag_ids": ["kb"]}
    assert store.has_step_result("run1", "research_topic") is True
    # Writes also land on the shared volume so workers/path consumers still work.
    assert store.step_result_path("run1", "research_topic").is_file()


@pytest.mark.unit
def test_s3_run_store_custom_prefix_and_bucket_required(tmp_path: Path) -> None:
    store = S3RunStore(
        bucket="runs",
        prefix="/team/results/",
        client=FakeS3Client(),
        local_mirror=FileSystemRunStore(tmp_path),
    )
    assert store.object_key("r", "s") == "team/results/r/s/result.json"
    with pytest.raises(ValueError):
        S3RunStore(bucket="  ", client=FakeS3Client())


@pytest.mark.unit
def test_s3_run_store_promotes_worker_written_result(tmp_path: Path) -> None:
    """A Job writes result.json on the PVC; the first read publishes it to S3."""
    mirror = FileSystemRunStore(tmp_path)
    client = FakeS3Client()
    store = S3RunStore(bucket="runs", client=client, local_mirror=mirror)
    mirror.write_step_result("run1", "research_topic", _result("from worker"))

    loaded = store.read_step_result("run1", "research_topic")
    assert loaded is not None
    assert loaded.result_text == "from worker"
    key = f"{DEFAULT_S3_PREFIX}/run1/research_topic/result.json"
    assert ("runs", key) in client.objects


@pytest.mark.unit
def test_s3_run_store_surfaces_non_missing_errors(tmp_path: Path) -> None:
    class Boom(FakeS3Client):
        def get_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
            err = Exception("denied")
            err.response = {"Error": {"Code": "AccessDenied"}}  # type: ignore[attr-defined]
            raise err

    store = S3RunStore(
        bucket="runs",
        client=Boom(),
        local_mirror=FileSystemRunStore(tmp_path),
    )
    with pytest.raises(Exception, match="denied"):
        store.read_step_result("run1", "research_topic")


@pytest.mark.unit
def test_redis_run_store_roundtrip(tmp_path: Path) -> None:
    client = FakeRedisClient()
    store = RedisRunStore(
        client=client,
        local_mirror=FileSystemRunStore(tmp_path),
    )
    assert store.read_step_result("run1", "research_topic") is None

    store.write_step_result("run1", "research_topic", _result())

    key = f"{DEFAULT_REDIS_PREFIX}:run:run1:step:research_topic:result"
    assert store.result_key("run1", "research_topic") == key
    assert key in client.values
    assert client.expirations == {}

    loaded = store.read_step_result("run1", "research_topic")
    assert loaded is not None
    assert loaded.result_text == "done"
    assert store.has_step_result("run1", "research_topic") is True


@pytest.mark.unit
def test_redis_run_store_ttl_and_prefix(tmp_path: Path) -> None:
    client = FakeRedisClient()
    store = RedisRunStore(
        prefix="edge",
        ttl_seconds=90,
        client=client,
        local_mirror=FileSystemRunStore(tmp_path),
    )
    store.write_step_result("run1", "step1", _result())
    key = "edge:run:run1:step:step1:result"
    assert client.expirations[key] == 90


@pytest.mark.unit
def test_redis_run_store_promotes_worker_written_result(tmp_path: Path) -> None:
    mirror = FileSystemRunStore(tmp_path)
    client = FakeRedisClient()
    store = RedisRunStore(client=client, local_mirror=mirror)
    mirror.write_step_result("run1", "step1", _result("from worker"))

    loaded = store.read_step_result("run1", "step1")
    assert loaded is not None
    assert loaded.result_text == "from worker"
    assert store.result_key("run1", "step1") in client.values


@pytest.mark.unit
def test_backend_from_env_defaults_to_filesystem(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_BACKEND", raising=False)
    assert run_store_backend_from_env() == "filesystem"


@pytest.mark.unit
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("filesystem", "filesystem"),
        ("FS", "filesystem"),
        ("local", "filesystem"),
        ("s3", "s3"),
        ("MinIO", "s3"),
        ("redis", "redis"),
    ],
)
def test_backend_from_env_aliases(
    raw: str,
    expected: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", raw)
    assert run_store_backend_from_env() == expected


@pytest.mark.unit
def test_backend_from_env_rejects_unknown(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", "postgres")
    with pytest.raises(ValueError, match="unknown AGENTIC_RUN_STORE_BACKEND"):
        run_store_backend_from_env()


@pytest.mark.unit
def test_factory_filesystem(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_BACKEND", raising=False)
    store = run_store_from_env(tmp_path)
    assert isinstance(store, FileSystemRunStore)
    assert store.local_root == tmp_path


@pytest.mark.unit
def test_factory_s3_uses_env(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created: dict[str, Any] = {}

    def fake_client(service: str, **kwargs: Any) -> FakeS3Client:
        created["service"] = service
        created.update(kwargs)
        return FakeS3Client()

    monkeypatch.setattr(
        "orchestration.run_store_backends._load_boto3",
        lambda: type("_Boto3", (), {"client": staticmethod(fake_client)}),
    )
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", "s3")
    monkeypatch.setenv("AGENTIC_RUN_STORE_S3_BUCKET", "agentic-results")
    monkeypatch.setenv("AGENTIC_RUN_STORE_S3_PREFIX", "runs")
    monkeypatch.setenv("AGENTIC_RUN_STORE_S3_ENDPOINT", "http://minio:9000")
    monkeypatch.setenv("AWS_REGION", "us-east-2")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "secret")

    store = run_store_from_env(tmp_path)
    assert isinstance(store, S3RunStore)
    assert store.bucket == "agentic-results"
    assert store.object_key("r", "s") == "runs/r/s/result.json"
    assert store.local_root == tmp_path
    assert created["service"] == "s3"
    assert created["endpoint_url"] == "http://minio:9000"
    assert created["region_name"] == "us-east-2"
    assert created["aws_access_key_id"] == "key"


@pytest.mark.unit
def test_factory_s3_requires_bucket(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", "s3")
    monkeypatch.delenv("AGENTIC_RUN_STORE_S3_BUCKET", raising=False)
    with pytest.raises(ValueError, match="AGENTIC_RUN_STORE_S3_BUCKET"):
        run_store_from_env(tmp_path)


@pytest.mark.unit
def test_factory_redis_uses_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    class _FakeRedisModule:
        class Redis:
            @staticmethod
            def from_url(url: str) -> FakeRedisClient:
                seen["url"] = url
                return FakeRedisClient()

    monkeypatch.setattr(
        "orchestration.run_store_backends._load_redis",
        lambda: _FakeRedisModule,
    )
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", "redis")
    monkeypatch.setenv("AGENTIC_RUN_STORE_REDIS_URL", "redis://cache:6379/2")
    monkeypatch.setenv("AGENTIC_RUN_STORE_REDIS_PREFIX", "edge")
    monkeypatch.setenv("AGENTIC_RUN_STORE_REDIS_TTL_SECONDS", "120")

    store = run_store_from_env(tmp_path)
    assert isinstance(store, RedisRunStore)
    assert seen["url"] == "redis://cache:6379/2"
    assert store.result_key("r", "s") == "edge:run:r:step:s:result"

    store.write_step_result("r", "s", _result())
    loaded = store.read_step_result("r", "s")
    assert loaded is not None and loaded.result_text == "done"


@pytest.mark.unit
def test_factory_redis_rejects_bad_ttl(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", "redis")
    monkeypatch.setenv("AGENTIC_RUN_STORE_REDIS_TTL_SECONDS", "soon")
    with pytest.raises(ValueError, match="must be an integer"):
        run_store_from_env(tmp_path)


@pytest.mark.unit
def test_run_store_session_uses_configured_backend(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Specs stay on the local/PVC workspace even when results go to Redis."""
    monkeypatch.setattr(
        "orchestration.run_store_backends._load_redis",
        lambda: type(
            "_Mod",
            (),
            {"Redis": type("_R", (), {"from_url": staticmethod(lambda url: FakeRedisClient())})},
        ),
    )
    monkeypatch.setenv("AGENTIC_RUN_STORE_BACKEND", "redis")
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path))

    with run_store_session("sess-remote") as (store, workspace):
        assert isinstance(store, RedisRunStore)
        assert workspace == tmp_path / "sess-remote"
        assert workspace.is_dir()
        assert store.local_root == tmp_path
        store.write_step_result("sess-remote", "step1", _result())
        loaded = store.read_step_result("sess-remote", "step1")
        assert loaded is not None and loaded.result_text == "done"


@pytest.mark.unit
def test_run_store_session_filesystem_backend_unchanged(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("AGENTIC_RUN_STORE_BACKEND", raising=False)
    monkeypatch.setenv("AGENTIC_RUN_STORE_PATH", str(tmp_path))
    with run_store_session("sess-fs") as (store, workspace):
        assert isinstance(store, FileSystemRunStore)
        assert store.local_root == tmp_path
        assert workspace == tmp_path / "sess-fs"


@pytest.mark.unit
@pytest.mark.skipif(not _HAS_MOTO, reason="moto/boto3 not installed")
def test_s3_run_store_with_moto(tmp_path: Path) -> None:
    import boto3  # noqa: PLC0415
    from moto import mock_aws  # noqa: PLC0415

    with mock_aws():
        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket="agentic-runs")
        store = S3RunStore(
            bucket="agentic-runs",
            client=client,
            local_mirror=FileSystemRunStore(tmp_path),
        )
        assert store.read_step_result("run1", "step1") is None
        store.write_step_result("run1", "step1", _result("moto"))
        loaded = store.read_step_result("run1", "step1")
        assert loaded is not None and loaded.result_text == "moto"
        assert store.has_step_result("run1", "step1") is True


@pytest.mark.unit
@pytest.mark.skipif(not _HAS_FAKEREDIS, reason="fakeredis not installed")
def test_redis_run_store_with_fakeredis(tmp_path: Path) -> None:
    import fakeredis  # noqa: PLC0415

    store = RedisRunStore(
        client=fakeredis.FakeStrictRedis(),
        ttl_seconds=60,
        local_mirror=FileSystemRunStore(tmp_path),
    )
    assert store.read_step_result("run1", "step1") is None
    store.write_step_result("run1", "step1", _result("fakeredis"))
    loaded = store.read_step_result("run1", "step1")
    assert loaded is not None and loaded.result_text == "fakeredis"
    assert store.has_step_result("run1", "step1") is True
