import { OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexLegend, ApexNonAxisChartSeries, ApexPlotOptions, ApexResponsive, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AoClock } from '@/app/core/ao-time/ao-time';
import { LlmSpendTotals, LlmUsageResponse, LlmUsageRollupRow } from '@/app/core/ao-api/types';
type PanelView = 'diagram' | 'table';
type LlmTxRow = {
    whenMs: number;
    runId: string | null;
    app: string;
    model: string;
    tokens: number;
    status: 'failed' | 'succeeded';
};
type SpendRangeId = '6h' | '1d' | '7d' | '15d' | '30d';
type PieSlice = {
    series: ApexNonAxisChartSeries;
    labels: string[];
};
/**
 * Token usage — Fuse Finance dashboard pattern:
 * statement cards, spend-over-time area chart, recent transactions, budget split.
 */
export declare class LlmUsagePage implements OnInit, OnDestroy {
    readonly live: AoLiveWs;
    readonly clock: AoClock;
    readonly llmCols: string[];
    readonly txCols: string[];
    readonly feedSeconds: import("@angular/core").WritableSignal<number>;
    readonly spendRanges: readonly {
        id: SpendRangeId;
        label: string;
        hours: number;
    }[];
    /** Rolling spend window (default past 6 hours). */
    readonly spendRange: import("@angular/core").WritableSignal<SpendRangeId>;
    /** Per-panel Diagram / Table preference (defaults to diagram). */
    private readonly panelViews;
    readonly txDataSource: MatTableDataSource<LlmTxRow>;
    readonly data: import("@angular/core").Signal<LlmUsageResponse | null>;
    readonly error: import("@angular/core").Signal<string | null>;
    readonly updatedAgo: import("@angular/core").Signal<string | null>;
    readonly statements: import("@angular/core").Signal<{
        id: string;
        title: string;
        caption: string;
        icon: string;
        totals: LlmSpendTotals;
        growthPct: number | null;
    }[]>;
    readonly rangeLabel: import("@angular/core").Signal<string>;
    readonly rangeHours: import("@angular/core").Signal<number>;
    readonly chartSeries: import("@angular/core").Signal<ApexAxisChartSeries>;
    readonly spendTooltip: import("@angular/core").Signal<ApexTooltip>;
    readonly spendXaxis: import("@angular/core").Signal<ApexXAxis>;
    readonly transactions: import("@angular/core").Signal<LlmTxRow[]>;
    readonly recentSummary: import("@angular/core").Signal<string>;
    readonly budgetBars: import("@angular/core").Signal<({
        title: string;
        value: number;
        pct: number;
        color: "primary";
        toneClass: string;
    } | {
        title: string;
        value: number;
        pct: number;
        color: "accent";
        toneClass: string;
    } | {
        title: string;
        value: number;
        pct: number;
        color: "warn";
        toneClass: string;
    })[]>;
    readonly topApps: import("@angular/core").Signal<LlmUsageRollupRow[]>;
    readonly apiRequestCount: import("@angular/core").Signal<number>;
    readonly compositionPie: import("@angular/core").Signal<PieSlice>;
    readonly clientAppCount: import("@angular/core").Signal<number>;
    readonly llmBlocks: import("@angular/core").Signal<{
        id: string;
        title: string;
        rows: LlmUsageRollupRow[];
        pie: PieSlice;
    }[]>;
    protected spendChart: {
        chart: ApexChart;
        colors: string[];
        dataLabels: ApexDataLabels;
        fill: ApexFill;
        grid: ApexGrid;
        legend: ApexLegend;
        stroke: ApexStroke;
        tooltip: ApexTooltip;
        xaxis: ApexXAxis;
        yaxis: ApexYAxis;
    };
    /** Fuse-style donut for composition + rollup breakdowns. */
    protected donutChart: {
        chart: ApexChart;
        colors: string[];
        dataLabels: ApexDataLabels;
        legend: ApexLegend;
        plotOptions: ApexPlotOptions;
        responsive: ApexResponsive[];
        stroke: ApexStroke;
        tooltip: ApexTooltip;
    };
    constructor();
    panelView(id: string): PanelView;
    setPanelView(id: string, value: PanelView | string | null | undefined): void;
    setSpendRange(value: SpendRangeId | string | null | undefined): void;
    private feedParams;
    ngOnInit(): void;
    ngOnDestroy(): void;
    resync(): void;
}
export {};
