import { OnInit } from '@angular/core';
import { AoLiveWs } from '@/app/core/ao-live/ao-live-ws';
import { AppPlanningPrefs } from '@/app/core/ao-api/types';
export declare class AccessAppPrefs implements OnInit {
    private readonly api;
    readonly live: AoLiveWs;
    readonly columns: string[];
    readonly apps: import("@angular/core").WritableSignal<AppPlanningPrefs[]>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly saving: import("@angular/core").WritableSignal<boolean>;
    readonly savingId: import("@angular/core").WritableSignal<string | null>;
    newAppId: string;
    newDynamic: boolean;
    newRunMode: 'dynamic' | 'dynamic-iterative';
    newAllowedAgents: string;
    constructor();
    ngOnInit(): void;
    reload(): void;
    saveNew(): void;
    toggleDynamic(row: AppPlanningPrefs, enabled: boolean): void;
    setRunMode(row: AppPlanningPrefs, mode: 'dynamic' | 'dynamic-iterative'): void;
    setAllowedAgents(row: AppPlanningPrefs, raw: string): void;
    private parseIds;
    private patch;
}
