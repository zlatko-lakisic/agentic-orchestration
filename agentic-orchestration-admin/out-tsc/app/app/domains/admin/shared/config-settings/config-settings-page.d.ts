import { OnInit } from '@angular/core';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
/**
 * Fuse Settings body pattern: section title + description + rows
 * (see extras/settings/features/account|notifications).
 */
export declare class ConfigSettingsPage implements OnInit {
    protected config: EffectiveConfigStore;
    private route;
    /** When set, override route data.groups */
    readonly groups: import("@angular/core").InputSignal<string[] | null>;
    readonly sectionTitle: import("@angular/core").InputSignal<string>;
    readonly sectionDescription: import("@angular/core").InputSignal<string | null>;
    private resolvedGroups;
    readonly rows: import("@angular/core").Signal<import("../../../../core/ao-api/types").EffectiveConfigEntry[]>;
    ngOnInit(): void;
}
