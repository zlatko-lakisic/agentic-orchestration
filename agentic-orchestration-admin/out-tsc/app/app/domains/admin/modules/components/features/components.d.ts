import { OnDestroy, OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { TopologyResponse } from '@/app/core/ao-api/types';
export declare class ComponentsPage implements OnInit, OnDestroy {
    readonly live: AoLiveWs;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly topology: import("@angular/core").WritableSignal<TopologyResponse | null>;
    readonly catalog: {
        id: string;
        label: string;
        kind: string;
        notes: string;
        /** When true, render brand mark + steel “Reach” instead of plain label. */
        brandReach?: boolean;
    }[];
    constructor();
    ngOnInit(): void;
    ngOnDestroy(): void;
    private component;
    statusFor(id: string): string;
    factFor(id: string): string;
}
