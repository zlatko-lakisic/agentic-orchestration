import { OnDestroy } from '@angular/core';
import { HostMetrics } from '@/app/core/ao-api/types';
export interface MetricsPoint {
    t: number;
    cpu: number | null;
    mem: number | null;
    gpu: number | null;
}
export interface AdminLogEntry {
    id: number;
    source: string;
    level: string;
    ts: string;
    line: string;
}
export declare class AoLiveWs implements OnDestroy {
    private ws;
    private reconnectTimer;
    private destroyed;
    private wantMetrics;
    private wantLogs;
    private logSources;
    private logSeq;
    private refCount;
    readonly connected: import("@angular/core").WritableSignal<boolean>;
    readonly metrics: import("@angular/core").WritableSignal<HostMetrics | null>;
    readonly history: import("@angular/core").WritableSignal<MetricsPoint[]>;
    readonly logs: import("@angular/core").WritableSignal<AdminLogEntry[]>;
    readonly logSourceOptions: import("@angular/core").WritableSignal<string[]>;
    readonly latestCpu: import("@angular/core").Signal<number | null>;
    readonly latestMem: import("@angular/core").Signal<number | null>;
    readonly latestGpu: import("@angular/core").Signal<number | null>;
    /** Acquire a shared live connection (call from component ngOnInit). */
    acquire(opts: {
        metrics?: boolean;
        logs?: boolean;
        logSources?: string[];
    }): void;
    /** Release one consumer (call from component ngOnDestroy). */
    release(): void;
    setLogSources(sources: string[] | null): void;
    clearLogs(): void;
    ngOnDestroy(): void;
    private wsUrl;
    private ensureConnected;
    private pushSubscriptions;
    private onMessage;
    private pushHistory;
    private scheduleReconnect;
    private closeSocket;
}
