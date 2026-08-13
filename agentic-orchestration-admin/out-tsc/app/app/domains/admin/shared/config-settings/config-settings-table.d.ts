import { OnInit } from '@angular/core';
import { EffectiveConfigEntry } from '@/app/core/ao-api/types';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
export type SettingsSection = {
    id: string;
    title: string;
    description?: string;
};
/**
 * Compact settings table with optional expansion sections.
 */
export declare class ConfigSettingsTable implements OnInit {
    protected config: EffectiveConfigStore;
    private route;
    readonly groups: import("@angular/core").InputSignal<string[] | null>;
    readonly component: import("@angular/core").InputSignal<string | null>;
    readonly sections: import("@angular/core").InputSignal<SettingsSection[]>;
    readonly title: import("@angular/core").InputSignal<string | null>;
    readonly description: import("@angular/core").InputSignal<string | null>;
    /** When true, hide kubernetes section unless execution backend is kubernetes. */
    readonly conditionalKubernetes: import("@angular/core").InputSignal<boolean>;
    readonly cols: string[];
    private resolvedGroups;
    readonly filtered: import("@angular/core").Signal<EffectiveConfigEntry[]>;
    readonly ungrouped: import("@angular/core").Signal<EffectiveConfigEntry[]>;
    rowsForSection(id: string): EffectiveConfigEntry[];
    display(e: EffectiveConfigEntry): string;
    ngOnInit(): void;
}
