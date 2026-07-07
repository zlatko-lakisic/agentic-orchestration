"""In-memory plant / climate reference data loaded from flat CSV files."""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Any

WATER_USE_ORDER: dict[str, int] = {"VL": 0, "LO": 1, "M": 2, "H": 3}

DATASET_PROVENANCE: dict[str, dict[str, str]] = {
    "plant_water_needs.csv": {
        "status": "curated",
        "note": "Hand-built seed set — NOT the full ~4,100-taxa WUCOLS export.",
    },
    "wucols_water_use_classes.csv": {
        "status": "authoritative",
        "note": "Official WUCOLS water-use class definitions.",
    },
    "wucols_regions.csv": {
        "status": "authoritative",
        "note": "Official WUCOLS California climate regions.",
    },
    "wucols_plant_types.csv": {
        "status": "authoritative",
        "note": "Official WUCOLS plant-type codes.",
    },
    "usda_hardiness_zones.csv": {
        "status": "authoritative",
        "note": "Standard USDA Plant Hardiness Zone temperature bands.",
    },
    "reference_et0.csv": {
        "status": "representative",
        "note": "Typical peak-season reference ET0 — NOT live weather values.",
    },
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def parse_usda_zone(zone: str) -> int:
    cleaned = normalize_text(zone)
    match = re.fullmatch(r"(\d{1,2})([ab])", cleaned)
    if not match:
        raise ValueError(f"Invalid USDA zone: {zone!r} (expected format like 7a or 10b)")
    number = int(match.group(1))
    sub = 0 if match.group(2) == "a" else 1
    return number * 2 + sub


def format_usda_zone(value: int) -> str:
    number, sub = divmod(value, 2)
    return f"{number}{'a' if sub == 0 else 'b'}"


def tokenize(value: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", normalize_text(value)) if token]


class PlantKnowledgeStore:
    """Deterministic, read-only indexes over plant-knowledge CSV bundles."""

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.plants: list[dict[str, str]] = []
        self.plant_by_key: dict[str, dict[str, str]] = {}
        self.water_use_classes: dict[str, dict[str, str]] = {}
        self.plant_types: dict[str, dict[str, str]] = {}
        self.regions: list[dict[str, str]] = []
        self.usda_zones: dict[str, dict[str, str]] = {}
        self.reference_et0: dict[str, dict[str, str]] = {}
        self.row_counts: dict[str, int] = {}
        self.reload()

    def reload(self) -> None:
        self.plants = self._load_csv("plant_water_needs.csv")
        self.water_use_classes = {
            row["code"]: row for row in self._load_csv("wucols_water_use_classes.csv")
        }
        self.plant_types = {row["code"]: row for row in self._load_csv("wucols_plant_types.csv")}
        self.regions = self._load_csv("wucols_regions.csv")
        self.usda_zones = {row["zone"]: row for row in self._load_csv("usda_hardiness_zones.csv")}
        self.reference_et0 = {
            row["climate_setting"]: row for row in self._load_csv("reference_et0.csv")
        }

        self.plant_by_key = {}
        for plant in self.plants:
            for field in ("scientific_name", "common_name"):
                key = normalize_text(plant[field])
                if key:
                    self.plant_by_key[key] = plant

        self.row_counts = {
            "plant_water_needs.csv": len(self.plants),
            "wucols_water_use_classes.csv": len(self.water_use_classes),
            "wucols_regions.csv": len(self.regions),
            "wucols_plant_types.csv": len(self.plant_types),
            "usda_hardiness_zones.csv": len(self.usda_zones),
            "reference_et0.csv": len(self.reference_et0),
        }

    def _load_csv(self, filename: str) -> list[dict[str, str]]:
        path = self.data_dir / filename
        if not path.is_file():
            raise FileNotFoundError(f"Missing dataset file: {path}")
        with path.open(encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))

    def _enrich_plant(self, plant: dict[str, str]) -> dict[str, Any]:
        water_code = plant.get("wucols_water_use", "")
        plant_type_code = plant.get("plant_type_code", "")
        return {
            **plant,
            "plant_type_name": (self.plant_types.get(plant_type_code) or {}).get("name"),
            "water_use_class": self.water_use_classes.get(water_code),
        }

    def _find_exact_plant(self, name: str) -> dict[str, str] | None:
        key = normalize_text(name)
        if key in self.plant_by_key:
            return self.plant_by_key[key]
        return None

    def _suggest_plants(self, name: str, limit: int = 5) -> list[str]:
        query = normalize_text(name)
        query_tokens = tokenize(name)
        scored: list[tuple[tuple[int, int, str], str]] = []

        for plant in self.plants:
            labels = [plant.get("common_name", ""), plant.get("scientific_name", "")]
            best: tuple[int, int, str] | None = None
            for label in labels:
                normalized = normalize_text(label)
                if not normalized:
                    continue
                if query and query in normalized:
                    rank = (0, len(normalized), normalized)
                elif query_tokens and all(token in normalized for token in query_tokens):
                    rank = (1, len(normalized), normalized)
                elif query_tokens and any(token in normalized for token in query_tokens):
                    rank = (2, len(normalized), normalized)
                else:
                    continue
                if best is None or rank < best:
                    best = rank
            if best is not None:
                scored.append((best, label if (label := labels[0] or labels[1]) else ""))

        scored.sort(key=lambda item: item[0])
        suggestions: list[str] = []
        seen: set[str] = set()
        for _, label in scored:
            if label and label not in seen:
                seen.add(label)
                suggestions.append(label)
            if len(suggestions) >= limit:
                break
        return suggestions

    def get_plant_profile(self, name: str) -> dict[str, Any]:
        plant = self._find_exact_plant(name)
        if plant is None:
            return {
                "found": False,
                "query": name,
                "message": (
                    "Plant not found in the curated seed set. "
                    "This server does NOT hold the complete WUCOLS export."
                ),
                "suggestions": self._suggest_plants(name),
            }
        return {"found": True, "plant": self._enrich_plant(plant)}

    def _matches_water_use_ceiling(self, plant_code: str, max_water_use: str) -> bool:
        ceiling = normalize_text(max_water_use).upper()
        if ceiling not in WATER_USE_ORDER:
            return False
        plant_code = (plant_code or "").upper()
        if plant_code not in WATER_USE_ORDER:
            return False
        return WATER_USE_ORDER[plant_code] <= WATER_USE_ORDER[ceiling]

    def _matches_usda_zone(self, plant: dict[str, str], zone: str) -> bool:
        target = parse_usda_zone(zone)
        low = parse_usda_zone(plant["usda_zone_low"])
        high = parse_usda_zone(plant["usda_zone_high"])
        return low <= target <= high

    def _search_score(self, plant: dict[str, str], query: str) -> tuple[int, int, str] | None:
        normalized_query = normalize_text(query)
        query_tokens = tokenize(query)
        if not normalized_query and not query_tokens:
            return (3, 0, plant.get("common_name", ""))

        scientific = normalize_text(plant.get("scientific_name", ""))
        common = normalize_text(plant.get("common_name", ""))
        notes = normalize_text(plant.get("notes", ""))

        if normalized_query and (
            normalized_query == scientific or normalized_query == common
        ):
            return (0, 0, common or scientific)
        if normalized_query and normalized_query in common:
            return (1, len(common), common)
        if normalized_query and normalized_query in scientific:
            return (2, len(scientific), common or scientific)
        if query_tokens and all(
            token in common or token in scientific or token in notes for token in query_tokens
        ):
            if any(token in common for token in query_tokens):
                return (3, len(common), common)
            if any(token in scientific for token in query_tokens):
                return (4, len(scientific), common or scientific)
            return (5, len(notes), common or scientific)
        if normalized_query and normalized_query in notes:
            return (6, len(notes), common or scientific)
        return None

    def search_plants(
        self,
        query: str,
        plant_type: str | None = None,
        max_water_use: str | None = None,
        usda_zone: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        lim = max(1, min(int(limit), 100))
        type_filter = normalize_text(plant_type).upper() if plant_type else None
        results: list[tuple[tuple[int, int, str], dict[str, str]]] = []

        for plant in self.plants:
            if type_filter and plant.get("plant_type_code", "").upper() != type_filter:
                continue
            if max_water_use and not self._matches_water_use_ceiling(
                plant.get("wucols_water_use", ""), max_water_use
            ):
                continue
            if usda_zone:
                try:
                    if not self._matches_usda_zone(plant, usda_zone):
                        continue
                except ValueError:
                    return {
                        "error": f"Invalid usda_zone filter: {usda_zone!r}",
                        "results": [],
                    }
            score = self._search_score(plant, query)
            if score is not None:
                results.append((score, plant))

        results.sort(key=lambda item: item[0])
        plants = [self._enrich_plant(plant) for _, plant in results[:lim]]
        return {
            "query": query,
            "count": len(plants),
            "results": plants,
            "note": "Results come from the curated plant_water_needs seed set, not full WUCOLS.",
        }

    def get_water_requirement_mm(
        self,
        name: str,
        climate_setting: str | None = None,
        et0_mm_per_week: float | None = None,
    ) -> dict[str, Any]:
        profile = self.get_plant_profile(name)
        if not profile.get("found"):
            return profile

        plant = profile["plant"]
        try:
            plant_factor = float(plant["plant_factor_midpoint"])
        except (KeyError, TypeError, ValueError):
            return {
                "found": False,
                "query": name,
                "message": "Plant is missing a numeric plant_factor_midpoint in the seed set.",
            }

        et0_source: str
        et0_value: float
        if et0_mm_per_week is not None:
            et0_source = "explicit_et0_mm_per_week"
            et0_value = float(et0_mm_per_week)
        elif climate_setting:
            key = normalize_text(climate_setting)
            row = self.reference_et0.get(key)
            if row is None:
                # Allow case-insensitive climate_setting lookup.
                row = next(
                    (
                        value
                        for setting, value in self.reference_et0.items()
                        if normalize_text(setting) == key
                    ),
                    None,
                )
            if row is None:
                return {
                    "found": False,
                    "query": name,
                    "message": f"Unknown climate_setting: {climate_setting!r}",
                    "available_climate_settings": sorted(self.reference_et0),
                }
            et0_source = "reference_et0.csv"
            et0_value = float(row["peak_et0_mm_per_week"])
        else:
            return {
                "found": False,
                "query": name,
                "message": "Provide et0_mm_per_week (live ET0) or climate_setting (representative ET0).",
                "available_climate_settings": sorted(self.reference_et0),
            }

        weekly_need_mm = round(plant_factor * et0_value, 2)
        return {
            "found": True,
            "plant_name": plant.get("common_name") or plant.get("scientific_name"),
            "scientific_name": plant.get("scientific_name"),
            "weekly_need_mm": weekly_need_mm,
            "plant_factor": plant_factor,
            "et0_source": et0_source,
            "et0_mm_per_week": et0_value,
            "formula": "weekly_need_mm = plant_factor_midpoint × et0_mm_per_week",
            "note": (
                "reference_et0.csv values are representative peak-season estimates, not live weather. "
                "Prefer explicit et0_mm_per_week from a weather/ET0 source when available."
            ),
        }

    def get_usda_zone(self, zone: str) -> dict[str, Any]:
        key = normalize_text(zone)
        row = self.usda_zones.get(key)
        if row is None:
            row = next(
                (value for z, value in self.usda_zones.items() if normalize_text(z) == key),
                None,
            )
        if row is None:
            return {"found": False, "zone": zone, "message": "Unknown USDA hardiness zone."}
        return {"found": True, "zone": row}

    def resolve_zone_from_temp(self, temp_f: float) -> dict[str, Any]:
        matches: list[dict[str, str]] = []
        for row in self.usda_zones.values():
            low = float(row["min_temp_f"])
            high = float(row["max_temp_f"])
            if low <= temp_f < high:
                matches.append(row)
        if not matches:
            return {
                "found": False,
                "temp_f": temp_f,
                "message": "No USDA zone matches this temperature.",
            }
        if len(matches) > 1:
            matches.sort(key=lambda row: row["zone"])
        zone_row = matches[0]
        return {
            "found": True,
            "temp_f": temp_f,
            "zone": zone_row["zone"],
            "zone_detail": zone_row,
        }

    def list_reference_et0(self) -> dict[str, Any]:
        rows = [
            {
                **row,
                "note": "Representative peak-season ET0 — not live weather.",
            }
            for row in self.reference_et0.values()
        ]
        rows.sort(key=lambda row: row["climate_setting"])
        return {
            "count": len(rows),
            "climate_settings": rows,
            "note": "Use explicit et0_mm_per_week from a live source in production when available.",
        }

    def describe_dataset(self) -> dict[str, Any]:
        files = []
        for filename, meta in DATASET_PROVENANCE.items():
            files.append(
                {
                    "file": filename,
                    "status": meta["status"],
                    "row_count": self.row_counts.get(filename, 0),
                    "note": meta["note"],
                }
            )
        return {
            "data_dir": str(self.data_dir),
            "plant_list_status": "curated_seed_set",
            "plant_list_note": (
                "plant_water_needs.csv is a hand-curated seed set of real species. "
                "It is NOT the official ~4,100-taxa WUCOLS export."
            ),
            "files": files,
            "reload": "POST /reload or send SIGHUP to reload CSVs from DATA_DIR without restart.",
        }
