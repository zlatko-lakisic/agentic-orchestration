# Plant-knowledge MCP (standalone)

Deterministic plant / zone / ET0 reference server for irrigation decisions. **Not part of the agentic-orchestration core product** — deploy and operate this service independently, then optionally wire it into workflows via `AGENTIC_EXTRA_MCP_PROVIDERS_PATH`.

**Honesty:** `data/plant_water_needs.csv` is a **curated seed set** (~50 species), not the official ~4,100-taxa WUCOLS export.

## Run locally

```bash
cd extras/plant-knowledge-mcp
pip install -r requirements.txt
export DATA_DIR=./data   # optional; default
python -m plant_knowledge_mcp
```

- MCP: `http://127.0.0.1:8080/mcp`
- Health: `GET /healthz`
- Reload CSVs: `POST /reload` or `SIGHUP`

## Docker

```bash
cd extras/plant-knowledge-mcp
docker build -t plant-knowledge-mcp:latest .
docker run --rm -p 8080:8080 plant-knowledge-mcp:latest
```

## Kubernetes (standalone)

```bash
kubectl apply -f k8s/deploy.yaml
```

Service URL (in-cluster):

```text
http://plant-knowledge-mcp.plant-knowledge.svc.cluster.local:8080/mcp
```

## Wire into agentic-orchestration (optional)

This server is **not** in the shipped `config/mcp_providers/` catalog. Point the orchestrator at the extra catalog:

```bash
# .env (paths relative to agentic-orchestration-tool/ when running from there)
AGENTIC_EXTRA_MCP_PROVIDERS_PATH=../extras/plant-knowledge-mcp/config
PLANT_KNOWLEDGE_MCP_URL=http://127.0.0.1:8080/mcp
```

Workflow:

```yaml
workflow:
  mcp_providers:
    - plant_knowledge
    - home_assistant   # optional
```

On Kubernetes, set `PLANT_KNOWLEDGE_MCP_URL` to the standalone service URL. You may also need `AGENTIC_K8S_ALLOW_STDIO_MCPS` or ensure the planner allows extra HTTP MCPs — native HTTP MCPs outside the default allowlist are resolved when the catalog entry is present and env is set.

### Irrigation skill nudge (optional)

If you use `jetson_irrigation` or similar, add to your **extra** agent skill (not core):

> Before deciding, query the plant-knowledge MCP for the plant's water requirement (`get_water_requirement_mm`) using the zone's live ET₀ if available.

## Tools

| Tool | Purpose |
|------|---------|
| `get_plant_profile` | Exact lookup by scientific or common name |
| `search_plants` | Keyword search with optional filters |
| `get_water_requirement_mm` | `plant_factor × ET0` → mm/week |
| `get_usda_zone` / `resolve_zone_from_temp` | USDA zone reference |
| `list_reference_et0` / `describe_dataset` | Climate table + provenance |

## Tests

```bash
cd extras/plant-knowledge-mcp
pip install -r requirements.txt
pytest
```

## Data (`DATA_DIR`)

| File | Status |
|------|--------|
| `wucols_water_use_classes.csv` | Authoritative |
| `wucols_regions.csv` | Authoritative |
| `wucols_plant_types.csv` | Authoritative |
| `usda_hardiness_zones.csv` | Authoritative |
| `reference_et0.csv` | Representative (not live) |
| `plant_water_needs.csv` | **Curated seed set** |

Swap in a larger `plant_water_needs.csv` and `POST /reload` — no image rebuild when using a volume mount.
