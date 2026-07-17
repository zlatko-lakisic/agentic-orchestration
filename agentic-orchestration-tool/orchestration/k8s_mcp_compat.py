"""K8s MCP compatibility policy (K0.6 / K4 — see wiki Kubernetes-execution-upgrade)."""

from __future__ import annotations

import copy
import json
import os
import sys
from typing import Any

from orchestration.backends.factory import execution_backend_name_from_env

# Streamable HTTP — worker pod calls remote URL; no local subprocess (K3 MVP allowlist).
K8S_NATIVE_MCP_IDS: frozenset[str] = frozenset(
    {
        "search_brave",
        "search_tavily",
        "home_assistant",
    }
)

# Stdio — require sidecar or cluster HTTP gateway before use in K8s (Phase K4).
K8S_STDIO_MCP_IDS: frozenset[str] = frozenset(
    {
        "search_exa",
        "fetch_url",
        "filesystem_local",
        "memory_knowledge_graph",
        "media_understand",
        "media_audio_transcribe",
        "media_video_analyze",
    }
)

# Stdio MCPs with shipped K4 sidecar / gateway manifests (see deploy/k8s/mcp-sidecars/).
K8S_SIDECAR_MCP_IDS: frozenset[str] = frozenset(
    {
        "fetch_url",
        "filesystem_local",
    }
)

# Stdio MCPs run inside the worker container (mcp-server-fetch / npx filesystem in worker image).
K8S_WORKER_STDIO_MCP_IDS_DEFAULT = frozenset({"fetch_url"})

# Subdirectory on the run-store PVC used as the filesystem MCP sandbox in K8s.
K8S_MCP_FILESYSTEM_WORKSPACE_SUBDIR = "mcp-fs-workspace"
K8S_MCP_FILESYSTEM_DIR_ENV = "AGENTIC_K8S_MCP_FILESYSTEM_DIR"

SHIPPED_MCP_IDS: frozenset[str] = K8S_NATIVE_MCP_IDS | K8S_STDIO_MCP_IDS

# Env var holding HTTP gateway base URL for a stdio MCP (runtime policy — no YAML schema change).
K8S_MCP_GATEWAY_ENV: dict[str, str] = {
    "fetch_url": "AGENTIC_K8S_MCP_FETCH_URL",
    "filesystem_local": "AGENTIC_K8S_MCP_FILESYSTEM_URL",
    "search_exa": "AGENTIC_K8S_MCP_EXA_URL",
    "memory_knowledge_graph": "AGENTIC_K8S_MCP_MEMORY_URL",
}

# In-pod supergateway sidecar (localhost) when cluster gateway URL is unset.
K8S_POD_SIDECAR_LOCAL_URL: dict[str, str] = {
    "fetch_url": "http://127.0.0.1:8080/mcp",
    "filesystem_local": "http://127.0.0.1:8081/mcp",
}

SUPERGATEWAY_IMAGE = os.getenv(
    "AGENTIC_K8S_SUPERGATEWAY_IMAGE",
    "supercorp/supergateway:uvx",
).strip()


def is_kubernetes_execution_backend() -> bool:
    return execution_backend_name_from_env() == "kubernetes"


def k8s_allow_stdio_mcps_from_env() -> bool:
    raw = os.getenv("AGENTIC_K8S_ALLOW_STDIO_MCPS", "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def k8s_pod_sidecar_mcp_ids_from_env() -> frozenset[str]:
    raw = os.getenv("AGENTIC_K8S_POD_SIDECAR_MCPS", "").strip()
    if not raw:
        return frozenset()
    ids = {part.strip() for part in raw.split(",") if part.strip()}
    return frozenset(ids & K8S_SIDECAR_MCP_IDS)


def k8s_extra_http_mcp_ids_from_env() -> frozenset[str]:
    """Non-shipped streamable-HTTP MCP ids allowed in kubernetes mode (extras catalog)."""
    raw = os.getenv("AGENTIC_K8S_EXTRA_HTTP_MCPS", "").strip()
    if not raw:
        return frozenset()
    return frozenset(part.strip() for part in raw.split(",") if part.strip())


def k8s_worker_stdio_mcp_ids_from_env() -> frozenset[str]:
    """MCP ids allowed as stdio subprocesses inside the worker container (not sidecar)."""
    raw = os.getenv("AGENTIC_K8S_WORKER_STDIO_MCPS", "fetch_url").strip()
    if raw.lower() in ("", "0", "false", "none", "off"):
        return frozenset()
    ids = {part.strip() for part in raw.split(",") if part.strip()}
    # Shipped allowlist, plus OpenClaw-synced fragments (openclaw_*) when listed explicitly.
    allowed = {i for i in ids if i in K8S_STDIO_MCP_IDS or i.startswith("openclaw_")}
    return frozenset(allowed)


def k8s_supergateway_stateful_from_env() -> bool:
    raw = os.getenv("AGENTIC_K8S_SUPERGATEWAY_STATEFUL", "0").strip().lower()
    return raw in ("1", "true", "yes", "on")


def k8s_filesystem_allowed_directory(run_store_mount: str = "/run/store") -> str:
    """Absolute path inside the worker pod for ``filesystem_local`` MCP roots."""
    explicit = os.getenv(K8S_MCP_FILESYSTEM_DIR_ENV, "").strip()
    if explicit:
        return explicit.rstrip("/")
    fs_env = os.getenv("FILESYSTEM_MCP_ALLOWED_DIRECTORY", "").strip()
    if fs_env:
        return fs_env.rstrip("/")
    mount = run_store_mount.strip().rstrip("/") or "/run/store"
    return f"{mount}/{K8S_MCP_FILESYSTEM_WORKSPACE_SUBDIR}"


def is_k8s_native_mcp(mcp_id: str) -> bool:
    return mcp_id in K8S_NATIVE_MCP_IDS


def is_k8s_stdio_mcp(mcp_id: str) -> bool:
    return mcp_id in K8S_STDIO_MCP_IDS


def gateway_url_for_k8s_mcp(mcp_id: str) -> str | None:
    env_name = K8S_MCP_GATEWAY_ENV.get(mcp_id)
    if not env_name:
        return None
    url = os.getenv(env_name, "").strip().rstrip("/")
    return url or None


def mcp_has_k8s_gateway(mcp_id: str) -> bool:
    return gateway_url_for_k8s_mcp(mcp_id) is not None


def filter_mcp_ids_for_kubernetes(
    mcp_ids: list[str],
    *,
    allow_stdio: bool | None = None,
) -> tuple[list[str], list[str]]:
    """Return ``(allowed, excluded)`` for ``AGENTIC_EXECUTION_BACKEND=kubernetes``."""
    if allow_stdio is None:
        allow_stdio = k8s_allow_stdio_mcps_from_env()
    sidecar_ids = k8s_pod_sidecar_mcp_ids_from_env()
    worker_stdio_ids = k8s_worker_stdio_mcp_ids_from_env()
    extra_http_ids = k8s_extra_http_mcp_ids_from_env()
    allowed: list[str] = []
    excluded: list[str] = []
    for mcp_id in mcp_ids:
        if is_k8s_native_mcp(mcp_id):
            allowed.append(mcp_id)
        elif mcp_id in extra_http_ids:
            allowed.append(mcp_id)
        elif mcp_has_k8s_gateway(mcp_id):
            allowed.append(mcp_id)
        elif mcp_id in worker_stdio_ids:
            allowed.append(mcp_id)
        elif mcp_id in sidecar_ids and is_k8s_stdio_mcp(mcp_id):
            allowed.append(mcp_id)
        elif allow_stdio and is_k8s_stdio_mcp(mcp_id):
            allowed.append(mcp_id)
        else:
            excluded.append(mcp_id)
    return allowed, excluded


def adapt_mcp_catalog_entry_for_kubernetes(entry: dict[str, Any]) -> dict[str, Any]:
    """Rewrite stdio catalog entry to streamable HTTP when a K8s gateway URL is configured."""
    mcp_id = str(entry.get("id", "")).strip()
    url = gateway_url_for_k8s_mcp(mcp_id)
    if not url:
        return entry

    adapted = copy.deepcopy(entry)
    adapted.pop("stdio", None)
    adapted["streamable_http"] = {
        "url": url,
        "headers": {"Accept": "application/json, text/event-stream"},
    }
    return adapted


def apply_kubernetes_mcp_catalog_policy(
    entries: list[dict[str, Any]],
    *,
    verbose: bool = False,
    log_prefix: str = "k8s mcp catalog",
) -> tuple[list[dict[str, Any]], list[str]]:
    """Filter and adapt MCP catalog entries when execution backend is kubernetes (K4.3)."""
    if not is_kubernetes_execution_backend():
        return entries, []

    ids = [str(e.get("id", "")).strip() for e in entries if str(e.get("id", "")).strip()]
    allowed_ids, excluded_ids = filter_mcp_ids_for_kubernetes(ids)
    allowed_set = set(allowed_ids)

    if verbose and excluded_ids:
        print(
            f"({log_prefix}) excluding MCP ids in kubernetes mode: {', '.join(excluded_ids)}",
            file=sys.stderr,
        )

    kept: list[dict[str, Any]] = []
    for entry in entries:
        mcp_id = str(entry.get("id", "")).strip()
        if mcp_id not in allowed_set:
            continue
        kept.append(adapt_mcp_catalog_entry_for_kubernetes(entry))
    return kept, excluded_ids


def mcp_ids_from_step_spec_dict(spec: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for item in spec.get("mcp_providers") or []:
        if not isinstance(item, dict):
            continue
        mid = str(item.get("id") or "").strip()
        if mid:
            out.append(mid)
    return out


def pod_sidecar_mcp_ids_for_step(mcp_ids: list[str]) -> list[str]:
    """MCP ids that should get an in-pod supergateway sidecar for this Job."""
    configured = k8s_pod_sidecar_mcp_ids_from_env()
    if not configured:
        return []
    worker_stdio = k8s_worker_stdio_mcp_ids_from_env()
    out: list[str] = []
    for mcp_id in mcp_ids:
        if mcp_id not in configured:
            continue
        if mcp_id in worker_stdio:
            continue
        if mcp_has_k8s_gateway(mcp_id):
            continue
        if mcp_id in K8S_POD_SIDECAR_LOCAL_URL:
            out.append(mcp_id)
    return out


def rewrite_spec_mcps_for_pod_sidecars(
    spec: dict[str, Any],
    sidecar_mcp_ids: list[str],
) -> dict[str, Any]:
    """Point step spec MCP resolves at localhost supergateway URLs."""
    if not sidecar_mcp_ids:
        return spec

    out = copy.deepcopy(spec)
    side_set = set(sidecar_mcp_ids)
    mcps = out.get("mcp_providers") or []
    new_mcps: list[dict[str, Any]] = []
    for item in mcps:
        if not isinstance(item, dict):
            new_mcps.append(item)
            continue
        mid = str(item.get("id") or "").strip()
        if mid not in side_set:
            new_mcps.append(item)
            continue
        local_url = K8S_POD_SIDECAR_LOCAL_URL.get(mid)
        if not local_url:
            new_mcps.append(item)
            continue
        entry = copy.deepcopy(item)
        entry["resolved"] = {
            "url": local_url,
            "transport": "streamable-http",
            "headers": {"Accept": "application/json, text/event-stream"},
        }
        new_mcps.append(entry)
    out["mcp_providers"] = new_mcps
    return out


def _fetch_sidecar_stdio_command() -> list[str]:
    return ["uvx", "mcp-server-fetch"]


def _filesystem_sidecar_stdio_command() -> list[str]:
    # Sidecar mounts the PVC subdir at /workspace (see sidecar_containers_for_mcps).
    directory = "/workspace"
    return ["npx", "-y", "@modelcontextprotocol/server-filesystem", directory]


def sidecar_containers_for_mcps(mcp_ids: list[str]) -> list[dict[str, Any]]:
    """Build supergateway sidecar containers for stdio MCPs (K4.1 in-pod pattern)."""
    containers: list[dict[str, Any]] = []
    for mcp_id in mcp_ids:
        local_url = K8S_POD_SIDECAR_LOCAL_URL.get(mcp_id)
        if not local_url:
            continue
        port = local_url.split(":")[2].split("/")[0]
        if mcp_id == "fetch_url":
            stdio_cmd = _fetch_sidecar_stdio_command()
            name = "mcp-fetch-gateway"
        elif mcp_id == "filesystem_local":
            stdio_cmd = _filesystem_sidecar_stdio_command()
            name = "mcp-filesystem-gateway"
        else:
            continue

        stdio_joined = " ".join(stdio_cmd)
        args = [
            "--stdio",
            stdio_joined,
            "--port",
            port,
            "--outputTransport",
            "streamableHttp",
            "--protocolVersion",
            "2024-11-05",
        ]
        if k8s_supergateway_stateful_from_env():
            args.append("--stateful")
        container: dict[str, Any] = {
            "name": name,
            "image": SUPERGATEWAY_IMAGE,
            "args": args,
        }
        if mcp_id == "filesystem_local":
            container["volumeMounts"] = [
                {
                    "name": "run-store",
                    "mountPath": "/workspace",
                    "subPath": K8S_MCP_FILESYSTEM_WORKSPACE_SUBDIR,
                }
            ]
        containers.append(container)
    return containers


def parse_json_object_env(name: str) -> dict[str, Any] | None:
    raw = os.getenv(name, "").strip()
    if not raw:
        return None
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError(f"{name} must be a JSON object")
    return data
