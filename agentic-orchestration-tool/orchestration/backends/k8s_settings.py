from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any

from orchestration.run_store import DEFAULT_RUN_STORE_MOUNT


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    return int(raw)


def _parse_json_object_env(name: str) -> dict[str, Any] | None:
    raw = os.getenv(name, "").strip()
    if not raw:
        return None
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError(f"{name} must be a JSON object")
    return data


@dataclass(frozen=True)
class K8sSettings:
    namespace: str
    worker_image: str
    run_store_pvc: str
    run_store_mount: str
    job_ttl_seconds: int
    job_timeout_seconds: int
    env_secret_name: str | None
    worker_resources: dict[str, Any] | None = None
    gpu_node_selector: dict[str, str] | None = None
    gpu_provider_ids: frozenset[str] | None = None
    worker_run_as_user: int | None = None

    @classmethod
    def from_env(cls) -> K8sSettings:
        worker_image = os.getenv("AGENTIC_K8S_WORKER_IMAGE", "").strip()
        pvc = os.getenv("AGENTIC_K8S_RUN_STORE_PVC", "").strip()
        secret = os.getenv("AGENTIC_K8S_ENV_SECRET", "").strip() or None
        gpu_providers_raw = os.getenv("AGENTIC_K8S_GPU_PROVIDER_IDS", "").strip()
        gpu_providers: frozenset[str] | None = None
        if gpu_providers_raw:
            gpu_providers = frozenset(
                p.strip() for p in gpu_providers_raw.split(",") if p.strip()
            )
        gpu_selector_raw = _parse_json_object_env("AGENTIC_K8S_GPU_NODE_SELECTOR")
        gpu_selector = (
            {str(k): str(v) for k, v in gpu_selector_raw.items()} if gpu_selector_raw else None
        )
        run_as_user_raw = os.getenv("AGENTIC_K8S_WORKER_RUN_AS_USER", "").strip()
        worker_run_as_user = int(run_as_user_raw) if run_as_user_raw else None
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
            worker_resources=_parse_json_object_env("AGENTIC_K8S_WORKER_RESOURCES"),
            gpu_node_selector=gpu_selector,
            gpu_provider_ids=gpu_providers,
            worker_run_as_user=worker_run_as_user,
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


_SECRET_NAME_WORDS = frozenset(
    {
        "KEY",
        "APIKEY",
        "TOKEN",
        "SECRET",
        "PASSWORD",
        "PASSWD",
        "PWD",
        "CREDENTIAL",
        "CREDENTIALS",
        "DSN",
        "BEARER",
    }
)
# A secret word followed by one of these describes a secret, it is not one
# (``AGENTIC_API_TOKEN_ID``, ``AGENTIC_CREDENTIAL_SKIP_VERBOSE``, ``..._TOKEN_FILE``).
_NON_SECRET_TRAILING_WORDS = frozenset(
    {
        "ID",
        "IDS",
        "DIR",
        "PATH",
        "FILE",
        "TTL",
        "SECONDS",
        "ENABLED",
        "VERBOSE",
        "AT",
        "HEADER",
        "NAME",
        "PREFIX",
        "MAX",
        "MIN",
        "LIMIT",
        "COUNT",
    }
)
_URL_USERINFO_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://[^/\s@]+@")


def is_secret_like_env(name: str, value: str = "") -> bool:
    """True when an env var should travel through a Secret, not a literal ``env[].value``.

    Literal env values are readable by anyone allowed to ``get`` Jobs or Pods; a
    Secret reference is not. Matches whole ``_``-separated words, so
    ``OPENAI_API_KEY`` / ``HF_TOKEN`` / ``AGENTIC_SENTRY_DSN`` match while
    ``AGENTIC_RAG_INJECT_MAX_TOKENS`` does not, plus URLs that embed credentials.
    """
    words = [w for w in name.upper().split("_") if w]
    if any(word in _SECRET_NAME_WORDS for word in words):
        # ``..._ACCESS_KEY_ID`` identifies a credential pair; keep it out of literals too.
        if name.upper().endswith("ACCESS_KEY_ID"):
            return True
        if words[-1] not in _NON_SECRET_TRAILING_WORDS:
            return True
    if value and _URL_USERINFO_RE.match(value.strip()):
        return True
    return False


def worker_env_literal_secrets_enabled() -> bool:
    """Escape hatch: copy secret-like vars into Job specs as literals (pre-fix behaviour).

    Set ``AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS=1`` only on clusters that have no
    ``AGENTIC_K8S_ENV_SECRET`` Secret for workers to read their credentials from.
    """
    raw = os.getenv("AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS", "").strip().lower()
    return raw in ("1", "true", "yes", "on")


def worker_env_from_process(*, include_secrets: bool | None = None) -> list[dict[str, str]]:
    """Pass provider/MCP-related *configuration* from coordinator into worker Jobs.

    Secret-like variables (see :func:`is_secret_like_env`) are left out: workers
    receive them from the ``AGENTIC_K8S_ENV_SECRET`` Secret via ``envFrom``.
    ``include_secrets=True`` (or ``AGENTIC_K8S_WORKER_ENV_LITERAL_SECRETS=1``)
    restores the old copy-everything behaviour.
    """
    if include_secrets is None:
        include_secrets = worker_env_literal_secrets_enabled()
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
        if not any(key.startswith(prefix) for prefix in prefixes):
            continue
        if not include_secrets and is_secret_like_env(key, value):
            continue
        out.append({"name": key, "value": value})
    return out


def withheld_worker_secret_names() -> list[str]:
    """Names (never values) of process env vars kept out of Job spec literals."""
    all_names = {e["name"] for e in worker_env_from_process(include_secrets=True)}
    kept = {e["name"] for e in worker_env_from_process(include_secrets=False)}
    return sorted(all_names - kept)
