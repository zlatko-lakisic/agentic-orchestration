import { ApexAxisChartSeries, ApexChart, ApexFill, ApexStroke, ApexTooltip } from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
/**
 * Compact CPU + GPU sparklines in the admin top bar.
 * One control — click opens the full Overview-style utilization modal.
 */
export declare class HostUtilizationButton {
    readonly live: AoLiveWs;
    private dialog;
    readonly cpuColors: string[];
    readonly gpuColors: string[];
    readonly cpuSeries: import("@angular/core").Signal<ApexAxisChartSeries>;
    readonly gpuSeries: import("@angular/core").Signal<ApexAxisChartSeries>;
    protected sparkChart: {
        chart: ApexChart;
        fill: ApexFill;
        stroke: ApexStroke;
        tooltip: ApexTooltip;
    };
    open(): void;
    pct(value: number | null): string;
    private sparkValues;
}
