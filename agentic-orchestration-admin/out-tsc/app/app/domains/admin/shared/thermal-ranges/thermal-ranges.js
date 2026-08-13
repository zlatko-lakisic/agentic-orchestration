/**
 * Operating-temperature library for Overview charts.
 *
 * Source of truth (also published as raw GitHub CSV):
 * `assets/thermal-operating-ranges.csv`
 */
/** Embedded copy of assets/thermal-operating-ranges.csv (keep in sync). */
const THERMAL_RANGES_CSV = `# Thermal operating ranges for AO host-metrics charts (Celsius).
kind,match,min_c,max_c,label,source
gpu,RTX 4000 SFF Ada,0,95,NVIDIA RTX 4000 SFF Ada,https://www.nvidia.com/en-us/products/workstations/rtx-4000-sff-ada/
gpu,RTX 4000 Ada,0,95,NVIDIA RTX 4000 Ada,https://www.nvidia.com/en-us/products/workstations/rtx-4000-ada/
gpu,RTX 6000 Ada,0,95,NVIDIA RTX 6000 Ada,https://www.nvidia.com/en-us/products/workstations/rtx-6000-ada/
gpu,RTX 5000 Ada,0,95,NVIDIA RTX 5000 Ada,https://www.nvidia.com/en-us/products/workstations/rtx-5000-ada/
gpu,Ada Generation,0,95,NVIDIA Ada GPU (typical),https://www.nvidia.com/en-us/data-center/technologies/ada-architecture/
gpu,GeForce RTX 40,0,90,NVIDIA GeForce RTX 40-series (typical),https://www.nvidia.com/en-us/geforce/graphics-cards/
gpu,GeForce RTX 30,0,93,NVIDIA GeForce RTX 30-series (typical),https://www.nvidia.com/en-us/geforce/graphics-cards/
gpu,A100,0,85,NVIDIA A100,https://www.nvidia.com/en-us/data-center/a100/
gpu,H100,0,85,NVIDIA H100,https://www.nvidia.com/en-us/data-center/h100/
gpu,L40,0,90,NVIDIA L40,https://www.nvidia.com/en-us/data-center/l40/
gpu,Tesla T4,0,85,NVIDIA T4,https://www.nvidia.com/en-us/data-center/tesla-t4/
gpu,Jetson AGX Orin,-25,99,Jetson AGX Orin SoC (recommended),https://developer.nvidia.com/embedded/jetson-agx-orin
gpu,Jetson Orin NX,-25,99,Jetson Orin NX SoC (TJ),https://developer.nvidia.com/embedded/jetson-orin
gpu,Jetson Orin Nano,-25,99,Jetson Orin Nano SoC (TJ),https://developer.nvidia.com/embedded/jetson-orin
gpu,Jetson,-25,99,NVIDIA Jetson SoC (typical TJ),https://developer.nvidia.com/embedded-computing
gpu,Radeon RX 7,0,110,AMD Radeon RX 7000 (typical),https://www.amd.com/en/products/graphics/desktops/radeon.html
gpu,Radeon RX 6,0,110,AMD Radeon RX 6000 (typical),https://www.amd.com/en/products/graphics/desktops/radeon.html
gpu,Radeon,0,110,AMD Radeon GPU (typical),https://www.amd.com/en/products/graphics/desktops/radeon.html
gpu,Intel Arc,0,100,Intel Arc GPU (typical),https://www.intel.com/content/www/us/en/products/docs/discrete-gpus/arc/overview.html
gpu,NVIDIA,0,95,NVIDIA GPU (typical),https://www.nvidia.com/
gpu,*,0,95,Generic GPU,https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv
cpu,Jetson AGX Orin,-25,99,Jetson AGX Orin CPU/SoC,https://developer.nvidia.com/embedded/jetson-agx-orin
cpu,Jetson Orin,-25,99,Jetson Orin CPU/SoC,https://developer.nvidia.com/embedded/jetson-orin
cpu,Jetson,-25,99,NVIDIA Jetson CPU/SoC,https://developer.nvidia.com/embedded-computing
cpu,Ryzen AI,0,100,AMD Ryzen AI (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen 9,0,95,AMD Ryzen 9 (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen 7,0,95,AMD Ryzen 7 (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen 5,0,95,AMD Ryzen 5 (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,Ryzen,0,95,AMD Ryzen (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,EPYC,0,95,AMD EPYC (Tjmax typical),https://www.amd.com/en/products/processors/server/epyc.html
cpu,Xeon,0,100,Intel Xeon (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core Ultra,0,105,Intel Core Ultra (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i9,0,100,Intel Core i9 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i7,0,100,Intel Core i7 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i5,0,100,Intel Core i5 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Core i3,0,100,Intel Core i3 (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,Intel,0,100,Intel CPU (max operating typical),https://github.com/toUpperCase78/intel-processors
cpu,AMD,0,95,AMD CPU (Tjmax typical),https://github.com/felixsteinke/cpu-spec-dataset/blob/main/dataset/amd-cpus.csv
cpu,ARMv8,0,99,Armv8 SoC (typical),https://developer.nvidia.com/embedded-computing
cpu,aarch64,0,99,Arm aarch64 SoC (typical),https://developer.nvidia.com/embedded-computing
cpu,*,0,100,Generic CPU,https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv
`;
export const THERMAL_RANGES_CSV_URL = 'https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv';
function parseCsv(text) {
    const rows = [];
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        if (line.startsWith('kind,'))
            continue;
        const parts = line.split(',');
        if (parts.length < 6)
            continue;
        const kind = parts[0]?.trim().toLowerCase();
        if (kind !== 'cpu' && kind !== 'gpu')
            continue;
        const match = parts[1]?.trim() ?? '';
        const minC = Number(parts[2]);
        const maxC = Number(parts[3]);
        if (!Number.isFinite(minC) || !Number.isFinite(maxC) || maxC <= minC)
            continue;
        const label = parts[4]?.trim() || match || kind;
        const source = parts.slice(5).join(',').trim();
        rows.push({ kind, match, minC, maxC, label, source });
    }
    return rows;
}
const RANGES = parseCsv(THERMAL_RANGES_CSV);
const DEFAULTS = {
    cpu: {
        kind: 'cpu',
        match: '*',
        minC: 0,
        maxC: 100,
        label: 'Generic CPU',
        source: THERMAL_RANGES_CSV_URL,
    },
    gpu: {
        kind: 'gpu',
        match: '*',
        minC: 0,
        maxC: 95,
        label: 'Generic GPU',
        source: THERMAL_RANGES_CSV_URL,
    },
};
/** Resolve the best operating range for a detected CPU/GPU name. */
export function resolveThermalRange(kind, deviceName) {
    const hay = String(deviceName || '')
        .trim()
        .toLowerCase();
    const candidates = RANGES.filter((r) => r.kind === kind);
    // Prefer longer match strings (more specific) before shorter / wildcard.
    const ranked = [...candidates].sort((a, b) => {
        const aw = a.match === '*' ? -1 : a.match.length;
        const bw = b.match === '*' ? -1 : b.match.length;
        return bw - aw;
    });
    for (const row of ranked) {
        if (row.match === '*')
            continue;
        if (hay && hay.includes(row.match.toLowerCase())) {
            return row;
        }
    }
    return ranked.find((r) => r.match === '*') || DEFAULTS[kind];
}
export function formatThermalRange(range) {
    return `${range.minC}–${range.maxC}°C`;
}
