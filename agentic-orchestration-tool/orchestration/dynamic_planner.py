from __future__ import annotations

import json
import os
import re
import hashlib
from pathlib import Path
from typing import Any

import httpx

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.providers_catalog import (
    catalog_for_planner_prompt,
    deepcopy_provider,
    load_providers_catalog,
)


def _dynamic_instance_key(user_prompt: str) -> str:
    digest = hashlib.sha256(user_prompt.encode("utf-8")).hexdigest()[:14]
    return f"dynamic-{digest}"


def _normalize_openai_api_base() -> str:
    raw = (
        os.getenv("OPENAI_BASE_URL", "").strip()
        or os.getenv("OPENAI_API_BASE", "").strip()
    )
    if not raw:
        return "https://api.openai.com/v1"
    u = raw.strip().rstrip("/")
    if not u.startswith("http://") and not u.startswith("https://"):
        u = f"http://{u}"
    if not u.endswith("/v1"):
        u = f"{u}/v1"
    return u


def _extract_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if fence:
        t = fence.group(1).strip()
    return json.loads(t)


def _planner_chat_completion(
    *,
    messages: list[dict[str, str]],
    model: str,
) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for dynamic planning.")

    base = _normalize_openai_api_base()
    url = f"{base.rstrip('/')}/chat/completions"
    body: dict[str, Any] = {
        "model": model.removeprefix("openai/"),
        "messages": messages,
        "temperature": 0.2,
    }
    if os.getenv("AGENTIC_PLANNER_JSON_MODE", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    ):
        body["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=120.0) as client:
        response = client.post(url, headers=headers, json=body)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = response.text[:500] if response.text else ""
            raise RuntimeError(
                f"Planner LLM request failed ({response.status_code}): {detail}"
            ) from exc
        data = response.json()

    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Planner LLM returned no choices.")
    message = choices[0].get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Planner LLM returned empty content.")
    return content.strip()


def _build_planner_messages(
    *,
    user_prompt: str,
    catalog_doc: str,
    max_steps: int,
) -> list[dict[str, str]]:
    system = f"""You are an expert orchestration planner for a multi-agent system.

Available providers (pick ONLY provider_id values from this list):
{catalog_doc}

Rules:
- Read the user's goal and produce a clear step-by-step plan.
- Each step must assign exactly one provider_id from the list above.
- Steps run in order; later steps may build on earlier work (sequential crew).
- Every step "description" MUST include the literal substring "{{topic}}" at least once; runtime replaces it with the user's goal.
- Keep the plan concise: between 1 and {max_steps} steps.
- "expected_output" should be specific enough to judge success.

Respond with a single JSON object only (no markdown outside JSON if possible) with this shape:
{{
  "plan_summary": "short rationale for the step order and provider choices",
  "steps": [
    {{
      "provider_id": "<id from catalog>",
      "description": "Instructions for the agent. Must mention {{topic}}.",
      "expected_output": "What this step should produce"
    }}
  ]
}}
"""
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_prompt.strip()},
    ]


def plan_raw_from_llm(
    *,
    user_prompt: str,
    catalog_entries: list[dict[str, Any]],
    max_steps: int,
    model: str,
) -> dict[str, Any]:
    doc = catalog_for_planner_prompt(catalog_entries)
    messages = _build_planner_messages(
        user_prompt=user_prompt,
        catalog_doc=doc,
        max_steps=max_steps,
    )
    content = _planner_chat_completion(messages=messages, model=model)
    return _extract_json_object(content)


def workflow_config_from_plan(
    *,
    user_prompt: str,
    plan: dict[str, Any],
    catalog_entries: list[dict[str, Any]],
    instance_key: str,
    max_steps: int,
) -> WorkflowConfig:
    catalog_by_id = {str(p["id"]).strip(): p for p in catalog_entries}
    steps_raw = plan.get("steps")
    if not isinstance(steps_raw, list) or not steps_raw:
        raise ValueError("Planner JSON must contain a non-empty 'steps' array.")
    cap = max(1, min(32, max_steps))
    if len(steps_raw) > cap:
        steps_raw = steps_raw[:cap]

    task_definitions: list[TaskDefinition] = []
    used_provider_ids: list[str] = []
    seen_providers: set[str] = set()

    for i, step in enumerate(steps_raw):
        if not isinstance(step, dict):
            raise ValueError(f"steps[{i}] must be an object")
        pid = str(step.get("provider_id", "")).strip()
        desc = str(step.get("description", "")).strip()
        expected = str(step.get("expected_output", "")).strip()
        if not pid or pid not in catalog_by_id:
            known = ", ".join(sorted(catalog_by_id))
            raise ValueError(
                f"Unknown provider_id {pid!r} in step {i}. Known: {known}",
            )
        if not desc:
            raise ValueError(f"Step {i} is missing description")
        if not expected:
            raise ValueError(f"Step {i} is missing expected_output")
        if "{topic}" not in desc:
            desc = f"{{topic}}\n\n{desc}"

        tid = f"step_{i + 1}"
        task_definitions.append(
            TaskDefinition(
                id=tid,
                provider_id=pid,
                description=desc,
                expected_output=expected,
            )
        )
        if pid not in seen_providers:
            seen_providers.add(pid)
            used_provider_ids.append(pid)

    provider_payloads = [deepcopy_provider(catalog_by_id[pid]) for pid in used_provider_ids]

    return WorkflowConfig(
        name="dynamic-plan",
        process="sequential",
        topic=user_prompt.strip(),
        instance_key=instance_key,
        providers=provider_payloads,
        tasks=task_definitions,
        task_sequence=[t.id for t in task_definitions],
    )


def build_dynamic_workflow_config(
    *,
    user_prompt: str,
    catalog_path: Path,
    instance_key: str | None = None,
    max_steps: int | None = None,
    planner_model: str | None = None,
) -> tuple[WorkflowConfig, dict[str, Any]]:
    entries = load_providers_catalog(catalog_path)
    key = instance_key or _dynamic_instance_key(user_prompt)
    limit = max_steps
    if limit is None:
        limit = int(os.getenv("AGENTIC_PLANNER_MAX_STEPS", "8"))
    limit = max(1, min(32, limit))

    model = (planner_model or "").strip() or os.getenv(
        "AGENTIC_PLANNER_MODEL", "gpt-4o-mini"
    ).strip()

    plan = plan_raw_from_llm(
        user_prompt=user_prompt,
        catalog_entries=entries,
        max_steps=limit,
        model=model,
    )
    cfg = workflow_config_from_plan(
        user_prompt=user_prompt,
        plan=plan,
        catalog_entries=entries,
        instance_key=key,
        max_steps=limit,
    )
    return cfg, plan
