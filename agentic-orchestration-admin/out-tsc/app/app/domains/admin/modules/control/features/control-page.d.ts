import { OnDestroy, OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { type ControlStatus, type ControlTarget } from '../data/control.model';
export declare class ControlPage implements OnInit, OnDestroy {
    private readonly api;
    readonly live: AoLiveWs;
    private readonly dialog;
    readonly status: import("@angular/core").Signal<ControlStatus | null>;
    readonly actionError: import("@angular/core").WritableSignal<string | null>;
    readonly error: import("@angular/core").Signal<string | null>;
    readonly flash: import("@angular/core").WritableSignal<string | null>;
    readonly busyId: import("@angular/core").WritableSignal<string | null>;
    readonly apps: import("@angular/core").Signal<ControlTarget[]>;
    readonly stack: import("@angular/core").Signal<ControlTarget>;
    readonly host: import("@angular/core").Signal<ControlTarget>;
    readonly hostArmed: import("@angular/core").Signal<boolean>;
    ngOnInit(): void;
    ngOnDestroy(): void;
    resync(): void;
    reload(): void;
    restart(target: ControlTarget): void;
}
