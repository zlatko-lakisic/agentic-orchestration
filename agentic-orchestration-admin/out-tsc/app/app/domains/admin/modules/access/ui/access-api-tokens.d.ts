import { OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AoClock } from '@/app/core/ao-time/ao-time';
import { ApiAccessToken, ApiAccessTokenUsage } from '@/app/core/ao-api/types';
export declare class AccessApiTokens implements OnInit {
    private readonly api;
    readonly live: AoLiveWs;
    readonly clock: AoClock;
    private readonly webAuth;
    private readonly dialog;
    readonly columns: string[];
    readonly tokens: import("@angular/core").WritableSignal<ApiAccessToken[]>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly revokingId: import("@angular/core").WritableSignal<string | null>;
    readonly usageOpen: import("@angular/core").WritableSignal<boolean>;
    readonly usageToken: import("@angular/core").WritableSignal<ApiAccessToken | null>;
    readonly usageRows: import("@angular/core").WritableSignal<ApiAccessTokenUsage[]>;
    readonly usageError: import("@angular/core").WritableSignal<string | null>;
    constructor();
    ngOnInit(): void;
    statusTone(status: string | undefined): string;
    reload(): void;
    openMint(): void;
    revoke(t: ApiAccessToken): void;
    showUsage(t: ApiAccessToken): void;
    closeUsage(): void;
}
