from __future__ import annotations

import json
import os
import re
import sys
from typing import Any, Iterator, TextIO

import platform
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

from crewai import Agent

from agent_providers.base import AgentProvider, augment_backstory_for_mcp_tools

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


def _ollama_pull_progress_stderr_enabled() -> bool:
    return os.getenv("AGENTIC_OLLAMA_PULL_PROGRESS_STDERR", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _emit_pull_progress_line(text: str) -> None:
    """Emit one `(progress) ...` line on stderr for UIs that stream stderr (e.g. web pinned status)."""
    if not _ollama_pull_progress_stderr_enabled():
        return
    msg = str(text or "").strip()
    if not msg:
        return
    try:
        sys.__stderr__.write(f"(progress) {msg}\n")
        sys.__stderr__.flush()
    except Exception:  # noqa: BLE001
        return


# Ollama pull uses TTY progress (CSI sequences, redraw). Strip and emit one updating line.
_ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[-/]*[@-~])")
_SPINNER_RUNES_RE = re.compile(r"[\u2800-\u28FF⣾⣽⣻⢿⡿⣟⣯⣷]+")
# One logical progress stream per layer/blob: "pulling <digest>:" lines update in place.
_PULLING_LAYER_KEY_RE = re.compile(r"(?is)^(pulling\s+[a-fA-F0-9]+:)\s*")
_PULLING_MANIFEST_KEY_RE = re.compile(r"(?is)^(pulling\s+manifest)\b")


def _ollama_pull_progress_key(line: str) -> str:
    """Stable key so 97% → 100% updates for the same layer collapse to one output line."""
    s = line.strip()
    m = _PULLING_LAYER_KEY_RE.match(s)
    if m:
        return m.group(1).casefold()
    m = _PULLING_MANIFEST_KEY_RE.match(s)
    if m:
        return m.group(1).casefold()
    return s.casefold()


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
    """One live line per `pulling <digest>:` / manifest; same key overwrites prior output."""
    tty = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

    last_len = 0
    prev_key: str | None = None
    last_line_for_key = ""

    for raw in stream:
        line = _normalize_ollama_pull_display_line(raw)
        if not line:
            continue
        key = _ollama_pull_progress_key(line)

        if tty:
            if key != prev_key:
                if prev_key is not None:
                    sys.stdout.write("\n")
                prev_key = key
                last_len = 0
            pad = max(0, last_len - len(line))
            sys.stdout.write("\r" + line + (" " * pad))
            sys.stdout.flush()
            last_len = len(line)
        else:
            if key != prev_key:
                if prev_key is not None:
                    sys.stdout.write(last_line_for_key + "\n")
                    sys.stdout.flush()
                prev_key = key
            last_line_for_key = line

    if tty and last_len:
        sys.stdout.write("\n")
        sys.stdout.flush()
    elif not tty and prev_key is not None:
        sys.stdout.write(last_line_for_key + "\n")
        sys.stdout.flush()


def _ollama_serve_key(host: str) -> str:
    return host.rstrip("/")


def _workflow_ollama_register_serve(host: str, proc: subprocess.Popen) -> None:
    _workflow_ollama_serve_procs[_ollama_serve_key(host)] = proc


def _workflow_ollama_stop_serve(host: str) -> None:
    key = _ollama_serve_key(host)
    proc = _workflow_ollama_serve_procs.pop(key, None)
    if proc is None:
        return
    try:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
    except Exception:
        return


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


def _iter_ollama_pull_ndjson(resp: Any) -> Iterator[dict[str, Any]]:
    while True:
        raw_b = resp.readline()
        if not raw_b:
            break
        line = raw_b.decode("utf-8", errors="replace").strip()
        if not line:
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            continue


def _format_api_pull_progress_display_line(obj: dict[str, Any], *, model: str) -> str | None:
    err = obj.get("error")
    if err:
        raise RuntimeError(f"Failed to pull Ollama model '{model}': {err}")
    status = str(obj.get("status") or "").strip()
    if not status or status.casefold() == "success":
        return None
    s = status.casefold()
    if "pulling" not in s:
        return None
    total = obj.get("total")
    completed = obj.get("completed")
    if isinstance(total, int) and isinstance(completed, int) and total > 0 and "%" not in status:
        pct = min(100, int(100 * completed / total))
        status = f"{status}  {pct}%"
    if "%" in status or any(x in status for x in ("MB", "GB", "KB")):
        return status
    if "manifest" in s:
        return f"{status}  0%"
    return None


def _pull_ollama_model_via_http_api(model: str, host: str) -> None:
    """Pull via POST /api/pull so the daemon at `host` downloads into its own model dir.

    That matches inference (same `OLLAMA_HOST`), whereas a local `ollama pull` subprocess
    can still interact with a different Ollama home (e.g. root `~/.ollama`) if another
    `ollama serve` is bound to the address or the CLI resolves storage differently.
    """
    url = f"{host.rstrip('/')}/api/pull"
    body = json.dumps({"model": model, "stream": True}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=None) as resp:
            if not _ollama_cli_inherit_stdio():
                if not _ollama_pull_progress_stderr_enabled():
                    for obj in _iter_ollama_pull_ndjson(resp):
                        _format_api_pull_progress_display_line(obj, model=model)
                    return

                _emit_pull_progress_line(f"ollama pull: starting {model}")
                for obj in _iter_ollama_pull_ndjson(resp):
                    pl = _format_api_pull_progress_display_line(obj, model=model)
                    if pl:
                        norm = _normalize_ollama_pull_display_line(pl + "\n")
                        if norm:
                            _emit_pull_progress_line(f"ollama pull: {norm}")
                _emit_pull_progress_line(f"ollama pull: complete {model}")
                return

            def progress_lines() -> Iterator[str]:
                for obj in _iter_ollama_pull_ndjson(resp):
                    pl = _format_api_pull_progress_display_line(obj, model=model)
                    if pl:
                        yield pl + "\n"

            _rewrite_ollama_pull_to_single_line(progress_lines())  # type: ignore[arg-type]
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", errors="replace").strip()
        except Exception:  # noqa: BLE001
            detail = ""
        msg = f"Failed to pull Ollama model '{model}' (HTTP {exc.code})."
        if detail:
            msg = f"{msg} {detail}"
        raise RuntimeError(msg) from exc
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        raise RuntimeError(
            f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
        ) from exc


def pull_ollama_model(model: str, host: str) -> None:
    cache_key = f"{host.rstrip('/')}\0{model}"
    if cache_key in _ollama_pull_done:
        return

    base = host.rstrip("/")
    if base.lower().startswith("http://") or base.lower().startswith("https://"):
        _pull_ollama_model_via_http_api(model, base)
        _ollama_pull_done.add(cache_key)
        return

    env = os.environ.copy()
    env["OLLAMA_HOST"] = host

    if not _ollama_cli_inherit_stdio():
        if not _ollama_pull_progress_stderr_enabled():
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

        _emit_pull_progress_line(f"ollama pull: starting {model}")
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
            _emit_pull_progress_line(f"ollama pull: failed to start ({model})")
            raise RuntimeError(
                f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
            ) from exc

        assert proc.stdout is not None
        try:
            for raw in proc.stdout:
                line = _normalize_ollama_pull_display_line(raw)
                if line:
                    _emit_pull_progress_line(f"ollama pull: {line}")
        finally:
            rc = proc.wait()
        if rc != 0:
            _emit_pull_progress_line(f"ollama pull: failed ({model})")
            raise RuntimeError(
                f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
            )
        _emit_pull_progress_line(f"ollama pull: complete {model}")
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


def _looks_like_ollama_runner_crash(error: BaseException) -> bool:
    text = str(error or "").lower()
    return (
        "llama runner process has terminated" in text
        or ("openai api call failed" in text and "ollama" in text and "terminated" in text)
    )


class OllamaProvider(AgentProvider):
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

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        raw_model = self.config.model
        model_without_prefix = raw_model.removeprefix("ollama/")
        model = f"ollama/{model_without_prefix}"

        kwargs: dict[str, Any] = dict(
            role=self.crew_agent_role_label(role_suffix),
            goal=self.config.goal,
            backstory=augment_backstory_for_mcp_tools(self.config.backstory, mcps),
            llm=model,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
        )
        if mcps:
            kwargs["mcps"] = list(mcps)
        return Agent(**kwargs)

    def recover_from_workflow_error(self, error: BaseException) -> bool:
        if not _looks_like_ollama_runner_crash(error):
            return False
        host = normalize_ollama_host(
            self.config.ollama_host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        )
        # If we spawned a workflow-local serve process, recycle it; otherwise just verify health.
        _workflow_ollama_stop_serve(host)
        model = self.config.model.removeprefix("ollama/")
        try:
            ensure_ollama_runtime(model=model, host=host)
            return True
        except Exception:
            return False
