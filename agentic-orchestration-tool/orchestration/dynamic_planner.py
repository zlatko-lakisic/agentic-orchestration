from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import httpx

from orchestration.catalog_credentials import filter_entries_by_api_credentials
from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.hardware_profile import filter_catalog_by_vram
from orchestration.orchestrator_session import (
    OrchestratorSessionFile,
    load_session,
    save_session,
    stable_instance_key_for_session,
    trim_planner_history,
)
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


def _planner_system_prompt(
    *,
    catalog_doc: str,
    max_steps: int,
    last_crew_excerpt: str | None = None,
) -> str:
    system = f"""You are an expert orchestration planner for a multi-agent system.

Available providers (pick ONLY provider_id values from this catalog; every id is valid):
{catalog_doc}

Rules:
- Read the user's goal and produce a clear step-by-step plan.
- **Provider choice:** For each step, pick the **single best** `provider_id` for that step—no default bias toward local vs cloud. Judge purely from the user's task and each entry's `planner_hint`, `role`, `goal`, `model`, and `type` (`ollama` = local host, `openai` = OpenAI-compatible cloud API, `anthropic` = Anthropic Claude API).
- **Mixing:** You may combine different `type` values in one plan when different steps call for different capabilities.
- **Local-only (explicit user request):** If the user asks for private, offline, local, or Ollama-only execution, use only `type: ollama` providers.
- Each step must assign exactly one provider_id from the catalog.
- Steps run in order; later steps may build on earlier work (sequential crew).
- Every step "description" MUST include the literal substring "{{topic}}" at least once; runtime replaces it with the user's goal.
- Keep the plan concise: between 1 and {max_steps} steps.
- "expected_output" should be specific enough to judge success.
- In `plan_summary`, briefly justify **why** each provider_id fits that step (not just step order).
- If session or previous output context is present, treat new instructions as continuations when appropriate.

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
    if last_crew_excerpt and str(last_crew_excerpt).strip():
        cap = int(os.getenv("AGENTIC_ORCHESTRATOR_EXCERPT_CHARS", "15000"))
        excerpt = str(last_crew_excerpt).strip()[:cap]
        system += (
            f"\n\n## Previous crew output (same session; excerpt)\n{excerpt}\n"
            "Use this when the user refers to prior results or asks for follow-up work.\n"
        )
    return system


def _compose_planner_messages(
    *,
    system_text: str,
    planner_history: list[dict[str, str]],
    user_prompt: str,
) -> list[dict[str, str]]:
    msgs: list[dict[str, str]] = [{"role": "system", "content": system_text}]
    for turn in planner_history:
        role = str(turn.get("role", "")).strip()
        content = str(turn.get("content", ""))
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_prompt.strip()})
    return msgs


def _workflow_snapshot_for_planner_history(cfg: WorkflowConfig) -> str:
    """Rich context appended to the planner assistant turn: concrete providers and tasks."""
    cap_desc = max(80, min(4000, int(os.getenv("AGENTIC_ORCHESTRATOR_TASK_DESC_CHARS", "500"))))
    cap_exp = max(60, min(2000, int(os.getenv("AGENTIC_ORCHESTRATOR_TASK_OUTPUT_CHARS", "320"))))

    def clip(text: str, n: int) -> str:
        s = text.strip().replace("\n", " ")
        if len(s) <= n:
            return s
        return s[: n - 1] + "…"

    prov_lines: list[str] = []
    for p in cfg.providers:
        if not isinstance(p, dict):
            continue
        pid = str(p.get("id", "")).strip()
        if not pid:
            continue
        typ = str(p.get("type", "")).strip()
        model = str(p.get("model", "")).strip()
        role = str(p.get("role", "")).strip()
        meta = []
        if typ:
            meta.append(f"type={typ!r}")
        if model:
            meta.append(f"model={model!r}")
        if role:
            meta.append(f"role={role!r}")
        suffix = (" " + " ".join(meta)) if meta else ""
        prov_lines.append(f"- `{pid}`{suffix}")

    task_lines: list[str] = []
    for tid in cfg.task_sequence:
        match = next((t for t in cfg.tasks if t.id == tid), None)
        if match is None:
            continue
        task_lines.append(
            f"- `{match.id}` → provider `{match.provider_id}`\n"
            f"  - description: {clip(match.description, cap_desc)}\n"
            f"  - expected_output: {clip(match.expected_output, cap_exp)}"
        )

    if not prov_lines and not task_lines:
        return ""

    return (
        "\n\n---\n"
        "## Workflow built from this plan (providers and tasks; use for continuity)\n\n"
        "### Providers\n"
        + ("\n".join(prov_lines) if prov_lines else "(none)")
        + "\n\n### Tasks (execution order)\n"
        + ("\n".join(task_lines) if task_lines else "(none)")
    )


def plan_raw_from_llm(
    *,
    user_prompt: str,
    catalog_entries: list[dict[str, Any]],
    max_steps: int,
    model: str,
) -> dict[str, Any]:
    doc = catalog_for_planner_prompt(catalog_entries)
    system_text = _planner_system_prompt(
        catalog_doc=doc,
        max_steps=max_steps,
        last_crew_excerpt=None,
    )
    messages = _compose_planner_messages(
        system_text=system_text,
        planner_history=[],
        user_prompt=user_prompt,
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
    session_path: Path | None = None,
    quiet: bool = False,
) -> tuple[WorkflowConfig, dict[str, Any]]:
    entries = load_providers_catalog(catalog_path)
    entries, _skipped_cred = filter_entries_by_api_credentials(
        entries,
        verbose=not quiet,
        log_prefix="(dynamic) catalog",
    )
    if not entries:
        raise RuntimeError(
            "No providers left after API credential filtering. "
            "Set OPENAI_API_KEY / ANTHROPIC_API_KEY (or OpenAI base URL) for cloud entries, "
            "or keep Ollama providers in the catalog for local-only runs."
        )
    entries, excluded_hw, vram_g = filter_catalog_by_vram(entries)
    if not entries:
        raise RuntimeError(
            "No providers left after hardware (VRAM) filtering. "
            "Use a smaller Ollama model in catalog YAML (lower min_vram_gb), set "
            "AGENTIC_ASSUME_VRAM_GB to your real GPU size, set AGENTIC_VRAM_HEURISTICS=0, "
            "or disable filtering with AGENTIC_DISABLE_HARDWARE_FILTER=1."
        )
    if excluded_hw and os.getenv("AGENTIC_HARDWARE_FILTER_QUIET", "").strip().lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        cap = 24
        show = excluded_hw[:cap]
        more = len(excluded_hw) - cap
        suffix = f" (+{more} more)" if more > 0 else ""
        print(
            f"(dynamic) hardware: NVIDIA VRAM ~{vram_g:.1f} GiB; excluded "
            f"{len(excluded_hw)} provider(s) (min_vram_gb / heuristic): "
            f"{', '.join(show)}{suffix}",
            file=sys.stderr,
        )

    limit = max_steps
    if limit is None:
        limit = int(os.getenv("AGENTIC_PLANNER_MAX_STEPS", "8"))
    limit = max(1, min(32, limit))

    model = (planner_model or "").strip() or os.getenv(
        "AGENTIC_PLANNER_MODEL", "gpt-4o-mini"
    ).strip()

    sess: OrchestratorSessionFile | None = None
    history: list[dict[str, str]] = []
    last_excerpt: str | None = None
    if session_path is not None:
        sess = load_session(session_path)
        history = trim_planner_history(sess.planner_history)
        last_excerpt = sess.last_crew_output_excerpt

    if instance_key:
        key = instance_key
    elif session_path is not None:
        assert sess is not None
        if sess.instance_key:
            key = sess.instance_key
        else:
            key = stable_instance_key_for_session(session_path.stem)
    else:
        key = _dynamic_instance_key(user_prompt)

    doc = catalog_for_planner_prompt(entries)
    system_text = _planner_system_prompt(
        catalog_doc=doc,
        max_steps=limit,
        last_crew_excerpt=last_excerpt,
    )
    messages = _compose_planner_messages(
        system_text=system_text,
        planner_history=history,
        user_prompt=user_prompt,
    )
    raw_content = _planner_chat_completion(messages=messages, model=model)
    plan = _extract_json_object(raw_content)

    cfg = workflow_config_from_plan(
        user_prompt=user_prompt,
        plan=plan,
        catalog_entries=entries,
        instance_key=key,
        max_steps=limit,
    )

    if session_path is not None:
        assert sess is not None
        sess.instance_key = key
        assistant_content = raw_content.strip() + _workflow_snapshot_for_planner_history(cfg)
        merged = trim_planner_history(
            history
            + [
                {"role": "user", "content": user_prompt.strip()},
                {"role": "assistant", "content": assistant_content},
            ]
        )
        sess.planner_history = merged
        save_session(session_path, sess)

    return cfg, plan
