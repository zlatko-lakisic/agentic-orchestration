import { OnDestroy, OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { TopologyStore } from '../data/topology.store';
import { PositionedEdge, PositionedNode } from '../data/topology.types';
/** Full-screen focus mode always shows the canvas, even on a narrow/table layout. */
export declare function topologyShowsTable(tableMode: boolean, forceTable: boolean, focusMode: boolean): boolean;
/** Format topology `generatedAt` with the runtime locale (medium date + short time). */
export declare function formatTopologyGeneratedAt(raw: string | null | undefined): string;
export declare class TopologyPage implements OnInit, OnDestroy {
    readonly store: TopologyStore;
    readonly live: AoLiveWs;
    private readonly dialog;
    readonly forceTable: import("@angular/core").WritableSignal<boolean>;
    readonly dialogOpen: import("@angular/core").WritableSignal<boolean>;
    readonly focusMode: import("@angular/core").WritableSignal<boolean>;
    readonly useTable: import("@angular/core").Signal<boolean>;
    private hoverTimer;
    private previousOverflow;
    readonly a11ySummary: import("@angular/core").Signal<string>;
    /** Locale-friendly stamp next to Live (not raw ISO). */
    readonly generatedAtLabel: import("@angular/core").Signal<string>;
    ngOnInit(): void;
    ngOnDestroy(): void;
    onResize(): void;
    onEscape(): void;
    toggleFocusMode(): void;
    private setFocusMode;
    onHover(id: string | null): void;
    openNode(n: PositionedNode): void;
    openEdge(e: PositionedEdge): void;
}
