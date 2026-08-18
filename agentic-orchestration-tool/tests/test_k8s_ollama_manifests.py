"""Ollama k8s deployment defaults and jetson-enable-ollama.sh rendering."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest
import yaml

_TOOL_ROOT = Path(__file__).resolve().parents[1]
_OLLAMA_DIR = _TOOL_ROOT / "deploy" / "k8s" / "ollama"
_SCRIPT = _TOOL_ROOT / "scripts" / "jetson-enable-ollama.sh"


def _load_yaml(name: str) -> dict:
    with (_OLLAMA_DIR / name).open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.mark.unit
def test_ollama_deployment_caps_context_length() -> None:
    """Daemon must set OLLAMA_CONTEXT_LENGTH so 128k models cannot OOM the host."""
    doc = _load_yaml("deployment.yaml")
    containers = doc["spec"]["template"]["spec"]["containers"]
    ollama = next(c for c in containers if c["name"] == "ollama")
    env = {e["name"]: e.get("value") for e in ollama["env"]}
    assert env["OLLAMA_HOST"] == "0.0.0.0:11435"
    assert env["OLLAMA_KEEP_ALIVE"] == "120"
    assert env["OLLAMA_CONTEXT_LENGTH"] == "16384"


@pytest.mark.unit
def test_ollama_deployment_has_resource_broker_sidecar() -> None:
    doc = _load_yaml("deployment.yaml")
    containers = doc["spec"]["template"]["spec"]["containers"]
    names = [c["name"] for c in containers]
    assert names == ["ollama", "resource-broker"]
    broker = next(c for c in containers if c["name"] == "resource-broker")
    env = {e["name"]: e.get("value") for e in broker["env"]}
    assert env["AGENTIC_OLLAMA_RESOURCE_SHARING"] == "1"
    assert env["AGENTIC_OLLAMA_UPSTREAM"] == "http://127.0.0.1:11435"
    assert env["AGENTIC_OLLAMA_BROKER_PORT"] == "11434"
    assert broker["ports"][0]["containerPort"] == 11434
    svc = _load_yaml("service.yaml")
    assert svc["spec"]["ports"][0]["port"] == 11434
    assert svc["spec"]["ports"][0]["targetPort"] == 11434


@pytest.mark.unit
def test_probe_target_matches_daemon_bind_address() -> None:
    """kubelet probes from the node: a `host` override only works on hostNetwork.

    In this pod (no hostNetwork) the daemon must bind the pod interface and the
    probe must omit `host`, or liveness kills the daemon every few minutes.
    """
    doc = _load_yaml("deployment.yaml")
    spec = doc["spec"]["template"]["spec"]
    assert not spec.get("hostNetwork")
    ollama = next(c for c in spec["containers"] if c["name"] == "ollama")
    env = {e["name"]: e.get("value") for e in ollama["env"]}
    assert env["OLLAMA_HOST"].startswith("0.0.0.0")
    for probe in ("readinessProbe", "livenessProbe"):
        assert "host" not in ollama[probe]["httpGet"], probe


@pytest.mark.unit
def test_broker_runs_current_orchestration_source() -> None:
    """The pinned coordinator image predates the broker modules."""
    doc = _load_yaml("deployment.yaml")
    containers = doc["spec"]["template"]["spec"]["containers"]
    broker = next(c for c in containers if c["name"] == "resource-broker")
    mounts = {m["mountPath"]: m for m in broker["volumeMounts"]}
    assert mounts["/app/tool/orchestration"]["name"] == "orchestration-src"
    assert broker["workingDir"] == "/app/tool"
    volumes = {v["name"]: v for v in doc["spec"]["template"]["spec"]["volumes"]}
    assert volumes["orchestration-src"]["hostPath"]["path"].endswith(
        "agentic-orchestration-tool/orchestration"
    )
    assert "orchestration.ollama_resource_broker" in _shell_script(broker)


def _shell_script(container: dict) -> str:
    """The startup script, wherever the container shape keeps it."""
    return "".join([*container.get("command", []), *container.get("args", [])])


def _startup_text(container: dict) -> str:
    """Everything that decides how the process starts, script plus environment."""
    return _shell_script(container) + yaml.safe_dump(container.get("env", []))


def _working_bash() -> str | None:
    """A bash that can actually run (Windows PATH often has a stub WSL bash)."""
    candidates = [
        shutil.which("bash"),
        r"C:\Program Files\Git\bin\bash.exe",
        "/bin/bash",
    ]
    for candidate in candidates:
        if not candidate or not Path(candidate).exists():
            continue
        try:
            probe = subprocess.run(
                [candidate, "-c", "echo ok"],
                capture_output=True,
                text=True,
                timeout=30,
            )
        except OSError:
            continue
        if probe.returncode == 0 and "ok" in probe.stdout:
            return candidate
    return None


def _posix(path: Path) -> str:
    """Git Bash cannot open D:\\dir paths; hand it /d/dir instead."""
    if os.name != "nt":
        return str(path)
    resolved = path.resolve()
    drive = resolved.drive.rstrip(":").lower()
    rest = str(resolved)[len(resolved.drive) :].replace("\\", "/")
    return f"/{drive}{rest}"


def _render(env: dict[str, str], *, arch_aarch64: bool) -> dict:
    """Render the manifest jetson-enable-ollama.sh would apply, without applying."""
    if os.name == "nt":
        # Git Bash hands POSIX paths to a Windows python3, which cannot open
        # them; run these on Linux (CI) or use AGENTIC_OLLAMA_DRY_RUN on a node.
        pytest.skip("script rendering needs a POSIX shell + python3")
    bash = _working_bash()
    if not bash:
        pytest.skip("no working bash available")
    work = Path(tempfile.mkdtemp())
    captured = work / "manifest.yaml"
    stub = work / "bin"
    stub.mkdir()
    # Stub kubectl: record `apply -f` input, answer the coordinator image lookup,
    # and no-op everything else so nothing touches a real cluster.
    (stub / "kubectl").write_text(
        "#!/usr/bin/env bash\n"
        'if [[ "$*" == *"get deploy agentic-coordinator"* ]]; then\n'
        '  echo "ghcr.io/example/agentic-orchestrator-coordinator:v9.9.9"\n'
        "  exit 0\n"
        "fi\n"
        'if [[ "$1" == "apply" && "$2" == "-f" ]]; then\n'
        f'  if [[ "$3" != *"/service"* ]]; then cp "$3" "{_posix(captured)}"; fi\n'
        "  exit 0\n"
        "fi\n"
        "exit 0\n",
        encoding="utf-8",
        newline="\n",
    )
    (stub / "kubectl").chmod(0o755)
    machine = "aarch64" if arch_aarch64 else "x86_64"
    (stub / "uname").write_text(
        "#!/usr/bin/env bash\n"
        f'if [[ "$1" == "-m" ]]; then echo {machine}; else exec /usr/bin/uname "$@"; fi\n',
        encoding="utf-8",
        newline="\n",
    )
    (stub / "uname").chmod(0o755)
    child_env = dict(os.environ)
    child_env["PATH"] = os.pathsep.join([str(stub), child_env["PATH"]])
    child_env["KUBECONFIG"] = str(work / "kubeconfig")
    child_env.update(env)
    proc = subprocess.run(
        [bash, _posix(_SCRIPT), _posix(_TOOL_ROOT.parent)],
        capture_output=True,
        text=True,
        env=child_env,
        timeout=180,
    )
    assert captured.exists(), (
        "script never applied a manifest "
        f"(rc={proc.returncode})\nstdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
    )
    return yaml.safe_load(captured.read_text(encoding="utf-8"))


@pytest.mark.unit
def test_render_resolves_broker_image_from_cluster_coordinator() -> None:
    """A dev-only :local tag is unpullable on edge nodes; reuse the live image."""
    doc = _render({}, arch_aarch64=True)
    containers = doc["spec"]["template"]["spec"]["containers"]
    broker = next(c for c in containers if c["name"] == "resource-broker")
    assert broker["image"] == "ghcr.io/example/agentic-orchestrator-coordinator:v9.9.9"
    assert ":local" not in yaml.safe_dump(doc)


@pytest.mark.unit
def test_render_broker_image_env_override_wins() -> None:
    doc = _render(
        {"AGENTIC_OLLAMA_BROKER_IMAGE": "example/broker:custom"}, arch_aarch64=True
    )
    broker = next(
        c
        for c in doc["spec"]["template"]["spec"]["containers"]
        if c["name"] == "resource-broker"
    )
    assert broker["image"] == "example/broker:custom"


@pytest.mark.unit
def test_render_host_network_daemon_probes_loopback() -> None:
    """Jetson shares the node netns, so loopback bind + loopback probe agree."""
    doc = _render({}, arch_aarch64=True)
    spec = doc["spec"]["template"]["spec"]
    assert spec["hostNetwork"] is True
    ollama = next(c for c in spec["containers"] if c["name"] == "ollama")
    assert "OLLAMA_HOST=127.0.0.1:11435" in _startup_text(ollama)
    for probe in ("readinessProbe", "livenessProbe"):
        assert ollama[probe]["httpGet"]["host"] == "127.0.0.1", probe


@pytest.mark.unit
@pytest.mark.parametrize("arch_aarch64", [True, False])
def test_render_without_sharing_serves_daemon_on_public_port(arch_aarch64: bool) -> None:
    """Escape hatch: no broker, and :11434 still answers so the Service resolves."""
    doc = _render({"AGENTIC_OLLAMA_RESOURCE_SHARING": "0"}, arch_aarch64=arch_aarch64)
    spec = doc["spec"]["template"]["spec"]
    names = [c["name"] for c in spec["containers"]]
    assert names == ["ollama"]
    ollama = spec["containers"][0]
    assert ollama["ports"][0]["containerPort"] == 11434
    # host-binary mode carries the startup script in command, image mode in env.
    listen = _startup_text(ollama)
    assert "11434" in listen
    assert "11435" not in listen


@pytest.mark.unit
def test_render_mounts_every_volume_it_references() -> None:
    """Rewriting the volumes list used to drop NVIDIA / source volumes."""
    for env in ({}, {"AGENTIC_OLLAMA_RESOURCE_SHARING": "0"}):
        for arch in (True, False):
            doc = _render(dict(env), arch_aarch64=arch)
            spec = doc["spec"]["template"]["spec"]
            declared = {v["name"] for v in spec.get("volumes", [])}
            for container in spec["containers"]:
                for mount in container.get("volumeMounts", []):
                    assert mount["name"] in declared, (
                        f"{container['name']} mounts undeclared volume {mount['name']} "
                        f"(arch_aarch64={arch}, env={env})"
                    )


@pytest.mark.unit
def test_render_broker_bootstraps_fastapi() -> None:
    """The coordinator image ships without fastapi, which the broker imports."""
    for arch in (True, False):
        doc = _render({}, arch_aarch64=arch)
        broker = next(
            c
            for c in doc["spec"]["template"]["spec"]["containers"]
            if c["name"] == "resource-broker"
        )
        script = _shell_script(broker)
        assert re.search(r"import fastapi", script)
        assert "pip install" in script
        assert script.rstrip().endswith("exec python -m orchestration.ollama_resource_broker")
