"""Jetson hotfix delivery: shipped files must land in the pod, with their imports.

The coordinator runs a pinned image and receives changed files through the
``jetson-hotfix-web.sh`` ConfigMaps plus per-file volume mounts. A file added to
the script but not mounted never reaches the pod, and a hotfixed module whose
import is left behind takes the web server down at startup — both silent until a
deploy.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

_TOOL_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _TOOL_ROOT.parent
_WEB_ROOT = _REPO_ROOT / "agentic-orchestration-web"
_SCRIPT = _TOOL_ROOT / "scripts" / "jetson-hotfix-web.sh"
_K8S = _TOOL_ROOT / "deploy" / "k8s"

_FROM_FILE_RE = re.compile(r'--from-file=([^=\s]+)="([^"]+)"')
_CONFIGMAP_RE = re.compile(r"^apply_configmap\s+(\S+)", re.MULTILINE)
# Static and dynamic relative specifiers: from "./x.mjs" / import("../y.mjs").
_IMPORT_RE = re.compile(r'(?:from|import)\s*\(?\s*"(\.[^"]+)"')


def _script_text() -> str:
    return _SCRIPT.read_text(encoding="utf-8")


def _configmap_entries() -> dict[str, dict[str, Path]]:
    """{configmap name: {key: source path}} as jetson-hotfix-web.sh would create."""
    text = _script_text()
    roots = {
        "${WEB_ROOT}": _WEB_ROOT,
        "${TOOL_ROOT}": _TOOL_ROOT,
        "${TOOL_PY_ROOT}": _TOOL_ROOT,
        "${ORCH_ROOT}": _TOOL_ROOT / "orchestration",
        "${PROV_ROOT}": _TOOL_ROOT / "agent_providers",
    }
    out: dict[str, dict[str, Path]] = {}
    current: str | None = None
    for line in text.splitlines():
        match = _CONFIGMAP_RE.match(line.strip())
        if match:
            current = match.group(1)
            out.setdefault(current, {})
        if current is None:
            continue
        for key, raw in _FROM_FILE_RE.findall(line):
            for token, base in roots.items():
                if raw.startswith(token):
                    out[current][key] = base / raw[len(token) :].lstrip("/")
                    break
    return out


def _mounts(patch: Path) -> list[dict]:
    doc = yaml.safe_load(patch.read_text(encoding="utf-8"))
    mounts: list[dict] = []
    for container in doc["spec"]["template"]["spec"]["containers"]:
        mounts.extend(container.get("volumeMounts", []))
    return mounts


def _subpaths_for(patch: Path, volume: str) -> set[str]:
    return {
        m["subPath"] for m in _mounts(patch) if m["name"] == volume and "subPath" in m
    }


@pytest.mark.unit
def test_every_configmap_source_file_exists() -> None:
    for name, keys in _configmap_entries().items():
        for key, path in keys.items():
            assert path.is_file(), f"{name} ships {key} from missing {path}"


@pytest.mark.unit
@pytest.mark.parametrize(
    ("configmap", "volume"),
    [
        ("agentic-web-hotfix-root", "web-hotfix-root"),
        ("agentic-web-hotfix-public", "web-hotfix-public"),
    ],
)
def test_web_hotfix_keys_and_mounts_agree(configmap: str, volume: str) -> None:
    """An unmounted key never reaches the pod; an unshipped mount hides the file."""
    patch = _K8S / "coordinator" / "web-hotfix-volume-patch.yaml"
    keys = set(_configmap_entries()[configmap])
    mounted = _subpaths_for(patch, volume)
    assert keys - mounted == set(), f"{configmap} ships unmounted files"
    assert mounted - keys == set(), f"{volume} mounts keys {configmap} never ships"


@pytest.mark.unit
def test_hotfixed_modules_ship_their_relative_imports() -> None:
    """admin-api.mjs importing an unshipped module breaks the web server on boot."""
    shipped = _configmap_entries()["agentic-web-hotfix-root"]
    names = set(shipped)
    for key, path in sorted(shipped.items()):
        if not key.endswith(".mjs"):
            continue
        text = path.read_text(encoding="utf-8")
        for specifier in sorted(set(_IMPORT_RE.findall(text))):
            target = specifier.split("/")[-1]
            if not target.endswith(".mjs"):
                continue
            assert target in names, (
                f"{key} imports {specifier}, which the hotfix does not ship; "
                "add it to jetson-hotfix-web.sh and web-hotfix-volume-patch.yaml"
            )


@pytest.mark.unit
def test_orchestration_hotfix_keys_and_mounts_agree() -> None:
    patch = _K8S / "coordinator" / "tool-hotfix-volume-patch.yaml"
    keys = set(_configmap_entries()["agentic-tool-hotfix-orchestration"])
    mounted = _subpaths_for(patch, "tool-hotfix-orchestration")
    assert keys - mounted == set(), "orchestration ConfigMap ships unmounted files"
    assert mounted - keys == set(), "coordinator mounts orchestration keys never shipped"


@pytest.mark.unit
@pytest.mark.parametrize(
    "patch_name",
    [
        "coordinator/jetson-runtime-bootstrap-hostpath-patch.yaml",
        "warm-pool-jetson-runtime-bootstrap-hostpath-patch.yaml",
    ],
)
def test_hostpath_patches_reference_real_modules(patch_name: str) -> None:
    """These bypass the 1 MiB ConfigMap limit, so a typo fails the pod's mount."""
    patch = _K8S / patch_name
    subpaths = _subpaths_for(patch, "jetson-orch-hostpath")
    assert subpaths, f"{patch_name} mounts nothing"
    for subpath in sorted(subpaths):
        assert (_TOOL_ROOT / "orchestration" / subpath).is_file(), (
            f"{patch_name} mounts orchestration/{subpath}, which does not exist"
        )


@pytest.mark.unit
def test_broker_dependencies_reach_the_coordinator() -> None:
    """ollama_provider and serve.app import these unguarded at call time."""
    patch = _K8S / "coordinator" / "jetson-runtime-bootstrap-hostpath-patch.yaml"
    delivered = _subpaths_for(patch, "jetson-orch-hostpath") | set(
        _configmap_entries()["agentic-tool-hotfix-orchestration"]
    )
    for module in ("ollama_resource_manager.py", "reach_multimodal.py"):
        assert module in delivered, f"coordinator never receives {module}"
