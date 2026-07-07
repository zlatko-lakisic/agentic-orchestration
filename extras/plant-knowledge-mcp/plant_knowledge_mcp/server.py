"""
Plant-knowledge MCP server — deterministic plant / zone / ET0 reference lookups.

Standalone service (not bundled with agentic-orchestration). Transport: Streamable HTTP.
Endpoint: /mcp
"""

from __future__ import annotations

import os
import shutil
import signal
import sys
from pathlib import Path
from typing import Any

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from plant_knowledge_mcp.data_store import PlantKnowledgeStore

_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_DATA_DIR = _ROOT / "data"
_REQUIRED_CSVS = (
    "plant_water_needs.csv",
    "wucols_water_use_classes.csv",
    "wucols_regions.csv",
    "wucols_plant_types.csv",
    "usda_hardiness_zones.csv",
    "reference_et0.csv",
)


def _resolve_data_dir() -> Path:
    data_dir = Path(os.getenv("DATA_DIR", str(_DEFAULT_DATA_DIR))).resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    if not all((data_dir / name).is_file() for name in _REQUIRED_CSVS):
        for name in _REQUIRED_CSVS:
            src = _DEFAULT_DATA_DIR / name
            dst = data_dir / name
            if src.is_file() and not dst.is_file():
                shutil.copy2(src, dst)
    return data_dir


_DATA_DIR = _resolve_data_dir()
_HOST = os.getenv("HOST", "0.0.0.0")
_PORT = int(os.getenv("PORT", "8080"))

_store = PlantKnowledgeStore(_DATA_DIR)


def _reload_data() -> dict[str, Any]:
    _store.reload()
    return {"reloaded": True, "row_counts": _store.row_counts}


def create_mcp_server():
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        sys.stderr.write(
            "plant-knowledge MCP: install the official Python SDK: pip install 'mcp>=1.2.0'\n"
        )
        raise

    mcp = FastMCP(
        "plant-knowledge",
        host=_HOST,
        port=_PORT,
        instructions=(
            "Deterministic plant watering reference data for irrigation decisions. "
            "The plant list is a curated seed set — NOT the complete WUCOLS export. "
            "Use get_water_requirement_mm with live ET0 when available."
        ),
    )

    @mcp.custom_route("/healthz", methods=["GET"])
    async def healthz(_request: Request) -> Response:
        return JSONResponse({"status": "ok", "data_dir": str(_DATA_DIR)})

    @mcp.custom_route("/reload", methods=["POST"])
    async def reload_endpoint(_request: Request) -> Response:
        return JSONResponse(_reload_data())

    @mcp.tool()
    def get_plant_profile(name: str) -> dict[str, Any]:
        """Exact lookup by scientific or common name (case-insensitive).

        Returns the plant row from the curated seed set plus joined WUCOLS water-use
        class and plant-type names. The plant list is a curated seed set — NOT the
        complete ~4,100-taxa WUCOLS export. When not found, returns found=false with
        up to five deterministic name suggestions (never fabricates a plant factor).
        """
        return _store.get_plant_profile(name)

    @mcp.tool()
    def search_plants(
        query: str,
        plant_type: str | None = None,
        max_water_use: str | None = None,
        usda_zone: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """Keyword search over common_name, scientific_name, and notes (deterministic).

        Optional filters: plant_type_code, water-use ceiling (e.g. max_water_use=LO
        returns VL and LO plants), and USDA zone viability (usda_zone_low ≤ zone ≤
        usda_zone_high). Results are ranked: exact name matches first, then common
        name, then notes. Data source is the curated seed set, not full WUCOLS.
        """
        return _store.search_plants(
            query=query,
            plant_type=plant_type,
            max_water_use=max_water_use,
            usda_zone=usda_zone,
            limit=limit,
        )

    @mcp.tool()
    def get_water_requirement_mm(
        name: str,
        climate_setting: str | None = None,
        et0_mm_per_week: float | None = None,
    ) -> dict[str, Any]:
        """Compute weekly irrigation need in mm: plant_factor_midpoint × et0_mm_per_week.

        ET0 precedence: (1) explicit et0_mm_per_week (live/production ET0), else
        (2) climate_setting from reference_et0.csv (representative peak-season values).
        Returns weekly_need_mm plus plant_factor, et0_source, and et0_mm_per_week so
        the harness can audit the derivation. reference_et0 values are NOT live weather.
        """
        return _store.get_water_requirement_mm(
            name=name,
            climate_setting=climate_setting,
            et0_mm_per_week=et0_mm_per_week,
        )

    @mcp.tool()
    def get_usda_zone(zone: str) -> dict[str, Any]:
        """Return the USDA Plant Hardiness Zone temperature band for a zone like 7a."""
        return _store.get_usda_zone(zone)

    @mcp.tool()
    def resolve_zone_from_temp(temp_f: float) -> dict[str, Any]:
        """Map a Fahrenheit temperature to the matching USDA hardiness zone band."""
        return _store.resolve_zone_from_temp(temp_f)

    @mcp.tool()
    def list_reference_et0() -> dict[str, Any]:
        """List representative peak-season reference ET0 values by climate_setting.

        Use these only when live ET0 is unavailable. Values are representative, not live.
        """
        return _store.list_reference_et0()

    @mcp.tool()
    def describe_dataset() -> dict[str, Any]:
        """Return provenance metadata: authoritative vs curated vs representative files,
        row counts, and an explicit note that the plant list is a seed set, not full WUCOLS.
        """
        return _store.describe_dataset()

    return mcp


def _handle_sighup(_signum: int, _frame: object) -> None:
    _reload_data()


def main() -> None:
    if hasattr(signal, "SIGHUP"):
        signal.signal(signal.SIGHUP, _handle_sighup)
    mcp = create_mcp_server()
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
