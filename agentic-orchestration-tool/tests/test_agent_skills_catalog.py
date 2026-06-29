from __future__ import annotations

from pathlib import Path

import pytest

from orchestration.agent_skills_catalog import (
    filter_skill_entries_by_credentials,
    load_agent_skills_catalog,
    load_agent_skills_catalog_merged,
    partition_skill_entries,
    resolve_skill_blocks,
    resolve_skill_content,
    resolve_workflow_skill_refs,
    skills_catalog_for_planner_prompt,
    skills_list_fingerprint,
    suggest_skill_ids_from_user_goal,
)
from orchestration.agent_skills_context import SKILLS_MARKER, augment_description_for_skills
from orchestration.config_loader import TaskDefinition, WorkflowConfig, load_workflow_config, raw_skill_spec_for_task
from orchestration.learning_store import (
    attachment_fingerprint_for_task,
    attachment_fingerprint_from_specs,
    mcp_fingerprint_from_ids,
    skill_fingerprint_from_ids,
)


@pytest.mark.unit
def test_load_skills_catalog_has_echo_skill(config_dir: Path) -> None:
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    ids = {str(e.get("id", "")).strip() for e in entries}
    assert "echo_skill" in ids


@pytest.mark.unit
def test_resolve_skill_content_inline(tmp_path: Path) -> None:
    entry = {
        "id": "inline",
        "_source_path": str(tmp_path / "skill.yaml"),
        "content": {"body": "Do the thing."},
    }
    assert resolve_skill_content(entry) == "Do the thing."


@pytest.mark.unit
def test_resolve_skill_content_from_file(tmp_path: Path) -> None:
    yaml_path = tmp_path / "demo.yaml"
    yaml_path.write_text("id: demo\n", encoding="utf-8")
    (tmp_path / "notes.md").write_text("Follow checklist A.", encoding="utf-8")
    entry = {
        "id": "demo",
        "_source_path": str(yaml_path),
        "content": {"file": "notes.md"},
    }
    assert resolve_skill_content(entry) == "Follow checklist A."


@pytest.mark.unit
def test_augment_description_for_skills() -> None:
    out = augment_description_for_skills(
        "Base task",
        [("## Demo", "Step one.")],
    )
    assert "Base task" in out
    assert SKILLS_MARKER in out
    assert "Step one." in out


@pytest.mark.unit
def test_resolve_workflow_skill_refs_unknown_id(config_dir: Path) -> None:
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    with pytest.raises(ValueError, match="unknown catalog id"):
        resolve_workflow_skill_refs(["not_a_real_skill"], entries)


@pytest.mark.unit
def test_attachment_fingerprint_combines_mcp_and_skills() -> None:
    mcp_only = attachment_fingerprint_from_specs(["search_tavily"], [])
    skill_only = attachment_fingerprint_from_specs([], ["echo_skill"])
    both = attachment_fingerprint_from_specs(["search_tavily"], ["echo_skill"])
    assert mcp_only == mcp_fingerprint_from_ids(["search_tavily"])
    assert skill_only == skill_fingerprint_from_ids(["echo_skill"])
    assert both == f"{mcp_only}+{skill_only}"


@pytest.mark.unit
def test_attachment_fingerprint_for_task_inherits_workflow_defaults() -> None:
    cfg = WorkflowConfig(
        name="fp",
        process="sequential",
        topic="t",
        instance_key="fp",
        agent_providers=[{"id": "writer", "type": "openai", "role": "R", "goal": "G", "backstory": "B", "model": "gpt-4o-mini"}],
        mcp_providers=["search_tavily"],
        skills=["echo_skill"],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["t1"],
    )
    fp = attachment_fingerprint_for_task(cfg.tasks[0], cfg)
    assert fp == attachment_fingerprint_from_specs(["search_tavily"], ["echo_skill"])


@pytest.mark.unit
def test_skill_fingerprint_and_suggest_goal_match(config_dir: Path) -> None:
    entries = load_agent_skills_catalog_merged(config_dir / "agent_skills")
    kept, _skipped = filter_skill_entries_by_credentials(entries, verbose=False)
    suggested = suggest_skill_ids_from_user_goal("run skills smoke test", kept)
    assert "echo_skill" in suggested
    assert skill_fingerprint_from_ids(["echo_skill"]) != "none"
    assert skills_list_fingerprint(["echo_skill", "echo_skill"]) == ("echo_skill",)


@pytest.mark.unit
def test_workflow_yaml_parses_skills(tmp_path: Path) -> None:
    wf = tmp_path / "wf.yaml"
    wf.write_text(
        """
workflow:
  name: skills-demo
  process: sequential
  topic: test
  skills: []
  agent_providers:
    - id: writer
      type: openai
      role: Writer
      goal: Write
      backstory: Clear writer
      model: gpt-4o-mini
  tasks:
    - id: t1
      agent_provider_id: writer
      skills:
        - echo_skill
      description: "Write about {topic}"
      expected_output: Short text
  task_sequence: [t1]
""".strip(),
        encoding="utf-8",
    )
    cfg = load_workflow_config(wf)
    assert cfg.tasks[0].skills == ["echo_skill"]
    assert raw_skill_spec_for_task(cfg.tasks[0], cfg) == ["echo_skill"]


@pytest.mark.unit
def test_partition_skill_entries(config_dir: Path) -> None:
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    echo = next(e for e in entries if e.get("id") == "echo_skill")
    backstory = next(e for e in entries if e.get("id") == "echo_backstory_skill")
    task_only, back_only = partition_skill_entries([echo, backstory])
    assert [e.get("id") for e in task_only] == ["echo_skill"]
    assert [e.get("id") for e in back_only] == ["echo_backstory_skill"]


@pytest.mark.unit
def test_augment_backstory_for_skills() -> None:
    from orchestration.agent_skills_context import BACKSTORY_SKILLS_MARKER, augment_backstory_for_skills

    out = augment_backstory_for_skills("Base backstory", [("## Demo", "Rule one.")])
    assert "Base backstory" in out
    assert BACKSTORY_SKILLS_MARKER in out
    assert "Rule one." in out


@pytest.mark.unit
def test_runner_injects_backstory_skill(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.agent_skills_context import BACKSTORY_SKILLS_MARKER
    from orchestration.runner import build_workflow

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    cfg = WorkflowConfig(
        name="skills-backstory-smoke",
        process="sequential",
        topic="skills",
        instance_key="skills-backstory-smoke",
        agent_providers=[
            {
                "id": "writer",
                "type": "openai",
                "role": "Writer",
                "goal": "Write",
                "backstory": "Test",
                "model": "gpt-4o-mini",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="Describe {topic}",
                expected_output="text",
                skills=["echo_backstory_skill"],
            )
        ],
        task_sequence=["t1"],
    )
    built = build_workflow(
        cfg,
        crew_verbose=False,
        quiet=True,
        emit_progress_lines=False,
        agent_skills_catalog_path=config_dir / "agent_skills",
    )
    task = built.crew.tasks[0]
    assert BACKSTORY_SKILLS_MARKER not in str(task.description)
    assert "BACKSTORY_SKILL_ECHO_OK" in str(task.agent.backstory)


@pytest.mark.unit
def test_runner_injects_skill_into_task_description(
    config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from orchestration.runner import build_workflow

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    cfg = WorkflowConfig(
        name="skills-smoke",
        process="sequential",
        topic="skills",
        instance_key="skills-smoke",
        agent_providers=[
            {
                "id": "writer",
                "type": "openai",
                "role": "Writer",
                "goal": "Write",
                "backstory": "Test",
                "model": "gpt-4o-mini",
            }
        ],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="Describe {topic}",
                expected_output="text",
                skills=["echo_skill"],
            )
        ],
        task_sequence=["t1"],
    )
    built = build_workflow(
        cfg,
        crew_verbose=False,
        quiet=True,
        emit_progress_lines=False,
        agent_skills_catalog_path=config_dir / "agent_skills",
    )
    task = built.crew.tasks[0]
    assert SKILLS_MARKER in str(task.description)
    assert "SKILL_ECHO_OK" in str(task.description)


@pytest.mark.unit
def test_resolve_skill_blocks(config_dir: Path) -> None:
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    echo = next(e for e in entries if e.get("id") == "echo_skill")
    blocks = resolve_skill_blocks([echo])
    assert blocks
    assert "SKILL_ECHO_OK" in blocks[0][1]


@pytest.mark.unit
def test_load_skills_bundle_yaml(tmp_path: Path) -> None:
    bundle = tmp_path / "bundle.yaml"
    bundle.write_text(
        """
agent_skills:
  - id: bundled_skill
    content:
      body: bundled body
""".strip(),
        encoding="utf-8",
    )
    entries = load_agent_skills_catalog(bundle)
    assert len(entries) == 1
    assert entries[0]["id"] == "bundled_skill"
    assert resolve_skill_content(entries[0]) == "bundled body"


@pytest.mark.unit
def test_load_agent_skills_catalog_merged_extra_path(
    config_dir: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    extra_dir = tmp_path / "extra_skills"
    extra_dir.mkdir()
    (extra_dir / "extra.yaml").write_text(
        """
id: extra_skill
content:
  body: extra instructions
""".strip(),
        encoding="utf-8",
    )
    monkeypatch.setenv("AGENTIC_EXTRA_AGENT_SKILLS_PATH", str(extra_dir))
    entries = load_agent_skills_catalog_merged(config_dir / "agent_skills")
    ids = {str(e.get("id", "")).strip() for e in entries}
    assert "echo_skill" in ids
    assert "extra_skill" in ids


@pytest.mark.unit
def test_resolve_skill_content_strips_skill_md_frontmatter(tmp_path: Path) -> None:
    yaml_path = tmp_path / "demo.yaml"
    yaml_path.write_text("id: demo\n", encoding="utf-8")
    (tmp_path / "SKILL.md").write_text(
        """---
name: demo
description: Demo skill
---
Body after frontmatter.
""",
        encoding="utf-8",
    )
    entry = {
        "id": "demo",
        "_source_path": str(yaml_path),
        "content": {"file": "SKILL.md"},
    }
    assert resolve_skill_content(entry) == "Body after frontmatter."


@pytest.mark.unit
def test_filter_skills_by_required_files(tmp_path: Path) -> None:
    yaml_path = tmp_path / "gated.yaml"
    yaml_path.write_text("id: gated\n", encoding="utf-8")
    present = tmp_path / "present.txt"
    present.write_text("ok", encoding="utf-8")
    entry = {
        "id": "gated",
        "_source_path": str(yaml_path),
        "required_files": ["present.txt", "missing.txt"],
        "content": {"body": "x"},
    }
    kept, skipped = filter_skill_entries_by_credentials([entry], verbose=False)
    assert kept == []
    assert skipped == ["gated"]

    entry_ok = dict(entry)
    entry_ok["required_files"] = ["present.txt"]
    kept2, skipped2 = filter_skill_entries_by_credentials([entry_ok], verbose=False)
    assert len(kept2) == 1
    assert skipped2 == []


@pytest.mark.unit
def test_skills_catalog_for_planner_uses_content_summary() -> None:
    entry = {
        "id": "summary_skill",
        "description": "long description should not appear",
        "content": {"summary": "Short planner summary."},
    }
    text = skills_catalog_for_planner_prompt([entry])
    assert "Short planner summary." in text
    assert "long description should not appear" not in text


@pytest.mark.unit
def test_emit_run_rating_meta_includes_skills(capsys: pytest.CaptureFixture[str]) -> None:
    from orchestration.learning_store import RUN_RATING_META_PREFIX, emit_run_rating_meta

    cfg = WorkflowConfig(
        name="meta",
        process="sequential",
        topic="t",
        instance_key="meta",
        agent_providers=[
            {
                "id": "writer",
                "type": "openai",
                "role": "Writer",
                "goal": "Write",
                "backstory": "Test",
                "model": "gpt-4o-mini",
            }
        ],
        mcp_providers=[],
        skills=["echo_skill"],
        tasks=[
            TaskDefinition(
                id="t1",
                agent_provider_id="writer",
                description="d",
                expected_output="o",
            )
        ],
        task_sequence=["t1"],
    )
    emit_run_rating_meta(cfg)
    err = capsys.readouterr().err
    assert RUN_RATING_META_PREFIX in err
    assert '"provider_id":"writer"' in err.replace(" ", "")
    assert "attachment_fingerprint" in err


@pytest.mark.unit
def test_shipped_skills_include_release_process_and_pr_review(config_dir: Path) -> None:
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    ids = {str(e.get("id", "")).strip() for e in entries}
    assert "release_process" in ids
    assert "pr_review" in ids


@pytest.mark.unit
def test_release_process_skill_passes_required_files_gate(
    tool_root: Path,
    config_dir: Path,
) -> None:
    if not (tool_root.parent / "RELEASING.md").is_file():
        pytest.skip("monorepo RELEASING.md not present (expected in full checkout)")
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    release = next(e for e in entries if e.get("id") == "release_process")
    kept, skipped = filter_skill_entries_by_credentials([release], verbose=False)
    assert len(kept) == 1
    assert skipped == []
    body = resolve_skill_content(release)
    assert "scripts/release.py" in body
    assert "RELEASING.md" in body


@pytest.mark.unit
def test_pr_review_skill_content(config_dir: Path) -> None:
    entries = load_agent_skills_catalog(config_dir / "agent_skills")
    pr = next(e for e in entries if e.get("id") == "pr_review")
    kept, _skipped = filter_skill_entries_by_credentials([pr], verbose=False)
    assert len(kept) == 1
    body = resolve_skill_content(pr)
    assert "Blockers" in body
    assert "CHANGELOG.md" in body


@pytest.mark.unit
def test_suggest_release_process_from_user_goal(
    tool_root: Path,
    config_dir: Path,
) -> None:
    if not (tool_root.parent / "RELEASING.md").is_file():
        pytest.skip("monorepo RELEASING.md not present (expected in full checkout)")
    entries = load_agent_skills_catalog_merged(config_dir / "agent_skills")
    kept, _skipped = filter_skill_entries_by_credentials(entries, verbose=False)
    suggested = suggest_skill_ids_from_user_goal("help me cut a patch release for the project", kept)
    assert "release_process" in suggested


@pytest.mark.unit
def test_workflow_agent_skills_smoke_yaml(config_dir: Path) -> None:
    wf = config_dir / "workflows" / "workflow_agent_skills_smoke.yaml"
    cfg = load_workflow_config(wf)
    assert cfg.name == "agent-skills-smoke"
    assert cfg.tasks[0].skills == ["echo_skill"]
    assert cfg.task_sequence == ["skills_echo"]
