import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexLegend, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
/**
 * Full host utilization card — CPU/mem + GPU/VRAM area charts.
 * Used on Overview and in the toolbar modal on other admin pages.
 */
export declare class HostUtilization {
    readonly live: AoLiveWs;
    private theming;
    readonly cpuMemSeries: import("@angular/core").Signal<ApexAxisChartSeries>;
    readonly gpuVramSeries: import("@angular/core").Signal<ApexAxisChartSeries>;
    readonly cpuMemChartColors: string[];
    readonly gpuVramChartColors: string[];
    readonly cpuThermalRange: import("@angular/core").Signal<import("@/app/domains/admin/shared/thermal-ranges/thermal-ranges").ThermalRange>;
    readonly gpuThermalRange: import("@angular/core").Signal<import("@/app/domains/admin/shared/thermal-ranges/thermal-ranges").ThermalRange>;
    readonly cpuMemTooltip: import("@angular/core").Signal<ApexTooltip>;
    readonly gpuVramTooltip: import("@angular/core").Signal<ApexTooltip>;
    readonly cpuMemYaxis: import("@angular/core").Signal<ApexYAxis[]>;
    readonly gpuVramYaxis: import("@angular/core").Signal<ApexYAxis[]>;
    protected utilChart: {
        chart: ApexChart;
        colors: string[];
        dataLabels: ApexDataLabels;
        fill: ApexFill;
        grid: ApexGrid;
        legend: ApexLegend;
        stroke: ApexStroke;
        xaxis: ApexXAxis;
    };
    resourceBarColor(pct: number | null): 'primary' | 'warn' | 'error';
    formatUptime(sec?: number): string;
}
