from __future__ import annotations

import json
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from orchestration.backends.base import StepResult


class RunStore(ABC):
    @abstractmethod
    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None: ...

    @abstractmethod
    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None: ...

    @abstractmethod
    def step_result_path(self, run_id: str, step_id: str) -> Path: ...


class FileSystemRunStore(RunStore):
    def __init__(self, root: Path) -> None:
        self._root = root

    def _run_dir(self, run_id: str) -> Path:
        return self._root / run_id

    def step_result_path(self, run_id: str, step_id: str) -> Path:
        return self._run_dir(run_id) / step_id / "result.json"

    def write_step_result(self, run_id: str, step_id: str, result: StepResult) -> None:
        path = self.step_result_path(run_id, step_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")

    def read_step_result(self, run_id: str, step_id: str) -> StepResult | None:
        path = self.step_result_path(run_id, step_id)
        if not path.is_file():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return StepResult(
            run_id=str(data.get("run_id", run_id)),
            step_id=str(data.get("step_id", step_id)),
            exit_code=int(data.get("exit_code", 1)),
            result_text=data.get("result_text"),
            error=data.get("error"),
            recoverable=bool(data.get("recoverable", False)),
            recovery_hint=data.get("recovery_hint"),
        )


def new_run_id() -> str:
    return uuid.uuid4().hex
