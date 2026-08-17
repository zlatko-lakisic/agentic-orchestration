"""Unit tests for VRAM-aware Ollama resource manager."""

from __future__ import annotations

import threading
import time
from typing import Any

import pytest

from orchestration import ollama_resource_manager as orm


class _FakeResp:
    def __init__(self, payload: Any, *, ok: bool = True, status: int = 200) -> None:
        self._payload = payload
        self.is_success = ok
        self.status_code = status

    def json(self) -> Any:
        return self._payload


class _FakeClient:
    def __init__(self) -> None:
        self.loaded: list[dict[str, Any]] = []
        self.unloads: list[str] = []
        self.posts: list[dict[str, Any]] = []

    def get(self, url: str) -> _FakeResp:
        if url.endswith("/api/ps"):
            return _FakeResp({"models": list(self.loaded)})
        return _FakeResp({}, ok=False, status=404)

    def post(self, url: str, json: dict[str, Any]) -> _FakeResp:
        self.posts.append(json)
        if url.endswith("/api/generate") and json.get("keep_alive") == 0:
            model = str(json.get("model") or "")
            self.unloads.append(model)
            key = model.casefold()
            self.loaded = [
                m
                for m in self.loaded
                if str(m.get("name") or m.get("model") or "").casefold() != key
            ]
            return _FakeResp({"done": True})
        return _FakeResp({"done": True})

    def close(self) -> None:
        return None


@pytest.fixture(autouse=True)
def _reset(monkeypatch: pytest.MonkeyPatch) -> None:
    orm.reset_resource_manager_for_tests()
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "1")
    monkeypatch.setenv("AGENTIC_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_RESIDENT_HEADROOM_GB", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS", "30")
    monkeypatch.setenv("AGENTIC_OLLAMA_QUEUE_WAIT_SECONDS", "2")
    monkeypatch.setenv("AGENTIC_OLLAMA_QUEUE_MAX", "8")
    yield
    orm.reset_resource_manager_for_tests()


@pytest.mark.unit
def test_normalize_and_path_helpers() -> None:
    assert orm.normalize_model_tag("ollama/qwen2.5:3b") == "qwen2.5:3b"
    assert orm.path_needs_admission("/api/chat") is True
    assert orm.path_needs_admission("/api/tags") is False
    assert orm.extract_model_from_body({"model": "ollama/a:1b"}) == "a:1b"


@pytest.mark.unit
def test_same_model_concurrent_admits(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _FakeClient()
    client.loaded = [{"name": "a:1b", "size_vram": 2 * 1024**3}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)
    a = mgr.acquire("a:1b")
    b = mgr.acquire("a:1b")
    assert mgr.status()["active"]["a:1b"] == 2
    mgr.release(a)
    mgr.release(b)
    assert "a:1b" not in mgr.status()["active"]


@pytest.mark.unit
def test_never_evict_active_model(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _FakeClient()
    # 14 GiB model fills the 15 GiB budget (16-1 headroom).
    client.loaded = [{"name": "big:7b", "size_vram": int(14 * 1024**3)}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)
    lease = mgr.acquire("big:7b")
    assert mgr.unload_model("big:7b") is False
    assert client.unloads == []
    mgr.release(lease)


@pytest.mark.unit
def test_evict_idle_then_admit_other(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _FakeClient()
    # 12 GiB idle + ~8 GiB for a 7b model exceeds the 15 GiB budget.
    client.loaded = [{"name": "idle:3b", "size_vram": int(12 * 1024**3)}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)
    lease = mgr.acquire("other:7b")
    assert "idle:3b" in client.unloads
    assert lease.model == "other:7b"
    mgr.release(lease)


@pytest.mark.unit
def test_fifo_queue_waits_for_active(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _FakeClient()
    client.loaded = [{"name": "a:7b", "size_vram": int(14 * 1024**3)}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)
    first = mgr.acquire("a:7b")

    results: list[str] = []
    errors: list[BaseException] = []

    def waiter() -> None:
        try:
            lease = mgr.acquire("b:7b", timeout_seconds=3)
            results.append(lease.model)
            mgr.release(lease)
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    t = threading.Thread(target=waiter, daemon=True)
    t.start()
    time.sleep(0.2)
    st = mgr.status()
    assert st["queueDepth"] == 1
    assert st["queued"][0]["model"] == "b:7b"
    # Active model must still be loaded while queued.
    assert any(m.get("name") == "a:7b" for m in client.loaded)
    mgr.release(first)
    t.join(timeout=3)
    assert not errors
    assert results == ["b:7b"]
    assert "a:7b" in client.unloads


@pytest.mark.unit
def test_queue_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _FakeClient()
    client.loaded = [{"name": "a:7b", "size_vram": int(14 * 1024**3)}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)
    lease = mgr.acquire("a:7b")
    with pytest.raises(TimeoutError):
        mgr.acquire("b:7b", timeout_seconds=0.3)
    mgr.release(lease)


@pytest.mark.unit
def test_idle_reconcile_unloads(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _FakeClient()
    client.loaded = [{"name": "stale:1b", "size_vram": int(2 * 1024**3)}]
    clock = {"t": 1000.0}

    def now() -> float:
        return clock["t"]

    mgr = orm.OllamaResourceManager(
        upstream_base="http://u", http_client=client, clock=now
    )
    # Mark last_used in the past via acquire/release.
    lease = mgr.acquire("stale:1b")
    mgr.release(lease)
    clock["t"] = 1000.0 + 60.0
    unloaded = mgr.reconcile_idle()
    assert unloaded == ["stale:1b"]
    assert "stale:1b" in client.unloads


@pytest.mark.unit
def test_unknown_vram_one_model_at_a_time(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTIC_VRAM_GB", raising=False)
    monkeypatch.delenv("AGENTIC_ASSUME_VRAM_GB", raising=False)
    monkeypatch.setattr(
        "orchestration.hardware_profile.detect_vram_gb_available", lambda: None
    )
    client = _FakeClient()
    client.loaded = [{"name": "a:1b", "size_vram": int(2 * 1024**3)}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)
    lease = mgr.acquire("a:1b")
    assert mgr.can_admit("b:1b", loaded=client.loaded) is False
    mgr.release(lease)
    # Idle a can be evicted for b.
    assert mgr.can_admit("b:1b", loaded=client.loaded) is True


@pytest.mark.unit
def test_keepalive_disabled_when_sharing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_KEEPALIVE", "1")
    monkeypatch.delenv("AGENTIC_OLLAMA_KEEPALIVE_WITH_SHARING", raising=False)
    from orchestration import ollama_keepalive as ok

    assert ok.ollama_keepalive_enabled() is False
