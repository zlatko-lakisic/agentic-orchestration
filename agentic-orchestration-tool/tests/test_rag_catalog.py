"""RAG catalog validation and resolve hard-fail tests."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from orchestration.rag_sources_catalog import (
    load_rag_sources_catalog,
    resolve_rag_ids,
    validate_rag_source_entry,
)


@pytest.mark.unit
def test_duplicate_rag_ids_fail(tmp_path: Path) -> None:
    for name in ("a.yaml", "b.yaml"):
        (tmp_path / name).write_text(
            yaml.dump({"id": "dup", "backend": "sqlite-fts", "mode": "inject"}),
            encoding="utf-8",
        )
    with pytest.raises(ValueError, match="Duplicate"):
        load_rag_sources_catalog(tmp_path)


@pytest.mark.unit
def test_unknown_backend_fails(tmp_path: Path) -> None:
    (tmp_path / "x.yaml").write_text(
        yaml.dump({"id": "x", "backend": "chroma", "mode": "inject"}),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="unknown backend"):
        load_rag_sources_catalog(tmp_path)


@pytest.mark.unit
def test_missing_path_parent_fails() -> None:
    with pytest.raises(ValueError, match="does not exist"):
        validate_rag_source_entry(
            {
                "id": "bad",
                "backend": "sqlite-fts",
                "mode": "inject",
                "path": "/nonexistent/parent/dir/kb.sqlite3",
                "_source_path": "/tmp/fake.yaml",
            }
        )


@pytest.mark.unit
def test_embedding_requires_provider() -> None:
    with pytest.raises(ValueError, match="provider"):
        validate_rag_source_entry(
            {
                "id": "emb",
                "backend": "embedding",
                "mode": "tool",
                "index": "./idx.sqlite3",
                "_source_path": "/tmp/fake.yaml",
            }
        )


@pytest.mark.unit
def test_hybrid_requires_index(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="index"):
        validate_rag_source_entry(
            {
                "id": "hyb",
                "backend": "hybrid",
                "mode": "inject",
                "provider": "ollama/nomic-embed-text",
                "_source_path": str(tmp_path / "x.yaml"),
            }
        )


@pytest.mark.unit
def test_unknown_rag_ids_hard_fail(tmp_path: Path) -> None:
    (tmp_path / "ok.yaml").write_text(
        yaml.dump({"id": "orchestrator_kb", "backend": "sqlite-fts", "mode": "inject"}),
        encoding="utf-8",
    )
    catalog = load_rag_sources_catalog(tmp_path)
    with pytest.raises(ValueError, match="Unknown rag_id"):
        resolve_rag_ids(["orchestrator_kb", "typo-corpus"], catalog, context="plan")


@pytest.mark.unit
def test_shipped_orchestrator_kb_loads(config_dir: Path) -> None:
    catalog = load_rag_sources_catalog(config_dir / "rag_sources")
    ids = {e["id"] for e in catalog}
    assert "orchestrator_kb" in ids
    entry = next(e for e in catalog if e["id"] == "orchestrator_kb")
    assert entry["backend"] == "sqlite-fts"
    assert entry["mode"] == "inject"
