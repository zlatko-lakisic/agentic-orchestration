import { OnInit } from '@angular/core';
import { EffectiveConfigEntry } from '@/app/core/ao-api/types';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
export declare class SettingsPage implements OnInit {
    private api;
    protected config: EffectiveConfigStore;
    readonly query: import("@angular/core").WritableSignal<string>;
    readonly modifiedOnly: import("@angular/core").WritableSignal<boolean>;
    readonly restartOnly: import("@angular/core").WritableSignal<boolean>;
    readonly includeInjected: import("@angular/core").WritableSignal<boolean>;
    readonly filteredCount: import("@angular/core").Signal<number>;
    ngOnInit(): void;
    onQuery(): void;
    toggleInjected(checked: boolean): void;
    applyFilters(entries: EffectiveConfigEntry[]): EffectiveConfigEntry[];
}
