"""Tests for the standalone plant-knowledge MCP data layer."""

from __future__ import annotations

from pathlib import Path

import pytest

from plant_knowledge_mcp.data_store import PlantKnowledgeStore

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@pytest.fixture
def store() -> PlantKnowledgeStore:
    return PlantKnowledgeStore(_DATA_DIR)


def test_get_plant_profile_tall_fescue(store: PlantKnowledgeStore) -> None:
    result = store.get_plant_profile("tall fescue")
    assert result["found"] is True
    plant = result["plant"]
    assert plant["common_name"] == "Tall fescue"
    assert plant["scientific_name"] == "Festuca arundinacea"
    assert plant["water_use_class"]["code"] == "M"
    assert plant["plant_type_name"] == "Ornamental Grass"


def test_get_water_requirement_mm_tall_fescue_temperate_humid(store: PlantKnowledgeStore) -> None:
    result = store.get_water_requirement_mm("tall fescue", climate_setting="temperate_humid")
    assert result["found"] is True
    assert result["plant_factor"] == 0.5
    assert result["et0_mm_per_week"] == 31.5
    assert result["weekly_need_mm"] == pytest.approx(15.75, abs=0.5)
    assert result["et0_source"] == "reference_et0.csv"


def test_unknown_plant_returns_suggestions_not_fabricated_factor(store: PlantKnowledgeStore) -> None:
    result = store.get_plant_profile("xyznotaplant")
    assert result["found"] is False
    assert "suggestions" in result
    assert isinstance(result["suggestions"], list)
    assert "plant_factor" not in result

    water = store.get_water_requirement_mm("xyznotaplant", climate_setting="temperate_humid")
    assert water["found"] is False
    assert "weekly_need_mm" not in water


def test_describe_dataset_notes_curated_seed_set(store: PlantKnowledgeStore) -> None:
    meta = store.describe_dataset()
    assert meta["plant_list_status"] == "curated_seed_set"
    assert "NOT" in meta["plant_list_note"]
    plant_file = next(f for f in meta["files"] if f["file"] == "plant_water_needs.csv")
    assert plant_file["status"] == "curated"
    assert plant_file["row_count"] > 0


def test_reload_picks_up_data_changes(store: PlantKnowledgeStore, tmp_path: Path) -> None:
    for name in (
        "plant_water_needs.csv",
        "wucols_water_use_classes.csv",
        "wucols_regions.csv",
        "wucols_plant_types.csv",
        "usda_hardiness_zones.csv",
        "reference_et0.csv",
    ):
        (tmp_path / name).write_text((_DATA_DIR / name).read_text(encoding="utf-8"), encoding="utf-8")

    reloadable = PlantKnowledgeStore(tmp_path)
    assert reloadable.get_plant_profile("tall fescue")["found"] is True

    plants_path = tmp_path / "plant_water_needs.csv"
    text = plants_path.read_text(encoding="utf-8")
    extra_row = "\nTestus plantus,Reload test plant,G,4a,9b,M,0.5,Added by reload test"
    plants_path.write_text(text.rstrip() + extra_row + "\n", encoding="utf-8")

    reloadable.reload()
    assert reloadable.get_plant_profile("reload test plant")["found"] is True
