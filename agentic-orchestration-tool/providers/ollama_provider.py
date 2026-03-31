from __future__ import annotations

import os
import re
import sys
from typing import Any, TextIO

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

# Set by runner.build_workflow when the CLI run is not --quiet (e.g. web "Show crew log").
def _ollama_cli_inherit_stdio() -> bool:
    v = os.getenv("AGENTIC_OLLAMA_VERBOSE", "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _ollama_subprocess_stdio() -> tuple[Any, Any]:
    if _ollama_cli_inherit_stdio():
        return (None, None)
    return (subprocess.DEVNULL, subprocess.DEVNULL)


# Ollama pull uses TTY progress (CSI sequences, redraw). Strip and emit one updating line.
_ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[-/]*[@-~])")
_SPINNER_RUNES_RE = re.compile(r"[\u2800-\u28FF⣾⣽⣻⢿⡿⣟⣯⣷]+")


def _normalize_ollama_pull_display_line(raw: str) -> str | None:
    """Turn one raw pull output chunk into a single human-readable progress line."""
    line = _ANSI_ESCAPE_RE.sub("", raw)
    line = line.replace("\r", " ")
    line = _SPINNER_RUNES_RE.sub(" ", line)
    line = " ".join(line.split())
    if not line:
        return None
    idx = line.casefold().rfind("pulling manifest")
    if idx != -1:
        line = line[:idx].rstrip()
    line = " ".join(line.split())
    if not line or "pulling" not in line.casefold():
        return None
    if not any(x in line for x in ("%", "MB", "GB", "KB")):
        return None
    return line


def _rewrite_ollama_pull_to_single_line(stream: TextIO) -> None:
    """TTY: one \\r-updating line. Piped stdout: periodic newlines so logs stay readable."""
    tty = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    throttle = float(os.getenv("AGENTIC_OLLAMA_PULL_THROTTLE_SEC", "1.2"))
    if throttle < 0.15:
        throttle = 0.15

    last_len = 0
    last_emit = 0.0
    pending = ""

    for raw in stream:
        line = _normalize_ollama_pull_display_line(raw)
        if not line:
            continue
        pending = line
        if tty:
            pad = max(0, last_len - len(line))
            sys.stdout.write("\r" + line + (" " * pad))
            sys.stdout.flush()
            last_len = len(line)
        else:
            now = time.monotonic()
            if now - last_emit >= throttle:
                sys.stdout.write(line + "\n")
                sys.stdout.flush()
                last_emit = now

    if tty and last_len:
        sys.stdout.write("\n")
        sys.stdout.flush()
    elif not tty and pending:
        sys.stdout.write(pending + "\n")
        sys.stdout.flush()


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
    out, err = _ollama_subprocess_stdio()
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
                stdout=out,
                stderr=err,
            )
            return

        if "darwin" in system:
            subprocess.run(
                ["brew", "install", "ollama"],
                check=True,
                stdout=out,
                stderr=err,
            )
            return

        subprocess.run(
            ["sh", "-c", "curl -fsSL https://ollama.com/install.sh | sh"],
            check=True,
            stdout=out,
            stderr=err,
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
    # Quieter embedded server (default OLLAMA_DEBUG=INFO is very chatty).
    env["OLLAMA_DEBUG"] = os.getenv("AGENTIC_OLLAMA_SERVE_DEBUG", "false").strip()

    # Background daemon: do not inherit logs (GPU discovery, GIN, etc.). Pull shows progress.
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

    if not _ollama_cli_inherit_stdio():
        out, err = _ollama_subprocess_stdio()
        try:
            subprocess.run(
                ["ollama", "pull", model],
                env=env,
                check=True,
                stdout=out,
                stderr=err,
            )
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(
                f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
            ) from exc
        _ollama_pull_done.add(cache_key)
        return

    try:
        proc = subprocess.Popen(
            ["ollama", "pull", model],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
        ) from exc

    assert proc.stdout is not None
    try:
        _rewrite_ollama_pull_to_single_line(proc.stdout)
    finally:
        rc = proc.wait()
    if rc != 0:
        raise RuntimeError(
            f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
        )

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
