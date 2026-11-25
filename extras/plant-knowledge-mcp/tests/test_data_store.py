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


_CSV_NAMES = (
    "plant_water_needs.csv",
    "wucols_water_use_classes.csv",
    "wucols_regions.csv",
    "wucols_plant_types.csv",
    "usda_hardiness_zones.csv",
    "reference_et0.csv",
)


def _copy_dataset(dst: Path) -> None:
    for name in _CSV_NAMES:
        (dst / name).write_text((_DATA_DIR / name).read_text(encoding="utf-8"), encoding="utf-8")


def test_failed_reload_keeps_previous_dataset_intact(tmp_path: Path) -> None:
    """A bad CSV must not leave a half-updated store (tables used to swap one by one)."""
    _copy_dataset(tmp_path)
    store = PlantKnowledgeStore(tmp_path)
    before_counts = dict(store.row_counts)
    before_zones = dict(store.usda_zones)

    # The first table loads fine with one extra plant; a later table is broken
    # (missing the "zone" column), so the reload fails after the plant list was read.
    plants_path = tmp_path / "plant_water_needs.csv"
    text = plants_path.read_text(encoding="utf-8")
    plants_path.write_text(
        text.rstrip() + "\nTestus halfus,Half reload plant,G,4a,9b,M,0.5,should not appear\n",
        encoding="utf-8",
    )
    (tmp_path / "usda_hardiness_zones.csv").write_text("not_zone,other\nx,y\n", encoding="utf-8")

    with pytest.raises(KeyError):
        store.reload()

    assert store.row_counts == before_counts
    assert store.usda_zones == before_zones
    assert store.get_plant_profile("half reload plant")["found"] is False
    assert store.get_plant_profile("tall fescue")["found"] is True

    # A missing file behaves the same way.
    (tmp_path / "reference_et0.csv").unlink()
    with pytest.raises((KeyError, FileNotFoundError)):
        store.reload()
    assert store.row_counts == before_counts


@pytest.mark.parametrize("bad_et0", [-1.0, float("nan"), float("inf"), float("-inf")])
def test_explicit_et0_must_be_finite_and_non_negative(
    store: PlantKnowledgeStore, bad_et0: float
) -> None:
    result = store.get_water_requirement_mm("tall fescue", et0_mm_per_week=bad_et0)
    assert result["found"] is False
    assert "weekly_need_mm" not in result
    assert "non-negative" in result["message"]


def test_explicit_et0_zero_and_positive_are_accepted(store: PlantKnowledgeStore) -> None:
    zero = store.get_water_requirement_mm("tall fescue", et0_mm_per_week=0)
    assert zero["found"] is True
    assert zero["weekly_need_mm"] == 0
    live = store.get_water_requirement_mm("tall fescue", et0_mm_per_week=40)
    assert live["found"] is True
    assert live["weekly_need_mm"] == pytest.approx(20.0)
    assert live["et0_source"] == "explicit_et0_mm_per_week"


def test_dockerfile_installs_pinned_requirements_as_non_root() -> None:
    root = Path(__file__).resolve().parent.parent
    dockerfile = (root / "Dockerfile").read_text(encoding="utf-8")
    run_lines = [ln for ln in dockerfile.splitlines() if ln.startswith("RUN pip install")]
    assert run_lines == ["RUN pip install --no-cache-dir -r requirements-runtime.txt"]
    # An unquoted `mcp>=1.2.0` on a RUN line is a shell redirect, not a version pin.
    assert not any(">=" in ln for ln in dockerfile.splitlines() if ln.startswith("RUN "))
    assert "USER 10001" in dockerfile
    runtime = (root / "requirements-runtime.txt").read_text(encoding="utf-8")
    assert "mcp>=1.2.0" in runtime
    assert "pytest" not in runtime
