import { OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { TopologyEdge } from '../data/topology.types';
type Pt = {
    x: number;
    y: number | null;
};
export declare class EdgeDetailDialog implements OnInit, OnDestroy {
    readonly data: {
        edge: TopologyEdge;
    };
    readonly ref: MatDialogRef<any, any>;
    private readonly live;
    readonly wikiPage = "Topology-dashboard";
    readonly wikiHelp: import("../data/topology.help").TopologyHelp;
    readonly instrumented: import("@angular/core").WritableSignal<boolean>;
    readonly liveStatus: import("@angular/core").WritableSignal<string | null>;
    readonly latest: import("@angular/core").WritableSignal<{
        rate?: number | null;
        latencyP95?: number | null;
        errorRate?: number | null;
    } | null>;
    readonly ratePts: import("@angular/core").WritableSignal<Pt[]>;
    readonly latencyPts: import("@angular/core").WritableSignal<Pt[]>;
    readonly trafficActive: import("@angular/core").WritableSignal<boolean>;
    readonly sparkChart: ApexChart;
    readonly sparkStroke: ApexStroke;
    readonly sparkFill: ApexFill;
    readonly sparkTooltip: ApexTooltip;
    readonly sparkXaxis: ApexXAxis;
    readonly sparkYaxis: ApexYAxis;
    readonly sparkGrid: ApexGrid;
    readonly noDataLabels: ApexDataLabels;
    private sub;
    private watching;
    ngOnInit(): void;
    ngOnDestroy(): void;
    onTab(index: number): void;
    rateSeries(): ApexAxisChartSeries;
    latencySeries(): ApexAxisChartSeries;
    private applyWatch;
    private teardown;
}
export {};
