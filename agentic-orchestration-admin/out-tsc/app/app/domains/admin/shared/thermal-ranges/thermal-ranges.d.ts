/**
 * Operating-temperature library for Overview charts.
 *
 * Source of truth (also published as raw GitHub CSV):
 * `assets/thermal-operating-ranges.csv`
 */
export type ThermalKind = 'cpu' | 'gpu';
export interface ThermalRange {
    kind: ThermalKind;
    match: string;
    minC: number;
    maxC: number;
    label: string;
    source: string;
}
export declare const THERMAL_RANGES_CSV_URL = "https://raw.githubusercontent.com/zlatko-lakisic/agentic-orchestration/main/assets/thermal-operating-ranges.csv";
/** Resolve the best operating range for a detected CPU/GPU name. */
export declare function resolveThermalRange(kind: ThermalKind, deviceName: string | null | undefined): ThermalRange;
export declare function formatThermalRange(range: ThermalRange): string;
