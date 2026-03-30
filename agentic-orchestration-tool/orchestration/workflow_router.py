from __future__ import annotations

import json
import re
from typing import Any

import httpx

from orchestration.catalog_loader import WorkflowCatalogEntry


def _normalize_router_host(host: str) -> str:
    host = host.strip().rstrip("/")
    if not host.startswith("http://") and not host.startswith("https://"):
        host = f"http://{host}"
    return host


def _format_catalog_for_prompt(entries: list[WorkflowCatalogEntry]) -> str:
    lines: list[str] = []
    for e in entries:
        lines.append(f"- id: {e.id}")
        lines.append(f"  summary: {e.summary}")
        lines.append(f"  description: {e.description}")
        lines.append(f"  good_for: {', '.join(e.good_for)}")
        lines.append("")
    return "\n".join(lines).strip()


def _extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def select_workflow_with_ollama(
    *,
    user_task: str,
    entries: list[WorkflowCatalogEntry],
    ollama_host: str,
    model: str,
    timeout: float = 120.0,
) -> tuple[str, str]:
    """Call Ollama chat API; return (catalog workflow id, short reason)."""
    if not entries:
        raise ValueError("No workflows in catalog.")

    host = _normalize_router_host(ollama_host)
    catalog_block = _format_catalog_for_prompt(entries)
    allowed_ids = ", ".join(repr(e.id) for e in entries)

    system_instructions = (
        "You are a workflow router. Given the user's task and a list of workflows, "
        "choose exactly one workflow id that best fits the task. "
        "Respond with a single JSON object only, no markdown, no extra text. "
        'Schema: {"workflow_id": "<id>", "reason": "<one short sentence>"}\n'
        f"The workflow_id MUST be one of: {allowed_ids}"
    )

    user_message = (
        "Available workflows:\n\n"
        f"{catalog_block}\n\n"
        "User task:\n"
        f"{user_task.strip()}\n"
    )

    payload = {
        "model": model.removeprefix("ollama/"),
        "messages": [
            {"role": "system", "content": system_instructions},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
    }

    with httpx.Client(timeout=timeout) as client:
        response = client.post(f"{host}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()

    message = data.get("message") or {}
    content = message.get("content", "")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Ollama returned an empty message.")

    try:
        parsed = _extract_json_object(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Router model did not return valid JSON. Raw output:\n{content!r}"
        ) from exc

    workflow_id = str(parsed.get("workflow_id", "")).strip()
    if not workflow_id:
        raise RuntimeError(f"Router JSON missing workflow_id: {parsed!r}")

    valid_ids = {e.id for e in entries}
    if workflow_id not in valid_ids:
        raise RuntimeError(
            f"Router chose unknown workflow_id {workflow_id!r}. "
            f"Valid ids: {sorted(valid_ids)}"
        )

    reason = str(parsed.get("reason", "")).strip()
    return workflow_id, reason
