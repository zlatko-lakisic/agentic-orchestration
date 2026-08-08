import { OnDestroy, OnInit } from '@angular/core';
import { MatChipListboxChange } from '@angular/material/chips';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexLegend, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { PingResponse, SessionResponse, TopologyComponent, TopologyResponse } from '@/app/core/ao-api/types';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
/**
 * Overview — live host metrics (WS) + Fuse Apex charts + filterable live logs.
 */
export declare class OverviewPage implements OnInit, OnDestroy {
    private api;
    private theming;
    readonly live: AoLiveWs;
    private logViewport;
    private topologyTimer;
    readonly topology: import("@angular/core").WritableSignal<TopologyResponse | null>;
    readonly ping: import("@angular/core").WritableSignal<PingResponse | null>;
    readonly session: import("@angular/core").WritableSignal<SessionResponse | null>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly selectedSources: import("@angular/core").WritableSignal<string[]>;
    readonly components: import("@angular/core").Signal<TopologyComponent[]>;
    readonly filteredLogs: import("@angular/core").Signal<import("@/app/core/ao-live/ao-live-ws").AdminLogEntry[]>;
    readonly chartSeries: import("@angular/core").Signal<ApexAxisChartSeries>;
    readonly summary: import("@angular/core").Signal<{
        title: string;
        icon: string;
        value: number;
        caption: string;
        toneIcon: string;
        toneClass: string;
    }[]>;
    protected utilChart: {
        chart: ApexChart;
        colors: string[];
        dataLabels: ApexDataLabels;
        fill: ApexFill;
        grid: ApexGrid;
        legend: ApexLegend;
        stroke: ApexStroke;
        tooltip: import("@angular/core").Signal<ApexTooltip>;
        xaxis: ApexXAxis;
        yaxis: ApexYAxis;
    };
    protected sparkChart: {
        chart: ApexChart;
        fill: ApexFill;
        stroke: ApexStroke;
        tooltip: ApexTooltip;
    };
    constructor();
    ngOnInit(): void;
    ngOnDestroy(): void;
    sparkSeries(key: 'cpu' | 'mem' | 'gpu'): ApexAxisChartSeries;
    onSourcesChange(ev: MatChipListboxChange): void;
    reload(): void;
    componentHref(c: TopologyComponent): string | null;
    resourceBarColor(pct: number | null): 'primary' | 'warn' | 'error';
    statusLabel(status: string | undefined): string;
    statusTextClass(status: string | undefined): string;
    watermarkIcon(status: string | undefined): string;
    watermarkClass(status: string | undefined): string;
    formatUptime(sec?: number): string;
    formatLogTime(ts: string): string;
    sourceClass(source: string): string;
    levelClass(level: string): string;
}
