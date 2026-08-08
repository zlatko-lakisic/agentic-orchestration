import { EffectiveConfigEntry } from '@/app/core/ao-api/types';
export declare class EffectiveConfigStore {
    private api;
    readonly loading: import("@angular/core").WritableSignal<boolean>;
    readonly error: import("@angular/core").WritableSignal<string | null>;
    readonly missing: import("@angular/core").WritableSignal<boolean>;
    readonly entries: import("@angular/core").WritableSignal<EffectiveConfigEntry[]>;
    readonly fingerprint: import("@angular/core").WritableSignal<string | null>;
    readonly lastLoadedAt: import("@angular/core").WritableSignal<string | null>;
    readonly byKey: import("@angular/core").Signal<Map<string, EffectiveConfigEntry>>;
    entriesForGroup(group: string | string[]): EffectiveConfigEntry[];
    search(query: string): EffectiveConfigEntry[];
    load(): void;
}
/** Heuristic grouping until admin API returns group metadata. */
export declare function inferGroup(key: string): string;
