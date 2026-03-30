from __future__ import annotations

import os
import platform
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

from crewai import Agent

from providers.base import Provider

# Skip redundant `ollama pull` when multiple providers share the same model and host.
_ollama_pull_done: set[str] = set()

# `ollama serve` processes started by selfcontained providers (key = normalized base URL).
_workflow_ollama_serve_procs: dict[str, subprocess.Popen] = {}


def _ollama_serve_key(host: str) -> str:
    return host.rstrip("/")


def _workflow_ollama_register_serve(host: str, proc: subprocess.Popen) -> None:
    _workflow_ollama_serve_procs[_ollama_serve_key(host)] = proc


def normalize_ollama_host(raw_host: str) -> str:
    host = raw_host.strip() or "http://127.0.0.1:11434"
    if host.startswith("http://") or host.startswith("https://"):
        return host.rstrip("/")
    return f"http://{host.rstrip('/')}"


def ollama_listen_addr(host: str) -> str:
    url = host if "://" in host else f"http://{host}"
    parsed = urlparse(url)
    hostname = parsed.hostname or "127.0.0.1"
    port = parsed.port or 11434
    return f"{hostname}:{port}"


def is_ollama_healthy(host: str) -> bool:
    try:
        with urllib.request.urlopen(f"{host}/api/tags", timeout=2) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False


def install_ollama() -> None:
    system = platform.system().lower()
    try:
        if "windows" in system:
            subprocess.run(
                [
                    "winget",
                    "install",
                    "--id",
                    "Ollama.Ollama",
                    "-e",
                    "--accept-package-agreements",
                    "--accept-source-agreements",
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return

        if "darwin" in system:
            subprocess.run(
                ["brew", "install", "ollama"],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return

        subprocess.run(
            ["sh", "-c", "curl -fsSL https://ollama.com/install.sh | sh"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "Failed to install Ollama automatically. Install Ollama manually and retry."
        ) from exc


def start_ollama_server(host: str) -> None:
    listen = ollama_listen_addr(host)
    os.environ["OLLAMA_HOST"] = host

    env = os.environ.copy()
    env["OLLAMA_HOST"] = listen

    proc = subprocess.Popen(
        ["ollama", "serve"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    _workflow_ollama_register_serve(host, proc)

    timeout_seconds = 30
    start = time.time()
    while time.time() - start < timeout_seconds:
        if is_ollama_healthy(host):
            return
        time.sleep(1)

    raise RuntimeError(
        "Ollama server did not become ready in time. "
        "Start it manually with 'ollama serve' and retry."
    )


def pull_ollama_model(model: str, host: str) -> None:
    cache_key = f"{host.rstrip('/')}\0{model}"
    if cache_key in _ollama_pull_done:
        return

    env = os.environ.copy()
    env["OLLAMA_HOST"] = host
    try:
        subprocess.run(
            ["ollama", "pull", model],
            env=env,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
        ) from exc

    _ollama_pull_done.add(cache_key)


def ensure_ollama_runtime(*, model: str, host: str) -> None:
    if shutil.which("ollama") is None:
        install_ollama()

    if not is_ollama_healthy(host):
        start_ollama_server(host)

    pull_ollama_model(model, host)


class OllamaProvider(Provider):
    """Provider implementation for local Ollama models via CrewAI."""

    def initialize(self) -> None:
        host = normalize_ollama_host(
            self.config.ollama_host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        )
        os.environ["OLLAMA_HOST"] = host

        if self.config.selfcontained:
            model = self.config.model.removeprefix("ollama/")
            ensure_ollama_runtime(model=model, host=host)

    def health_check(self) -> None:
        host = normalize_ollama_host(
            self.config.ollama_host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        )
        if not is_ollama_healthy(host):
            raise RuntimeError(
                f"Ollama is not reachable at {host}. Start the server or use selfcontained: true."
            )

    def build_agent(self) -> Agent:
        raw_model = self.config.model
        model_without_prefix = raw_model.removeprefix("ollama/")
        model = f"ollama/{model_without_prefix}"

        return Agent(
            role=self.config.role,
            goal=self.config.goal,
            backstory=self.config.backstory,
            llm=model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
