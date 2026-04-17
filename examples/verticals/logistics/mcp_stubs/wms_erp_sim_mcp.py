"""
Simulated ERP/WMS/labor MCP for the logistics vertical (fixtures only).

Requires: pip install mcp
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


def _load(name: str) -> dict:
    p = _FIXTURES / name
    if not p.is_file():
        return {"error": f"missing fixture {name}"}
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> None:
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        sys.stderr.write(
            "logistics sim MCP: install the official Python SDK: pip install mcp\n"
            "Then set AGENTIC_MCP_LOGISTICS_SIM_ENABLED=1 and keep AGENTIC_LOGISTICS_SIM_MCP_PY set.\n"
        )
        sys.exit(1)

    mcp = FastMCP(
        "logistics-sim",
        instructions=(
            "Simulated warehouse + ERP + labor data from JSON fixtures under examples/verticals/logistics/fixtures/. "
            "Not production data."
        ),
    )

    @mcp.tool()
    def sim_erp_open_purchase_orders(limit: int = 50) -> str:
        """Return a slice of simulated open / in-flight purchase orders (ERP view)."""
        rows = _load("purchase_orders.json").get("orders", [])
        lim = max(1, min(int(limit), 200))
        return json.dumps(rows[:lim], indent=2)

    @mcp.tool()
    def sim_wms_inventory_snapshot(warehouse_id: str = "WH-East-01") -> str:
        """Return a simulated WMS bin/sku snapshot for one warehouse id."""
        inv = _load("inventory.json")
        whs = inv.get("warehouses") or {}
        wh = whs.get(warehouse_id) or next(iter(whs.values()), {})
        return json.dumps(wh, indent=2)

    @mcp.tool()
    def sim_labor_shift_coverage(zone_id: str = "PICK-01") -> str:
        """Return simulated labor coverage for a pick zone (headcount vs plan, notes)."""
        z = (_load("labor_shifts.json").get("zones") or {}).get(zone_id, {})
        return json.dumps(z, indent=2)

    @mcp.tool()
    def sim_wms_wave_status(wave_id: str = "WAVE-2044") -> str:
        """Return a simulated wave summary (released / dock doors / volumes)."""
        w = _load("waves.json")
        return json.dumps({**w, "requested_wave_id": wave_id}, indent=2)

    mcp.run()


if __name__ == "__main__":
    main()
