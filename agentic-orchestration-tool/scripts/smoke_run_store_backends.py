#!/usr/bin/env python3
"""
Jetson / edge smoke: run-store backends (filesystem default, S3/MinIO, Redis).

Offline by default — unit tests plus in-process fakes for boto3 / redis, so no
bucket and no Redis are required. Opt in to live checks explicitly::

  python3 scripts/smoke_run_store_backends.py
  AGENTIC_RUN_STORE_S3_BUCKET=runs AGENTIC_RUN_STORE_S3_ENDPOINT=http://minio:9000 \
    AGENTIC_SMOKE_RUN_STORE_S3_LIVE=1 python3 scripts/smoke_run_store_backends.py
  AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE=1 python3 scripts/smoke_run_store_backends.py
  ./scripts/smoke_run_store_backends.sh

Env:
  SMOKE_SKIP_UNIT                     1 to skip pytest
  AGENTIC_SMOKE_RUN_STORE_S3_LIVE     1 to round-trip against a real S3/MinIO bucket
  AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE  1 to round-trip against a real Redis
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

_TOOL_ROOT = Path(__file__).resolve().parent.parent

if str(_TOOL_ROOT) not in sys.path:
    sys.path.insert(0, str(_TOOL_ROOT))


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _truthy(name: str) -> bool:
    return _env(name).lower() in ("1", "true", "yes", "on")


def _ok(msg: str) -> None:
    print(f"  OK  {msg}")


def _fail(msg: str) -> None:
    print(f" FAIL {msg}", file=sys.stderr)


def _python() -> Path:
    candidate = _TOOL_ROOT / ".venv" / "bin" / "python"
    return candidate if candidate.is_file() else Path(sys.executable)


def _sample_result():
    from orchestration.backends.base import StepResult

    return StepResult(
        run_id="smoke-run",
        step_id="smoke-step",
        exit_code=0,
        result_text="run store smoke",
    )


def run_unit_tests() -> tuple[bool, str]:
    if _truthy("SMOKE_SKIP_UNIT"):
        return True, "unit skipped"
    cmd = [
        str(_python()),
        "-m",
        "pytest",
        "tests/test_run_store.py",
        "tests/test_run_store_backends.py",
        "-q",
        "--tb=line",
    ]
    proc = subprocess.run(cmd, cwd=str(_TOOL_ROOT), capture_output=True, text=True)
    tail = (proc.stdout or proc.stderr or "").strip().splitlines()[-3:]
    if proc.returncode != 0:
        return False, "pytest failed: " + " | ".join(tail)
    return True, "unit tests passed: " + (tail[-1] if tail else "ok")


def check_filesystem_default() -> tuple[bool, str]:
    """Default backend must stay filesystem and never touch boto3/redis."""
    from orchestration.run_store import (
        FileSystemRunStore,
        run_store_backend_from_env,
        run_store_from_env,
    )

    prior = os.environ.pop("AGENTIC_RUN_STORE_BACKEND", None)
    try:
        if run_store_backend_from_env() != "filesystem":
            return False, "default backend is not filesystem"
        with tempfile.TemporaryDirectory(prefix="run-store-smoke-") as tmp:
            store = run_store_from_env(Path(tmp))
            if not isinstance(store, FileSystemRunStore):
                return False, f"expected FileSystemRunStore, got {type(store).__name__}"
            store.write_step_result("smoke-run", "smoke-step", _sample_result())
            if not store.has_step_result("smoke-run", "smoke-step"):
                return False, "filesystem store lost the result it just wrote"
            loaded = store.read_step_result("smoke-run", "smoke-step")
            if loaded is None or loaded.result_text != "run store smoke":
                return False, f"filesystem round-trip mismatch: {loaded}"
    finally:
        if prior is not None:
            os.environ["AGENTIC_RUN_STORE_BACKEND"] = prior
    return True, "filesystem is the default and round-trips a StepResult"


def check_soft_imports() -> tuple[bool, str]:
    """boto3 / redis must never be required to import the run store."""
    code = (
        "import sys; import orchestration.run_store as rs; import orchestration.run_store_backends;"
        "loaded=[m for m in ('boto3','redis') if m in sys.modules];"
        "print('LOADED:'+','.join(loaded))"
    )
    proc = subprocess.run(
        [str(_python()), "-c", code],
        cwd=str(_TOOL_ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return False, f"import failed: {(proc.stderr or '').strip()[-300:]}"
    loaded = (proc.stdout or "").strip().removeprefix("LOADED:").strip()
    if loaded:
        return False, f"optional clients imported at module load: {loaded}"
    return True, "run_store + run_store_backends import without boto3/redis"


def check_fake_backends() -> tuple[bool, str]:
    """S3 and Redis stores round-trip against in-process fakes (no network)."""
    sys.path.insert(0, str(_TOOL_ROOT / "tests"))
    try:
        from test_run_store_backends import FakeRedisClient, FakeS3Client  # noqa: PLC0415
    finally:
        sys.path.pop(0)
    from orchestration.run_store import FileSystemRunStore
    from orchestration.run_store_backends import RedisRunStore, S3RunStore

    with tempfile.TemporaryDirectory(prefix="run-store-smoke-") as tmp:
        mirror = FileSystemRunStore(Path(tmp))
        s3 = S3RunStore(bucket="runs", client=FakeS3Client(), local_mirror=mirror)
        s3.write_step_result("smoke-run", "smoke-step", _sample_result())
        loaded = s3.read_step_result("smoke-run", "smoke-step")
        if loaded is None or loaded.result_text != "run store smoke":
            return False, f"fake S3 round-trip mismatch: {loaded}"

        redis_store = RedisRunStore(
            client=FakeRedisClient(),
            local_mirror=FileSystemRunStore(Path(tmp) / "redis"),
        )
        redis_store.write_step_result("smoke-run", "smoke-step", _sample_result())
        loaded = redis_store.read_step_result("smoke-run", "smoke-step")
        if loaded is None or loaded.result_text != "run store smoke":
            return False, f"fake Redis round-trip mismatch: {loaded}"
    return True, "S3 and Redis backends round-trip against in-process fakes"


def check_specs_stay_local() -> tuple[bool, str]:
    """Remote backends still hand workers a local/PVC path for step specs."""
    sys.path.insert(0, str(_TOOL_ROOT / "tests"))
    try:
        from test_run_store_backends import FakeRedisClient  # noqa: PLC0415
    finally:
        sys.path.pop(0)
    from orchestration.run_store import FileSystemRunStore, write_step_spec
    from orchestration.run_store_backends import RedisRunStore

    with tempfile.TemporaryDirectory(prefix="run-store-smoke-") as tmp:
        workspace = Path(tmp) / "smoke-run"
        store = RedisRunStore(
            client=FakeRedisClient(),
            local_mirror=FileSystemRunStore(Path(tmp)),
        )
        spec_path = workspace / "smoke-step-spec.json"
        write_step_spec(spec_path, {"schema_version": "0.1", "step_id": "smoke-step"})
        if not spec_path.is_file():
            return False, f"step spec not on the local workspace: {spec_path}"
        if store.local_root != Path(tmp):
            return False, f"unexpected local_root: {store.local_root}"
        # Worker writes result.json onto the shared volume; the store promotes it.
        FileSystemRunStore(Path(tmp)).write_step_result(
            "smoke-run", "smoke-step", _sample_result()
        )
        loaded = store.read_step_result("smoke-run", "smoke-step")
        if loaded is None or loaded.result_text != "run store smoke":
            return False, "worker-written result was not promoted to the remote store"
    return True, "specs stay on the local/PVC workspace; worker results get promoted"


def run_optional_live_s3() -> tuple[bool, str]:
    if not _truthy("AGENTIC_SMOKE_RUN_STORE_S3_LIVE"):
        return True, "live S3 skipped (set AGENTIC_SMOKE_RUN_STORE_S3_LIVE=1)"
    if not _env("AGENTIC_RUN_STORE_S3_BUCKET"):
        return False, "live S3 requested without AGENTIC_RUN_STORE_S3_BUCKET"
    from orchestration.run_store_backends import s3_run_store_from_env

    with tempfile.TemporaryDirectory(prefix="run-store-smoke-s3-") as tmp:
        from orchestration.run_store import FileSystemRunStore

        store = s3_run_store_from_env(local_mirror=FileSystemRunStore(Path(tmp)))
        run_id = f"smoke-{int(time.time())}"
        store.write_step_result(run_id, "smoke-step", _sample_result())
        loaded = store.read_step_result(run_id, "smoke-step")
        if loaded is None or loaded.result_text != "run store smoke":
            return False, f"live S3 round-trip mismatch: {loaded}"
        return True, f"live S3 ok: s3://{store.bucket}/{store.object_key(run_id, 'smoke-step')}"


def run_optional_live_redis() -> tuple[bool, str]:
    if not _truthy("AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE"):
        return True, "live Redis skipped (set AGENTIC_SMOKE_RUN_STORE_REDIS_LIVE=1)"
    from orchestration.run_store_backends import redis_run_store_from_env

    with tempfile.TemporaryDirectory(prefix="run-store-smoke-redis-") as tmp:
        from orchestration.run_store import FileSystemRunStore

        store = redis_run_store_from_env(local_mirror=FileSystemRunStore(Path(tmp)))
        run_id = f"smoke-{int(time.time())}"
        store.write_step_result(run_id, "smoke-step", _sample_result())
        loaded = store.read_step_result(run_id, "smoke-step")
        if loaded is None or loaded.result_text != "run store smoke":
            return False, f"live Redis round-trip mismatch: {loaded}"
        return True, f"live Redis ok: {store.result_key(run_id, 'smoke-step')}"


def one_round() -> bool:
    print("=== run store backends smoke (filesystem / S3 / Redis) ===")
    checks = [
        ("unit tests", run_unit_tests),
        ("filesystem default", check_filesystem_default),
        ("soft imports", check_soft_imports),
        ("fake S3 + Redis", check_fake_backends),
        ("specs stay local", check_specs_stay_local),
        ("live S3 optional", run_optional_live_s3),
        ("live Redis optional", run_optional_live_redis),
    ]
    all_ok = True
    for name, fn in checks:
        print(f"-- {name}")
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001
            ok, detail = False, f"exception: {exc}"
        if ok:
            _ok(detail)
        else:
            _fail(detail)
            all_ok = False
    return all_ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--until-pass", action="store_true")
    args = ap.parse_args()
    rounds = max(1, int(_env("SMOKE_ROUNDS", "3") or "3"))
    if not args.until_pass:
        return 0 if one_round() else 1
    for i in range(1, rounds + 1):
        print(f"\n######## round {i}/{rounds} ########")
        if one_round():
            print(f"\nSMOKE PASS on round {i}")
            return 0
        if i < rounds:
            time.sleep(min(30, 5 * i))
    print("\nSMOKE FAIL after all rounds", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
