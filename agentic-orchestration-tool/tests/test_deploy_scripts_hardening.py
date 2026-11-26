"""Deploy scripts, systemd units and manifests: regression checks that need no cluster.

Scripts are run against a stub ``kubectl`` (and ``curl``) that records what would
have been applied; nothing here talks to a real cluster or changes the host.
"""

from __future__ import annotations

import base64
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

_TOOL_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _TOOL_ROOT.parent
_SCRIPTS = _TOOL_ROOT / "scripts"
_K8S = _TOOL_ROOT / "deploy" / "k8s"
_SYSTEMD = _TOOL_ROOT / "deploy" / "systemd"

pytestmark = pytest.mark.unit


def _bash() -> str:
    if os.name == "nt":
        pytest.skip("deploy scripts need a POSIX shell")
    bash = shutil.which("bash")
    if not bash:
        pytest.skip("bash not available")
    return bash


def _write_exe(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")
    path.chmod(0o755)


def _stub_bin(tmp_path: Path, kubectl_body: str, *, curl_body: str | None = None) -> Path:
    stub = tmp_path / "bin"
    stub.mkdir()
    _write_exe(stub / "kubectl", "#!/usr/bin/env bash\n" + kubectl_body)
    if curl_body is not None:
        _write_exe(stub / "curl", "#!/usr/bin/env bash\n" + curl_body)
    return stub


def _run(
    script: Path,
    *args: str,
    env: dict[str, str],
    stub: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    child = {k: v for k, v in os.environ.items() if not k.startswith("AGENTIC_")}
    if stub is not None:
        child["PATH"] = os.pathsep.join([str(stub), child["PATH"]])
    child.update(env)
    return subprocess.run(
        [_bash(), str(script), *args],
        capture_output=True,
        text=True,
        env=child,
        timeout=120,
    )


def _env_lines(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        key, _, value = line.partition("=")
        assert key not in out, f"duplicate key {key} in generated Secret"
        out[key] = value
    return out


# --------------------------------------------------------------------------- static checks


def test_every_shell_script_parses() -> None:
    bash = _bash()
    for script in sorted(_SCRIPTS.glob("*.sh")):
        proc = subprocess.run([bash, "-n", str(script)], capture_output=True, text=True)
        assert proc.returncode == 0, f"{script.name}: {proc.stderr}"


def test_every_manifest_is_valid_yaml() -> None:
    for path in sorted(_K8S.rglob("*.yaml")):
        docs = list(yaml.safe_load_all(path.read_text(encoding="utf-8")))
        assert any(doc for doc in docs), f"{path} is empty"


def test_scripts_do_not_grant_world_access_or_run_unpinned_k3s() -> None:
    offenders: list[str] = []
    for script in sorted(_SCRIPTS.glob("*.sh")):
        for number, line in enumerate(script.read_text(encoding="utf-8").splitlines(), 1):
            code = line.split("#", 1)[0]
            if re.search(r"chmod\s+(-R\s+)?1?777\b", code):
                offenders.append(f"{script.name}:{number}: world-writable chmod")
            if "--write-kubeconfig-mode 644" in code:
                offenders.append(f"{script.name}:{number}: world-readable kubeconfig")
    assert offenders == []
    k3s = (_SCRIPTS / "jetson-k3s-deploy.sh").read_text(encoding="utf-8")
    assert "INSTALL_K3S_VERSION" in k3s
    assert "AGENTIC_K3S_ALLOW_UNPINNED" in k3s


def test_deploy_scripts_use_pipefail() -> None:
    lenient = {"jetson-pull-ollama-models.sh"}  # keeps going after a failed pull by design
    sourced = {"lib-env-file.sh", "lib-openclaw.sh", "lib-root-install.sh"}
    for script in sorted(_SCRIPTS.glob("*.sh")):
        if script.name in lenient | sourced:
            continue
        first = next(
            (ln for ln in script.read_text(encoding="utf-8").splitlines() if ln.startswith("set -")),
            "",
        )
        assert first == "set -euo pipefail", f"{script.name}: {first!r}"


def test_vision_smoke_script_has_no_built_in_endpoint_or_key(tmp_path: Path) -> None:
    script = _SCRIPTS / "smoke_gate_vision_chat.sh"
    text = script.read_text(encoding="utf-8")
    # No literal default after ":-" for the URL or the key.
    assert not re.search(r'^(URL|KEY)="\$\{\d:-[^$}][^}]*\}', text, flags=re.MULTILINE)
    assert "https://" not in "\n".join(
        ln for ln in text.splitlines() if not ln.lstrip().startswith("#")
    )
    image = tmp_path / "x.jpg"
    image.write_bytes(b"\xff\xd8\xff")
    no_args = _run(script, env={})
    assert no_args.returncode == 2
    no_url = _run(script, str(image), env={"AGENTIC_CHAT_COMPLETIONS_API_KEY": "k"})
    assert no_url.returncode == 2 and "no endpoint URL" in no_url.stderr
    no_key = _run(script, "http://127.0.0.1:1/v1/chat/completions", str(image), env={})
    assert no_key.returncode == 2 and "no API key" in no_key.stderr


def test_one_off_temp_script_is_gone() -> None:
    assert not list(_SCRIPTS.glob("_tmp_*"))


def test_no_personal_home_directory_in_deploy_files() -> None:
    home_path = re.compile(r"/home/[a-z][\w.-]*")
    allowed = re.compile(r"/home/<[^>]+>")  # documented placeholders
    offenders: list[str] = []
    files = [
        *_K8S.rglob("*.yaml"),
        *_SCRIPTS.glob("*.sh"),
        _TOOL_ROOT / "config" / "env.jetson",
    ]
    for path in files:
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if home_path.search(allowed.sub("", line)):
                offenders.append(f"{path.relative_to(_TOOL_ROOT)}:{number}")
    assert offenders == []


def test_root_systemd_units_do_not_execute_from_the_git_checkout() -> None:
    """A root unit running a script from the deploy user's checkout is host root for that user."""
    checkout_script = "/var/projects/agentic-orchestration/agentic-orchestration-tool/scripts/"
    for unit in sorted(_SYSTEMD.glob("*.service")):
        text = unit.read_text(encoding="utf-8")
        exec_lines = [ln for ln in text.splitlines() if ln.startswith("ExecStart=")]
        assert exec_lines, unit.name
        is_user_unit = ".user." in unit.name or "%h" in text
        for line in exec_lines:
            if is_user_unit:
                continue
            assert checkout_script not in line, f"{unit.name} runs a checkout script as root"
            assert "/usr/local/libexec/agentic-orchestration/" in line, unit.name


def test_installers_copy_root_run_scripts_to_libexec() -> None:
    expectations = {
        "jetson-install-host-control.sh": "agentic-host-control-run.sh",
        "jetson-install-jtop-metrics.sh": "jetson-jtop-metrics-writer.py",
        "install-nvidia-host-metrics.sh": "nvidia-host-metrics-writer.py",
        "install-amd-host-metrics.sh": "amd-host-metrics-writer.py",
    }
    for installer, target in expectations.items():
        text = (_SCRIPTS / installer).read_text(encoding="utf-8")
        assert f"install_root_owned_script {target}" in text, installer


@pytest.mark.skipif(
    os.name == "nt" or not hasattr(os, "geteuid") or os.geteuid() != 0,
    reason="installs root-owned files; only meaningful as root",
)
def test_root_install_helper_installs_committed_copy(tmp_path: Path) -> None:
    name = "agentic-host-control-run.sh"
    head = subprocess.run(
        ["git", "-C", str(_REPO_ROOT), "show", f"HEAD:agentic-orchestration-tool/scripts/{name}"],
        capture_output=True,
    )
    if head.returncode != 0:
        pytest.skip("not a git checkout")
    libexec = tmp_path / "libexec"
    proc = subprocess.run(
        [
            _bash(),
            "-c",
            'set -euo pipefail; source "$1/lib-root-install.sh"; install_root_owned_script "$2"',
            "_",
            str(_SCRIPTS),
            name,
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "PROJECT_ROOT": str(_REPO_ROOT), "AGENTIC_LIBEXEC_DIR": str(libexec)},
    )
    assert proc.returncode == 0, proc.stderr
    installed = libexec / name
    assert installed.read_bytes() == head.stdout
    stat = installed.stat()
    assert stat.st_uid == 0 and (stat.st_mode & 0o777) == 0o755


def test_code_hostpath_mounts_are_read_only() -> None:
    for name, expected in (
        ("coordinator/jetson-runtime-bootstrap-hostpath-patch.yaml", None),
        ("warm-pool-jetson-runtime-bootstrap-hostpath-patch.yaml", "/app/orchestration"),
        ("coordinator/jetson-admin-hostpath-patch.yaml", "/app/web/public/admin"),
    ):
        doc = yaml.safe_load((_K8S / name).read_text(encoding="utf-8"))
        mounts = doc["spec"]["template"]["spec"]["containers"][0]["volumeMounts"]
        assert mounts, name
        assert all(m.get("readOnly") is True for m in mounts), name
        if expected:
            assert [m["mountPath"] for m in mounts] == [expected]


def test_fetch_gateway_does_not_receive_the_env_secret() -> None:
    docs = list(
        yaml.safe_load_all(
            (_K8S / "mcp-sidecars" / "fetch-url-gateway.yaml").read_text(encoding="utf-8")
        )
    )
    deployment = next(d for d in docs if d and d["kind"] == "Deployment")
    spec = deployment["spec"]["template"]["spec"]
    assert spec["automountServiceAccountToken"] is False
    for container in spec["containers"]:
        assert "envFrom" not in container
        assert "agentic-orchestrator-env" not in yaml.safe_dump(container)


def test_network_policy_is_shipped_but_not_applied_by_default() -> None:
    policy = _K8S / "network-policy" / "namespace-isolation.yaml"
    docs = [d for d in yaml.safe_load_all(policy.read_text(encoding="utf-8")) if d]
    assert {d["kind"] for d in docs} == {"NetworkPolicy"}
    assert "default-deny-ingress" in {d["metadata"]["name"] for d in docs}
    # Opt-in: referenced by no kustomization and no script.
    for kustomization in _K8S.rglob("kustomization.yaml"):
        assert "network-policy" not in kustomization.read_text(encoding="utf-8")
    for script in _SCRIPTS.glob("*"):
        if script.is_file() and script.suffix in (".sh", ".ps1"):
            assert "network-policy" not in script.read_text(encoding="utf-8", errors="ignore")


def test_env_host_is_excluded_from_docker_build_contexts() -> None:
    root_ignore = (_REPO_ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
    tool_ignore = (_TOOL_ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
    assert "agentic-orchestration-tool/config/env.host" in root_ignore
    assert "config/env.host" in tool_ignore
    for needed in ("**/.env", ".git", "**/node_modules"):
        assert needed in root_ignore
    # Nothing the coordinator Dockerfile copies may be ignored outright.
    dockerfile = (_TOOL_ROOT / "docker" / "Dockerfile.coordinator").read_text(encoding="utf-8")
    copied = re.findall(r"^COPY\s+(.+)\s+\S+$", dockerfile, flags=re.MULTILINE)
    sources = [src for group in copied for src in group.split()]
    assert sources
    for src in sources:
        assert src not in root_ignore and src.split("/")[0] not in root_ignore, src


# --------------------------------------------------------------------------- Secret generator


def _tool_root_with_env(tmp_path: Path, env_text: str) -> Path:
    tool = tmp_path / "proj" / "agentic-orchestration-tool"
    tool.mkdir(parents=True)
    (tool / ".env").write_text(env_text, encoding="utf-8")
    return tool


def _dry_run_secret(tmp_path: Path, env_text: str) -> tuple[dict[str, str], str]:
    tool = _tool_root_with_env(tmp_path, env_text)
    out = tmp_path / "secret.env"
    proc = _run(
        _SCRIPTS / "jetson-sync-k8s-secret.sh",
        env={
            "PROJECT_ROOT": str(tool.parent),
            "AGENTIC_SECRET_DRY_RUN": "1",
            "AGENTIC_SECRET_DRY_RUN_OUT": str(out),
            "WORKER_IMAGE": "worker:test",
            "RUN_STORE_HOST": "/srv/run-store",
        },
    )
    assert proc.returncode == 0, proc.stderr
    return _env_lines(out), proc.stdout + proc.stderr


def test_secret_generator_lets_env_file_win_over_feature_defaults(tmp_path: Path) -> None:
    stdio = "fetch_url,filesystem_local,media_understand,weather_mcp"
    secret, output = _dry_run_secret(
        tmp_path,
        "# comment\n"
        "OPENAI_API_KEY=sk-test-not-a-real-key\n"
        f"AGENTIC_K8S_WORKER_STDIO_MCPS={stdio}\n"
        "AGENTIC_K8S_DELEGATION_ENABLED=0\n"
        "AGENTIC_MCP_MEDIA_ENABLED=0\n"
        "FILESYSTEM_MCP_ALLOWED_DIRECTORY=/data/workspace\n"
        "AGENTIC_EXECUTION_BACKEND=inprocess\n"
        "AGENTIC_K8S_NAMESPACE=somewhere-else\n",
    )
    # Operator settings survive (the generators used to overwrite these, dropping
    # weather_mcp and forcing delegation on).
    assert secret["AGENTIC_K8S_WORKER_STDIO_MCPS"] == stdio
    assert secret["AGENTIC_K8S_DELEGATION_ENABLED"] == "0"
    assert secret["AGENTIC_MCP_MEDIA_ENABLED"] == "0"
    assert secret["FILESYSTEM_MCP_ALLOWED_DIRECTORY"] == "/data/workspace"
    assert secret["OPENAI_API_KEY"] == "sk-test-not-a-real-key"
    # Cluster wiring is not overridable from a laptop-style .env.
    assert secret["AGENTIC_EXECUTION_BACKEND"] == "kubernetes"
    assert secret["AGENTIC_K8S_NAMESPACE"] == "agentic-orchestration"
    assert secret["AGENTIC_K8S_WORKER_IMAGE"] == "worker:test"
    assert secret["AGENTIC_RUN_STORE_PATH"] == "/srv/run-store"
    assert secret["AGENTIC_K8S_ENV_SECRET"] == "agentic-orchestrator-env"
    # Key names may be printed; values never are.
    assert "OPENAI_API_KEY" in output
    assert "sk-test-not-a-real-key" not in output
    assert secret["AGENTIC_SERVE_ADMIN_TOKEN"] not in output


def test_secret_generator_defaults_and_admin_token(tmp_path: Path) -> None:
    secret, _output = _dry_run_secret(tmp_path, "OPENAI_API_KEY=x\n")
    assert secret["FILESYSTEM_MCP_ALLOWED_DIRECTORY"] == "/run/store/mcp-fs-workspace"
    assert secret["AGENTIC_MCP_FETCH_ENABLED"] == "1"
    assert "AGENTIC_K8S_DELEGATION_ENABLED" not in secret  # code default (off) applies
    # Generated so coordinator and engine pods share one operator secret.
    assert re.fullmatch(r"[0-9a-f]{64}", secret["AGENTIC_SERVE_ADMIN_TOKEN"])


def test_secret_generator_keeps_admin_token_from_env_file(tmp_path: Path) -> None:
    secret, _output = _dry_run_secret(tmp_path, "AGENTIC_SERVE_ADMIN_TOKEN=operator-chosen\n")
    assert secret["AGENTIC_SERVE_ADMIN_TOKEN"] == "operator-chosen"


def test_secret_generator_reuses_cluster_token_and_guards_restarts(tmp_path: Path) -> None:
    """The token must be stable across deploys; absent Deployments must not abort the sync."""
    tool = _tool_root_with_env(tmp_path, "OPENAI_API_KEY=x\n")
    captured = tmp_path / "applied.env"
    log = tmp_path / "kubectl.log"
    existing = base64.b64encode(b"token-already-in-cluster").decode()
    stub = _stub_bin(
        tmp_path,
        f'echo "$*" >> "{log}"\n'
        'if [[ "$1" == "get" && "$2" == "secret" ]]; then\n'
        f'  printf "%s" "{existing}"\n'
        "  exit 0\n"
        "fi\n"
        'if [[ "$1" == "create" && "$2" == "secret" ]]; then\n'
        '  for arg in "$@"; do\n'
        '    case "$arg" in --from-env-file=*) cp "${arg#--from-env-file=}" '
        f'"{captured}" ;; esac\n'
        "  done\n"
        "  exit 0\n"
        "fi\n"
        'if [[ "$1" == "apply" ]]; then cat >/dev/null; exit 0; fi\n'
        # No Deployments exist yet (fresh install).
        'if [[ "$1" == "get" && "$2" == "deployment" ]]; then exit 1; fi\n'
        "exit 0\n",
    )
    proc = _run(
        _SCRIPTS / "jetson-sync-k8s-secret.sh",
        env={
            "PROJECT_ROOT": str(tool.parent),
            "KUBECONFIG": str(tmp_path / "kubeconfig"),
            "RUN_STORE_HOST": str(tmp_path / "no-such-run-store"),
        },
        stub=stub,
    )
    assert proc.returncode == 0, proc.stderr
    assert _env_lines(captured)["AGENTIC_SERVE_ADMIN_TOKEN"] == "token-already-in-cluster"
    calls = log.read_text(encoding="utf-8")
    assert "rollout restart" not in calls  # nothing to restart, and no failure
    assert "token-already-in-cluster" not in proc.stdout + proc.stderr


def test_only_one_script_generates_the_secret() -> None:
    generators = [
        script.name
        for script in sorted(_SCRIPTS.glob("*.sh"))
        if "kubectl create secret generic" in script.read_text(encoding="utf-8")
    ]
    # jetson-patch-ollama-api-base.sh rewrites one key of the existing Secret.
    assert generators == ["jetson-patch-ollama-api-base.sh", "jetson-sync-k8s-secret.sh"]
    for caller in ("jetson-k3s-deploy.sh", "jetson-local-llm-deploy.sh"):
        assert "jetson-sync-k8s-secret.sh" in (_SCRIPTS / caller).read_text(encoding="utf-8")


# --------------------------------------------------------------------------- OpenClaw mounts


def _resolve_openclaw_home(tool_root: Path, env: dict[str, str]) -> str:
    proc = subprocess.run(
        [
            _bash(),
            "-c",
            'set -euo pipefail; source "$1/lib-openclaw.sh"; resolve_openclaw_home "$2"',
            "_",
            str(_SCRIPTS),
            str(tool_root),
        ],
        capture_output=True,
        text=True,
        env={**{k: v for k, v in os.environ.items() if k != "AGENTIC_OPENCLAW_HOME"}, **env},
    )
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


def test_openclaw_home_resolution(tmp_path: Path) -> None:
    tool = tmp_path / "tool"
    tool.mkdir()
    env_file = tool / ".env"

    env_file.write_text("FOO=1\n", encoding="utf-8")
    assert _resolve_openclaw_home(tool, {}) == ""  # unknown: mounts are skipped

    # Hosts configured before AGENTIC_OPENCLAW_HOME existed keep working.
    env_file.write_text(
        "FILESYSTEM_MCP_ALLOWED_DIRECTORY=/home/some.user/.openclaw/workspace\n", encoding="utf-8"
    )
    assert _resolve_openclaw_home(tool, {}) == "/home/some.user/.openclaw"

    env_file.write_text("AGENTIC_OPENCLAW_HOME=/srv/openclaw/\n", encoding="utf-8")
    assert _resolve_openclaw_home(tool, {}) == "/srv/openclaw"
    assert _resolve_openclaw_home(tool, {"AGENTIC_OPENCLAW_HOME": "/opt/oc"}) == "/opt/oc"

    # Not an absolute plain path: refused rather than pasted into a manifest.
    env_file.write_text('AGENTIC_OPENCLAW_HOME="/srv/oc; rm -rf /"\n', encoding="utf-8")
    assert _resolve_openclaw_home(tool, {}) == ""


def test_openclaw_patches_are_templates_rendered_per_host() -> None:
    for name in (
        "coordinator/jetson-openclaw-mcp-hostpath-patch.yaml",
        "warm-pool-jetson-openclaw-mcp-hostpath-patch.yaml",
    ):
        text = (_K8S / name).read_text(encoding="utf-8")
        rendered = yaml.safe_load(text.replace("__AGENTIC_OPENCLAW_HOME__", "/srv/oc"))
        spec = rendered["spec"]["template"]["spec"]
        paths = {v["hostPath"]["path"] for v in spec["volumes"]}
        assert paths == {"/srv/oc/agentic-orchestration/openclaw-mcp-providers", "/srv/oc/workspace"}
    for script in ("jetson-hotfix-web.sh", "jetson-sync-warm-pool.sh"):
        text = (_SCRIPTS / script).read_text(encoding="utf-8")
        assert "apply_openclaw_patch" in text
        # Never handed to kubectl un-rendered.
        assert not re.search(r"--patch-file\s+\"\$\{(WARM_)?OPENCLAW_MCP_PATCH\}\"", text)


# --------------------------------------------------------------------------- engine probes


_KUBECTL_ENGINE_STUB = """
if [[ "$1" == "get" && "$2" == "deployment" && "$*" == *"jsonpath"* ]]; then
  echo "ghcr.io/example/agentic-orchestrator-coordinator:v9.9.9"
  exit 0
fi
# Post-apply probe audit (#181/#186/#187) — return a minimal Deployment JSON.
if [[ "$1" == "get" && ("$2" == "deploy" || "$2" == "deployment") && "$*" == *"-o json"* ]]; then
  cat <<'JSON'
{"spec":{"template":{"spec":{"containers":[{"readinessProbe":{"httpGet":{"path":"/ready","scheme":"HTTPS"}},"livenessProbe":{"httpGet":{"path":"/ready","scheme":"HTTPS"}}}]}}}}
JSON
  exit 0
fi
if [[ "$1" == "apply" && "$2" == "-f" ]]; then
  if [[ "$3" != *"/service"* ]]; then cp "$3" "__CAPTURE__"; fi
  exit 0
fi
exit 0
"""


def _render_engine(tmp_path: Path, env_text: str, extra_env: dict[str, str] | None = None) -> dict:
    project = tmp_path / "proj"
    tool = project / "agentic-orchestration-tool"
    (tool / "orchestration" / "serve").mkdir(parents=True)
    (tool / "deploy").symlink_to(_TOOL_ROOT / "deploy", target_is_directory=True)
    (tool / ".env").write_text(env_text, encoding="utf-8")
    captured = tmp_path / "engine.yaml"
    stub = _stub_bin(
        tmp_path,
        _KUBECTL_ENGINE_STUB.replace("__CAPTURE__", str(captured)),
        curl_body='echo \'{"service":"agentic-orchestration-engine","ok":true}\'\n',
    )
    proc = _run(
        _SCRIPTS / "jetson-enable-engine.sh",
        str(project),
        env={"KUBECONFIG": str(tmp_path / "kubeconfig"), **(extra_env or {})},
        stub=stub,
    )
    assert proc.returncode == 0, f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
    return yaml.safe_load(captured.read_text(encoding="utf-8"))


def _probe_schemes(doc: dict) -> set[str]:
    container = doc["spec"]["template"]["spec"]["containers"][0]
    return {container[key]["httpGet"]["scheme"] for key in ("readinessProbe", "livenessProbe")}


def test_engine_probes_are_http_when_the_daemon_serves_cleartext(tmp_path: Path) -> None:
    """HTTPS probes against a cleartext daemon never go Ready and liveness kills the pod."""
    doc = _render_engine(tmp_path, "OPENAI_API_KEY=x\n")
    assert _probe_schemes(doc) == {"HTTP"}
    container = doc["spec"]["template"]["spec"]["containers"][0]
    assert container["image"] == "ghcr.io/example/agentic-orchestrator-coordinator:v9.9.9"


def test_engine_probes_need_both_cert_and_key_for_https(tmp_path: Path) -> None:
    # The daemon only serves TLS with both; a lone certfile line means cleartext.
    doc = _render_engine(tmp_path, "AGENTIC_SERVE_TLS_CERTFILE=/tls/cert.pem\n")
    assert _probe_schemes(doc) == {"HTTP"}


def test_engine_probes_are_https_when_tls_is_configured(tmp_path: Path) -> None:
    doc = _render_engine(
        tmp_path,
        "AGENTIC_SERVE_TLS_CERTFILE=/tls/cert.pem\nAGENTIC_SERVE_TLS_KEYFILE=/tls/key.pem\n",
    )
    assert _probe_schemes(doc) == {"HTTPS"}


def test_engine_probe_scheme_can_be_forced(tmp_path: Path) -> None:
    doc = _render_engine(
        tmp_path, "OPENAI_API_KEY=x\n", {"AGENTIC_ENGINE_PROBE_SCHEME": "https"}
    )
    assert _probe_schemes(doc) == {"HTTPS"}


# --------------------------------------------------------------------------- Ollama NodePort


def _ollama_applied_files(tmp_path: Path, env: dict[str, str]) -> list[str]:
    tmp_path.mkdir(parents=True, exist_ok=True)
    log = tmp_path / "applied.log"
    stub = _stub_bin(
        tmp_path,
        'if [[ "$*" == *"get deploy agentic-coordinator"* ]]; then\n'
        '  echo "ghcr.io/example/agentic-orchestrator-coordinator:v9.9.9"; exit 0\n'
        "fi\n"
        # No pre-existing NodePort Service.
        'if [[ "$1" == "get" && "$2" == "service" ]]; then exit 1; fi\n'
        f'if [[ "$1" == "apply" && "$2" == "-f" ]]; then basename "$3" >> "{log}"; fi\n'
        "exit 0\n",
        curl_body="exit 1\n",
    )
    _write_exe(
        stub / "uname",
        '#!/usr/bin/env bash\nif [[ "$1" == "-m" ]]; then echo x86_64; else exec /usr/bin/uname "$@"; fi\n',
    )
    project = tmp_path / "proj"
    tool = project / "agentic-orchestration-tool"
    tool.mkdir(parents=True)
    (tool / "deploy").symlink_to(_TOOL_ROOT / "deploy", target_is_directory=True)
    (tool / "orchestration").symlink_to(_TOOL_ROOT / "orchestration", target_is_directory=True)
    proc = _run(
        _SCRIPTS / "jetson-enable-ollama.sh",
        str(project),
        env={"KUBECONFIG": str(tmp_path / "kubeconfig"), **env},
        stub=stub,
    )
    assert proc.returncode == 0, f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
    return log.read_text(encoding="utf-8").split()


def test_ollama_nodeport_is_opt_in(tmp_path: Path) -> None:
    """Ollama has no authentication; NodePort 31134 exposed it to the whole LAN by default."""
    default = _ollama_applied_files(tmp_path / "a", {})
    assert "service.yaml" in default
    assert "service-nodeport.yaml" not in default

    opted_in = _ollama_applied_files(tmp_path / "b", {"AGENTIC_OLLAMA_NODEPORT": "1"})
    assert "service-nodeport.yaml" in opted_in
