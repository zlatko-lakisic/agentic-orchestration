import { OnDestroy, OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
export declare class DeployPage implements OnInit, OnDestroy {
    readonly live: AoLiveWs;
    private config;
    private clipboard;
    readonly platform: import("@angular/core").Signal<string>;
    readonly showDrift: import("@angular/core").WritableSignal<boolean>;
    readonly configuredCount: import("@angular/core").Signal<number>;
    readonly drift: import("@angular/core").Signal<import("@/app/core/ao-api/types").EffectiveConfigEntry[]>;
    readonly tracked: import("@angular/core").Signal<import("@/app/core/ao-api/types").EffectiveConfigEntry[]>;
    readonly endpoints: import("@angular/core").WritableSignal<{
        name: string;
        url: string;
    }[]>;
    constructor();
    ngOnInit(): void;
    ngOnDestroy(): void;
    copy(text: string): void;
}
