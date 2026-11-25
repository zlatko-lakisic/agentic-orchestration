from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class K8sJobRecord:
    job_name: str
    namespace: str
    pod_name: str | None = None


@dataclass(frozen=True)
class K8sJobWaitResult:
    succeeded: bool
    failed: bool
    pod_name: str | None
    message: str | None


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    """Write JSON so readers on the shared volume never observe a partial file.

    Uses a sibling temp file plus ``os.replace``. The temp file is created with
    ``open()`` (not ``mkstemp``) so it keeps the process umask: queue files must
    stay readable by workers running under a different uid than the writer.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
            fh.flush()
            try:
                os.fsync(fh.fileno())
            except OSError:
                pass
        os.replace(tmp, path)
    finally:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
