"""Deterministic regressions for lease races in the Ollama and GPU residency managers."""

from __future__ import annotations

import threading
import time
from typing import Any

import pytest

from orchestration import gpu_residency as gr
from orchestration import ollama_resource_manager as orm


class _FakeResp:
    def __init__(self, payload: Any, *, ok: bool = True, status: int = 200) -> None:
        self._payload = payload
        self.is_success = ok
        self.status_code = status

    def json(self) -> Any:
        return self._payload


class _FakeOllama:
    def __init__(self) -> None:
        self.loaded: list[dict[str, Any]] = []
        self.unloads: list[str] = []

    def get(self, url: str) -> _FakeResp:
        if url.endswith("/api/ps"):
            return _FakeResp({"models": list(self.loaded)})
        return _FakeResp({}, ok=False, status=404)

    def post(self, url: str, json: dict[str, Any]) -> _FakeResp:
        if url.endswith("/api/generate") and json.get("keep_alive") == 0:
            model = str(json.get("model") or "")
            self.unloads.append(model)
            self.loaded = [m for m in self.loaded if str(m.get("name") or "") != model]
        return _FakeResp({"done": True})

    def close(self) -> None:
        return None


@pytest.fixture()
def ollama_env(monkeypatch: pytest.MonkeyPatch) -> None:
    orm.reset_resource_manager_for_tests()
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "1")
    monkeypatch.setenv("AGENTIC_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_RESIDENT_HEADROOM_GB", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_IDLE_UNLOAD_SECONDS", "30")
    monkeypatch.setenv("AGENTIC_OLLAMA_QUEUE_WAIT_SECONDS", "8")
    monkeypatch.setenv("AGENTIC_OLLAMA_QUEUE_MAX", "8")
    yield
    orm.reset_resource_manager_for_tests()


@pytest.mark.unit
@pytest.mark.timeout(60)
def test_queued_waiter_is_not_granted_twice(ollama_env: None) -> None:
    """Release-side drain and the waiter's own re-poll both passed ``can_admit``
    off the lock and both granted: one request ended up holding two leases, so
    the model stayed "active" forever (no unload, other models starved)."""
    client = _FakeOllama()
    client.loaded = [{"name": "a:7b", "size_vram": int(14 * 1024**3)}]
    mgr = orm.OllamaResourceManager(upstream_base="http://u", http_client=client)

    lease_a = mgr.acquire("a:7b")

    got: dict[str, Any] = {}
    errors: list[BaseException] = []

    def waiter() -> None:
        try:
            got["lease"] = mgr.acquire("b:7b")
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    w_thread = threading.Thread(target=waiter, name="waiter-b")
    w_in_window = threading.Event()
    drain_done = threading.Event()
    original_evict = mgr._evict_idle_for

    def hooked_evict(model: str, loaded: list[dict[str, Any]]) -> None:
        # Both threads reach this point only after ``can_admit`` succeeded off
        # the lock. Hold the waiter here until the release-side drain granted.
        if threading.current_thread() is w_thread:
            w_in_window.set()
            assert drain_done.wait(10)
        else:
            assert w_in_window.wait(10)
        original_evict(model, loaded)

    mgr._evict_idle_for = hooked_evict  # type: ignore[method-assign]

    w_thread.start()
    # Waiter is queued behind the active model.
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline and mgr.local_status()["queueDepth"] != 1:
        time.sleep(0.01)
    assert mgr.local_status()["queueDepth"] == 1

    mgr.release(lease_a)  # drains: grants the queued waiter
    drain_done.set()
    w_thread.join(10)
    assert not errors, errors
    assert not w_thread.is_alive()

    assert mgr.local_status()["active"] == {"b:7b": 1}
    mgr.release(got["lease"])
    assert mgr.local_status()["active"] == {}
    # No phantom lease: the model can be unloaded again.
    client.loaded = [{"name": "b:7b", "size_vram": int(8 * 1024**3)}]
    assert mgr.unload_model("b:7b") is True


@pytest.fixture()
def gpu_env(monkeypatch: pytest.MonkeyPatch) -> None:
    gr.reset_gpu_residency_manager_for_tests()
    monkeypatch.setenv("AGENTIC_GPU_RESIDENCY", "1")
    monkeypatch.setenv("AGENTIC_OLLAMA_RESOURCE_SHARING", "0")
    monkeypatch.setenv("AGENTIC_VRAM_GB", "16")
    monkeypatch.setenv("AGENTIC_RESIDENT_HEADROOM_GB", "1")
    monkeypatch.setenv("AGENTIC_GPU_RESIDENCY_QUEUE_WAIT_SECONDS", "6")
    monkeypatch.setattr(gr, "_WAIT_REPOLL_SECONDS", 0.1, raising=False)
    yield
    gr.reset_gpu_residency_manager_for_tests()


@pytest.mark.unit
@pytest.mark.timeout(60)
def test_gpu_waiter_notices_vram_freed_without_a_gpu_release(gpu_env: None) -> None:
    """VRAM freed by Ollama (not by a GPU lease release) never woke the waiter:
    it failed after the full queue wait with VRAM free."""
    mgr = gr.GpuResidencyManager()
    vram_free = threading.Event()
    mgr._fits = lambda need_gb, excluding=None: vram_free.is_set()  # type: ignore[method-assign]
    mgr._evict_idle_ollama = lambda: 0  # type: ignore[method-assign]

    got: dict[str, Any] = {}
    errors: list[BaseException] = []

    def waiter() -> None:
        try:
            got["lease"] = mgr.acquire(provider_id="tts_x", kind="tts", min_vram_gb=4.0)
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    t = threading.Thread(target=waiter)
    t0 = time.monotonic()
    t.start()
    time.sleep(0.3)
    assert "lease" not in got
    vram_free.set()  # e.g. Ollama unloaded a model on its own
    t.join(5)
    assert not errors, errors
    assert got["lease"].provider_id == "tts_x"
    assert time.monotonic() - t0 < 4.0
    mgr.release(got["lease"])
    mgr.close()


@pytest.mark.unit
def test_idle_unload_rechecks_that_the_victim_is_still_idle(gpu_env: None) -> None:
    """A resident picked as an idle victim can become active before the unload runs."""
    mgr = gr.GpuResidencyManager()
    unloads: list[str] = []
    lease = mgr.acquire(
        provider_id="video_x", kind="video", min_vram_gb=4.0, unload=lambda: unloads.append("x")
    )
    mgr.release(lease)
    key = "video_x"
    victim = mgr._residents[key]  # chosen as idle under the lock …

    again = mgr.acquire(provider_id="video_x", kind="video", min_vram_gb=4.0)  # … then re-leased
    assert mgr._unload_resident(key, victim) is False
    assert unloads == []
    assert mgr._residents[key].active == 1

    mgr.release(again)
    assert mgr._unload_resident(key, victim) is True
    assert unloads == ["x"]
    assert key not in mgr._residents
    mgr.close()


@pytest.mark.unit
@pytest.mark.timeout(60)
def test_resident_is_not_leased_while_its_unload_is_running(gpu_env: None) -> None:
    mgr = gr.GpuResidencyManager()
    in_unload, finish_unload = threading.Event(), threading.Event()
    unloads: list[str] = []

    def slow_unload() -> None:
        unloads.append("x")
        in_unload.set()
        assert finish_unload.wait(10)

    lease = mgr.acquire(provider_id="stt_x", kind="stt", min_vram_gb=4.0, unload=slow_unload)
    mgr.release(lease)
    victim = mgr._residents["stt_x"]

    unloader = threading.Thread(target=mgr._unload_resident, args=("stt_x", victim))
    unloader.start()
    assert in_unload.wait(5)

    got: dict[str, Any] = {}

    def acquirer() -> None:
        got["lease"] = mgr.acquire(
            provider_id="stt_x", kind="stt", min_vram_gb=4.0, unload=slow_unload
        )

    t = threading.Thread(target=acquirer)
    t.start()
    time.sleep(0.5)
    # Must wait for the unload instead of leasing weights that are being dropped.
    assert "lease" not in got
    assert victim.active == 0

    finish_unload.set()
    unloader.join(5)
    t.join(5)
    assert got["lease"].provider_id == "stt_x"
    fresh = mgr._residents["stt_x"]
    assert fresh is not victim
    assert fresh.active == 1
    assert unloads == ["x"]
    mgr.release(got["lease"])
    mgr.close()
