from __future__ import annotations

import os
import platform
import shutil
import subprocess
import time
import urllib.error
import urllib.request

from crewai import Agent

from providers.base import Provider


class OllamaProvider(Provider):
    """Provider implementation for local Ollama models via CrewAI."""

    def initialize(self) -> None:
        host = self._normalize_host(
            self.config.ollama_host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        )
        os.environ["OLLAMA_HOST"] = host

        if self.config.selfcontained:
            model = self.config.model.removeprefix("ollama/")
            self._ensure_ollama_runtime(model=model, host=host)

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

    @staticmethod
    def _normalize_host(raw_host: str) -> str:
        host = raw_host.strip() or "http://127.0.0.1:11434"
        if host.startswith("http://") or host.startswith("https://"):
            return host.rstrip("/")
        return f"http://{host.rstrip('/')}"

    def _ensure_ollama_runtime(self, model: str, host: str) -> None:
        if shutil.which("ollama") is None:
            self._install_ollama()

        if not self._is_ollama_healthy(host):
            self._start_ollama_server(host)

        self._pull_model(model, host)

    @staticmethod
    def _install_ollama() -> None:
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

    @staticmethod
    def _is_ollama_healthy(host: str) -> bool:
        try:
            with urllib.request.urlopen(f"{host}/api/tags", timeout=2) as response:
                return 200 <= response.status < 300
        except (urllib.error.URLError, TimeoutError, ValueError):
            return False

    def _start_ollama_server(self, host: str) -> None:
        os.environ["OLLAMA_HOST"] = host

        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )

        timeout_seconds = 30
        start = time.time()
        while time.time() - start < timeout_seconds:
            if self._is_ollama_healthy(host):
                return
            time.sleep(1)

        raise RuntimeError(
            "Ollama server did not become ready in time. "
            "Start it manually with 'ollama serve' and retry."
        )

    @staticmethod
    def _pull_model(model: str, host: str) -> None:
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
