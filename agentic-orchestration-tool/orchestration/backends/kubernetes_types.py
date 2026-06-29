from __future__ import annotations

from dataclasses import dataclass


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
