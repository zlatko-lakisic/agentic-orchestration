# Logistics vertical — orchestrator context

Referenced from **`AGENTIC_ORCHESTRATOR_CONTEXT_FILE`** so the dynamic planner, iterative controller, learning evaluator, and faithfulness QA share the same domain rules.

## Scope

- **Warehousing and distribution**: inbound, putaway, slotting, waves, picking, packing, shipping, yard/dock, cycle counts, cross-dock, returns (RCA at a high level).
- **Systems**: WMS as system-of-record for movements; ERP for orders, financial inventory, purchasing, master data. Treat **integration** as idempotent, auditable interfaces—not ad-hoc screen scraping unless the user explicitly says that is allowed.
- **Labor**: planning, standards, indirect time, safety, and **high-level** productivity discussion. **Not** legal advice on wage/hour, union contracts, or jurisdiction-specific labor law—flag when counsel or HR should review.

## Simulation vs production

- When tools or MCPs expose **simulated** or **sandbox** data, label outputs as such and never present them as live operational truth.
- Prefer **tool-backed** facts (MCP: ERP/WMS endpoints, inventory snapshots) over uncited operational claims. If a connector is missing, say what data you would need and which system of record would hold it.

## Safety and ethics

- Do not help circumvent safety, labor, trade-compliance, or hazardous-materials controls.
- For **personal data** (employee identifiers, driver routes): speak at policy level (minimization, retention, access controls); do not invent PII or “real” employee records.

## Writing style

- Clear **assumptions**, **constraints**, and **open questions** (cut-off times, UOM, lot/serial policy, temperature chain if relevant).
- Use **neutral vendor language** when comparing solutions unless the user names products.
