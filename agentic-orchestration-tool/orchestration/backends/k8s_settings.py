from __future__ import annotations

import os
from dataclasses import dataclass

from orchestration.run_store import DEFAULT_RUN_STORE_MOUNT


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    return int(raw)


@dataclass(frozen=True)
class K8sSettings:
    namespace: str
    worker_image: str
    run_store_pvc: str
    run_store_mount: str
    job_ttl_seconds: int
    job_timeout_seconds: int
    env_secret_name: str | None

    @classmethod
    def from_env(cls) -> K8sSettings:
        worker_image = os.getenv("AGENTIC_K8S_WORKER_IMAGE", "").strip()
        pvc = os.getenv("AGENTIC_K8S_RUN_STORE_PVC", "").strip()
        secret = os.getenv("AGENTIC_K8S_ENV_SECRET", "").strip() or None
        return cls(
            namespace=os.getenv("AGENTIC_K8S_NAMESPACE", "agentic-orchestration").strip()
            or "agentic-orchestration",
            worker_image=worker_image,
            run_store_pvc=pvc,
            run_store_mount=os.getenv("AGENTIC_K8S_RUN_STORE_MOUNT", DEFAULT_RUN_STORE_MOUNT).strip()
            or DEFAULT_RUN_STORE_MOUNT,
            job_ttl_seconds=_env_int("AGENTIC_K8S_JOB_TTL_SECONDS", 3600),
            job_timeout_seconds=_env_int("AGENTIC_K8S_JOB_TIMEOUT_SECONDS", 3600),
            env_secret_name=secret,
        )

    def validate_for_run(self) -> None:
        if not self.worker_image:
            raise ValueError(
                "AGENTIC_K8S_WORKER_IMAGE is required when AGENTIC_EXECUTION_BACKEND=kubernetes"
            )
        if not self.run_store_pvc:
            raise ValueError(
                "AGENTIC_K8S_RUN_STORE_PVC is required when AGENTIC_EXECUTION_BACKEND=kubernetes"
            )


def worker_env_from_process() -> list[dict[str, str]]:
    """Pass provider/MCP-related env vars from coordinator into worker Jobs."""
    prefixes = (
        "OPENAI_",
        "ANTHROPIC_",
        "HF_",
        "HUGGINGFACE_",
        "OLLAMA_",
        "AGENTIC_",
        "BRAVE_",
        "TAVILY_",
        "EXA_",
        "HOME_ASSISTANT_",
        "FILESYSTEM_",
    )
    out: list[dict[str, str]] = []
    for key, value in os.environ.items():
        if not value or key.startswith("AGENTIC_K8S_"):
            continue
        if key == "AGENTIC_EXECUTION_BACKEND":
            continue
        if any(key.startswith(prefix) for prefix in prefixes):
            out.append({"name": key, "value": value})
    return out
