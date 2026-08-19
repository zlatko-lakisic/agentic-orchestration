"""Thin Prometheus metrics for the engine daemon (optional ``prometheus_client``)."""

from __future__ import annotations

import os
import time
from typing import Any

_RUNS: dict[str, int] = {"true": 0, "false": 0}
_RUN_DURATION_SUM = 0.0
_RUN_DURATION_COUNT = 0
_STEP_FAILURES = 0
_OLLAMA_EVICTIONS = 0
_OLLAMA_ADMITS = 0
_OLLAMA_REJECTS = 0
_OLLAMA_QUEUE_DEPTH = 0
_EQ_ADMITS = 0
_EQ_REJECTS = 0
_EQ_PREEMPTS = 0
_EQ_WAIT_SUM = 0.0
_EQ_WAIT_COUNT = 0
_EQ_DEPTH: dict[str, int] = {}
_WARM_POOL_REPLICAS = 0

_PROM = None
_prom_runs = None
_prom_duration = None
_prom_step_failures = None
_prom_ollama_evictions = None
_prom_ollama_admits = None
_prom_ollama_rejects = None
_prom_ollama_queue = None
_prom_eq_depth = None
_prom_eq_admits = None
_prom_eq_rejects = None
_prom_eq_preempts = None
_prom_eq_wait = None
_prom_warm_pool_replicas = None


def _init_prom() -> None:
    global _PROM, _prom_runs, _prom_duration, _prom_step_failures
    global _prom_ollama_evictions, _prom_ollama_admits, _prom_ollama_rejects, _prom_ollama_queue
    global _prom_eq_depth, _prom_eq_admits, _prom_eq_rejects, _prom_eq_preempts, _prom_eq_wait
    global _prom_warm_pool_replicas
    if _PROM is not None:
        return
    try:
        from prometheus_client import Counter, Gauge, Histogram, REGISTRY

        _PROM = REGISTRY
        _prom_runs = Counter(
            "ao_runs_total",
            "Engine WS / dynamic runs completed",
            ["ok"],
        )
        _prom_duration = Histogram(
            "ao_run_duration_seconds",
            "Engine run wall time in seconds",
            buckets=(0.5, 1, 2, 5, 15, 30, 60, 120, 300, 600, 1800),
        )
        _prom_step_failures = Counter(
            "ao_step_failures_total",
            "Distributed step failures observed by the engine process",
        )
        _prom_ollama_evictions = Counter(
            "ao_ollama_evictions_total",
            "Ollama models unloaded by the resource broker",
        )
        _prom_ollama_admits = Counter(
            "ao_ollama_admits_total",
            "Ollama inference leases granted by the resource broker",
        )
        _prom_ollama_rejects = Counter(
            "ao_ollama_rejects_total",
            "Ollama inference leases rejected (queue full / timeout)",
        )
        _prom_ollama_queue = Gauge(
            "ao_ollama_queue_depth",
            "Current Ollama resource broker queue depth",
        )
        _prom_eq_depth = Gauge(
            "ao_execution_queue_depth",
            "Global execution queue pending depth",
            ["phase"],
        )
        _prom_eq_admits = Counter(
            "ao_execution_queue_admits_total",
            "Global execution queue admissions",
            ["phase"],
        )
        _prom_eq_rejects = Counter(
            "ao_execution_queue_rejects_total",
            "Global execution queue rejections",
            ["code"],
        )
        _prom_eq_preempts = Counter(
            "ao_execution_queue_preempt_total",
            "Global execution queue preemptions",
        )
        _prom_eq_wait = Histogram(
            "ao_execution_queue_wait_seconds",
            "Global execution queue wait time",
            buckets=(0.1, 0.5, 1, 2, 5, 15, 30, 60, 120, 300, 600),
        )
        _prom_warm_pool_replicas = Gauge(
            "ao_warm_pool_replicas",
            "Warm-pool deployment replica count (autoscale target)",
        )
    except Exception:  # noqa: BLE001
        _PROM = False


def record_execution_queue_admit(*, phase: str) -> None:
    global _EQ_ADMITS
    _init_prom()
    _EQ_ADMITS += 1
    if _PROM and _prom_eq_admits is not None:
        _prom_eq_admits.labels(phase=str(phase or "unknown")).inc()


def record_execution_queue_reject(*, code: str) -> None:
    global _EQ_REJECTS
    _init_prom()
    _EQ_REJECTS += 1
    if _PROM and _prom_eq_rejects is not None:
        _prom_eq_rejects.labels(code=str(code or "unknown")).inc()


def record_execution_queue_preempt() -> None:
    global _EQ_PREEMPTS
    _init_prom()
    _EQ_PREEMPTS += 1
    if _PROM and _prom_eq_preempts is not None:
        _prom_eq_preempts.inc()


def record_execution_queue_wait(*, phase: str, wait_ms: float) -> None:
    global _EQ_WAIT_SUM, _EQ_WAIT_COUNT
    _init_prom()
    seconds = max(0.0, float(wait_ms) / 1000.0)
    _EQ_WAIT_SUM += seconds
    _EQ_WAIT_COUNT += 1
    if _PROM and _prom_eq_wait is not None:
        _prom_eq_wait.observe(seconds)


def record_execution_queue_depth(*, phase: str, depth: int) -> None:
    global _EQ_DEPTH
    _init_prom()
    key = str(phase or "unknown")
    _EQ_DEPTH[key] = max(0, int(depth))
    if _PROM and _prom_eq_depth is not None:
        _prom_eq_depth.labels(phase=key).set(_EQ_DEPTH[key])


def record_warm_pool_replicas(replicas: int) -> None:
    global _WARM_POOL_REPLICAS
    _init_prom()
    _WARM_POOL_REPLICAS = max(0, int(replicas))
    if _PROM and _prom_warm_pool_replicas is not None:
        _prom_warm_pool_replicas.set(_WARM_POOL_REPLICAS)


def record_ollama_resource_stats(
    *,
    evictions: int | None = None,
    admits: int | None = None,
    rejects: int | None = None,
    queue_depth: int | None = None,
) -> None:
    """Update Ollama resource-sharing counters (broker / health scrape)."""
    global _OLLAMA_EVICTIONS, _OLLAMA_ADMITS, _OLLAMA_REJECTS, _OLLAMA_QUEUE_DEPTH
    _init_prom()
    if evictions is not None:
        _OLLAMA_EVICTIONS = max(_OLLAMA_EVICTIONS, int(evictions))
        if _PROM and _prom_ollama_evictions is not None:
            # Absolute counter from broker status — observe delta-ish via set pattern:
            pass
    if admits is not None:
        _OLLAMA_ADMITS = max(_OLLAMA_ADMITS, int(admits))
    if rejects is not None:
        _OLLAMA_REJECTS = max(_OLLAMA_REJECTS, int(rejects))
    if queue_depth is not None:
        _OLLAMA_QUEUE_DEPTH = max(0, int(queue_depth))
        if _PROM and _prom_ollama_queue is not None:
            _prom_ollama_queue.set(_OLLAMA_QUEUE_DEPTH)


def record_run_end(*, ok: bool, elapsed_ms: float | None = None) -> None:
    """Increment run counters (and duration when ``elapsed_ms`` is known)."""
    _init_prom()
    key = "true" if ok else "false"
    _RUNS[key] = int(_RUNS.get(key, 0)) + 1
    seconds = None
    if elapsed_ms is not None:
        try:
            seconds = max(0.0, float(elapsed_ms) / 1000.0)
        except (TypeError, ValueError):
            seconds = None
    if seconds is not None:
        global _RUN_DURATION_SUM, _RUN_DURATION_COUNT
        _RUN_DURATION_SUM += seconds
        _RUN_DURATION_COUNT += 1
    if _PROM and _prom_runs is not None:
        _prom_runs.labels(ok=key).inc()
        if seconds is not None and _prom_duration is not None:
            _prom_duration.observe(seconds)


def record_step_failure() -> None:
    global _STEP_FAILURES
    _init_prom()
    _STEP_FAILURES += 1
    if _PROM and _prom_step_failures is not None:
        _prom_step_failures.inc()


def metrics_payload() -> tuple[bytes, str]:
    """Return ``(body, content_type)`` for ``GET /metrics``."""
    _init_prom()
    if _PROM:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

        return generate_latest(_PROM), CONTENT_TYPE_LATEST
    lines = [
        "# HELP ao_runs_total Engine WS / dynamic runs completed",
        "# TYPE ao_runs_total counter",
        f'ao_runs_total{{ok="true"}} {_RUNS.get("true", 0)}',
        f'ao_runs_total{{ok="false"}} {_RUNS.get("false", 0)}',
        "# HELP ao_run_duration_seconds_sum Engine run wall time (fallback exporter)",
        "# TYPE ao_run_duration_seconds_sum counter",
        f"ao_run_duration_seconds_sum {_RUN_DURATION_SUM}",
        f"ao_run_duration_seconds_count {_RUN_DURATION_COUNT}",
        "# HELP ao_step_failures_total Distributed step failures",
        "# TYPE ao_step_failures_total counter",
        f"ao_step_failures_total {_STEP_FAILURES}",
        "# HELP ao_ollama_evictions_total Ollama models unloaded by resource broker",
        "# TYPE ao_ollama_evictions_total counter",
        f"ao_ollama_evictions_total {_OLLAMA_EVICTIONS}",
        "# HELP ao_ollama_admits_total Ollama inference leases granted",
        "# TYPE ao_ollama_admits_total counter",
        f"ao_ollama_admits_total {_OLLAMA_ADMITS}",
        "# HELP ao_ollama_rejects_total Ollama inference leases rejected",
        "# TYPE ao_ollama_rejects_total counter",
        f"ao_ollama_rejects_total {_OLLAMA_REJECTS}",
        "# HELP ao_ollama_queue_depth Current Ollama resource broker queue depth",
        "# TYPE ao_ollama_queue_depth gauge",
        f"ao_ollama_queue_depth {_OLLAMA_QUEUE_DEPTH}",
        "# HELP ao_execution_queue_admits_total Global execution queue admissions",
        "# TYPE ao_execution_queue_admits_total counter",
        f"ao_execution_queue_admits_total {_EQ_ADMITS}",
        "# HELP ao_execution_queue_rejects_total Global execution queue rejections",
        "# TYPE ao_execution_queue_rejects_total counter",
        f"ao_execution_queue_rejects_total {_EQ_REJECTS}",
        "# HELP ao_execution_queue_preempt_total Global execution queue preemptions",
        "# TYPE ao_execution_queue_preempt_total counter",
        f"ao_execution_queue_preempt_total {_EQ_PREEMPTS}",
        "# HELP ao_warm_pool_replicas Warm-pool deployment replicas",
        "# TYPE ao_warm_pool_replicas gauge",
        f"ao_warm_pool_replicas {_WARM_POOL_REPLICAS}",
        "",
    ]
    return ("\n".join(lines)).encode("utf-8"), "text/plain; version=0.0.4; charset=utf-8"


def maybe_init_sentry() -> dict[str, Any]:
    """Opt-in Sentry via ``AGENTIC_SENTRY_DSN`` (requires ``sentry-sdk``)."""
    dsn = os.getenv("AGENTIC_SENTRY_DSN", "").strip()
    if not dsn:
        return {"enabled": False}
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=0.0,
            send_default_pii=False,
        )
        return {"enabled": True}
    except Exception as exc:  # noqa: BLE001
        return {"enabled": False, "error": str(exc)}
