import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { HostMetrics } from '@/app/core/ao-api/types';
export interface MetricsPoint {
    t: number;
    cpu: number | null;
    mem: number | null;
    gpu: number | null;
    vram: number | null;
    cpuTemp: number | null;
    gpuTemp: number | null;
}
export interface AdminLogEntry {
    id: number;
    source: string;
    level: string;
    ts: string;
    line: string;
}
export declare class AoLiveWs implements OnDestroy {
    private readonly webAuth;
    private ws;
    private reconnectTimer;
    private destroyed;
    private wantMetrics;
    private wantLogs;
    private wantTopology;
    private wantFeeds;
    private feedParams;
    private feedIntervalMs;
    private logSources;
    private logSeq;
    private refCount;
    private lastHistoryPushMs;
    private visibilityHandler;
    /** Topology WS events (snapshot / delta / health / metrics / watch). */
    readonly topologyEvents: Subject<{
        [k: string]: unknown;
        type: string;
    }>;
    /** Latest snapshot per admin feed topic (llm_usage, traces, runs, …). */
    readonly feeds: import("@angular/core").WritableSignal<Record<string, unknown>>;
    readonly feedErrors: import("@angular/core").WritableSignal<Record<string, string>>;
    readonly connected: import("@angular/core").WritableSignal<boolean>;
    readonly metrics: import("@angular/core").WritableSignal<HostMetrics | null>;
    readonly history: import("@angular/core").WritableSignal<MetricsPoint[]>;
    readonly logs: import("@angular/core").WritableSignal<AdminLogEntry[]>;
    readonly logSourceOptions: import("@angular/core").WritableSignal<string[]>;
    readonly latestCpu: import("@angular/core").Signal<number | null>;
    readonly latestMem: import("@angular/core").Signal<number | null>;
    readonly latestGpu: import("@angular/core").Signal<number | null>;
    readonly latestVram: import("@angular/core").Signal<number | null>;
    readonly latestCpuTemp: import("@angular/core").Signal<number | null>;
    readonly latestGpuTemp: import("@angular/core").Signal<number | null>;
    readonly cpuModel: import("@angular/core").Signal<string | null>;
    readonly gpuName: import("@angular/core").Signal<string | null>;
    readonly memoryLabel: import("@angular/core").Signal<string | null>;
    readonly vramLabel: import("@angular/core").Signal<string | null>;
    /** Acquire a shared live connection (call from component ngOnInit). */
    acquire(opts: {
        metrics?: boolean;
        logs?: boolean;
        topology?: boolean;
        feeds?: string[];
        feedParams?: Record<string, unknown>;
        feedIntervalMs?: number;
        logSources?: string[];
    }): void;
    /** Update feed query params (e.g. traces filters) and request an immediate push. */
    setFeedParams(params: Record<string, unknown>): void;
    /** Re-subscribe to active feeds so the server pushes a fresh snapshot now. */
    refreshFeeds(): void;
    /** Typed helper for the latest snapshot of a feed topic. */
    feedData<T = unknown>(topic: string): T | null;
    /**
     * True until the first snapshot (or error) arrives for an admin feed topic.
     * Use this to show a loading animation instead of an empty-state flash.
     */
    feedLoading(topic: string): boolean;
    resyncTopology(): void;
    /** Focused live series for a node/edge modal — pair with unsubscribeTopologyWatch. */
    subscribeTopologyWatch(target: 'node' | 'edge', id: string): void;
    unsubscribeTopologyWatch(target: 'node' | 'edge', id: string): void;
    /** Release one consumer (call from component ngOnDestroy). */
    release(): void;
    setLogSources(sources: string[] | null): void;
    /** Ask the web process to tail worker Job pods for this run_id (in-cluster). */
    followRunLogs(runId: string): void;
    clearLogs(): void;
    ngOnDestroy(): void;
    private wsUrl;
    private ensureConnected;
    private pushSubscriptions;
    private tabHidden;
    private bindVisibility;
    private unbindVisibility;
    private onMessage;
    private pushHistory;
    private scheduleReconnect;
    private closeSocket;
}
