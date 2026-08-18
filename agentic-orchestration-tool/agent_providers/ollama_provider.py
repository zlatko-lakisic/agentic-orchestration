from __future__ import annotations

import json
import os
import re
import sys
import threading
from typing import Any, Callable, Iterator, TextIO

import platform
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

from crewai import Agent

from agent_providers.base import AgentProvider, resolve_agent_backstory
from orchestration.ollama_serve_lifecycle import (
    register_serve as _workflow_ollama_register_serve,
    spawn_ollama_serve,
    stop_all_serves as stop_all_workflow_ollama_serves,
    stop_serve as _workflow_ollama_stop_serve,
)

try:
    from crewai import LLM
except ImportError:  # pragma: no cover
    from crewai.llm import LLM  # type: ignore[attr-defined,no-redef]

# Skip redundant `ollama pull` when multiple providers share the same model and host.
_ollama_pull_done: set[str] = set()

_active_pull_lock = threading.Lock()
_active_pull: dict[str, Any] | None = None


class OllamaPullCancelled(RuntimeError):
    """Raised when an in-flight ``ollama pull`` is aborted by the client or admin."""

    code = "cancelled"

    def __init__(self, model: str = "", message: str | None = None) -> None:
        model_s = str(model or "").strip()
        super().__init__(
            message
            or (
                f"Download of {model_s} was cancelled."
                if model_s
                else "Model download was cancelled."
            )
        )
        self.model = model_s


def _register_active_pull(
    *,
    model: str,
    host: str,
    cancel_event: threading.Event,
    closer: Callable[[], None] | None = None,
    proc: Any = None,
    connection_id: str | None = None,
) -> None:
    global _active_pull
    with _active_pull_lock:
        _active_pull = {
            "model": model,
            "host": host,
            "event": cancel_event,
            "closer": closer,
            "proc": proc,
            "connectionId": str(connection_id or "").strip() or None,
        }


def _set_active_pull_handle(*, closer: Callable[[], None] | None = None, proc: Any = None) -> None:
    with _active_pull_lock:
        if _active_pull is None:
            return
        if closer is not None:
            _active_pull["closer"] = closer
        if proc is not None:
            _active_pull["proc"] = proc


def _clear_active_pull() -> None:
    global _active_pull
    with _active_pull_lock:
        _active_pull = None


def active_ollama_pull() -> dict[str, Any] | None:
    with _active_pull_lock:
        if not _active_pull:
            return None
        return {
            "model": _active_pull.get("model"),
            "host": _active_pull.get("host"),
            "connectionId": _active_pull.get("connectionId"),
        }


def cancel_active_ollama_pull(
    *,
    connection_id: str | None = None,
    force: bool = False,
) -> bool:
    """Abort the in-flight HTTP/CLI pull. ``force`` ignores connection ownership."""
    with _active_pull_lock:
        state = _active_pull
        if not state:
            return False
        owner = str(state.get("connectionId") or "")
        cid = str(connection_id or "").strip()
        if cid and owner and owner != cid and not force:
            return False
        event = state.get("event")
        closer = state.get("closer")
        proc = state.get("proc")
    if isinstance(event, threading.Event):
        event.set()
    if callable(closer):
        try:
            closer()
        except Exception:  # noqa: BLE001
            pass
    if proc is not None:
        try:
            proc.terminate()
        except Exception:  # noqa: BLE001
            pass
    return True


def _pull_cancel_event(explicit: threading.Event | None) -> threading.Event:
    if explicit is not None:
        return explicit
    with _active_pull_lock:
        if _active_pull and isinstance(_active_pull.get("event"), threading.Event):
            return _active_pull["event"]
    return threading.Event()


def _raise_if_pull_cancelled(event: threading.Event, model: str) -> None:
    if event.is_set():
        raise OllamaPullCancelled(model)

# Set by runner.build_workflow when the CLI run is not --quiet (e.g. web "Show crew log").
def _ollama_cli_inherit_stdio() -> bool:
    v = os.getenv("AGENTIC_OLLAMA_VERBOSE", "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _ollama_subprocess_stdio() -> tuple[Any, Any]:
    if _ollama_cli_inherit_stdio():
        return (None, None)
    return (subprocess.DEVNULL, subprocess.DEVNULL)


def _ollama_max_iter() -> int:
    """CrewAI default max_iter is 25; cap Ollama tool retries so a dead MCP cannot loop."""
    raw = os.getenv("AGENTIC_OLLAMA_MAX_ITER", "6").strip()
    try:
        return max(1, min(25, int(raw)))
    except ValueError:
        return 6


def _ollama_pull_progress_stderr_enabled() -> bool:
    return os.getenv("AGENTIC_OLLAMA_PULL_PROGRESS_STDERR", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _emit_pull_progress_line(text: str) -> None:
    """Emit one `(progress) ...` line on stderr; also fan out to an optional progress sink."""
    msg = str(text or "").strip()
    if not msg:
        return
    try:
        from orchestration.background_activity import observe_progress

        observe_progress(msg)
    except Exception:  # noqa: BLE001
        pass
    try:
        from orchestration.progress_sink import emit_progress

        emit_progress(msg)
    except Exception:  # noqa: BLE001
        pass
    if not _ollama_pull_progress_stderr_enabled():
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


def normalize_ollama_host(raw_host: str) -> str:
    host = raw_host.strip() or "http://127.0.0.1:11434"
    if host.startswith("http://") or host.startswith("https://"):
        return host.rstrip("/")
    return f"http://{host.rstrip('/')}"


def litellm_api_base_for_ollama() -> str:
    """Base URL for LiteLLM ``api_base`` when the model id uses the ``ollama/`` prefix.

    LiteLLM's Ollama integration honors ``OLLAMA_API_BASE``, not ``OLLAMA_HOST``.
    """
    raw = (
        os.getenv("OLLAMA_API_BASE", "").strip()
        or os.getenv("OLLAMA_HOST", "").strip()
        or "http://127.0.0.1:11434"
    )
    return normalize_ollama_host(raw)


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


def ollama_has_model(host: str, model: str) -> bool:
    """True when ``model`` (or ``model:latest``) appears in ``GET /api/tags``."""
    wanted = str(model or "").removeprefix("ollama/").strip()
    if not wanted:
        return False
    base = normalize_ollama_host(host)
    try:
        with urllib.request.urlopen(f"{base}/api/tags", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError):
        return False
    models = payload.get("models") if isinstance(payload, dict) else None
    if not isinstance(models, list):
        return False
    names: set[str] = set()
    for item in models:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("model") or "").strip()
        if name:
            names.add(name)
            # Ollama often lists ``tag:latest``; accept bare tag matches.
            if ":" in name:
                names.add(name.split(":", 1)[0])
    if wanted in names:
        return True
    if ":" not in wanted and f"{wanted}:latest" in names:
        return True
    return False


def ensure_ollama_model_on_api(
    *,
    model: str,
    host: str,
    on_progress: Callable[[str], None] | None = None,
    cancel_event: threading.Event | None = None,
    connection_id: str | None = None,
) -> None:
    """Ensure ``model`` exists on an already-running Ollama HTTP API (tags → pull).

    Never installs Ollama or spawns ``ollama serve``. Used for session-overlay agents
    on shared hosts (e.g. Jetson ``OLLAMA_API_BASE``) where the daemon is external.
    """
    model_clean = str(model or "").removeprefix("ollama/").strip()
    if not model_clean:
        raise ValueError("model is required")
    host_n = normalize_ollama_host(host)
    log = on_progress or (lambda _m: None)

    if not is_ollama_healthy(host_n):
        raise RuntimeError(
            f"Ollama is not reachable at {host_n}. "
            "Configure OLLAMA_API_BASE / OLLAMA_HOST to a running server "
            "(session overlays do not spawn a local ollama binary)."
        )
    if ollama_has_model(host_n, model_clean):
        log(f"ollama model ready: {model_clean} at {host_n}")
        return
    log(f"ollama model missing: {model_clean}; pulling via {host_n} …")
    try:
        pull_ollama_model(
            model_clean,
            host_n,
            cancel_event=cancel_event,
            connection_id=connection_id,
        )
    except OllamaPullCancelled:
        raise
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            f"model {model_clean!r} not available and pull failed: {exc}"
        ) from exc
    if not ollama_has_model(host_n, model_clean):
        raise RuntimeError(
            f"model {model_clean!r} not available and pull failed: "
            f"not listed in /api/tags after pull at {host_n}"
        )
    log(f"ollama model ready: {model_clean} at {host_n}")


def install_ollama_native_linux() -> None:
    """Install upstream Ollama via ollama.com install.sh (ARM64 CUDA on Jetson when supported)."""
    out, err = _ollama_subprocess_stdio()
    try:
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

        from orchestration.ollama_runtime import install_ollama_for_platform

        install_ollama_for_platform()
    except RuntimeError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "Failed to install Ollama automatically. Install Ollama manually and retry."
        ) from exc


def start_ollama_server(host: str) -> None:
    from orchestration.ollama_resource_manager import (
        broker_listen_port,
        resolve_upstream_base,
        resource_sharing_enabled,
    )

    public_host = normalize_ollama_host(host)
    sharing = resource_sharing_enabled()
    if sharing:
        # Daemon binds upstream; broker listens on the public Ollama API port.
        upstream = resolve_upstream_base()
        daemon_host = normalize_ollama_host(upstream)
        listen = ollama_listen_addr(daemon_host)
    else:
        daemon_host = public_host
        listen = ollama_listen_addr(public_host)

    os.environ["OLLAMA_HOST"] = public_host if sharing else daemon_host

    env = os.environ.copy()
    env["OLLAMA_HOST"] = listen
    # Quieter embedded server (default OLLAMA_DEBUG=INFO is very chatty).
    env["OLLAMA_DEBUG"] = os.getenv("AGENTIC_OLLAMA_SERVE_DEBUG", "false").strip()
    # Concurrent in-flight generations (meeting SE+BizDev fan-out). Prefer
    # AGENTIC_OLLAMA_NUM_PARALLEL; fall back to OLLAMA_NUM_PARALLEL; default 2 when
    # AO starts the serve so tagged direct-agent pairs are not serialized to one slot.
    num_parallel = (
        os.getenv("AGENTIC_OLLAMA_NUM_PARALLEL", "").strip()
        or os.getenv("OLLAMA_NUM_PARALLEL", "").strip()
        or "2"
    )
    env["OLLAMA_NUM_PARALLEL"] = num_parallel
    # Broker owns idle unload when sharing — keep daemon keep_alive short.
    if sharing and not os.getenv("OLLAMA_KEEP_ALIVE", "").strip():
        idle = os.getenv("AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS", "120").strip() or "120"
        env["OLLAMA_KEEP_ALIVE"] = idle

    # Background daemon: do not inherit logs (GPU discovery, GIN, etc.). Pull shows progress.
    # Windows: Job Object kill-on-close so force-killing the sidecar also reaps Ollama runners.
    # POSIX: new session so we can killpg on exit.
    proc, job = spawn_ollama_serve(argv=["ollama", "serve"], env=env)
    from urllib.parse import urlparse

    parsed = urlparse(daemon_host if "://" in daemon_host else f"http://{daemon_host}")
    port = parsed.port or 11434
    _workflow_ollama_register_serve(daemon_host, proc, job=job, port=port)

    timeout_seconds = 30
    start = time.time()
    while time.time() - start < timeout_seconds:
        if is_ollama_healthy(daemon_host):
            break
        time.sleep(1)
    else:
        raise RuntimeError(
            "Ollama server did not become ready in time. "
            "Start it manually with 'ollama serve' and retry."
        )

    if sharing:
        _start_resource_broker_process(public_host=public_host, upstream=daemon_host)
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            if is_ollama_healthy(public_host):
                os.environ["OLLAMA_API_BASE"] = public_host
                return
            time.sleep(0.5)
        raise RuntimeError(
            f"Ollama resource broker did not become ready at {public_host}. "
            "Check AGENTIC_OLLAMA_UPSTREAM / AGENTIC_OLLAMA_BROKER_PORT."
        )


def _start_resource_broker_process(*, public_host: str, upstream: str) -> None:
    """Spawn ``python -m orchestration.ollama_resource_broker`` in front of the daemon."""
    from orchestration.ollama_serve_lifecycle import register_broker, spawn_broker_process

    parsed_pub = urlparse(public_host if "://" in public_host else f"http://{public_host}")
    listen_host = parsed_pub.hostname or "127.0.0.1"
    # Bind loopback when clients use 127.0.0.1; otherwise honor broker host env.
    from orchestration.ollama_resource_manager import broker_listen_host, broker_listen_port

    bind_host = listen_host if listen_host not in ("0.0.0.0",) else broker_listen_host()
    bind_port = parsed_pub.port or broker_listen_port()

    env = os.environ.copy()
    env["AGENTIC_OLLAMA_RESOURCE_SHARING"] = "1"
    env["AGENTIC_OLLAMA_UPSTREAM"] = normalize_ollama_host(upstream)
    env["AGENTIC_OLLAMA_BROKER_HOST"] = bind_host
    env["AGENTIC_OLLAMA_BROKER_PORT"] = str(bind_port)
    proc = spawn_broker_process(env=env)
    register_broker(public_host, proc)



def _iter_ollama_pull_ndjson(
    resp: Any,
    *,
    cancel_event: threading.Event | None = None,
    model: str = "",
) -> Iterator[dict[str, Any]]:
    while True:
        _raise_if_pull_cancelled(cancel_event or threading.Event(), model)
        raw_b = resp.readline()
        if not raw_b:
            break
        _raise_if_pull_cancelled(cancel_event or threading.Event(), model)
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


def _consume_api_pull_stream(
    resp: Any,
    *,
    model: str,
    cancel_event: threading.Event,
) -> None:
    iterator = _iter_ollama_pull_ndjson(resp, cancel_event=cancel_event, model=model)
    if not _ollama_cli_inherit_stdio():
        if not _ollama_pull_progress_stderr_enabled():
            for obj in iterator:
                _format_api_pull_progress_display_line(obj, model=model)
            return
        _emit_pull_progress_line(f"ollama pull: starting {model}")
        for obj in iterator:
            pl = _format_api_pull_progress_display_line(obj, model=model)
            if pl:
                norm = _normalize_ollama_pull_display_line(pl + "\n")
                if norm:
                    _emit_pull_progress_line(f"ollama pull: {norm}")
        _emit_pull_progress_line(f"ollama pull: complete {model}")
        return

    def progress_lines() -> Iterator[str]:
        for obj in iterator:
            pl = _format_api_pull_progress_display_line(obj, model=model)
            if pl:
                yield pl + "\n"

    _rewrite_ollama_pull_to_single_line(progress_lines())  # type: ignore[arg-type]


def _pull_ollama_model_via_http_api(
    model: str,
    host: str,
    *,
    cancel_event: threading.Event | None = None,
    connection_id: str | None = None,
) -> None:
    """Pull via POST /api/pull so the daemon at `host` downloads into its own model dir.

    That matches inference (same `OLLAMA_HOST`), whereas a local `ollama pull` subprocess
    can still interact with a different Ollama home (e.g. root `~/.ollama`) if another
    `ollama serve` is bound to the address or the CLI resolves storage differently.
    Closing the HTTP stream (cancel) aborts the daemon-side transfer the same way
    Ctrl+C aborts ``ollama pull``.
    """
    event = _pull_cancel_event(cancel_event)
    _register_active_pull(
        model=model,
        host=host,
        cancel_event=event,
        connection_id=connection_id,
    )
    url = f"{host.rstrip('/')}/api/pull"
    body = json.dumps({"model": model, "stream": True}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    resp = None
    try:
        _raise_if_pull_cancelled(event, model)
        resp = urllib.request.urlopen(req, timeout=None)
        _set_active_pull_handle(closer=resp.close)
        _consume_api_pull_stream(resp, model=model, cancel_event=event)
    except OllamaPullCancelled:
        _emit_pull_progress_line(f"ollama pull: cancelled {model}")
        raise
    except urllib.error.HTTPError as exc:
        if event.is_set():
            raise OllamaPullCancelled(model) from exc
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
        if event.is_set():
            raise OllamaPullCancelled(model) from exc
        raise RuntimeError(
            f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
        ) from exc
    finally:
        if resp is not None:
            try:
                resp.close()
            except Exception:  # noqa: BLE001
                pass
        _clear_active_pull()


def pull_ollama_model(
    model: str,
    host: str,
    *,
    cancel_event: threading.Event | None = None,
    connection_id: str | None = None,
) -> None:
    cache_key = f"{host.rstrip('/')}\0{model}"
    if cache_key in _ollama_pull_done:
        return

    base = host.rstrip("/")
    if base.lower().startswith("http://") or base.lower().startswith("https://"):
        _pull_ollama_model_via_http_api(
            model,
            base,
            cancel_event=cancel_event,
            connection_id=connection_id,
        )
        _ollama_pull_done.add(cache_key)
        return

    env = os.environ.copy()
    env["OLLAMA_HOST"] = host
    event = _pull_cancel_event(cancel_event)
    _register_active_pull(
        model=model,
        host=host,
        cancel_event=event,
        connection_id=connection_id,
    )

    def _run_cli_pull(*, capture: bool) -> None:
        try:
            proc = subprocess.Popen(
                ["ollama", "pull", model],
                env=env,
                stdout=subprocess.PIPE if capture else None,
                stderr=subprocess.STDOUT if capture else None,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )
        except Exception as exc:  # noqa: BLE001
            if capture:
                _emit_pull_progress_line(f"ollama pull: failed to start ({model})")
            raise RuntimeError(
                f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
            ) from exc
        _set_active_pull_handle(closer=proc.terminate, proc=proc)
        assert proc.stdout is not None or not capture
        try:
            if capture:
                _emit_pull_progress_line(f"ollama pull: starting {model}")
                assert proc.stdout is not None
                for raw in proc.stdout:
                    _raise_if_pull_cancelled(event, model)
                    line = _normalize_ollama_pull_display_line(raw)
                    if line:
                        _emit_pull_progress_line(f"ollama pull: {line}")
            else:
                while proc.poll() is None:
                    _raise_if_pull_cancelled(event, model)
                    time.sleep(0.2)
        except OllamaPullCancelled:
            try:
                proc.terminate()
            except Exception:  # noqa: BLE001
                pass
            _emit_pull_progress_line(f"ollama pull: cancelled {model}")
            raise
        finally:
            rc = proc.wait()
        if event.is_set():
            raise OllamaPullCancelled(model)
        if rc != 0:
            if capture:
                _emit_pull_progress_line(f"ollama pull: failed ({model})")
            raise RuntimeError(
                f"Failed to pull Ollama model '{model}'. Check model name and Ollama status."
            )
        if capture:
            _emit_pull_progress_line(f"ollama pull: complete {model}")

    try:
        if not _ollama_cli_inherit_stdio():
            _run_cli_pull(capture=_ollama_pull_progress_stderr_enabled())
        else:
            _run_cli_pull(capture=True)
        _ollama_pull_done.add(cache_key)
    finally:
        _clear_active_pull()


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
        from orchestration.session_overlay_runtime import (
            ensure_client_agent_ollama_runtime,
            resolve_overlay_ollama_host,
        )

        pid = str(self.config.id or "").strip()
        if pid.startswith("client."):
            host = resolve_overlay_ollama_host(
                {
                    "id": pid,
                    "type": "ollama",
                    "ollama_host": self.config.ollama_host,
                }
            )
            os.environ["OLLAMA_HOST"] = host
            ensure_client_agent_ollama_runtime(
                {
                    "id": pid,
                    "type": "ollama",
                    "model": self.config.model,
                    "ollama_host": host,
                    "selfcontained": self.config.selfcontained,
                }
            )
            return

        host = normalize_ollama_host(
            self.config.ollama_host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        )
        if str(self.config.ollama_host or "").strip().casefold() == "workflow":
            host = litellm_api_base_for_ollama()
        os.environ["OLLAMA_HOST"] = host

        from orchestration.runtime_bootstrap import should_ensure_ollama

        if should_ensure_ollama(selfcontained=self.config.selfcontained):
            model = self.config.model.removeprefix("ollama/")
            ensure_ollama_runtime(model=model, host=host)

    def health_check(self) -> None:
        host = normalize_ollama_host(
            self.config.ollama_host or os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        )
        if str(self.config.ollama_host or "").strip().casefold() == "workflow":
            host = litellm_api_base_for_ollama()
        if not is_ollama_healthy(host):
            raise RuntimeError(
                f"Ollama is not reachable at {host}. "
                "Start the server, set selfcontained: true, "
                "or enable AGENTIC_AUTO_ENSURE_RUNTIME=1 (default) so the agent installs/starts Ollama."
            )

    def build_agent(
        self,
        *,
        mcps: Sequence[Any] | None = None,
        skill_backstory_blocks: Sequence[tuple[str, str]] | None = None,
        role_suffix: str | None = None,
    ) -> Agent:
        from orchestration.fetch_url_tool import (
            attach_fetch_url_tool_to_agents,
            partition_fetch_stdio_mcps,
        )
        from orchestration.mcp_stdio_hygiene import (
            drop_failed_stdio_mcps_on_agent,
            drop_stdio_mcps_that_fail_handshake,
            prepare_stdio_mcps,
        )

        raw_model = self.config.model
        model_without_prefix = raw_model.removeprefix("ollama/")
        model = f"ollama/{model_without_prefix}"
        os.environ.setdefault("OLLAMA_API_BASE", litellm_api_base_for_ollama())

        mcps_list = list(mcps) if mcps else []
        other_mcps, fetch_stdio = partition_fetch_stdio_mcps(mcps_list)
        fetch_tool_needed = bool(fetch_stdio)
        other_mcps = drop_stdio_mcps_that_fail_handshake(prepare_stdio_mcps(other_mcps))
        effective_mcps = other_mcps or None

        # Force LiteLLM path so Admin usage callbacks fire. CrewAI's native
        # Ollama provider (is_litellm=False) bypasses litellm.callbacks entirely.
        llm_kwargs: dict[str, Any] = {
            "model": model,
            "api_base": litellm_api_base_for_ollama(),
            "is_litellm": True,
        }
        # Optional per-agent context cap from YAML (lands in provider_options).
        # LiteLLM maps num_ctx into Ollama's options payload.
        raw_num_ctx = self.config.provider_options.get("num_ctx")
        if raw_num_ctx is not None and str(raw_num_ctx).strip() != "":
            try:
                llm_kwargs["num_ctx"] = int(raw_num_ctx)
            except (TypeError, ValueError):
                pass
        llm = LLM(**llm_kwargs)

        kwargs: dict[str, Any] = dict(
            role=self.crew_agent_role_label(role_suffix),
            goal=self.config.goal,
            backstory=resolve_agent_backstory(
                self.config.backstory,
                mcps=mcps_list if mcps_list else None,
                skill_backstory_blocks=skill_backstory_blocks,
            ),
            llm=llm,
            verbose=self.config.verbose,
            allow_delegation=self.config.allow_delegation,
            max_iter=_ollama_max_iter(),
        )
        if effective_mcps:
            kwargs["mcps"] = list(effective_mcps)
        agent = Agent(**kwargs)
        drop_failed_stdio_mcps_on_agent(agent)
        if fetch_tool_needed:
            attach_fetch_url_tool_to_agents([agent])
        return agent

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
