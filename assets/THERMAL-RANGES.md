# Thermal operating ranges

CSV library used by AO Admin Overview temperature axes.

**Online URL (raw):**  
https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv

## Columns

| Column | Meaning |
|--------|---------|
| `kind` | `cpu` or `gpu` |
| `match` | Case-insensitive substring against `cpu.model` / `gpu.name` (`*` = fallback) |
| `min_c` / `max_c` | Chart Y-axis operating range (°C) |
| `label` | Human-readable range name |
| `source` | Datasheet or upstream CSV |

## Upstream references

- AMD processor Tjmax exports: [felixsteinke/cpu-spec-dataset `amd-cpus.csv`](https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv)
- Intel max operating temps: [toUpperCase78/intel-processors](https://github.com/toUpperCase78/intel-processors)
- NVIDIA Jetson Orin TJ / recommended SoC limits from Jetson module datasheets
- Discrete NVIDIA GPUs: product pages (typical 0–95 °C class unless noted)

Edit `thermal-operating-ranges.csv` then copy into Admin/web `public/` (or rebuild Admin).
