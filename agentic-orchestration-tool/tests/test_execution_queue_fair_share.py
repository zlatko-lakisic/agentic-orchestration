"""Fair-share quota tests."""

from __future__ import annotations

import pytest

from orchestration.execution_queue_fair_share import FairShareTracker, QueueQuota


@pytest.mark.unit
def test_tenant_concurrent_cap() -> None:
    tracker = FairShareTracker()
    quota = QueueQuota(max_concurrent_runs=1)
    tracker.record_active("app-a", phase="execution", delta=1)
    reason = tracker.check_quota("app-a", quota, phase="execution")
    assert reason == "quota_concurrent"


@pytest.mark.unit
def test_other_tenant_still_admits() -> None:
    tracker = FairShareTracker()
    quota = QueueQuota(max_concurrent_runs=1)
    tracker.record_active("app-a", phase="execution", delta=1)
    reason = tracker.check_quota("app-b", quota, phase="execution")
    assert reason is None
