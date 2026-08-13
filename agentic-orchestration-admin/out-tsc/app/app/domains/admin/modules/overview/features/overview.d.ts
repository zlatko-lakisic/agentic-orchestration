import { OnDestroy, OnInit } from '@angular/core';
import { MatChipListboxChange } from '@angular/material/chips';
import { ApexAxisChartSeries, ApexChart, ApexFill, ApexStroke, ApexTooltip } from 'ng-apexcharts';
import { PingResponse, SessionResponse, TopologyComponent, TopologyResponse } from '@/app/core/ao-api/types';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
/**
 * Overview — live host metrics (WS) + Fuse Apex charts + filterable live logs.
 */
export declare class OverviewPage implements OnInit, OnDestroy {
    private api;
    private route;
    readonly live: AoLiveWs;
    private logViewport;
    readonly topology: import("@angular/core").WritableSignal<TopologyResponse | null>;
    readonly ping: import("@angular/core").WritableSignal<PingResponse | null>;
    readonly session: import("@angular/core").WritableSignal<SessionResponse | null>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly selectedSources: import("@angular/core").WritableSignal<string[]>;
    readonly followLogs: import("@angular/core").WritableSignal<boolean>;
    readonly runIdFilter: import("@angular/core").WritableSignal<string>;
    readonly logsExpanded: import("@angular/core").WritableSignal<boolean>;
    readonly components: import("@angular/core").Signal<TopologyComponent[]>;
    /** Dependency order for the topology list; unknown ids keep API order at the end. */
    readonly orderedComponents: import("@angular/core").Signal<TopologyComponent[]>;
    readonly topologyUnhealthyCount: import("@angular/core").Signal<number>;
    readonly filteredLogs: import("@angular/core").Signal<import("@/app/core/ao-live/ao-live-ws").AdminLogEntry[]>;
    readonly summary: import("@angular/core").Signal<{
        title: string;
        icon: string;
        value: number;
        caption: string;
        toneIcon: string;
        toneClass: string;
    }[]>;
    protected sparkChart: {
        chart: ApexChart;
        fill: ApexFill;
        stroke: ApexStroke;
        tooltip: ApexTooltip;
    };
    constructor();
    ngOnInit(): void;
    onRunIdFilterChange(value: string): void;
    private applyRunIdFilter;
    ngOnDestroy(): void;
    sparkSeries(key: 'cpu' | 'mem' | 'gpu' | 'vram'): ApexAxisChartSeries;
    onSourcesChange(ev: MatChipListboxChange): void;
    exportBundle(): void;
    reload(): void;
    componentHref(c: TopologyComponent): string | null;
    statusLabel(status: string | undefined): string;
    statusTextClass(status: string | undefined): string;
    statusDotClass(status: string | undefined): string;
    formatLogTime(ts: string): string;
    sourceClass(source: string): string;
    levelClass(level: string): string;
}
